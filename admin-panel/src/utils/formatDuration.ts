/** Masalan: 25 -> "25 daqiqa", 80 -> "1 soat 20 daqiqa", 120 -> "2 soat". */
export function formatDurationMinutes(minutes: number | null | undefined, emptyLabel = '-'): string {
  if (minutes == null || Number.isNaN(minutes)) return emptyLabel;
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} daqiqa`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest > 0 ? `${hours} soat ${rest} daqiqa` : `${hours} soat`;
}
