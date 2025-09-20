// Standard library
import { execSync } from 'child_process';
import { createWriteStream, promises as fs, readdirSync, statSync } from 'fs';
import https from 'https';
import { dirname, extname, join } from 'path';

// Packages
import yauzl from 'yauzl';

const isWindows = process.platform === 'win32';

export const runCommand = (cmd: string) => {
  execSync(cmd, { stdio: 'inherit' });
};

export async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const doRequest = (url: string) => {
      https.get(url, { headers: { 'User-Agent': 'Node.js HTTPS client' } }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          doRequest(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        const file = createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', (err) => {
          fs.unlink(dest).catch(() => { }); // Ignore unlink errors
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };
    doRequest(url);
  });
}

export const extractZip = (zipPath: string, destDir: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', async (entry) => {
        try {
          if (/\/$/.test(entry.fileName)) {
            const dirPath = join(destDir, entry.fileName);
            await fs.mkdir(dirPath, { recursive: true });
            zipfile.readEntry();
          } else {
            const filePath = join(destDir, entry.fileName);
            const dirPath = dirname(filePath);
            await fs.mkdir(dirPath, { recursive: true });
            const readStream = await new Promise<fs.ReadStream>((resolve, reject) => {
              zipfile.openReadStream(entry, (err, stream) => {
                if (err) return reject(err);
                resolve(stream);
              });
            });
            const writeStream = createWriteStream(filePath, { mode: entry.externalFileAttributes >>> 16 });
            readStream.pipe(writeStream);
            await new Promise<void>((resolve, reject) => {
              writeStream.on('close', () => {
                if (!isWindows && (entry.externalFileAttributes >>> 16) & 0o111) {
                  fs.chmod(filePath, entry.externalFileAttributes >>> 16);
                }
                resolve();
              });
              writeStream.on('error', reject);
            });
            zipfile.readEntry();
          }
        } catch (error) {
          reject(error);
        }
      });
      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  });
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

export async function setupAvifenc() {
  try {
    execSync('avifenc --version', { stdio: 'ignore' });
    console.log('- avifenc was present in PATH');
    return;
  } catch { /* ignore */ }

  const avifencPath = join('rsc', 'libavif-bin', isWindows ? 'avifenc.exe' : 'avifenc');
  try {
    await fs.access(avifencPath);
    console.log(`- avifenc was found at ${avifencPath}`);
    process.env.PATH = `${join(process.cwd(), 'rsc', 'libavif-bin')}${isWindows ? ';' : ':'}${process.env.PATH}`;
    return;
  } catch { /* ignore */ }

  await fs.mkdir(join('rsc', 'libavif-bin'), { recursive: true });
  const artifact = process.platform === 'win32' ? 'windows-artifacts.zip' :
    process.platform === 'darwin' ? 'macOS-artifacts.zip' :
      'linux-artifacts.zip';
  const url = `https://github.com/AOMediaCodec/libavif/releases/download/v1.3.0/${artifact}`;
  await downloadFile(url, 'libavif.zip');
  await extractZip('libavif.zip', join('rsc', 'libavif-bin'));
  await fs.unlink('libavif.zip');
  console.log(`- avifenc was installed at ${avifencPath}`);
  process.env.PATH = `${join(process.cwd(), 'rsc', 'libavif-bin')}${isWindows ? ';' : ':'}${process.env.PATH}`;
}

export async function generateAvifImages(root: string) {
  console.log('- Generating AVIF images');
  getFilesRecursive(root, ['.jpeg', '.jpg', '.png']).forEach((file) => {
    const outputFile = file.substring(0, file.length - extname(file).length) + '.avif';
    try {
      if (statSync(outputFile).mtime > statSync(file).mtime) {
        return;
      }
      fs.unlink(outputFile);
    } catch { /* ignore */ }
    execSync(`avifenc "${file}" "${outputFile}"`, { stdio: 'ignore' });
  });
}

const dstDir = join(process.cwd(), 'assets');

await setupAvifenc();
await generateAvifImages(dstDir);
