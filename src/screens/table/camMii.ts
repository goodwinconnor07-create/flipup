import * as THREE from 'three';
import { CAM } from '../../ui/theme';

/**
 * A Mii-style player for the table cam: a big round head with flat painted features, a cap of hair, a rounded
 * shirt, sleeves, and hands with fingers. Every player gets their own look from their name, the same on every
 * phone. The face is painted on the head and moves like a Wii Mii's: it blinks, looks about, talks, and pulls
 * the faces from the Mii set (happy, angry, glum, surprised, scared, crying with tears, love, smug...).
 * The arms reach for real things on the table with a two-joint reach that keeps them above the rail and felt.
 */

export type EyeKind = 'open' | 'closed' | 'happy' | 'wide' | 'x' | 'heart' | 'spiral' | 'half' | 'sad' | 'angry';
export type MouthKind = 'line' | 'smile' | 'grin' | 'o' | 'frown' | 'shock' | 'wavy' | 'teeth' | 'cry' | 'smirk' | 'tongue';

export interface Face {
  /** Both eyes, or [its left, its right] for a wink. */
  eyes: EyeKind | [EyeKind, EyeKind];
  mouth: MouthKind;
  /** Brows up (1) or down (-1). */
  raise: number;
  /** Brows angry (1, inner ends down) or worried (-1, inner ends up). */
  tilt: number;
  tears?: boolean;
  blush?: boolean;
}

/** The Mii faces, by name. */
export const FACES = {
  normal: { eyes: 'open', mouth: 'line', raise: 0, tilt: 0 },
  happy: { eyes: 'happy', mouth: 'smile', raise: 0.3, tilt: 0 },
  bigSmile: { eyes: 'happy', mouth: 'grin', raise: 0.6, tilt: 0, blush: true },
  cheerful: { eyes: 'open', mouth: 'grin', raise: 0.4, tilt: 0 },
  angry: { eyes: 'angry', mouth: 'frown', raise: -0.4, tilt: 1 },
  glum: { eyes: 'sad', mouth: 'frown', raise: -0.1, tilt: -1 },
  surprised: { eyes: 'wide', mouth: 'o', raise: 1, tilt: 0 },
  unbelievable: { eyes: 'wide', mouth: 'shock', raise: 1, tilt: -0.4 },
  sleep: { eyes: 'closed', mouth: 'line', raise: -0.2, tilt: 0 },
  wink: { eyes: ['closed', 'open'], mouth: 'smile', raise: 0.3, tilt: 0 },
  scared: { eyes: 'x', mouth: 'wavy', raise: 0.8, tilt: -1 },
  cry: { eyes: 'x', mouth: 'cry', raise: 0.3, tilt: -1, tears: true },
  disgusted: { eyes: 'x', mouth: 'frown', raise: -0.3, tilt: 0.8 },
  sigh: { eyes: 'closed', mouth: 'o', raise: 0, tilt: -0.6 },
  love: { eyes: 'heart', mouth: 'smile', raise: 0.4, tilt: 0, blush: true },
  determined: { eyes: 'angry', mouth: 'teeth', raise: -0.4, tilt: 1 },
  smug: { eyes: 'half', mouth: 'smirk', raise: 0.2, tilt: 0.4 },
  bored: { eyes: 'half', mouth: 'line', raise: -0.2, tilt: 0 },
  serious: { eyes: 'open', mouth: 'line', raise: -0.6, tilt: 0.7 },
  confused: { eyes: 'spiral', mouth: 'wavy', raise: 0.5, tilt: -0.5 },
  cheeky: { eyes: ['closed', 'open'], mouth: 'tongue', raise: 0.3, tilt: 0 },
} satisfies Record<string, Face>;
export type FaceName = keyof typeof FACES;

/** Head radius, in metres. A Mii's head is big for its body. */
const R = 0.125;
export const ARM = { upper: 0.21, lower: 0.21, r: 0.032 };
const EYE_PITCH = 0;
const EYE_SIZE = 0.05;

