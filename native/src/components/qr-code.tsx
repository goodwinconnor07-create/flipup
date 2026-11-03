import makeQR from 'qrcode-generator';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Characters QR codes store in their compact alphanumeric mode. */
const ALPHANUMERIC = /^[0-9A-Z $%*+\-./:]*$/;
/** The white margin all round (the standard asks for four modules), so a camera finds the code on a dark screen too. */
const QUIET = 4;

/**
 * A crisp QR code for a join link (the web's `QRCode`). Links are written in capitals, which web addresses don't
 * mind and QR stores far more compactly: fewer, bigger squares that a camera across the table reads easily.
 */
export function QRCode({ text, size = 200, label = 'QR code to join' }: { text: string; size?: number; label?: string }) {
  const { n, d } = useMemo(() => {
    const upper = /^https?:\/\/[^/]+(\/[a-z0-9]*)*$/i.test(text) ? text.toUpperCase() : text;
    const qr = makeQR(0, 'M');
    qr.addData(upper, ALPHANUMERIC.test(upper) ? 'Alphanumeric' : 'Byte');
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    }
    return { n: count, d: path };
  }, [text]);
  const box = n + QUIET * 2;
  return (
    <Svg width={size} height={size} viewBox={`${-QUIET} ${-QUIET} ${box} ${box}`} accessible accessibilityLabel={label} accessibilityRole="image">
      <Rect x={-QUIET} y={-QUIET} width={box} height={box} fill="#ffffff" />
      <Path d={d} fill="#0b0b12" />
    </Svg>
  );
}
