import { contextBridge, ipcRenderer } from 'electron';
import { DeviceInfo } from './utils/types';

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('api', {
  handleDeviceFound: (cb: (device: DeviceInfo) => void) => {
    ipcRenderer.on('device:found', (_event, device: DeviceInfo) => {
      cb(device);
    });
  },
  getSelectedFilePath: (): Promise<{ filePath: string; cancalled: boolean }> => {
    return ipcRenderer.invoke('select-file');
  },
});
