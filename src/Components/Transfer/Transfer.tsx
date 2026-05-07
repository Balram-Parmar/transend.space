import styles from './Transfer.module.css';
import { getActiveTransfers, subscribe } from '../../state/activeTransfers';
import { useEffect, useState } from 'react';

import type { fileInfo } from '../../../electron/utils/types';
function Transfer() {
  const [files, setFiles] = useState<fileInfo[]>(getActiveTransfers());
  useEffect(() => {
    const unsub = subscribe((newData: fileInfo[]) => {
      setFiles([...newData]);
    });

    return () => {
      unsub();
    };
  }, []);
  return (
    <>
      <div className={styles.temp}>
        {files.map((file, index) => {
          return (
            <div key={index}>
              <div>Name {file.name}</div>
              <div>Download link : {file.downloadLink}</div>
              <div>file Size : {file.size}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default Transfer;
/*
<div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.fileTransferContainer}>
          <div className={styles.file}>
            <div className={styles.fileInfo}>
              <div className={styles.imageContainer}>
                {' '}
                <img src={jpg} alt="" />
              </div>

              <div className={styles.fileMeta}>
                <h1>The Compound Effect - Darren hardy.pdf</h1>
                <span>UPLOADING</span>
              </div>
            </div>

            <span className={styles.cancel}>X</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div className={styles.status}>
              <div className={styles.percentage}>50%</div>
              <div className={styles.bytes}>50 MB / 100 MB</div>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '50%' }}></div>
            </div>
          </div>
          <div className={styles.line}></div>
          <div className={styles.speedContainer}>
            <div className={styles.speed}>
              <span>Speed</span>
              <span className={styles.text}>12MB / s</span>
            </div>
            <div className={styles.eta}>
              <span>ETA</span>
              <span className={styles.text}>00:10:01</span>
            </div>
          </div>
        </div>
      </div>
    </div>
*/
