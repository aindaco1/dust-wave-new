const UNSAFE_OVERRIDE_TEXT =
  /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

export function normalizePublicationOverrideReason(value) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .trim();
  if (
    !normalized
    || normalized.length > 500
    || UNSAFE_OVERRIDE_TEXT.test(normalized)
  ) {
    return null;
  }
  return normalized.replace(/ +/gu, " ");
}
