/* ═══════════════════════════════════════════════════════════════════
   AXIOM PORTFOLIO — SCRIPT.JS (INTERSTELLAR)
   Systems:
   1.  Lenis smooth scroll
   2.  Comet cursor (velocity-based tail rotation + particle trail)
   3.  Loading sequence
   4.  Three.js — Interstellar scene (Nebula particles, Planets, Black Hole, Neutron Star)
   5.  GSAP ScrollTrigger — section animation timelines
   6.  About — fragmenting geometry
   7.  Skills — constellation network
   8.  Projects — 3D tile hover, modal cinematic transition
   9.  Experience — scroll-activated glowing timeline
   10. Contact — particle reactions on input focus
   11. Floating nav — section highlighting
   12. Mouse parallax
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Utility ── */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (lo, hi) => lo + Math.random() * (hi - lo);

/* ════════════════════════════════════════
   1. LENIS SMOOTH SCROLL
════════════════════════════════════════ */
let lenis;
function initLenis() {
  lenis = new Lenis({
    duration: 1.4,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1.0,
    smoothTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ════════════════════════════════════════
   2. COMET CURSOR (WITH TAIL AND PARTICLES)
════════════════════════════════════════ */
const cursorOuter = $('#cursor-outer'); // The tail
const cursorDot   = $('#cursor-dot');   // The head
const cursorCanvas = $('#cursor-canvas');
const ccCtx = cursorCanvas ? cursorCanvas.getContext('2d') : null;

let mx = -200, my = -200, ox = -200, oy = -200;
let cursorTrail = [];

function initCursor() {
  if (ccCtx) {
    cursorCanvas.width = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      cursorCanvas.width = window.innerWidth;
      cursorCanvas.height = window.innerHeight;
    });
  }

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  function animCursor() {
    const dx = mx - ox;
    const dy = my - oy;
    ox += dx * 0.2;
    oy += dy * 0.2;
    
    // Position head
    if (cursorDot) {
      cursorDot.style.transform = `translate(-50%, -50%) translate(${ox}px, ${oy}px)`;
    }

    // Velocity magnitude and angle for the tail
    const vel = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    if (cursorOuter) {
      cursorOuter.style.transform = `translate(0, -50%) translate(${ox}px, ${oy}px) rotate(${angle + 180}deg)`;
      // Stretch tail based on velocity
      const stretch = clamp(vel * 2.5, 30, 120);
      cursorOuter.style.width = stretch + 'px';
      cursorOuter.style.opacity = clamp(vel / 10, 0.4, 1);
    }

    // Particle trail canvas
    if (ccCtx && vel > 1) {
      cursorTrail.push({
        x: ox, y: oy,
        vx: rand(-0.5, 0.5) - (dx * 0.05),
        vy: rand(-0.5, 0.5) - (dy * 0.05),
        life: 1,
        color: Math.random() > 0.5 ? '#00e6ff' : '#ff7b00'
      });
    }

    if (ccCtx) {
      ccCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
      for (let i = cursorTrail.length - 1; i >= 0; i--) {
        const p = cursorTrail[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) {
          cursorTrail.splice(i, 1);
        } else {
          ccCtx.beginPath();
          ccCtx.arc(p.x, p.y, p.life * 2, 0, Math.PI * 2);
          ccCtx.fillStyle = p.color;
          ccCtx.globalAlpha = p.life * 0.5;
          ccCtx.fill();
        }
      }
      ccCtx.globalAlpha = 1;
    }

    requestAnimationFrame(animCursor);
  }
  animCursor();

  // Hover state
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .project-tile, .skill-node, .nav-dot, input, textarea, .modal-close')) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a, button, .project-tile, .skill-node, .nav-dot, input, textarea, .modal-close')) {
      document.body.classList.remove('cursor-hover');
    }
  });
}

