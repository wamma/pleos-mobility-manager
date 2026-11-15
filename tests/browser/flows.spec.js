import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const dir = process.env.PLEOS_SCREENSHOT_DIR || join(process.cwd(),'test-results','screenshots');
async function shot(page,name) {
  await expect(page.locator('#toast')).toHaveText('', {timeout:7000});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await mkdir(dir,{recursive:true});
  const path=join(dir,`macOS_Chrome_desktop1440_${name}_${new Date().toISOString().replace(/[:.]/g,'-')}.png`);
  await page.screenshot({path,fullPage:true,animations:'disabled'});console.log(`SCREENSHOT ${path}`);
}
test.beforeEach(async({page})=>{await page.goto('/');});
test('each Android entry opens only its own idea', async({page})=>{
  for(const [idea,title] of [['mobility','내 이동 매니저'],['camping','차박 운영 매니저'],['trouble','내 차 문제 해결사']]) {
    await page.goto(`/?idea=${idea}&single=1`);
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.getByRole('navigation')).toBeHidden();
  }
});
test('fractional travel time uses valid clock and compact numeric labels',async({page})=>{
  await page.getByLabel('구간당 이동시간',{exact:true}).fill('14.99');
  await page.getByRole('button',{name:'입력으로 계획 계산'}).click();
  await expect(page.getByText('20:00 예상 귀가')).toBeVisible();
  await expect(page.locator('.statbar')).not.toContainText('999999');
  await page.getByRole('button',{name:'이 계획 확정',exact:true}).click();
  await page.getByRole('button',{name:'방문 확인',exact:true}).first().click();
  await expect(page.getByLabel('출발 시각',{exact:true})).not.toHaveValue('');
});
test('mobility normal, arrival, completion, delay and cancellation',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.getByText('19:40 예상 귀가')).toBeVisible();
  await page.getByRole('button',{name:'이 계획 확정',exact:true}).click();
  await page.getByRole('button',{name:'방문 확인',exact:true}).first().click();
  await expect(page.locator('.route')).toContainText('방문 · 완료 미확인');
  await shot(page,'이동_방문미완료');
  await page.getByRole('button',{name:'업무 완료',exact:true}).first().click();
  await expect(page.locator('.route')).not.toContainText('세탁물 수령');
  await expect(page.getByRole('heading',{name:'선택과 진행 기록'})).toBeVisible();
  await page.getByRole('button',{name:'20분 지연 적용'}).click();
  await expect(page.getByText('20:00 예상 귀가')).toBeVisible();
  await page.getByLabel('취소할 할 일').selectOption('shop');
  await page.getByRole('button',{name:'선택한 일 취소'}).click();
  await expect(page.locator('.route')).not.toContainText('장보기');
  await expect(page.getByText('취소 선택', {exact:true}).last()).toBeVisible();
  await shot(page,'이동_완료후지연취소');expect(errors).toEqual([]);
});
test('mobility impossible deadline and explicit alternative, missing battery',async({page})=>{
  await page.getByRole('button',{name:'시간 부족 시나리오',exact:true}).click();
  await expect(page.getByText('아직 어떤 할 일도 자동으로 제외하지 않았습니다.')).toBeVisible();
  await shot(page,'이동_시간부족_대안선택전');
  await page.getByRole('button',{name:'대안 1 선택·확정',exact:true}).click();
  await expect(page.getByRole('heading',{name:'이 계획으로 이동합니다.'})).toBeVisible();
  await expect(page.getByText('연기 선택',{exact:true}).last()).toBeVisible();
  await page.getByRole('button',{name:'배터리 부족 시나리오'}).click();
  await expect(page.getByRole('heading',{name:'현재 조건에서 실행 가능한 대안이 없습니다.'})).toBeVisible();
  await page.getByLabel('현재 잔량',{exact:true}).fill('');
  await page.getByRole('button',{name:'입력으로 계획 계산'}).click();
  await expect(page.getByRole('heading',{name:'계산에 필요한 값을 확인해주세요.'})).toBeVisible();
});
test('camp consumption spike, earlier departure, time progression and manual checklist',async({page})=>{
  await page.getByRole('button',{name:'02 차박 운영 매니저'}).click();
  await expect(page.getByText('46.7% 예상 출발 잔량')).toBeVisible();
  await shot(page,'차박_정상');
  await page.getByRole('button',{name:'소비 증가: 3 kW'}).click();
  await expect(page.getByText('20.0% 예상 출발 잔량')).toBeVisible();
  await expect(page.getByText('현재 조건대로라면 예비 기준보다 8.0 kWh 부족합니다.')).toBeVisible();
  await shot(page,'차박_소비증가');
  await page.getByRole('button',{name:'이 대안으로 다시 계산'}).last().click();
  await expect(page.getByText('33.3% 예상 출발 잔량')).toBeVisible();
  await page.getByRole('button',{name:'1시간 진행'}).click();
  await expect(page.getByLabel('차박 현재 잔량',{exact:true})).toHaveValue('55');
  await expect(page.getByText('33.3% 예상 출발 잔량')).toBeVisible();
  await page.getByRole('button',{name:'지금 출발 준비'}).click();
  for(const label of ['공조 · 사용 전 기준 22°C / 자동','실내등 · 사용 전 기준 꺼짐','좌석 · 출발에 적합한 위치 직접 확인'])await page.getByLabel(label).check();
  await expect(page.getByText('수동 확인 3/3 · 차량 복구 성공 여부는 미검증')).toBeVisible();
  await shot(page,'차박_출발수동확인');
});
test('camp reduce consumption alternative and unknown input',async({page})=>{
  await page.getByRole('button',{name:'02 차박 운영 매니저'}).click();
  await page.getByRole('button',{name:'소비 증가: 3 kW'}).click();
  await page.getByRole('button',{name:'이 대안으로 다시 계산'}).first().click();
  await expect(page.getByLabel('평균 소비 전력',{exact:true})).toHaveValue('2');
  await page.getByLabel('차박 현재 잔량',{exact:true}).fill('');
  await page.getByRole('button',{name:'이 조건으로 예측'}).click();
  await expect(page.getByRole('heading',{name:'잔량 예측 미확인'})).toBeVisible();
});
test('troubleshooter observation is not resolution and unresolved history survives reload',async({page})=>{
  await page.getByRole('button',{name:'03 내 차 문제 해결사'}).click();
  await page.getByRole('button',{name:'김서림 접수 · 모의 상태 조회'}).click();
  await page.getByRole('button',{name:'설명서 확인 · 수동 조작 진행'}).click();
  await expect(page.getByText('조치 후 상태 확인 대기',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'관찰 결과 기록'}).click();
  await expect(page.getByRole('heading',{name:'김서림이 해소됐나요?'})).toBeVisible();
  await page.getByRole('button',{name:'아직 김이 서려요'}).click();
  await expect(page.locator('.history')).toContainText('개선 안 됨');
  await shot(page,'해결사_상태변경후미해결');
  await page.reload();await page.getByRole('button',{name:'03 내 차 문제 해결사'}).click();
  await expect(page.locator('.history')).toContainText('개선 안 됨');
  await expect(page.locator('.history')).toContainText('꺼짐 (모의) → 켜짐 (모의)');
});
test('troubleshooter decline, unknown and user-confirmed result',async({page})=>{
  await page.getByRole('button',{name:'03 내 차 문제 해결사'}).click();
  await page.getByLabel('조회할 모의 상태').selectOption('unknown');
  await page.getByRole('button',{name:'김서림 접수 · 모의 상태 조회'}).click();
  await page.getByRole('button',{name:'조치 거절',exact:true}).click();
  await expect(page.locator('.history')).toContainText('조치 거절');
  await page.getByRole('button',{name:'새 상담'}).click();
  await page.getByLabel('조회할 모의 상태').selectOption('unknown');
  await page.getByRole('button',{name:'김서림 접수 · 모의 상태 조회'}).click();
  await page.getByRole('button',{name:'설명서 확인 · 수동 조작 진행'}).click();
  await page.getByLabel('조치 후 모의 관찰').selectOption('unknown');
  await page.getByRole('button',{name:'관찰 결과 기록'}).click();
  await page.getByRole('button',{name:'시야가 나아졌어요'}).click();
  await expect(page.locator('.history').first()).toContainText('미확인 → 미확인');
  await expect(page.locator('.history').first()).toContainText('사용자가 개선 확인');
  await shot(page,'해결사_미확인상태_체감개선');
});
