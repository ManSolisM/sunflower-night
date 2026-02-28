import { useEffect, useRef } from "react";

export default function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // ─── Estado global mutable ───────────────────────────────
    let W, H, stars, shootingStars, sunflowers, originX, originY;
    let moonX, moonY, moonR;
    let frame = 0;
    let animId;

    // ─── PIXEL RATIO (pantallas Retina / móvil nítido) ───────
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

    // ─── Helpers ────────────────────────────────────────────
    function easeOutElastic(t) {
      if (t === 0 || t === 1) return t;
      const p = 0.4;
      return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
    }

    // ─── ESTRELLA FUGAZ ──────────────────────────────────────
    class ShootingStar {
      constructor() { this.reset(true); }
      reset(init = false) {
        this.x = Math.random() * W * 1.2 - W * 0.1;
        this.y = Math.random() * H * 0.4;
        this.speed = Math.random() * 14 + 8;
        this.angle = (Math.random() * 25 + 20) * (Math.PI / 180);
        this.alpha = 0;
        this.life = 0;
        this.maxLife = Math.random() * 60 + 40;
        this.delay = init ? Math.random() * 200 : Math.random() * 300 + 60;
        this.waiting = true;
        this.tail = [];
      }
      update() {
        if (this.waiting) { this.delay--; if (this.delay <= 0) this.waiting = false; return; }
        this.life++;
        const p = this.life / this.maxLife;
        this.alpha = p < 0.2 ? p / 0.2 : p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
        this.tail.unshift({ x: this.x, y: this.y, alpha: this.alpha });
        if (this.tail.length > 22) this.tail.pop();
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.life >= this.maxLife || this.x > W + 100 || this.y > H) this.reset();
      }
      draw() {
        if (this.waiting || this.alpha <= 0) return;
        for (let i = 0; i < this.tail.length; i++) {
          const t = this.tail[i];
          const fade = (1 - i / this.tail.length) * t.alpha;
          ctx.beginPath();
          ctx.arc(t.x, t.y, (1 - i / this.tail.length) * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,240,${fade * 0.6})`;
          ctx.fill();
        }
        if (this.tail.length > 1) {
          const last = this.tail[Math.min(this.tail.length - 1, 18)];
          const grad = ctx.createLinearGradient(last.x, last.y, this.x, this.y);
          grad.addColorStop(0, "rgba(255,255,240,0)");
          grad.addColorStop(1, `rgba(255,255,240,${this.alpha * 0.9})`);
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(this.x, this.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 6);
        glow.addColorStop(0, `rgba(255,255,230,${this.alpha})`);
        glow.addColorStop(1, "rgba(255,255,230,0)");
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }

    // ─── INIT: recalcula todo en cada resize ─────────────────
    function init() {
      setSize();
      const isMobile = W < 600;

      moonX = W * 0.82;
      moonY = H * 0.14;
      moonR = Math.min(W, H) * 0.055;

      // Estrellas
      const numStars = isMobile ? 160 : 280;
      stars = Array.from({ length: numStars }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.85,
        r: Math.random() * 1.4 + 0.2,
        speed: Math.random() * 0.008 + 0.002,
        phase: Math.random() * Math.PI * 2,
        color: ["#ffffff","#ffe8a0","#a8d8ff","#ffd6ff"][Math.floor(Math.random()*4)],
      }));

      shootingStars = Array.from({ length: isMobile ? 3 : 5 }, () => new ShootingStar());

      // Girasoles
      const numFlowers = isMobile ? 5 : 7;
      originX = W / 2;
      originY = H + H * 0.02;

      const fanAngle = isMobile ? Math.PI * 0.52 : Math.PI * 0.65;
      // En móvil los tallos deben ser más cortos para que las flores no salgan de pantalla
      const stemScale = isMobile ? Math.min(W, H) * 0.58 : Math.min(W, H) * 0.55;

      sunflowers = Array.from({ length: numFlowers }, (_, i) => {
        const spread = numFlowers - 1;
        const t = i / spread; // 0..1
        const angle = -fanAngle + t * fanAngle * (isMobile ? 1.25 : 1.4);
        const stemLen = stemScale
          * (0.78 + Math.sin(Math.PI * t * (1-t) * 4) * 0.28 + Math.random() * 0.08);
        const headSize = Math.min(W, H) * (isMobile ? 0.085 : 0.07)
          * (1 + Math.sin(Math.PI * t * (1-t) * 4) * 0.3);
        return {
          angle,
          stemLen,
          headSize,
          petalCount: 16 + Math.floor(Math.random() * 4),
          sway: (Math.random() - 0.5) * 0.04,
          swaySpeed: 0.4 + Math.random() * 0.3,
          swayPhase: Math.random() * Math.PI * 2,
          leafSide: i % 2 === 0 ? 1 : -1,
          leafPos: 0.35 + Math.random() * 0.2,
          delay: i * 18 + 30,
          progress: 0,
          growSpeed: 0.008 + Math.random() * 0.004,
        };
      });
    }

    // ─── DIBUJOS ─────────────────────────────────────────────
    function drawSky() {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#010308");
      sky.addColorStop(0.3, "#020818");
      sky.addColorStop(0.7, "#060b20");
      sky.addColorStop(1, "#0d1a0a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
    }

    function drawNebula() {
      const clouds = [
        { x: W*0.15, y: H*0.2,  rx: W*0.25, ry: H*0.12, color:"rgba(80,40,120,0.07)" },
        { x: W*0.7,  y: H*0.35, rx: W*0.2,  ry: H*0.1,  color:"rgba(40,80,140,0.06)" },
        { x: W*0.45, y: H*0.1,  rx: W*0.35, ry: H*0.08, color:"rgba(100,50,80,0.05)" },
      ];
      clouds.forEach(c => {
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(c.rx, c.ry));
        g.addColorStop(0, c.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.scale(1, c.ry / c.rx);
        ctx.beginPath();
        ctx.arc(c.x, c.y * (c.rx / c.ry), c.rx, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      });
    }

    function drawMoon() {
      const halo = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 3.5);
      halo.addColorStop(0, "rgba(255,245,200,0.12)");
      halo.addColorStop(1, "rgba(255,245,200,0)");
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      const mg = ctx.createRadialGradient(moonX - moonR*0.3, moonY - moonR*0.3, moonR*0.1, moonX, moonY, moonR);
      mg.addColorStop(0, "#fffde0");
      mg.addColorStop(0.6, "#fef3a0");
      mg.addColorStop(1, "#e8d060");
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fillStyle = mg;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.clip();
      const shadow = ctx.createRadialGradient(moonX + moonR*0.5, moonY, moonR*0.2, moonX + moonR*0.7, moonY, moonR);
      shadow.addColorStop(0, "rgba(20,15,50,0.55)");
      shadow.addColorStop(1, "rgba(20,15,50,0)");
      ctx.beginPath();
      ctx.arc(moonX + moonR*0.5, moonY, moonR*1.1, 0, Math.PI*2);
      ctx.fillStyle = shadow;
      ctx.fill();
      ctx.restore();
    }

    function drawGround() {
      const g = ctx.createLinearGradient(0, H*0.88, 0, H);
      g.addColorStop(0, "rgba(15,40,10,0)");
      g.addColorStop(0.3, "rgba(10,30,8,0.7)");
      g.addColorStop(1, "rgba(5,15,4,1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, H*0.88, W, H*0.12);

      ctx.fillStyle = "#0a1f07";
      const blades = Math.floor(W / 10);
      for (let i = 0; i < blades; i++) {
        const bx = (i / blades) * W + Math.random() * (W / blades);
        ctx.beginPath();
        ctx.ellipse(bx, H, 5 + Math.random()*10, 8 + Math.random()*18, 0, 0, Math.PI);
        ctx.fill();
      }
    }

    function drawSunflower(sf, time) {
      if (sf.progress <= 0) return;
      const p = sf.progress;
      const sway = p > 0.7
        ? sf.sway * Math.sin(time * sf.swaySpeed + sf.swayPhase) * ((p - 0.7) / 0.3)
        : 0;
      const totalAngle = sf.angle + sway;
      const stemP = Math.min(1, p * 1.6);
      const leafP  = Math.max(0, p * 2 - 0.5);
      const headP  = Math.max(0, p * 1.8 - 0.8);

      const tipX = originX + Math.cos(totalAngle) * sf.stemLen * stemP;
      const tipY = originY + Math.sin(totalAngle) * sf.stemLen * stemP;
      const ctrlX = originX + Math.cos(totalAngle) * sf.stemLen * 0.5 * stemP + Math.cos(totalAngle + Math.PI/2) * sf.stemLen * 0.08;
      const ctrlY = originY + Math.sin(totalAngle) * sf.stemLen * 0.5 * stemP + Math.sin(totalAngle + Math.PI/2) * sf.stemLen * 0.08;

      // Tallo
      const sg = ctx.createLinearGradient(originX, originY, tipX, tipY);
      sg.addColorStop(0, "#2d5a1b");
      sg.addColorStop(0.5, "#3d7a24");
      sg.addColorStop(1, "#4a8f2a");
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.strokeStyle = sg;
      ctx.lineWidth = 3 + sf.headSize * 0.05;
      ctx.lineCap = "round";
      ctx.stroke();

      // Hoja
      if (leafP > 0) {
        const lp = Math.min(1, leafP);
        const lx = originX + Math.cos(totalAngle) * sf.stemLen * sf.leafPos * stemP;
        const ly = originY + Math.sin(totalAngle) * sf.stemLen * sf.leafPos * stemP;
        const perpAngle = totalAngle + Math.PI / 2;
        const leafLen = sf.stemLen * 0.22 * lp * sf.leafSide;
        const ltx = lx + Math.cos(perpAngle) * leafLen;
        const lty = ly + Math.sin(perpAngle) * leafLen;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.bezierCurveTo(
          lx + Math.cos(perpAngle-0.5)*leafLen*0.7, ly + Math.sin(perpAngle-0.5)*leafLen*0.7,
          ltx + Math.cos(totalAngle)*leafLen*0.1, lty + Math.sin(totalAngle)*leafLen*0.1,
          ltx, lty
        );
        ctx.bezierCurveTo(
          ltx + Math.cos(perpAngle+0.5)*leafLen*0.3, lty + Math.sin(perpAngle+0.5)*leafLen*0.3,
          lx + Math.cos(perpAngle+0.6)*leafLen*0.3, ly + Math.sin(perpAngle+0.6)*leafLen*0.3,
          lx, ly
        );
        ctx.fillStyle = `rgba(45,110,30,${0.85 * lp})`;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(ltx, lty);
        ctx.strokeStyle = `rgba(55,130,35,${0.5 * lp})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Cabeza
      if (headP > 0) {
        const r = sf.headSize * easeOutElastic(Math.min(1, headP));

        for (let layer = 0; layer < 2; layer++) {
          for (let i = 0; i < sf.petalCount; i++) {
            const pa = (Math.PI*2/sf.petalCount)*i + (layer*Math.PI/sf.petalCount);
            const pLen = r * (layer === 0 ? 1.0 : 0.85);
            const pW = r * 0.32;
            const px1 = tipX + Math.cos(pa)*r*0.35;
            const py1 = tipY + Math.sin(pa)*r*0.35;
            const pTipX = tipX + Math.cos(pa)*(r*0.35+pLen);
            const pTipY = tipY + Math.sin(pa)*(r*0.35+pLen);
            const c1x = px1 + Math.cos(pa-0.45)*pLen*0.55 + Math.cos(pa+Math.PI/2)*pW;
            const c1y = py1 + Math.sin(pa-0.45)*pLen*0.55 + Math.sin(pa+Math.PI/2)*pW;
            const c2x = px1 + Math.cos(pa+0.45)*pLen*0.55 - Math.cos(pa+Math.PI/2)*pW;
            const c2y = py1 + Math.sin(pa+0.45)*pLen*0.55 - Math.sin(pa+Math.PI/2)*pW;
            const pg = ctx.createLinearGradient(px1, py1, pTipX, pTipY);
            if (layer === 0) {
              pg.addColorStop(0, "#e8a000");
              pg.addColorStop(0.5, "#f5c000");
              pg.addColorStop(1, "#ffd630");
            } else {
              pg.addColorStop(0, "#c87800");
              pg.addColorStop(1, "#e8a800");
            }
            ctx.beginPath();
            ctx.moveTo(px1, py1);
            ctx.bezierCurveTo(c1x, c1y, pTipX, pTipY, pTipX, pTipY);
            ctx.bezierCurveTo(pTipX, pTipY, c2x, c2y, px1, py1);
            ctx.closePath();
            ctx.fillStyle = pg;
            ctx.globalAlpha = layer === 0 ? 0.95 : 0.8;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        // Disco
        const dg = ctx.createRadialGradient(tipX-r*0.1, tipY-r*0.1, 0, tipX, tipY, r*0.38);
        dg.addColorStop(0, "#4a2800");
        dg.addColorStop(0.5, "#3a1f00");
        dg.addColorStop(1, "#2a1400");
        ctx.beginPath();
        ctx.arc(tipX, tipY, r*0.38, 0, Math.PI*2);
        ctx.fillStyle = dg;
        ctx.fill();

        // Semillas
        for (let sl = 0; sl < 4; sl++) {
          const sdist = (sl/4)*r*0.36;
          const scount = Math.max(1, Math.round(6+sl*5));
          for (let si = 0; si < scount; si++) {
            const sa = (Math.PI*2/scount)*si + sl*0.5;
            ctx.beginPath();
            ctx.arc(tipX+Math.cos(sa)*sdist, tipY+Math.sin(sa)*sdist, r*0.028, 0, Math.PI*2);
            ctx.fillStyle = "rgba(90,50,10,0.6)";
            ctx.fill();
          }
        }

        // Shine + glow
        const shine = ctx.createRadialGradient(tipX-r*0.15,tipY-r*0.15,0,tipX-r*0.1,tipY-r*0.1,r*0.25);
        shine.addColorStop(0, "rgba(255,255,200,0.18)");
        shine.addColorStop(1, "rgba(255,255,200,0)");
        ctx.beginPath();
        ctx.arc(tipX, tipY, r*0.38, 0, Math.PI*2);
        ctx.fillStyle = shine;
        ctx.fill();

        const glow = ctx.createRadialGradient(tipX,tipY,r*0.3,tipX,tipY,r*1.5);
        glow.addColorStop(0, "rgba(255,200,0,0.08)");
        glow.addColorStop(1, "rgba(255,200,0,0)");
        ctx.beginPath();
        ctx.arc(tipX, tipY, r*1.5, 0, Math.PI*2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }

    // ─── LOOP ────────────────────────────────────────────────
    function loop() {
      animId = requestAnimationFrame(loop);
      frame++;
      const time = frame / 60;

      drawSky();
      drawNebula();

      stars.forEach(s => {
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.speed * 60 + s.phase));
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.5);
        grd.addColorStop(0, s.color);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
        ctx.globalAlpha = twinkle * 0.4;
        ctx.fillStyle = grd;
        ctx.fill();
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
      sunflowers.forEach(sf => {
        if (sf.delay > 0) { sf.delay--; return; }
        if (sf.progress < 1) sf.progress = Math.min(1, sf.progress + sf.growSpeed);
        drawSunflower(sf, time);
      });
    }

    // ─── RESIZE con debounce ─────────────────────────────────
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
        top: 0,
        left: 0,
        touchAction: "none",
      }}
    />
  );
}