/* ════════════════════════════════════════
   3. LOADING SEQUENCE
════════════════════════════════════════ */
function initLoader(onComplete) {
  const loader  = $('#loader');
  const bar     = $('#loader-bar');
  const pct     = $('#loader-percent');
  const lCanvas = $('#loader-canvas');
  const lCtx    = lCanvas.getContext('2d');

  let progress  = 0;
  let particles = [];

  function resizeLoaderCanvas() {
    lCanvas.width  = window.innerWidth;
    lCanvas.height = window.innerHeight;
  }
  resizeLoaderCanvas();
  window.addEventListener('resize', resizeLoaderCanvas);

  for (let i = 0; i < 120; i++) {
    particles.push({
      x:  rand(0, lCanvas.width),
      y:  rand(0, lCanvas.height),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      r:  rand(0.5, 2.5),
      alpha: rand(0.1, 0.8),
    });
  }

  let loaderRAF;
  function drawLoader() {
    lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
    lCtx.fillStyle = '#010204';
    lCtx.fillRect(0, 0, lCanvas.width, lCanvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > lCanvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > lCanvas.height) p.vy *= -1;

      lCtx.beginPath();
      lCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      lCtx.fillStyle = `rgba(0,230,255,${p.alpha * (0.5 + progress * 0.5)})`;
      lCtx.fill();
    });

    particles.forEach((a, i) => {
      particles.slice(i + 1).forEach(b => {
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          lCtx.beginPath();
          lCtx.strokeStyle = `rgba(255,123,0,${(1 - dist / 90) * 0.12 * progress})`;
          lCtx.lineWidth = 0.5;
          lCtx.moveTo(a.x, a.y);
          lCtx.lineTo(b.x, b.y);
          lCtx.stroke();
        }
      });
    });

    loaderRAF = requestAnimationFrame(drawLoader);
  }
  drawLoader();

  const progressTl = gsap.to({}, {
    duration: 2.5,
    ease: 'power2.inOut',
    onUpdate() {
      progress = this.progress();
      const p = Math.round(progress * 100);
      bar.style.width = p + '%';
      pct.textContent = p + '%';
    },
    onComplete() {
      cancelAnimationFrame(loaderRAF);
      gsap.to(loader, {
        opacity: 0, duration: 1.0, ease: 'power2.inOut',
        onComplete() {
          loader.style.display = 'none';
          onComplete();
        }
      });
    }
  });
}

/* ════════════════════════════════════════
   4. THREE.JS — INTERSTELLAR SCENE
════════════════════════════════════════ */
let renderer, scene, camera;
let starField, nebulaParticles;
let planets = [];
let blackHole, accretionDisk, neutronHole;
let mouseNorm = { x: 0, y: 0 };
let time = 0;

