import type { fileInfo } from '../../electron/utils/types';

type subscribeCB = (info: fileInfo[]) => void;
let activeTransfers: fileInfo[] = [];
let subscriberList: subscribeCB[] = [];

function subscribe(cb: subscribeCB) {
  subscriberList.push(cb);

  return () => {
    subscriberList = subscriberList.filter((value) => value !== cb);
  };
}
function addActiveTransfer(fileInfo: fileInfo) {
  activeTransfers.push(fileInfo);

  subscriberList.forEach((cb) => {
    cb(activeTransfers);
  });
}

function getActiveTransfers() {
  return activeTransfers;
}

export { addActiveTransfer, subscribe, getActiveTransfers };
