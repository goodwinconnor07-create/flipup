import { expect, test, type Browser, type Page } from '@playwright/test';
import { shot, watchErrors } from './helpers';

/** A phone with a name and a face already set, on the Party tab. */
async function phone(browser: Browser, name: string, emoji: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript(([n, e]) => localStorage.setItem('flipup.profile', JSON.stringify({ name: n, emoji: e })), [name, emoji]);
  const page = await context.newPage();
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('tab', { name: /^Party/ }).click();
  return page;
}

async function myCode(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Get my code' }).click();
  const value = page.locator('.friend-code-value');
  await expect(value).toHaveText(/^\d{6}$/);
  return (await value.textContent()) ?? '';
}

async function addFriend(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: 'Add a friend' }).click();
  await expect(page.getByRole('group', { name: 'Friend code numbers' })).toBeVisible();
  for (const digit of code) await page.keyboard.press(digit);
}

/** Drags the friends page down from the top, the way a thumb pulls to refresh. */
async function pullToRefresh(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const sheet = document.querySelector('.home-sheet')!;
    const touch = (y: number) => new Touch({ identifier: 1, target: sheet, clientX: 200, clientY: y });
    sheet.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(200)], bubbles: true }));
    for (let y = 220; y <= 400; y += 20) {
      sheet.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(y)], bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 16));
    }
    sheet.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true }));
  });
}

test('friends: a request shows Pending at once, reaches the other phone on its own, and is accepted from the pill', async ({ browser }) => {
  const ann = await phone(browser, 'Ann', '🦊');
  const ben = await phone(browser, 'Ben', '🐻');
  const annCode = await myCode(ann);

  // Ben adds Ann: she's on his list straight away, marked Pending (no leaving the tab and coming back).
  await addFriend(ben, annCode);
  await expect(ben.getByText(/Request sent/)).toBeVisible();
  const annOnBen = ben.locator('.friend-row', { hasText: 'Ann' });
  await expect(annOnBen).toBeVisible();
  await expect(annOnBen.getByText('Pending')).toBeVisible();
  await shot(ben, 'friends-1-pending');

  // Ann does nothing: within a few seconds the Party tab carries a red 1.
  await ann.getByRole('tab', { name: /^Play/ }).click();
  const pill = ann.getByTestId('tab-requests');
  await expect(pill).toHaveText('1', { timeout: 12_000 });
  await expect(ann.getByRole('tab', { name: 'Party, 1 friend request' })).toBeVisible();
  await shot(ann, 'friends-2-pill');

  // The pill opens the requests sheet; Accept moves Ben into her friends and the sheet closes itself.
  await pill.click();
  const sheet = ann.getByRole('dialog');
  await expect(sheet.getByText('Friend requests')).toBeVisible();
  await expect(sheet.getByRole('group', { name: 'Friend request from Ben' })).toBeVisible();
  await shot(ann, 'friends-3-sheet');
  await sheet.getByRole('button', { name: 'Accept Ben' }).click();
  await expect(sheet).toBeHidden();
  await expect(pill).toBeHidden();
  await ann.getByRole('tab', { name: /^Party/ }).click();
  await expect(ann.locator('.friend-row', { hasText: 'Ben' })).toBeVisible();
  await expect(ann.locator('.friend-row', { hasText: 'Ben' }).getByText('Pending')).toHaveCount(0);

  // Ben's Pending clears on its own.
  await expect(annOnBen.getByText('Pending')).toHaveCount(0, { timeout: 12_000 });
});

test('friends: a denied request quietly goes, and a pull to refresh shows placeholders for the friend rows only', async ({ browser }) => {
  const ann = await phone(browser, 'Ann', '🦊');
  const cat = await phone(browser, 'Cat', '🐱');
  const annCode = await myCode(ann);

  await addFriend(cat, annCode);
  const annOnCat = cat.locator('.friend-row', { hasText: 'Ann' });
  await expect(annOnCat.getByText('Pending')).toBeVisible();

  // On the Party tab the request is its own section at the top, with Accept and Deny.
  await expect(ann.getByRole('heading', { name: 'Incoming Friend Requests' })).toBeVisible({ timeout: 12_000 });
  await shot(ann, 'friends-4-section');
  await ann.getByRole('button', { name: 'Deny Cat' }).click();
  await expect(ann.getByRole('heading', { name: 'Incoming Friend Requests' })).toBeHidden();

  // Cat is told nothing; Ann just drops off her list at the next look.
  await expect(annOnCat).toHaveCount(0, { timeout: 12_000 });

  // A pull to refresh: placeholders where the friend rows are, the rest of the page stays.
  await pullToRefresh(cat);
  await expect(cat.locator('.skeleton-row').first()).toBeVisible();
  await expect(cat.getByRole('button', { name: /Host a party/ })).toBeVisible();
  await expect(cat.getByRole('button', { name: 'Add a friend' })).toBeVisible();
  await expect(cat.locator('.skeleton-row')).toHaveCount(0);
});

test('friends: two people adding each other are friends at once', async ({ browser }) => {
  const ann = await phone(browser, 'Ann', '🦊');
  const dan = await phone(browser, 'Dan', '🐶');
  const annCode = await myCode(ann);
  const danCode = await myCode(dan);

  await addFriend(ann, danCode);
  await expect(ann.locator('.friend-row', { hasText: 'Dan' }).getByText('Pending')).toBeVisible();
  await addFriend(dan, annCode);
  await expect(dan.getByText('Ann is your friend now.')).toBeVisible();
  await expect(dan.locator('.friend-row', { hasText: 'Ann' }).getByText('Pending')).toHaveCount(0);
  await expect(ann.locator('.friend-row', { hasText: 'Dan' }).getByText('Pending')).toHaveCount(0, { timeout: 12_000 });
  await expect(ann.getByRole('heading', { name: 'Incoming Friend Requests' })).toHaveCount(0);
});