function initThreeJS() {
  const canvas = $('#webgl-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1); // True space black

  scene  = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0025);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 120);

  // 1. Vast Starfield (Point light stars)
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(8000 * 3);
  for(let i=0; i<8000; i++) {
    starPos[i*3] = rand(-600, 600);
    starPos[i*3+1] = rand(-600, 600);
    starPos[i*3+2] = rand(-800, 100);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8 });
  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // 2. Cosmic Nebula Dust (Colored fields)
  const COUNT = 4000;
  const nebGeo = new THREE.BufferGeometry();
  const nebPos = new Float32Array(COUNT * 3);
  const nebCol = new Float32Array(COUNT * 3);
  
  const palette = [
    new THREE.Color(0x7b2fff), // purple nebula
    new THREE.Color(0x00e6ff), // cyan hot gas
    new THREE.Color(0xff4d6d), // coral/pink dust
  ];

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const r = rand(40, 200);
    const theta = rand(0, Math.PI * 2);
    const phi = rand(0, Math.PI);
    
    // Stretch along X/Z to form a galactic plane
    nebPos[i3]     = r * Math.sin(phi) * Math.cos(theta) * 1.5;
    nebPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
    nebPos[i3 + 2] = r * Math.cos(phi);

    const c = palette[Math.floor(rand(0, palette.length))];
    nebCol[i3] = c.r; nebCol[i3 + 1] = c.g; nebCol[i3 + 2] = c.b;
  }
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
  nebGeo.setAttribute('color', new THREE.BufferAttribute(nebCol, 3));
  
  // Use a soft glowing particle material
  const canvas2D = document.createElement('canvas');
  canvas2D.width = 16; canvas2D.height = 16;
  const ctx = canvas2D.getContext('2d');
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,16,16);
  const particleTex = new THREE.CanvasTexture(canvas2D);

  const nebMat = new THREE.PointsMaterial({
    size: 6,
    vertexColors: true,
    map: particleTex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.4,
    depthWrite: false
  });
  nebulaParticles = new THREE.Points(nebGeo, nebMat);
  scene.add(nebulaParticles);

  // 3. Black Hole / Accretion Disk (Deep in Z axis)
  const bhGeo = new THREE.SphereGeometry(15, 64, 64);
  const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  blackHole = new THREE.Mesh(bhGeo, bhMat);
  blackHole.position.set(-40, 30, -350); // Move deeper
  
  // Disk
  const diskGeo = new THREE.RingGeometry(18, 45, 128);
  const diskMat = new THREE.MeshBasicMaterial({ 
    color: 0xff7b00, 
    side: THREE.DoubleSide, 
    transparent: true, 
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  accretionDisk = new THREE.Mesh(diskGeo, diskMat);
  accretionDisk.rotation.x = Math.PI / 2.5;
  blackHole.add(accretionDisk);
  scene.add(blackHole);

  // 4. Planets (Wireframe or basic textured)
  const pGeo1 = new THREE.IcosahedronGeometry(8, 2);
  const pMat1 = new THREE.MeshBasicMaterial({ color: 0x7b2fff, wireframe: true, transparent: true, opacity: 0.5 });
  const planet1 = new THREE.Mesh(pGeo1, pMat1);
  planet1.position.set(50, -20, -100);
  planets.push(planet1);
  scene.add(planet1);

  const pGeo2 = new THREE.IcosahedronGeometry(12, 1);
  const pMat2 = new THREE.MeshBasicMaterial({ color: 0x00e6ff, wireframe: true, transparent: true, opacity: 0.35 });
  const planet2 = new THREE.Mesh(pGeo2, pMat2);
  planet2.position.set(-60, -40, -180);
  planets.push(planet2);
  scene.add(planet2);

  const pGeo3 = new THREE.SphereGeometry(6, 32, 32);
  const pMat3 = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.9 });
  const planet3 = new THREE.Mesh(pGeo3, pMat3);
  planet3.position.set(20, 50, -250);
  planets.push(planet3);
  scene.add(planet3);

  // Add ambient light
  const ambient = new THREE.AmbientLight(0x222222);
  scene.add(ambient);

  window.addEventListener('resize', onThreeResize);
  window.addEventListener('mousemove', e => {
    mouseNorm.x = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNorm.y =-(e.clientY / window.innerHeight) * 2 + 1;
  });
}

function onThreeResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// RAF loop for Three.js
let threeActive = true;
let scrollProgress = 0; // 0 → 1 across full page

function threeLoop() {
  if (!threeActive) return;
  requestAnimationFrame(threeLoop);

  time += 0.01;

  // Rotate nebula cloud slowly
  nebulaParticles.rotation.y = time * 0.05;
  starField.rotation.y = time * 0.02;

  // Accretion disk spinning
  accretionDisk.rotation.z -= 0.02;
  // Pulsing effect on disk
  accretionDisk.scale.setScalar(1 + Math.sin(time * 5) * 0.05);

  // Planets orbiting/spinning
  planets[0].rotation.x += 0.005;
  planets[0].rotation.y += 0.01;
  planets[1].rotation.z -= 0.003;
  planets[1].rotation.x -= 0.003;

  planets[2].position.x = 20 + Math.sin(time * 0.5) * 40;
  planets[2].position.z = -250 + Math.cos(time * 0.5) * 40;
  planets[2].rotation.y += 0.02;

  // Camera parallax (gentle orbital sway based on mouse)
  camera.position.x += (mouseNorm.x * 12 - camera.position.x) * 0.04;
  camera.position.y += (mouseNorm.y * 8 - camera.position.y) * 0.04;

  // Immersive Scroll Dive! Camera Z plummets deep into space towards black hole
  const targetZ = 120 - scrollProgress * 500; // Dive deep towards black hole at Z = -350
  camera.position.z += (targetZ - camera.position.z) * 0.06;

  // Rotate camera slightly based on scroll to simulate complex trajectory passing planets
  camera.rotation.z = scrollProgress * Math.PI * 0.1;
  camera.rotation.x = mouseNorm.y * 0.05 + Math.sin(scrollProgress * Math.PI) * 0.1;
  camera.rotation.y = mouseNorm.x * 0.05;

  renderer.render(scene, camera);
}

