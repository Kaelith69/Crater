/* ═══════════════════════════════════════════════════════════════════
   AXIOM PORTFOLIO — SCRIPT.JS
   Systems:
   1.  Lenis smooth scroll
   2.  Custom cursor
   3.  Loading sequence (particle canvas + progress bar)
   4.  Three.js — hero particle field, camera fly-through
   5.  GSAP ScrollTrigger — section animation timelines
   6.  About — fragmenting geometry → typography reveal
   7.  Skills — constellation network (DOM-based SVG + nodes)
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
    duration: 1.25,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1.0,
    smoothTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add(time => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/* ════════════════════════════════════════
   2. CUSTOM CURSOR
════════════════════════════════════════ */
const cursorOuter = $('#cursor-outer');
const cursorDot   = $('#cursor-dot');
let mx = -200, my = -200, ox = -200, oy = -200;

function initCursor() {
  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursorDot.style.left = mx + 'px';
    cursorDot.style.top  = my + 'px';
  });

  // Lerp the ring
  function animCursor() {
    ox = lerp(ox, mx, 0.12);
    oy = lerp(oy, my, 0.12);
    cursorOuter.style.left = ox + 'px';
    cursorOuter.style.top  = oy + 'px';
    requestAnimationFrame(animCursor);
  }
  animCursor();

  // Hover state for interactive elements
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .project-tile, .skill-node, .nav-dot')) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a, button, .project-tile, .skill-node, .nav-dot')) {
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

  // Resize loader canvas
  function resizeLoaderCanvas() {
    lCanvas.width  = window.innerWidth;
    lCanvas.height = window.innerHeight;
  }
  resizeLoaderCanvas();
  window.addEventListener('resize', resizeLoaderCanvas);

  // Create particles for loading canvas
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
    lCtx.fillStyle = '#020408';
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

    // Connecting lines
    particles.forEach((a, i) => {
      particles.slice(i + 1).forEach(b => {
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          lCtx.beginPath();
          lCtx.strokeStyle = `rgba(0,230,255,${(1 - dist / 90) * 0.12 * progress})`;
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

  // Animate progress 0 → 100
  const progressTl = gsap.to({}, {
    duration: 2.0,
    ease: 'power2.inOut',
    onUpdate() {
      progress = this.progress();
      const p = Math.round(progress * 100);
      bar.style.width = p + '%';
      pct.textContent = p + '%';
    },
    onComplete() {
      cancelAnimationFrame(loaderRAF);
      // Fade out
      gsap.to(loader, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete() {
          loader.style.display = 'none';
          onComplete();
        }
      });
    }
  });

  return progressTl;
}

/* ════════════════════════════════════════
   4. THREE.JS — HERO PARTICLE FIELD
════════════════════════════════════════ */
let renderer, scene, camera;
let heroParticles, heroGeometry, heroMaterial;
let particlePositions;
let mouseNorm = { x: 0, y: 0 };

function initThreeJS() {
  const canvas = $('#webgl-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 80);

  // ── Particle field ──
  const COUNT = 3500;
  heroGeometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(COUNT * 3);
  const pColors = new Float32Array(COUNT * 3);

  const palette = [
    new THREE.Color(0x00e6ff), // cyan
    new THREE.Color(0x7b2fff), // violet
    new THREE.Color(0x0a0a2e), // dark
    new THREE.Color(0xff2d9b), // magenta
  ];

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    // Spherical distribution
    const r     = rand(20, 120);
    const theta = rand(0, Math.PI * 2);
    const phi   = rand(0, Math.PI);
    particlePositions[i3]     = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    particlePositions[i3 + 2] = r * Math.cos(phi);

    const c = palette[Math.floor(rand(0, palette.length))];
    pColors[i3]     = c.r;
    pColors[i3 + 1] = c.g;
    pColors[i3 + 2] = c.b;
  }

  heroGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  heroGeometry.setAttribute('color',    new THREE.BufferAttribute(pColors, 3));

  heroMaterial = new THREE.PointsMaterial({
    size: 0.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
  });

  heroParticles = new THREE.Points(heroGeometry, heroMaterial);
  scene.add(heroParticles);

  // ── Floating geometric shapes ──
  addHeroShapes();

  window.addEventListener('resize', onThreeResize);
  window.addEventListener('mousemove', e => {
    mouseNorm.x = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNorm.y =-(e.clientY / window.innerHeight) * 2 + 1;
  });
}

let heroShapes = [];
function addHeroShapes() {
  const geos = [
    new THREE.OctahedronGeometry(4, 0),
    new THREE.TetrahedronGeometry(3, 0),
    new THREE.IcosahedronGeometry(3, 0),
  ];
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00e6ff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  for (let i = 0; i < 6; i++) {
    const geo  = geos[i % geos.length];
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.position.set(rand(-50, 50), rand(-30, 30), rand(-60, -10));
    mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    mesh.userData.rotSpeed = {
      x: rand(-0.003, 0.003),
      y: rand(-0.005, 0.005),
      z: rand(-0.002, 0.002),
    };
    heroShapes.push(mesh);
    scene.add(mesh);
  }
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

  const t = performance.now() * 0.001;

  // Rotate particle cloud slowly + respond to mouse
  if (heroParticles) {
    heroParticles.rotation.y += 0.0008 + mouseNorm.x * 0.0005;
    heroParticles.rotation.x += 0.0003 + mouseNorm.y * 0.0003;
  }

  // Animate individual shapes
  heroShapes.forEach(m => {
    m.rotation.x += m.userData.rotSpeed.x;
    m.rotation.y += m.userData.rotSpeed.y;
    m.rotation.z += m.userData.rotSpeed.z;
  });

  // Camera position drift (mouse parallax)
  camera.position.x += (mouseNorm.x * 6 - camera.position.x) * 0.04;
  camera.position.y += (mouseNorm.y * 4 - camera.position.y) * 0.04;

  // Camera z moves forward as user scrolls
  const targetZ = 80 - scrollProgress * 140;
  camera.position.z += (targetZ - camera.position.z) * 0.06;

  // Fade particles as we dive deeper
  if (heroMaterial) {
    heroMaterial.opacity = clamp(0.75 - scrollProgress * 1.2, 0, 0.8);
  }

  renderer.render(scene, camera);
}

/* ════════════════════════════════════════
   5. GSAP SCROLL TRIGGER SETUP
════════════════════════════════════════ */
function initScrollAnimations() {
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('gsap-initialized');

  // Track overall scroll progress for Three.js camera
  ScrollTrigger.create({
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate(self) {
      scrollProgress = self.progress;
    }
  });

  // ── NAV DOTS highlight ──
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
  $$('.nav-dot').forEach(d => d.classList.remove('active'));
  dot.classList.add('active');
}

/* ── HERO ── */
function animHero() {
  const tl = gsap.timeline({ delay: 0.3 });
  tl.to('.hero-eyebrow', { opacity: 1, duration: 0.8, ease: 'power3.out' })
    .to('.hero-word', {
      opacity: 1, y: 0, duration: 0.9,
      stagger: 0.14, ease: 'expo.out',
    }, '-=0.4')
    .to('.hero-sub', { opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.4')
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
  tl.to('.ah-line', { opacity: 1, x: 0, duration: 0.8, stagger: 0.15, ease: 'expo.out' })
    .to('.about-bio p', { opacity: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out' }, '-=0.4')
    .to('.holo-panel', { opacity: 1, x: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' }, '-=0.5');

  // Counter animation
  $$('.stat-number').forEach(el => {
    const target = +el.dataset.target;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter() {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate() {
            el.textContent = Math.round(this.targets()[0].val);
          }
        });
      }
    });
  });

  // Fragment canvas effect (geometric shards dissolve)
  initFragmentCanvas();
}

/* ════════════════════════════════════════
   6. FRAGMENT CANVAS (About section)
════════════════════════════════════════ */
function initFragmentCanvas() {
  const fc   = $('#frag-canvas');
  const fCtx = fc.getContext('2d');

  function resize() {
    fc.width  = fc.parentElement.offsetWidth;
    fc.height = fc.parentElement.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let fragments = [];
  const FRAG_COUNT = 40;
  for (let i = 0; i < FRAG_COUNT; i++) {
    const size = rand(20, 80);
    fragments.push({
      x: rand(0, fc.width),
      y: rand(0, fc.height),
      size,
      sides: Math.floor(rand(3, 7)),
      vx: rand(-0.5, 0.5),
      vy: rand(-0.5, 0.5),
      rot: rand(0, Math.PI * 2),
      rotV: rand(-0.005, 0.005),
      alpha: 0,
      targetAlpha: rand(0.02, 0.06),
    });
  }

  let dissolveProgress = 0; // 0 = none visible, 1 = fully dissolved (transparent)

  ScrollTrigger.create({
    trigger: '#about',
    start: 'top 60%',
    end: 'top -40%',
    onUpdate(self) {
      dissolveProgress = self.progress;
    }
  });

  function drawFragments() {
    fCtx.clearRect(0, 0, fc.width, fc.height);
    // Phase: 0→0.5 appear, 0.5→1 dissolve
    const phase = dissolveProgress < 0.5
      ? dissolveProgress * 2           // 0→1 appear
      : 1 - (dissolveProgress - 0.5) * 2; // 1→0 dissolve

    fragments.forEach(f => {
      f.x   += f.vx;
      f.y   += f.vy;
      f.rot += f.rotV;
      f.alpha = lerp(f.alpha, f.targetAlpha * phase, 0.05);

      if (f.x < -f.size) f.x = fc.width  + f.size;
      if (f.x > fc.width  + f.size) f.x = -f.size;
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
      fCtx.strokeStyle = `rgba(0,230,255,${f.alpha * 3})`;
      fCtx.lineWidth   = 0.5;
      fCtx.stroke();
      fCtx.fillStyle   = `rgba(0,230,255,${f.alpha * 0.5})`;
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
  creative: '#00e6ff',
  frontend: '#7b2fff',
  backend:  '#ff2d9b',
};

function animSkills() {
  const container = $('#skills-constellation');
  const W = container.offsetWidth  || 600;
  const H = container.offsetHeight || 600;

  // Create SVG for connections
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'constellation-svg');
  container.appendChild(svg);

  const nodeData = SKILLS.map((skill, i) => {
    // Arrange in a loose circular spiral
    const angle  = (i / SKILLS.length) * Math.PI * 2 + 0.4;
    const radius = 0.28 + (i % 3) * 0.09;
    const x = W * 0.5 + W * radius * Math.cos(angle);
    const y = H * 0.5 + H * radius * Math.sin(angle);
    return { ...skill, x, y, el: null };
  });

  // Draw connection lines
  const connections = [
    [0,1],[1,2],[2,8],[0,4],[3,4],[4,5],[5,6],[6,7],[7,9],[8,11],[3,10],[10,0]
  ];
  connections.forEach(([a, b]) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', nodeData[a].x);
    line.setAttribute('y1', nodeData[a].y);
    line.setAttribute('x2', nodeData[b].x);
    line.setAttribute('y2', nodeData[b].y);
    line.setAttribute('class', 'const-line');
    svg.appendChild(line);
  });

  // Create DOM nodes
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
    dot.style.boxShadow  = `0 0 16px ${CAT_COLOR[nd.cat]}, 0 0 32px ${CAT_COLOR[nd.cat]}44`;

    const label = document.createElement('div');
    label.className = 'skill-node-label';
    label.textContent = nd.name;

    wrap.appendChild(dot);
    wrap.appendChild(label);
    container.appendChild(wrap);
    nd.el = wrap;

    // Hover tooltip
    wrap.addEventListener('mouseenter', e => {
      ttName.textContent = nd.name;
      ttLevel.textContent = `${nd.level}% PROFICIENCY`;
      ttFill.style.width  = nd.level + '%';
      tooltip.style.opacity = '1';
    });
    wrap.addEventListener('mousemove', e => {
      tooltip.style.left = (e.clientX + 16) + 'px';
      tooltip.style.top  = (e.clientY - 30) + 'px';
    });
    wrap.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  });

  // Animate nodes into view on scroll
  ScrollTrigger.create({
    trigger: '#skills',
    start: 'top 65%',
    toggleActions: 'play none none reverse',
    onEnter() {
      nodeData.forEach((nd, i) => {
        gsap.to(nd.el, {
          opacity: 1, duration: 0.5,
          delay: i * 0.06,
          ease: 'power3.out',
        });
      });
    },
    onLeaveBack() {
      nodeData.forEach(nd => gsap.to(nd.el, { opacity: 0, duration: 0.3 }));
    }
  });

  // Slow orbit animation
  let angle = 0;
  function orbitTick() {
    angle += 0.003;
    nodeData.forEach((nd, i) => {
      const baseAngle = (i / SKILLS.length) * Math.PI * 2 + 0.4;
      const radius    = 0.28 + (i % 3) * 0.09;
      const a = baseAngle + angle * (i % 2 === 0 ? 1 : -0.7) * 0.15;
      nd.el.style.left = (W * 0.5 + W * radius * Math.cos(a)) + 'px';
      nd.el.style.top  = (H * 0.5 + H * radius * Math.sin(a))  + 'px';

      // Update SVG lines
      const line = svg.querySelectorAll('line')[connections.indexOf(
        connections.find((c, ci) => c.includes(i) && ci < connections.length)
      )];
    });
    requestAnimationFrame(orbitTick);
  }
  orbitTick();
}

/* ════════════════════════════════════════
   8. PROJECTS
════════════════════════════════════════ */
const PROJECT_DATA = {
  nebula: {
    num:  '001',
    title:'NEBULA',
    desc: 'A real-time generative cosmos built entirely in WebGL and GLSL shaders. Procedural nebula clouds, dynamic star life-cycles, and gravitational lensing simulations. Exhibited at the 2023 Digital Arts Festival.',
    tags: ['Three.js','GLSL','WebGL','Procedural Generation'],
    link: '#',
    color: [0, 230, 255],
  },
  echo: {
    num:  '002',
    title:'ECHO',
    desc:  'A live audio-reactive visual synthesizer. Connects to a microphone or audio file, analyses frequency bands in real-time, and renders an evolving fluid simulation that responds to every beat and harmonic.',
    tags: ['React','Web Audio API','Canvas','Signal Processing'],
    link: '#',
    color: [123, 47, 255],
  },
  arc: {
    num:  '003',
    title:'ARC',
    desc:  'An extended reality gallery for digital sculpture. Visitors scan QR codes around a physical space and AR sculptures appear anchored to the real world. Hosted at MOMA Tech Exhibition 2024.',
    tags: ['WebXR','Node.js','Three.js','AR'],
    link: '#',
    color: [255, 45, 155],
  },
  void: {
    num:  '004',
    title:'VOID',
    desc:  'A machine-learning powered generative identity system. Input a name and a unique visual identity — logo, palette, motion language — is synthesised using a GAN trained on 50k brand identities.',
    tags: ['Python','PyTorch','Canvas','REST API'],
    link: '#',
    color: [255, 209, 102],
  },
};

function animProjects() {
  // Scroll-triggered tile reveal
  $$('.project-tile').forEach((tile, i) => {
    gsap.to(tile, {
      scrollTrigger: { trigger: tile, start: 'top 80%', toggleActions: 'play none none reverse' },
      opacity: 1, y: 0, duration: 0.8,
      delay: i * 0.12, ease: 'power3.out',
    });
  });

  // Click → modal
  $$('.project-tile').forEach(tile => {
    tile.addEventListener('click', () => openModal(tile.dataset.project));
  });

  // Close modal
  $('#modal-close').addEventListener('click', closeModal);
  $('#project-modal').addEventListener('click', e => {
    if (e.target === $('#project-modal') || e.target === $('#modal-bg')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Modal particle canvas
  initModalCanvas();
}

let modalCanvasRAF, modalCanvasActive = false;
function initModalCanvas() {
  const mc    = $('#modal-canvas');
  const mCtx  = mc.getContext('2d');
  let mParts  = [];

  function resizeMC() {
    mc.width  = mc.parentElement.offsetWidth  || window.innerWidth;
    mc.height = mc.parentElement.offsetHeight || window.innerHeight;
  }
  resizeMC();
  window.addEventListener('resize', resizeMC);

  function spawnModalParticles(color) {
    mParts = [];
    const [r, g, b] = color;
    for (let i = 0; i < 200; i++) {
      mParts.push({
        x:     rand(0, mc.width),
        y:     rand(0, mc.height),
        vx:    rand(-0.4, 0.4),
        vy:    rand(-0.4, 0.4),
        r:     rand(0.5, 2),
        alpha: rand(0.05, 0.3),
        color: `rgba(${r},${g},${b},`,
      });
    }
  }

  function drawModalCanvas() {
    if (!modalCanvasActive) return;
    mCtx.clearRect(0, 0, mc.width, mc.height);
    mParts.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      if (p.x < 0 || p.x > mc.width)  p.vx *= -1;
      if (p.y < 0 || p.y > mc.height) p.vy *= -1;
      mCtx.beginPath();
      mCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      mCtx.fillStyle = p.color + p.alpha + ')';
      mCtx.fill();
    });
    modalCanvasRAF = requestAnimationFrame(drawModalCanvas);
  }

  window._spawnModalParticles = spawnModalParticles;
  window._drawModalCanvas     = drawModalCanvas;
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
  window._spawnModalParticles(d.color);

  cancelAnimationFrame(modalCanvasRAF);
  window._drawModalCanvas();

  // Animate in
  gsap.fromTo('#project-modal .modal-body',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
  );
}

function closeModal() {
  const modal = $('#project-modal');
  gsap.to('#project-modal .modal-body', {
    opacity: 0, y: -20, duration: 0.4, ease: 'power2.in',
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
        trigger: item,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
        onEnter()     { item.classList.add('active'); },
        onLeaveBack() { item.classList.remove('active'); },
      },
      opacity: 1, x: 0,
      duration: 0.8,
      delay: i * 0.1,
      ease: 'power3.out',
    });
  });
}

/* ════════════════════════════════════════
   10. CONTACT — FIELD PARTICLES
════════════════════════════════════════ */
function animContact() {
  gsap.to('#contact-console', {
    scrollTrigger: { trigger: '#contact', start: 'top 70%', toggleActions: 'play none none reverse' },
    opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
  });

  // Particle burst when field is focused
  $$('.field-input').forEach(inp => {
    inp.addEventListener('focus', () => emitFieldParticles(inp));
  });

  // Form submit
  $('#contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const btn = $('#console-submit');
    btn.querySelector('.submit-text').textContent = 'TRANSMITTED ✓';
    btn.style.borderColor = '#00e6ff';
    gsap.to(btn, { scale: 1.04, duration: 0.15, yoyo: true, repeat: 1 });
    setTimeout(() => {
      btn.querySelector('.submit-text').textContent = 'TRANSMIT →';
    }, 3000);
  });
}

function emitFieldParticles(inp) {
  const rect = inp.getBoundingClientRect();
  const container = inp.nextElementSibling;
  if (!container || !container.classList.contains('field-particles')) return;

  for (let i = 0; i < 8; i++) {
    const dot = document.createElement('div');
    const size = rand(2, 5);
    dot.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      background:rgba(0,230,255,0.7);
      border-radius:50%;
      left:${rand(0, 100)}%;
      bottom:0;
      pointer-events:none;
    `;
    container.appendChild(dot);
    gsap.to(dot, {
      y: rand(-25, -60),
      x: rand(-20, 20),
      opacity: 0,
      duration: rand(0.5, 1.0),
      ease: 'power2.out',
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
      if (target) lenis.scrollTo(target, { duration: 1.4, easing: t => 1 - Math.pow(1 - t, 4) });
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
      gsap.to(badge, {
        x: nx * -14, y: ny * -10,
        duration: 1.0, ease: 'power2.out',
      });
    }
    if (eyebrow) {
      gsap.to(eyebrow, {
        x: nx * 6,
        duration: 0.9, ease: 'power2.out',
      });
    }
  });
}

/* ════════════════════════════════════════
   RESIZE HANDLER
════════════════════════════════════════ */
window.addEventListener('resize', () => {
  ScrollTrigger.refresh();
});

/* ════════════════════════════════════════
   MASTER INIT
════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  initCursor();

  // Three.js started immediately so loader canvas isn't blank
  initThreeJS();

  // Start loader, then init everything else after it completes
  initLoader(() => {
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);

    // Init Lenis
    initLenis();

    // Start Three.js render loop
    threeLoop();

    // GSAP scroll animations
    initScrollAnimations();

    // Nav links
    initNavLinks();

    // Mouse parallax
    initParallax();

    // Kick hero into view
    animHero();
  });
});
