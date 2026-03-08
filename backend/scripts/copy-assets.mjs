import { mkdir, copyFile } from 'fs/promises';
import path from 'path';

const sourceDir = path.resolve(process.cwd(), 'src', 'assets');
const targetDir = path.resolve(process.cwd(), 'dist', 'assets');

async function run() {
  await mkdir(targetDir, { recursive: true });
  await Promise.all([
    copyFile(path.join(sourceDir, '3m.json'), path.join(targetDir, '3m.json')),
    copyFile(path.join(sourceDir, '5m.json'), path.join(targetDir, '5m.json')),
    copyFile(path.join(sourceDir, '15m.json'), path.join(targetDir, '15m.json')),
  ]);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
