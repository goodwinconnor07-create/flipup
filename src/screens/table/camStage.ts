import * as THREE from 'three';
import { CAM } from '../../ui/theme';
import { FaceKit, Mii, type FaceName } from './camMii';

/**
 * The table cam's 3D room: everyone else at the table sits round a real-looking poker table as a Mii-style
 * character (camMii.ts), under a pool-table lamp in a dark room. A camera flies across the table to whoever is
 * acting, moves in close when they face a big bet, and stays on the big moments: a shove, a bad beat, someone
 * crying as they go out, the winner's grin. The player on the clock gives off a tell (peeks at its cards,
 * glances away, fiddles with a chip); everyone else watches them. Plain three.js, its own chunk.
 *
 * It only shows what the table already shows: cards stay face down until they're turned over, and every face
 * comes from public moves.
 */

export type CamMove = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface SeatView {
  id: string;
  /** What its look is drawn from (name and emoji), so it's the same every time. */
  who: string;
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  /** Cards it has turned face up. */
  cards: string[];
  stack: number;
  bet: number;
  /** Its last move, and a key that changes with every new one. */
  move: CamMove | null;
  moveKey: string;
  talking: boolean;
  /** Out of chips, or sitting out. */
  out: boolean;
  away: boolean;
}

export interface TableView {
  hand: number;
  /** Everyone else, from the left of this phone round to the right. */
  seats: SeatView[];
  board: string[];
  pot: number;
  bb: number;
  /** Whose turn it is, if it's someone else's. */
  actor: string | null;
  /** The player on turn faces a big bet (or an all-in). */
  bigBet: boolean;
  result: { winners: string[]; showdown: boolean } | null;
  felt: string;
}

/** Where a player's name goes on screen, in CSS pixels from the canvas's top left. */
export interface LabelSpot {
  x: number;
  y: number;
  on: boolean;
}

// The table: an oval, in metres.
const A = 1.5;
const B = 0.88;
const TOP = 0.76;
const CARD = { w: 0.063, h: 0.088 };
const CHIP = { r: 0.02, h: 0.0036 };
/** How far behind the felt's edge each player sits, and where their things go, along the line to the middle. */
const SEAT_BACK = 0.22;
const HOLE_Z = 0.38;
const BET_Z = 0.56;
const STACK = { x: -0.19, z: 0.35 };
/** Its hands rest on the rail in front of it. */
const REST = { x: 0.13, y: TOP + 0.1, z: 0.19 };
/** One pass of the tell, in seconds. */
const LOOP = 4.4;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** 0 outside [a, b], rising to 1 over `ramp` seconds at each end. */
const span = (t: number, a: number, b: number, ramp = 0.25) => Math.min(ease((t - a) / ramp), ease((b - t) / ramp));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Whether the rail or the felt is under a point, and how high: what an arm or a hand must stay above. */
function floorAt(p: THREE.Vector3): number {
  const flat = Math.hypot(p.x, p.z);
  const er = Math.hypot(p.x / (A + 0.03), p.z / (B + 0.03));
  // How far the point is from the middle of the rail's tube, across the table.
  const off = flat * Math.abs(1 - 1 / Math.max(er, 1e-6));
  let y = -Infinity;
  if (Math.hypot(p.x / A, p.z / B) <= 1) y = TOP;
  if (off < 0.075) y = Math.max(y, TOP + 0.02 + Math.sqrt(0.075 * 0.075 - off * off));
  return y;
}

interface Shot {
  id: string | null;
  close: boolean;
}

class Seat {
  readonly group = new THREE.Group();
  readonly mii: Mii;
  readonly holes: THREE.Group[] = [];
  readonly faceUp = new THREE.Group();
  readonly stack = new THREE.Group();
  readonly bet = new THREE.Group();
  /** Its top chip, for fiddling with. */
  fiddle: THREE.Mesh | null = null;
  view: SeatView | null = null;
  facing = V(0, 0, 1);
  base: FaceName = 'normal';
  temp: FaceName | null = null;
  tempUntil = 0;
  move: CamMove | null = null;
  moveAt = -99;
  turnAt = 0;
  stackN = -1;
  betN = -1;
  betAt = -99;
  cardsKey = '';
  constructor(
    readonly who: string,
    kit: FaceKit,
  ) {
    this.mii = new Mii(who, kit);
    this.mii.root.position.y = TOP - 0.02;
    this.group.add(this.mii.root, this.faceUp, this.stack, this.bet);
  }
}

