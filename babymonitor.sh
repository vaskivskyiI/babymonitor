#!/bin/bash
set -e

# Auto-detect timezone (override with TZ in the env file if this is wrong
# for your server)
TZ=$(cat /etc/timezone 2>/dev/null || echo "UTC")

# Repo settings - this script is meant to live in ~/podman (alongside your
# other pods' launcher scripts/env files) while the actual code checkout
# lives in ~/babymonitor, so the two are independent. Override REPO_PATH
# in the env file if you clone it somewhere else.
REPO_PATH="${REPO_PATH:-$HOME/babymonitor}"

# Images / naming
IMAGE="${IMAGE:-babymonitor:latest}"
POD_NAME="${POD_NAME:-babymonitor}"

# Default runtime settings
APP_PORT="${APP_PORT:-8000}"

# Persistent data path (SQLite db lives here)
DATA_DIR="${DATA_DIR:-$HOME/podman_data/babymonitor}"

# Optional env file (not required - the app is configured via its own UI,
# but this is here for anything you want to override, e.g. APP_PORT)
ENV_FILE="${ENV_FILE:-$HOME/podman/babymonitor.env}"

# Load env first so every setting above (including REPO_PATH) can be
# overridden before it's used below
if [[ -f "$ENV_FILE" ]]; then
  echo "✅ Loading env from $ENV_FILE"
  set -a
  source "$ENV_FILE"
  set +a
fi

# Update repo if it's a git checkout (no-op otherwise - just rebuilds from
# whatever is on disk in $REPO_PATH)
if [[ "$1" == "update" ]] && [[ -d "$REPO_PATH/.git" ]]; then
  echo "🔄 Updating babymonitor repository..."
  git -C "$REPO_PATH" pull
fi

# Create persistent directory
mkdir -p "$DATA_DIR"

# Build image on update (or if missing)
if [[ "$1" == "update" ]] || ! podman image exists "$IMAGE"; then
  echo "🔨 Building babymonitor image..."
  podman build -t "$IMAGE" -f "$REPO_PATH/Containerfile" "$REPO_PATH"
fi

# Recreate pod
if podman pod exists "$POD_NAME"; then
  echo "🧹 Stopping and removing old pod..."
  podman pod stop "$POD_NAME"
  podman pod rm -f "$POD_NAME"
fi

echo "📦 Creating pod: $POD_NAME"
podman pod create \
  --name "$POD_NAME" \
  -p "$APP_PORT:8000"

echo "👶 Starting Baby Monitor..."
podman run -d \
  --name babymonitor \
  --pod "$POD_NAME" \
  --restart=unless-stopped \
  --health-cmd "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')\" || exit 1" \
  --health-interval 30s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 10s \
  -e TZ="$TZ" \
  ${VAPID_SUBJECT:+-e VAPID_SUBJECT="$VAPID_SUBJECT"} \
  -v "$DATA_DIR:/data:Z" \
  -v /etc/localtime:/etc/localtime:ro \
  "$IMAGE"

echo ""
echo "✅ Baby Monitor is running at: http://localhost:$APP_PORT"
echo ""
echo "💾 Persistent folder"
echo "   Data: $DATA_DIR"
echo ""
echo "🔧 Useful commands"
echo "   podman logs -f babymonitor"
echo "   podman pod ps --filter name=$POD_NAME"
echo "   podman ps --filter pod=$POD_NAME"
echo "   $0 update   # pull latest (if git repo) + rebuild + restart"
