import * as THREE from 'three';
import { CAM } from '../../ui/theme';
import { FaceKit, Mii, type Mouth } from './camMii';

/**
 * The live cam's 3D room: a bot, as a Mii-style character (camMii.ts), sitting behind a real-looking poker table (felt, a padded rail, chips, its
 * two cards and the board), under a warm overhead light, filmed by a slightly unsteady camera. While the bot thinks
 * it plays one tell on a loop: it leans in, peeks at its cards, glances away and fiddles with a chip. When it moves
 * it reacts (chips pushed in, cards mucked, a nod for a check). Plain three.js, loaded only when a table opens.
 *
 * It only ever shows what the table already shows: the bot's cards stay face down.
 */

export type CamMove = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

// The table: an oval, in metres.
const A = 1.5;
const B = 0.88;
const TOP = 0.76;
const CARD = { w: 0.063, h: 0.088 };
const CHIP = { r: 0.02, h: 0.0036 };
/** One pass of the tell, in seconds. */
const LOOP = 4.4;
/** Where the player sits, and where its cards lie. */
const SEAT_Z = -1.0;
const HOLE_Z = -0.72;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** 0 outside [a, b], rising to 1 over `ramp` seconds at each end. */
const span = (t: number, a: number, b: number, ramp = 0.25) => Math.min(ease((t - a) / ramp), ease((b - t) / ramp));

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function texture(c: HTMLCanvasElement, renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export class CamStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(46, 2, 0.05, 20);
  private disposables: { dispose(): void }[] = [];
  private frame = 0;
  private running = false;
  /** When the last frame was drawn (ms). */
  private last = 0;
  /** Seconds since the shot started, and since the move. */
  private t = 0;
  private moveT = 0;
  private move: CamMove | null = null;
  private reduced: boolean;
  private resize: ResizeObserver;

  private kit: FaceKit;
  private mii: Mii | null = null;
  private miiFor = '';
  private faceKey = '';
  private holes: THREE.Group[] = [];
  private fiddle: THREE.Mesh;
  private pushed = new THREE.Group();
  private board = new THREE.Group();
  private boardKey = '';
  private felt: THREE.MeshStandardMaterial;
  private feltColor = '';

  constructor(
    private el: HTMLCanvasElement,
    opts: { reduced: boolean },
  ) {
    this.reduced = opts.reduced;
    this.renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: false, powerPreference: 'low-power' });
    // Drawn on the CPU (no graphics chip, or it's switched off), a 3D room every frame would slow the whole table
    // down, timers and all: no cam then.
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    if (/swiftshader|llvmpipe|software|basic render/i.test(name)) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      throw new Error(`No live cam on a software renderer (${name})`);
    }
    // Sharp on any screen, up to 3x, without drawing more pixels than that.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color(CAM.room);
    this.scene.fog = new THREE.Fog(CAM.room, 3.2, 7);

    this.room();
    this.felt = this.table();
    this.lights();
    this.kit = new FaceKit(this.renderer);
    this.seat();
    this.fiddle = this.chips();
    this.scene.add(this.board, this.pushed);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(el);
    this.fit();
  }

  // ── Building the room ──────────────────────────────────────────────────

  private keep<T extends { dispose(): void }>(x: T): T {
    this.disposables.push(x);
    return x;
  }

  private room() {
    const floor = new THREE.Mesh(
      this.keep(new THREE.PlaneGeometry(14, 14)),
      this.keep(new THREE.MeshStandardMaterial({ color: CAM.floor, roughness: 1 })),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    const wall = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(14, 6)), this.keep(new THREE.MeshStandardMaterial({ color: CAM.wall, roughness: 1 })));
    wall.position.set(0, 3, -4.2);
    this.scene.add(floor, wall);

    // Out-of-focus lights across the room behind the table.
    const [c, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const glow = this.keep(texture(c, this.renderer));
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const m = this.keep(
        new THREE.SpriteMaterial({ map: glow, color: CAM.bokeh[i % CAM.bokeh.length], transparent: true, opacity: 0.25 + rnd() * 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      const s = new THREE.Sprite(m);
      const size = 0.25 + rnd() * 0.5;
      s.scale.set(size, size, 1);
      s.position.set((rnd() - 0.5) * 7, 1 + rnd() * 2.2, -3.2 - rnd() * 0.8);
      this.scene.add(s);
    }
  }

  private table(): THREE.MeshStandardMaterial {
    // Felt with a fine weave of noise, so it reads as cloth up close.
    const [c, ctx] = canvas(512, 512);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);
    const img = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 128 + (Math.random() - 0.5) * 46;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    }
    ctx.putImageData(img, 0, 0);
    const weave = this.keep(new THREE.CanvasTexture(c));
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(6, 6);
    const felt = this.keep(new THREE.MeshStandardMaterial({ color: '#1f7a4d', roughness: 0.95, bumpMap: weave, bumpScale: 0.6 }));

    const shape = new THREE.Shape();
    shape.absellipse(0, 0, A, B, 0, Math.PI * 2, false, 0);
    const top = new THREE.Mesh(this.keep(new THREE.ShapeGeometry(shape, 96)), felt);
    top.rotation.x = -Math.PI / 2;
    top.position.y = TOP;
    top.receiveShadow = true;

    const wood = this.keep(new THREE.MeshStandardMaterial({ color: CAM.woodDark, roughness: 0.55 }));
    const base = new THREE.Mesh(this.keep(new THREE.CylinderGeometry(1, 1, 0.1, 96)), wood);
    base.scale.set(A + 0.1, 1, B + 0.1);
    base.position.y = TOP - 0.06;
    base.castShadow = true;
    const leg = new THREE.Mesh(this.keep(new THREE.CylinderGeometry(0.18, 0.32, TOP - 0.1, 32)), wood);
    leg.position.y = (TOP - 0.1) / 2;

    // A padded leather rail and a strip of wood inside it, both following the oval.
    const ring = (rx: number, rz: number, y: number) =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: 96 }, (_, i) => {
          const a = (i / 96) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz);
        }),
        true,
      );
    const leather = this.keep(new THREE.MeshPhysicalMaterial({ color: CAM.leather, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35 }));
    const rail = new THREE.Mesh(this.keep(new THREE.TubeGeometry(ring(A + 0.03, B + 0.03, TOP + 0.02), 240, 0.075, 24, true)), leather);
    rail.castShadow = true;
    rail.receiveShadow = true;
    const trim = new THREE.Mesh(
      this.keep(new THREE.TubeGeometry(ring(A - 0.06, B - 0.06, TOP + 0.003), 240, 0.014, 12, true)),
      this.keep(new THREE.MeshStandardMaterial({ color: CAM.wood, roughness: 0.35, metalness: 0.1 })),
    );
    trim.receiveShadow = true;
    this.scene.add(top, base, leg, rail, trim);
    return felt;
  }

  private lights() {
    const key = new THREE.SpotLight(CAM.key, 16, 6, 0.62, 0.65, 1.6);
    key.position.set(0, 2.7, -0.25);
    key.target.position.set(0, TOP, -0.25);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    this.scene.add(key, key.target);
    this.scene.add(new THREE.HemisphereLight(CAM.sky, CAM.ground, 0.35));
    // A cool light from behind picks the player out from the dark room.
    const rim = new THREE.DirectionalLight(CAM.rim, 1.1);
    rim.position.set(0.6, 2.2, -3);
    rim.target.position.set(0, 1, -1);
    this.scene.add(rim, rim.target);
    const fill = new THREE.PointLight(CAM.key, 0.6, 4, 2);
    fill.position.set(0.3, 1.3, 1.4);
    this.scene.add(fill);
  }

  /** The chair the player sits in, and its two cards. The player itself comes with each cut. */
  private seat() {
    const chair = new THREE.Mesh(
      this.keep(new THREE.CapsuleGeometry(0.3, 0.5, 8, 24)),
      this.keep(new THREE.MeshPhysicalMaterial({ color: CAM.leather, roughness: 0.5, clearcoat: 0.3 })),
    );
    chair.scale.set(0.9, 0.85, 0.3);
    chair.position.set(0, 0.98, SEAT_Z - 0.26);
    chair.castShadow = true;
    this.scene.add(chair);

    // Its two cards, face down in front of it.
    for (const [x, r] of [
      [-0.036, -0.08],
      [0.036, 0.1],
    ] as const) {
      const pivot = new THREE.Group();
      const card = this.card(null);
      card.position.z = -CARD.h / 2;
      pivot.add(card);
      // Turned so the near edge is the one it lifts.
      pivot.position.set(x, TOP + 0.002, HOLE_Z + CARD.h / 2);
      pivot.rotation.y = r;
      this.holes.push(pivot);
      this.scene.add(pivot);
    }
  }

  // Shared by every card, so a new board makes nothing new once each card has been seen.
  private cardTextures = new Map<string, THREE.CanvasTexture>();
  private cardMats = new Map<THREE.Texture, THREE.MeshStandardMaterial>();
  private cardGeo?: THREE.PlaneGeometry;

  /** A card lying flat on the felt: face up if it has a value, otherwise its back. */
  private card(value: string | null): THREE.Group {
    const tex = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
      let t = this.cardTextures.get(key);
      if (!t) {
        const [c, ctx] = canvas(256, 358);
        roundRect(ctx, 0, 0, 256, 358, 22);
        ctx.save();
        ctx.clip();
        draw(ctx);
        ctx.restore();
        t = this.keep(texture(c, this.renderer));
        this.cardTextures.set(key, t);
      }
      return t;
    };
    const back = tex('back', (ctx) => {
      ctx.fillStyle = CAM.cardFace;
      ctx.fillRect(0, 0, 256, 358);
      ctx.fillStyle = CAM.cardBack;
      roundRect(ctx, 14, 14, 228, 330, 14);
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
    const geo = (this.cardGeo ??= this.keep(new THREE.PlaneGeometry(CARD.w, CARD.h)));
    const mk = (map: THREE.Texture) => {
      let m = this.cardMats.get(map);
      if (!m) this.cardMats.set(map, (m = this.keep(new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.45 }))));
      return m;
    };
    const g = new THREE.Group();
    const up = new THREE.Mesh(geo, mk(front));
    up.rotation.x = -Math.PI / 2;
    up.receiveShadow = true;
    up.castShadow = true;
    const down = new THREE.Mesh(geo, mk(back));
    down.rotation.x = Math.PI / 2;
    down.position.y = -0.0005;
    g.add(up, down);
    if (!value) g.rotation.z = Math.PI; // its back faces up
    return g;
  }

  /** Clay chips: striped edges and an inlaid face. Returns the chip on top of the bot's own stack, for fiddling with. */
  private chips(): THREE.Mesh {
    const geo = this.keep(new THREE.CylinderGeometry(CHIP.r, CHIP.r, CHIP.h, 40));
    const mats = CAM.chips.map(({ face, stripe }) => {
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
      const side = this.keep(new THREE.MeshStandardMaterial({ map: this.keep(texture(c, this.renderer)), roughness: 0.5 }));
      const top = this.keep(new THREE.MeshStandardMaterial({ map: this.keep(texture(f, this.renderer)), roughness: 0.4 }));
      return [side, top, top];
    });
    const stack = (x: number, z: number, n: number, kind: number, parent: THREE.Object3D = this.scene) => {
      let last!: THREE.Mesh;
      for (let i = 0; i < n; i++) {
        last = new THREE.Mesh(geo, mats[kind]);
        // A real stack never sits quite straight.
        last.position.set(x + (Math.random() - 0.5) * 0.0025, TOP + CHIP.h * (i + 0.5), z + (Math.random() - 0.5) * 0.0025);
        last.rotation.y = Math.random() * Math.PI;
        last.castShadow = true;
        last.receiveShadow = true;
        parent.add(last);
      }
      return last;
    };
    // The bot's own chips, to its right.
    stack(0.155, -0.72, 14, 2);
    stack(0.215, -0.705, 9, 0);
    const top = stack(0.19, -0.765, 11, 1);
    stack(-0.18, -0.73, 6, 3);
    // The pot.
    stack(0.24, -0.4, 7, 0);
    stack(0.275, -0.43, 5, 1);
    stack(0.255, -0.37, 9, 2);
    // What it pushes in when it bets.
    stack(-0.02, -0.64, 8, 0, this.pushed);
    stack(0.03, -0.655, 6, 1, this.pushed);
    this.pushed.visible = false;
    return top;
  }

  // ── What the shot shows ────────────────────────────────────────────────

  /** Cut to a player (by name: each one always looks the same): a fresh take. */
  cut(who: string) {
    if (who !== this.miiFor) {
      if (this.mii) {
        this.scene.remove(this.mii.root);
        this.mii.dispose();
      }
      this.mii = new Mii(who, this.kit);
      this.mii.root.position.set(0, TOP - 0.02, SEAT_Z);
      this.scene.add(this.mii.root);
      this.miiFor = who;
      this.faceKey = '';
    }
    this.t = 0;
    this.move = null;
    this.draw();
  }

  /** The cards on the board, face up in the middle. */
  setBoard(cards: string[]) {
    const key = cards.join('');
    if (key === this.boardKey) return;
    this.boardKey = key;
    this.board.clear();
    cards.forEach((v, i) => {
      const c = this.card(v);
      c.position.set((i - 2) * (CARD.w + 0.012), TOP + 0.002, -0.38);
      this.board.add(c);
    });
    this.draw();
  }

  setFelt(color: string) {
    if (color === this.feltColor) return;
    this.feltColor = color;
    this.felt.color.set(color);
    this.draw();
  }

  /** The bot has made its move: play the reaction. */
  react(move: CamMove) {
    this.move = move;
    this.moveT = 0;
    this.draw();
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.reduced) return this.draw();
    this.last = performance.now();
    const loop = (at: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, at - this.last) / 1000);
      this.last = at;
      this.t += dt;
      this.moveT += dt;
      this.pose();
      this.renderer.render(this.scene, this.camera);
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
    this.mii?.dispose();
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
    this.draw();
  }

  /** One still frame, for reduced motion or a change while paused. */
  private draw() {
    if (this.running && !this.reduced) return;
    this.pose();
    this.renderer.render(this.scene, this.camera);
  }

  // ── Movement ───────────────────────────────────────────────────────────

  private pose() {
    const still = this.reduced;
    const t = still ? 0 : this.t;
    const l = t % LOOP;
    const m = this.move;
    const mt = this.moveT;

    // The camera: a slow push in from across the table, held by hand.
    const push = still ? 0.5 : ease(Math.min(1, t / 6));
    const sway = still ? 0 : 1;
    this.camera.position.set(
      0.04 + Math.sin(t * 0.63) * 0.006 * sway,
      1.34 + Math.sin(t * 0.91 + 1) * 0.004 * sway - push * 0.02,
      0.42 - push * 0.1,
    );
    this.camera.lookAt(Math.sin(t * 0.5) * 0.005 * sway, 0.86, -0.82);

    const mii = this.mii;
    // The tell, while it thinks: lean in and peek at the cards, glance away, then fiddle with a chip.
    const thinking = !m;
    const peek = thinking ? span(l, 0.6, 2.0, 0.35) : 0;
    const away = thinking ? span(l, 2.2, 3.0, 0.2) : 0;
    const fidget = thinking ? span(l, 3.05, 4.3, 0.1) : 0;
    const breathe = Math.sin(t * 3.4) * 0.004;

    let lean = peek * 0.22;
    let turn = away * 0.55;
    let nod = peek * 0.35;
    let lookX = away * -1 + fidget * 0.7 + Math.sin(t * 0.7) * 0.15 * (1 - peek - away - fidget);
    let lookY = -peek * 0.9 - fidget * 0.7;
    let face: [Parameters<Mii['express']>[0], Mouth, number] = peek > 0.5 ? ['open', 'line', -0.7] : away > 0.5 ? ['open', 'smile', 0.2] : ['open', 'line', 0];

    // The reaction, once it has moved.
    if (m === 'fold') {
      lean = -0.12 * ease(mt / 0.4);
      face = mt < 0.7 ? ['closed', 'frown', -0.3] : ['open', 'frown', -0.2];
      lookX = 0.6;
      lookY = -0.3;
    } else if (m === 'check') {
      nod = Math.max(0, Math.sin(Math.min(mt, 0.9) * Math.PI * 4.4)) * 0.1;
      face = ['open', 'line', 0.2];
    } else if (m) {
      lean = 0.18 * span(mt, 0, 1.0, 0.25) + (m === 'allin' ? 0.08 : 0);
      face = m === 'allin' ? (mt > 0.5 ? ['happy', 'grin', 0.8] : ['open', 'o', 0.9]) : m === 'call' ? ['open', 'line', 0.1] : ['open', 'smile', 0.4];
    }

    // Its cards: the near edges lift for the peek; mucked, they slide in towards the middle.
    const muck = m === 'fold' ? ease(mt / 0.5) : 0;
    this.holes.forEach((h, i) => {
      h.rotation.x = peek * (0.5 + i * 0.08);
      h.position.z = HOLE_Z + CARD.h / 2 + muck * 0.09;
      h.position.x = (i ? 0.036 : -0.036) * (1 - muck * 0.6);
    });

    // The chip on top of its stack, flicked up and dropped while it waits.
    const flick = fidget ? Math.abs(Math.sin((l - 3.05) * Math.PI * 3.2)) * fidget : 0;
    this.fiddle.position.y = TOP + CHIP.h * 10.5 + flick * 0.028;
    this.fiddle.rotation.z = flick * 0.4;

    // Chips pushed in for a call, bet or raise.
    const bets = m === 'call' || m === 'bet' || m === 'raise' || m === 'allin';
    const shove = bets ? ease(mt / 0.6) : 0;
    this.pushed.visible = bets;
    if (bets) this.pushed.position.set(shove * 0.2, 0, shove * 0.12);

    if (!mii) return;
    mii.body.rotation.x = lean;
    mii.body.position.y = breathe;
    mii.head.rotation.set(nod, turn, 0);
    mii.look(lookX, lookY);
    const key = face.join();
    if (key !== this.faceKey) {
      this.faceKey = key;
      mii.express(...face);
    }
    mii.blink(!still && face[0] === 'open' && t % 3.3 > 3.18);

    // The hands: resting on the felt, unless they're doing something.
    const rest = (side: number) => new THREE.Vector3(side * 0.13, TOP + 0.045, -0.8);
    let left = rest(-1);
    let right = rest(1);
    if (peek > 0) {
      // Both hands on its cards, lifting the near edges.
      const up = Math.sin(peek * 0.55) * CARD.h;
      left = left.lerp(new THREE.Vector3(-0.06, TOP + 0.03 + up, HOLE_Z - 0.035), peek);
      right = right.lerp(new THREE.Vector3(0.06, TOP + 0.03 + up, HOLE_Z - 0.035), peek);
    }
    if (fidget > 0) right = right.lerp(new THREE.Vector3(0.19, this.fiddle.position.y + 0.04, -0.765), fidget);
    if (bets) {
      const go = span(mt, 0, 1.1, 0.25);
      const at = (side: number) => new THREE.Vector3(shove * 0.2 + side * 0.06, TOP + 0.04, -0.69 + shove * 0.12);
      left = left.lerp(at(-1), go);
      right = right.lerp(at(1), go);
    }
    if (m === 'fold') {
      const go = span(mt, 0, 0.9, 0.2);
      left = left.lerp(new THREE.Vector3(-0.05, TOP + 0.04, HOLE_Z - 0.03 + muck * 0.09), go);
      right = right.lerp(new THREE.Vector3(0.05, TOP + 0.04, HOLE_Z - 0.03 + muck * 0.09), go);
    }
    if (m === 'check') {
      const tap = Math.max(0, Math.sin(Math.min(mt, 0.9) * Math.PI * 4.4)) * 0.035;
      right = new THREE.Vector3(0.1, TOP + 0.045 + tap, -0.74);
    }
    mii.reach(left, right);
  }
}
