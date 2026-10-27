import * as THREE from 'three';
import { CAM } from '../../ui/theme';

/**
 * A Mii-style player for the live cam: a big round head with flat painted features, a cap of hair, a rounded
 * body and ball hands in the shirt colour. Every bot gets its own look from its name, the same on every phone.
 * The face is painted on the head (eyes, brows, nose, mouth) and moves: it blinks, looks about, frowns, grins.
 * The arms reach for real things on the table (its cards, a chip) with a two-joint reach.
 */

export type Eyes = 'open' | 'closed' | 'happy';
export type Mouth = 'line' | 'smile' | 'grin' | 'o' | 'frown';

/** Head radius, in metres. A Mii's head is big for its body. */
const R = 0.125;
const ARM = { upper: 0.25, lower: 0.25, r: 0.034, hand: 0.044 };

/** A repeatable random stream from a name. */
function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const pick = <T,>(xs: readonly T[], r: () => number) => xs[Math.floor(r() * xs.length)];

/** Features painted once and shared by every player: white where they take a tint, coloured where they don't. */
export class FaceKit {
  readonly eyes: Record<Eyes | 'tall', THREE.CanvasTexture>;
  readonly brow: THREE.CanvasTexture;
  readonly nose: THREE.CanvasTexture;
  readonly mouths: Record<Mouth, THREE.CanvasTexture>;

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
    const eye = (rx: number) => (c: CanvasRenderingContext2D) => {
      c.fillStyle = CAM.eye;
      c.beginPath();
      c.ellipse(256, 256, rx, 230, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(256 + rx * 0.32, 160, rx * 0.26, 46, 0, 0, Math.PI * 2);
      c.fill();
    };
    this.eyes = {
      open: tex(512, 512, eye(150)),
      tall: tex(512, 512, eye(120)),
      closed: tex(512, 512, (c) => {
        c.strokeStyle = CAM.eye;
        c.lineWidth = 46;
        c.beginPath();
        c.moveTo(70, 250);
        c.quadraticCurveTo(256, 330, 442, 250);
        c.stroke();
      }),
      happy: tex(512, 512, (c) => {
        c.strokeStyle = CAM.eye;
        c.lineWidth = 50;
        c.beginPath();
        c.moveTo(80, 330);
        c.quadraticCurveTo(256, 120, 432, 330);
        c.stroke();
      }),
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
    this.nose = tex(256, 256, (c) => {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 22;
      c.beginPath();
      c.moveTo(150, 40);
      c.quadraticCurveTo(70, 170, 120, 200);
      c.quadraticCurveTo(160, 215, 180, 190);
      c.stroke();
    });
    const lips = (c: CanvasRenderingContext2D, draw: () => void, fill?: string) => {
      c.beginPath();
      draw();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      c.strokeStyle = CAM.lip;
      c.lineWidth = 22;
      c.stroke();
    };
    this.mouths = {
      line: tex(512, 256, (c) => lips(c, () => (c.moveTo(150, 128), c.lineTo(362, 128)))),
      smile: tex(512, 256, (c) => lips(c, () => (c.moveTo(130, 100), c.quadraticCurveTo(256, 190, 382, 100)))),
      frown: tex(512, 256, (c) => lips(c, () => (c.moveTo(150, 160), c.quadraticCurveTo(256, 90, 362, 160)))),
      o: tex(512, 256, (c) => lips(c, () => c.ellipse(256, 128, 46, 60, 0, 0, Math.PI * 2), CAM.mouth)),
      grin: tex(512, 256, (c) => {
        c.beginPath();
        c.moveTo(110, 70);
        c.quadraticCurveTo(256, 260, 402, 70);
        c.closePath();
        c.fillStyle = CAM.mouth;
        c.fill();
        c.save();
        c.clip();
        c.fillStyle = CAM.teeth;
        c.fillRect(100, 60, 312, 46);
        c.restore();
        c.strokeStyle = CAM.lip;
        c.lineWidth = 16;
        c.stroke();
      }),
    };
  }

  dispose() {
    for (const t of [...Object.values(this.eyes), this.brow, this.nose, ...Object.values(this.mouths)]) t.dispose();
  }
}

/** Where on the head a feature sits: across (yaw) and up (pitch), in radians from the middle of the face. */
function frame(yaw: number, pitch: number) {
  const n = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const up = new THREE.Vector3().crossVectors(n, right);
  return { n, right, up };
}

/** A flat feature bent onto the head so it sits on the skin from any angle. */
function decal(yaw: number, pitch: number, w: number, h: number, lift: number): THREE.PlaneGeometry {
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

export class Mii {
  /** The whole player, positioned by the stage: its origin is the seat, at table height. */
  readonly root = new THREE.Group();
  /** Leans with the player: everything above the waist. */
  readonly body = new THREE.Group();
  readonly head = new THREE.Group();
  private eyes: { open: THREE.Mesh; shut: THREE.Mesh; pivot: THREE.Group }[] = [];
  private brows: { pivot: THREE.Group; n: THREE.Vector3; side: number }[] = [];
  private mouth: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private arms: { shoulder: THREE.Vector3; upper: Limb; lower: Limb; elbow: THREE.Mesh; hand: THREE.Mesh; side: number }[] = [];
  private openEye: THREE.Texture;
  private disposables: { dispose(): void }[] = [];
  private eyesNow: Eyes = 'open';

  constructor(
    who: string,
    private kit: FaceKit,
  ) {
    const r = seeded(who);
    const skin = pick(CAM.skin, r);
    const hair = pick(CAM.hair, r);
    const shirt = pick(CAM.shirt, r);
    const style = pick(['spiky', 'bob', 'long', 'bun', 'short'] as const, r);
    this.openEye = r() < 0.5 ? kit.eyes.open : kit.eyes.tall;
    const browTilt = (r() - 0.35) * 0.5;
    const eyeGap = 0.3 + r() * 0.08;

    const keep = <T extends { dispose(): void }>(x: T) => (this.disposables.push(x), x);
    const skinMat = keep(new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.55, sheen: 0.4, sheenColor: '#ffd9c4', sheenRoughness: 0.6, clearcoat: 0.08 }));
    const hairMat = keep(new THREE.MeshPhysicalMaterial({ color: hair, roughness: 0.48, sheen: 0.6, sheenColor: '#ffffff', sheenRoughness: 0.35 }));
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
    const feature = (geo: THREE.BufferGeometry, map: THREE.Texture, color: THREE.ColorRepresentation = '#ffffff') => {
      const m = keep(new THREE.MeshStandardMaterial({ map, color, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const mesh = new THREE.Mesh(keep(geo), m);
      mesh.renderOrder = 2;
      return mesh;
    };
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      const geo = decal(s * eyeGap, 0.0, 0.05, 0.05, 0.0012);
      const open = feature(geo, this.openEye);
      const shut = feature(geo.clone(), kit.eyes.closed);
      shut.visible = false;
      pivot.add(open, shut);
      skull.add(pivot);
      this.eyes.push({ open, shut, pivot });

      const bp = new THREE.Group();
      const browGeo = decal(s * (eyeGap + 0.02), 0.25, 0.065, 0.032, 0.0016);
      // Each brow is drawn for the right side; the left one is the mirror image.
      if (s < 0) {
        const uv = browGeo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
      }
      const brow = feature(browGeo, kit.brow, hair);
      bp.add(brow);
      skull.add(bp);
      this.brows.push({ pivot: bp, n: frame(s * (eyeGap + 0.02), 0.25).n, side: s });
      bp.quaternion.setFromAxisAngle(frame(s * (eyeGap + 0.02), 0.25).n, -s * browTilt);
    }
    skull.add(feature(decal(0, -0.15, 0.032, 0.032, 0.0012), kit.nose, shade));
    this.mouth = feature(decal(0, -0.36, 0.09, 0.045, 0.0012), kit.mouths.line) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    skull.add(this.mouth);
    this.hair(style, skull, hairMat, keep, r);
    skull.position.y = R * 1.02 + 0.02;
    this.head.add(skull);
    this.head.position.y = 0.3;
    this.body.add(this.head);

    // Arms: shirt sleeves, and ball hands the colour of the shirt.
    const limb = keep(new THREE.CylinderGeometry(ARM.r, ARM.r, 1, 32, 1, true));
    const joint = keep(new THREE.SphereGeometry(ARM.r, 32, 24));
    const hand = keep(new THREE.SphereGeometry(ARM.hand, 48, 32));
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Vector3(side * 0.14, 0.235, 0.005);
      const sj = new THREE.Mesh(joint, shirtMat);
      sj.position.copy(shoulder);
      const elbow = new THREE.Mesh(joint, shirtMat);
      const h = new THREE.Mesh(hand, shirtMat);
      for (const m of [sj, elbow, h]) m.castShadow = true;
      const upper = new Limb(limb, shirtMat);
      const lower = new Limb(limb, shirtMat);
      this.body.add(sj, elbow, h, upper.mesh, lower.mesh);
      this.arms.push({ shoulder, upper, lower, elbow, hand: h, side });
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
    const cone = new THREE.ConeGeometry(style === 'spiky' ? 0.034 : 0.04, style === 'spiky' ? 0.09 : 0.065, 48);
    keep(cone);
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

  /** The face: eyes, mouth, and brows from -1 (frowning) to 1 (raised). */
  express(eyes: Eyes, mouth: Mouth, brows: number) {
    this.eyesNow = eyes;
    const map = eyes === 'happy' ? this.kit.eyes.happy : this.kit.eyes.closed;
    for (const e of this.eyes) {
      e.open.visible = eyes === 'open';
      e.shut.visible = eyes !== 'open';
      (e.shut.material as THREE.MeshStandardMaterial).map = map;
    }
    this.mouth.material.map = this.kit.mouths[mouth];
    // Raised brows lift; a frown also turns their inner ends down (on top of each face's own tilt).
    for (const b of this.brows) {
      b.pivot.position.y = brows * 0.006;
      b.pivot.children[0].quaternion.setFromAxisAngle(b.n, b.side * Math.min(0, brows) * 0.35);
    }
  }

  /** A blink: the open eyes close for a moment. */
  blink(shut: boolean) {
    if (this.eyesNow !== 'open') return;
    for (const e of this.eyes) {
      e.open.visible = !shut;
      e.shut.visible = shut;
      (e.shut.material as THREE.MeshStandardMaterial).map = this.kit.eyes.closed;
    }
  }

  /** Where it's looking: -1 left to 1 right, and -1 down to 1 up, from its own point of view. */
  look(x: number, y: number) {
    for (const e of this.eyes) e.pivot.rotation.set(-y * 0.12, x * 0.16, 0);
  }

  /** Put each hand at a point in the room (or leave it where it is), bending the elbows outwards. */
  reach(left: THREE.Vector3, right: THREE.Vector3) {
    this.root.updateMatrixWorld(true);
    const inv = this.body.matrixWorld.clone().invert();
    [left, right].forEach((world, i) => {
      const arm = this.arms[i];
      const t = world.clone().applyMatrix4(inv);
      const s = arm.shoulder;
      const a = ARM.upper;
      const b = ARM.lower;
      const dir = t.clone().sub(s);
      const d = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.01, dir.length()));
      dir.normalize();
      const end = s.clone().addScaledVector(dir, d);
      const x = (a * a - b * b + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, a * a - x * x));
      // Elbows go out to the side, down and back.
      const pole = new THREE.Vector3(arm.side, -0.6, -0.5);
      pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      const elbow = s.clone().addScaledVector(dir, x).addScaledVector(pole, h);
      arm.upper.set(s, elbow);
      arm.lower.set(elbow, end);
      arm.elbow.position.copy(elbow);
      arm.hand.position.copy(end);
    });
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
  }
}
