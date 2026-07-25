const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// 1. Standard SVG Icon (Hanger + Twinning Swatch + Atelier Seam)
const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3D3231"/>
      <stop offset="100%" stop-color="#231B1A"/>
    </linearGradient>
    <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4AF37"/>
      <stop offset="50%" stop-color="#B8935A"/>
      <stop offset="100%" stop-color="#8C6D3B"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Base App Tile Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="url(#brassGrad)" stroke-width="4" stroke-dasharray="12 8" opacity="0.6"/>

  <!-- Atelier Hanger Hook -->
  <g filter="url(#shadow)">
    <path d="M256 160 C256 112, 296 112, 296 150 C296 180, 256 185, 256 210" fill="none" stroke="url(#brassGrad)" stroke-width="18" stroke-linecap="round"/>
    <circle cx="256" cy="112" r="10" fill="url(#brassGrad)"/>

    <!-- Twinning Garment Silhouette / Hanger Body -->
    <path d="M120 280 L256 210 L392 280 Q410 290, 400 305 Q390 320, 368 310 L256 255 L144 310 Q122 320, 112 305 Q102 290, 120 280 Z" fill="url(#brassGrad)"/>

    <!-- Left Garment Swatch (Husband - Navy Slate) -->
    <path d="M152 295 L244 250 L244 410 Q180 415, 140 380 Z" fill="#1E293B" stroke="#B8935A" stroke-width="3"/>

    <!-- Right Garment Swatch (Wife - Dusk Mauve) -->
    <path d="M268 250 L360 295 L372 380 Q332 415, 268 410 Z" fill="#9C7A87" stroke="#B8935A" stroke-width="3"/>

    <!-- Center Gold Stitching Seam -->
    <line x1="256" y1="230" x2="256" y2="430" stroke="url(#brassGrad)" stroke-width="6" stroke-dasharray="8 6"/>
  </g>

  <!-- Brand Label Badge -->
  <rect x="176" y="434" width="160" height="32" rx="16" fill="#FAF8F5"/>
  <text x="256" y="455" font-family="Domine, serif" font-size="16" font-weight="bold" fill="#3D3231" text-anchor="middle" letter-spacing="1">ourCloset</text>
</svg>`;

// 2. Favicon Specific SVG (Compact & Crisp for Small Tabs)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="16" fill="#3D3231"/>
  <path d="M32 14 C32 8, 38 8, 38 13 C38 18, 32 19, 32 24" fill="none" stroke="#B8935A" stroke-width="3" stroke-linecap="round"/>
  <path d="M14 34 L32 24 L50 34 L32 29 Z" fill="#B8935A"/>
  <path d="M18 36 L30 30 L30 50 Z" fill="#1E293B" stroke="#B8935A" stroke-width="1"/>
  <path d="M34 30 L46 36 L46 50 Z" fill="#9C7A87" stroke="#B8935A" stroke-width="1"/>
  <line x1="32" y1="28" x2="32" y2="52" stroke="#B8935A" stroke-width="2" stroke-dasharray="2 2"/>
</svg>`;

// 3. Maskable Icon (Full bleed background for Android adaptive launcher icons)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#3D3231"/>
  <g transform="translate(32, 32) scale(0.875)">
    ${brandSvg.substring(brandSvg.indexOf('<defs>'), brandSvg.lastIndexOf('</svg>'))}
  </g>
</svg>`;

// Save SVG files
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconSvg); // SVG supported as favicon
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), brandSvg);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), maskableSvg);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), brandSvg);

console.log('Icon files generated successfully!');
