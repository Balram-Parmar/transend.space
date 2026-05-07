import React, { useEffect, useState } from 'react';
import styles from './Home.module.css';
import scanIcon from '../../assets/scanIcon.png';
import networkIcon from '../../assets/networkIcon.png';
import linuxLogo from '../../assets/linux.png';
import winLogo from '../../assets/microsoft.png';
import defaultLogo from '../../assets/android.png';
import macLogo from '../../assets/apple.png';
import loading from '../../assets/loading.gif';
// import { addToActiveTransfer } from '../../state/activeTransfers';

import { type DeviceInfo, type PeerDownloadRequest } from '../../../electron/utils/types';
// (alias) type DeviceInfo = {
// name: string;
// httpPort: number;
// address: string;
// arch?: any;
// os?: any;
// lastSeen: number;
// }

//"aix" | "android" | "darwin" | "freebsd" | "haiku" | "linux" | "openbsd" | "sunos" | "win32" | "cygwin" | "netbsd"
function Home() {
  const [devices, setDevices] = useState<DeviceInfo[] | undefined>();
  const [peerDownloadRequest, setPeerDownloadRequest] = useState<boolean>(false);
  const [waitingAcceptOrReject, setWaitingAcceptOrReject] = useState<PeerDownloadRequest>({
    isWaiting: false,
    cancelled: false,
    fileInfo: null,
  });
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
    setWaitingAcceptOrReject({ isWaiting: true, cancelled: false, fileInfo: null });

    const response = await window.api.sendDownloadRequest(device);

    if (!response.isWaiting && !response.cancelled) {
      displayMessage('Peer Accepted Your Files, Check Transfer Tab To See Details');
      console.log(`front end response : ${JSON.stringify(response)}`);
      // addToActiveTransfer(response.fileInfo);
      setWaitingAcceptOrReject({ isWaiting: false, cancelled: false, fileInfo: response.fileInfo });
    } else if (response.cancelled) {
      displayMessage('You Cancelled The File Selection Dialog');
      setWaitingAcceptOrReject({ isWaiting: false, cancelled: true, fileInfo: null });
    }
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
  }, []);
  return (
    <div className={styles.mainContent}>
      {waitingAcceptOrReject.isWaiting && (
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
      {peerDownloadRequest && (
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
              {/* File Item 1 */}
              <div className={styles.fileItem}>
                <div className={`${styles.fileIcon} ${styles.videoIcon}`}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2h12c1.1 0 2-.9 2-2V8l-6-6zm-4 12l-4-4h3V6h2v4h3l-4 4z" />
                  </svg>
                  <span>VIDEO</span>
                </div>
                <div className={styles.fileDetails}>
                  <span className={styles.fileName}>Kraken.2026.1080p.mp4</span>
                  <span className={styles.fileSize}>1.5 GB</span>
                </div>
              </div>

              {/* File Item 2 */}
              <div className={styles.fileItem}>
                <div className={`${styles.fileIcon} ${styles.imgIcon}`}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2h12c1.1 0 2-.9 2-2V8l-6-6zm-4 12l-4-4h3V6h2v4h3l-4 4z" />
                  </svg>
                  <span>JPG</span>
                </div>
                <div className={styles.fileDetails}>
                  <span className={styles.fileName}>purple-abstract-3840x2160-21503.jpg</span>
                  <span className={styles.fileSize}>1.5 MB</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className={styles.actionArea}>
              <button className={styles.rejectBtn} onClick={() => setPeerDownloadRequest(false)}>
                Reject
              </button>
              <button className={styles.acceptBtn}>
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
