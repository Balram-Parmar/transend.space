import { IncomingMessage, ServerResponse } from 'http';

type constructorOptions = {
  port: number;
  keyPath: string;
  certPath: string;
};

type getCallback = (req: IncomingMessage, res: ServerResponse) => void;

type fileInfo = {
  name: string;
  size: number;
  downloadLink: string;
};

export type { constructorOptions, getCallback, fileInfo };
