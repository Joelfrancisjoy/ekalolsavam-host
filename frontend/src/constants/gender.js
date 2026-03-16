export const GENDER_ENUM = Object.freeze({
  BOYS: 'BOYS',
  GIRLS: 'GIRLS',
});

export const GENDER_OPTIONS = Object.freeze([
  { value: GENDER_ENUM.BOYS, label: 'Boys' },
  { value: GENDER_ENUM.GIRLS, label: 'Girls' },
]);

export const normalizeGenderValue = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === GENDER_ENUM.BOYS || normalized === GENDER_ENUM.GIRLS) {
    return normalized;
  }
  return '';
};

export const isGenderValue = (value) => normalizeGenderValue(value) !== '';

export const getGenderLabel = (value) => {
  const normalized = normalizeGenderValue(value);
  const match = GENDER_OPTIONS.find((option) => option.value === normalized);
  return match ? match.label : 'Not set';
};
