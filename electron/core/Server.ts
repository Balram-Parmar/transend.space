import https from 'https';
import { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fsPromises from 'fs/promises';
import fs from 'fs';
import { createReadStream } from 'fs';
import crypto from 'crypto';

import {
  constructorOptions,
  getCallback,
  fileInfo,
  sendMethods,
  sendCallback,
} from '../utils/types';

class Server {
  private port: number;
  private instance: https.Server;
  private getRoutes: Map<string, getCallback>;
  private idToFilePath: Map<string, fileInfo & { filePath: string }>;

  constructor({ port, keyPath, certPath }: constructorOptions) {
    this.port = port;
    this.getRoutes = new Map();
    this.idToFilePath = new Map();
    const option = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    this.instance = https.createServer(option, (req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'GET' && req.url?.startsWith('/download/')) {
        const id = req.url.slice(10);
        console.log(`Received ${req.method} request for file : ` + id);

        if (!this.idToFilePath.has(id)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found: Invalid download link.');
          return;
        }

        const fileData = this.idToFilePath.get(id)!;
        this.handleFileDownloadRequest(fileData, req, res);
      } else if (req.method === 'GET') {
        const cb = this.getRoutes.get(req.url as string);
        if (cb) cb(req, res);
      }
    });

    this.instance.listen(this.port, '0.0.0.0', () => {
      console.log(`server started at https://localhost:${this.port}`);
    });
  }

  private isValidPath(pathString: string) {
    try {
      new URL(pathString, 'http://localhost');
      return true;
    } catch (err) {
      return false;
    }
  }

  // Removed the explicit Promise constructor anti-pattern
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

  public req(
    method: sendMethods,
    url: string,
    headers: Record<string, string>,
    res: sendCallback,
    body?: string | Buffer,
  ) {
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
  ) {
    try {
      const safeFileName = encodeURIComponent(fileData.name);
      const fileSize = fileData.size;
      const filePath = fileData.filePath;
      const range = req.headers.range;

      if (range) {
        //check if range header is presend
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end || isNaN(start)) {
          res.writeHead(416, {
            'Content-Range': `bytes */${fileSize}`,
          });
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

        const fileStream = createReadStream(filePath, { start, end });
        fileStream.pipe(res);
      } else {
        //else send full file at once
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'application/octet-stream',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="${fileData.name}"; filename*=UTF-8''${safeFileName}`,
        });

        const fileStream = createReadStream(filePath);
        fileStream.pipe(res);
      }
    } catch (error: any) {
      console.error('File Server Error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    }
  }
}

export default Server;
