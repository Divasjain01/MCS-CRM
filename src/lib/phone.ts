const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const normalizeLeadPhone = (rawPhone: string | null | undefined): string | null => {
  const trimmed = (rawPhone ?? "").trim();

  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed.replace(/[^0-9+]/g, "");

  if (!cleaned) {
    return null;
  }

  let normalized = "";

  if (cleaned.startsWith("+")) {
    const digits = digitsOnly(cleaned.slice(1));

    if (!digits) {
      return null;
    }

    normalized = `+${digits}`;
  } else {
    const digits = digitsOnly(cleaned);

    if (digits.length === 10) {
      normalized = `+91${digits}`;
    } else if (digits.length === 12 && digits.startsWith("91")) {
      normalized = `+${digits}`;
    } else if (digits.length >= 11 && digits.length <= 15) {
      normalized = `+${digits}`;
    } else {
      return null;
    }
  }

  return /^\+[1-9][0-9]{7,14}$/.test(normalized) ? normalized : null;
};

export const isValidLeadPhone = (rawPhone: string | null | undefined) =>
  normalizeLeadPhone(rawPhone) !== null;
