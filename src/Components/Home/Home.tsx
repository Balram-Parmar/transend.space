import React, { useEffect, useState } from 'react';
import styles from './Home.module.css';
import scanIcon from '../../assets/scanIcon.png';
import networkIcon from '../../assets/networkIcon.png';
import linuxLogo from '../../assets/linux.png';
import winLogo from '../../assets/microsoft.png';
import defaultLogo from '../../assets/android.png';
import macLogo from '../../assets/apple.png';
import loading from '../../assets/loading.gif';
import { addActiveTransfer } from '../../utils/activeTransfers';

import {
  type DeviceInfo,
  type fileInfo,
  type PeerDownloadRequest,
} from '../../../electron/utils/types';
// Extract the file extension and categorize it
function getFileType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    // Video
    mp4: 'video',
    mkv: 'video',
    avi: 'video',
    mov: 'video',
    wmv: 'video',
    flv: 'video',
    webm: 'video',
    // Image
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    bmp: 'image',
    svg: 'image',
    webp: 'image',
    // Audio
    mp3: 'audio',
    wav: 'audio',
    flac: 'audio',
    aac: 'audio',
    ogg: 'audio',
    // Document
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    txt: 'document',
    xls: 'document',
    xlsx: 'document',
    // Archive
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    tar: 'archive',
    gz: 'archive',
  };
  return typeMap[extension] || 'other';
}

// Short label shown on the file icon badge
function getFileLabel(fileType: string): string {
  const labelMap: Record<string, string> = {
    video: 'VIDEO',
    image: 'JPG',
    audio: 'AUDIO',
    document: 'DOC',
    archive: 'ZIP',
    other: 'FILE',
  };
  return labelMap[fileType] || 'FILE';
}

// Map file type to the CSS class for icon styling
function getIconStyleClass(fileType: string): string {
  const classMap: Record<string, string> = {
    video: styles.videoIcon,
    image: styles.imgIcon,
    audio: styles.audioIcon,
    document: styles.docIcon,
    archive: styles.archiveIcon,
    other: styles.fileIconDefault,
  };
  return classMap[fileType] || styles.fileIconDefault;
}

