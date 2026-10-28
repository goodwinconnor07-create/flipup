import { useEffect, useRef, useState } from 'react';

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

/** The browser's own QR reader where it has one (Chrome, Android); jsQR everywhere else. */
function makeDetector(): Detector | null {
  const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (!Native) return null;
  try {
    return new Native({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

/** Live camera view that calls onText once for the first QR code it reads. */
export function QRScanner({ onText }: { onText: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const handler = useRef(onText);
  handler.current = onText;
  const [error, setError] = useState('');

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer = 0;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera. Type the code instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch (e) {
        const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
        setError(denied ? 'Camera access is off. Allow it in your browser settings, or type the code.' : "Couldn't open the camera. Type the code instead.");
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const el = video.current;
      if (!el) return;
      el.srcObject = stream;
      await el.play().catch(() => {});

      const native = makeDetector();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let jsQR: typeof import('jsqr').default | null = null;
      if (!native) jsQR = (await import('jsqr')).default;

      const scan = async () => {
        if (stopped) return;
        let text = '';
        try {
          if (el.videoWidth) {
            if (native) {
              text = (await native.detect(el))[0]?.rawValue ?? '';
            } else if (ctx && jsQR) {
              // Enough detail to read a code across a table, small enough to scan several times a second.
              const scale = Math.min(1, 800 / el.videoWidth);
              canvas.width = Math.round(el.videoWidth * scale);
              canvas.height = Math.round(el.videoHeight * scale);
              ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(img.data, img.width, img.height)?.data ?? '';
            }
          }
        } catch {
          // A bad frame; try the next one.
        }
        if (stopped) return;
        if (text) handler.current(text);
        timer = window.setTimeout(scan, text ? 800 : 150);
      };
      void scan();
    };
    void start();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <p className="bad" role="alert" style={{ margin: 0, textAlign: 'center' }}>
        {error}
      </p>
    );
  }
  return (
    <div className="scanner">
      <video ref={video} muted playsInline aria-label="Camera" />
      <i className="scanner-frame" aria-hidden />
    </div>
  );
}
