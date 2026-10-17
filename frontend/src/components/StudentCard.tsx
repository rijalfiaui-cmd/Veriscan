import React from 'react';
import './StudentCard.css';

interface StudentCardProps {
  student: {
    name: string;
    nisn: string;
    schoolName: string;
    gender?: string;
    foodRestrictions?: string | null;
    photoUrl?: string | null;
  };
  attendance?: {
    date: string;
    time: string;
  };
  status: string;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, attendance, status }) => {
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
    } catch {
      return isoString;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(`${y}-${m}-${d}T00:00:00`);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'recorded':
        return <span className="badge badge-success">✅ Absen Berhasil</span>;
      case 'already_present':
        return <span className="badge badge-warning">⚠️ Sudah Absen</span>;
      case 'inactive_student':
        return <span className="badge badge-danger">🚫 Tidak Aktif</span>;
      default:
        return null;
    }
  };

  return (
    <div className="student-card card">
      {/* Header dengan foto */}
      <div className="student-card-header">
        <div className="student-photo">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={student.name}
              className="student-photo-img"
            />
          ) : (
            <div className="student-photo-placeholder">
              {student.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="student-photo-ring" />
        </div>

        <div className="student-info-header">
          <h3 className="student-name">{student.name}</h3>
          <p className="student-nisn">NISN: {student.nisn}</p>
          {getStatusBadge()}
        </div>
      </div>

      {/* Detail Info */}
      <div className="student-details">
        <div className="detail-row">
          <span className="detail-icon">🏫</span>
          <div>
            <div className="detail-label">Sekolah</div>
            <div className="detail-value">{student.schoolName}</div>
          </div>
        </div>

        <div className="detail-row">
          <span className="detail-icon">
            {student.gender === 'Laki-laki' || student.gender === 'LAKI_LAKI' ? '👦' : '👧'}
          </span>
          <div>
            <div className="detail-label">Jenis Kelamin</div>
            <div className="detail-value">
              {student.gender === 'LAKI_LAKI' ? 'Laki-laki' : student.gender === 'PEREMPUAN' ? 'Perempuan' : student.gender}
            </div>
          </div>
        </div>

        {/* Pantangan makanan - tampilan mencolok */}
        <div className={`detail-row food-restriction ${student.foodRestrictions ? 'has-restriction' : ''}`}>
          <span className="detail-icon">🍽️</span>
          <div>
            <div className="detail-label">Pantangan Makanan</div>
            <div className={`detail-value ${student.foodRestrictions ? 'restriction-value' : ''}`}>
              {student.foodRestrictions || 'Tidak ada'}
            </div>
          </div>
        </div>

        {/* Waktu scan */}
        {attendance && (
          <>
            <div className="detail-divider" />

            <div className="detail-row">
              <span className="detail-icon">📅</span>
              <div>
                <div className="detail-label">Tanggal Absensi</div>
                <div className="detail-value">{formatDate(attendance.date)}</div>
              </div>
            </div>

            <div className="detail-row">
              <span className="detail-icon">🕐</span>
              <div>
                <div className="detail-label">Waktu Scan</div>
                <div className="detail-value scan-time">{formatTime(attendance.time)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentCard;
