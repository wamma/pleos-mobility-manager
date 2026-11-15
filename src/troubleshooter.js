export function newSession() { return { stage: 'symptom', before: null, after: null, resolved: false, events: [] }; }
export function transition(session, event) {
  const s = { ...session, events: [...session.events, event.type] };
  if (['query', 'observe'].includes(event.type) && ![null, 'on', 'off'].includes(event.value)) throw new Error('관찰 값이 유효하지 않습니다.');
  if (event.type === 'query' && s.stage === 'symptom') return { ...s, before: event.value, stage: 'guidance' };
  if (event.type === 'decline' && s.stage === 'guidance') return { ...s, stage: 'declined' };
  if (event.type === 'approve' && s.stage === 'guidance') return { ...s, stage: 'awaiting-observation' };
  if (event.type === 'observe' && s.stage === 'awaiting-observation') return { ...s, after: event.value, stage: 'awaiting-feedback' };
  if (event.type === 'feedback' && s.stage === 'awaiting-feedback' && typeof event.clear === 'boolean') return { ...s, resolved: event.clear, stage: event.clear ? 'user-confirmed' : 'unresolved' };
  throw new Error('현재 단계에서 실행할 수 없는 작업입니다.');
}
