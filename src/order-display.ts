import type {SnapshotSize} from './types';

export function sizingSummary(value: SnapshotSize | null | undefined): string {
  if (!value || !Array.isArray(value.fingers) || value.fingers.length !== 10 ||
      !value.fingers.every(finger => typeof finger === 'string' && finger.trim())) {
    return 'Awaiting sizing confirmation.';
  }

  const brand = typeof value.brand === 'string' && value.brand.trim() ? value.brand.trim() : 'Saved fit';
  return `${brand} · ${value.fingers.join(' / ')}${value.confirmed_at ? '' : ' · Awaiting artist confirmation'}`;
}
