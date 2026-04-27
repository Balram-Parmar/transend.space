import React, { type JSX } from 'react';
// 1. Import NavLink alongside your other router components
import { HashRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import Home from './Components/Home/Home.tsx';
import Transfer from './Components/Transfer/Transfer.tsx';
import styles from './App.module.css';
import logo from './assets/TranSends_Logo.png';
import transferIcon from './assets/transfer_icon.png';

function App(): JSX.Element {
  return (
    <HashRouter>
      <header className={styles.header}>
        {/* Standard Link is fine for the logo/branding */}
        <Link className={styles.branding} to="/">
          <img src={logo} alt="TranSends Logo" />
          <p>TranSends.space</p>
        </Link>

        <div className={styles.pages}>
          {/* 2. Replace Link with NavLink for your navigation items */}
          <NavLink
            to="/transfer"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            <img src={transferIcon} alt="Transfer Icon" />
            Transfer
          </NavLink>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transfer" element={<Transfer />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
