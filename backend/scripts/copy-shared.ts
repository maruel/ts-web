import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination paths
const sourceDir = path.join(__dirname, '..', '..', 'shared');
const destDir = path.join(__dirname, '..', 'dist', 'shared');

// Function to copy files recursively
function copyRecursiveSync(src: string, dest: string): void {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats !== false && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Create destination directory
fs.mkdirSync(destDir, { recursive: true });

// Copy package.json
const packageJsonSrc = path.join(sourceDir, 'package.json');
const packageJsonDest = path.join(destDir, 'package.json');
fs.copyFileSync(packageJsonSrc, packageJsonDest);

// Copy dist contents
const distSrc = path.join(sourceDir, 'dist');
const distDest = path.join(destDir, 'src');

if (fs.existsSync(distSrc)) {
  copyRecursiveSync(distSrc, distDest);
  console.log('Shared files copied successfully!');
} else {
  console.error('Shared dist directory does not exist. Please build the shared package first.');
  process.exit(1);
}
