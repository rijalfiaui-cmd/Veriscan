import React, { useState, useEffect, useCallback } from 'react';
import { studentsApi, type Student, type CreateStudentPayload } from '../api/students';
import { useAuth } from '../context/AuthContext';
import './AdminStudentsPage.css';
import PhotoInput from '../components/PhotoInput';
import { photoUrl, apiErrorMessage } from '../api/client';
import { NavLink } from 'react-router-dom';

const AdminStudentsPage: React.FC = () => {
  const { staff, logout } = useAuth();

  // State List
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [errorMessage, setErrorMessage] = useState('');

  // State Modal Input Siswa Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<CreateStudentPayload>({
    nisn: '',
    name: '',
    schoolName: '',
    gender: 'LAKI_LAKI',
    foodRestrictions: '',
    isActive: true,
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [editPhoto, setEditPhoto] = useState<File | null>(null);

  // State Modal QR Code Viewer
  const [activeQrStudent, setActiveQrStudent] = useState<(Student & { qrDataUrl?: string }) | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // State Modal Edit Siswa
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch Students
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await studentsApi.getAll({
        search: search.trim() || undefined,
        limit: 100,
      });
      setStudents(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data siswa';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset Add Form
  const resetAddForm = () => {
    setFormData({
      nisn: '',
      name: '',
      schoolName: '',
      gender: 'LAKI_LAKI',
      foodRestrictions: '',
      isActive: true,
    });
    setSelectedPhoto(null);
    setFormError('');
  };

  // Submit Tambah Siswa Baru
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validasi NISN 10 digit
    if (!/^\d{10}$/.test(formData.nisn)) {
      setFormError('NISN harus tepat 10 digit angka!');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Nama siswa tidak boleh kosong');
      return;
    }
    if (!formData.schoolName.trim()) {
      setFormError('Asal sekolah tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateStudentPayload = {
        ...formData,
        name: formData.name.trim(),
        schoolName: formData.schoolName.trim(),
        foodRestrictions: formData.foodRestrictions?.trim() || undefined,
      };

      // 1. Simpan siswa & langsung generate QR code
      const newStudent = await studentsApi.create(payload);

      // 2. Upload foto jika dipilih
      let updatedWithPhoto = newStudent;
      if (selectedPhoto) {
        try {
          const photoRes = await studentsApi.uploadPhoto(newStudent.id, selectedPhoto);
          updatedWithPhoto = { ...newStudent, photoPath: photoRes.photoPath };
        } catch {
          alert('Data siswa berhasil disimpan, tetapi foto gagal diunggah. Buka Edit untuk mencoba unggah foto lagi.');
        }
      }

      // 3. Tutup form modal, reset, dan langsung buka Modal QR Code
      setIsAddModalOpen(false);
      resetAddForm();
      await fetchStudents();

      // Buka preview QR code kartu siswa yang baru dibuat!
      setActiveQrStudent(updatedWithPhoto);
      setIsQrModalOpen(true);
    } catch (err: unknown) {
      interface ErrorResponse {
        response?: { data?: { message?: string | string[] } };
      }
      const apiErr = err as ErrorResponse;
      const apiMessage = apiErr.response?.data?.message;
      if (Array.isArray(apiMessage)) {
        setFormError(apiMessage.join(', '));
      } else if (typeof apiMessage === 'string') {
        setFormError(apiMessage);
      } else {
        setFormError('Gagal menyimpan data siswa. Pastikan NISN belum terdaftar.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tampilkan QR Code untuk siswa tertentu
  const handleViewQr = async (student: Student) => {
    setActiveQrStudent(student);
    setIsQrModalOpen(true);
    setIsQrLoading(true);
    try {
      const res = await studentsApi.getQrCode(student.id);
      setActiveQrStudent({ ...student, qrDataUrl: res.qrDataUrl });
    } catch {
      alert('Gagal mengambil QR code');
    } finally {
      setIsQrLoading(false);
    }
  };

  // Download QR Code sebagai file PNG
  const handleDownloadQr = () => {
    if (!activeQrStudent?.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = activeQrStudent.qrDataUrl;
    link.download = `QR_${activeQrStudent.nisn}_${activeQrStudent.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Salin Token
  const handleCopyToken = () => {
    if (!activeQrStudent) return;
    const textToCopy = activeQrStudent.nisn;
    navigator.clipboard.writeText(textToCopy);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Hapus Siswa
  const handleDeleteStudent = async (student: Student) => {
    if (window.confirm(`Yakin ingin menghapus data siswa "${student.name}" (NISN: ${student.nisn})? Data kehadiran terkait juga akan dihapus.`)) {
      try {
        await studentsApi.delete(student.id);
        await fetchStudents();
      } catch {
        alert('Gagal menghapus siswa');
      }
    }
  };

  // Edit Siswa
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setEditPhoto(null);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      await studentsApi.update(editingStudent.id, {
        name: editingStudent.name,
        schoolName: editingStudent.schoolName,
        gender: editingStudent.gender as 'LAKI_LAKI' | 'PEREMPUAN',
        foodRestrictions: editingStudent.foodRestrictions || '',
        isActive: editingStudent.isActive,
      });
      if (editPhoto) {
        try { await studentsApi.uploadPhoto(editingStudent.id, editPhoto); }
        catch (error) {
          setFormError(apiErrorMessage(error, 'Data siswa tersimpan, tetapi foto gagal diunggah. Coba simpan kembali.'));
          return;
        }
      }
      setIsEditModalOpen(false);
      setEditingStudent(null);
      await fetchStudents();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Gagal memperbarui data siswa'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter List
  const filteredStudents = students.filter((s) => {
    if (filterStatus === 'ACTIVE') return s.isActive;
    if (filterStatus === 'INACTIVE') return !s.isActive;
    return true;
  });

  const totalActive = students.filter((s) => s.isActive).length;
  const totalWithAllergy = students.filter((s) => !!s.foodRestrictions).length;

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-title-group">
          <div className="admin-badge">
            <span>🛡️ AbsenQR Admin Panel</span>
          </div>
          <h1 className="admin-title">Kelola Siswa & Kartu QR</h1>
          <p className="admin-subtitle">
            Input data penerima manfaat program MBG, kelola alergi, dan generate QR Code instan
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            className="btn btn-primary btn-lg"
            id="btn-tambah-siswa"
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
          >
            <span>➕</span>
            <span>Input Siswa Baru</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={logout}
            title="Keluar"
          >
            <span>🚪 Logout ({staff?.username})</span>
          </button>
        </div>
      </header>

      <nav className="beneficiary-tabs" aria-label="Jenis penerima manfaat">
        <NavLink className="btn btn-primary" to="/admin">Siswa</NavLink>
        <NavLink className="btn btn-secondary" to="/beneficiaries-3b">3B-Lansia</NavLink>
      </nav>

      {/* Metrics Row */}
      <section className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon-wrapper stat-icon-blue">👥</div>
          <div className="stat-info">
            <span className="stat-value">{students.length}</span>
            <span className="stat-label">Total Siswa Terdaftar</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-wrapper stat-icon-green">✅</div>
          <div className="stat-info">
            <span className="stat-value">{totalActive}</span>
            <span className="stat-label">Status Aktif</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">⚠️</div>
          <div className="stat-info">
            <span className="stat-value">{totalWithAllergy}</span>
            <span className="stat-label">Punya Pantangan/Alergi</span>
          </div>
        </div>
      </section>

      {/* Toolbar Search & Filter */}
      <div className="admin-toolbar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Cari berdasarkan nama, NISN, atau sekolah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="status-filter-pills">
          <button
            className={`filter-pill ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            Semua ({students.length})
          </button>
          <button
            className={`filter-pill ${filterStatus === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ACTIVE')}
          >
            Aktif ({totalActive})
          </button>
          <button
            className={`filter-pill ${filterStatus === 'INACTIVE' ? 'active' : ''}`}
            onClick={() => setFilterStatus('INACTIVE')}
          >
            Nonaktif ({students.length - totalActive})
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <span>⚠️ {errorMessage}</span>
          <button className="btn btn-secondary" onClick={fetchStudents} style={{ marginLeft: 12 }}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>Memuat data siswa...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎒</div>
            <h3>Belum Ada Data Siswa</h3>
            <p style={{ marginTop: 6, marginBottom: 20 }}>
              {search ? 'Tidak ada siswa yang sesuai kata kunci pencarian.' : 'Mulai dengan menambahkan data siswa pertama untuk mencetak QR Code.'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetAddForm();
                setIsAddModalOpen(true);
              }}
            >
              ➕ Tambah Siswa Sekarang
            </button>
          </div>
        ) : (
          <table className="students-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Sekolah</th>
                <th>Gender</th>
                <th>Pantangan Makanan</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td data-label="Siswa">
                    <div className="student-profile-cell">
                      {student.photoPath ? (
                        <img
                          src={photoUrl(student.photoPath)}
                          alt={student.name}
                          className="student-avatar"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="student-avatar">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="student-meta">
                        <span className="student-name-text">{student.name}</span>
                        <span className="student-nisn-badge">NISN: {student.nisn}</span>
                      </div>
                    </div>
                  </td>

                  <td data-label="Sekolah">
                    <span className="school-tag">🏫 {student.schoolName}</span>
                  </td>

                  <td data-label="Gender">
                    <span>{student.gender === 'LAKI_LAKI' ? '👦 Laki-laki' : '👧 Perempuan'}</span>
                  </td>

                  <td data-label="Pantangan Makanan">
                    {student.foodRestrictions ? (
                      <span className="badge-restriction" title={student.foodRestrictions}>
                        ⚠️ {student.foodRestrictions}
                      </span>
                    ) : (
                      <span className="badge-no-restriction">— Tidak ada</span>
                    )}
                  </td>

                  <td data-label="Status">
                    {student.isActive ? (
                      <span className="badge-status-active">
                        <span className="status-dot" />
                        Aktif
                      </span>
                    ) : (
                      <span className="badge-status-inactive">
                        <span className="status-dot" />
                        Nonaktif
                      </span>
                    )}
                  </td>

                  <td data-label="Aksi">
                    <div className="action-buttons-cell">
                      <button
                        className="btn-icon-action btn-qr-view"
                        title="Lihat / Unduh QR Code"
                        onClick={() => handleViewQr(student)}
                      >
                        🔲
                      </button>
                      <button
                        className="btn-icon-action"
                        title="Edit Data Siswa"
                        onClick={() => handleOpenEdit(student)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon-action btn-delete"
                        title="Hapus Siswa"
                        onClick={() => handleDeleteStudent(student)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================================
          MODAL: INPUT DATA SISWA BARU + GENERATE QR
          ============================================================ */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <span>➕</span> Input Data Siswa Baru
              </h2>
              <button
                className="modal-close-btn"
                onClick={() => !isSubmitting && setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {formError && (
                  <div className="alert alert-danger" style={{ padding: '10px 14px', fontSize: 13 }}>
                    ⚠️ {formError}
                  </div>
                )}

                {/* NISN */}
                <div className="form-group">
                  <label className="form-label" htmlFor="input-nisn">
                    Nomor Induk Siswa Nasional (NISN) *
                  </label>
                  <input
                    id="input-nisn"
                    type="text"
                    className="form-input"
                    placeholder="Contoh: 0012345678 (10 digit angka)"
                    maxLength={10}
                    value={formData.nisn}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, nisn: val });
                    }}
                    required
                  />
                  <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                    {formData.nisn.length}/10 digit angka
                  </small>
                </div>

                {/* Nama Siswa */}
                <div className="form-group">
                  <label className="form-label" htmlFor="input-name">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    id="input-name"
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Muhammad Rizky Pratama"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Asal Sekolah */}
                <div className="form-group">
                  <label className="form-label" htmlFor="input-school">
                    Asal Sekolah *
                  </label>
                  <input
                    id="input-school"
                    type="text"
                    className="form-input"
                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    required
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="form-group">
                  <label className="form-label">Jenis Kelamin *</label>
                  <div className="gender-selector">
                    <label className={`gender-option ${formData.gender === 'LAKI_LAKI' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="gender"
                        checked={formData.gender === 'LAKI_LAKI'}
                        onChange={() => setFormData({ ...formData, gender: 'LAKI_LAKI' })}
                      />
                      <span>👦 Laki-laki</span>
                    </label>
                    <label className={`gender-option ${formData.gender === 'PEREMPUAN' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="gender"
                        checked={formData.gender === 'PEREMPUAN'}
                        onChange={() => setFormData({ ...formData, gender: 'PEREMPUAN' })}
                      />
                      <span>👧 Perempuan</span>
                    </label>
                  </div>
                </div>

                {/* Pantangan Makanan / Alergi */}
                <div className="form-group">
                  <label className="form-label" htmlFor="input-food">
                    Pantangan Makanan / Alergi (Opsional)
                  </label>
                  <input
                    id="input-food"
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Alergi Kacang, Seafood, Susu sapi (Kosongkan bila tidak ada)"
                    value={formData.foodRestrictions || ''}
                    onChange={(e) => setFormData({ ...formData, foodRestrictions: e.target.value })}
                  />
                  <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                    Petugas scan MBG akan mendapatkan peringatan khusus jika menu mengandung bahan ini.
                  </small>
                </div>

                <PhotoInput value={selectedPhoto} onChange={setSelectedPhoto} disabled={isSubmitting} />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-submit-siswa"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner spinner-sm" />
                      <span>Menyimpan & Generate QR...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Simpan & Buat QR Code</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: PREVIEW & CETAK KARTU QR SISWA
          ============================================================ */}
      {isQrModalOpen && activeQrStudent && (
        <div className="modal-overlay" onClick={() => setIsQrModalOpen(false)}>
          <div className="modal-content print-area" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <span>🎉</span> Kartu QR Siswa Siap!
              </h2>
              <button className="modal-close-btn" onClick={() => setIsQrModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Desain Kartu Digital Siswa */}
              <div className="student-id-card">
                <div className="card-top-strip">
                  <div className="card-school-brand">
                    <span className="card-app-tag">KARTU PESERTA MBG DIGITAL</span>
                    <h4 className="card-school-name">{activeQrStudent.schoolName}</h4>
                  </div>
                  <span className="badge-status-active">
                    <span className="status-dot" /> {activeQrStudent.isActive ? 'AKTIF' : 'NONAKTIF'}
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="qr-image-wrapper">
                  {isQrLoading || !activeQrStudent.qrDataUrl ? (
                    <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="spinner spinner-lg" />
                    </div>
                  ) : (
                    <img src={activeQrStudent.qrDataUrl} alt={`QR Code ${activeQrStudent.name}`} />
                  )}
                </div>

                <div className="card-student-details">
                  <h3 className="card-student-name">{activeQrStudent.name}</h3>
                  <div className="card-student-nisn">NISN: {activeQrStudent.nisn}</div>
                  
                  {activeQrStudent.foodRestrictions && (
                    <div style={{ marginTop: 10 }}>
                      <span className="badge-restriction">
                        ⚠️ Pantangan: {activeQrStudent.foodRestrictions}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="qr-action-buttons">
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleDownloadQr}
                  disabled={!activeQrStudent.qrDataUrl}
                >
                  <span>📥</span>
                  <span>Unduh Gambar QR (.png)</span>
                </button>

                <button
                  className="btn btn-secondary btn-full"
                  onClick={() => window.print()}
                >
                  <span>🖨️</span>
                  <span>Cetak Kartu Siswa</span>
                </button>

                <button
                  className="btn btn-secondary btn-full"
                  onClick={handleCopyToken}
                >
                  <span>{copiedToken ? '✅' : '📋'}</span>
                  <span>{copiedToken ? 'Tersalin!' : 'Salin NISN Siswa'}</span>
                </button>

                <button
                  className="btn btn-secondary btn-full"
                  onClick={() => {
                    setIsQrModalOpen(false);
                    resetAddForm();
                    setIsAddModalOpen(true);
                  }}
                >
                  <span>➕</span>
                  <span>Input Siswa Lain</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: EDIT DATA SISWA
          ============================================================ */}
      {isEditModalOpen && editingStudent && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <span>✏️</span> Edit Data Siswa
              </h2>
              <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {formError && <div className="alert alert-error" role="alert">{formError}</div>}
                <PhotoInput value={editPhoto} onChange={setEditPhoto} existingUrl={editingStudent.photoPath} disabled={isSubmitting} />
                <div className="form-group">
                  <label className="form-label">NISN (Tetap)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.nisn}
                    disabled
                    style={{ opacity: 0.6 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Asal Sekolah</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.schoolName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, schoolName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jenis Kelamin</label>
                  <div className="gender-selector">
                    <label className={`gender-option ${editingStudent.gender === 'LAKI_LAKI' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="edit-gender"
                        checked={editingStudent.gender === 'LAKI_LAKI'}
                        onChange={() => setEditingStudent({ ...editingStudent, gender: 'LAKI_LAKI' })}
                      />
                      <span>👦 Laki-laki</span>
                    </label>
                    <label className={`gender-option ${editingStudent.gender === 'PEREMPUAN' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="edit-gender"
                        checked={editingStudent.gender === 'PEREMPUAN'}
                        onChange={() => setEditingStudent({ ...editingStudent, gender: 'PEREMPUAN' })}
                      />
                      <span>👧 Perempuan</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pantangan Makanan</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.foodRestrictions || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, foodRestrictions: e.target.value })}
                    placeholder="Kosongkan jika tidak ada"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Siswa</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={editingStudent.isActive}
                      onChange={(e) => setEditingStudent({ ...editingStudent, isActive: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Siswa Aktif (Bisa discan untuk absensi MBG)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentsPage;
