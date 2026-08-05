/* =====================================================================
   LUIS FELIPE — Portafolio · app.js
   Tema claro/oscuro, idioma ES/EN, menú móvil, revelado al hacer scroll
   y cambio de foto de perfil. (Fondo animado retirado — pendiente rediseño.)
   ===================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  const nav = document.getElementById("nav");

  /* ---------- Fondo: relieve topográfico (marching squares) ----------
     Isolíneas de un campo escalar en movimiento lento. Dos curvas de
     acento en naranja/celeste; el resto en el color de trazo del tema.
     Muy tenue y quieto detrás del contenido; estático si reduce-motion. */
  (() => {
    const bg = document.getElementById("bg");
    if (!bg) return;
    const ctx = bg.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const hexToRGB = hex => {
      hex = (hex || "").trim().replace("#", "");
      if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
      const n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    let line = [210, 215, 228], orange = [255, 106, 43], celeste = [55, 198, 255];
    const readColors = () => {
      const cs = getComputedStyle(root);
      const d = (cs.getPropertyValue("--dust") || "").trim();
      if (d) line = d.split(",").map(Number);
      orange = hexToRGB(cs.getPropertyValue("--accent") || "#ff6a2b");
      celeste = hexToRGB(cs.getPropertyValue("--accent-2") || "#37c4ff");
    };

    const CELL = 40;                 // resolución del campo (px)
    let W = 0, H = 0, DPR = 1, cols = 0, rows = 0, gx = 0;
    let vals = new Float32Array(0);

    const resize = () => {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      bg.width = Math.floor(W * DPR);
      bg.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cols = Math.ceil(W / CELL) + 1;
      rows = Math.ceil(H / CELL) + 1;
      gx = cols + 1;
      vals = new Float32Array(gx * (rows + 1));
    };

    const NORM = 1 / 3.2;            // normaliza la suma de ondas a ~[-1,1]
    const computeField = t => {
      for (let j = 0; j <= rows; j++) {
        const y = j * CELL;
        for (let i = 0; i <= cols; i++) {
          const x = i * CELL;
          const v =
            Math.sin(x * 0.0060 + t * 0.16) +
            Math.sin(y * 0.0075 - t * 0.13) +
            Math.sin((x + y) * 0.0042 + t * 0.10) +
            0.8 * Math.sin(Math.hypot(x - W * 0.72, y - H * 0.30) * 0.0075 - t * 0.22);
          vals[i + j * gx] = v * NORM;
        }
      }
    };

    // marching squares: aristas a conectar por caso (T=0,R=1,B=2,L=3)
    const SEG = [
      [], [[0, 3]], [[0, 1]], [[3, 1]], [[1, 2]], [[0, 3], [1, 2]], [[0, 2]], [[3, 2]],
      [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[3, 1]], [[0, 1]], [[0, 3]], []
    ];
    const edge = (e, x, y, a, b, c, d, L) => {
      switch (e) {
        case 0: return [x + CELL * ((L - a) / (b - a || 1e-6)), y];
        case 1: return [x + CELL, y + CELL * ((L - b) / (c - b || 1e-6))];
        case 2: return [x + CELL * ((L - d) / (c - d || 1e-6)), y + CELL];
        default: return [x, y + CELL * ((L - a) / (d - a || 1e-6))];
      }
    };

    const LEVELS = 15;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let l = 0; l < LEVELS; l++) {
        const L = -0.95 + (1.9 * l) / (LEVELS - 1);
        const isO = l === 4, isC = l === 10;
        const col = isO ? orange : isC ? celeste : line;
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${isO || isC ? 0.17 : 0.09})`;
        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const a = vals[i + j * gx], b = vals[(i + 1) + j * gx];
            const c = vals[(i + 1) + (j + 1) * gx], d = vals[i + (j + 1) * gx];
            let cse = 0;
            if (a > L) cse |= 1; if (b > L) cse |= 2;
            if (c > L) cse |= 4; if (d > L) cse |= 8;
            const segs = SEG[cse];
            if (!segs.length) continue;
            const x = i * CELL, y = j * CELL;
            for (let s = 0; s < segs.length; s++) {
              const p0 = edge(segs[s][0], x, y, a, b, c, d, L);
              const p1 = edge(segs[s][1], x, y, a, b, c, d, L);
              ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
            }
          }
        }
        ctx.stroke();
      }
    };

    let raf = 0;
    const frame = now => { computeField(now / 1000); draw(); raf = requestAnimationFrame(frame); };
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    addEventListener("resize", () => { resize(); if (reduce) { computeField(8); draw(); } }, { passive: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (!reduce) start(); });
    addEventListener("lf-theme", readColors);

    readColors();
    resize();
    if (reduce) { computeField(8); draw(); } else start();
  })();

  /* ---------- Barra: estado al hacer scroll ---------- */
  addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", scrollY > 20);
  }, { passive: true });

  /* ---------- Tema claro/oscuro ---------- */
  const saved = localStorage.getItem("lf-theme");
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  document.getElementById("themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("lf-theme", root.dataset.theme);
    dispatchEvent(new Event("lf-theme"));
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

  // Si hay una preferencia guardada de otro idioma, redirige a su equivalente.
  // Sin preferencia, se muestra el idioma de la página (español en la raíz);
  // el visitante cambia con el botón ES/EN. Sin overlay bloqueante.
  if (langPref && langPref !== LANG && ALT_HREF) {
    location.replace(ALT_HREF);
  }

  /* ---------- Revelado al hacer scroll ---------- */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  /* ---------- Arranque ---------- */
  nav.classList.toggle("scrolled", scrollY > 20);
})();
