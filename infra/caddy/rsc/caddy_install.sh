#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

# Install caddy in /opt/bin and as a systemd service.

set -eu
cd "$(dirname $0)"

if [ ! -f ./caddy ]; then
	./caddy_build.sh
fi
VERSION="$(./caddy version | cut -f 1 -d ' ')"

DEST="/opt/bin/caddy_${VERSION}"
if [ ! -f $DEST ]; then
	echo "- Installing as $DEST"
	sudo mkdir -p $(dirname $DEST)
	sudo cp caddy "$DEST"
	sudo setcap 'cap_net_bind_service=+ep' "$DEST"
	sudo rm -f /usr/local/bin/caddy
	sudo ln -s $DEST /usr/local/bin/caddy
fi

if [ ! -f /etc/sysctl.d/99-caddy.conf ]; then
	echo "- Increasing maximum buffer size"
	echo "  https://github.com/quic-go/quic-go/wiki/UDP-Buffer-Sizes"
	sudo sysctl -w net.core.rmem_max=7500000
	sudo sysctl -w net.core.wmem_max=7500000
	cat <<EOF | sudo tee /etc/sysctl.d/99-caddy.conf
# Source: maruel
net.core.rmem_max=7500000
net.core.wmem_max=7500000
EOF
fi

sudo mkdir -p /etc/caddy
if [ -f ./caddy_secrets.env ]; then
	echo "- Moving ./caddy_secrets.env to /etc/caddy/caddy_secrets.env"
	sudo mv ./caddy_secrets.env /etc/caddy/caddy_secrets.env
	sudo chown root:root /etc/caddy/caddy_secrets.env
	sudo chmod 600 /etc/caddy/caddy_secrets.env
fi

if [ -f ./Caddyfile ]; then
	echo "- Moving ./Caddyfile to /etc/caddy/Caddyfile"
	sudo mv ./Caddyfile /etc/caddy/Caddyfile
	sudo chown root:root /etc/caddy/Caddyfile
	sudo chmod 644 /etc/caddy/Caddyfile
fi

if [ -f ./*.conf ]; then
	echo "- Moving ./*.conf to /etc/caddy"
	sudo mv ./*.conf /etc/caddy
	sudo chown root:root /etc/caddy/*.conf
	sudo chmod 644 /etc/caddy/*.conf
fi

if [ -f ./caddy.service ]; then
	echo "- Updating /etc/systemd/system/caddy.service"
	sudo mv caddy.service /etc/systemd/system/caddy.service
	sudo chown root:root /etc/systemd/system/caddy.service
	sudo chmod 644 /etc/systemd/system/caddy.service
	sudo systemctl daemon-reload
fi

echo "- Restarting caddy"
sudo systemctl enable caddy.service
sudo systemctl restart caddy.service
sudo journalctl --no-hostname --no-pager -n 20 -u caddy.service
