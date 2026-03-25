#!/usr/bin/env bash
set -euo pipefail

# Oracle Ubuntu quick setup for this bot
# Usage:
#   bash scripts/oracle_setup.sh /opt/bot

APP_DIR="${1:-/opt/bot}"
SERVICE_USER="${SUDO_USER:-$USER}"

echo "[1/7] Installing system packages..."
sudo apt-get update -y
sudo apt-get install -y curl git ffmpeg python3 python3-pip build-essential

echo "[2/7] Installing Node.js 22..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "[3/7] Installing/Updating yt-dlp..."
python3 -m pip install --upgrade --break-system-packages yt-dlp || true

echo "[4/7] Installing PM2..."
sudo npm install -g pm2

echo "[5/7] Preparing app directory..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

echo "[6/7] Installing npm dependencies..."
cd "$APP_DIR"
npm install --omit=dev

echo "[7/7] Starting bot with PM2..."
pm2 delete jo-bot >/dev/null 2>&1 || true
pm2 start src/index.js --name jo-bot
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$SERVICE_USER" --hp "/home/$SERVICE_USER" >/dev/null

echo
echo "Done."
echo "Next steps:"
echo "1) Put your env file at: $APP_DIR/.env"
echo "2) Put YouTube cookies file at: $APP_DIR/secrets/youtube_cookies.txt"
echo "3) In .env set: YTDLP_COOKIES_FILE=$APP_DIR/secrets/youtube_cookies.txt"
echo "4) Restart: pm2 restart jo-bot"