/* ════════════════════════════════════════
   5. GSAP SCROLL TRIGGER SETUP
════════════════════════════════════════ */
function initScrollAnimations() {
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('gsap-initialized');

  ScrollTrigger.create({
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate(self) {
      scrollProgress = self.progress;
    }
  });

  const sections = ['hero','about','skills','projects','experience','contact'];
  sections.forEach(id => {
    const dot = $(`#nd-${id}`);
    ScrollTrigger.create({
      trigger: `#${id}`,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter()      { setActiveNav(dot); },
      onEnterBack()  { setActiveNav(dot); },
    });
  });

  animHero();
  animAbout();
  animSkills();
  animProjects();
  animExperience();
  animContact();
}

function setActiveNav(dot) {
  if (!dot) return;
  $$('.nav-dot').forEach(d => d.classList.remove('active'));
  dot.classList.add('active');
}

/* ── HERO ── */
function animHero() {
  const tl = gsap.timeline({ delay: 0.3 });
  tl.to('.hero-eyebrow', { opacity: 1, duration: 0.8, ease: 'power3.out' })
    .to('.hero-word', { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'expo.out' }, '-=0.4')
    .to('.hero-sub', { opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to('.hero-scroll-hint', { opacity: 1, duration: 0.8 }, '-=0.3')
    .to('#holo-badge', { opacity: 1, duration: 1.0, ease: 'power3.out' }, '-=0.6');
}

/* ── ABOUT ── */
function animAbout() {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#about',
      start: 'top 70%',
      end: 'bottom 20%',
      toggleActions: 'play none none reverse',
    }
  });
  tl.to('.ah-line', { opacity: 1, x: 0, duration: 1.0, stagger: 0.15, ease: 'expo.out' })
    .to('.about-bio p', { opacity: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out' }, '-=0.5')
    .to('.holo-panel', { opacity: 1, x: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(1.2)' }, '-=0.6');

  $$('.stat-number').forEach(el => {
    const target = +el.dataset.target;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter() {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 2.0,
          ease: 'power3.out',
          onUpdate() { el.textContent = Math.round(this.targets()[0].val); }
        });
      }
    });
  });

  initFragmentCanvas();
}

