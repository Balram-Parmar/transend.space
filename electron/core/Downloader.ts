import EventEmitter from 'events';

import Server from './Server';

import { fileInfo } from '../utils/types';

import fs from 'fs/promises';

import path from 'path';

interface ActiveTransfer {
  fileName: string;

  fileSize: number;

  sessionBytesDownloaded: number;
}

type Range = { start: number; end: number };

class Downloader extends EventEmitter {
  private instance: Server;

  private activeTransfers: Map<string, ActiveTransfer>;

  constructor(serverInstance: Server) {
    super();

    this.instance = serverInstance;

    this.activeTransfers = new Map();
  }

  private *ranges(totalSize: number, chunk_size: number): Generator<Range, void, unknown> {
    let index = 0;

    while (index * chunk_size < totalSize) {
      yield {
        start: index * chunk_size,

        end: Math.min((index + 1) * chunk_size - 1, totalSize - 1),
      };

      index++;
    }
  }

  async downloadFile(info: fileInfo, savePath: string): Promise<void> {
    const CONCURRENCY = 16;

    const CHUNK_SIZE = 1024 * 1024;

    const fullPath = path.join(savePath, info.name);

    const parsedUrl = new URL(info.downloadLink);

    // parsedUrl.pathname will be "/download/4f20e08f1da0c0b8f0abe2c30d018601"

    const trackingKey = parsedUrl.pathname.replace('/download/', '');

    console.log(`trakingKey is ${trackingKey}`);

    const fd = await fs.open(fullPath, 'w');

    await fd.truncate(info.size);

    const rangeGenerator = this.ranges(info.size, CHUNK_SIZE);

    const worker = async () => {
      for (const range of rangeGenerator) {
        let attempts = 0;

        const maxRetries = 3;

        let success = false;

        while (attempts < maxRetries && !success) {
          try {
            await this.saveChunk(info, range.start, range.end, fd);

            success = true;
          } catch (err: unknown) {
            attempts++;

            const errorMessage = err instanceof Error ? err.message : String(err);

            console.warn(
              `Chunk ${range.start}-${range.end} failed (Attempt ${attempts}/${maxRetries}): ${errorMessage}`,
            );

            if (attempts >= maxRetries) {
              throw new Error(
                `Failed to download chunk ${range.start}-${range.end} after ${maxRetries} attempts.`,
              );
            }

            await new Promise((res) => setTimeout(res, 1000 * attempts));
          }
        }
      }
    };

    try {
      const workers = Array(CONCURRENCY)
        .fill(null)

        .map(() => worker());

      await Promise.all(workers);

      // FINAL EMIT: Log the completely finished transfer object

      console.log('\n--- DOWNLOAD COMPLETE ---');

      this.emit(
        'progress:download',

        trackingKey,

        this.activeTransfers.get(trackingKey),

        'downloading',
      );

      console.log(`Successfully saved to: ${fullPath}\n`);
    } catch (err) {
      console.error('Download failed entirely:', err);

      throw err;
    } finally {
      await fd.close();
    }
  }

  private saveChunk(info: fileInfo, start: number, end: number, fd: fs.FileHandle): Promise<void> {
    return new Promise((resolve, reject) => {
      let url = info.downloadLink;

      const parsedUrl = new URL(info.downloadLink);

      // parsedUrl.pathname will be "/download/4f20e08f1da0c0b8f0abe2c30d018601"

      const trackingKey = parsedUrl.pathname.replace('/download/', '');

      this.instance.req({
        method: 'GET',

        url: url,

        headers: { Range: `bytes=${start}-${end}` },

        res: async (res: any) => {
          if (res.statusCode !== 206 && res.statusCode !== 200) {
            return reject(new Error(`Expected 206 Partial Content, got ${res.statusCode}`));
          }

          // 1. Unconditionally initialize if we haven't seen this file yet

          if (!this.activeTransfers.has(trackingKey)) {
            this.activeTransfers.set(trackingKey, {
              fileName: info.name,

              fileSize: info.size,

              sessionBytesDownloaded: 0,
            });
          }

          const currentTransfer = this.activeTransfers.get(trackingKey) as ActiveTransfer;

          let position = start;

          try {
            for await (const chunk of res) {
              await fd.write(chunk, 0, chunk.length, position);

              position += chunk.length;

              // 2. High-Precision Tracking: Increment bytes exactly as they are written

              currentTransfer.sessionBytesDownloaded += chunk.length;
            }

            this.emit(
              'progress:download',

              trackingKey,

              this.activeTransfers.get(trackingKey),

              'downloading',
            );

            resolve();
          } catch (err) {
            reject(new Error(`Error saving range ${start} - ${end}: ${err}`));
          }
        },
      });
    });
  }
}

export default Downloader;
