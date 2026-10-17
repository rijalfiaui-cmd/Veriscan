import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './BottomNav.css';

const BottomNav: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className="nav-tabs safe-bottom">
      <NavLink
        to="/scan"
        className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        id="nav-scan"
      >
        <span className="nav-tab-icon">📷</span>
        <span>Scan QR</span>
      </NavLink>
      <NavLink
        to="/admin"
        className={({ isActive }) => `nav-tab ${isActive || pathname === '/beneficiaries-3b' ? 'active' : ''}`}
        id="nav-admin"
      >
        <span className="nav-tab-icon">👥</span>
        <span>Penerima Manfaat</span>
      </NavLink>
      <NavLink
        to="/attendance"
        className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        id="nav-attendance"
      >
        <span className="nav-tab-icon">📊</span>
        <span>Rekap</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
