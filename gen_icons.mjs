// Regenerate PWA icon PNGs with solid purple background (no transparent corners)
// iOS/iPadOS applies its own squircle mask, so the PNG should be full-bleed square.

import sharp from "sharp";

const svgTemplate = (size) => {
  const s = size / 200; // scale factor from original 200x200
  const r = (v) => Math.round(v * s * 10) / 10;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3C3489"/>
      <stop offset="100%" stop-color="#26215C"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7F77DD" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#7F77DD" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Full-bleed background: no rx so corners are solid purple, not transparent -->
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#bg)"/>
  <ellipse cx="${r(100)}" cy="${r(100)}" rx="${r(80)}" ry="${r(80)}" fill="url(#glow)"/>
  <circle cx="${r(100)}" cy="${r(100)}" r="${r(12)}" fill="#EEEDFE" opacity="0.95"/>
  <circle cx="${r(100)}" cy="${r(100)}" r="${r(30)}" fill="none" stroke="#AFA9EC" stroke-width="${r(3.5)}" opacity="0.85"/>
  <circle cx="${r(100)}" cy="${r(100)}" r="${r(52)}" fill="none" stroke="#7F77DD" stroke-width="${r(2.5)}" opacity="0.65"/>
  <circle cx="${r(100)}" cy="${r(100)}" r="${r(74)}" fill="none" stroke="#534AB7" stroke-width="${r(1.5)}" opacity="0.45"/>
  <circle cx="${r(100)}" cy="${r(100)}" r="${r(94)}" fill="none" stroke="#3C3489" stroke-width="${r(1)}" opacity="0.3"/>
</svg>`;
};

const files = [
  { path: "public/icon-192.png",        size: 192 },
  { path: "public/icon-512.png",        size: 512 },
  { path: "public/apple-touch-icon.png", size: 180 },
];

for (const { path, size } of files) {
  await sharp(Buffer.from(svgTemplate(size))).png().toFile(path);
  console.log(`✓ ${path} (${size}x${size})`);
}
