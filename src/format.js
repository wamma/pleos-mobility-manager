export function formatClock(m) {
  if (!Number.isFinite(m) || m < 0) return '미확인';
  const whole = Math.round(m), day = Math.floor(whole / 1440);
  return `${day === 1 ? '다음날 ' : day > 1 ? `${day}일 후 ` : ''}${String(Math.floor(whole / 60) % 24).padStart(2,'0')}:${String(whole % 60).padStart(2,'0')}`;
}
export const inputClock = m => Number.isFinite(m) && m >= 0 && m < 1440 ? formatClock(Math.floor(m)) : '';
export const upperBound = n => (Math.floor(n * 10) / 10).toFixed(1);
