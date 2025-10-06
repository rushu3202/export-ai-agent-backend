// build-copy.js - Copy built frontend to dist folder
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, 'my-app', 'dist');
const targetPath = path.join(__dirname, 'dist');

// Remove old dist folder
if (fs.existsSync(targetPath)) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log('🗑️  Removed old dist folder');
}

// Copy new build
if (fs.existsSync(sourcePath)) {
  fs.cpSync(sourcePath, targetPath, { recursive: true });
  console.log('✅ Copied frontend build from my-app/dist to /dist');
} else {
  console.error('❌ Source path not found:', sourcePath);
  process.exit(1);
}
