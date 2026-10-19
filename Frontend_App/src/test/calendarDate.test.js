import { localDateKey, localDateFromKey } from '../utils/calendarDate';

test('month boundaries are local calendar days, not UTC dates', () => {
  expect(localDateKey(new Date(2027, 0, 1))).toBe('2027-01-01');
  expect(localDateKey(new Date(2027, 1, 0))).toBe('2027-01-31');
});

test('a server date key keeps its local day when displayed', () => {
  const date = localDateFromKey('2027-01-01');
  expect(date.getFullYear()).toBe(2027);
  expect(date.getMonth()).toBe(0);
  expect(date.getDate()).toBe(1);
});
