#!/usr/bin/env node
// Run: node scripts/gen-icons.js
// Generates placeholder SVG icons. Replace with real PNGs before production.

const fs = require('fs');
const path = require('path');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#06060e"/>
  <text x="96" y="120" font-family="Georgia, serif" font-size="72" font-weight="300"
    fill="#c9a84c" text-anchor="middle" dominant-baseline="middle">✦</text>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
console.log('SVG icon written to public/icon.svg');
console.log('NOTE: Convert to icon-192.png and icon-512.png for production');
console.log('Use: https://cloudconvert.com/svg-to-png');
