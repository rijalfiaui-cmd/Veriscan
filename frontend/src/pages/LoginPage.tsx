import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

// Konfigurasi logo di halaman login (BKKBN & Badan Gizi Nasional)
interface LogoConfig {
  id: string;
  primarySrc: string;     // file di frontend/public/ (misal: /logo1.png)
  secondarySrc?: string;   // opsi cadangan (misal: /logo.png)
  fallbackSvg: string;    // file SVG jika file PNG tidak ditemukan
  alt: string;
}

const LOGO_LIST: LogoConfig[] = [
  {
    id: 'logo-1',
    primarySrc: '/logo1.png',
    secondarySrc: '/logo.png',
    fallbackSvg: '/logo.svg',
    alt: 'Kementerian Kependudukan dan Pembangunan Keluarga / BKKBN',
  },
  {
    id: 'logo-2',
    primarySrc: '/logo2.png',
    fallbackSvg: '/logo2.svg',
    alt: 'Badan Gizi Nasional Republik Indonesia',
  },
];

const LogoBadge: React.FC<{ logo: LogoConfig }> = ({ logo }) => {
  const [currentSrc, setCurrentSrc] = useState(logo.primarySrc);
  const [isFailed, setIsFailed] = useState(false);

  const handleError = () => {
    if (currentSrc === logo.primarySrc && logo.secondarySrc) {
      setCurrentSrc(logo.secondarySrc);
    } else if (currentSrc !== logo.fallbackSvg) {
      setCurrentSrc(logo.fallbackSvg);
    } else {
      setIsFailed(true);
    }
  };

  return (
    <div className="login-logo-item" title={logo.alt}>
      {!isFailed ? (
        <img
          src={currentSrc}
          alt={logo.alt}
          className="login-custom-logo"
          onError={handleError}
        />
      ) : (
        <span className="login-logo-fallback-icon">🏛️</span>
      )}
    </div>
  );
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username tidak boleh kosong');
      return;
    }
    if (!password) {
      setError('Password tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/scan');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message ||
        'Gagal terhubung ke server. Periksa koneksi internet Anda.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />

      <div className="login-container fade-in">
        {/* Multi-Logo Header */}
        <div className="login-logo">
          <div className="login-logos-container">
            {LOGO_LIST.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && <div className="login-logo-divider" />}
                <LogoBadge logo={item} />
              </React.Fragment>
            ))}
          </div>

          <div className="login-logo-text">
            <h1 className="login-logo-title">AbsenQR</h1>
            <p className="login-logo-subtitle">Sistem Absensi Digital MBG</p>
          </div>
        </div>

        {/* Card */}
        <div className="login-card card">
          <div className="login-card-header">
            <h2>Masuk</h2>
            <p>Login sebagai petugas untuk melakukan scan absensi</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  className="form-input login-input"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type="password"
                  className="form-input login-input"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={isLoading}
              id="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Memproses...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Masuk
                </>
              )}
            </button>
          </form>
        </div>

        <p className="login-footer">
          MBG Attendance System © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
