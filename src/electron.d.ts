export interface api {
  onDeviceFound: (callback: (device: any) => void) => void;
  // Note: Add any other functions you exposed in contextBridge here later!
  handleDeviceFound: (callback: (device: any) => void) => void;
  getSelectedFilePath: () => Promise<{ filePath: string; cancalled: boolean }>;
}
declare global {
  interface Window {
    api: api;
  }
}
