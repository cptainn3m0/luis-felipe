# Luis Felipe — Portafolio

Portafolio personal de Felix Luis Felipe Chávez Ramírez. Sitio estático bilingüe
(ES/EN), sin dependencias ni build: HTML + CSS + JS puros. El fondo es un relieve
topográfico animado (isolíneas por *marching squares* sobre un campo escalar en
movimiento) dibujado en `<canvas>`; se detiene con `prefers-reduced-motion`.

Nace del ecosistema de **Tikal Solutions** y comparte su lenguaje visual.

## Estructura

```
luis-felipe/
├── index.html         # Portafolio (español)
├── en/index.html      # Portafolio (inglés)
├── assets/
│   ├── styles.css     # Estilos (tema claro/oscuro; Sora · Inter · JetBrains Mono)
│   ├── app.js         # Fondo topográfico + tema + idioma ESP/ENG + cambio de foto
│   └── img/
│       └── luis.jpg   # Foto de perfil (placeholder — reemplázala por la tuya)
└── README.md
```

## Tu fotografía

Hay dos formas de poner tu foto:

1. **Definitiva (recomendada):** reemplaza el archivo `assets/img/luis.jpg` por tu
   fotografía (ideal en vertical, proporción 4:5). Así la ven todos los visitantes.
2. **Rápida / previsualización:** en el sitio, pasa el cursor sobre la foto y pulsa
   **«Cambiar foto»**. Se guarda en tu navegador (localStorage) — útil para probar,
   pero solo la ves tú en ese dispositivo.

## Ver en local

Doble clic en `index.html`, o con servidor local:

```bash
cd ~/Desktop/DevOps/luis-felipe
python3 -m http.server 8000
```

y abre <http://localhost:8000>.

## Idiomas

En la primera visita aparece un overlay para elegir Español o English; la elección
se guarda y se respeta en visitas futuras. El botón **ES/EN** del nav cambia de idioma
en cualquier momento. También puedes forzar el idioma con `?lang=es` o `?lang=en`.

## Publicar

Sitio estático puro: arrástralo a Vercel, Netlify o GitHub Pages y queda en línea
sin configuración.