/* ════════════════════════════════════════
   6. FRAGMENT CANVAS (About section)
════════════════════════════════════════ */
function initFragmentCanvas() {
  const fc = $('#frag-canvas');
  const fCtx = fc.getContext('2d');

  function resize() {
    fc.width  = fc.parentElement.offsetWidth;
    fc.height = fc.parentElement.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let fragments = [];
  const FRAG_COUNT = 30;
  for (let i = 0; i < FRAG_COUNT; i++) {
    fragments.push({
      x: rand(0, fc.width),
      y: rand(0, fc.height),
      size: rand(10, 50),
      sides: Math.floor(rand(3, 5)),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      rot: rand(0, Math.PI * 2),
      rotV: rand(-0.01, 0.01),
      alpha: 0,
      targetAlpha: rand(0.01, 0.05),
    });
  }

  let dissolveProgress = 0;
  ScrollTrigger.create({
    trigger: '#about',
    start: 'top 60%',
    end: 'top -40%',
    onUpdate(self) { dissolveProgress = self.progress; }
  });

  function drawFragments() {
    fCtx.clearRect(0, 0, fc.width, fc.height);
    const phase = dissolveProgress < 0.5 ? dissolveProgress * 2 : 1 - (dissolveProgress - 0.5) * 2;

    fragments.forEach(f => {
      f.x += f.vx; f.y += f.vy; f.rot += f.rotV;
      f.alpha = lerp(f.alpha, f.targetAlpha * phase, 0.05);

      if (f.x < -f.size) f.x = fc.width  + f.size;
      if (f.x > fc.width + f.size) f.x = -f.size;
      if (f.y < -f.size) f.y = fc.height + f.size;
      if (f.y > fc.height + f.size) f.y = -f.size;

      fCtx.save();
      fCtx.translate(f.x, f.y);
      fCtx.rotate(f.rot);
      fCtx.beginPath();
      for (let j = 0; j < f.sides; j++) {
        const angle = (j / f.sides) * Math.PI * 2;
        const px = Math.cos(angle) * f.size;
        const py = Math.sin(angle) * f.size;
        j === 0 ? fCtx.moveTo(px, py) : fCtx.lineTo(px, py);
      }
      fCtx.closePath();
      fCtx.strokeStyle = `rgba(0,230,255,${f.alpha * 4})`;
      fCtx.lineWidth = 0.5;
      fCtx.stroke();
      fCtx.fillStyle = `rgba(123,47,255,${f.alpha})`;
      fCtx.fill();
      fCtx.restore();
    });
    requestAnimationFrame(drawFragments);
  }
  drawFragments();
}

/* ════════════════════════════════════════
   7. SKILLS CONSTELLATION
════════════════════════════════════════ */
const SKILLS = [
  { name: 'Three.js',     level: 95, cat: 'creative' },
  { name: 'GSAP',         level: 92, cat: 'creative' },
  { name: 'WebGL / GLSL', level: 80, cat: 'creative' },
  { name: 'React',        level: 90, cat: 'frontend' },
  { name: 'JavaScript',   level: 96, cat: 'frontend' },
  { name: 'TypeScript',   level: 85, cat: 'frontend' },
  { name: 'Node.js',      level: 82, cat: 'backend'  },
  { name: 'Python',       level: 75, cat: 'backend'  },
  { name: 'Blender',      level: 70, cat: 'creative' },
  { name: 'PostgreSQL',   level: 72, cat: 'backend'  },
  { name: 'CSS / SASS',   level: 95, cat: 'frontend' },
  { name: 'WebXR',        level: 65, cat: 'creative' },
];

const CAT_COLOR = {
  creative: '#00e6ff', // Pulsar Cyan
  frontend: '#7b2fff', // Nebula Purple
  backend:  '#ff7b00', // Accretion Orange
};

function animSkills() {
  const container = $('#skills-constellation');
  const W = container.offsetWidth  || 600;
  const H = container.offsetHeight || 600;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'constellation-svg');
  container.appendChild(svg);

  const nodeData = SKILLS.map((skill, i) => {
    const angle  = (i / SKILLS.length) * Math.PI * 2 + 0.4;
    const radius = 0.30 + (i % 3) * 0.1;
    const x = W * 0.5 + W * radius * Math.cos(angle);
    const y = H * 0.5 + H * radius * Math.sin(angle);
    return { ...skill, x, y, el: null };
  });

  const connections = [ [0,1],[1,2],[2,8],[0,4],[3,4],[4,5],[5,6],[6,7],[7,9],[8,11],[3,10],[10,0] ];
  connections.forEach(([a, b]) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', nodeData[a].x);
    line.setAttribute('y1', nodeData[a].y);
    line.setAttribute('x2', nodeData[b].x);
    line.setAttribute('y2', nodeData[b].y);
    line.setAttribute('class', 'const-line');
    svg.appendChild(line);
  });

  const tooltip   = $('#skill-tooltip');
  const ttName    = tooltip.querySelector('.tooltip-name');
  const ttLevel   = tooltip.querySelector('.tooltip-level');
  const ttFill    = tooltip.querySelector('.tooltip-fill');

  nodeData.forEach((nd, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'skill-node';
    wrap.style.left = nd.x + 'px';
    wrap.style.top  = nd.y + 'px';
    wrap.style.opacity = 0;

    const dot = document.createElement('div');
    dot.className = 'skill-node-dot';
    dot.style.background = CAT_COLOR[nd.cat];
    dot.style.boxShadow  = `0 0 16px ${CAT_COLOR[nd.cat]}, 0 0 32px ${CAT_COLOR[nd.cat]}99`;

    const label = document.createElement('div');
    label.className = 'skill-node-label';
    label.textContent = nd.name;

    wrap.appendChild(dot); wrap.appendChild(label);
    container.appendChild(wrap);
    nd.el = wrap;

    wrap.addEventListener('mouseenter', e => {
      ttName.textContent = nd.name;
      ttLevel.textContent = `${nd.level}% PROF`;
      ttFill.style.width  = nd.level + '%';
      tooltip.style.opacity = '1';
    });
    wrap.addEventListener('mousemove', e => {
      tooltip.style.left = (e.clientX + 16) + 'px';
      tooltip.style.top  = (e.clientY - 30) + 'px';
    });
    wrap.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
  });

  ScrollTrigger.create({
    trigger: '#skills',
    start: 'top 65%',
    toggleActions: 'play none none reverse',
    onEnter() {
      nodeData.forEach((nd, i) => {
        gsap.to(nd.el, { opacity: 1, duration: 0.5, delay: i * 0.05, ease: 'power3.out' });
      });
    },
    onLeaveBack() {
      nodeData.forEach(nd => gsap.to(nd.el, { opacity: 0, duration: 0.3 }));
    }
  });

  let angleAnim = 0;
  function orbitTick() {
    angleAnim += 0.002;
    nodeData.forEach((nd, i) => {
      const baseAngle = (i / SKILLS.length) * Math.PI * 2 + 0.4;
      const radius    = 0.30 + (i % 3) * 0.1;
      const a = baseAngle + angleAnim * (i % 2 === 0 ? 1 : -0.7) * 0.2;
      nd.el.style.left = (W * 0.5 + W * radius * Math.cos(a)) + 'px';
      nd.el.style.top  = (H * 0.5 + H * radius * Math.sin(a))  + 'px';

      // Update lines
      connections.forEach((conn, ci) => {
        if(conn[0] === i) {
          svg.childNodes[ci].setAttribute('x1', nd.el.style.left.replace('px',''));
          svg.childNodes[ci].setAttribute('y1', nd.el.style.top.replace('px',''));
        }
        if(conn[1] === i) {
          svg.childNodes[ci].setAttribute('x2', nd.el.style.left.replace('px',''));
          svg.childNodes[ci].setAttribute('y2', nd.el.style.top.replace('px',''));
        }
      });
    });
    requestAnimationFrame(orbitTick);
  }
  orbitTick();
}

