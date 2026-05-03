import React, { useEffect, useState } from 'react';
import styles from './Home.module.css';
import scanIcon from '../../assets/scanIcon.png';
import networkIcon from '../../assets/networkIcon.png';
import linuxLogo from '../../assets/linux.png';
import winLogo from '../../assets/microsoft.png';
import defaultLogo from '../../assets/android.png';
import macLogo from '../../assets/apple.png';

import { type DeviceInfo } from '../../../electron/utils/types';
// (alias) type DeviceInfo = {
// name: string;
// httpPort: number;
// address: string;
// arch?: any;
// os?: any;
// lastSeen: number;
// }
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

//"aix" | "android" | "darwin" | "freebsd" | "haiku" | "linux" | "openbsd" | "sunos" | "win32" | "cygwin" | "netbsd"
function Home() {
  const [devices, setDevices] = useState<DeviceInfo[] | undefined>([
    // {
    //   name: 'MacBook-Pro-2023',
    //   httpPort: 8080,
    //   address: '192.168.1.101',
    //   arch: 'arm64',
    //   os: 'darwin',
    //   lastSeen: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    // },
    // // Desktop - Windows PC
    // {
    //   name: 'WINDOWS-DESKTOP',
    //   httpPort: 3000,
    //   address: '192.168.1.102',
    //   arch: 'x64',
    //   os: 'win32',
    //   lastSeen: Date.now() - 30 * 60 * 1000, // 30 minutes ago
    // },
    // // Linux Server
    // {
    //   name: 'ubuntu-server-01',
    //   httpPort: 8080,
    //   address: '10.0.0.25',
    //   arch: 'x64',
    //   os: 'linux',
    //   lastSeen: Date.now() - 2 * 60 * 1000, // 2 minutes ago
    // },
  ]);

  useEffect(() => {
    console.log('hello');
    // We attach the listener once when the component mounts
    window.api.handleDeviceFound((device: DeviceInfo) => {
      setDevices((prevDevices) => {
        return [...(prevDevices || []), device];
      });
    });
  }, []);
  return (
    <div className={styles.mainContent}>
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
          <button className={styles.button}>
            <img src={networkIcon} />
            <span>Scan Network</span>
          </button>
        </div>

        <div className={styles.deviceGrid}>
          {devices?.map((device, index) => {
            return <Device key={index} device={device} />;
          })}
        </div>
      </div>
    </div>
  );
}

function Device({ device }: { device: DeviceInfo }) {
  const { deviceName, logoPath, arch } = getDeviceInfo(device);

  async function handleDeviceClick(device: DeviceInfo) {
    const { filePath, cancalled } = await window.api.getSelectedFilePath();
    if (cancalled) {
      console.log(
        'user cancalled the file selection dialog' + JSON.stringify({ filePath, cancalled }),
      );
      return;
    }
    console.log('selected file path is ' + filePath);
  }

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
