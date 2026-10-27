import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/auth-flow.ts', import.meta.url), 'utf8');
const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}});
const {readAuthConfig, safeReturnContext, startGoogleSignIn, finishGoogleSignIn} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const returnKey = 'eurie.oauth.return';
const designId = '10000000-0000-0000-0000-000000000001';
const googleSession = {user: {id: 'customer', app_metadata: {provider: 'google'}}};
function fixture(href = 'http://127.0.0.1:5173/#hands', options = {}) {
  const values = new Map(), calls = [], replacements = [];
  const browser = {href, origin: new URL(href).origin,
    storage: {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)},
    replaceUrl: url => replacements.push(url)};
  const client = {auth: {
    signInWithOAuth: async args => {calls.push(['start', args]); return {error: options.startError ?? null}},
    exchangeCodeForSession: async code => {calls.push(['exchange', code]); assert.equal(replacements.length, 1, 'Clean URL before exchanging code'); return {error: options.exchangeError ?? null}},
    getSession: async () => {calls.push(['session']); return {data: {session: options.session === undefined ? googleSession : options.session}, error: options.sessionError ?? null}},
    signOut: async args => {calls.push(['signOut', args]); return {error: null}},
  }};
  return {client, browser, values, calls, replacements};
}

test('accepts public publishable and legacy anon keys, rejects privileged keys', () => {
  const url = 'https://example.supabase.co/';
  const jwt = role => `header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.equal(readAuthConfig({VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test'}).url, url.slice(0,-1));
  assert.equal(readAuthConfig({VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: jwt('anon')}).error, '');
  for (const key of ['sb_secret_do_not_expose', jwt('service_role'), 'bad-key']) {
    const result = readAuthConfig({VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key});
    assert.equal(result.key, ''); assert.match(result.error, /publishable or legacy anon/);
    assert.ok(!result.error.includes(key));
  }
});
test('missing or unsafe project configuration stays disabled', () => {
  assert.deepEqual(readAuthConfig({}), {url:'', key:'', error:''});
  for (const url of ['', 'http://example.com', 'https://example.com/rest/v1', 'https://user:pass@example.com', 'https://example.com?key=secret']) {
    const result = readAuthConfig({VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'});
    assert.equal(result.url, ''); assert.ok(result.error);
  }
});
test('return destination accepts only internal pages and design IDs', () => {
  assert.deepEqual(safeReturnContext(null), {page:'hands'});
  assert.equal(safeReturnContext({page:'https://evil.example',designId:'<script>'}).page,'hands');
  assert.equal(safeReturnContext({page:'studio',designId:'<script>'}).designId,undefined);
  assert.deepEqual(safeReturnContext({page:'studio',designId}),{page:'studio',designId});
});
test('starts only Google OAuth with an exact same-origin callback', async () => {
  const f = fixture();
  await startGoogleSignIn(f.client,{page:'studio',designId},f.browser);
  assert.deepEqual(f.calls,[['start',{provider:'google',options:{redirectTo:'http://127.0.0.1:5173/auth/callback',scopes:'openid email profile',queryParams:{prompt:'select_account'}}}]]);
  assert.deepEqual(JSON.parse(f.values.get(returnKey)),{page:'studio',designId});
});
test('failed OAuth start removes pending return state', async () => {
  const f = fixture(undefined,{startError:{message:'internal provider details'}});
  await assert.rejects(startGoogleSignIn(f.client,{page:'orders'},f.browser),/could not start/);
  assert.equal(f.values.has(returnKey),false);
});
test('callback exchanges code and restores the selected design without leaving credentials in the URL', async () => {
  const f = fixture('http://127.0.0.1:5173/auth/callback?code=one-use-code');
  f.values.set(returnKey,JSON.stringify({page:'studio',designId}));
  const result = await finishGoogleSignIn(f.client,f.browser);
  assert.deepEqual(result,{session:googleSession,context:{page:'studio',designId}});
  assert.deepEqual(f.replacements,['/#studio']);
  assert.deepEqual(f.calls,[['exchange','one-use-code'],['session']]);
  assert.equal(f.values.has(returnKey),false);
});
test('cancelled callbacks in query or hash do not exchange a code or expose provider details', async () => {
  for (const suffix of ['?error=access_denied&error_description=private-details','#error=access_denied&error_description=private-details']) {
    const f = fixture('http://127.0.0.1:5173/auth/callback'+suffix);
    await assert.rejects(finishGoogleSignIn(f.client,f.browser),/was cancelled/);
    assert.deepEqual(f.calls,[]); assert.deepEqual(f.replacements,['/#hands']);
  }
});
test('expired and incomplete callback links provide a retry message', async () => {
  const expired = fixture('http://127.0.0.1:5173/auth/callback?code=expired',{exchangeError:{message:'secret internal details'}});
  await assert.rejects(finishGoogleSignIn(expired.client,expired.browser),/expired or was opened in a different browser/);
  assert.deepEqual(expired.calls,[['exchange','expired']]);
  const incomplete = fixture('http://127.0.0.1:5173/auth/callback');
  incomplete.values.set(returnKey,'invalid json');
  await assert.rejects(finishGoogleSignIn(incomplete.client,incomplete.browser),/incomplete/);
  assert.deepEqual(incomplete.replacements,['/#hands']);
});
test('ordinary reload restores a session without processing another OAuth callback', async () => {
  const f = fixture();
  assert.deepEqual(await finishGoogleSignIn(f.client,f.browser),{session:googleSession,context:null});
  assert.deepEqual(f.calls,[['session']]); assert.deepEqual(f.replacements,[]);
  const guest = fixture(undefined,{session:null});
  assert.equal((await finishGoogleSignIn(guest.client,guest.browser)).session,null);
});
test('non-Google sessions are signed out locally', async () => {
  const f = fixture(undefined,{session:{user:{app_metadata:{provider:'email'}}}});
  await assert.rejects(finishGoogleSignIn(f.client,f.browser),/Google sign-in only/);
  assert.deepEqual(f.calls,[['session'],['signOut',{scope:'local'}]]);
});
test('session restoration errors give a safe sign-in message', async () => {
  const f = fixture(undefined,{sessionError:{message:'raw backend error'}});
  await assert.rejects(finishGoogleSignIn(f.client,f.browser),/session could not be restored/);
});
