import { readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'public', 'temp');
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function cleanupTempFiles() {
  try {
    const files = await readdir(TEMP_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = join(TEMP_DIR, file);
      const stats = await stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > MAX_AGE) {
        await unlink(filePath).catch(console.error);
        console.log(`Deleted old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
} 