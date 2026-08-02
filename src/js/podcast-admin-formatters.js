export function activeLocale() {
  return globalThis.document?.documentElement?.lang || "en";
}

export function formatInteger(value, locale = activeLocale()) {
  return new Intl.NumberFormat(locale).format(
    Math.max(0, Number(value) || 0)
  );
}

export function formatBytes(value, locale = activeLocale()) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1_024) return `${formatInteger(bytes, locale)} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let amount = bytes / 1_024;
  let unitIndex = 0;
  while (amount >= 1_024 && unitIndex < units.length - 1) {
    amount /= 1_024;
    unitIndex += 1;
  }
  const maximumFractionDigits = amount >= 10 ? 1 : 2;
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(amount)} ${units[unitIndex]}`;
}