/** A repeatable random stream from a name. */
function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  // The first few draws from similar names come out alike: skip them.
  for (let i = 0; i < 4; i++) next();
  return next;
}

const pick = <T,>(xs: readonly T[], r: () => number) => xs[Math.floor(r() * xs.length)];

/** Features painted once and shared by every player. Eyes are drawn for its right eye; the left is the mirror. */
export class FaceKit {
  readonly eyes: Record<EyeKind | 'tall', THREE.CanvasTexture>;
  readonly brow: THREE.CanvasTexture;
  readonly nose: THREE.CanvasTexture;
  readonly mouths: Record<MouthKind, THREE.CanvasTexture>;
  readonly tears: THREE.CanvasTexture;
  readonly blush: THREE.CanvasTexture;

  constructor(renderer: THREE.WebGLRenderer) {
    const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      draw(ctx);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    };
    const ink = CAM.eye;
    const oval = (c: CanvasRenderingContext2D, rx: number) => {
      c.fillStyle = ink;
      c.beginPath();
      c.ellipse(256, 256, rx, 230, 0, 0, Math.PI * 2);
      c.fill();
    };
    const shine = (c: CanvasRenderingContext2D, rx: number, y = 160) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(256 + rx * 0.32, y, rx * 0.26, 46, 0, 0, Math.PI * 2);
      c.fill();
    };
    const eye = (rx: number) => (c: CanvasRenderingContext2D) => {
      oval(c, rx);
      shine(c, rx);
    };
    /** An eye with a lid across it: only what's below the line shows. The lid's height at the outer edge (left, on
     * its right eye) and the inner edge, by the nose. */
    const lidded = (outer: number, inner: number) => (c: CanvasRenderingContext2D) => {
      c.save();
      c.beginPath();
      c.moveTo(0, outer);
      c.lineTo(512, inner);
      c.lineTo(512, 512);
      c.lineTo(0, 512);
      c.closePath();
      c.clip();
      oval(c, 140);
      shine(c, 140, Math.max(inner, outer) + 70);
      c.restore();
      c.strokeStyle = ink;
      c.lineWidth = 34;
      c.beginPath();
      c.moveTo(90, outer + (inner - outer) * 0.18);
      c.lineTo(430, outer + (inner - outer) * 0.82);
      c.stroke();
    };
    const stroke = (w: number, path: (c: CanvasRenderingContext2D) => void, color = ink) => (c: CanvasRenderingContext2D) => {
      c.strokeStyle = color;
      c.lineWidth = w;
      c.beginPath();
      path(c);
      c.stroke();
    };
    this.eyes = {
      open: tex(512, 512, eye(150)),
      tall: tex(512, 512, eye(120)),
      closed: tex(512, 512, stroke(46, (c) => (c.moveTo(70, 250), c.quadraticCurveTo(256, 330, 442, 250)))),
      happy: tex(512, 512, stroke(50, (c) => (c.moveTo(80, 330), c.quadraticCurveTo(256, 120, 432, 330)))),
      wide: tex(512, 512, (c) => {
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(256, 256, 210, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = ink;
        c.lineWidth = 30;
        c.stroke();
        c.fillStyle = ink;
        c.beginPath();
        c.arc(256, 256, 70, 0, Math.PI * 2);
        c.fill();
      }),
      // ">" on its right eye (on the left as you look at it), so the pair reads > <.
      x: tex(512, 512, stroke(54, (c) => (c.moveTo(130, 110), c.lineTo(400, 256), c.lineTo(130, 400)))),
      heart: tex(512, 512, (c) => {
        c.fillStyle = CAM.heart;
        c.beginPath();
        c.moveTo(256, 450);
        c.bezierCurveTo(20, 300, 60, 60, 256, 170);
        c.bezierCurveTo(452, 60, 492, 300, 256, 450);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.7)';
        c.beginPath();
        c.ellipse(180, 190, 40, 26, -0.6, 0, Math.PI * 2);
        c.fill();
      }),
      spiral: tex(512, 512, (c) => {
        c.strokeStyle = ink;
        c.lineWidth = 26;
        c.beginPath();
        for (let a = 0; a < Math.PI * 7; a += 0.05) {
          const r = 10 + a * 10;
          const x = 256 + Math.cos(a) * r;
          const y = 256 + Math.sin(a) * r;
          if (a === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }),
      half: tex(512, 512, lidded(250, 250)),
      // Worried: the lid drops towards the outer edge. Angry: it drops towards the nose.
      sad: tex(512, 512, lidded(300, 170)),
      angry: tex(512, 512, lidded(160, 310)),
    };
    this.brow = tex(512, 256, (c) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(40, 170);
      c.quadraticCurveTo(250, 40, 470, 110);
      c.lineTo(470, 160);
      c.quadraticCurveTo(250, 110, 40, 210);
      c.closePath();
      c.fill();
    });
    this.nose = tex(256, 256, stroke(22, (c) => (c.moveTo(150, 40), c.quadraticCurveTo(70, 170, 120, 200), c.quadraticCurveTo(160, 215, 180, 190)), '#ffffff'));
    const lips = (draw: (c: CanvasRenderingContext2D) => void, fill?: string, w = 22) => (c: CanvasRenderingContext2D) => {
      c.beginPath();
      draw(c);
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      c.strokeStyle = CAM.lip;
      c.lineWidth = w;
      c.stroke();
    };
    const open = (path: (c: CanvasRenderingContext2D) => void, teeth?: [number, number], tongue?: boolean) => (c: CanvasRenderingContext2D) => {
      c.beginPath();
      path(c);
      c.closePath();
      c.fillStyle = CAM.mouth;
      c.fill();
      c.save();
      c.clip();
      if (teeth) {
        c.fillStyle = CAM.teeth;
        c.fillRect(0, teeth[0], 512, teeth[1]);
      }
      if (tongue) {
        c.fillStyle = CAM.tongue;
        c.beginPath();
        c.ellipse(256, 200, 90, 70, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      c.strokeStyle = CAM.lip;
      c.lineWidth = 16;
      c.stroke();
    };
    this.mouths = {
      line: tex(512, 256, lips((c) => (c.moveTo(150, 128), c.lineTo(362, 128)))),
      smile: tex(512, 256, lips((c) => (c.moveTo(130, 100), c.quadraticCurveTo(256, 190, 382, 100)))),
      frown: tex(512, 256, lips((c) => (c.moveTo(150, 160), c.quadraticCurveTo(256, 90, 362, 160)))),
      smirk: tex(512, 256, lips((c) => (c.moveTo(160, 140), c.quadraticCurveTo(300, 150, 380, 90)))),
      wavy: tex(512, 256, lips((c) => (c.moveTo(130, 130), c.quadraticCurveTo(180, 90, 225, 130), c.quadraticCurveTo(270, 170, 315, 130), c.quadraticCurveTo(355, 90, 390, 130)))),
      o: tex(512, 256, lips((c) => c.ellipse(256, 128, 46, 60, 0, 0, Math.PI * 2), CAM.mouth)),
      shock: tex(512, 256, open((c) => c.ellipse(256, 128, 80, 110, 0, 0, Math.PI * 2), [0, 40])),
      grin: tex(512, 256, open((c) => (c.moveTo(110, 70), c.quadraticCurveTo(256, 260, 402, 70)), [60, 46])),
      cry: tex(512, 256, open((c) => (c.moveTo(130, 200), c.quadraticCurveTo(256, 20, 382, 200)))),
      tongue: tex(512, 256, open((c) => (c.moveTo(150, 90), c.quadraticCurveTo(256, 230, 362, 90)), undefined, true)),
      teeth: tex(512, 256, (c) => {
        c.fillStyle = CAM.teeth;
        c.beginPath();
        c.roundRect(130, 80, 252, 96, 30);
        c.fill();
        c.strokeStyle = CAM.lip;
        c.lineWidth = 16;
        c.stroke();
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(130, 128);
        c.lineTo(382, 128);
        for (let x = 172; x < 382; x += 42) c.moveTo(x, 80), c.lineTo(x, 176);
        c.stroke();
      }),
    };
    this.tears = tex(128, 512, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, 'rgba(120,190,255,0.9)');
      g.addColorStop(1, 'rgba(120,190,255,0.75)');
      c.fillStyle = g;
      c.fillRect(44, 0, 40, 512);
      c.fillStyle = 'rgba(200,235,255,0.95)';
      for (let y = 40; y < 512; y += 128) {
        c.beginPath();
        c.ellipse(64, y, 30, 40, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
    this.tears.wrapT = THREE.RepeatWrapping;
    this.blush = tex(256, 128, (c) => {
      const g = c.createRadialGradient(128, 64, 4, 128, 64, 64);
      g.addColorStop(0, 'rgba(255,90,120,0.55)');
      g.addColorStop(1, 'rgba(255,90,120,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 128);
    });
  }

  dispose() {
    for (const t of [...Object.values(this.eyes), this.brow, this.nose, this.tears, this.blush, ...Object.values(this.mouths)]) t.dispose();
  }
}

/** Where on the head a feature sits: across (yaw) and up (pitch), in radians from the middle of the face. */
function frame(yaw: number, pitch: number) {
  const n = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const up = new THREE.Vector3().crossVectors(n, right);
  return { n, right, up };
}

/** A flat feature bent onto the head so it sits on the skin from any angle. `mirror` flips it for the left side. */
function decal(yaw: number, pitch: number, w: number, h: number, lift: number, mirror = false): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(w, h, 24, 24);
  const { n, right, up } = frame(yaw, pitch);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.copy(n)
      .multiplyScalar(R)
      .addScaledVector(right, p.getX(i))
      .addScaledVector(up, p.getY(i))
      .normalize()
      .multiplyScalar(R + lift);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  if (mirror) {
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  }
  g.computeVertexNormals();
  return g;
}

/** A rounded limb between two points: set each frame. */
class Limb {
  readonly mesh: THREE.Mesh;
  private static up = new THREE.Vector3(0, 1, 0);
  constructor(geo: THREE.CylinderGeometry, mat: THREE.Material) {
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
  }
  set(a: THREE.Vector3, b: THREE.Vector3) {
    const d = b.clone().sub(a);
    const len = d.length();
    this.mesh.position.copy(a).addScaledVector(d, 0.5);
    this.mesh.quaternion.setFromUnitVectors(Limb.up, d.divideScalar(len || 1));
    this.mesh.scale.set(1, len, 1);
  }
}

/** The lowest a point may be: the felt, the rail, or nothing to bump into. */
export type Floor = (p: THREE.Vector3) => number;

interface Arm {
  side: number;
  shoulder: THREE.Vector3;
  upper: Limb;
  lower: Limb;
  elbow: THREE.Mesh;
  hand: THREE.Group;
}

const v = () => new THREE.Vector3();

export class Mii {
  /** The whole player, positioned by the stage: its origin is the seat, just under table height, facing +z. */
  readonly root = new THREE.Group();
  /** Leans with the player: everything above the waist. */
  readonly body = new THREE.Group();
  readonly head = new THREE.Group();
  /** The top of its head, for the name above it. */
  readonly crown = new THREE.Object3D();
  private eyes: { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; pivot: THREE.Group }[] = [];
  private brows: { pivot: THREE.Group; n: THREE.Vector3; side: number }[] = [];
  private mouth: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private tears: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  private blushes: THREE.Mesh[] = [];
  private arms: Arm[] = [];
  private openEye: THREE.Texture;
  private disposables: { dispose(): void }[] = [];
  private face: Face = FACES.normal;
  private faceName = '';
  private blinkAt: number;

  constructor(
    who: string,
    private kit: FaceKit,
  ) {
    const r = seeded(who);
    const skin = pick(CAM.skin, r);
    const hair = pick(CAM.hair, r);
    // A shirt that stands apart from the skin, so nobody looks bare-chested.
    const skinC = new THREE.Color(skin);
    const far = CAM.shirt.filter((c) => {
      const d = new THREE.Color(c).sub(skinC);
      return Math.hypot(d.r, d.g, d.b) > 0.38;
    });
    const shirt = pick(far.length ? far : CAM.shirt, r);
    const style = pick(['spiky', 'bob', 'long', 'bun', 'short'] as const, r);
    this.openEye = r() < 0.5 ? kit.eyes.open : kit.eyes.tall;
    const browTilt = (r() - 0.35) * 0.5;
    const eyeGap = 0.3 + r() * 0.08;
    this.blinkAt = 1 + r() * 3;

    const keep = <T extends { dispose(): void }>(x: T) => (this.disposables.push(x), x);
    const skinMat = keep(new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.68, sheen: 0.2, sheenColor: '#ffd9c4', sheenRoughness: 0.7 }));
    const hairMat = keep(new THREE.MeshPhysicalMaterial({ color: hair, roughness: 0.5, sheen: 0.35, sheenColor: new THREE.Color(hair).lerp(new THREE.Color('#ffffff'), 0.35), sheenRoughness: 0.45 }));
    const shirtMat = keep(new THREE.MeshPhysicalMaterial({ color: shirt, roughness: 0.62, sheen: 0.5, sheenColor: '#ffffff', sheenRoughness: 0.7 }));
    const shade = new THREE.Color(skin).multiplyScalar(0.72);

    // The body: a rounded, slightly flattened shirt, shoulders to waist.
    const profile = [
      [0.0, 0.0],
      [0.13, 0.0],
      [0.15, 0.06],
      [0.152, 0.16],
      [0.135, 0.235],
      [0.09, 0.275],
      [0.045, 0.29],
      [0.0, 0.292],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = new THREE.Mesh(keep(new THREE.LatheGeometry(profile, 96)), shirtMat);
    torso.scale.z = 0.72;
    torso.castShadow = true;
    torso.receiveShadow = true;
    const neck = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.036, 0.04, 0.06, 32)), skinMat);
    neck.position.y = 0.3;
    this.body.add(torso, neck);

    // The head, with the face painted on.
    const skull = new THREE.Group();
    skull.scale.set(1, 1.04, 0.97);
    const ball = new THREE.Mesh(keep(new THREE.SphereGeometry(R, 128, 96)), skinMat);
    ball.castShadow = true;
    skull.add(ball);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(keep(new THREE.SphereGeometry(0.03, 32, 24)), skinMat);
      ear.scale.set(0.5, 1, 0.75);
      ear.position.set(s * R * 0.97, -0.008, -0.005);
      skull.add(ear);
    }
    const feature = (geo: THREE.BufferGeometry, map: THREE.Texture, color: THREE.ColorRepresentation = '#ffffff', order = 2) => {
      const m = keep(new THREE.MeshStandardMaterial({ map, color, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const mesh = new THREE.Mesh(keep(geo), m);
      mesh.renderOrder = order;
      return mesh;
    };
    for (const s of [-1, 1]) {
      // s is the side as seen from the front: -1 is its right eye, drawn as is; +1 its left, the mirror image.
      const pivot = new THREE.Group();
      const mesh = feature(decal(s * eyeGap, EYE_PITCH, EYE_SIZE, EYE_SIZE, 0.0012, s > 0), this.openEye) as Mii['eyes'][number]['mesh'];
      pivot.add(mesh);
      skull.add(pivot);
      this.eyes.push({ mesh, pivot });

      const tear = feature(decal(s * (eyeGap + 0.02), -0.3, 0.022, 0.12, 0.0014, s > 0), kit.tears, '#ffffff', 3) as Mii['tears'][number];
      // Its own copy, so each face's tears run on their own.
      tear.material.map = keep(kit.tears.clone());
      tear.material.map.needsUpdate = true;
      tear.visible = false;
      skull.add(tear);
      this.tears.push(tear);

      const blush = feature(decal(s * (eyeGap + 0.12), -0.2, 0.06, 0.03, 0.0008), kit.blush, '#ffffff', 1);
      blush.visible = false;
      skull.add(blush);
      this.blushes.push(blush);

      const bp = new THREE.Group();
      const brow = feature(decal(s * (eyeGap + 0.02), 0.25, 0.065, 0.032, 0.0016, s < 0), kit.brow, hair);
      bp.add(brow);
      skull.add(bp);
      const n = frame(s * (eyeGap + 0.02), 0.25).n;
      this.brows.push({ pivot: bp, n, side: s });
      bp.quaternion.setFromAxisAngle(n, -s * browTilt);
    }
    skull.add(feature(decal(0, -0.15, 0.032, 0.032, 0.0012), kit.nose, shade));
    this.mouth = feature(decal(0, -0.36, 0.09, 0.045, 0.0012), kit.mouths.line) as Mii['mouth'];
    skull.add(this.mouth);
    this.hair(style, skull, hairMat, keep, r);
    skull.position.y = R * 1.02 + 0.02;
    this.crown.position.y = R * 1.2 + 0.015;
    skull.add(this.crown);
    this.head.add(skull);
    this.head.position.y = 0.3;
    this.body.add(this.head);

    // Arms: sleeves in the shirt colour, and hands with a thumb and four fingers.
    const limb = keep(new THREE.CylinderGeometry(ARM.r, ARM.r, 1, 32, 1, true));
    const joint = keep(new THREE.SphereGeometry(ARM.r, 32, 24));
    const palm = keep(new THREE.SphereGeometry(0.03, 40, 28));
    const finger = keep(new THREE.CapsuleGeometry(0.0085, 0.028, 6, 16));
    const thumb = keep(new THREE.CapsuleGeometry(0.0095, 0.024, 6, 16));
    const cuff = keep(new THREE.TorusGeometry(ARM.r * 0.95, 0.008, 12, 32));
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Vector3(side * 0.14, 0.235, 0.005);
      const sj = new THREE.Mesh(joint, shirtMat);
      sj.position.copy(shoulder);
      const elbow = new THREE.Mesh(joint, shirtMat);
      for (const m of [sj, elbow]) m.castShadow = true;
      const upper = new Limb(limb, shirtMat);
      const lower = new Limb(limb, shirtMat);

      // The hand: +z along the fingers, +y the back of the hand.
      const hand = new THREE.Group();
      const c = new THREE.Mesh(cuff, shirtMat);
      c.position.z = -0.012;
      const p = new THREE.Mesh(palm, skinMat);
      p.scale.set(1.15, 0.55, 1.05);
      p.position.z = 0.02;
      hand.add(c, p);
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(finger, skinMat);
        f.rotation.x = Math.PI / 2 + 0.45 + i * 0.05;
        f.position.set((i - 1.5) * 0.017, -0.006, 0.058 - Math.abs(i - 1.5) * 0.004);
        hand.add(f);
      }
      const t = new THREE.Mesh(thumb, skinMat);
      // On the side towards the other hand.
      t.position.set(-side * 0.034, -0.004, 0.028);
      t.rotation.set(Math.PI / 2, 0, -side * 0.9);
      hand.add(t);
      hand.traverse((m) => (m.castShadow = true));
      this.body.add(sj, elbow, hand, upper.mesh, lower.mesh);
      this.arms.push({ side, shoulder, upper, lower, elbow, hand });
    }
    this.root.add(this.body);
  }

  private hair(style: string, skull: THREE.Group, mat: THREE.Material, keep: <T extends { dispose(): void }>(x: T) => T, r: () => number) {
    const add = (geo: THREE.BufferGeometry, f?: (m: THREE.Mesh) => void) => {
      const m = new THREE.Mesh(keep(geo), mat);
      m.castShadow = true;
      f?.(m);
      skull.add(m);
      return m;
    };
    // A cap over the top and back, tipped back so the face shows.
    const tip = style === 'bob' || style === 'long' ? 0.62 : 0.7;
    add(new THREE.SphereGeometry(R * 1.055, 128, 64, 0, Math.PI * 2, 0, Math.PI * 0.55), (m) => (m.rotation.x = -tip));
    // Sides down past the ears, leaving the face open.
    if (style !== 'spiky' && style !== 'short') {
      const down = style === 'long' ? 0.66 : style === 'bob' ? 0.58 : 0.5;
      add(new THREE.SphereGeometry(R * 1.065, 128, 48, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.32, Math.PI * (down - 0.32)), (m) => m.scale.set(1.02, 1, 1.02));
    }
    // A fringe of soft points over the forehead.
    const points = style === 'spiky' ? 7 : style === 'short' ? 5 : 6;
    const cone = keep(new THREE.ConeGeometry(style === 'spiky' ? 0.034 : 0.04, style === 'spiky' ? 0.09 : 0.065, 48));
    for (let i = 0; i < points; i++) {
      const yaw = (i / (points - 1) - 0.5) * (style === 'spiky' ? 1.25 : 1.1) + (r() - 0.5) * 0.06;
      const { n, right, up } = frame(yaw, 0.5 + (style === 'spiky' ? 0.02 : -0.02));
      const m = new THREE.Mesh(cone, mat);
      m.castShadow = true;
      // Pointing down the forehead, flattened against it.
      m.matrix.makeBasis(right, up.clone().negate(), n.clone().negate());
      m.quaternion.setFromRotationMatrix(m.matrix);
      m.position.copy(n).multiplyScalar(R * 1.03);
      m.scale.set(1.15, 1, 0.7);
      skull.add(m);
    }
    if (style === 'long') {
      // A braid down the back.
      for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.042 - i * 0.006, 48, 32), (m) => m.position.set(0.02 * Math.sin(i), -0.06 - i * 0.05, -R * 0.95 - i * 0.008));
    }
    if (style === 'bun') add(new THREE.SphereGeometry(0.055, 64, 48), (m) => m.position.set(0, R * 0.85, -R * 0.55));
    if (style === 'spiky') {
      for (let i = 0; i < 5; i++) {
        const yaw = (i / 4 - 0.5) * 2.2;
        const { n, up } = frame(yaw, 1.05);
        add(cone, (m) => {
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.clone().addScaledVector(up, -0.6).normalize());
          m.position.copy(n).multiplyScalar(R * 1.02);
          m.scale.set(1, 0.8, 0.6);
        });
      }
    }
  }

  /** Pull one of the Mii faces. */
  express(name: FaceName) {
    if (name === this.faceName) return;
    this.faceName = name;
    this.face = FACES[name];
    const f = this.face;
    const [left, right] = Array.isArray(f.eyes) ? f.eyes : [f.eyes, f.eyes];
    // this.eyes[0] is its right eye (on the left as you look at it).
    this.setEye(0, right);
    this.setEye(1, left);
    this.mouth.material.map = this.kit.mouths[f.mouth];
    for (const t of this.tears) t.visible = !!f.tears;
    for (const b of this.blushes) b.visible = !!f.blush;
    for (const b of this.brows) {
      b.pivot.position.y = f.raise * 0.007;
      b.pivot.children[0].quaternion.setFromAxisAngle(b.n, b.side * f.tilt * 0.35);
    }
  }

  private setEye(i: number, kind: EyeKind) {
    this.eyes[i].mesh.material.map = kind === 'open' ? this.openEye : this.kit.eyes[kind];
  }

  /** Moves the face along: blinks, talking, tears. Call once a frame. */
  tick(t: number, dt: number, talking: boolean) {
    const f = this.face;
    const [left, right] = Array.isArray(f.eyes) ? f.eyes : [f.eyes, f.eyes];
    // A blink every few seconds, on eyes that are open.
    if (t > this.blinkAt + 0.09) this.blinkAt = t + 2.2 + Math.random() * 3.2;
    const shut = t > this.blinkAt;
    const blinks = (k: EyeKind) => k === 'open' || k === 'wide' || k === 'half' || k === 'sad' || k === 'angry';
    this.setEye(0, shut && blinks(right) ? 'closed' : right);
    this.setEye(1, shut && blinks(left) ? 'closed' : left);
    // Talking: the mouth opens and shuts in an uneven rhythm, like a Mii saying its line.
    const flap = talking && Math.sin(t * 17) + Math.sin(t * 9.3) > 0.2;
    this.mouth.material.map = flap ? this.kit.mouths[f.mouth === 'grin' || f.mouth === 'smile' ? 'grin' : 'o'] : this.kit.mouths[f.mouth];
    if (f.tears) for (const tear of this.tears) tear.material.map!.offset.y = -t * 0.8;
    void dt;
  }

  /** Where it's looking: -1 to its right to 1 to its left, and -1 down to 1 up. */
  look(x: number, y: number) {
    for (const e of this.eyes) e.pivot.rotation.set(-y * 0.12, x * 0.16, 0);
  }

  /** Put each hand at a point in the room, elbows out, the arms kept above whatever `floor` says is there. */
  reach(left: THREE.Vector3, right: THREE.Vector3, floor: Floor) {
    this.root.updateMatrixWorld(true);
    const toLocal = this.body.matrixWorld.clone().invert();
    const bodyQ = this.body.getWorldQuaternion(new THREE.Quaternion());
    const fromWorldQ = bodyQ.clone().invert();
    [right, left].forEach((target, i) => {
      // arms[0] is on its right (side -1).
      const arm = this.arms[i];
      const s = arm.shoulder.clone().applyMatrix4(this.body.matrixWorld);
      const a = ARM.upper;
      const b = ARM.lower;
      const goal = target.clone();
      goal.y = Math.max(goal.y, floor(goal) + 0.02);
      const dir = goal.clone().sub(s);
      const d = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.01, dir.length()));
      dir.normalize();
      const hand = s.clone().addScaledVector(dir, d);
      const x = (a * a - b * b + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, a * a - x * x));
      // Elbows hang down and a little back and out, so the arms fall naturally to the rail.
      const pole = new THREE.Vector3(arm.side * 0.35, -1, -0.4).applyQuaternion(bodyQ);
      pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      const elbow = s.clone().addScaledVector(dir, x).addScaledVector(pole, h);
      // Keep both parts of the arm above the rail and the felt: lift the elbow (and the hand) where they'd dip in.
      for (let pass = 0; pass < 2; pass++) {
        let lift = 0;
        for (let k = 1; k <= 10; k++) {
          const u = k / 11;
          const p1 = s.clone().lerp(elbow, u);
          const need1 = floor(p1) + ARM.r + 0.004 - p1.y;
          if (need1 > 0) lift = Math.max(lift, need1 / u);
          const p2 = elbow.clone().lerp(hand, u);
          const need2 = floor(p2) + ARM.r + 0.004 - p2.y;
          if (need2 > 0) lift = Math.max(lift, need2 / (1 - u));
        }
        elbow.y += Math.min(lift, 0.25);
      }
      const handNeed = floor(hand) + 0.02 - hand.y;
      if (handNeed > 0) hand.y += handNeed;

      const sL = arm.shoulder;
      const eL = elbow.clone().applyMatrix4(toLocal);
      const hL = hand.clone().applyMatrix4(toLocal);
      arm.upper.set(sL, eL);
      arm.lower.set(eL, hL);
      arm.elbow.position.copy(eL);
      arm.hand.position.copy(hL);
      // The hand lies along the forearm, flattened towards the table, palm down.
      const along = hand.clone().sub(elbow);
      along.y *= 0.35;
      along.normalize().applyQuaternion(fromWorldQ);
      const upL = new THREE.Vector3(0, 1, 0).applyQuaternion(fromWorldQ);
      const xAxis = v().crossVectors(upL, along).normalize();
      const yAxis = v().crossVectors(along, xAxis).normalize();
      arm.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, along));
    });
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
  }
}
