// ============================================================
//  FUR NATURAL — app.js   (ScrollCanvas Engine v3 — REBUILT)
//  900 frames, 6 clips × 150, synced to native scroll
// ============================================================

const TOTAL_FRAMES = 900;
const PAGE_COUNT   = 6;
const LERP         = 0.08;
const CONCURRENCY  = 48;
const isMobile     = innerWidth < 768;
const FRAME_DIR    = isMobile ? 'frames-mobile' : 'frames-webp';

// ---- DOM refs ----
const canvas  = document.getElementById('gl-canvas');
const ctx     = canvas.getContext('2d');
const pCanvas = document.getElementById('particle-canvas');
const pCtx    = pCanvas.getContext('2d');
const pages   = Array.from(document.querySelectorAll('.page'));
const navLinks    = document.querySelectorAll('#nav-links .nav-link:not(.nav-cta)');
const drawerLinks = document.querySelectorAll('#drawer-links .drawer-link');

// ---- State ----
const frames = new Array(TOTAL_FRAMES);
let loadedCount  = 0;
let isReady      = false;
let currentFrame = 0;
let targetFrame  = 0;

// ---- Canvas resize ----
function resizeCanvases() {
  canvas.width  = innerWidth;
  canvas.height = innerHeight;
  pCanvas.width  = innerWidth;
  pCanvas.height = innerHeight;
}
resizeCanvases();
window.addEventListener('resize', resizeCanvases);

// ============================================================
//  LOADER (created by JS, removed after all frames load)
// ============================================================
const loaderEl = document.createElement('div');
loaderEl.id = 'loader';
loaderEl.innerHTML = `
  <div class="loader-inner">
    <div class="loader-logo">FUR NATURAL</div>
    <div class="loader-bar-wrap"><div class="loader-bar" id="loader-bar"></div></div>
    <div class="loader-pct" id="loader-pct">0%</div>
  </div>`;
document.body.appendChild(loaderEl);

const loaderCSS = document.createElement('style');
loaderCSS.textContent = `
  #loader {
    position:fixed; inset:0; z-index:9999;
    background:rgba(6,4,10,0.94);
    display:flex; align-items:center; justify-content:center;
    transition:opacity 0.8s ease;
    backdrop-filter:blur(8px);
  }
  #loader.fade-out { opacity:0; pointer-events:none; }
  .loader-inner { text-align:center; display:flex; flex-direction:column; align-items:center; gap:20px; }
  .loader-logo {
    font-family:'Cormorant Garamond',serif;
    font-size:2.5rem; font-weight:300; letter-spacing:0.3em;
    color:#c9a84c;
    animation:loaderPulse 2s ease-in-out infinite;
  }
  @keyframes loaderPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  .loader-bar-wrap {
    width:260px; height:2px; background:rgba(201,168,76,.2);
    border-radius:2px; overflow:hidden;
  }
  .loader-bar {
    height:100%; width:0%;
    background:linear-gradient(90deg,#c9a84c,#e8c97a);
    border-radius:2px; transition:width 0.1s;
  }
  .loader-pct { font-size:.75rem; color:rgba(201,168,76,.6); letter-spacing:.15em; }
`;
document.head.appendChild(loaderCSS);

