import { contextBridge, ipcRenderer } from 'electron';
import { DeviceInfo, fileInfo, PeerDownloadRequest } from './utils/types';
import { data } from 'react-router-dom';

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('api', {
  handleDeviceFound: (cb: (device: DeviceInfo) => void) => {
    ipcRenderer.on('device:found', (_event, device: DeviceInfo) => {
      cb(device);
    });
  },
  sendDownloadRequest: (device: DeviceInfo): Promise<PeerDownloadRequest> => {
    return ipcRenderer.invoke('select-file', device);
  },
  handleDownloadRequest: (cb: (fileInfo: fileInfo) => void) => {
    ipcRenderer.on('peer:request', (_event, body) => {
      cb(body);
    });
  },
  acceptRequest: (fileInfo: fileInfo[]) => {
    console.log(`sending accept ${JSON.stringify(fileInfo)}`);
    ipcRenderer.send('peer:res', fileInfo, true);
  },
  rejectRequest: (fileInfo: fileInfo[]) => {
    ipcRenderer.send('peer:res', fileInfo, false);
  },
  getAllDevices: () => {
    return ipcRenderer.invoke('refresh');
  },
  addActiveTransfer: (cb: (fileInfo: fileInfo[]) => void) => {
    ipcRenderer.on('addActiveTransfer', (__event, fileInfo) => {
      cb(fileInfo);
    });
  },
  progress: (cb: (id: string, totalDownloaded: number) => void) => {
    ipcRenderer.on('progress', (_event, id, totalDownloaded) => {
      cb(id, totalDownloaded);
    });
  },
  downloadProgress: (cb: (id: string, totalDownloaded: number) => void) => {
    ipcRenderer.on('progress:download', (_event, id, toalDownloaded) => {
      cb(id, toalDownloaded);
    });
  },
});
