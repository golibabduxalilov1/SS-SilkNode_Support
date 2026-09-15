/**
 * TZ "Ticket list: sorting and row highlighting" band 5 — "SLA" ustuni.
 * Birliklar TZ matnida aynan shunday: k = kun (day), s = soat (hour), d = daqiqa (minute).
 * Ko'pi bilan eng katta 2 ta birlik ko'rsatiladi: "1 k 3 s", "1 k 3 s 12 d" emas.
 */
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;
const SLA_WARN_THRESHOLD_PERCENT = 20;

function formatSlaUnits(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const mins = minutes % MINUTES_PER_HOUR;

  if (days > 0) {
    return hours > 0 ? `${days} k ${hours} s` : `${days} k`;
  }
  if (hours > 0) {
    return mins > 0 ? `${hours} s ${mins} d` : `${hours} s`;
  }
  return `${mins} d`;
}

export type SlaTone = 'normal' | 'warn' | 'late' | 'muted';

export interface SlaDisplay {
  text: string;
  tone: SlaTone;
}

/** Ochiq murojaat — SLA muddatigacha qolgan vaqt (yoki undan o'tib ketgan vaqt, minus bilan). */
export function formatSlaRemaining(
  slaDueAt: string | null | undefined,
  slaTotalMinutes: number | null | undefined,
  nowMs: number,
): SlaDisplay {
  if (!slaDueAt || slaTotalMinutes == null) return { text: '—', tone: 'muted' };

  const remainingMinutes = (new Date(slaDueAt).getTime() - nowMs) / 60000;
  if (remainingMinutes < 0) {
    return { text: `-${formatSlaUnits(-remainingMinutes)}`, tone: 'late' };
  }

  const percentLeft = slaTotalMinutes > 0 ? (remainingMinutes / slaTotalMinutes) * 100 : 0;
  return {
    text: formatSlaUnits(remainingMinutes),
    tone: percentLeft <= SLA_WARN_THRESHOLD_PERCENT ? 'warn' : 'normal',
  };
}

/** Yopilgan murojaat — haqiqiy sarflangan vaqt (mavjud resolutionMinutes'dan). */
export function formatSlaClosedDuration(resolutionMinutes: number | null | undefined): SlaDisplay {
  if (resolutionMinutes == null) return { text: '—', tone: 'muted' };
  return { text: formatSlaUnits(resolutionMinutes), tone: 'muted' };
}
