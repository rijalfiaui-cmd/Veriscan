import type { Recipient } from "../api/attendance";
import { photoUrl } from "../api/client";
import "./StudentCard.css";

export default function RecipientCard({
  recipient,
  attendance,
}: {
  recipient: Recipient;
  attendance?: { date: string; time: string };
}) {
  const isStudent = recipient.type === "STUDENT";
  return (
    <div className="student-card card">
      <div className="student-card-header">
        <div className="student-photo">
          {recipient.photoUrl ? (
            <img
              className="student-photo-img"
              src={photoUrl(recipient.photoUrl)}
              alt={recipient.name}
            />
          ) : (
            <div className="student-photo-placeholder">{recipient.name[0]}</div>
          )}
        </div>
        <div>
          <span className="badge">{isStudent ? "Siswa" : "3B-Lansia"}</span>
          <h3 className="student-name">{recipient.name}</h3>
          <p>
            {isStudent ? "NISN" : "NIK"}: {recipient.identifier}
          </p>
        </div>
      </div>
      <div className="student-details">
        <div className="detail-row">
          <div>
            <div className="detail-label">
              {isStudent ? "Sekolah" : "Alamat"}
            </div>
            <div className="detail-value">
              {isStudent ? recipient.schoolName : recipient.address}
            </div>
          </div>
        </div>
        {isStudent ? (
          <div className="detail-row">
            <div>
              <div className="detail-label">Jenis Kelamin</div>
              <div className="detail-value">
                {recipient.gender === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
              </div>
            </div>
          </div>
        ) : (
          <div className="detail-row">
            <div>
              <div className="detail-label">Desil</div>
              <div className="detail-value">{recipient.decile}</div>
            </div>
          </div>
        )}
        <div
          className={`detail-row food-restriction ${recipient.foodRestrictions ? "has-restriction" : ""}`}
        >
          <div>
            <div className="detail-label">Pantangan Makanan</div>
            <div className="detail-value">
              {recipient.foodRestrictions || "Tidak ada"}
            </div>
          </div>
        </div>
        {attendance && (
          <div className="detail-row">
            <div>
              <div className="detail-label">Waktu Absensi (WIB)</div>
              <div className="detail-value">
                {attendance.date} ·{" "}
                {new Date(attendance.time).toLocaleTimeString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