/* ════════════════════════════════════════
   8. PROJECTS
════════════════════════════════════════ */
const PROJECT_DATA = {
  nebula: { num: '001', title:'NEBULA', desc: 'Real-time generative cosmos built in WebGL. Procedural clouds, dynamic star life-cycles, and gravitational lensing.', tags: ['Three.js','GLSL'], link: '#', color: [0, 230, 255] },
  echo:   { num: '002', title:'ECHO', desc: 'Live audio-reactive visual synthesizer. Renders an evolving fluid simulation that responds to harmonics.', tags: ['React','Audio API'], link: '#', color: [123, 47, 255] },
  arc:    { num: '003', title:'ARC', desc: 'Extended reality gallery for digital sculpture. AR sculptures anchored to the real world.', tags: ['WebXR','Node.js'], link: '#', color: [255, 77, 109] },
  void:   { num: '004', title:'NOVA', desc: 'Accretion disk simulation mapped to live financial data. High-performance computing converted to visual art.', tags: ['Python','Canvas'], link: '#', color: [255, 123, 0] },
};

function animProjects() {
  $$('.project-tile').forEach((tile, i) => {
    gsap.to(tile, {
      scrollTrigger: { trigger: tile, start: 'top 85%', toggleActions: 'play none none reverse' },
      opacity: 1, y: 0, scale: 1, duration: 0.9, delay: i * 0.1, ease: 'back.out(1.1)',
    });
  });

  $$('.project-tile').forEach(tile => {
    tile.addEventListener('click', () => openModal(tile.dataset.project));
  });

  $('#modal-close').addEventListener('click', closeModal);
  $('#project-modal').addEventListener('click', e => {
    if (e.target === $('#project-modal') || e.target === $('#modal-bg')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  initModalCanvas();
}

let modalCanvasRAF, modalCanvasActive = false;
let mParts = [];
let mc, mCtx;
function initModalCanvas() {
  mc = $('#modal-canvas');
  mCtx = mc.getContext('2d');

  function resizeMC() {
    mc.width  = mc.parentElement.offsetWidth  || window.innerWidth;
    mc.height = mc.parentElement.offsetHeight || window.innerHeight;
  }
  resizeMC();
  window.addEventListener('resize', resizeMC);
}

function spawnModalParticles(color) {
  mParts = [];
  const [r, g, b] = color;
  const cx = mc.width/2; const cy = mc.height/2;
  for (let i = 0; i < 400; i++) {
    // Spawn in a galaxy-like spiral
    const dist = rand(0, mc.width);
    const angle = rand(0, Math.PI * 2);
    mParts.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: rand(-1, 1), vy: rand(-1, 1),
      r: rand(0.5, 3), alpha: rand(0.1, 0.8), color: `rgba(${r},${g},${b},`
    });
  }
}

function drawModalCanvas() {
  if (!modalCanvasActive) return;
  mCtx.clearRect(0, 0, mc.width, mc.height);
  
  // Orbital movement for particles simulating accretion disk / black hole
  const cx = mc.width/2; const cy = mc.height/2;

  mParts.forEach(p => {
    // Gravity well effect
    const dx = cx - p.x; const dy = cy - p.y;
    const distSq = dx*dx + dy*dy;
    
    // Fall inward but also spin
    p.vx += (dx / distSq) * 10 - p.vy * 0.005;
    p.vy += (dy / distSq) * 10 + p.vx * 0.005;
    
    // Speed limit
    const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
    if(speed > 5) {
      p.vx = (p.vx/speed) * 5;
      p.vy = (p.vy/speed) * 5;
    }
    
    p.x += p.vx; 
    p.y += p.vy;
    
    // Respawn if too far or too close
    if (p.x < 0 || p.x > mc.width || p.y < 0 || p.y > mc.height || distSq < 100) {
      const angle = rand(0, Math.PI * 2);
      const newD = rand(cx, mc.width);
      p.x = cx + Math.cos(angle) * newD;
      p.y = cy + Math.sin(angle) * newD;
      p.vx = rand(-1, 1); p.vy = rand(-1, 1);
    }
    
    mCtx.beginPath();
    mCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    mCtx.fillStyle = p.color + p.alpha + ')';
    mCtx.fill();
  });
  modalCanvasRAF = requestAnimationFrame(drawModalCanvas);
}

function openModal(key) {
  const d     = PROJECT_DATA[key];
  const modal = $('#project-modal');
  $('#modal-num').textContent   = d.num;
  $('#modal-title').textContent = d.title;
  $('#modal-desc').textContent  = d.desc;
  $('#modal-link').href         = d.link;

  const tagsEl = $('#modal-tags');
  tagsEl.innerHTML = '';
  d.tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'modal-tag';
    span.textContent = t;
    tagsEl.appendChild(span);
  });

  modal.classList.add('open');
  lenis.stop();

  modalCanvasActive = true;
  spawnModalParticles(d.color);
  cancelAnimationFrame(modalCanvasRAF);
  drawModalCanvas();

  gsap.fromTo('#project-modal .modal-body',
    { opacity: 0, scale: 0.95, y: 40 },
    { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'expo.out' }
  );
  gsap.fromTo('#project-modal .modal-bg',
    { opacity: 0 }, { opacity: 1, duration: 0.5 }
  );
}

