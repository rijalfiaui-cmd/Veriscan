import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { attendanceApi, type ScanResult } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import RecipientCard from '../components/RecipientCard';
import { apiErrorMessage } from '../api/client';
import './ScanPage.css';

type ScanState = 'idle' | 'scanning' | 'processing' | 'result' | 'error';

const ScanPage: React.FC = () => {
  const { staff, logout } = useAuth();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [restartRequested, setRestartRequested] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const scannerDivId = 'qr-scanner-div';

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrCodeRef.current.stop();
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    setScanState('scanning');
    setCameraError('');
    setErrorMessage('');
    setScanResult(null);
    isProcessingRef.current = false;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerDivId);
      }

      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
        formatsToSupport: [0], // QR_CODE only
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        async (decodedText: string) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          await stopScanner();
          setScanState('processing');

          try {
            const result = await attendanceApi.scan(decodedText.trim());
            setScanResult(result);
            setScanState('result');
          } catch (err: unknown) {
            const axiosErr = err as {
              response?: { data?: { message?: string; status?: string } };
            };
            const errData = axiosErr.response?.data;

            if (errData?.status === 'invalid_qr') {
              setScanResult({
                status: 'invalid_qr',
                message: 'QR Code tidak valid',
              });
              setScanState('result');
            } else if (errData?.status === 'inactive_student' || errData?.status === 'inactive_beneficiary') {
              setScanResult({
                status: errData.status,
                recipient: (errData as ScanResult).recipient,
                message: errData.message || 'Penerima manfaat tidak aktif',
                student: (errData as ScanResult).student,
              });
              setScanState('result');
            } else {
              setErrorMessage(
                apiErrorMessage(err, 'Gagal terhubung ke server. Periksa koneksi internet.'),
              );
              setScanState('error');
            }
          }
        },
        undefined, // onError callback — diabaikan agar tidak spam
      );
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message?.includes('Permission') || e.message?.includes('permission') || e.name === 'NotAllowedError') {
        setCameraError('Izin kamera ditolak. Buka pengaturan browser dan izinkan akses kamera.');
      } else if (e.name === 'NotFoundError' || e.message?.includes('device')) {
        setCameraError('Kamera tidak ditemukan di perangkat ini.');
      } else {
        setCameraError(`Kamera tidak dapat diakses: ${e.message}`);
      }
      setScanState('idle');
    }
  }, [stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (restartRequested && scanState === 'idle') {
      setRestartRequested(false);
      void startScanner();
    }
  }, [restartRequested, scanState, startScanner]);

  const handleNextScan = () => {
    setScanResult(null);
    setErrorMessage('');
    setCameraError('');
    html5QrCodeRef.current = null;
    setScanState('idle');
    setRestartRequested(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'recorded':
        return { emoji: '✅', label: 'Absensi Dicatat', className: 'status-success' };
      case 'already_present':
        return { emoji: '⚠️', label: 'Sudah Absen', className: 'status-warning' };
      case 'invalid_qr':
        return { emoji: '❌', label: 'QR Tidak Valid', className: 'status-danger' };
      case 'inactive_beneficiary':
      case 'inactive_student':
        return { emoji: '🚫', label: 'Penerima Tidak Aktif', className: 'status-danger' };
      default:
        return { emoji: '❓', label: 'Status Tidak Diketahui', className: 'status-warning' };
    }
  };

  return (
    <div className="scan-page">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <div className="header-logo-icon">📋</div>
          <div>
            <div className="header-title">AbsenQR</div>
            <div className="header-subtitle">Scan Absensi</div>
          </div>
        </div>
        <div className="header-staff">
          <div className="staff-info">
            <div className="staff-name">{staff?.name}</div>
            <div className="staff-username">@{staff?.username}</div>
          </div>
          <div className="staff-avatar">
            {staff?.name?.charAt(0).toUpperCase()}
          </div>
          <button
            className="btn btn-danger btn-logout"
            onClick={logout}
            id="logout-btn"
            title="Logout"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="scan-main">
        {/* Scanner Area */}
        {(scanState === 'idle' || scanState === 'scanning') && (
          <div className="scanner-section fade-in">
            <div className="scanner-frame-wrapper">
              {/* Scanner div — selalu ada di DOM saat scanning */}
              <div
                id={scannerDivId}
                className={`scanner-video-container ${scanState === 'scanning' ? 'active' : 'hidden'}`}
              />

              {scanState === 'idle' && (
                <div className="scanner-placeholder">
                  <div className="scanner-placeholder-icon">📷</div>
                  <p className="scanner-placeholder-text">
                    Tekan tombol di bawah untuk memulai scan
                  </p>
                </div>
              )}

              {scanState === 'scanning' && (
                <div className="scanner-overlay">
                  <div className="scanner-corner tl" />
                  <div className="scanner-corner tr" />
                  <div className="scanner-corner bl" />
                  <div className="scanner-corner br" />
                  <div className="scanner-line" />
                </div>
              )}
            </div>

            {cameraError && (
              <div className="alert alert-error mt-4">
                <span>📷</span>
                <span>{cameraError}</span>
              </div>
            )}

            {scanState === 'idle' && (
              <button
                className="btn btn-primary btn-full btn-lg scan-start-btn"
                onClick={startScanner}
                id="start-scan-btn"
              >
                <span>📷</span>
                Mulai Scan QR Code
              </button>
            )}

            {scanState === 'scanning' && (
              <div className="scanning-indicator">
                <div className="scanning-dot" />
                <span>Mengarahkan kamera ke QR Code penerima manfaat...</span>
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {scanState === 'processing' && (
          <div className="processing-section fade-in">
            <div className="processing-spinner">
              <div className="spinner spinner-lg" style={{ borderTopColor: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }} />
              <div className="processing-ring" />
            </div>
            <p className="processing-text">Memverifikasi QR Code...</p>
            <p className="processing-sub">Sedang memeriksa data penerima manfaat</p>
          </div>
        )}

        {/* Error State */}
        {scanState === 'error' && (
          <div className="result-section fade-in">
            <div className="result-status status-danger">
              <span className="result-status-icon">❌</span>
              <div>
                <div className="result-status-title">Gagal Terhubung</div>
                <div className="result-status-message">{errorMessage}</div>
              </div>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleNextScan}
              id="retry-scan-btn"
            >
              <span>🔄</span>
              Coba Lagi
            </button>
          </div>
        )}

        {/* Result State */}
        {scanState === 'result' && scanResult && (
          <div className="result-section slide-up">
            {/* Status Banner */}
            {(() => {
              const statusConfig = getStatusConfig(scanResult.status);
              return (
                <div className={`result-status ${statusConfig.className}`}>
                  <span className="result-status-icon">{statusConfig.emoji}</span>
                  <div>
                    <div className="result-status-title">{statusConfig.label}</div>
                    <div className="result-status-message">{scanResult.message}</div>
                  </div>
                </div>
              );
            })()}

            {/* Student Card */}
            {scanResult.recipient && (
              <RecipientCard
                recipient={scanResult.recipient}
                attendance={scanResult.attendance}
              />
            )}

            {/* Next Scan Button */}
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleNextScan}
              id="next-scan-btn"
            >
              <span>📷</span>
              Scan Berikutnya
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScanPage;
