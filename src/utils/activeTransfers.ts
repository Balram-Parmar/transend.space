import type { fileInfo } from '../../electron/utils/types';
type DownloadStatus = { totalDownloaded: number; type: string };

export type FileStatus = DownloadStatus & fileInfo;
type subscribeCB = (info: FileStatus[]) => void;

let activeTransfers: FileStatus[] = [];
let subscriberList: subscribeCB[] = [];

function subscribe(cb: subscribeCB) {
  subscriberList.push(cb);
  return () => {
    subscriberList = subscriberList.filter((value) => value !== cb);
  };
}

function addActiveTransfer(fileInfo: fileInfo[]) {
  const updatedFiles = fileInfo.map((file) => {
    return {
      ...file,
      totalDownloaded: 0,
      type: '',
    };
  });
  activeTransfers = [...activeTransfers, ...updatedFiles];
  subscriberList.forEach((cb) => {
    cb(activeTransfers);
  });
}

function updateProgress(id: string, totalDownloaded: number, type: string) {
  // 1. Find the index instead of the item directly
  const index = activeTransfers.findIndex(
    (file) =>
      file.downloadLink.slice(10) === id ||
      (file.downloadLink && file.downloadLink.includes(id.trim())),
  );

  if (index !== -1) {
    const file = activeTransfers[index];
    console.log('updateProgress called for  ' + id);
    // 2. Update the progress
    file.totalDownloaded = totalDownloaded;

    // 3. If complete, remove it from the array using splice
    if (file.size === totalDownloaded) {
      activeTransfers.splice(index, 1);
    }
    file.type = type;

    // 4. Notify subscribers
    subscriberList.forEach((cb) => cb(activeTransfers));
  } else {
    console.log(`No file found with the id ${id}`);
  }
  console.log(`updated active transfer list to : ${JSON.stringify(activeTransfers)}`);
}

function getActiveTransfers() {
  return activeTransfers;
}

// --- NEW CODE: Singleton IPC Listener ---
let isListenerAttached = false;

function initTransferListener() {
  if (!isListenerAttached && typeof window !== 'undefined' && window.api) {
    window.api.progress((id: string, totalDownloaded: number, type) => {
      updateProgress(id, totalDownloaded, type);
    });
    window.api.downloadProgress((id: string, totalDownloaded: number, type) => {
      updateProgress(id, totalDownloaded, type);
    });
    isListenerAttached = true;
    console.log('Global progress listener attached.');
  }
}
window.api.addActiveTransfer((fileInfo) => {
  addActiveTransfer(fileInfo);
});
window.api.downloadProgress((id, totalDownloaded, type) => {
  updateProgress(id, totalDownloaded, type);
});
export {
  addActiveTransfer,
  subscribe,
  getActiveTransfers,
  updateProgress,
  initTransferListener, // Export the new function
};
