import https from 'https';
import { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fsPromises from 'fs/promises';
import fs from 'fs';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { EventEmitter } from 'node:events';

import {
  constructorOptions,
  getCallback,
  fileInfo,
  ReqOptions,
  ProgressData,
} from '../utils/types';

// Define a type for the active transfer data
export interface ActiveTransfer {
  fileName: string;
  fileSize: number;
  sessionBytesDownloaded: number; // Tracks actual bytes pushed by the server
  activeConnections: number; // Prevents premature deletion on concurrent chunks
}

class Server extends EventEmitter {
  private port: number;
  private instance: https.Server;
  private getRoutes: Map<string, getCallback>;
  private postRoutes: Map<string, getCallback>;
  private idToFilePath: Map<string, fileInfo & { filePath: string }>;
  private chunkSize: number;

  // 1. Added activeTransfers Map
  private activeTransfers: Map<string, ActiveTransfer>;

  constructor({ port, keyString, certString, chunkSize }: constructorOptions) {
    super();
    this.port = port;
    this.getRoutes = new Map();
    this.postRoutes = new Map();
    this.idToFilePath = new Map();
    this.chunkSize = chunkSize ? chunkSize : 65536;

    // 2. Initialize activeTransfers Map
    this.activeTransfers = new Map();

    const option = { key: keyString, cert: certString };

    this.instance = https.createServer(option, (req: IncomingMessage, res: ServerResponse) => {
      // Handle File Downloads
      if (req.method === 'GET' && req.url?.startsWith('/download/')) {
        const id = req.url.slice(10);
        console.log(`Received ${req.method} request for file : ` + id);

        if (!this.idToFilePath.has(id)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found: Invalid download link.');
          return;
        }

        const fileData = this.idToFilePath.get(id)!;
        this.handleFileDownloadRequest(fileData, req, res, id);
      }
      // Handle GET Routes
      else if (req.method === 'GET') {
        const cb = this.getRoutes.get(req.url as string);
        if (cb) {
          cb(req, res);
        } else {
          this.sendNotFound(res);
        }
      }
      // Handle POST Routes
      else if (req.method === 'POST') {
        const cb = this.postRoutes.get(req.url as string);
        if (cb) {
          cb(req, res);
        } else {
          this.sendNotFound(res);
        }
      }
    });

    this.instance.listen(this.port, '0.0.0.0', () => {
      console.log(`server started at https://localhost:${this.port}`);
    });
  }

  private sendNotFound(res: ServerResponse) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end("sorry but it won't work if you are trying to hack it");
  }

  private isValidPath(pathString: string) {
    try {
      new URL(pathString, 'http://localhost');
      return true;
    } catch (err) {
      return false;
    }
  }

  public async getFileInfo(filePath: string): Promise<fileInfo> {
    const data = await fsPromises.stat(filePath);

    if (!data.isFile()) {
      throw new Error('The given path is an invalid file! ' + filePath);
    }

    const fileSize = data.size;
    const fileName = path.basename(filePath);
    const id = crypto.randomBytes(16).toString('hex');
    const downloadLink = `/download/${id}`;

    this.idToFilePath.set(id, {
      name: fileName,
      size: fileSize,
      filePath: filePath,
      downloadLink: downloadLink,
    });

    return { name: fileName, size: fileSize, downloadLink: downloadLink };
  }

  public get(pathString: string, cb: getCallback) {
    if (!this.isValidPath(pathString)) throw new Error('Not a valid path: ' + pathString);
    this.getRoutes.set(pathString, cb);
  }

  public post(pathString: string, cb: getCallback) {
    if (!this.isValidPath(pathString)) throw new Error('Not a valid path: ' + pathString);
    this.postRoutes.set(pathString, cb);
  }

  public req({ method, url, res, headers, body }: ReqOptions) {
    if (!URL.canParse(url)) {
      console.log('invalid Url to send request to ' + url);
      throw new Error('failed to parse the url ');
    }

    const urlObj = new URL(url);

    const options = {
      method: method,
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      headers: headers,
      rejectUnauthorized: false,
    };

    const ClientRequest = https.request(options, res);

    ClientRequest.on('error', (err) => {
      console.error('Request failed:', err.message);
    });

    if (body) {
      ClientRequest.write(body);
    }
    ClientRequest.end();
  }

  private handleFileDownloadRequest(
    fileData: fileInfo & { filePath: string },
    req: IncomingMessage,
    res: ServerResponse,
    id: string,
  ) {
    try {
      const safeFileName = encodeURIComponent(fileData.name);
      const fileSize = fileData.size;
      const filePath = fileData.filePath;
      const range = req.headers.range;

      let fileStream;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end || isNaN(start)) {
          res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
          return res.end();
        }

        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileData.name}"; filename*=UTF-8''${safeFileName}`,
        });

        fileStream = createReadStream(filePath, { highWaterMark: this.chunkSize, start, end });
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'application/octet-stream',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="${fileData.name}"; filename*=UTF-8''${safeFileName}`,
        });

        fileStream = createReadStream(filePath, { highWaterMark: this.chunkSize });
      }

      // --- NEW TRACKING LOGIC ---

      // 1. Get existing transfer, or create a new one starting at 0
      let transfer = this.activeTransfers.get(id);
      if (!transfer) {
        transfer = {
          fileName: fileData.name,
          fileSize: fileSize,
          sessionBytesDownloaded: 0, // Starts at 0, strictly tracking data moving through the pipe
          activeConnections: 0,
        };
        this.activeTransfers.set(id, transfer);
      }

      // 2. Increment active connection count (handles Download Managers splitting files)
      transfer.activeConnections += 1;

      // 3. Pipe the stream
      fileStream.pipe(res);

      // 4. Update ONLY the actual bytes passing through
      fileStream.on('data', (chunk) => {
        // Re-fetch in case it was somehow deleted
        const currentTransfer = this.activeTransfers.get(id);
        if (currentTransfer) {
          currentTransfer.sessionBytesDownloaded += chunk.length;
          this.emit('progress', id, currentTransfer);
        }
      });

      // 5. Safe cleanup
      res.on('close', () => {
        const currentTransfer = this.activeTransfers.get(id);
        if (currentTransfer) {
          currentTransfer.activeConnections -= 1;

          // Only delete from map if ALL concurrent chunks/connections are done
          if (currentTransfer.activeConnections <= 0) {
            this.activeTransfers.delete(id);
          }
        }
      });
    } catch (error: any) {
      console.error('File Server Error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }

      // Emergency cleanup for this connection
      const currentTransfer = this.activeTransfers.get(id);
      if (currentTransfer) {
        currentTransfer.activeConnections -= 1;
        if (currentTransfer.activeConnections <= 0) {
          this.activeTransfers.delete(id);
        }
      }
    }
  }
}

export default Server;
