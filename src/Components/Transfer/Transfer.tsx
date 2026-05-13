import styles from './Transfer.module.css';
import {
  getActiveTransfers,
  subscribe,
  initTransferListener, // Import the new initializer
  type FileStatus,
} from '../../utils/activeTransfers';
import { useEffect, useState } from 'react';
import jpg from '../../assets/image.png';

function Transfer() {
  const [files, setFiles] = useState<FileStatus[]>(getActiveTransfers());

  function formatBytes(bytes: number, decimals = 2): string {
    if (!+bytes) return '0 Bytes';
    if (bytes < 0) return 'Invalid input';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function calculatePercentage(totalSize: number, currentSize: number) {
    if (currentSize && totalSize) {
      // Added Math.min to act as a failsafe so it never physically exceeds 100 in the UI
      return Math.min((currentSize / totalSize) * 100, 100).toFixed(0);
    }
    return 0;
  }

  useEffect(() => {
    initTransferListener();

    // 2. Subscribe to UI updates
    const unsub = subscribe((newData: FileStatus[]) => {
      setFiles([...newData]);
    });

    return () => {
      unsub();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        {files &&
          files.map((file, index) => {
            const progress = calculatePercentage(file.size, file.totalDownloaded);

            return (
              <div className={styles.fileTransferContainer} key={file.downloadLink || index}>
                <div className={styles.file}>
                  <div className={styles.fileInfo}>
                    <div className={styles.imageContainer}>
                      <img src={jpg} alt="" />
                    </div>

                    <div className={styles.fileMeta}>
                      <h1>{file.name}</h1>
                      <span>{file.type}</span>
                    </div>
                  </div>

                  <span className={styles.cancel}>X</span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div className={styles.status}>
                    <div className={styles.percentage}>{progress}%</div>
                    <div className={styles.bytes}>
                      {formatBytes(file.totalDownloaded)} / {formatBytes(file.size)}
                    </div>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
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
                    <span className={styles.text}>--:--:--</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default Transfer;
