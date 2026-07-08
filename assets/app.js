/* =====================================================================
   LUIS FELIPE — Portafolio · app.js
   Fondo 3D propio sobre canvas 2D (cero dependencias): un NUDO TOROIDAL
   giratorio dibujado como línea con brillo, más un campo de polvo con
   paralaje. Paleta naranja + celeste. Identidad propia, distinta a Tikal.
   Extra: tema, idioma ES/EN, menú móvil y cambio de foto de perfil.
   ===================================================================== */
(() => {
  "use strict";

  const canvas = document.getElementById("cosmos");
  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const nav = document.getElementById("nav");

  let W = 0, H = 0, DPR = 1;
  let scrollFade = 1;
  const mouse = { x: 0, y: 0 };

  /* ---------- Colores desde las CSS variables ---------- */
  const ALPHA = 16;
  let sOrange = [], sCeleste = [], sText = [], sDust = [];
  let orangeRGB = "255,106,43", celesteRGB = "53,198,255";

  function hexToRGB(hex) {
    hex = hex.trim().replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const n = parseInt(hex, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  function ramp(rgb) {
    const out = [];
    for (let i = 0; i <= ALPHA; i++) out.push(`rgba(${rgb},${(i / ALPHA).toFixed(3)})`);
    return out;
  }
  function readTheme() {
    const cs = getComputedStyle(root);
    orangeRGB = hexToRGB(cs.getPropertyValue("--accent") || "#ff6a2b");
    celesteRGB = hexToRGB(cs.getPropertyValue("--accent-2") || "#35c6ff");
    const textRGB = hexToRGB(cs.getPropertyValue("--text") || "#f4f5f7");
    const dust = cs.getPropertyValue("--dust").trim() || "200,205,220";
    sOrange = ramp(orangeRGB);
    sCeleste = ramp(celesteRGB);
    sText = ramp(textRGB);
    sDust = ramp(dust);
  }
  const aIdx = a => Math.max(0, Math.min(ALPHA, Math.round(a * ALPHA)));

  /* ---------- Geometría: nudo toroidal (p,q) = (2,3) ---------- */
  const KN = 560;
  const knot = [];
  for (let i = 0; i < KN; i++) {
    const t = (i / KN) * Math.PI * 2;
    const p = 2, q = 3;
    const r = Math.cos(q * t) + 2.3;
    knot.push({
      x: r * Math.cos(p * t),
      y: r * Math.sin(p * t),
      z: -Math.sin(q * t) * 1.15,
      mix: 0.5 + 0.5 * Math.sin(q * t + 1.2)   // 0 celeste → 1 naranja
    });
  }

  /* ---------- Polvo con paralaje ---------- */
  const DUST = 150;
  const dust = [];
  for (let i = 0; i < DUST; i++) {
    dust.push({
      x: Math.random(), y: Math.random(),
      d: 0.25 + Math.random() * 0.75,
      warm: Math.random() < 0.35,             // algunos con tinte naranja
      ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 1.1
    });
  }

  const PERSPECTIVE = 3.4;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function mixStyle(mix, a) {
    // interpola naranja↔celeste con transparencia usando color explícito
    const o = orangeRGB.split(",").map(Number);
    const c = celesteRGB.split(",").map(Number);
    const r = Math.round(c[0] + (o[0] - c[0]) * mix);
    const g = Math.round(c[1] + (o[1] - c[1]) * mix);
    const b = Math.round(c[2] + (o[2] - c[2]) * mix);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  let ax = 0.4, ay = 0.2, lastT = 0;

  function frame(now) {
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    /* ----- polvo ----- */
    const drift = reduceMotion ? 0 : t * 5;
    for (const s of dust) {
      const px = ((s.x * W + drift * s.d + mouse.x * 26 * s.d) % (W + 40) + (W + 40)) % (W + 40) - 20;
      const py = s.y * H + mouse.y * 16 * s.d;
      const tw = reduceMotion ? 0.7 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      const a = Math.min(1, s.d * tw * 0.9);
      const size = s.d * 2 + 0.5;
      ctx.fillStyle = (s.warm ? sOrange : sDust)[aIdx(a)];
      ctx.fillRect(px, py, size, size);
    }

    /* ----- nudo toroidal ----- */
    if (!reduceMotion) { ax += dt * 0.12; ay += dt * 0.19; }
    else { ax += dt * 0.03; ay += dt * 0.05; }
    const cA = Math.cos(ax), sA = Math.sin(ax);
    const cB = Math.cos(ay), sB = Math.sin(ay);

    const raw = 1 - scrollFade;                 // 0 hero → 1 con scroll
    const pp = raw * raw * (3 - 2 * raw);
    const wide = W > 900;
    const R = Math.min(W, H) * (wide ? 0.165 : 0.15);
    const cx = wide ? W * (0.70 - 0.20 * pp) : W * 0.5;
    const cy = wide ? H * (0.52 + 0.02 * pp) : H * (0.40 + 0.05 * pp);
    const baseA = (wide ? 0.85 : 0.5) * (0.35 + 0.65 * scrollFade);

    const pts = new Array(KN);
    for (let i = 0; i < KN; i++) {
      const k = knot[i];
      // rotar en Y luego X
      let x = k.x * cB + k.z * sB;
      let z = -k.x * sB + k.z * cB;
      let y = k.y * cA - z * sA;
      z = k.y * sA + z * cA;
      const pers = PERSPECTIVE / (PERSPECTIVE - z);
      pts[i] = {
        sx: cx + x * R * pers,
        sy: cy + y * R * pers,
        depth: (z + 2) / 4,                     // ~0 atrás → ~1 frente
        w: pers,
        mix: k.mix
      };
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // pasada suave (glow) + núcleo
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < KN; i++) {
        const a = pts[i], b = pts[(i + 1) % KN];
        const depth = (a.depth + b.depth) / 2;
        const alpha = baseA * (0.06 + 0.94 * depth * depth) * (pass === 0 ? 0.35 : 1);
        if (alpha < 0.015) continue;
        ctx.strokeStyle = mixStyle(a.mix, alpha);
        ctx.lineWidth = (pass === 0 ? 5 : 1.6) * a.w * (0.5 + depth);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    }
    // nodos de acento celeste
    for (let i = 0; i < KN; i += 28) {
      const a = pts[i];
      const alpha = baseA * (0.2 + 0.8 * a.depth);
      const size = (1.6 + 2.2 * a.depth) * a.w;
      ctx.fillStyle = sCeleste[aIdx(Math.min(1, alpha))];
      ctx.fillRect(a.sx - size / 2, a.sy - size / 2, size, size);
    }

    requestAnimationFrame(frame);
  }

  /* ---------- Eventos ---------- */
  addEventListener("resize", resize, { passive: true });
  addEventListener("scroll", () => {
    scrollFade = Math.max(0, 1 - scrollY / (innerHeight * 0.85));
    nav.classList.toggle("scrolled", scrollY > 20);
  }, { passive: true });
  addEventListener("pointermove", e => {
    mouse.x = (e.clientX / W - 0.5) * 2;
    mouse.y = (e.clientY / H - 0.5) * 2;
  }, { passive: true });

  /* ---------- Tema claro/oscuro ---------- */
  const saved = localStorage.getItem("lf-theme");
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  document.getElementById("themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("lf-theme", root.dataset.theme);
    readTheme();
  });

  /* ---------- Banderas + idioma ---------- */
  const FLAG_GT =
    '<svg class="flag" viewBox="0 0 20 14" aria-hidden="true">' +
    '<defs><clipPath id="fgt"><rect width="20" height="14" rx="2.5"/></clipPath></defs>' +
    '<g clip-path="url(#fgt)"><rect width="20" height="14" fill="#4997D0"/>' +
    '<rect x="6.7" width="6.6" height="14" fill="#FCFCFC"/></g></svg>';
  const FLAG_US =
    '<svg class="flag" viewBox="0 0 20 14" aria-hidden="true">' +
    '<defs><clipPath id="fus"><rect width="20" height="14" rx="2.5"/></clipPath></defs>' +
    '<g clip-path="url(#fus)"><rect width="20" height="14" fill="#C8102E"/>' +
    '<g fill="#FCFCFC"><rect y="1.08" width="20" height="1.08"/><rect y="3.23" width="20" height="1.08"/>' +
    '<rect y="5.38" width="20" height="1.08"/><rect y="7.54" width="20" height="1.08"/>' +
    '<rect y="9.69" width="20" height="1.08"/><rect y="11.85" width="20" height="1.08"/></g>' +
    '<rect width="8.5" height="7.5" fill="#1F3D7A"/></g></svg>';
  const pageIsEs = (root.lang || "es").startsWith("es");
  const langLabel = pageIsEs ? FLAG_US + "<span>ENG</span>" : FLAG_GT + "<span>ESP</span>";

  /* ---------- Menú móvil discreto ---------- */
  const navAnchors = document.querySelectorAll(".nav-links a");
  if (navAnchors.length) {
    const actions = document.querySelector(".nav-actions");
    const menuBtn = document.createElement("button");
    menuBtn.className = "menu-toggle";
    menuBtn.setAttribute("aria-label", "Menú");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML =
      '<svg class="icon-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
      '<svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    actions.appendChild(menuBtn);

    const panel = document.createElement("nav");
    panel.className = "mobile-menu";
    panel.setAttribute("aria-label", "Menú móvil");
    navAnchors.forEach(a => panel.appendChild(a.cloneNode(true)));
    const contactLink = actions.querySelector("a.btn");
    if (contactLink) {
      const c = document.createElement("a");
      c.href = contactLink.getAttribute("href");
      c.textContent = contactLink.textContent.trim();
      panel.appendChild(c);
    }
    const langNav = actions.querySelector(".lang-toggle");
    if (langNav) {
      const l = document.createElement("a");
      l.href = langNav.getAttribute("href");
      l.setAttribute("hreflang", pageIsEs ? "en" : "es");
      l.innerHTML = langLabel;
      l.addEventListener("click", () => localStorage.setItem("lf-lang", pageIsEs ? "en" : "es"));
      panel.appendChild(l);
    }
    nav.after(panel);

    const setMenu = open => {
      menuBtn.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("open", open);
      nav.classList.toggle("menu-open", open);
    };
    menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
    panel.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
    addEventListener("resize", () => { if (innerWidth > 940) setMenu(false); }, { passive: true });
  }

  /* ---------- Idioma ES/EN ---------- */
  const LANG = (root.lang || "es").slice(0, 2);
  const ALT_HREF = root.dataset.altHref;
  const urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang === "es" || urlLang === "en") localStorage.setItem("lf-lang", urlLang);
  const langPref = localStorage.getItem("lf-lang");

  const langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.innerHTML = langLabel;
    langToggle.addEventListener("click", () => localStorage.setItem("lf-lang", LANG === "es" ? "en" : "es"));
  }

  if (langPref && langPref !== LANG && ALT_HREF) {
    location.replace(ALT_HREF);
  } else if (!langPref) {
    const ov = document.createElement("div");
    ov.className = "lang-overlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Selección de idioma / Language selection");
    ov.innerHTML =
      '<div>' +
      '<span class="brand-badge lg">LF</span>' +
      '<h2>LUIS FELIPE</h2>' +
      '<p>Elige tu idioma · Choose your language</p>' +
      '<div class="lang-actions">' +
      '<button class="btn btn-primary" id="pickEs" type="button">' + FLAG_GT + '<span>Español</span></button>' +
      '<button class="btn" id="pickEn" type="button">' + FLAG_US + '<span>English</span></button>' +
      '</div></div>';
    document.body.appendChild(ov);
    const pick = lang => {
      localStorage.setItem("lf-lang", lang);
      if (lang === LANG || !ALT_HREF) { ov.classList.add("hide"); setTimeout(() => ov.remove(), 500); }
      else location.replace(ALT_HREF);
    };
    ov.querySelector("#pickEs").addEventListener("click", () => pick("es"));
    ov.querySelector("#pickEn").addEventListener("click", () => pick("en"));
  }

  /* ---------- Revelado al hacer scroll ---------- */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  /* ---------- Foto de perfil ---------- */
  const portrait = document.getElementById("portrait");
  const photoInput = document.getElementById("photoInput");
  if (portrait) {
    const savedPhoto = localStorage.getItem("lf-photo");
    if (savedPhoto) portrait.src = savedPhoto;
    if (photoInput) {
      photoInput.addEventListener("change", () => {
        const file = photoInput.files && photoInput.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          portrait.src = String(reader.result);
          try { localStorage.setItem("lf-photo", String(reader.result)); } catch (_) {}
        };
        reader.readAsDataURL(file);
      });
    }
  }

  /* ---------- Arranque ---------- */
  readTheme();
  resize();
  scrollFade = Math.max(0, 1 - scrollY / (innerHeight * 0.85));
  nav.classList.toggle("scrolled", scrollY > 20);
  requestAnimationFrame(frame);
})();
