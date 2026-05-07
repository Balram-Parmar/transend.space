import { contextBridge, ipcRenderer } from 'electron';
import { DeviceInfo, PeerDownloadRequest } from './utils/types';
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
  getAllDevices: () => {
    return ipcRenderer.invoke('refresh');
  },
});
