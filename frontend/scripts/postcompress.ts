// Standard library
import { execSync } from 'child_process';
import { promises as fs, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';

export const runCommand = (cmd: string) => {
  execSync(cmd, { stdio: 'inherit' });
};

const getFilesRecursive = (dir: string, extensions: string[]) => {
  let results: string[] = [];
  readdirSync(dir).forEach((file) => {
    file = join(dir, file);
    try {
      const stat = statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursive(file, extensions));
      } else if (extensions.some(ext => extname(file).toLowerCase() === ext.toLowerCase())) {
        results.push(file);
      }
    } catch { /* ignore */ }
  });
  return results;
};

export const deleteFilesByExtension = (dir: string, extensions: string[]) => {
  getFilesRecursive(dir, extensions).forEach((file) => {
    fs.unlink(file);
  });
};

export async function postcompressFiles(root: string) {
  deleteFilesByExtension(root, ['.gz', '.br', '.zst']);
  getFilesRecursive(root, ['.js', '.css', '.html', '.json']).forEach((file) => {
    runCommand(`gzip -9 -k "${file}"`);
    // sudo apt install brotli
    runCommand(`brotli --best --keep "${file}"`);
    // sudo apt install zstd
    runCommand(`zstd -19 --keep --no-progress -q "${file}"`);
  });
}

const dstDir = join(process.cwd(), '..', 'backend', 'public');
await postcompressFiles(dstDir);
