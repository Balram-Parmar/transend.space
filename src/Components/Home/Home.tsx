import React from 'react';
import styles from './Home.module.css';
import scanIcon from '../../assets/scanIcon.png';
import networkIcon from '../../assets/networkIcon.png';
import linuxLogo from '../../assets/linux.png';
import Wrapper from '../Wrapper/Wrapper';

const Home: React.FC = () => {
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
          <Wrapper backgroundColor={'oklch(from var(--cyan-975) L C H / 0.6)'}>
            <div className={styles.deviceContainer}>
              <div className={styles.imageContainer}>
                <img src={linuxLogo} alt="" />
              </div>
              <div className={styles.information}>
                <h1 className={styles.deviceName}>Balram' Linux</h1>
                <p>x64</p>
              </div>
            </div>
          </Wrapper>
          <Wrapper backgroundColor={'oklch(from var(--cyan-975) L C H / 0.6)'}>
            <div className={styles.deviceContainer}>
              <div className={styles.imageContainer}>
                <img src={linuxLogo} alt="" />
              </div>
              <div className={styles.information}>
                <h1 className={styles.deviceName}>Balram' Linux</h1>
                <p>x64</p>
              </div>
            </div>
          </Wrapper>
          <Wrapper backgroundColor={'oklch(from var(--cyan-975) L C H / 0.6)'}>
            <div className={styles.deviceContainer}>
              <div className={styles.imageContainer}>
                <img src={linuxLogo} alt="" />
              </div>
              <div className={styles.information}>
                <h1 className={styles.deviceName}>Balram' Linux</h1>
                <p>x64</p>
              </div>
            </div>
          </Wrapper>
          <Wrapper backgroundColor={'oklch(from var(--cyan-975) L C H / 0.6)'}>
            <div className={styles.deviceContainer}>
              <div className={styles.imageContainer}>
                <img src={linuxLogo} alt="" />
              </div>
              <div className={styles.information}>
                <h1 className={styles.deviceName}>Balram' Linux</h1>
                <p>x64</p>
              </div>
            </div>
          </Wrapper>
        </div>
      </div>
    </div>
  );
};

export default Home;