function closeModal() {
  const modal = $('#project-modal');
  gsap.to('#project-modal .modal-body', {
    opacity: 0, scale: 0.95, y: -20, duration: 0.4, ease: 'power2.in'
  });
  gsap.to('#project-modal .modal-bg', {
    opacity: 0, duration: 0.4, delay: 0.1,
    onComplete() {
      modal.classList.remove('open');
      lenis.start();
      modalCanvasActive = false;
      cancelAnimationFrame(modalCanvasRAF);
    }
  });
}

/* ════════════════════════════════════════
   9. EXPERIENCE TIMELINE
════════════════════════════════════════ */
function animExperience() {
  $$('.timeline-item').forEach((item, i) => {
    gsap.to(item, {
      scrollTrigger: {
        trigger: item, start: 'top 85%', toggleActions: 'play none none reverse',
        onEnter()     { item.classList.add('active'); },
        onLeaveBack() { item.classList.remove('active'); },
      },
      opacity: 1, x: 0,
      duration: 0.8, delay: i * 0.1, ease: 'back.out(1.2)'
    });
  });
}

/* ════════════════════════════════════════
   10. CONTACT — EVENT HORIZON PARTICLES
════════════════════════════════════════ */
function animContact() {
  gsap.to('#contact-console', {
    scrollTrigger: { trigger: '#contact', start: 'top 75%', toggleActions: 'play none none reverse' },
    opacity: 1, y: 0, duration: 1.0, ease: 'back.out(1)'
  });

  $$('.field-input').forEach(inp => {
    inp.addEventListener('focus', () => emitFieldParticles(inp));
  });

  $('#contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const btn = $('#console-submit');
    btn.querySelector('.submit-text').textContent = 'TRANSMISSION SENT ✓';
    btn.style.borderColor = '#00e6ff';
    gsap.to(btn, { scale: 1.02, duration: 0.1, yoyo: true, repeat: 3, ease: "power1.inOut" });
    setTimeout(() => { btn.querySelector('.submit-text').textContent = 'TRANSMIT →'; }, 3000);
  });
}

