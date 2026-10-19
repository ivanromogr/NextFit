export const routineNumber = (value) => {
  const text = String(value ?? '').trim().replace(',', '.');
  return /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN;
};
export const positiveInt = value => Number.isInteger(value) && value >= 1 && value <= 2147483647;

