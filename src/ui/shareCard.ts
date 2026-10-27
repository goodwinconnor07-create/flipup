// A picture of your result to send to a friend. Drawn on a canvas, so nothing leaves the phone until you share it.

export interface CardInfo {
  headline: string;
  sub: string;
  emoji: string;
  big: string;
  stats: { label: string; value: string }[];
}

function draw(info: CardInfo): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, 1350);
  bg.addColorStop(0, '#1a8cff');
  bg.addColorStop(1, '#0b7545');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1080, 1350);
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = '200px system-ui, sans-serif';
  g.fillText(info.emoji, 540, 300);
  g.font = '600 84px system-ui, sans-serif';
  g.fillText(info.headline, 540, 450);
  g.font = '400 44px system-ui, sans-serif';
  g.globalAlpha = 0.8;
  g.fillText(info.sub, 540, 520);
  g.globalAlpha = 1;
  g.font = '700 190px system-ui, sans-serif';
  g.fillText(info.big, 540, 760);
  g.font = '400 40px system-ui, sans-serif';
  g.globalAlpha = 0.8;
  g.fillText('chips', 540, 820);
  info.stats.slice(0, 4).forEach((s, i) => {
    const x = 270 + (i % 2) * 540;
    const y = 960 + Math.floor(i / 2) * 150;
    g.globalAlpha = 1;
    g.font = '600 72px system-ui, sans-serif';
    g.fillText(s.value, x, y);
    g.globalAlpha = 0.75;
    g.font = '400 36px system-ui, sans-serif';
    g.fillText(s.label, x, y + 50);
  });
  g.globalAlpha = 0.7;
  g.font = '600 40px system-ui, sans-serif';
  g.fillText('FlipUp', 540, 1280);
  return c;
}

/** Shares the card as a picture where the phone allows it. Returns false when it couldn't, so the caller can fall back to text. */
export async function shareCard(info: CardInfo): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((ok) => draw(info).toBlob(ok, 'image/png'));
    if (!blob) return false;
    const file = new File([blob], 'flipup-result.png', { type: 'image/png' });
    if (!navigator.canShare?.({ files: [file] })) return false;
    await navigator.share({ files: [file], title: 'FlipUp result' });
    return true;
  } catch (e) {
    // Closing the share sheet counts as handled.
    return e instanceof DOMException && e.name === 'AbortError';
  }
}
