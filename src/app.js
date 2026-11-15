import { planTrip, visitTask, completeTask } from './mobility.js';
import { forecast, advanceCamp, campAlternatives } from './camping.js';
import { newSession, transition } from './troubleshooter.js';
import { formatClock as time, inputClock, upperBound } from './format.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const compact = n => Number.isFinite(n) ? String(Number(n.toFixed(3))) : '';
const num = (id) => { const el=$(`#${id}`),v=el.value; return v === '' ? null : el.dataset.raw && compact(Number(el.dataset.raw))===v ? Number(el.dataset.raw) : Number(v); };
const mins = id => { const el=$(`#${id}`),v=el.value; return v ? el.dataset.raw && inputClock(Number(el.dataset.raw))===v ? Number(el.dataset.raw) : v.split(':').reduce((a,b) => a*60+Number(b),0) : null; };
const fixed = n => Number.isFinite(n) ? n.toFixed(1) : '미확인';
const field = (label,id,value,unit='',attrs='') => `<label>${label}${unit ? ` (${unit})` : ''}<input id="${id}" aria-label="${label}" type="number" step="any" value="${compact(value)}" data-raw="${value ?? ''}" ${attrs}></label>`;
const clockField = (label,id,value) => `<label>${label}<input id="${id}" aria-label="${label}" type="time" value="${inputClock(value)}" data-raw="${value ?? ''}"></label>`;
let toastTimer;
function toast(s) { $('#toast').textContent = s; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').textContent = '', 5000); }
const query = new URLSearchParams(location.search);
let tab = ['mobility','camping','trouble'].includes(query.get('idea')) ? query.get('idea') : 'mobility';
if(query.get('single')==='1') {
  const title={mobility:'내 이동 매니저',camping:'차박 운영 매니저',trouble:'내 차 문제 해결사'}[tab];
  document.querySelector('nav').hidden=true;
  document.querySelector('h1').textContent=title;
  document.querySelector('.intro p:not(.eyebrow)').textContent='정차 상태의 기능 시뮬레이션 · 실제 Gleo / 차량 제어 미연동';
  document.title=title;
  document.querySelector('.brand').removeAttribute('href');
}
const initialTrip = () => ({ start:1080, deadline:1260, battery:30, capacity:60, reserve:5, consumption:0.2, travelMinutes:10, speed:30, place:'회사', tasks:[
  { id:'laundry', name:'세탁물 수령', priority:3, open:540, close:1170, dwell:10, chargeKw:0 },
  { id:'shop', name:'장보기', priority:2, open:540, close:1320, dwell:30, chargeKw:0 },
  { id:'charge', name:'충전', priority:1, open:0, close:1439, dwell:20, chargeKw:30 },
] });
let trip = initialTrip(), taskStates = {}, tripResult, confirmedPlan = null;
let camp = { battery:60, capacity:60, hours:8, rate:1, reserve:20 }, campElapsed = 0, campChecks = {}, departure = false;
let trouble = newSession(), savedSession = false, storageError = '';
let history = [];
try { const parsed = JSON.parse(localStorage.getItem('pleos-cases-v1') || '[]'); if (Array.isArray(parsed)) history = parsed.filter(x => x && typeof x.stage === 'string').slice(0,20); }
catch { storageError = '이 브라우저에서 이전 기록을 불러오지 못했습니다.'; }
const statusLabel = s => ({ visited:'방문 · 완료 미확인', completed:'완료 확인', postponed:'연기 선택', cancelled:'취소 선택' }[s] || '예정');
const stageLabel = s => ({ symptom:'증상 접수', guidance:'수동 안내', 'awaiting-observation':'조치 후 상태 확인 대기', 'awaiting-feedback':'사용자 체감 확인 대기', declined:'조치 거절', unresolved:'미해결', 'user-confirmed':'사용자가 해소 확인' }[s] || s);
const stateLabel = s => s === 'on' ? '켜짐 (모의)' : s === 'off' ? '꺼짐 (모의)' : '미확인';
function remainingTrip() { return { ...trip, tasks:trip.tasks.filter(t => !['completed','cancelled','postponed'].includes(taskStates[t.id])) }; }
function recalcTrip() { tripResult = planTrip(remainingTrip()); confirmedPlan = null; }
recalcTrip();

function mobility() {
  const r = tripResult;
  const plan = confirmedPlan || r.plan;
  return `<div class="layout"><section>
    <div class="card"><p class="eyebrow">01 / PLAN THE WHOLE TRIP</p><h2>오늘 해야 할 일을 한 번에.</h2><p class="sub">시간과 잔량을 함께 계산하고, 어려우면 우선순위를 묻습니다.</p>
    <div class="row"><button class="small" data-action="trip-normal">정상 시나리오</button><button class="small" data-action="trip-tight">시간 부족 시나리오</button><button class="small" data-action="trip-low">배터리 부족 시나리오</button></div>
    <form id="trip-form"><div class="grid"><label>출발 장소<input id="place" aria-label="출발 장소" value="${esc(trip.place)}" maxlength="40"></label>${clockField('출발 시각','start',trip.start)}${clockField('귀가 시한','deadline',trip.deadline)}${field('현재 잔량','battery',trip.battery,'%','min="0" max="100"')}${field('구간당 이동시간','travel',trip.travelMinutes,'분','min="0"')}${field('귀가 예비 에너지','reserve',trip.reserve,'kWh','min="0"')}</div>
    <details><summary>이동·배터리 계산 가정 변경</summary><p class="sub">모든 구간에 같은 이동시간과 속도를 적용하는 단순 모형입니다. 실제 지도·교통 정보가 아닙니다. 충전 전력은 배터리에 들어가는 유효 전력입니다.</p><div class="grid">${field('사용 가능 용량','capacity',trip.capacity,'kWh','min="0.1"')}${field('평균 속도','speed',trip.speed,'km/h','min="0"')}${field('거리당 소비량','consumption',trip.consumption,'kWh/km','min="0"')}</div></details>
    <details><summary>할 일 ${trip.tasks.length}개 · 우선순위 / 운영시간 / 체류시간</summary>${trip.tasks.map(t => `<div class="task"><div class="row spread"><strong>${t.name}</strong><span class="tag">${statusLabel(taskStates[t.id])}</span></div><div class="grid"><label>우선순위<select id="priority-${t.id}" aria-label="${t.name} 우선순위">${[3,2,1].map(p => `<option value="${p}" ${p===t.priority?'selected':''}>${p===3?'높음':p===2?'보통':'낮음'}</option>`).join('')}</select></label>${clockField(`${t.name} 오픈`,`open-${t.id}`,t.open)}${clockField(`${t.name} 마감`,`close-${t.id}`,t.close)}${field(`${t.name} 체류`,`dwell-${t.id}`,t.dwell,'분','min="0"')}${t.id==='charge'?field('충전 전력','chargeKw',t.chargeKw,'kW','min="0"'):''}</div></div>`).join('')}</details>
    <button class="primary" type="submit" style="margin-top:20px;width:100%">입력으로 계획 계산</button></form></div>
    <div class="card"><h3>상황이 달라졌나요?</h3><p class="sub">마지막 확인 위치 기준으로 출발을 늦추거나 할 일을 취소해 다시 계산합니다.</p><div class="row"><button class="small" data-action="trip-delay">20분 지연 적용</button><select id="cancel-task" aria-label="취소할 할 일" style="width:auto">${remainingTrip().tasks.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select><button class="small" data-action="trip-cancel" ${remainingTrip().tasks.length?'':'disabled'}>선택한 일 취소</button></div></div>
    </section><section aria-label="이동 계획 결과">
    ${plan ? `<div class="card hero"><p class="eyebrow">${confirmedPlan?'YOUR CONFIRMED PLAN':'PROPOSED PLAN · 선택 대기'}</p><h2>${confirmedPlan?'이 계획으로 이동합니다.':'오늘의 일정을 맞출 수 있어요.'}</h2><div class="big">${time(plan.homeAt)} <small>예상 귀가</small></div><p>${esc(trip.place)} 출발 · ${plan.stops.length}곳 방문 · 단순 이동시간 모형</p><div class="statbar"><div><b>${fixed(plan.energy)} kWh</b><span>예상 귀가 잔량</span></div><div><b>${fixed(trip.deadline-plan.homeAt)}분</b><span>귀가 시한까지 여유</span></div></div></div>`:
    `<div class="card"><p class="eyebrow">LET’S MAKE A CHOICE</p><h2>${r.status==='unknown'?'계산에 필요한 값을 확인해주세요.':'모두 하기에는 조건이 맞지 않아요.'}</h2><div class="${r.status==='unknown'?'unknown':'warning'}"><ul class="list">${r.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><p class="sub">아직 어떤 할 일도 자동으로 제외하지 않았습니다.</p></div>`}
    ${plan ? `<div class="card"><div class="row spread"><h3>방문과 완료는 따로 확인합니다</h3><span class="tag">${confirmedPlan?'확정됨':'제안'}</span></div><ol class="route">${plan.stops.map((t,i) => `<li><time>${time(t.arrival)}</time><div><strong>${t.name}</strong><small>${time(t.depart)} 출발 · ${t.dwell}분 체류 · ${statusLabel(taskStates[t.id])}</small></div><div class="row">${confirmedPlan?`<button class="small" data-action="trip-visit" data-id="${t.id}" ${i!==0||taskStates[t.id]==='visited'?'disabled':''}>방문 확인</button><button class="small" data-action="trip-complete" data-id="${t.id}" ${i!==0||taskStates[t.id]!=='visited'?'disabled':''}>업무 완료</button>`:''}</div></li>`).join('')}<li><time>${time(plan.homeAt)}</time><div><strong>집</strong><small>예비 ${fixed(trip.reserve)} kWh 확보 조건</small></div></li></ol>${confirmedPlan?'<p class="sub">순서대로 방문·완료를 확인합니다. 완료 후 현재 위치·시각·모의 잔량으로 남은 일정을 다시 제안합니다.</p>':'<button class="primary" data-action="trip-confirm">이 계획 확정</button>'}</div>`:''}
    ${!plan && r.alternatives.length ? `<div class="card"><h3>우선순위를 살리는 대안</h3><p class="sub">높은 우선순위를 많이 지키는 대안부터 표시합니다. 선택하면 연기 항목과 계획을 함께 확정합니다.</p><div class="options">${r.alternatives.map((p,i) => `<div class="option"><b>${p.stops.map(t=>t.name).join(' → ') || '바로 귀가'}</b><p class="sub">${time(p.homeAt)} 귀가 · ${fixed(p.energy)} kWh · 연기: ${trip.tasks.filter(t=>p.excluded.includes(t.id)).map(t=>t.name).join(', ')}</p><button class="small primary" data-action="trip-alternative" data-index="${i}">대안 ${i+1} 선택·확정</button></div>`).join('')}</div></div>`:''}
    ${!plan && !r.alternatives.length && r.status==='infeasible'?'<div class="card"><h3>현재 조건에서 실행 가능한 대안이 없습니다.</h3><p>출발 시각·시한·잔량과 이동 가정을 확인해주세요. 충전소에 도달할 수 없는 잔량으로 출발 계획을 확정하지 않습니다.</p></div>':''}
    ${Object.keys(taskStates).length?`<div class="card"><h3>선택과 진행 기록</h3>${trip.tasks.filter(t=>taskStates[t.id]).map(t=>`<p>${t.name} <span class="tag">${statusLabel(taskStates[t.id])}</span></p>`).join('')}</div>`:''}
    </section></div>`;
}

function camping() {
  const f = forecast(camp), opts = campAlternatives(camp);
  return `<div class="layout"><section><div class="card"><p class="eyebrow">02 / STAY WITH A PLAN</p><h2>내일 출발까지, 잔량을 살피다.</h2><p class="sub">머무는 데 쓸 에너지와 다음 이동에 남겨둘 에너지를 나눕니다.</p><button class="small" data-action="camp-reset">정상 시나리오로 초기화</button><form id="camp-form"><div class="grid">${field('차박 현재 잔량','camp-battery',camp.battery,'%','min="0" max="100"')}${field('차박 사용 가능 용량','camp-capacity',camp.capacity,'kWh','min="0.1"')}${field('출발까지 남은 시간','camp-hours',camp.hours,'시간','min="0"')}${field('평균 소비 전력','camp-rate',camp.rate,'kW','min="0"')}${field('다음 이동 예비 에너지','camp-reserve',camp.reserve,'kWh','min="0"')}</div><button class="primary" type="submit">이 조건으로 예측</button></form><details><summary>단위와 예측 가정</summary><p class="sub">현재 에너지 = 용량 × 잔량 ÷ 100. 사용량 = 소비 전력(kW) × 시간(h). 출발 에너지 = 현재 에너지 − 사용량. 일정한 소비 전력을 가정하며 날씨·배터리 열화·충전 손실은 반영하지 않습니다. 정확한 체류 가능 시간이나 안전을 보장하지 않습니다.</p></details></div>
    <div class="card"><h3>시간과 소비 변화 시뮬레이션</h3><p class="sub">누적 진행 ${fixed(campElapsed)}시간 · 실제 밤샘 실행 아님</p><div class="row"><button data-action="camp-spike" class="small">소비 증가: 3 kW</button><button data-action="camp-hour" class="small" ${f.status==='unknown'||camp.hours<1?'disabled':''}>1시간 진행</button><button data-action="camp-depart" class="small">지금 출발 준비</button></div></div></section>
    <section aria-label="차박 예측 결과">${f.status==='unknown'?'<div class="card unknown"><h2>잔량 예측 미확인</h2><p>빈 값·음수·잘못된 용량은 0이나 정상으로 처리하지 않습니다.</p></div>':`<div class="card hero"><p class="eyebrow">DEPARTURE FORECAST · 모의 계산</p><h2>${f.status==='sufficient'?'입력한 예비 에너지를 남길 수 있어요.':'다음 이동에 남길 에너지가 부족해요.'}</h2><div class="big">${fixed(f.departurePercent)}<small>% 예상 출발 잔량</small></div><div class="progress"><span style="width:${Math.min(100,f.departurePercent)}%"></span></div><div class="statbar"><div><b>${fixed(Math.max(0,f.departureKwh))} kWh</b><span>예상 출발 에너지</span></div><div><b>${fixed(f.margin)} kWh</b><span>예비 기준 대비 여유</span></div></div></div><div class="card"><h3>예측의 근거</h3><p>${fixed(f.currentKwh)} kWh − ${fixed(camp.rate)} kW × ${fixed(camp.hours)} h = ${fixed(f.departureKwh)} kWh</p><p class="sub">다음 이동 예비 기준: ${fixed(camp.reserve)} kWh</p>${f.depleted?'<div class="warning">예상 사용량이 현재 에너지를 초과합니다. 음수 결과는 에너지 부족량이며 실제 배터리 잔량이 아닙니다.</div>':''}${f.status==='shortfall'?`<div class="warning">현재 조건대로라면 예비 기준보다 ${fixed(-f.margin)} kWh 부족합니다.</div><div class="options">${opts.map((p,i)=>`<div class="option"><b>${p.kind==='reduce'?`소비를 ${upperBound(p.input.rate)} kW 이하로 줄이기`:`${upperBound(p.input.hours)}시간 이내 출발하기`}</b><p class="sub">정확한 경계 값으로 계산한 제안입니다. 설정 자동 변경 없이 시나리오에만 적용합니다.</p><button class="small primary" data-action="camp-option" data-index="${i}">이 대안으로 다시 계산</button></div>`).join('')}</div>${!opts.length?'<p>지금도 예비 에너지가 부족합니다. 소비 조절만으로 충족할 수 없으므로 이동·충전 계획을 다시 확인해주세요.</p>':''}`:'<div class="good">예비 기준 충족 · 소비가 바뀌면 다시 계산합니다.</div>'}</div>`}
    ${departure?`<div class="card"><p class="eyebrow">BEFORE YOU LEAVE</p><h2>원래 설정을 직접 확인해주세요.</h2><p class="sub">저장된 기준은 모의 설정입니다. 차량 조회·복구는 수행하지 않았습니다.</p><div class="checklist">${[['climate','공조 · 사용 전 기준 22°C / 자동'],['lights','실내등 · 사용 전 기준 꺼짐'],['seat','좌석 · 출발에 적합한 위치 직접 확인']].map(([id,label])=>`<label><input type="checkbox" data-check="${id}" ${campChecks[id]?'checked':''}>${label}</label>`).join('')}</div><div class="${Object.values(campChecks).filter(Boolean).length===3?'good':'unknown'}">${Object.values(campChecks).filter(Boolean).length===3?'수동 확인 3/3 · 차량 복구 성공 여부는 미검증':'수동 확인 대기 · 자동 복구하지 않았습니다.'}</div></div>`:''}</section></div>`;
}

function troubleshoot() {
  const s=trouble, progress = ['symptom','guidance','awaiting-observation','awaiting-feedback'].indexOf(s.stage);
  return `<div class="layout"><section><div class="card"><p class="eyebrow">03 / VERIFY THE OUTCOME</p><h2>“앞유리에 김이 서려요.”</h2><p class="sub">설정이 바뀌었는지, 불편함도 사라졌는지 각각 확인합니다.</p><div class="steps">${[0,1,2,3].map(i=>`<span class="${i<=(progress<0?3:progress)?'done':''}"></span>`).join('')}</div><div class="row spread"><span class="tag">${stageLabel(s.stage)}</span><button class="small" data-action="trouble-reset">새 상담</button></div>
    <div class="state-box"><div><small>조치 전 앞유리 제상 상태</small><b>${stateLabel(s.before)}</b></div><div><small>조치 후 관찰</small><b>${stateLabel(s.after)}</b></div></div>
    <p class="sub">차종 미지정 · 실제 차량 상태 미연결 · 수동 안내만 제공</p>
    ${s.stage==='symptom'?`<label>조회할 모의 상태<select id="before-state" aria-label="조회할 모의 상태"><option value="off">꺼짐</option><option value="on">켜짐</option><option value="unknown">미확인 / 조회 불가</option></select></label><button class="primary" data-action="trouble-query" style="margin-top:16px">김서림 접수 · 모의 상태 조회</button>`:''}
    ${s.stage==='guidance'?`<h3>확인한 후 직접 조작해주세요.</h3><ol class="list"><li>정차 상태에서 본인 차량 설명서의 앞유리 습기 제거 항목을 확인합니다.</li><li>해당 사양의 앞유리 서리 제거 기능과 에어컨·외기 설정 안내를 확인해 직접 조작합니다.</li><li>표시 상태를 확인하고, 시야가 나아졌는지 별도로 답합니다.</li></ol><p class="sub"><a href="https://ownersmanual.hyundai.com/full_webhelp/NH2/2026/ko_KR/topic_ljm_r2w_w2c.html" target="_blank" rel="noreferrer">현대차 NH2 2026 설명서의 참고 사례 ↗</a><br>참고 차종의 예시이며 내 차에 적용된다는 확인은 아닙니다. 시야가 확보되지 않으면 운행을 시작하지 마세요.</p><div class="row"><button class="primary" data-action="trouble-approve">설명서 확인 · 수동 조작 진행</button><button data-action="trouble-decline">조치 거절</button></div>`:''}
    ${s.stage==='awaiting-observation'?`<div class="unknown">수동 조작 단계입니다. 앱이 명령을 보내거나 상태 변경을 확인한 것은 아닙니다.</div><label style="margin-top:16px">조치 후 모의 관찰<select id="after-state" aria-label="조치 후 모의 관찰"><option value="on">켜짐</option><option value="off">꺼짐 / 변화 없음</option><option value="unknown">미확인</option></select></label><button class="primary" data-action="trouble-observe" style="margin-top:16px">관찰 결과 기록</button>`:''}
    ${s.stage==='awaiting-feedback'?`<h3>김서림이 해소됐나요?</h3><p class="sub">관찰된 설정과 실제 시야 개선은 다를 수 있습니다.</p><div class="row"><button class="primary" data-action="trouble-clear">시야가 나아졌어요</button><button data-action="trouble-unresolved">아직 김이 서려요</button></div>`:''}
    ${['declined','unresolved','user-confirmed'].includes(s.stage)?`<div class="${s.resolved?'good':'warning'}"><b>${stageLabel(s.stage)}</b><p>${s.resolved?'사용자 응답을 기록했습니다. 차량 센서가 해소를 판정한 것은 아닙니다.':s.stage==='declined'?'조치를 실행하지 않았습니다. 필요하면 새 상담을 시작할 수 있습니다.':'기능 표시가 바뀌었어도 문제는 남아 있습니다. 차량 설명서를 다시 확인하고, 계속되면 점검을 요청하세요. 자동 해결 처리하지 않습니다.'}</p></div><p class="sub">${savedSession?'이 브라우저에 상담 결과를 저장했습니다.':'기록 저장 상태를 확인해주세요.'}</p>`:''}
    </div><div class="card"><h3>현재 지원 범위</h3><p class="sub">김서림: 확인부터 기록까지 데모 가능</p><p class="sub">춥다 / 충전 시작 안 됨: 이번 데모에서는 미지원. 고장 진단이나 임의 차량 제어를 수행하지 않습니다.</p></div></section>
    <section><div class="card hero"><p class="eyebrow">REQUEST ≠ RESULT</p><h2>“했어요”에서 끝내지 않습니다.</h2><div class="big" style="font-size:32px">상태 확인 <small>그리고</small> 체감 확인</div><p>미확인 값은 그대로 남기고,<br>해결 여부는 운전자의 답변으로 기록합니다.</p></div><div class="card"><div class="row spread"><h3>상담 기록 <span class="tag">로컬 저장</span></h3><button class="small" data-action="history-clear" ${history.length?'':'disabled'}>기록 삭제</button></div>${storageError?`<p class="error">${esc(storageError)}</p>`:''}${history.length?history.map(h=>`<div class="history"><div class="row spread"><strong>앞유리 김서림</strong><span class="tag ${h.stage==='user-confirmed'?'':'warn'}">${esc(stageLabel(h.stage))}</span></div><p class="sub">${esc(h.at || '')}<br>관찰: ${stateLabel(h.before)} → ${stateLabel(h.after)}<br>체감: ${h.stage==='user-confirmed'?'사용자가 개선 확인':h.stage==='unresolved'?'개선 안 됨':'응답 없음'}</p></div>`).join(''):'<p class="sub">아직 기록이 없습니다. 상담을 마치면 새로고침 후에도 여기서 확인할 수 있습니다.</p>'}</div></section></div>`;
}
function render() { $('#app').innerHTML = tab==='mobility'?mobility():tab==='camping'?camping():troubleshoot(); document.querySelectorAll('[data-tab]').forEach(b=>{ b.classList.toggle('active',b.dataset.tab===tab); b.setAttribute('aria-pressed',String(b.dataset.tab===tab)); }); }
function saveCase() {
  const record = { stage:trouble.stage, before:trouble.before, after:trouble.after, at:new Date().toLocaleString('ko-KR') };
  history = [record,...history].slice(0,20);
  try { localStorage.setItem('pleos-cases-v1',JSON.stringify(history)); savedSession=true; storageError=''; }
  catch { storageError='기록 저장에 실패했습니다. 현재 화면에서만 확인 가능합니다.'; }
}
document.addEventListener('submit', e=>{
  e.preventDefault();
  if(e.target.id==='trip-form') {
    trip = { ...trip, place:$('#place').value, start:mins('start'), deadline:mins('deadline'), battery:num('battery'), travelMinutes:num('travel'), reserve:num('reserve'), capacity:num('capacity'), speed:num('speed'), consumption:num('consumption'), tasks:trip.tasks.map(t=>({...t,priority:num(`priority-${t.id}`),open:mins(`open-${t.id}`),close:mins(`close-${t.id}`),dwell:num(`dwell-${t.id}`),chargeKw:t.id==='charge'?num('chargeKw'):0})) };
    recalcTrip();
  } else if(e.target.id==='camp-form') { camp={battery:num('camp-battery'),capacity:num('camp-capacity'),hours:num('camp-hours'),rate:num('camp-rate'),reserve:num('camp-reserve')}; }
  render();
});
document.addEventListener('change',e=>{ if(e.target.dataset.check){ campChecks[e.target.dataset.check]=e.target.checked; render(); } });
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b || b.disabled)return;
  if(b.dataset.tab){tab=b.dataset.tab;render();return;}
  const a=b.dataset.action,id=b.dataset.id;
  try {
    if(a?.startsWith('trip-')) {
      if(['trip-normal','trip-tight','trip-low'].includes(a)){trip=initialTrip();taskStates={};if(a==='trip-tight')trip.deadline=1130;if(a==='trip-low')trip.battery=1;recalcTrip();}
      if(a==='trip-confirm')confirmedPlan=tripResult.plan;
      if(a==='trip-alternative'){confirmedPlan=tripResult.alternatives[Number(b.dataset.index)];confirmedPlan.excluded.forEach(id=>taskStates[id]='postponed');}
      if(a==='trip-delay'){trip.start+=20;recalcTrip();toast('20분 지연을 반영했습니다. 변경된 계획을 다시 선택해주세요.');}
      if(a==='trip-cancel'){taskStates[$('#cancel-task').value]='cancelled';recalcTrip();toast('선택한 일을 취소하고 다시 계산했습니다.');}
      if(a==='trip-visit'){const stop=confirmedPlan.stops.find(t=>t.id===id);taskStates=visitTask(taskStates,id);trip={...trip,start:stop.arrival,battery:100*stop.arrivalEnergy/trip.capacity,place:stop.name,atTask:id};toast('방문을 기록했습니다. 업무는 아직 미완료입니다.');}
      if(a==='trip-complete'){
        const stop=confirmedPlan.stops.find(t=>t.id===id);taskStates=completeTask(taskStates,id);
        trip={...trip,start:stop.depart,battery:100*stop.energy/trip.capacity,place:stop.name,atTask:null};recalcTrip();toast('완료를 기록하고 이 장소부터 남은 일정을 다시 계산했습니다.');
      }
    }
    if(a==='camp-reset'){camp={battery:60,capacity:60,hours:8,rate:1,reserve:20};campElapsed=0;departure=false;campChecks={};}
    if(a==='camp-spike')camp={...camp,rate:3};
    if(a==='camp-hour'){camp=advanceCamp(camp,1);campElapsed++;}
    if(a==='camp-option'){camp=campAlternatives(camp)[Number(b.dataset.index)].input;toast('선택한 대안으로 예측을 갱신했습니다. 실제 설정은 변경하지 않았습니다.');}
    if(a==='camp-depart'){departure=true;}
    if(a==='trouble-reset'){trouble=newSession();savedSession=false;}
    if(a==='trouble-query')trouble=transition(trouble,{type:'query',value:$('#before-state').value==='unknown'?null:$('#before-state').value});
    if(a==='trouble-approve')trouble=transition(trouble,{type:'approve'});
    if(a==='trouble-decline'){trouble=transition(trouble,{type:'decline'});saveCase();}
    if(a==='trouble-observe')trouble=transition(trouble,{type:'observe',value:$('#after-state').value==='unknown'?null:$('#after-state').value});
    if(['trouble-clear','trouble-unresolved'].includes(a)){trouble=transition(trouble,{type:'feedback',clear:a==='trouble-clear'});saveCase();}
    if(a==='history-clear'){localStorage.removeItem('pleos-cases-v1');history=[];storageError='';toast('이 데모의 상담 기록을 삭제했습니다.');}
    if(a)render();
  } catch(err){toast(err.message);}
});
render();
