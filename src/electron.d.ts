import type { DeviceInfo, PeerDownloadRequest } from '../electron/utils/types';

export interface api {
  onDeviceFound: (callback: (device: any) => void) => void;
  // Note: Add any other functions you exposed in contextBridge here later!
  handleDeviceFound: (callback: (device: any) => void) => void;
  sendDownloadRequest: (device: DeviceInfo) => Promise<PeerDownloadRequest>;
  getAllDevices: () => DeviceInfo[];
}
declare global {
  interface Window {
    api: api;
  }
}
