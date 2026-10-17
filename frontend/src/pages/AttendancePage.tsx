import React, { useState, useEffect, useCallback, useRef } from 'react';
import { attendanceApi, type RecipientType, type AttendanceRecord } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import './AttendancePage.css';

const AttendancePage: React.FC = () => {
  const { staff, logout } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(() => {
    // Default: hari ini dalam WIB
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  });
  const [type, setType] = useState<RecipientType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;
  const requestId = useRef(0);

  const fetchRecords = useCallback(async () => {
    const request = ++requestId.current;
    setIsLoading(true);
    setError('');
    try {
      const res = await attendanceApi.getAll({
        page,
        type: type || undefined,
        limit: LIMIT,
        date: date || undefined,
        search: search || undefined,
      });
      if (request !== requestId.current) return;
      setRecords(res.data);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch {
      if (request !== requestId.current) return;
      setError('Gagal memuat data absensi. Periksa koneksi internet Anda.');
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, [page, date, search, type]);

  useEffect(() => {
    void fetchRecords();
    return () => { requestId.current++; };
  }, [fetchRecords]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    setPage(1);
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
    } catch { return '-'; }
  };

  const formatGender = (g: string) =>
    g === 'LAKI_LAKI' ? 'L' : g === 'PEREMPUAN' ? 'P' : g;

  return (
    <div className="attendance-page">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <div className="header-logo-icon">📋</div>
          <div>
            <div className="header-title">AbsenQR</div>
            <div className="header-subtitle">Rekap Absensi</div>
          </div>
        </div>
        <div className="header-staff">
          <div className="staff-avatar-sm">
            {staff?.name?.charAt(0).toUpperCase()}
          </div>
          <button className="btn btn-danger btn-logout-sm" onClick={logout} title="Logout">
            🚪
          </button>
        </div>
      </header>

      <main className="attendance-main">
        {/* Filter Section */}
        <div className="filter-section card">
          <label className="form-group" style={{ marginBottom: 16 }}><span className="form-label">Jenis Penerima Manfaat</span>
            <select aria-label="Jenis Penerima Manfaat" className="form-input" value={type} onChange={(e) => { setType(e.target.value as RecipientType | ''); setPage(1); }}>
              <option value="">Semua</option><option value="STUDENT">Siswa</option><option value="THREE_B_ELDERLY">3B-Lansia</option>
            </select>
          </label>
          <div className="filter-row">
            <div className="form-group filter-item">
              <label className="form-label" htmlFor="filter-date">Tanggal</label>
              <input
                id="filter-date"
                type="date"
                className="form-input"
                value={date}
                onChange={handleDateChange}
              />
            </div>
            <div className="form-group filter-item">
              <label className="form-label" htmlFor="filter-search">Cari</label>
              <input
                id="filter-search"
                type="search"
                className="form-input"
                placeholder="Nama, NISN, atau NIK..."
                value={search}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-number">{total}</span>
              <span className="stat-label">Penerima Hadir</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">{records.length}</span>
              <span className="stat-label">Ditampilkan</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">{date || 'Semua'}</span>
              <span className="stat-label">Tanggal Filter</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="loading-center">
            <div className="spinner spinner-lg" style={{ borderTopColor: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }} />
            <p>Memuat data...</p>
          </div>
        )}

        {/* Table / List */}
        {!isLoading && records.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p className="empty-title">Tidak ada data absensi</p>
            <p className="empty-sub">
              {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada penerima manfaat yang absen pada tanggal ini'}
            </p>
          </div>
        )}

        {!isLoading && records.length > 0 && (
          <div className="attendance-list">
            {records.map((record, idx) => (
              <div className="attendance-item card fade-in" key={record.id} style={{ animationDelay: `${idx * 30}ms` }}>
                <div className="attendance-item-left">
                  <div className="attendance-avatar">
                    {record.recipient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="attendance-info">
                    <div className="attendance-school">{record.recipient.type === 'STUDENT' ? 'Siswa' : '3B-Lansia'}</div>
                    <div className="attendance-name">{record.recipient.name}</div>
                    <div className="attendance-nisn">{record.recipient.type === 'STUDENT' ? 'NISN' : 'NIK'}: {record.recipient.identifier}</div>
                    <div className="attendance-school">{record.recipient.type === 'STUDENT' ? record.recipient.schoolName : record.recipient.address}</div>
                    {record.recipient.foodRestrictions && (
                      <div className="attendance-food-warning">
                        ⚠️ {record.recipient.foodRestrictions}
                      </div>
                    )}
                  </div>
                </div>
                <div className="attendance-item-right">
                  <span className="badge badge-success">HADIR</span>
                  <div className="attendance-time">{formatTime(record.scannedAt)}</div>
                  <div className="attendance-gender">{record.recipient.type === 'STUDENT' ? formatGender(record.recipient.gender || '') : `Desil ${record.recipient.decile}`}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              id="prev-page-btn"
            >
              ← Sebelumnya
            </button>
            <span className="pagination-info">
              {page} / {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              id="next-page-btn"
            >
              Berikutnya →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AttendancePage;
