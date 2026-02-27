#!/bin/bash
# ──────────────────────────────────────────────────────────
# setup-systemd.sh
# One-time setup script to install the systemd service
# ──────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="${SCRIPT_DIR}/app.service"
START_SCRIPT="${SCRIPT_DIR}/start-app.sh"

echo "=== Systemd Setup ==="

# Step 1: Copy start wrapper script to ~/scripts
mkdir -p "$HOME/scripts"
cp "$START_SCRIPT" "$HOME/scripts/start-app.sh"
chmod +x "$HOME/scripts/start-app.sh"
echo "✅ Start script installed: ~/scripts/start-app.sh"

# Step 2: Install systemd unit file
echo "Installing systemd service..."
sudo cp "$SERVICE_FILE" /etc/systemd/system/app.service
sudo systemctl daemon-reload
sudo systemctl enable app
echo "✅ systemd service installed and enabled"

# Step 3: Configure sudoers for CI/CD (passwordless restart)
SUDOERS_LINE="${USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart app, /usr/bin/systemctl stop app, /usr/bin/systemctl start app, /usr/bin/systemctl status app, /usr/bin/systemctl is-active app, /usr/bin/journalctl -u app *"
SUDOERS_FILE="/etc/sudoers.d/app"

if [ ! -f "$SUDOERS_FILE" ]; then
  echo "$SUDOERS_LINE" | sudo tee "$SUDOERS_FILE" > /dev/null
  sudo chmod 440 "$SUDOERS_FILE"
  echo "✅ sudoers configured for passwordless systemctl"
fi

echo "✅ Setup complete. Run 'sudo systemctl start app' to begin."
