import { chromium, expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { setName, shot, watchErrors } from './helpers';

/** Hosts an online table and opens the invite sheet with its QR code. Returns the code's image file and what it says. */
async function hostWithQr(page: Page, dir: string): Promise<{ png: string; text: string }> {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Friends' }).click();
  await setName(page, 'Kavi');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Open the table' }).click();
  await page.getByRole('button', { name: 'QR code' }).click();
  const svg = page.getByRole('img', { name: 'QR code to join' });
  await expect(svg).toBeVisible();
  await page.waitForTimeout(800);
  await shot(page, 'qr-invite');
  const png = join(dir, 'qr.png');
  await svg.screenshot({ path: png });
  const img = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const text = jsQR(new Uint8ClampedArray(img.data), img.info.width, img.info.height)?.data ?? '';
  return { png, text };
}

test('the invite QR code reads back as the join link, and the link seats a friend', async ({ page, browser, baseURL }) => {
  const dir = mkdtempSync(join(tmpdir(), 'qr-'));
  const { text } = await hostWithQr(page, dir);
  // Written in capitals so the code has fewer, bigger squares; web addresses don't mind.
  expect(text.toLowerCase()).toMatch(new RegExp(`^${baseURL}/[a-z]{5}$`));

  const friend = await (await browser.newContext()).newPage();
  await friend.goto(text);
  await expect(friend.getByText("Kavi's table")).toBeVisible();
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await setName(friend, 'Remi');
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await expect(page.locator('.roster-item', { hasText: 'Remi' })).toBeVisible();
});

test('the in-app scanner reads the host\'s QR code from the camera and finds the table', async ({ page }) => {
  test.skip(!hasFfmpeg(), 'needs ffmpeg to make a fake camera feed');
  const dir = mkdtempSync(join(tmpdir(), 'qr-'));
  const { png } = await hostWithQr(page, dir);

  // A fake camera that films the QR code: a short video of it on a grey background, as a phone would see another phone.
  const frame = join(dir, 'frame.png');
  await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 120, g: 120, b: 120 } } })
    .composite([{ input: await sharp(png).resize(300, 300).toBuffer(), gravity: 'center' }])
    .png()
    .toFile(frame);
  const video = join(dir, 'camera.y4m');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-i', frame, '-t', '3', '-pix_fmt', 'yuv420p', video]);

  const phone = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
  });
  const ctx = await phone.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  const friend = await ctx.newPage();
  watchErrors(friend);
  await friend.goto('/');
  await friend.getByRole('button', { name: 'Join with a code' }).click();
  await friend.getByRole('button', { name: /Scan a QR code/ }).click();
  await expect(friend.getByText("Kavi's table")).toBeVisible({ timeout: 15_000 });
  await phone.close();
});

function hasFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
