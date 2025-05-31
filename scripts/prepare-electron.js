// Script to prepare electron files for packaging
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Ensure dist-electron directory exists
const distElectronDir = path.join(projectRoot, 'dist-electron');
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
}

console.log('✅ Preparing Electron files for packaging...');

// Convert main.js to CommonJS format
const mainJsSource = path.join(projectRoot, 'electron', 'main.js');
const preloadJsSource = path.join(projectRoot, 'electron', 'preload.js');
const mainJsDest = path.join(distElectronDir, 'main.js');
const preloadJsDest = path.join(distElectronDir, 'preload.js');

// Create CommonJS version of main.js
console.log('📝 Converting main.js to CommonJS format...');
fs.copyFileSync(mainJsSource, mainJsDest);

// Create CommonJS version of preload.js
console.log('📝 Converting preload.js to CommonJS format...');
fs.copyFileSync(preloadJsSource, preloadJsDest);

console.log('✅ Electron files prepared successfully for packaging');