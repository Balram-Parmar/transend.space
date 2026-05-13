import type { DeviceInfo, fileInfo, PeerDownloadRequest } from '../electron/utils/types';

export interface api {
  onDeviceFound: (callback: (device: any) => void) => void;
  // Note: Add any other functions you exposed in contextBridge here later!
  handleDeviceFound: (callback: (device: any) => void) => void;
  sendDownloadRequest: (device: DeviceInfo) => Promise<PeerDownloadRequest>;
  getAllDevices: () => DeviceInfo[];
  progress: (cb: (id: string, totalDownloaded: number, type: string) => void) => void;
  downloadProgress: (cb: (id: string, totalDownloaded: number, type: string) => void) => void;
  addActiveTransfer: (cb: (fileInfo: fileInfo[]) => void) => void;
  handleDownloadRequest: (cb: (file: fileInfo[]) => void) => void;
  acceptRequest: (fileInfo: fileInfo[]) => void;
  rejectRequest: (fileInfo: fileInfo[]) => void;
  fileDialogCanceled: (cb: () => void) => void;
}
declare global {
  interface Window {
    api: api;
  }
}
