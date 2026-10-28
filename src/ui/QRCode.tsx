import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

/** Characters QR codes store in their compact alphanumeric mode. */
const ALPHANUMERIC = /^[0-9A-Z $%*+\-./:]*$/;
/** A wide white margin all round (the QR standard asks for four modules), so a camera finds the code even on a dark screen. */
const QUIET = 4;

/**
 * Crisp SVG QR code, so friends can scan the host's screen to join. A join link is written in capitals
 * (web addresses don't mind), which QR stores far more compactly: fewer, bigger squares that cameras read easily.
 */
export function QRCode({ text, size = 220 }: { text: string; size?: number }) {
  const { n, d } = useMemo(() => {
    const upper = /^https?:\/\/[^/]+\/[a-z0-9]*$/i.test(text) ? text.toUpperCase() : text;
    const qr = qrcode(0, 'M');
    qr.addData(upper, ALPHANUMERIC.test(upper) ? 'Alphanumeric' : 'Byte');
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    }
    return { n: count, d: path };
  }, [text]);

  return (
    <svg viewBox={`${-QUIET} ${-QUIET} ${n + QUIET * 2} ${n + QUIET * 2}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="QR code to join">
      <rect x={-QUIET} y={-QUIET} width={n + QUIET * 2} height={n + QUIET * 2} fill="#fff" />
      <path d={d} fill="#0b0b12" />
    </svg>
  );
}
