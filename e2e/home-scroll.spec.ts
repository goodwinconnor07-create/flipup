import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Sam', emoji: '🦄' }));
    localStorage.setItem('flipup.appearance', JSON.stringify('dark'));
    localStorage.setItem('flipup.campaign', JSON.stringify({ v: 1, chips: 3122, peak: 3522, intro: true }));
  });
  await page.goto('/');
});

test('long Home content is never transformed or faded as a single layer', async ({ page }) => {
  for (const tab of ['Party', 'Play', 'Campaign']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    // Inspect the middle of any entrance animation, even on a fast test machine. Promoting the
    // entire tall pane can leave Safari's scrolling tiles blank, even after the animation ends.
    const promoted = await page.locator('.home-pane').evaluate((pane) => {
      const ancestors: HTMLElement[] = [];
      for (let el: HTMLElement | null = pane as HTMLElement; el; el = el.parentElement) ancestors.push(el);
      for (const el of ancestors) {
        for (const animation of el.getAnimations()) {
          animation.pause();
          animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
        }
      }
      return ancestors
        .filter((el) => el.getBoundingClientRect().height > window.innerHeight)
        .filter((el) => {
          const style = getComputedStyle(el);
          return style.transform !== 'none' || Number(style.opacity) < 1 || style.filter !== 'none';
        })
        .map((el) => el.className);
    });
    expect(promoted, `${tab} must keep long content in the normal scrolling paint path`).toEqual([]);
  }
});

test('scrolling and switching tabs keeps content visible and returning from a screen restores position', async ({ page }) => {
  const scroller = page.locator('.home-sheet');
  for (const tab of ['Play', 'Party', 'Campaign', 'Play']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(0);
    await expect(page.getByRole('heading', { name: tab, exact: true })).toBeInViewport();
    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollTop - (el.scrollHeight - el.clientHeight)))).toBeLessThan(1);
    if (tab === 'Play') await expect(page.getByRole('button', { name: /^Bean Stalk\./ })).toBeInViewport();
    if (tab === 'Campaign') await expect(page.getByRole('button', { name: 'How the campaign works' })).toBeInViewport();
    await shot(page, `home-scroll-${tab.toLowerCase()}-bottom`);
    await scroller.evaluate((el) => el.scrollTo(0, 0));
    await expect(page.getByRole('heading', { name: tab, exact: true })).toBeInViewport();
    await shot(page, `home-scroll-${tab.toLowerCase()}-top`);
    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  }

  const position = await scroller.evaluate((el) => el.scrollTop);
  // Opening a real screen unmounts Home; going back should preserve the current tab and offset.
  await page.evaluate(async () => {
    const storePath = '/src/state/store.ts';
    const { navigate } = await import(/* @vite-ignore */ storePath);
    navigate({ name: 'profile', then: 'done' });
  });
  await expect(scroller).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Play', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(position);
});
