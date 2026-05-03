import { ClientRequest, IncomingMessage, ServerResponse } from 'http';

type constructorOptions = {
  port: number;
  keyString: string;
  certString: string;
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
export type {
  constructorOptions,
  getCallback,
  fileInfo,
  sendMethods,
  sendCallback,
  DeviceInfo,
  DiscoveryServiceOptions,
  ActiveInterfaces,
};
