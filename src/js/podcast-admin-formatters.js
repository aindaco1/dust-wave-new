export function activeLocale() {
  return globalThis.document?.documentElement?.lang || "en";
}

export function formatInteger(value, locale = activeLocale()) {
  return formatLocalizedNumber(Math.max(0, Number(value) || 0), locale);
}

export function formatLocalizedNumber(value, locale = activeLocale()) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
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

export function formatWholeSecondTimestamp(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) / 1_000) || 0);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return (hours ? [hours, minutes, seconds] : [minutes, seconds])
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, "0")
    )
    .join(":");
}
