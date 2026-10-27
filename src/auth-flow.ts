import type {SupabaseClient} from '@supabase/supabase-js';

const pages = ['home', 'gallery', 'hands', 'studio', 'orders', 'admin'];
const returnKey = 'eurie.oauth.return';
export type ReturnContext = {page: string; designId?: string};
export type BrowserEnvironment = {
  href: string;
  origin: string;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  replaceUrl: (url: string) => void;
};

export function readAuthConfig(env: Record<string, string | undefined>) {
  const url = env.VITE_SUPABASE_URL?.trim() || '';
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url && !key) return {url, key, error: ''};
  if (!url || !key) return {url: '', key: '', error: 'Add both the Supabase project URL and public publishable key.'};
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new Error('Invalid project URL');
    }
  } catch {
    return {url: '', key: '', error: 'Use the HTTPS project URL from Supabase, without an API path.'};
  }
  let validKey = key.startsWith('sb_publishable_');
  if (!validKey) {
    try {
      const payload = key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      validKey = JSON.parse(atob(payload)).role === 'anon';
    } catch { /* Not a legacy public anon key. */ }
  }
  if (!validKey) return {url: '', key: '', error: 'Use a publishable or legacy anon key. Secret and service-role keys must never be used in this website.'};
  return {url: url.replace(/\/$/, ''), key, error: ''};
}

export function safeReturnContext(value: unknown): ReturnContext {
  if (!value || typeof value !== 'object') return {page: 'hands'};
  const candidate = value as Record<string, unknown>;
  return {
    page: typeof candidate.page === 'string' && pages.includes(candidate.page) ? candidate.page : 'hands',
    designId: typeof candidate.designId === 'string' && /^[0-9a-f-]{36}$/i.test(candidate.designId) ? candidate.designId : undefined,
  };
}

export async function startGoogleSignIn(client: SupabaseClient, context: ReturnContext, browser: BrowserEnvironment) {
  // Keep the destination on this origin; never accept an arbitrary return URL.
  browser.storage.setItem(returnKey, JSON.stringify(safeReturnContext(context)));
  const {error} = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${browser.origin}/auth/callback`,
      scopes: 'openid email profile',
      queryParams: {prompt: 'select_account'},
    },
  });
  if (error) {
    browser.storage.removeItem(returnKey);
    throw new Error('Google sign-in could not start. Please try again or ask the shop to check its Google provider settings.');
  }
}

export async function finishGoogleSignIn(client: SupabaseClient, browser: BrowserEnvironment) {
  const url = new URL(browser.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const providerError = url.searchParams.get('error') || hash.get('error');
  const code = url.searchParams.get('code');
  const callback = url.pathname === '/auth/callback' || !!code || !!providerError;
  let context: ReturnContext | null = null;

  if (callback) {
    try {context = safeReturnContext(JSON.parse(browser.storage.getItem(returnKey) || 'null'))}
    catch {context = {page: 'hands'}}
    browser.storage.removeItem(returnKey);
    // Remove one-use authorization codes/errors immediately, including on failure.
    browser.replaceUrl(`/#${context.page}`);
    if (providerError) throw new Error(providerError === 'access_denied'
      ? 'Google sign-in was cancelled. You can try again whenever you are ready.'
      : 'Google sign-in could not be completed. Please try again.');
    if (!code) throw new Error('This sign-in link is incomplete. Please start again with Continue with Google.');
    const {error} = await client.auth.exchangeCodeForSession(code);
    if (error) throw new Error('This sign-in link expired or was opened in a different browser. Please start again with Continue with Google.');
  }

  const {data, error} = await client.auth.getSession();
  if (error) throw new Error('Your session could not be restored. Please sign in again.');
  if (data.session && data.session.user.app_metadata.provider !== 'google') {
    await client.auth.signOut({scope: 'local'});
    throw new Error('This shop supports Google sign-in only. Please continue with Google.');
  }
  return {session: data.session, context};
}
