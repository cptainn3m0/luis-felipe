/* =====================================================================
   LUIS FELIPE — Portafolio · app.js
   Motor 3D propio sobre canvas 2D (cero dependencias) + interacciones.
   Capa 1: campo de estrellas con parpadeo y paralaje.
   Capa 2: planeta de puntos con anillo y rotación horaria automática
           (solo cuando <body data-planet="on">).
   Extra: cambio de foto de perfil (FileReader + localStorage).
   ===================================================================== */
(() => {
  "use strict";

  const canvas = document.getElementById("cosmos");
  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wantPlanet = document.body.dataset.planet === "on";

  let W = 0, H = 0, DPR = 1;
  let scrollFade = 1; // el planeta se desvanece al salir del hero
  const mouse = { x: 0, y: 0 };

  /* ---------- Tema: lee colores desde las CSS variables ---------- */
  let starRGB = "205,214,255", dotRGB = "233,237,247", accentRGB = "91,132,255";
  const ALPHA_LEVELS = 14;
  let starStyles = [], dotStyles = [], accentStyles = [];

  function hexToRGB(hex) {
    hex = hex.trim().replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const n = parseInt(hex, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  function buildStyles(rgb) {
    const out = [];
    for (let i = 0; i <= ALPHA_LEVELS; i++) out.push(`rgba(${rgb},${(i / ALPHA_LEVELS).toFixed(3)})`);
    return out;
  }
  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    starRGB = cs.getPropertyValue("--star").trim() || starRGB;
    dotRGB = cs.getPropertyValue("--dot").trim() || dotRGB;
    const accent = cs.getPropertyValue("--accent").trim();
    if (accent) accentRGB = hexToRGB(accent);
    starStyles = buildStyles(starRGB);
    dotStyles = buildStyles(dotRGB);
    accentStyles = buildStyles(accentRGB);
  }

  /* ---------- Capa de estrellas ---------- */
  const STAR_COUNT = 340;
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      d: 0.3 + Math.random() * 0.7,     // profundidad: tamaño, brillo y paralaje
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.6,
      bright: Math.random() > 0.9       // las más brillantes destellan en cruz
    });
  }

  /* ---------- Planeta de puntos (esfera de Fibonacci) ---------- */
  const PLANET_POINTS = 2400;
  const planet = [];
  if (wantPlanet) {
    const GA = Math.PI * (3 - Math.sqrt(5)); // ángulo áureo
    for (let i = 0; i < PLANET_POINTS; i++) {
      const y = 1 - (i / (PLANET_POINTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = GA * i;
      planet.push({
        x: Math.cos(t) * r, y, z: Math.sin(t) * r,
        s: 0.7 + Math.random() * 0.9,
        accent: Math.random() < 0.16
      });
    }
  }

  /* ---------- Anillo orbital de puntos ---------- */
  const RING_POINTS = 200;
  const ring = [];
  if (wantPlanet) {
    for (let i = 0; i < RING_POINTS; i++) {
      const a = (i / RING_POINTS) * Math.PI * 2;
      const rr = 1.55 + Math.random() * 0.22;
      ring.push({ x: Math.cos(a) * rr, y: 0, z: Math.sin(a) * rr, s: 0.5 + Math.random() * 0.7 });
    }
  }

  const TILT = -0.38; // inclinación del eje, estilo planetario
  const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  const PERSPECTIVE = 3.2;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function alphaIdx(a) {
    return Math.max(0, Math.min(ALPHA_LEVELS, Math.round(a * ALPHA_LEVELS)));
  }

  let theta = 0, lastT = 0;

  function frame(now) {
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;
    const t = now / 1000;

    ctx.clearRect(0, 0, W, H);

    /* ----- estrellas: deriva lenta + paralaje del mouse + parpadeo ----- */
    const drift = reduceMotion ? 0 : t * 6;
    for (const s of stars) {
      const px = ((s.x * W + drift * s.d + mouse.x * 22 * s.d) % (W + 40) + (W + 40)) % (W + 40) - 20;
      const py = s.y * H + mouse.y * 14 * s.d;
      // Ciclo completo de brillo: apagado total → destello máximo → apagado
      const tw = reduceMotion ? 0.9 : 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const pulse = tw * tw;                 // acentúa el pico y prolonga el apagón
      const a = Math.min(1, pulse * (0.5 + s.d));
      if (a > 0.02) {
        const size = (s.d * 2.6 + 0.8) * (0.65 + 0.55 * pulse); // crece al brillar
        ctx.fillStyle = starStyles[alphaIdx(a)];
        ctx.fillRect(px, py, size, size);
        if (s.bright && pulse > 0.62) {      // destello en cruz en el pico
          const g = (pulse - 0.62) / 0.38;
          ctx.fillStyle = starStyles[alphaIdx(Math.min(1, a * g))];
          ctx.fillRect(px - 8 * g, py + size / 2 - 0.75, 16 * g + size, 1.5);
          ctx.fillRect(px + size / 2 - 0.75, py - 8 * g, 1.5, 16 * g + size);
        }
      }
    }

    /* ----- planeta: rotación horaria automática ----- */
    if (wantPlanet) {
      if (!reduceMotion) theta -= dt * 0.22; else theta -= dt * 0.05;
      const cosR = Math.cos(theta), sinR = Math.sin(theta);

      // En el hero vive a la derecha con brillo pleno; al hacer scroll se
      // desliza al centro del fondo y se atenúa, sin desaparecer.
      const raw = 1 - scrollFade;               // 0 en el hero → 1 con scroll
      const p = raw * raw * (3 - 2 * raw);      // suavizado (smoothstep)
      const wide = W > 900;
      const R = Math.min(W, H) * (wide ? 0.28 : 0.34);
      const cx = wide ? W * (0.74 - 0.24 * p) : W * 0.5;
      const cy = wide ? H * (0.52 + 0.03 * p) : H * (0.62 - 0.10 * p);
      const baseAlpha = wide ? (1 - 0.72 * p) : (0.22 - 0.08 * p);

      const ringFront = [], ringBack = [];
      const ringSpin = theta * 0.4;
      const cosRS = Math.cos(ringSpin), sinRS = Math.sin(ringSpin);
      for (const p of ring) {
        const x = p.x * cosRS + p.z * sinRS;
        const z = -p.x * sinRS + p.z * cosRS;
        const x2 = x * cosT - p.y * sinT;
        const y2 = x * sinT + p.y * cosT;
        (z < 0 ? ringBack : ringFront).push([x2, y2, z, p.s]);
      }
      const drawPts = (list, styles, mult) => {
        for (const [x, y, z, s] of list) {
          const pers = PERSPECTIVE / (PERSPECTIVE - z);
          const sx = cx + x * R * pers;
          const sy = cy + y * R * pers;
          const depth = (z + 1) / 2;
          const a = baseAlpha * mult * (0.22 + 0.78 * depth);
          const size = s * pers * (0.9 + depth * 0.9);
          ctx.fillStyle = styles[alphaIdx(a)];
          ctx.fillRect(sx, sy, size, size);
        }
      };
      drawPts(ringBack, accentStyles, 0.55);

      for (const p of planet) {
        const x = p.x * cosR + p.z * sinR;
        const z = -p.x * sinR + p.z * cosR;
        const x2 = x * cosT - p.y * sinT;
        const y2 = x * sinT + p.y * cosT;
        const pers = PERSPECTIVE / (PERSPECTIVE - z);
        const sx = cx + x2 * R * pers;
        const sy = cy + y2 * R * pers;
        const depth = (z + 1) / 2;
        const a = baseAlpha * (0.10 + 0.90 * depth * depth);
        const size = p.s * pers * (0.8 + depth);
        ctx.fillStyle = (p.accent ? accentStyles : dotStyles)[alphaIdx(a)];
        ctx.fillRect(sx, sy, size, size);
      }

      drawPts(ringFront, accentStyles, 1);
    }

    requestAnimationFrame(frame);
  }

  /* ---------- Eventos ---------- */
  const nav = document.getElementById("nav");
  addEventListener("resize", resize, { passive: true });
  addEventListener("scroll", () => {
    scrollFade = Math.max(0, 1 - scrollY / (innerHeight * 0.85));
    nav.classList.toggle("scrolled", scrollY > 20);
  }, { passive: true });
  addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / W - 0.5) * 2;
    mouse.y = (e.clientY / H - 0.5) * 2;
  }, { passive: true });

  /* ---------- Tema claro/oscuro ---------- */
  const root = document.documentElement;
  const saved = localStorage.getItem("tikal-theme");
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  document.getElementById("themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("tikal-theme", root.dataset.theme);
    readTheme();
  });

  /* ---------- Revelado al hacer scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  /* ---------- Banderas para el selector de idioma ---------- */
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
  // Etiqueta del idioma DESTINO: bandera + código corto (igual en desktop y móvil)
  const langLabel = pageIsEs
    ? FLAG_US + "<span>ENG</span>"
    : FLAG_GT + "<span>ESP</span>";

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
    actions.appendChild(menuBtn); // a la derecha del botón Contacto

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
    // Selector de idioma dentro del menú (en el nav se oculta en móvil)
    const langNav = actions.querySelector(".lang-toggle");
    if (langNav) {
      const l = document.createElement("a");
      l.href = langNav.getAttribute("href");
      l.setAttribute("hreflang", pageIsEs ? "en" : "es");
      l.innerHTML = langLabel;
      l.addEventListener("click", () => {
        localStorage.setItem("tikal-lang", pageIsEs ? "en" : "es");
      });
      panel.appendChild(l);
    }
    nav.after(panel);

    const setMenu = (open) => {
      menuBtn.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("open", open);
      nav.classList.toggle("menu-open", open);
    };
    menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
    panel.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    addEventListener("resize", () => { if (innerWidth > 940) setMenu(false); }, { passive: true });
  }

  /* ---------- Idioma ESP/ENG ---------- */
  // Cada página declara su equivalente en el otro idioma:
  // <html lang="es" data-alt-href="en/index.html">
  const LANG = (root.lang || "es").slice(0, 2);
  const ALT_HREF = root.dataset.altHref;
  // ?lang=es|en en la URL fija el idioma y omite el overlay (enlaces compartibles)
  const urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang === "es" || urlLang === "en") localStorage.setItem("tikal-lang", urlLang);
  const langPref = localStorage.getItem("tikal-lang");

  const langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.innerHTML = langLabel; // bandera + nombre del idioma destino
    langToggle.addEventListener("click", () => {
      localStorage.setItem("tikal-lang", LANG === "es" ? "en" : "es");
      // la navegación sigue el href del enlace
    });
  }

  if (langPref && langPref !== LANG && ALT_HREF) {
    location.replace(ALT_HREF);
  } else if (!langPref) {
    // Primera visita: overlay para elegir idioma
    const ov = document.createElement("div");
    ov.className = "lang-overlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Selección de idioma / Language selection");
    ov.innerHTML =
      '<div>' +
      '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">' +
      '<circle cx="16" cy="18" r="7" fill="var(--accent)"/>' +
      '<circle cx="26" cy="7" r="2.2" fill="var(--text)"/>' +
      '<circle cx="6" cy="10" r="1.6" fill="var(--text)"/>' +
      '<circle cx="27" cy="26" r="1.4" fill="var(--text)"/></svg>' +
      '<h2>LUIS FELIPE</h2>' +
      '<p>Elige tu idioma · Choose your language</p>' +
      '<div class="lang-actions">' +
      '<button class="btn btn-primary" id="pickEs" type="button">' + FLAG_GT + '<span>Español</span></button>' +
      '<button class="btn" id="pickEn" type="button">' + FLAG_US + '<span>English</span></button>' +
      '</div></div>';
    document.body.appendChild(ov);
    const pick = (lang) => {
      localStorage.setItem("tikal-lang", lang);
      if (lang === LANG || !ALT_HREF) {
        ov.classList.add("hide");
        setTimeout(() => ov.remove(), 500);
      } else {
        location.replace(ALT_HREF);
      }
    };
    ov.querySelector("#pickEs").addEventListener("click", () => pick("es"));
    ov.querySelector("#pickEn").addEventListener("click", () => pick("en"));
  }

  /* ---------- Formulario de contacto (mailto:) ---------- */
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const nombre = (data.get("nombre") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const empresa = (data.get("empresa") || "").toString().trim();
      const tipo = (data.get("tipo") || "").toString();
      const mensaje = (data.get("mensaje") || "").toString().trim();

      const en = LANG === "en";
      const subject = `${en ? "Contact from portfolio" : "Contacto desde el portafolio"} — ${nombre}${empresa ? " (" + empresa + ")" : ""}`;
      const body =
        `${en ? "Name" : "Nombre"}: ${nombre}\n` +
        `Email: ${email}\n` +
        (empresa ? `${en ? "Company" : "Empresa"}: ${empresa}\n` : "") +
        `${en ? "Project type" : "Tipo de proyecto"}: ${tipo}\n\n` +
        `${mensaje}\n`;

      location.href = `mailto:cptain3m0@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const status = document.getElementById("formStatus");
      if (status) status.textContent = en
        ? "Opening your email app with the message ready to send…"
        : "Abriendo tu aplicación de correo con el mensaje listo para enviar…";
    });
  }

  /* ---------- Foto de perfil: cambiar/subir ----------
     La foto pública se sirve desde assets/img/luis.jpg (reemplázala por la
     tuya). El botón "Cambiar foto" permite previsualizar y guardar una imagen
     localmente (FileReader → localStorage), sin backend. */
  const portrait = document.getElementById("portrait");
  const photoInput = document.getElementById("photoInput");
  if (portrait) {
    const saved = localStorage.getItem("lf-photo");
    if (saved) portrait.src = saved;
    if (photoInput) {
      photoInput.addEventListener("change", () => {
        const file = photoInput.files && photoInput.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result);
          portrait.src = url;
          try { localStorage.setItem("lf-photo", url); } catch (_) {}
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
