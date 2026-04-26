import Server from './Server';
import { fileInfo } from '../utils/types';
import fs from 'fs/promises';
import path from 'path';

class Downloader {
  private instance: Server;

  constructor(serverInstance: Server) {
    this.instance = serverInstance;
  }

  private *ranges(totalSize: number, chunk_size: number) {
    let index = 0;

    while (index * chunk_size < totalSize) {
      yield {
        start: index * chunk_size,
        end: Math.min((index + 1) * chunk_size - 1, totalSize - 1),
      };
      index++;
    }
    return;
  }

  async downloadFile(info: fileInfo, savePath: string): Promise<void> {
    const CONCURRENCY = 16;
    const CHUNK_SIZE = 1024 * 1024;
    const fullPath = path.join(savePath, info.name);

    const fileHandle = await fs.open(fullPath, 'w');
    await fileHandle.truncate(info.size);

    const fd = await fs.open(fullPath, 'r+');
    await fileHandle.close();

    const rangeGenerator = this.ranges(info.size, CHUNK_SIZE);

    const worker = async () => {
      for (const range of rangeGenerator) {
        try {
          await this.saveChunk(info.downloadLink, range.start, range.end, fd);
        } catch (err: any) {
          console.error(`Download failed for ${range.start}-${range.end}:`, err.message);
        }
      }
    };

    const workers = Array(CONCURRENCY).fill(null).map(worker);
    await Promise.all(workers);

    await fd.close();
    console.log('All downloads complete!');
  }

  private saveChunk(url: string, start: number, end: number, fd: fs.FileHandle): Promise<void> {
    return new Promise((resolve, reject) => {
      this.instance.req('GET', url, { Range: `bytes=${start}-${end}` }, async (res) => {
        if (res.statusCode !== 206) {
          // Reject the promise instead of throwing
          return reject(new Error(`Expected 206 got ${res.statusCode}`));
        }

        let position = start;

        try {
          for await (const chunk of res) {
            await fd.write(chunk, 0, chunk.length, position);
            position += chunk.length;
          }
          resolve(); // Promise finishes only when the whole chunk is written
        } catch (err) {
          reject(new Error(`Error saving range ${start}-${end}: ${err}`));
        }
      });
    });
  }
}
export default Downloader;
