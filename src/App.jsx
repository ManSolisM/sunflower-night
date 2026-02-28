import { useEffect, useRef } from "react";

export default function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let W, H, stars, shootingStars, sunflowers, originX, originY;
    let moonX, moonY, moonR;
    let frame = 0;
    let animId;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function setSize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function easeOutElastic(t) {
      if (t === 0 || t === 1) return t;
      const p = 0.45;
      return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    // ── ESTRELLA FUGAZ ─────────────────────────────────────
    class ShootingStar {
      constructor() { this.reset(true); }
      reset(init = false) {
        this.x = Math.random() * W * 0.8;
        this.y = Math.random() * H * 0.35;
        this.speed = Math.random() * 12 + 7;
        this.angle = (Math.random() * 20 + 15) * (Math.PI / 180);
        this.alpha = 0;
        this.life = 0;
        this.maxLife = Math.random() * 55 + 35;
        this.delay = init ? Math.random() * 220 : Math.random() * 280 + 80;
        this.waiting = true;
        this.tail = [];
        this.width = Math.random() * 1.5 + 1;
      }
      update() {
        if (this.waiting) { this.delay--; if (this.delay <= 0) this.waiting = false; return; }
        this.life++;
        const p = this.life / this.maxLife;
        this.alpha = p < 0.15 ? p / 0.15 : p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
        this.tail.unshift({ x: this.x, y: this.y });
        if (this.tail.length > 28) this.tail.pop();
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.life >= this.maxLife || this.x > W + 150) this.reset();
      }
      draw() {
        if (this.waiting || this.alpha <= 0 || this.tail.length < 2) return;
        // Cola con gradiente
        for (let i = 1; i < this.tail.length; i++) {
          const t0 = this.tail[i - 1];
          const t1 = this.tail[i];
          const fade = (1 - i / this.tail.length) * this.alpha;
          const w = (1 - i / this.tail.length) * this.width * 2;
          ctx.beginPath();
          ctx.moveTo(t0.x, t0.y);
          ctx.lineTo(t1.x, t1.y);
          ctx.strokeStyle = `rgba(220,240,255,${fade * 0.85})`;
          ctx.lineWidth = w;
          ctx.lineCap = "round";
          ctx.stroke();
        }
        // Cabeza brillante
        const gHead = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 8);
        gHead.addColorStop(0, `rgba(255,255,255,${this.alpha})`);
        gHead.addColorStop(0.4, `rgba(200,230,255,${this.alpha * 0.6})`);
        gHead.addColorStop(1, "rgba(200,230,255,0)");
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = gHead;
        ctx.fill();
      }
    }

    // ── INIT ───────────────────────────────────────────────
    function init() {
      setSize();
      const isMobile = W < 700;

      moonX = W * 0.78;
      moonY = H * 0.13;
      moonR = Math.min(W, H) * (isMobile ? 0.07 : 0.055);

      // Estrellas
      const numStars = isMobile ? 180 : 300;
      stars = Array.from({ length: numStars }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.88,
        r: Math.random() * 1.6 + 0.15,
        speed: Math.random() * 0.007 + 0.002,
        phase: Math.random() * Math.PI * 2,
        // Mayoría blancas, pocas de color
        color: Math.random() < 0.7
          ? "#ffffff"
          : ["#ffe8a0","#a8d8ff","#ffd0ff","#c0f0ff"][Math.floor(Math.random()*4)],
      }));

      shootingStars = Array.from({ length: isMobile ? 4 : 6 }, () => new ShootingStar());

      // ── GIRASOLES centrados en abanico ─────────────────
      const numFlowers = isMobile ? 5 : 7;
      originX = W * 0.5;
      originY = H * 1.01;

      // Abanico simétrico: de izquierda a derecha
      // Ángulo central = -90° (directo arriba), se abre ±fanSpread
      const fanSpread = isMobile ? 0.72 : 0.82; // radianes a cada lado
      const baseSize = Math.min(W, H);

      sunflowers = Array.from({ length: numFlowers }, (_, i) => {
        const t = numFlowers === 1 ? 0.5 : i / (numFlowers - 1); // 0..1
        // -PI/2 es recto hacia arriba; extendemos ±fanSpread
        const angle = -Math.PI / 2 - fanSpread + t * fanSpread * 2;

        // Flores del centro más altas, las de los lados un poco más cortas
        const centerBonus = Math.sin(Math.PI * t) * 0.18; // máx en t=0.5
        const stemLen = baseSize * (isMobile ? 0.55 : 0.52) * (0.82 + centerBonus + Math.random() * 0.06);

        // Flores del centro más grandes
        const headSize = baseSize * (isMobile ? 0.082 : 0.068) * (0.85 + centerBonus * 1.2);

        return {
          angle,
          stemLen,
          headSize,
          petalCount: 22 + Math.floor(Math.random() * 4), // más pétalos = más bonito
          sway: (Math.random() - 0.5) * 0.035,
          swaySpeed: 0.35 + Math.random() * 0.25,
          swayPhase: Math.random() * Math.PI * 2,
          leafSide: i % 2 === 0 ? 1 : -1,
          leafPos: 0.38 + Math.random() * 0.18,
          leafPos2: 0.6 + Math.random() * 0.12,
          delay: i * 22 + 20,
          progress: 0,
          growSpeed: 0.007 + Math.random() * 0.004,
        };
      });
    }

    // ── CIELO ──────────────────────────────────────────────
    function drawSky() {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0,   "#01040f");
      sky.addColorStop(0.25,"#020c22");
      sky.addColorStop(0.6, "#041228");
      sky.addColorStop(0.85,"#061a18");
      sky.addColorStop(1,   "#081f0c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
    }

    // Nebulosidad sutil
    function drawNebula() {
      const patches = [
        { x: W*0.1,  y: H*0.15, rx: W*0.3,  ry: H*0.14, c: "rgba(60,30,110,0.055)" },
        { x: W*0.65, y: H*0.3,  rx: W*0.22, ry: H*0.1,  c: "rgba(20,60,130,0.05)"  },
        { x: W*0.4,  y: H*0.08, rx: W*0.4,  ry: H*0.07, c: "rgba(80,30,60,0.045)"  },
        { x: W*0.85, y: H*0.5,  rx: W*0.18, ry: H*0.12, c: "rgba(20,40,100,0.04)"  },
      ];
      patches.forEach(p => {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(p.rx, p.ry));
        g.addColorStop(0, p.c);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.scale(1, p.ry / p.rx);
        ctx.beginPath();
        ctx.arc(p.x, p.y * (p.rx / p.ry), p.rx, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      });
    }

    // ── LUNA ───────────────────────────────────────────────
    function drawMoon() {
      // Halo exterior difuso
      const outerHalo = ctx.createRadialGradient(moonX, moonY, moonR*0.8, moonX, moonY, moonR*5);
      outerHalo.addColorStop(0,   "rgba(255,250,200,0.09)");
      outerHalo.addColorStop(0.4, "rgba(255,245,180,0.04)");
      outerHalo.addColorStop(1,   "rgba(255,245,180,0)");
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR*5, 0, Math.PI*2);
      ctx.fillStyle = outerHalo;
      ctx.fill();

      // Cuerpo luna
      const mg = ctx.createRadialGradient(
        moonX - moonR*0.28, moonY - moonR*0.28, moonR*0.05,
        moonX, moonY, moonR
      );
      mg.addColorStop(0,   "#fffff0");
      mg.addColorStop(0.35,"#fefce0");
      mg.addColorStop(0.75,"#f0e070");
      mg.addColorStop(1,   "#d4c040");
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI*2);
      ctx.fillStyle = mg;
      ctx.fill();

      // Sombra de cráter sutil
      ctx.save();
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI*2);
      ctx.clip();
      const sh = ctx.createRadialGradient(moonX+moonR*0.45, moonY+moonR*0.1, 0, moonX+moonR*0.6, moonY, moonR*1.1);
      sh.addColorStop(0, "rgba(10,8,30,0.48)");
      sh.addColorStop(1, "rgba(10,8,30,0)");
      ctx.beginPath();
      ctx.arc(moonX+moonR*0.5, moonY, moonR*1.1, 0, Math.PI*2);
      ctx.fillStyle = sh;
      ctx.fill();
      // Brillo especular pequeño
      const spec = ctx.createRadialGradient(moonX-moonR*0.3, moonY-moonR*0.3, 0, moonX-moonR*0.2, moonY-moonR*0.2, moonR*0.3);
      spec.addColorStop(0, "rgba(255,255,240,0.45)");
      spec.addColorStop(1, "rgba(255,255,240,0)");
      ctx.beginPath();
      ctx.arc(moonX-moonR*0.2, moonY-moonR*0.2, moonR*0.3, 0, Math.PI*2);
      ctx.fillStyle = spec;
      ctx.fill();
      ctx.restore();
    }

    // ── SUELO ──────────────────────────────────────────────
    function drawGround() {
      // Degradado tierra
      const g = ctx.createLinearGradient(0, H*0.86, 0, H);
      g.addColorStop(0,   "rgba(8,25,6,0)");
      g.addColorStop(0.25,"rgba(6,20,4,0.75)");
      g.addColorStop(1,   "rgba(3,10,2,1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, H*0.86, W, H*0.14);

      // Silueta hierba
      ctx.fillStyle = "#071a05";
      const blades = Math.floor(W / 8);
      for (let i = 0; i < blades; i++) {
        const bx = (i / blades) * W + (Math.random() - 0.5) * (W / blades) * 1.5;
        const bh = 10 + Math.random() * 22;
        const bw = 4 + Math.random() * 9;
        ctx.beginPath();
        ctx.ellipse(bx, H, bw, bh, (Math.random()-0.5)*0.3, 0, Math.PI);
        ctx.fill();
      }
    }

    // ── GIRASOL ────────────────────────────────────────────
    function drawSunflower(sf, time) {
      if (sf.progress <= 0) return;
      const p = sf.progress;
      const sway = p > 0.65
        ? sf.sway * Math.sin(time * sf.swaySpeed + sf.swayPhase) * Math.min(1, (p-0.65)/0.35)
        : 0;
      const ang = sf.angle + sway;

      const stemP = Math.min(1, p * 1.5);
      const leafP  = Math.max(0, p * 2.2 - 0.6);
      const headP  = Math.max(0, p * 2.0 - 1.0);

      // Punta del tallo
      const tipX = originX + Math.cos(ang) * sf.stemLen * stemP;
      const tipY = originY + Math.sin(ang) * sf.stemLen * stemP;

      // Control de curvatura (leve S)
      const bendX = originX + Math.cos(ang + Math.PI/2) * sf.stemLen * 0.06;
      const bendY = originY + Math.sin(ang + Math.PI/2) * sf.stemLen * 0.06;
      const ctrlX = bendX + Math.cos(ang) * sf.stemLen * 0.5 * stemP;
      const ctrlY = bendY + Math.sin(ang) * sf.stemLen * 0.5 * stemP;

      // ─ Tallo ─
      const sg = ctx.createLinearGradient(originX, originY, tipX, tipY);
      sg.addColorStop(0,   "#1e4010");
      sg.addColorStop(0.4, "#2e6018");
      sg.addColorStop(1,   "#3a7820");
      const stemW = 2.8 + sf.headSize * 0.04;
      // Sombra del tallo
      ctx.beginPath();
      ctx.moveTo(originX+1.5, originY);
      ctx.quadraticCurveTo(ctrlX+1.5, ctrlY, tipX+1.5, tipY);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = stemW + 1;
      ctx.lineCap = "round";
      ctx.stroke();
      // Tallo principal
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.strokeStyle = sg;
      ctx.lineWidth = stemW;
      ctx.stroke();

      // ─ Hojas (2 por planta) ─
      const drawLeaf = (posT, side, scale = 1) => {
        const lp = Math.min(1, Math.max(0, leafP));
        if (lp <= 0) return;
        const lx = originX + Math.cos(ang) * sf.stemLen * posT * stemP + Math.cos(ang + Math.PI/2) * sf.stemLen * 0.06 * posT;
        const ly = originY + Math.sin(ang) * sf.stemLen * posT * stemP + Math.sin(ang + Math.PI/2) * sf.stemLen * 0.06 * posT;
        const perpA = ang + Math.PI/2;
        const lLen = sf.stemLen * 0.2 * lp * side * scale;
        const ltx = lx + Math.cos(perpA) * lLen;
        const lty = ly + Math.sin(perpA) * lLen;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.bezierCurveTo(
          lx + Math.cos(perpA-0.6)*lLen*0.65, ly + Math.sin(perpA-0.6)*lLen*0.65,
          ltx + Math.cos(ang)*lLen*0.12, lty + Math.sin(ang)*lLen*0.12,
          ltx, lty
        );
        ctx.bezierCurveTo(
          ltx + Math.cos(perpA+0.6)*lLen*0.3, lty + Math.sin(perpA+0.6)*lLen*0.3,
          lx + Math.cos(perpA+0.7)*lLen*0.25, ly + Math.sin(perpA+0.7)*lLen*0.25,
          lx, ly
        );
        ctx.fillStyle = `rgba(38,95,22,${0.88 * lp})`;
        ctx.fill();
        // Nervio central
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(ltx, lty);
        ctx.strokeStyle = `rgba(50,115,28,${0.55 * lp})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      };
      drawLeaf(sf.leafPos,  sf.leafSide,  1);
      drawLeaf(sf.leafPos2, -sf.leafSide, 0.75);

      // ─ Cabeza / Flor ─
      if (headP > 0) {
        const hp = easeOutElastic(Math.min(1, headP));
        const r  = sf.headSize * hp;

        // Sombra bajo la flor
        const dropShadow = ctx.createRadialGradient(tipX+r*0.08, tipY+r*0.1, 0, tipX+r*0.08, tipY+r*0.1, r*1.4);
        dropShadow.addColorStop(0, "rgba(0,0,0,0.22)");
        dropShadow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(tipX+r*0.08, tipY+r*0.1, r*1.4, 0, Math.PI*2);
        ctx.fillStyle = dropShadow;
        ctx.fill();

        // Pétalos — 3 capas para aspecto más rico
        for (let layer = 0; layer < 3; layer++) {
          const layerOffset = (layer / 3) * (Math.PI / sf.petalCount);
          const layerScale  = [1.0, 0.88, 0.74][layer];
          const layerAlpha  = [0.96, 0.85, 0.70][layer];
          const innerColor  = ["#c87800","#b06000","#985000"][layer];
          const outerColor  = ["#ffd020","#f0b800","#dda000"][layer];

          for (let i = 0; i < sf.petalCount; i++) {
            const pa   = (Math.PI*2 / sf.petalCount) * i + layerOffset;
            const pLen = r * layerScale * 0.95;
            const pW   = r * 0.18; // más delgados = más elegante

            const px1  = tipX + Math.cos(pa) * r * 0.32;
            const py1  = tipY + Math.sin(pa) * r * 0.32;
            const pTipX = tipX + Math.cos(pa) * (r*0.32 + pLen);
            const pTipY = tipY + Math.sin(pa) * (r*0.32 + pLen);

            // Pétalo más redondeado con 2 curvas bezier
            const perpA = pa + Math.PI/2;
            const c1x = px1 + Math.cos(pa)*pLen*0.35 + Math.cos(perpA)*pW;
            const c1y = py1 + Math.sin(pa)*pLen*0.35 + Math.sin(perpA)*pW;
            const c2x = pTipX - Math.cos(pa)*pLen*0.2 + Math.cos(perpA)*pW*0.3;
            const c2y = pTipY - Math.sin(pa)*pLen*0.2 + Math.sin(perpA)*pW*0.3;
            const c3x = pTipX - Math.cos(pa)*pLen*0.2 - Math.cos(perpA)*pW*0.3;
            const c3y = pTipY - Math.sin(pa)*pLen*0.2 - Math.sin(perpA)*pW*0.3;
            const c4x = px1 + Math.cos(pa)*pLen*0.35 - Math.cos(perpA)*pW;
            const c4y = py1 + Math.sin(pa)*pLen*0.35 - Math.sin(perpA)*pW;

            const pg = ctx.createLinearGradient(px1, py1, pTipX, pTipY);
            pg.addColorStop(0,   innerColor);
            pg.addColorStop(0.4, outerColor);
            pg.addColorStop(1,   outerColor + "cc");

            ctx.beginPath();
            ctx.moveTo(px1, py1);
            ctx.bezierCurveTo(c1x, c1y, c2x, c2y, pTipX, pTipY);
            ctx.bezierCurveTo(c3x, c3y, c4x, c4y, px1, py1);
            ctx.closePath();
            ctx.fillStyle = pg;
            ctx.globalAlpha = layerAlpha;
            ctx.fill();
            // Contorno muy sutil
            ctx.strokeStyle = "rgba(140,70,0,0.12)";
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // Disco central marrón
        const dg = ctx.createRadialGradient(tipX-r*0.08, tipY-r*0.08, 0, tipX, tipY, r*0.40);
        dg.addColorStop(0,   "#5a3000");
        dg.addColorStop(0.5, "#3e2000");
        dg.addColorStop(1,   "#2a1400");
        ctx.beginPath();
        ctx.arc(tipX, tipY, r*0.40, 0, Math.PI*2);
        ctx.fillStyle = dg;
        ctx.fill();

        // Patrón de semillas en espiral de Fibonacci
        const diskR = r * 0.37;
        const phi = 2.399963; // ángulo dorado
        const numSeeds = 38;
        for (let s = 0; s < numSeeds; s++) {
          const sAngle = s * phi;
          const sR = Math.sqrt(s / numSeeds) * diskR;
          const sx = tipX + Math.cos(sAngle) * sR;
          const sy = tipY + Math.sin(sAngle) * sR;
          const sr = r * 0.025 * (1 - s/numSeeds * 0.3);
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI*2);
          ctx.fillStyle = `rgba(100,55,10,0.7)`;
          ctx.fill();
        }

        // Brillo especular en disco
        const spec = ctx.createRadialGradient(tipX-r*0.13, tipY-r*0.13, 0, tipX-r*0.1, tipY-r*0.1, r*0.22);
        spec.addColorStop(0, "rgba(255,200,100,0.25)");
        spec.addColorStop(1, "rgba(255,200,100,0)");
        ctx.beginPath();
        ctx.arc(tipX, tipY, r*0.40, 0, Math.PI*2);
        ctx.fillStyle = spec;
        ctx.fill();

        // Resplandor dorado alrededor de la flor
        const glow = ctx.createRadialGradient(tipX, tipY, r*0.4, tipX, tipY, r*1.8);
        glow.addColorStop(0, "rgba(255,190,0,0.10)");
        glow.addColorStop(0.5,"rgba(255,190,0,0.04)");
        glow.addColorStop(1,  "rgba(255,190,0,0)");
        ctx.beginPath();
        ctx.arc(tipX, tipY, r*1.8, 0, Math.PI*2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }

    // ── LOOP PRINCIPAL ─────────────────────────────────────
    function loop() {
      animId = requestAnimationFrame(loop);
      frame++;
      const time = frame / 60;

      drawSky();
      drawNebula();

      // Estrellas parpadeantes
      stars.forEach(s => {
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * s.speed * 60 + s.phase));
        // Halo suave
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
        grd.addColorStop(0, s.color);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.globalAlpha = twinkle * 0.3;
        ctx.fillStyle = grd;
        ctx.fill();
        // Punto central
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = s.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      drawMoon();
      shootingStars.forEach(ss => { ss.update(); ss.draw(); });
      drawGround();

      // Girasoles
      sunflowers.forEach(sf => {
        if (sf.delay > 0) { sf.delay--; return; }
        if (sf.progress < 1) sf.progress = Math.min(1, sf.progress + sf.growSpeed);
        drawSunflower(sf, time);
      });
    }

    // ── RESIZE con debounce ─────────────────────────────────
    let resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cancelAnimationFrame(animId);
        frame = 0;
        init();
        loop();
      }, 150);
    }

    window.addEventListener("resize", onResize);
    init();
    loop();

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        position: "fixed",
        top: 0, left: 0,
        touchAction: "none",
      }}
    />
  );
}