export class TableStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 2, 0.05, 30);
  private disposables: { dispose(): void }[] = [];
  private kit: FaceKit;
  private seats = new Map<string, Seat>();
  private view: TableView | null = null;
  private frame = 0;
  private running = false;
  private last = 0;
  private t = 0;
  private reduced: boolean;
  private resize: ResizeObserver;
  private felt: THREE.MeshStandardMaterial;
  private feltColor = '';
  private board = new THREE.Group();
  private boardKey = '';
  private pot = new THREE.Group();
  private potN = -1;
  private hold: { shot: Shot; until: number } | null = null;
  private cam = { key: '', from: V(), fromLook: V(), fromFov: 50, start: -99, dur: 0, pos: V(0, 2, 2.2), look: V(0, 0.8, -0.3), fov: 50 };
  private chipGeo: THREE.CylinderGeometry;
  private chipMats: THREE.Material[][];
  private cardGeo: THREE.PlaneGeometry;
  private cardTextures = new Map<string, THREE.CanvasTexture>();
  private cardMats = new Map<THREE.Texture, THREE.MeshStandardMaterial>();
  private onLabels: (spots: Record<string, LabelSpot>) => void;

  constructor(
    private el: HTMLCanvasElement,
    opts: { reduced: boolean; onLabels: (spots: Record<string, LabelSpot>) => void },
  ) {
    this.reduced = opts.reduced;
    this.onLabels = opts.onLabels;
    this.renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: false, powerPreference: 'high-performance' });
    // Sharp on any screen, up to 3x, without drawing more pixels than that.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color(CAM.room);
    this.scene.fog = new THREE.Fog(CAM.room, 4, 9);

    this.kit = new FaceKit(this.renderer);
    this.chipGeo = this.keep(new THREE.CylinderGeometry(CHIP.r, CHIP.r, CHIP.h, 40));
    this.chipMats = this.chipMaterials();
    this.cardGeo = this.keep(new THREE.PlaneGeometry(CARD.w, CARD.h));
    this.room();
    this.felt = this.table();
    this.lamp();
    this.scene.add(this.board, this.pot);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(el);
    this.fit();
  }

  private keep<T extends { dispose(): void }>(x: T): T {
    this.disposables.push(x);
    return x;
  }

  private texture(c: HTMLCanvasElement): THREE.CanvasTexture {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return this.keep(t);
  }

  // ── The room ───────────────────────────────────────────────────────────

  private room() {
    const floor = new THREE.Mesh(this.keep(new THREE.CircleGeometry(9, 64)), this.keep(new THREE.MeshStandardMaterial({ color: CAM.floor, roughness: 1 })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    const wall = new THREE.Mesh(
      this.keep(new THREE.CylinderGeometry(6, 6, 6, 64, 1, true)),
      this.keep(new THREE.MeshStandardMaterial({ color: CAM.wall, roughness: 1, side: THREE.BackSide })),
    );
    wall.position.y = 3;
    this.scene.add(floor, wall);

    // Out-of-focus lights round the dark room.
    const [c, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const glow = this.texture(c);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) {
      const m = this.keep(
        new THREE.SpriteMaterial({ map: glow, color: CAM.bokeh[i % CAM.bokeh.length], transparent: true, opacity: 0.2 + rnd() * 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      const s = new THREE.Sprite(m);
      const size = 0.25 + rnd() * 0.5;
      s.scale.set(size, size, 1);
      const a = rnd() * Math.PI * 2;
      s.position.set(Math.cos(a) * (4.4 + rnd()), 1 + rnd() * 2.2, Math.sin(a) * (4.4 + rnd()));
      this.scene.add(s);
    }
  }

  private table(): THREE.MeshStandardMaterial {
    // Felt with a fine weave of noise, so it reads as cloth up close.
    const [c, ctx] = canvas(512, 512);
    const img = ctx.createImageData(512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 128 + (Math.random() - 0.5) * 46;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const weave = this.keep(new THREE.CanvasTexture(c));
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(6, 6);
    const felt = this.keep(new THREE.MeshStandardMaterial({ color: '#1f7a4d', roughness: 0.95, bumpMap: weave, bumpScale: 0.6 }));

    const shape = new THREE.Shape();
    shape.absellipse(0, 0, A, B, 0, Math.PI * 2, false, 0);
    const top = new THREE.Mesh(this.keep(new THREE.ShapeGeometry(shape, 128)), felt);
    top.rotation.x = -Math.PI / 2;
    top.position.y = TOP;
    top.receiveShadow = true;

    const wood = this.keep(new THREE.MeshStandardMaterial({ color: CAM.woodDark, roughness: 0.55 }));
    const base = new THREE.Mesh(this.keep(new THREE.CylinderGeometry(1, 1, 0.1, 128)), wood);
    base.scale.set(A + 0.1, 1, B + 0.1);
    base.position.y = TOP - 0.06;
    base.castShadow = true;
    const leg = new THREE.Mesh(this.keep(new THREE.CylinderGeometry(0.18, 0.32, TOP - 0.1, 32)), wood);
    leg.position.y = (TOP - 0.1) / 2;

    // A padded leather rail and a strip of wood inside it, both following the oval.
    const ring = (rx: number, rz: number, y: number) =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: 128 }, (_, i) => {
          const a = (i / 128) * Math.PI * 2;
          return V(Math.cos(a) * rx, y, Math.sin(a) * rz);
        }),
        true,
      );
    const leather = this.keep(new THREE.MeshPhysicalMaterial({ color: CAM.leather, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35 }));
    const rail = new THREE.Mesh(this.keep(new THREE.TubeGeometry(ring(A + 0.03, B + 0.03, TOP + 0.02), 320, 0.075, 24, true)), leather);
    rail.castShadow = true;
    rail.receiveShadow = true;
    const trim = new THREE.Mesh(
      this.keep(new THREE.TubeGeometry(ring(A - 0.06, B - 0.06, TOP + 0.003), 320, 0.014, 12, true)),
      this.keep(new THREE.MeshStandardMaterial({ color: CAM.wood, roughness: 0.35, metalness: 0.1 })),
    );
    trim.receiveShadow = true;
    this.scene.add(top, base, leg, rail, trim);
    return felt;
  }

  /** A long pool-table lamp over the felt: everyone at the table is in its light, the room round it is dark. */
  private lamp() {
    const y = 2.1;
    const shade = new THREE.Mesh(
      this.keep(new THREE.BoxGeometry(2.0, 0.1, 0.42)),
      this.keep(new THREE.MeshPhysicalMaterial({ color: CAM.lampShade, roughness: 0.35, metalness: 0.6, clearcoat: 0.6 })),
    );
    shade.position.set(0, y + 0.05, 0);
    const glow = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(1.94, 0.36)), this.keep(new THREE.MeshBasicMaterial({ color: CAM.lampGlow })));
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, y - 0.001, 0);
    const cordMat = this.keep(new THREE.MeshBasicMaterial({ color: CAM.room }));
    const cordGeo = this.keep(new THREE.CylinderGeometry(0.005, 0.005, 2, 6));
    for (const x of [-0.8, 0.8]) {
      const cord = new THREE.Mesh(cordGeo, cordMat);
      cord.position.set(x, y + 1.1, 0);
      this.scene.add(cord);
    }
    this.scene.add(shade, glow);
    // Three bulbs along it, wide enough to light every seat; the middle one casts the shadows.
    [-0.65, 0, 0.65].forEach((x, i) => {
      const s = new THREE.SpotLight(CAM.key, 7, 7, 1.15, 0.75, 1.3);
      s.position.set(x, y - 0.02, 0);
      s.target.position.set(x * 1.2, 0, 0);
      if (i === 1) {
        s.castShadow = true;
        s.shadow.mapSize.set(2048, 2048);
        s.shadow.bias = -0.0004;
        s.shadow.radius = 4;
      }
      this.scene.add(s, s.target);
    });
    this.scene.add(new THREE.HemisphereLight(CAM.sky, CAM.ground, 0.5));
    // A cool light from behind picks people out from the dark.
    const rim = new THREE.DirectionalLight(CAM.rim, 0.7);
    rim.position.set(0.6, 2.6, -4);
    this.scene.add(rim);
  }

  private chipMaterials(): THREE.Material[][] {
    return CAM.chips.map(({ face, stripe }) => {
      const [c, ctx] = canvas(256, 16);
      ctx.fillStyle = face;
      ctx.fillRect(0, 0, 256, 16);
      ctx.fillStyle = stripe;
      for (let i = 0; i < 8; i++) ctx.fillRect(i * 32 + 8, 0, 12, 16);
      const [f, fctx] = canvas(128, 128);
      fctx.fillStyle = face;
      fctx.fillRect(0, 0, 128, 128);
      fctx.strokeStyle = stripe;
      fctx.lineWidth = 6;
      fctx.setLineDash([14, 12]);
      fctx.beginPath();
      fctx.arc(64, 64, 58, 0, Math.PI * 2);
      fctx.stroke();
      fctx.setLineDash([]);
      fctx.lineWidth = 3;
      fctx.beginPath();
      fctx.arc(64, 64, 36, 0, Math.PI * 2);
      fctx.stroke();
      const side = this.keep(new THREE.MeshStandardMaterial({ map: this.texture(c), roughness: 0.5 }));
      const top = this.keep(new THREE.MeshStandardMaterial({ map: this.texture(f), roughness: 0.4 }));
      return [side, top, top];
    });
  }

  /** A stack of clay chips, a little crooked like a real one. Returns its top chip. */
  private pile(parent: THREE.Object3D, x: number, z: number, n: number, kind: number): THREE.Mesh | null {
    let last: THREE.Mesh | null = null;
    for (let i = 0; i < n; i++) {
      last = new THREE.Mesh(this.chipGeo, this.chipMats[kind % this.chipMats.length]);
      last.position.set(x + (Math.random() - 0.5) * 0.0025, TOP + CHIP.h * (i + 0.5), z + (Math.random() - 0.5) * 0.0025);
      last.rotation.y = Math.random() * Math.PI;
      last.castShadow = true;
      last.receiveShadow = true;
      parent.add(last);
    }
    return last;
  }

  /** A card lying flat on the felt: face up if it has a value, otherwise its back. */
  private card(value: string | null): THREE.Group {
    const tex = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
      let t = this.cardTextures.get(key);
      if (!t) {
        const [c, ctx] = canvas(256, 358);
        ctx.beginPath();
        ctx.roundRect(0, 0, 256, 358, 22);
        ctx.save();
        ctx.clip();
        draw(ctx);
        ctx.restore();
        t = this.texture(c);
        this.cardTextures.set(key, t);
      }
      return t;
    };
    const back = tex('back', (ctx) => {
      ctx.fillStyle = CAM.cardFace;
      ctx.fillRect(0, 0, 256, 358);
      ctx.fillStyle = CAM.cardBack;
      ctx.beginPath();
      ctx.roundRect(14, 14, 228, 330, 14);
      ctx.fill();
      ctx.strokeStyle = CAM.cardBackLine;
      ctx.lineWidth = 3;
      for (let i = -400; i < 400; i += 22) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 358, 358);
        ctx.moveTo(i + 358, 0);
        ctx.lineTo(i, 358);
        ctx.stroke();
      }
    });
    const front = value
      ? tex(value, (ctx) => {
          const suit = { s: '♠', h: '♥', d: '♦', c: '♣' }[value[1]] ?? '';
          const red = value[1] === 'h' || value[1] === 'd';
          ctx.fillStyle = CAM.cardFace;
          ctx.fillRect(0, 0, 256, 358);
          ctx.fillStyle = red ? CAM.cardRed : CAM.cardInk;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '600 84px -apple-system, system-ui, sans-serif';
          ctx.fillText(value[0] === 'T' ? '10' : value[0], 58, 66);
          ctx.font = '64px -apple-system, system-ui, sans-serif';
          ctx.fillText(suit, 58, 140);
          ctx.font = '170px -apple-system, system-ui, sans-serif';
          ctx.fillText(suit, 150, 236);
        })
      : back;
    const mk = (map: THREE.Texture) => {
      let m = this.cardMats.get(map);
      if (!m) this.cardMats.set(map, (m = this.keep(new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.45 }))));
      return m;
    };
    const g = new THREE.Group();
    const up = new THREE.Mesh(this.cardGeo, mk(front));
    up.rotation.x = -Math.PI / 2;
    up.receiveShadow = true;
    up.castShadow = true;
    const down = new THREE.Mesh(this.cardGeo, mk(back));
    down.rotation.x = Math.PI / 2;
    down.position.y = -0.0005;
    g.add(up, down);
    if (!value) g.rotation.z = Math.PI; // its back faces up
    return g;
  }

  // ── Seats ──────────────────────────────────────────────────────────────

  /** Where each player sits: spread round the far side of the oval, more of it as the table fills. */
  private place() {
    const list = this.view?.seats ?? [];
    const n = list.length;
    const lo = n <= 2 ? 0.75 : n <= 4 ? 0.4 : n <= 6 ? 0.12 : -0.22;
    list.forEach((sv, i) => {
      const seat = this.seats.get(sv.id)!;
      const phi = n === 1 ? Math.PI / 2 : lo + ((Math.PI - 2 * lo) * i) / (n - 1);
      const e = V(-A * Math.cos(phi), 0, -B * Math.sin(phi));
      const normal = V(e.x / (A * A), 0, e.z / (B * B)).normalize();
      seat.group.position.copy(e).addScaledVector(normal, SEAT_BACK);
      seat.facing = normal.clone().negate();
      seat.group.rotation.y = Math.atan2(seat.facing.x, seat.facing.z);
    });
  }

  private chairG?: THREE.CapsuleGeometry;
  private chairM?: THREE.MeshPhysicalMaterial;

  private addSeat(sv: SeatView): Seat {
    const seat = new Seat(sv.who, this.kit);
    this.chairG ??= this.keep(new THREE.CapsuleGeometry(0.3, 0.5, 8, 24));
    this.chairM ??= this.keep(new THREE.MeshPhysicalMaterial({ color: CAM.leather, roughness: 0.5, clearcoat: 0.3 }));
    const chair = new THREE.Mesh(this.chairG, this.chairM);
    chair.scale.set(0.9, 0.85, 0.3);
    chair.position.set(0, 0.98, -0.28);
    chair.castShadow = true;
    seat.group.add(chair);
    for (const [x, r] of [
      [-0.036, -0.08],
      [0.036, 0.1],
    ] as const) {
      const pivot = new THREE.Group();
      const card = this.card(null);
      card.position.z = -CARD.h / 2;
      pivot.add(card);
      // Hinged on its far edge, so the near edge is the one it lifts.
      pivot.position.set(x, TOP + 0.002, HOLE_Z + CARD.h / 2);
      pivot.rotation.y = r;
      seat.holes.push(pivot);
      seat.group.add(pivot);
    }
    this.seats.set(sv.id, seat);
    this.scene.add(seat.group);
    return seat;
  }

  private dropSeat(id: string) {
    const seat = this.seats.get(id);
    if (!seat) return;
    this.scene.remove(seat.group);
    seat.mii.dispose();
    this.seats.delete(id);
  }

  private setStack(seat: Seat, stack: number, bb: number) {
    const n = stack <= 0 ? 0 : clamp(Math.round(5 * Math.log2(1 + stack / Math.max(bb, 1))), 2, 36);
    if (n === seat.stackN) return;
    seat.stackN = n;
    seat.stack.clear();
    seat.fiddle = null;
    const per = Math.ceil(n / 3);
    for (let k = 0, left = n; left > 0; k++, left -= per) {
      const top = this.pile(seat.stack, STACK.x - k * 0.042, STACK.z + (k % 2) * 0.03, Math.min(per, left), k + 1);
      if (k === 0) seat.fiddle = top;
    }
  }

  private setBet(seat: Seat, bet: number, bb: number) {
    const n = bet <= 0 ? 0 : clamp(Math.round(3 * Math.log2(1 + bet / Math.max(bb, 1))), 1, 16);
    if (n === seat.betN) return;
    if (n > seat.betN) seat.betAt = this.t;
    seat.betN = n;
    seat.bet.clear();
    if (n) {
      this.pile(seat.bet, -0.02, 0, Math.ceil(n * 0.6), 0);
      this.pile(seat.bet, 0.025, -0.01, Math.floor(n * 0.4), 2);
    }
  }

  // ── What the table shows ───────────────────────────────────────────────

  update(view: TableView) {
    const prev = this.view;
    this.view = view;
    const t = this.t;
    const newHand = !prev || prev.hand !== view.hand;

    const ids = new Set(view.seats.map((s) => s.id));
    for (const id of [...this.seats.keys()]) if (!ids.has(id)) this.dropSeat(id);
    for (const sv of view.seats) {
      const old = this.seats.get(sv.id);
      if (old && old.who !== sv.who) this.dropSeat(sv.id);
      if (!this.seats.has(sv.id)) this.addSeat(sv);
    }
    this.place();

    if (view.felt !== this.feltColor) {
      this.feltColor = view.felt;
      this.felt.color.set(view.felt);
    }
    const bkey = view.board.join('');
    if (bkey !== this.boardKey) {
      this.boardKey = bkey;
      this.board.clear();
      view.board.forEach((v, i) => {
        const c = this.card(v);
        c.position.set((i - 2) * (CARD.w + 0.014), TOP + 0.002, -0.02);
        this.board.add(c);
      });
    }
    const potN = view.pot <= 0 ? 0 : clamp(Math.round(4 * Math.log2(1 + view.pot / Math.max(view.bb, 1))), 2, 30);
    if (potN !== this.potN) {
      this.potN = potN;
      this.pot.clear();
      const per = Math.ceil(potN / 3);
      for (let k = 0, left = potN; left > 0; k++, left -= per) this.pile(this.pot, 0.24 + (k % 2) * 0.04, 0.16 + k * 0.03, Math.min(per, left), k);
    }

    const holdOn = (id: string, close: boolean, secs: number) => {
      // A close-up that's still running isn't cut short by a smaller moment.
      if (this.hold && this.hold.until > t && this.hold.shot.close && !close) return;
      this.hold = { shot: { id, close }, until: t + secs };
    };

    for (const sv of view.seats) {
      const seat = this.seats.get(sv.id)!;
      const was = prev?.seats.find((s) => s.id === sv.id);
      seat.view = sv;
      if (newHand) {
        seat.temp = null;
        seat.move = null;
        seat.moveAt = -99;
      }
      this.setStack(seat, sv.stack, view.bb);
      this.setBet(seat, sv.bet, view.bb);
      const ckey = sv.cards.join('');
      if (ckey !== seat.cardsKey) {
        seat.cardsKey = ckey;
        seat.faceUp.clear();
        sv.cards.forEach((v, i) => {
          const c = this.card(v);
          c.position.set((i - 0.5) * (CARD.w + 0.01), TOP + 0.003, HOLE_Z);
          seat.faceUp.add(c);
        });
      }
      if (view.actor === sv.id && prev?.actor !== sv.id) seat.turnAt = t;

      // A new move: the face and the camera react.
      if (sv.move && was && sv.moveKey !== was.moveKey && !newHand) {
        seat.move = sv.move;
        seat.moveAt = t;
        const react: Record<CamMove, [FaceName, number]> = {
          fold: ['sigh', 1.3],
          check: ['normal', 0.8],
          call: ['serious', 1.1],
          bet: ['smug', 1.5],
          raise: ['smug', 1.5],
          allin: ['determined', 2],
        };
        [seat.temp, seat.tempUntil] = [react[sv.move][0], t + react[sv.move][1]];
        holdOn(sv.id, sv.move === 'allin', sv.move === 'allin' ? 1.8 : 1.0);
        if (sv.move === 'allin') {
          // Everyone still in sits up at a shove.
          for (const other of view.seats) {
            if (other.id === sv.id || !other.inHand || other.folded) continue;
            const o = this.seats.get(other.id)!;
            o.temp = 'surprised';
            o.tempUntil = t + 1.5;
          }
        }
      }
    }

    // The hand's over: the winner beams, a beaten all-in can't believe it, and anyone knocked out cries.
    if (view.result && !prev?.result) {
      const { winners, showdown } = view.result;
      let bust: string | null = null;
      for (const sv of view.seats) {
        const seat = this.seats.get(sv.id)!;
        const won = winners.includes(sv.id);
        if (won) {
          seat.temp = 'bigSmile';
          seat.tempUntil = t + 3;
        } else if (sv.inHand && !sv.folded && showdown) {
          seat.temp = sv.allIn ? 'unbelievable' : 'glum';
          seat.tempUntil = t + (sv.allIn ? 1.6 : 2.5);
        }
        if (sv.inHand && sv.stack <= 0 && !won) bust ??= sv.id;
      }
      if (bust) holdOn(bust, true, 3.2);
      else if (winners[0] && this.seats.has(winners[0])) holdOn(winners[0], showdown, 2.4);
    }
    for (const sv of view.seats) {
      const seat = this.seats.get(sv.id)!;
      const won = !!view.result?.winners.includes(sv.id);
      const busted = sv.stack <= 0 && !!view.result && sv.inHand && !won;
      seat.base = sv.away ? 'sleep' : busted ? 'cry' : sv.out ? 'glum' : won ? 'happy' : sv.folded && sv.inHand ? 'bored' : 'normal';
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (at: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, at - this.last) / 1000);
      this.last = at;
      this.t += dt;
      if (!document.hidden) {
        this.pose(dt);
        this.renderer.render(this.scene, this.camera);
        this.labels();
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose() {
    this.stop();
    this.resize.disconnect();
    for (const id of [...this.seats.keys()]) this.dropSeat(id);
    this.kit.dispose();
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private fit() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private labels() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    const out: Record<string, LabelSpot> = {};
    const p = V();
    for (const [id, seat] of this.seats) {
      seat.mii.crown.getWorldPosition(p);
      p.project(this.camera);
      out[id] = { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, on: p.z < 1 && Math.abs(p.x) < 1.1 && p.y > -1 };
    }
    this.onLabels(out);
  }

  // ── The camera ─────────────────────────────────────────────────────────

  private shot(): Shot {
    const v = this.view;
    if (this.hold && this.hold.until > this.t && this.hold.shot.id && this.seats.has(this.hold.shot.id)) return this.hold.shot;
    if (v?.actor && this.seats.has(v.actor)) return { id: v.actor, close: v.bigBet };
    const winner = v?.result?.winners.find((id) => this.seats.has(id));
    if (winner) return { id: winner, close: false };
    return { id: null, close: false };
  }

  /** Where the camera would be for a shot: wide from this phone's seat, or across the table at one player. */
  private aim(s: Shot): { pos: THREE.Vector3; look: THREE.Vector3; fov: number } {
    const n = this.view?.seats.length ?? 0;
    if (!s.id) return { pos: V(0, 1.75, n > 4 ? 2.1 : 1.95), look: V(0, 0.9, -0.5), fov: n > 4 ? 60 : 56 };
    const seat = this.seats.get(s.id)!;
    const head = V();
    seat.mii.head.getWorldPosition(head);
    head.y += 0.15;
    const f = seat.facing;
    return s.close
      ? { pos: head.clone().addScaledVector(f, 0.6).add(V(0, 0.03, 0)), look: head.clone().add(V(0, -0.025, 0)), fov: 30 }
      : { pos: head.clone().addScaledVector(f, 1.2).add(V(0, 0.16, 0)), look: head.clone().add(V(0, -0.24, 0)), fov: 40 };
  }

  private moveCamera() {
    const s = this.shot();
    const key = `${s.id}:${s.close}`;
    const c = this.cam;
    const aim = this.aim(s);
    if (key !== c.key) {
      const flying = c.key.split(':')[0] !== String(s.id);
      c.from.copy(c.pos);
      c.fromLook.copy(c.look);
      c.fromFov = c.fov;
      c.start = this.t;
      c.dur = this.reduced || !c.key ? 0 : flying ? 1.15 : 0.55;
      c.key = key;
    }
    const u = c.dur ? ease((this.t - c.start) / c.dur) : 1;
    // Flying across the table it rises in an arc over the felt, then settles.
    const mid = c.from.clone().lerp(aim.pos, 0.5);
    mid.y += c.from.distanceTo(aim.pos) * 0.25;
    const a = c.from.clone().lerp(mid, u);
    const b = mid.lerp(aim.pos, u);
    c.pos.copy(a.lerp(b, u));
    c.look.copy(c.fromLook.clone().lerp(aim.look, u));
    c.fov = c.fromFov + (aim.fov - c.fromFov) * u;
    // Held by hand: a little drift, never still.
    const sway = this.reduced ? 0 : 1;
    const t = this.t;
    this.camera.position.copy(c.pos).add(V(Math.sin(t * 0.63) * 0.006 * sway, Math.sin(t * 0.91 + 1) * 0.004 * sway, 0));
    this.camera.lookAt(c.look.clone().add(V(Math.sin(t * 0.5) * 0.004 * sway, 0, 0)));
    if (Math.abs(this.camera.fov - c.fov) > 0.01) {
      this.camera.fov = c.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  // ── Movement ───────────────────────────────────────────────────────────

  private pose(dt: number) {
    const v = this.view;
    if (!v) return;
    const t = this.t;
    const actorSeat = v.actor ? this.seats.get(v.actor) : undefined;
    const actorHead = V();
    if (actorSeat) actorSeat.mii.head.getWorldPosition(actorHead).add(V(0, 0.15, 0));
    // Where everyone looks when it's this phone's turn: at the person holding it.
    const me = V(0, 1.2, B + 0.6);

    for (const seat of this.seats.values()) {
      const sv = seat.view;
      if (!sv) continue;
      const mii = seat.mii;
      const acting = v.actor === sv.id;
      const l = this.reduced ? 0 : (t - seat.turnAt) % LOOP;
      const peek = acting && !sv.cards.length ? span(l, 0.6, 2.0, 0.35) : 0;
      const away = acting ? span(l, 2.2, 3.0, 0.2) : 0;
      const fidget = acting && seat.fiddle ? span(l, 3.05, 4.3, 0.1) : 0;
      const m = seat.move;
      const mt = t - seat.moveAt;
      const fresh = mt < 1.8;
      const temp = seat.temp && t < seat.tempUntil ? seat.temp : null;

      // The face.
      let face: FaceName = temp ?? seat.base;
      if (acting && !temp) face = v.bigBet || peek > 0.5 ? 'serious' : away > 0.5 ? 'bored' : 'normal';
      mii.express(face);
      mii.tick(t, dt, sv.talking);

      // Where it looks: at whoever's acting (or at you), its own cards when it peeks, off to the side when it glances away.
      const target = actorSeat && !acting ? actorHead : !acting && !v.actor && !v.result ? me : null;
      let yaw = 0;
      let pitch = 0;
      if (target) {
        const local = seat.group.worldToLocal(target.clone());
        yaw = clamp(Math.atan2(local.x, local.z), -1.1, 1.1);
        pitch = clamp(Math.atan2(local.y - 1.2, Math.hypot(local.x, local.z)), -0.4, 0.3);
      }
      yaw += away * 0.6;
      const tap = m === 'check' && fresh ? Math.max(0, Math.sin(Math.min(mt, 0.9) * Math.PI * 4.4)) : 0;
      mii.head.rotation.set(peek * 0.16 + tap * 0.1 - pitch * 0.5, yaw * 0.6, 0);
      mii.look(clamp(yaw * 0.4 + away * 0.6, -1, 1), clamp(pitch * 2 - peek * 0.9 - fidget * 0.7, -1, 1));

      // Leaning: in over its cards, in behind a bet, back after a fold; hunched over when it cries.
      let lean = peek * 0.22;
      if (m === 'fold' && fresh) lean = -0.12 * ease(mt / 0.4);
      else if (m && m !== 'check' && fresh) lean = 0.18 * span(mt, 0, 1.0, 0.25) + (m === 'allin' ? 0.08 : 0);
      if (face === 'cry') lean = 0.25 + Math.sin(t * 9) * 0.02;
      if (face === 'sleep') lean = -0.1;
      mii.body.rotation.x = lean;
      mii.body.position.y = Math.sin(t * 3.4 + seat.turnAt) * 0.004;

      // Its cards: hidden once folded, lifted at the near edge for a peek, slid in when mucked.
      const muck = m === 'fold' && fresh ? ease(mt / 0.5) : sv.folded ? 1 : 0;
      const showBacks = sv.inHand && !sv.cards.length && (!sv.folded || (m === 'fold' && mt < 0.6));
      seat.holes.forEach((h, i) => {
        h.visible = showBacks;
        h.rotation.x = peek * (0.5 + i * 0.08);
        h.position.z = HOLE_Z + CARD.h / 2 + muck * 0.12;
      });

      // The chip on top of its stack, flicked up and dropped while it waits.
      const flick = fidget ? Math.abs(Math.sin((l - 3.05) * Math.PI * 3.2)) * fidget : 0;
      if (seat.fiddle) {
        seat.fiddle.position.y = TOP + CHIP.h * (Math.ceil(seat.stackN / 3) - 0.5) + flick * 0.028;
        seat.fiddle.rotation.z = flick * 0.4;
      }
      // A new bet slides out from its stack.
      const slide = ease((t - seat.betAt) / 0.45);
      seat.bet.position.set(STACK.x * (1 - slide), 0, STACK.z + (BET_Z - STACK.z) * slide);

      // The hands, in the seat's own space (+x is its left): resting on the felt unless they're doing something.
      let left = V(REST.x, REST.y, REST.z);
      let right = V(-REST.x, REST.y, REST.z);
      if (peek > 0) {
        const up = Math.sin(peek * 0.55) * CARD.h;
        left = left.lerp(V(0.05, TOP + 0.025 + up, HOLE_Z - 0.03), peek);
        right = right.lerp(V(-0.05, TOP + 0.025 + up, HOLE_Z - 0.03), peek);
      }
      if (fidget > 0 && seat.fiddle) right = right.lerp(V(STACK.x + 0.01, seat.fiddle.position.y + 0.035, STACK.z - 0.02), fidget);
      if (m && fresh && (m === 'call' || m === 'bet' || m === 'raise' || m === 'allin')) {
        const go = span(mt, 0, 1.4, 0.3);
        const z = STACK.z + (BET_Z - STACK.z) * slide - 0.07;
        left = left.lerp(V(0.06, TOP + 0.03, z), go);
        right = right.lerp(V(-0.06, TOP + 0.03, z), go);
      }
      if (m === 'fold' && fresh) {
        const go = span(mt, 0, 0.9, 0.2);
        left = left.lerp(V(0.05, TOP + 0.03, HOLE_Z - 0.04 + muck * 0.12), go);
        right = right.lerp(V(-0.05, TOP + 0.03, HOLE_Z - 0.04 + muck * 0.12), go);
      }
      if (tap) right = V(-0.08, TOP + 0.03 + tap * 0.035, HOLE_Z - 0.02);
      if (face === 'cry') {
        // Hands up to its face.
        left = V(0.08, TOP + 0.3, 0.2);
        right = V(-0.08, TOP + 0.3, 0.2);
      }
      mii.reach(seat.group.localToWorld(left), seat.group.localToWorld(right), floorAt);
    }
    this.moveCamera();
  }
}