function emitFieldParticles(inp) {
  const container = inp.nextElementSibling;
  if (!container || !container.classList.contains('field-particles')) return;

  for (let i = 0; i < 15; i++) {
    const dot = document.createElement('div');
    const size = rand(1, 4);
    dot.style.cssText = `
      position:absolute; width:${size}px; height:${size}px;
      background:${Math.random() > 0.6 ? '#00e6ff' : '#ff7b00'};
      border-radius:50%; left:${rand(0, 100)}%; bottom:0;
      pointer-events:none; box-shadow: 0 0 10px currentColor;
    `;
    container.appendChild(dot);
    gsap.to(dot, {
      y: rand(-30, -80), x: rand(-30, 30),
      opacity: 0, duration: rand(0.6, 1.2), ease: 'power2.out',
      onComplete() { dot.remove(); }
    });
  }
}

/* ════════════════════════════════════════
   11. NAV SMOOTH CLICK
════════════════════════════════════════ */
function initNavLinks() {
  $$('.nav-dot').forEach(dot => {
    dot.addEventListener('click', e => {
      e.preventDefault();
      const target = $(dot.getAttribute('href'));
      if (target) lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 5) });
    });
  });
}

/* ════════════════════════════════════════
   12. MOUSE PARALLAX for hero elements
════════════════════════════════════════ */
function initParallax() {
  const badge    = $('#holo-badge');
  const eyebrow  = $('.hero-eyebrow');

  window.addEventListener('mousemove', e => {
    const nx = (e.clientX / window.innerWidth  - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;

    if (badge) {
      gsap.to(badge, { x: nx * -18, y: ny * -12, duration: 1.2, ease: 'power2.out' });
    }
    if (eyebrow) {
      gsap.to(eyebrow, { x: nx * 8, duration: 1.0, ease: 'power2.out' });
    }
  });
}

window.addEventListener('resize', () => ScrollTrigger.refresh());

/* ════════════════════════════════════════
   MASTER INIT
════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initThreeJS();

  initLoader(() => {
    gsap.registerPlugin(ScrollTrigger);
    initLenis();
    threeLoop();
    initScrollAnimations();
    initNavLinks();
    initParallax();
    animHero();
  });
});
