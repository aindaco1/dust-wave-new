const UNSAFE_ADMIN_TEXT =
  /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

export function normalizeAdminReason(
  value,
  { minimumLength = 1, maximumLength = 500 } = {}
) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/ +/gu, " ");
  if (
    normalized.length < minimumLength
    || normalized.length > maximumLength
    || UNSAFE_ADMIN_TEXT.test(normalized)
  ) return null;
  return normalized;
}

export function normalizeAdminIdentifier(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length <= 160
    && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(normalized)
    ? normalized
    : null;
}
