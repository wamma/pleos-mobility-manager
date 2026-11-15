const valid = (v, min = 0, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const permutations = a => a.length ? a.flatMap((t, i) => permutations(a.filter((_, j) => j !== i)).map(rest => [t, ...rest])) : [[]];

// Deliberately small model: all legs share the explicitly entered travel time/speed.
// No route provider, traffic feed, or inference of task completion is involved.
function evaluate(input, tasks) {
  let time = input.start, energy = input.capacity * input.battery / 100;
  const legEnergy = input.travelMinutes / 60 * input.speed * input.consumption;
  const stops = [], reasons = [];
  for (const [index, task] of tasks.entries()) {
    if (!(index === 0 && input.atTask === task.id)) { time += input.travelMinutes; energy -= legEnergy; }
    if (energy < 0) reasons.push(`${task.name} 도착 전 배터리 부족`);
    const arrival = time, arrivalEnergy = energy;
    time = Math.max(time, task.open) + task.dwell;
    if (time > task.close) reasons.push(`${task.name} 운영시간 초과`);
    energy = Math.min(input.capacity, energy + task.chargeKw * task.dwell / 60);
    stops.push({ ...task, arrival, arrivalEnergy, depart: time, energy });
  }
  time += input.travelMinutes; energy -= legEnergy;
  if (time > input.deadline) reasons.push(`귀가 시한 ${time - input.deadline}분 초과`);
  if (energy < input.reserve) reasons.push(`귀가 예비 에너지 ${(input.reserve - energy).toFixed(1)}kWh 부족`);
  return { stops, homeAt: time, energy, reasons, score: tasks.reduce((s,t) => s + t.priority, 0) };
}
export function planTrip(input) {
  const { tasks } = input;
  if (!valid(input.start, 0, 1440) || !valid(input.deadline, input.start, 2880) || !valid(input.battery, 0, 100) || !valid(input.capacity, 0.1) || !valid(input.reserve, 0, input.capacity) || !valid(input.travelMinutes, 0) || !valid(input.speed, 0) || !valid(input.consumption, 0) || !Array.isArray(tasks) || tasks.length > 3 || new Set(tasks.map(t => t.id)).size !== tasks.length || tasks.some(t => !valid(t.open, 0, 2880) || !valid(t.close, t.open, 2880) || !valid(t.dwell, 0) || !valid(t.chargeKw, 0) || !valid(t.priority, 1, 3))) {
    return { status: 'unknown', reasons: ['필수 값이 미확인이거나 입력 범위가 올바르지 않습니다.'], alternatives: [] };
  }
  const all = permutations(tasks).map(p => evaluate(input,p));
  const best = all.filter(p => !p.reasons.length).sort((a,b) => a.homeAt-b.homeAt)[0];
  if (best) return { status: 'feasible', plan: best, alternatives: [], reasons: [] };
  const alternatives = [];
  for (let mask = 0; mask < (1 << tasks.length) - 1; mask++) {
    const subset = tasks.filter((_, i) => mask & (1 << i));
    const candidate = permutations(subset).map(p => evaluate(input,p)).filter(p => !p.reasons.length).sort((a,b) => a.homeAt-b.homeAt)[0];
    if (candidate) alternatives.push({ ...candidate, excluded: tasks.filter(t => !subset.includes(t)).map(t => t.id) });
  }
  alternatives.sort((a,b) => b.score-a.score || a.homeAt-b.homeAt);
  return { status: 'infeasible', reasons: [...new Set(all.flatMap(p => p.reasons))], alternatives };
}
export function visitTask(state, id) { return { ...state, [id]: state[id] === 'completed' ? 'completed' : 'visited' }; }
export function completeTask(state, id) {
  if (state[id] !== 'visited') throw new Error('방문 후 완료 여부를 확인해주세요.');
  return { ...state, [id]: 'completed' };
}
