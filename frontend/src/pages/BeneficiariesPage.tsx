import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  beneficiariesApi,
  addressText,
  type Beneficiary,
  type BeneficiaryPayload,
} from "../api/beneficiaries";
import { apiErrorMessage, photoUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PhotoInput from "../components/PhotoInput";
import "./AdminStudentsPage.css";

const emptyForm = (): BeneficiaryPayload => ({
  name: "",
  nik: "",
  street: "",
  rt: "",
  rw: "",
  kelurahan: "",
  kecamatan: "",
  city: "",
  province: "",
  postalCode: "",
  foodRestrictions: "",
  decile: 1,
  isActive: true,
});
const addressFields = [
  ["street", "Jalan"],
  ["rt", "RT"],
  ["rw", "RW"],
  ["kelurahan", "Kelurahan"],
  ["kecamatan", "Kecamatan"],
  ["city", "Kabupaten / Kota"],
  ["province", "Provinsi"],
  ["postalCode", "Kode Pos"],
] as const;

export default function BeneficiariesPage() {
  const { logout } = useAuth();
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [form, setForm] = useState<BeneficiaryPayload>(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [qr, setQr] = useState<Beneficiary | null>(null);
  const [qrError, setQrError] = useState("");
  const qrRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      beneficiariesApi
        .getAll(
          { page, limit: 20, search: search.trim() || undefined },
          controller.signal,
        )
        .then((res) => {
          if (controller.signal.aborted) return;
          if (page > 1 && page > res.meta.totalPages) {
            setPage(Math.max(1, res.meta.totalPages));
            return;
          }
          setItems(res.data);
          setMeta(res.meta);
        })
        .catch((err) => {
          if (!controller.signal.aborted)
            setError(
              apiErrorMessage(err, "Gagal memuat data penerima manfaat."),
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, refresh]);

  const openForm = (item?: Beneficiary) => {
    setEditing(item || null);
    setForm(
      item
        ? {
            name: item.name,
            nik: item.nik,
            street: item.street,
            rt: item.rt,
            rw: item.rw,
            kelurahan: item.kelurahan,
            kecamatan: item.kecamatan,
            city: item.city,
            province: item.province,
            postalCode: item.postalCode,
            foodRestrictions: item.foodRestrictions || "",
            decile: item.decile,
            isActive: item.isActive,
          }
        : emptyForm(),
    );
    setPhoto(null);
    setFormError("");
    setOpen(true);
  };

  const viewQr = async (item: Beneficiary) => {
    const request = ++qrRequest.current;
    setQr(item);
    setQrError("");
    try {
      const result = await beneficiariesApi.qr(item.id);
      if (request === qrRequest.current) setQr({ ...item, ...result });
    } catch (err) {
      if (request === qrRequest.current)
        setQrError(
          apiErrorMessage(err, "Gagal memuat QR. Tutup dan coba lagi."),
        );
    }
  };
  const closeQr = () => {
    qrRequest.current++;
    setQr(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      let saved = editing
        ? await beneficiariesApi.update(editing.id, form)
        : await beneficiariesApi.create(form);
      // Remember the created record so retrying a failed photo upload does not create a duplicate.
      setEditing(saved);
      setRefresh((value) => value + 1);
      if (photo) {
        try {
          saved = {
            ...saved,
            ...(await beneficiariesApi.photo(saved.id, photo)),
          };
        } catch (err) {
          setFormError(
            `Data sudah tersimpan. ${apiErrorMessage(err, "Foto gagal diunggah. Coba Simpan kembali.")}`,
          );
          return;
        }
      }
      setRefresh((value) => value + 1);
      setOpen(false);
      setPhoto(null);
      await viewQr(saved);
    } catch (err) {
      setFormError(apiErrorMessage(err, "Gagal menyimpan penerima manfaat."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Beneficiary) => {
    if (
      !window.confirm(
        `Hapus ${item.name}? Semua absensi terkait juga akan dihapus.`,
      )
    )
      return;
    try {
      await beneficiariesApi.delete(item.id);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(apiErrorMessage(err, "Gagal menghapus penerima manfaat."));
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-title-group">
          <div className="admin-badge">Penerima Manfaat MBG</div>
          <h1 className="admin-title">Kelompok 3B-Lansia</h1>
          <p className="admin-subtitle">
            Kelola identitas, alamat, desil, pantangan makanan, dan kartu QR.
          </p>
        </div>
        <div className="admin-header-actions">
          <button className="btn btn-primary" onClick={() => openForm()}>
            ＋ Tambah Penerima Manfaat
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            Keluar
          </button>
        </div>
      </header>
      <nav className="beneficiary-tabs" aria-label="Jenis penerima manfaat">
        <NavLink className="btn btn-secondary" to="/admin">
          Siswa
        </NavLink>
        <NavLink className="btn btn-primary" to="/beneficiaries-3b">
          3B-Lansia
        </NavLink>
      </nav>
      <div className="admin-toolbar">
        <input
          className="form-input"
          aria-label="Cari penerima manfaat"
          placeholder="Cari nama, NIK, kelurahan, atau kota…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <span>
          {meta.total} penerima manfaat{search && " sesuai pencarian"}
        </span>
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
          <button
            className="btn btn-secondary"
            onClick={() => setRefresh((n) => n + 1)}
          >
            Coba Lagi
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Memuat data…</p>
      ) : (
        <div className="table-container">
          {!items.length ? (
            <div className="empty-state">
              {search
                ? "Tidak ada hasil pencarian."
                : "Belum ada penerima manfaat 3B-Lansia."}
            </div>
          ) : (
            <table className="students-table">
              <thead>
                <tr>
                  <th>Penerima Manfaat</th>
                  <th>Alamat</th>
                  <th>Desil</th>
                  <th>Pantangan Makanan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Penerima Manfaat">
                      <div className="student-profile-cell">
                        {item.photoPath ? (
                          <img
                            className="student-avatar"
                            src={photoUrl(item.photoPath)}
                            alt={item.name}
                          />
                        ) : (
                          <div className="student-avatar">{item.name[0]}</div>
                        )}
                        <div className="student-meta">
                          <span className="student-name-text">{item.name}</span>
                          <span className="student-nisn-badge">
                            NIK: {item.nik}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Alamat">
                      <div className="recipient-address">
                        {addressText(item)}
                      </div>
                    </td>
                    <td data-label="Desil">{item.decile}</td>
                    <td data-label="Pantangan Makanan">
                      {item.foodRestrictions ? (
                        <span className="badge-restriction">
                          ⚠ {item.foodRestrictions}
                        </span>
                      ) : (
                        "Tidak ada"
                      )}
                    </td>
                    <td data-label="Status">
                      <span
                        className={
                          item.isActive
                            ? "badge-status-active"
                            : "badge-status-inactive"
                        }
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td data-label="Aksi">
                      <div className="action-buttons-cell">
                        <button
                          className="btn-icon-action"
                          title="Lihat kartu QR"
                          onClick={() => viewQr(item)}
                        >
                          ▦
                        </button>
                        <button
                          className="btn-icon-action"
                          title="Edit penerima manfaat"
                          onClick={() => openForm(item)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon-action btn-delete"
                          title="Hapus penerima manfaat"
                          onClick={() => remove(item)}
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
      )}
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            Sebelumnya
          </button>
          <span>
            {page} / {meta.totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((n) => n + 1)}
          >
            Berikutnya
          </button>
        </div>
      )}

      {open && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beneficiary-form-title"
          >
            <div className="modal-header">
              <h2 id="beneficiary-form-title" className="modal-title">
                {editing ? "Edit" : "Tambah"} 3B-Lansia
              </h2>
              <button
                className="modal-close-btn"
                aria-label="Tutup form"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={save}>
              <fieldset disabled={saving} style={{ border: 0, minWidth: 0 }}>
                <div
                  className="modal-body"
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  {formError && (
                    <div className="alert alert-error" role="alert">
                      {formError}
                    </div>
                  )}
                  <label className="form-group">
                    <span className="form-label">Nama *</span>
                    <input
                      className="form-input"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </label>
                  <label className="form-group">
                    <span className="form-label">
                      Nomor Induk Kependudukan (NIK) *
                    </span>
                    <input
                      className="form-input"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{16}"
                      maxLength={16}
                      minLength={16}
                      value={form.nik}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nik: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                    <small>16 digit angka</small>
                  </label>
                  <div className="recipient-form-grid">
                    {addressFields.map(([key, label]) => {
                      const numeric = ["rt", "rw", "postalCode"].includes(key);
                      return (
                        <label className="form-group" key={key}>
                          <span className="form-label">{label} *</span>
                          <input
                            className="form-input"
                            required
                            value={form[key]}
                            inputMode={numeric ? "numeric" : "text"}
                            pattern={
                              key === "postalCode"
                                ? "[0-9]{5}"
                                : numeric
                                  ? "[0-9]{1,3}"
                                  : undefined
                            }
                            maxLength={
                              key === "postalCode" ? 5 : numeric ? 3 : undefined
                            }
                            onChange={(e) =>
                              setForm({
                                ...form,
                                [key]: numeric
                                  ? e.target.value.replace(/\D/g, "")
                                  : e.target.value,
                              })
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                  <label className="form-group">
                    <span className="form-label">Desil *</span>
                    <select
                      className="form-input"
                      aria-label="Desil"
                      value={form.decile}
                      onChange={(e) =>
                        setForm({ ...form, decile: Number(e.target.value) })
                      }
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Pantangan Makanan</span>
                    <input
                      className="form-input"
                      placeholder="Kosongkan jika tidak ada"
                      value={form.foodRestrictions}
                      onChange={(e) =>
                        setForm({ ...form, foodRestrictions: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                    />{" "}
                    Aktif (dapat melakukan absensi)
                  </label>
                  <PhotoInput
                    value={photo}
                    onChange={setPhoto}
                    existingUrl={editing?.photoPath}
                    disabled={saving}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setOpen(false)}
                  >
                    Batal
                  </button>
                  <button className="btn btn-primary" type="submit">
                    {saving ? "Menyimpan…" : "Simpan & Lihat QR"}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {qr && (
        <div className="modal-overlay">
          <div
            className="modal-content print-area"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beneficiary-qr-title"
          >
            <div className="modal-header">
              <h2 id="beneficiary-qr-title" className="modal-title">
                Kartu QR 3B-Lansia
              </h2>
              <button
                className="modal-close-btn"
                aria-label="Tutup kartu QR"
                onClick={closeQr}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="student-id-card">
                <div className="card-top-strip">
                  <div>
                    <span className="card-app-tag">
                      KARTU PESERTA MBG DIGITAL
                    </span>
                    <h3>3B-Lansia</h3>
                  </div>
                  <span>{qr.isActive ? "AKTIF" : "NONAKTIF"}</span>
                </div>
                <div className="qr-image-wrapper">
                  {qr.qrDataUrl ? (
                    <img src={qr.qrDataUrl} alt={`QR ${qr.name}`} />
                  ) : (
                    <p role="status">{qrError || "Memuat QR…"}</p>
                  )}
                </div>
                <div className="card-student-details">
                  <h3>{qr.name}</h3>
                  <p>NIK: {qr.nik}</p>
                  <p>Desil: {qr.decile}</p>
                  {qr.foodRestrictions && (
                    <p className="badge-restriction">
                      Pantangan: {qr.foodRestrictions}
                    </p>
                  )}
                </div>
              </div>
              <div className="qr-action-buttons">
                {qr.qrDataUrl && (
                  <a
                    className="btn btn-primary"
                    href={qr.qrDataUrl}
                    download={`QR_3BL_${qr.nik}.png`}
                  >
                    Unduh QR (.png)
                  </a>
                )}
                <button
                  className="btn btn-secondary"
                  disabled={!qr.qrDataUrl}
                  onClick={() => window.print()}
                >
                  Cetak Kartu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
