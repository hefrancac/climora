import { describe, expect, it } from 'vitest';
import { addDays, dayMonth, daysBetween, isISODate, localToday, relativeDay, timeFromMinutes, minutes, weekday } from './dates';

describe('Datas sem fuso', () => {
  it('validates calendar dates', () => {
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('04/12/2026')).toBe(false);
  });
  it('adds and counts days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
  });
  it('reads the device calendar day', () => {
    expect(localToday(new Date(2026, 11, 4, 23, 59))).toBe('2026-12-04');
  });
  it('converts times', () => {
    expect(minutes('13:30')).toBe(810);
    expect(minutes('24:00')).toBeNaN();
    expect(timeFromMinutes(810)).toBe('13:30');
  });
  it('labels days in Portuguese', () => {
    expect(weekday('2026-12-04')).toBe('sex');
    expect(dayMonth('2026-12-04')).toBe('4 de dez');
    expect(relativeDay('2026-12-04', '2026-12-04')).toBe('Hoje');
    expect(relativeDay('2026-12-05', '2026-12-04')).toBe('Amanhã');
    expect(relativeDay('2026-12-03', '2026-12-04')).toBe('Ontem');
    expect(relativeDay('2026-12-10', '2026-12-04')).toBe('qui, 10/12');
  });
});