// Convert bytes → human-readable string
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${units[i]}`;
}

function Home() {
  const [devices, setDevices] = useState<DeviceInfo[] | undefined>();
  const [peerDownloadRequestDialog, setPeerDownloadRequestDialog] = useState<
    fileInfo[] | undefined
  >();
  const [waitingAcceptOrReject, setWaitingAcceptOrReject] = useState<
    PeerDownloadRequest | undefined
  >(undefined);
  const [message, setMessage] = useState<string>('');

  function getDeviceInfo(device: DeviceInfo): {
    deviceName: string;
    arch: string;
    logoPath: string;
  } {
    let deviceName = '';
    let logoPath = '';
    if (
      device.os === 'freebsd' ||
      device.os === 'linux' ||
      device.os === 'openbsd' ||
      device.os === 'sunos' ||
      device.os === 'netbsd'
    ) {
      deviceName = device.name + "'s Linux";
      logoPath = linuxLogo;
    } else if (device.os === 'win32') {
      deviceName = device.name + "'s Windows";
      logoPath = winLogo;
    } else if (device.os === 'darwin') {
      deviceName = device.name + "'s Mac";
      logoPath = macLogo;
    } else {
      deviceName = device.name;
      logoPath = defaultLogo;
    }
    return { deviceName: deviceName, logoPath: logoPath, arch: device.arch };
  }
  async function handleDeviceClick(device: DeviceInfo) {
    setWaitingAcceptOrReject({
      isAccepted: false,
      show: true,
      fileInfo: null,
    });

    const response = await window.api.sendDownloadRequest(device);
    window.api.fileDialogCanceled(() => {
      displayMessage('You Cancelled The File Selection Dialog');
      setWaitingAcceptOrReject({ show: false, isAccepted: false, fileInfo: null });
    });

    if (response.isAccepted) {
      displayMessage('Peer Accepted Your Files, Check Transfer Tab To See Details');

      addActiveTransfer(response.fileInfo as fileInfo[]);
      setWaitingAcceptOrReject(undefined);
    } else {
      console.log(`your request is rejected by peer`);
    }
  }
  function handlePeerDownloadAccept() {
    window.api.acceptRequest(peerDownloadRequestDialog as fileInfo[]);
    setPeerDownloadRequestDialog(undefined);
  }
  function handlePeerDownloadReject() {
    window.api.rejectRequest(peerDownloadRequestDialog as fileInfo[]);
    setPeerDownloadRequestDialog(undefined);
  }

  function displayMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => {
      setMessage('');
    }, 5000);
  }
  async function handleRefresh() {
    const data = await window.api.getAllDevices();
    setDevices(data);
  }

  useEffect(() => {
    handleRefresh();
    // We attach the listener once when the component mounts
    window.api.handleDeviceFound((device: DeviceInfo) => {
      setDevices((prevDevices) => {
        return [...(prevDevices || []), device];
      });
    });

    window.api.handleDownloadRequest((files) => {
      setPeerDownloadRequestDialog(files);
    });
  }, []);
  return (
    <div className={styles.mainContent}>
      {waitingAcceptOrReject?.show && (
        <div className={styles.popupOverlay}>
          <div className={styles.acceptCard}>
            <div className={styles.cardLogo}>
              <div className={styles.imageContainer}>
                <img src={winLogo} alt="" />
              </div>
              <h1>Waiting For Balram's Linux to Accept Files</h1>
            </div>

            <div className={styles.loadingContainer}>
              <img src={loading} alt="" />
            </div>
          </div>
        </div>
      )}

      {peerDownloadRequestDialog && peerDownloadRequestDialog.length > 0 && (
        <div className={styles.popupOverlay}>
          <div className={styles.acceptCard}>
            {/* Sender Logo */}
            <div className={styles.senderIconWrapper}>
              <div className={styles.senderIconContainer}>
                <img src={linuxLogo} alt="Linux" />
              </div>
            </div>

            {/* Title */}
            <h2 className={styles.requestTitle}>Accept Files From Balram's Linux?</h2>

            {/* File List Container */}
            <div className={styles.fileListContainer}>
              {peerDownloadRequestDialog.map((file, index) => {
                const fileType = getFileType(file.name);
                const fileLabel = getFileLabel(fileType);
                const iconStyleClass = getIconStyleClass(fileType);
                const formattedSize = formatFileSize(file.size);

                return (
                  <div className={styles.fileItem} key={index}>
                    <div className={`${styles.fileIcon} ${iconStyleClass}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2h12c1.1 0 2-.9 2-2V8l-6-6zm-4 12l-4-4h3V6h2v4h3l-4 4z" />
                      </svg>
                      <span>{fileLabel}</span>
                    </div>
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>{formattedSize}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className={styles.actionArea}>
              <button className={styles.rejectBtn} onClick={handlePeerDownloadReject}>
                Reject
              </button>
              <button className={styles.acceptBtn} onClick={handlePeerDownloadAccept}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Accept & Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.container}>
        <div className={styles.header}>
          {' '}
          <div className={styles.scanContainer}>
            <span className={styles.iconBorder}>
              <div className={styles.iconBackground}>
                <img src={scanIcon} alt="" />
              </div>
            </span>
            {''}
            <div className={styles.text}>
              <h1>Nearby Devices</h1>
              <p>Scanning local subspace for active endpoints...</p>
            </div>
          </div>
          {/* Button */}
          {''}
          <button className={styles.button} onClick={handleRefresh}>
            <img src={networkIcon} />
            <span>Scan Network</span>
          </button>
        </div>

        <div className={styles.deviceGrid}>
          {devices?.map((device, index) => {
            return (
              <Device
                key={index}
                device={device}
                handleDeviceClick={handleDeviceClick}
                getDeviceInfo={getDeviceInfo}
              />
            );
          })}
        </div>
      </div>

      {message && (
        <div className={styles.messageContainer}>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

function Device({
  device,
  handleDeviceClick,
  getDeviceInfo,
}: {
  device: DeviceInfo;
  handleDeviceClick: (device: DeviceInfo) => Promise<void>;
  getDeviceInfo: (deive: DeviceInfo) => { deviceName: string; logoPath: string; arch: string };
}) {
  const { deviceName, logoPath, arch } = getDeviceInfo(device);

  return (
    <div
      className={styles.deviceContainer}
      onClick={() => {
        handleDeviceClick(device);
      }}
    >
      {' '}
      <div className={styles.imageContainer}>
        <img src={logoPath} alt="" />
      </div>
      <div className={styles.information}>
        <h1 className={styles.deviceName}>{deviceName}</h1>
        <p>{arch}</p>
      </div>
    </div>
  );
}

export default Home;
