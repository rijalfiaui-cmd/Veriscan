import { useEffect, useRef, useState } from "react";
import { photoUrl } from "../api/client";
import "./PhotoInput.css";

interface Props {
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  disabled?: boolean;
}

export default function PhotoInput({
  value,
  onChange,
  existingUrl,
  disabled,
}: Props) {
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const stopCamera = () => {
    requestId.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCameraOpen(false);
    setStarting(false);
    setReady(false);
  };

  useEffect(
    () => () => {
      requestId.current++;
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const selectPhoto = (file: File | null) => {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Pilih foto JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }
    onChange(file);
  };

  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Kamera membutuhkan HTTPS atau localhost. Anda tetap bisa memilih foto dari galeri.",
      );
      return;
    }
    const id = ++requestId.current;
    setStarting(true);
    setCameraOpen(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      if (id !== requestId.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
    } catch (err) {
      if (id !== requestId.current) return;
      stopCamera();
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser atau pilih foto dari galeri."
          : "Kamera tidak tersedia. Periksa perangkat atau pilih foto dari galeri.",
      );
    } finally {
      if (id === requestId.current) setStarting(false);
    }
  };

  const capture = () => {
    const source = video.current;
    if (!source?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(source, 0, 0);
    const id = requestId.current;
    canvas.toBlob(
      (blob) => {
        if (!blob || id !== requestId.current) return;
        selectPhoto(
          new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="photo-input">
      <span className="form-label">Foto (opsional)</span>
      {(preview || existingUrl) && (
        <img
          className="photo-input-preview"
          src={preview || photoUrl(existingUrl)}
          alt="Pratinjau foto penerima manfaat"
        />
      )}
      <div className="photo-input-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled || cameraOpen}
          onClick={() => fileInput.current?.click()}
        >
          Pilih Foto
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled || cameraOpen}
          onClick={startCamera}
        >
          📷 Ambil Foto
        </button>
        {value && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Batalkan Foto Baru
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Pilih foto dari perangkat"
        hidden
        disabled={disabled}
        onChange={(event) => {
          selectPhoto(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />
      <small>JPG, PNG, WEBP · Maksimal 5 MB</small>
      {cameraOpen && (
        <div className="photo-camera">
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            onLoadedData={() => setReady(true)}
            aria-label="Pratinjau kamera"
          />
          <div className="photo-input-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ready || starting || disabled}
              onClick={capture}
            >
              {starting ? "Membuka kamera…" : "Ambil Gambar"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={stopCamera}
            >
              Tutup Kamera
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
    </div>
  );
}
