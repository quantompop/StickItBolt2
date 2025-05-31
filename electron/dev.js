// Development script to launch Electron with Vite dev server
import { spawn } from 'child_process';
import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Launch Electron after a short delay to ensure Vite server is ready
setTimeout(() => {
  console.log('Starting Electron...');
  const proc = spawn(electron, [path.join(__dirname, 'main.js')], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_DEV: 'true'
    }
  });

  proc.on('close', (code) => {
    process.exit(code);
  });
}, 5000);