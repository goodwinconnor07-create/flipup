import { test, expect } from '@playwright/test';
// Protocol-only fixture. These arbitrary numbers are NOT a computed poker hand or production data.
// The Learn tab is gone, so nothing on Home opens this; the test comes back with it.
test.skip('full Scroll questions play in sequence and save offline snapshots', async ({ page }) => {
  const scenario={schema:2,id:'s-protocol-test',family:'fixture',players:2,hero:0,
    cards:['As','Kd'],board:['Qs','Jh','2d'],pot:10,stacks:[20,20],wagers:[0,0],toCall:0,minRaiseTo:1,
    history:[],active:[true,true],difficulty:'close',tags:[],ranges:[],assumptions:'UI protocol test only',
    quality:{gapPct:0,iterations:200,heroFrequencyDrift:0,heroEvDrift:0,method:'test'},
    options:[{kind:'check',label:'Check',to:0,added:0,freq:1,ev:0,foldEquity:null},{kind:'fold',label:'Fold',to:0,added:0,freq:0,ev:-1,foldEquity:null}]};
  const hand={schema:3,id:'h-protocol-test',publicationApproved:true,assumptions:'UI fixture',preflop:[],
    decisions:[{scenario,line:0,event:0},{scenario:{...scenario,id:'s-protocol-test2'},line:0,event:2}]};
  await page.route('**/api/gto/scroll/hands/**',async route=>{
    await route.fulfill({json:route.request().url().endsWith('catalogue')?{count:1,items:[{id:hand.id}]}:hand});
  });
  await page.goto('/');
  await page.getByRole('tab',{name:'Learn'}).click();
  await page.getByRole('button',{name:'Play a full Scroll hand'}).click();
  await expect(page.getByText(/Decision 1 of 2/)).toBeVisible();
  await page.getByRole('button',{name:'Save full hand',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Full hand saved'})).toBeVisible();
  await page.getByRole('group',{name:'Your move'}).getByRole('button',{name:'Check',exact:true}).click();
  await page.getByRole('button',{name:'Continue hand',exact:true}).click();
  await expect(page.getByText(/Decision 2 of 2/)).toBeVisible();
  await page.getByRole('group',{name:'Your move'}).getByRole('button',{name:'Check',exact:true}).click();
  await page.getByRole('button',{name:'Continue hand',exact:true}).click();
  await expect(page.getByText(/Hand complete/)).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flipup.quiz')!).hands)).toBe(1);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('flipup.quizrecent')!)[0].id)).toBe('h-protocol-test');
  await page.reload();
  await page.getByRole('tab',{name:'Learn'}).click();
  await page.getByRole('button',{name:/Study bank/}).click();
  await page.route('**/api/gto/scroll/hands/h-*',r=>r.abort());
  await page.getByRole('button',{name:'Play again'}).first().click();
  await expect(page.getByText(/Decision 1 of 2/)).toBeVisible();
});
