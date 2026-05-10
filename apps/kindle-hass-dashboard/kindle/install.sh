#!/bin/sh
# Install Kindle HASS Dashboard extension
# Usage: ./install.sh [kindle-ip]
# Requires: ssh access to Kindle, passwordless SSH recommended

KINDLE_IP="${1:-kindle}"
EXT_DIR="extensions/kindle-dash"

echo "Installing Kindle Dashboard to $KINDLE_IP..."

# Create extension directory on Kindle
ssh root@"$KINDLE_IP" "mkdir -p /mnt/us/extensions/kindle-dash/{bin,etc}"

# Copy files
scp "$EXT_DIR/config.xml" root@"$KINDLE_IP":/mnt/us/extensions/kindle-dash/
scp "$EXT_DIR/menu.json" root@"$KINDLE_IP":/mnt/us/extensions/kindle-dash/
scp "$EXT_DIR/bin/"*.sh root@"$KINDLE_IP":/mnt/us/extensions/kindle-dash/bin/
scp "$EXT_DIR/etc/kindle-dash.conf" root@"$KINDLE_IP":/mnt/us/extensions/kindle-dash/etc/

# Make scripts executable
ssh root@"$KINDLE_IP" "chmod +x /mnt/us/extensions/kindle-dash/bin/*.sh"

echo "Installation complete. Edit /mnt/us/extensions/kindle-dash/etc/kindle-dash.conf on the Kindle to set SERVER_URL and TOKEN."
echo "Then restart KUAL to see the Dashboard menu."
