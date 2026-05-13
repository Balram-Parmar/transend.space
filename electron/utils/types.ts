import { ClientRequest, IncomingMessage, ServerResponse } from 'http';

type constructorOptions = {
  port: number;
  keyString: string;
  certString: string;
  chunkSize?: number;
};

type getCallback = (req: IncomingMessage, res: ServerResponse) => void;
type sendCallback = (req: IncomingMessage) => void;
type fileInfo = {
  name: string;
  size: number;
  downloadLink: string;
};

type sendMethods = 'GET' | 'POST' | 'HEAD';
type Architecture = NodeJS.Architecture;
type OperatingSystem = NodeJS.Platform;

type DeviceInfo = {
  name: string;
  httpPort: number;
  address: string;
  arch?: Architecture;
  os?: OperatingSystem;
  lastSeen: number;
};

type DiscoveryServiceOptions = {
  httpPort: number;
};

type ActiveInterfaces = {
  address: string;
  netmask: string;
};

interface ReqOptions {
  method: sendMethods;
  url: string;
  res: sendCallback;
  headers?: Record<string, string>;
  body?: string | Buffer;
}
interface PeerDownloadRequest {
  isAccepted: boolean;
  show: boolean;
  fileInfo: fileInfo[] | null;
}
type ProgressData = {
  totalDownloadedBytes: number;
};
export type {
  constructorOptions,
  getCallback,
  fileInfo,
  ProgressData,
  DeviceInfo,
  PeerDownloadRequest,
  DiscoveryServiceOptions,
  ActiveInterfaces,
  ReqOptions,
};
