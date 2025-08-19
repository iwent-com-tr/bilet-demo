# deploy.sh
set -euo pipefail

### ——— AYARLAR ———
FRONTEND_DIR="/home/golgelendirmerenk/bilet-demo/src/frontend"
BACKEND_DIR="/home/golgelendirmerenk/bilet-demo/src/backendN"
NGINX_ROOT="/var/www/iwent"                        # Nginx 'root'
PM2_APP="iwent-backend"                            # PM2 app adı
NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
SERVE_USER="www-data"                              # Nginx kullanıcı/grubu
SERVE_GROUP="www-data"
JSON_LOADER_PATH="$BACKEND_DIR/json-loader.mjs"    # JSON loader (daha önce oluşturduk)

# .env dosyası (backend çalışma dizininde)
ENV_FILE="$BACKEND_DIR/.env"

### ——— ÖN KONTROL ———
[[ -x "$NODE_BIN" && -x "$NPM_BIN" ]] || { echo "Node veya npm bulunamadı"; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo ".env bulunamadı: $ENV_FILE"; exit 1; }
[[ -f "$JSON_LOADER_PATH" ]] || { echo "json-loader yok: $JSON_LOADER_PATH"; exit 1; }
sudo test -d "$NGINX_ROOT" || { echo "Nginx root yok: $NGINX_ROOT"; exit 1; }

BACKUP_DIR="${NGINX_ROOT}_backup_$(date +%Y%m%d_%H%M%S)"

rollback() {
  echo "[!] Hata. Rollback çalışıyor…"
  if [[ -d "$BACKUP_DIR" ]]; then
    sudo rm -rf "$NGINX_ROOT"
    sudo mv "$BACKUP_DIR" "$NGINX_ROOT"
    sudo chown -R $SERVE_USER:$SERVE_GROUP "$NGINX_ROOT"
    sudo nginx -t && sudo systemctl reload nginx || true
    echo "[✓] Frontend rollback tamam."
  fi
  # Backend’i eski PM2 sürümüne döndürmek gerekirse buraya logic eklenebilir.
}
trap rollback ERR

### ——— FRONTEND BUILD + KOPYA ———
echo "[1/4] Frontend build"
cd "$FRONTEND_DIR"
$NPM_BIN ci --omit=dev || $NPM_BIN install
$NPM_BIN run build

echo "[2/4] Nginx root yedekleniyor: $BACKUP_DIR"
sudo rm -rf "$BACKUP_DIR"
sudo mkdir -p "$BACKUP_DIR"
# Var olan içeriği yedekle
if sudo test -n "$(ls -A "$NGINX_ROOT" 2>/dev/null || true)"; then
  sudo cp -a "$NGINX_ROOT/." "$BACKUP_DIR/"
fi

echo "[3/4] Yeni build kopyalanıyor"
sudo rm -rf "$NGINX_ROOT"
sudo mkdir -p "$NGINX_ROOT"
sudo cp -a "$FRONTEND_DIR/build/." "$NGINX_ROOT/"
sudo chown -R $SERVE_USER:$SERVE_GROUP "$NGINX_ROOT"
sudo find "$NGINX_ROOT" -type d -exec chmod 755 {} \;
sudo find "$NGINX_ROOT" -type f -exec chmod 644 {} \;

echo "[Nginx reload]"
sudo nginx -t && sudo systemctl reload nginx

### ——— BACKEND BUILD + PM2 ———
echo "[4/4] Backend build"
cd "$BACKEND_DIR"
$NPM_BIN ci || $NPM_BIN install
$NPM_BIN run build

# Post-build uzantı düzeltici (çalışıyorsa)
if grep -q "tsc-esm-fix" package.json 2>/dev/null; then
  $NPM_BIN explore tsc-esm-fix --silent -- echo >/dev/null 2>&1 || $NPM_BIN i -D tsc-esm-fix
  npx tsc-esm-fix dist --ext .js
fi

# PM2 başlat/yeniden başlat. JSON loader + .env dosyası Node 20 ile register ediliyor.
NODE_ARGS=$'--env-file=.env --import '\''data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./json-loader.mjs", pathToFileURL("./"));'\'''

# Çalışıyor mu?
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  echo "[PM2] Restart: $PM2_APP"
  pm2 restart "$PM2_APP" --update-env --node-args "$NODE_ARGS" --time -- \
    dist/src/index.js
else
  echo "[PM2] Start: $PM2_APP"
  pm2 start dist/src/index.js --name "$PM2_APP" --node-args "$NODE_ARGS" --time
fi

pm2 save

echo "[✓] Deploy tamam."
