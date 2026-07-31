// Generate PWA icons (PNG) using a simple canvas approach
// Run: node generate-icons.js

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const sizes = [192, 512];
const colors = {
  bg: '#0f172a',
  accent: '#6366f1',
  text: '#ffffff',
};

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const padding = size * 0.12;
  const radius = size * 0.15;
  const w = size - padding * 2;
  const h = size - padding * 2;

  // Background rounded rect
  ctx.beginPath();
  ctx.moveTo(padding + radius, padding);
  ctx.lineTo(padding + w - radius, padding);
  ctx.quadraticCurveTo(padding + w, padding, padding + w, padding + radius);
  ctx.lineTo(padding + w, padding + h - radius);
  ctx.quadraticCurveTo(padding + w, padding + h, padding + w - radius, padding + h);
  ctx.lineTo(padding + radius, padding + h);
  ctx.quadraticCurveTo(padding, padding + h, padding, padding + h - radius);
  ctx.lineTo(padding, padding + radius);
  ctx.quadraticCurveTo(padding, padding, padding + radius, padding);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw "TF" text
  const fontSize = size * 0.45;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TF', size / 2, size / 2 + size * 0.02);

  // Draw a small clock icon arc
  const clockCenterX = size * 0.75;
  const clockCenterY = size * 0.75;
  const clockRadius = size * 0.12;
  ctx.beginPath();
  ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();

  // Clock hands
  const handLen = clockRadius * 0.6;
  ctx.beginPath();
  ctx.moveTo(clockCenterX, clockCenterY);
  ctx.lineTo(clockCenterX, clockCenterY - handLen);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(clockCenterX, clockCenterY);
  ctx.lineTo(clockCenterX + handLen * 0.6, clockCenterY);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

// Try to generate icons
try {
  sizes.forEach(s => {
    const buf = generateIcon(s);
    writeFileSync(`public/pwa-${s}x${s}.png`, buf);
    console.log(`Generated pwa-${s}x${s}.png`);
  });
} catch (e) {
  console.error('Canvas generation failed:', e.message);
  console.log('Creating placeholder SVG icons instead...');
  // Fallback: create SVG files
  sizes.forEach(s => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="${s}" height="${s}" rx="${s * 0.15}" fill="url(#g)"/>
      <text x="${s/2}" y="${s/2 + s*0.02}" font-family="Arial,sans-serif" font-size="${s*0.45}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">TF</text>
    </svg>`;
    writeFileSync(`public/pwa-${s}x${s}.svg`, svg);
    console.log(`Generated pwa-${s}x${s}.svg (fallback)`);
  });
}
