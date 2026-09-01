import { describe, expect, it } from 'vitest';
import { clockToMinutes, resolveNextPrayer, toLocalClock } from '@/lib/shared/watch';

const TIMES = {
  fajr: '22:22',
  sunrise: '23:39',
  dhuhr: '05:58',
  asr: '09:26',
  maghrib: '12:17',
  isha: '13:34',
};

describe('watch companion prayer contract', () => {
  it('picks the next upcoming prayer', () => {
    const next = resolveNextPrayer(TIMES, clockToMinutes('06:30'));
    expect(next).toMatchObject({ name: 'asr', at: '09:26', is_tomorrow: false });
  });

  it('wraps to the earliest prayer of the next day after the last one', () => {
    const next = resolveNextPrayer(TIMES, clockToMinutes('23:50'));
    // Times are UTC; for Dhaka the earliest UTC slot of the cycle is Dhuhr.
    expect(next?.name).toBe('dhuhr');
    expect(next?.is_tomorrow).toBe(true);
    expect(next?.in_minutes).toBe(10 + clockToMinutes('05:58'));
  });

  it('returns null when no prayer times are present', () => {
    expect(resolveNextPrayer({}, 0)).toBeNull();
  });

  it('keeps Asr between Dhuhr and Maghrib (regression: Asr fell after Maghrib)', () => {
    expect(clockToMinutes(TIMES.asr)).toBeGreaterThan(clockToMinutes(TIMES.dhuhr));
    expect(clockToMinutes(TIMES.asr)).toBeLessThan(clockToMinutes(TIMES.maghrib));
  });

  it('converts UTC clock strings to local time with wrap-around', () => {
    expect(toLocalClock('22:22', 360)).toBe('04:22');
    expect(toLocalClock('09:26', 360)).toBe('15:26');
  });
});
