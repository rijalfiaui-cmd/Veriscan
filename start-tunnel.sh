#!/bin/bash

# ============================================================
# AbsenQR — Full Stack Quick Tunnel Starter
# Backend (3000) + Frontend (5173) + Cloudflare HTTPS Tunnel
# ============================================================

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:/usr/local/bin:$PATH"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
CLOUDFLARED="/opt/homebrew/bin/cloudflared"
BACKEND_PORT=3000
FRONTEND_PORT=5173

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          AbsenQR — Quick Tunnel Starter (HTTPS)          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 1. Pastikan Cloudflared terinstall
if [ ! -f "$CLOUDFLARED" ]; then
  echo "❌ cloudflared tidak ditemukan. Silakan jalankan: brew install cloudflared"
  exit 1
fi

# 2. Pastikan PostgreSQL berjalan
echo "🐘 Memeriksa PostgreSQL..."
if ! nc -z localhost 5432 2>/dev/null; then
  echo "⏳ Menjalankan PostgreSQL service..."
  brew services start postgresql@16 2>/dev/null || pg_ctl -D /opt/homebrew/var/postgresql@16 start 2>/dev/null
  sleep 3
fi

if nc -z localhost 5432 2>/dev/null; then
  echo "✅ PostgreSQL aktif di port 5432"
else
  echo "❌ PostgreSQL gagal dijalankan!"
  exit 1
fi

# 3. Membersihkan proses lama
echo "🧹 Membersihkan proses lama..."
pkill -f "cloudflared tunnel" 2>/dev/null
pkill -f "dist/main" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# 4. Menjalankan Backend
echo "🚀 Menjalankan Backend NestJS (port $BACKEND_PORT)..."
cd "$PROJECT_ROOT/backend"
# Gunakan build jika ada, atau start:dev
if [ -f "$PROJECT_ROOT/backend/dist/src/main.js" ]; then
  node dist/src/main.js &
elif [ -f "$PROJECT_ROOT/backend/dist/main.js" ]; then
  node dist/main.js &
else
  npm run start:dev &
fi
BACKEND_PID=$!

# Tunggu backend siap
echo "⏳ Menunggu backend siap..."
for i in {1..30}; do
  if curl -s "http://localhost:$BACKEND_PORT/api/v1/students" > /dev/null 2>&1 || curl -s "http://localhost:$BACKEND_PORT" > /dev/null 2>&1; then
    echo "✅ Backend siap di http://localhost:$BACKEND_PORT"
    break
  fi
  sleep 1
done

# 5. Menjalankan Frontend
echo "⚡ Menjalankan Frontend Vite (port $FRONTEND_PORT)..."
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

# Tunggu frontend siap
echo "⏳ Menunggu frontend siap..."
for i in {1..20}; do
  if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo "✅ Frontend siap di http://localhost:$FRONTEND_PORT"
    break
  fi
  sleep 1
done

# 6. Jalankan Cloudflare Quick Tunnel ke Frontend (Port 5173)
# Karena frontend mem-proxy /api dan /uploads ke Backend (Port 3000),
# tunnel ke frontend memberikan akses HTTPS lengkap (termasuk izin Kamera di Android!)
echo ""
echo "🌐 Membuka Cloudflare Quick Tunnel (HTTPS)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TUNNEL_LOG=$(mktemp)
$CLOUDFLARED tunnel --url "http://localhost:$FRONTEND_PORT" 2>&1 | tee "$TUNNEL_LOG" &
TUNNEL_PID=$!

# Tunggu URL tunnel muncul
echo "⏳ Menunggu URL tunnel dari Cloudflare..."
for i in {1..35}; do
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

# Trap cleanup saat Ctrl+C
cleanup() {
  echo ""
  echo "🛑 Menghentikan semua service..."
  kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID 2>/dev/null
  rm -f "$TUNNEL_LOG"
  echo "👋 Selesai."
  exit 0
}
trap cleanup INT TERM

if [ -n "$TUNNEL_URL" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║                  🎉 APLIKASI SIAP DIAKSES!                      ║"
  echo "╠══════════════════════════════════════════════════════════════════╣"
  echo "║  📱 Buka di Browser HP Android:                                  ║"
  echo "║  👉 $TUNNEL_URL"
  echo "║                                                                  ║"
  echo "║  🔒 Protokol HTTPS aktif → Kamera Scanner otomatis diizinkan!    ║"
  echo "║                                                                  ║"
  echo "║  📋 Akun Login Petugas:                                          ║"
  echo "║     Username: petugas01                                          ║"
  echo "║     Password: petugas123                                         ║"
  echo "║                                                                  ║"
  echo "║  👤 Akun Admin:                                                  ║"
  echo "║     Username: admin                                              ║"
  echo "║     Password: admin123                                           ║"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "💡 Tekan Ctrl+C di terminal ini untuk mematikan semua service."
  echo ""
else
  echo "❌ Gagal mendapatkan URL tunnel. Coba cek koneksi internet."
fi

wait $TUNNEL_PID
