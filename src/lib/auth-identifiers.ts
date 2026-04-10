const loginIdPattern = /[^a-z0-9]+/g;

export const normalizeLoginId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(loginIdPattern, "");
