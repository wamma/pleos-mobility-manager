const valid = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function forecast(input) {
  const { battery, capacity, hours, rate, reserve } = input;
  if (![battery, capacity, hours, rate, reserve].every(valid) || battery > 100 || capacity <= 0 || reserve > capacity) return { status: 'unknown' };
  const currentKwh = capacity * battery / 100;
  const usedKwh = rate * hours;
  const departureKwh = currentKwh - usedKwh;
  return { status: departureKwh + 1e-9 >= reserve ? 'sufficient' : 'shortfall', currentKwh, usedKwh, departureKwh, departurePercent: Math.max(0, departureKwh / capacity * 100), margin: departureKwh - reserve, depleted: departureKwh < 0 };
}
export function advanceCamp(input, hours) {
  const f = forecast(input);
  if (f.status === 'unknown' || !valid(hours) || hours > input.hours) throw new Error('진행 시간 또는 배터리 입력을 확인해주세요.');
  const remaining = f.currentKwh - input.rate * hours;
  if (remaining < 0) throw new Error('진행 구간에서 에너지가 소진됩니다. 시나리오를 먼저 변경해주세요.');
  return { ...input, battery: 100 * remaining / input.capacity, hours: input.hours - hours };
}
export function campAlternatives(input) {
  const f = forecast(input);
  if (f.status !== 'shortfall' || f.currentKwh < input.reserve) return [];
  const budget = f.currentKwh - input.reserve;
  return [
    { kind: 'reduce', input: { ...input, rate: input.hours > 0 ? budget / input.hours : 0 } },
    { kind: 'earlier', input: { ...input, hours: input.rate > 0 ? budget / input.rate : 0 } },
  ];
}
