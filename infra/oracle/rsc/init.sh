#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

set -eu
cd "$(dirname $0)"

sudo apt-get update
sudo apt-get upgrade -y

# Reduce background services. This kills oracle-cloud-agent.
if [ -f /etc/init.d/unattended-upgrades ]; then
	sudo DEBIAN_FRONTEND=noninteractive dpkg-reconfigure unattended-upgrades
fi
sudo apt-get remove -y --purge modemmanager snapd unattended-upgrades
sudo apt-get autoremove -y

sudo apt-get install -y --no-install-recommends ca-certificates curl git gnupg less rsync tmux
cp .tmux.conf ~/.tmux.conf

echo "- Disable unnecessary services: fwupd and udisks2"
sudo systemctl stop fwupd fwupd-refresh fwupd-refresh.timer
sudo systemctl disable fwupd fwupd-refresh fwupd-refresh.timer
sudo systemctl stop udisks2.service
sudo systemctl disable udisks2.service

function install_docker {
	echo "- Install docker"
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
	sudo chmod a+r /etc/apt/keyrings/docker.gpg
	echo \
	  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
	  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
	  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
	sudo apt-get update -y
	sudo apt-get install --no-install-recommends -y docker-ce docker-ce-cli docker-compose-plugin
	sudo usermod -aG docker $USER
}

if ! which podman &> /dev/null; then
	echo "- Install podman"
	sudo apt-get -y install podman
fi

# Neovim; do it system wide so it can be used in sudo.
if [ ! -d /opt/bin/nvim ]; then
	echo "- Install latest Neovim"
	ARCH=$(uname -m | sed s/aarch64/arm64/)
	curl -sSL -o- https://github.com/neovim/neovim/releases/latest/download/nvim-linux-${ARCH}.tar.gz | sudo tar xz -C /opt --strip-component=1
	if [ ! -f /usr/local/bin/nvim ]; then
		sudo ln -s /opt/bin/nvim /usr/local/bin/nvim
	fi
	if [ ! -f /usr/local/bin/vim ]; then
		sudo ln -s /opt/bin/nvim /usr/local/bin/vim
	fi
	if [ ! -f /usr/local/bin/vi ]; then
		sudo ln -s /opt/bin/nvim /usr/local/bin/vi
	fi
fi

echo "- Allow user-local systemd services for $USER"
mkdir -p $HOME/.config/systemd/user
sudo loginctl enable-linger $USER

if [ -f ./open_ports.sh ]; then
	echo "- Install open_ports.sh"
	sudo mkdir -p /opt/bin
	sudo mv open_ports.sh /opt/bin
	sudo chown root:root /opt/bin/open_ports.sh
	sudo chmod 755 /opt/bin/open_ports.sh
fi

if [ -f ./open_ports.service ]; then
	echo "- Install open_ports.service"
	sudo mkdir -p /etc/systemd/system
	sudo mv open_ports.service /etc/systemd/system
	sudo chown root:root /etc/systemd/system/open_ports.service
	sudo chmod 644 /etc/systemd/system/open_ports.service
	sudo systemctl daemon-reload
	sudo systemctl enable open_ports
	sudo systemctl start open_ports
fi

# Go, probably unnecessary.
if [ ! -f /usr/local/go/bin/go ]; then
	GO_VERSION=1.25.0
	echo "- Install Go $GO_VERSION"
	ARCH=$(uname -m | sed s/aarch64/arm64/ | sed s/x86_64/amd64/)
	curl -sSL -o- https://go.dev/dl/go${GO_VERSION}.linux-${ARCH}.tar.gz | sudo tar -C /usr/local -xzf -
	echo PATH="/usr/local/go/bin:\${HOME}/go/bin:\${PATH}" | sudo tee /etc/profile.d/wapidou.sh
fi


# Caddy. Pro-tip: prebuild on the host so it doesn't have to be built on a small server.
./caddy_update.sh

./node_setup.sh
./node_setup_systemd.sh