// ============================================================
//  FRAME LOADING
// ============================================================
function frameName(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(6, '0')}.webp`;
}

async function loadFrame(idx) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      frames[idx] = img;
      loadedCount++;
      // Start rendering as soon as first frame arrives
      if (loadedCount === 1) { isReady = true; drawFrame(0); }
      const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
      const bar = document.getElementById('loader-bar');
      const pctEl = document.getElementById('loader-pct');
      if (bar) bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      resolve();
    };
    img.onerror = () => { frames[idx] = null; loadedCount++; resolve(); };
    img.src = frameName(idx);
  });
}

async function loadAllFrames() {
  const queue = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift();
      await loadFrame(idx);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

loadAllFrames().then(() => {
  isReady = true;
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => loader.remove(), 900);
  }
});

// ============================================================
//  DRAW FRAME (cover-fit to canvas)
// ============================================================
function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(idx, TOTAL_FRAMES - 1))];
  if (!img) return;
  const W = canvas.width, H = canvas.height;
  const r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth * r, ih = img.naturalHeight * r;
  const x = (W - iw) / 2, y = (H - ih) / 2;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, x, y, iw, ih);
  // Vignette
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.85);
  vig.addColorStop(0, 'rgba(6,4,10,0)');
  vig.addColorStop(1, 'rgba(6,4,10,0.78)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  // Bottom darkening
  const bot = ctx.createLinearGradient(0, H*0.6, 0, H);
  bot.addColorStop(0, 'rgba(6,4,10,0)');
  bot.addColorStop(1, 'rgba(6,4,10,0.88)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, H*0.6, W, H*0.4);
}

// ============================================================
//  SCROLL → FRAME MAPPING  (window-level, passive)
// ============================================================
window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

// ============================================================
//  PARTICLES
// ============================================================
const PARTICLE_COUNT = 55;
const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  vx: (Math.random() - 0.5) * 0.25,
  vy: -(Math.random() * 0.3 + 0.05),
  r: Math.random() * 1.8 + 0.4,
  alpha: Math.random() * 0.45 + 0.1,
  gold: Math.random() > 0.45,
}));

function drawParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = pCanvas.width;
    if (p.x > pCanvas.width) p.x = 0;
    if (p.y < 0) p.y = pCanvas.height;
    if (p.y > pCanvas.height) { p.y = pCanvas.height; p.vy = -(Math.random() * 0.3 + 0.05); }
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pCtx.fillStyle = p.gold
      ? `rgba(201,168,76,${p.alpha})`
      : `rgba(255,255,255,${p.alpha * 0.5})`;
    pCtx.fill();
  });
}

// ============================================================
//  RAF LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  currentFrame += (targetFrame - currentFrame) * LERP;
  if (isReady) drawFrame(Math.round(currentFrame));
  drawParticles();
}
animate();

// ============================================================
//  INTERSECTION OBSERVER — section activation
// ============================================================
// Hero already has is-active in HTML; observer manages it from here
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      // Nav-link offset: hero=0 has no link, so navLinks[0] = section 1
      navLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
      drawerLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
    }
  });
}, { root: null, rootMargin: '-40% 0px -40% 0px' });

pages.forEach(p => observer.observe(p));

// ============================================================
//  SCROLL-TO-SECTION (nav clicks)
// ============================================================
document.querySelectorAll('[data-scroll]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    const idx = parseInt(el.dataset.scroll);
    if (pages[idx]) pages[idx].scrollIntoView({ behavior: 'smooth' });
    document.getElementById('nav-drawer').hidden = true;
    document.getElementById('nav-scrim').hidden = true;
  });
});

// ============================================================
//  BURGER / DRAWER
// ============================================================
document.getElementById('burger').addEventListener('click', () => {
  document.getElementById('nav-drawer').hidden = false;
  document.getElementById('nav-scrim').hidden = false;
});
document.getElementById('drawer-close').addEventListener('click', () => {
  document.getElementById('nav-drawer').hidden = true;
  document.getElementById('nav-scrim').hidden = true;
});
document.getElementById('nav-scrim').addEventListener('click', () => {
  document.getElementById('nav-drawer').hidden = true;
  document.getElementById('nav-scrim').hidden = true;
});

// ============================================================
//  NAVBAR SCROLL EFFECT
// ============================================================
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.background =
    scrollY > 60 ? 'rgba(6,4,10,0.97)' : 'rgba(6,4,10,0.85)';
}, { passive: true });

// ============================================================
//  CONTACT FORM
// ============================================================
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    btn.innerHTML = '✓ Заявка отправлена!';
    btn.style.background = 'linear-gradient(135deg,#2dd4a8,#1fa882)';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.innerHTML = 'Отправить заявку <span class="btn-arrow">→</span>';
      btn.style.background = '';
      btn.style.color = '';
      form.reset();
    }, 3500);
  });
}
