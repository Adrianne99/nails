import test from 'node:test';
import assert from 'node:assert/strict';
import {sizingSummary} from '../src/order-display.ts';

test('older orders without ten finger sizes still show details safely', () => {
  const pending = 'Awaiting sizing confirmation.';
  assert.equal(sizingSummary(null), pending);
  assert.equal(sizingSummary({brand: null, fingers: null}), pending);
  assert.equal(sizingSummary({brand: 'Provisional Small', fingers: ['2', '5']}), pending);
  assert.equal(sizingSummary({brand: 'Provisional Small', fingers: ['2', '5', '4', '6', '9', '2', '5', '4', '6', '']}), pending);
});

test('confirmed and provisional ten-finger profiles remain visible', () => {
  const fingers = ['2', '5', '4', '6', '9', '2', '5', '4', '6', '9'];
  assert.equal(sizingSummary({brand: 'Eurie tips', fingers, confirmed_at: '2026-10-27'}),
    'Eurie tips · 2 / 5 / 4 / 6 / 9 / 2 / 5 / 4 / 6 / 9');
  assert.equal(sizingSummary({brand: 'Provisional Small', fingers, confirmed_at: null}),
    'Provisional Small · 2 / 5 / 4 / 6 / 9 / 2 / 5 / 4 / 6 / 9 · Awaiting artist confirmation');
});
