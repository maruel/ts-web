#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

# Install node systemd server as user.

set -eu
cd "$(dirname $0)"

if [ ! -s /home/ubuntu/rsc/node ]; then
	ln -s $(which node) /home/ubuntu/rsc/node
fi
if [ ! -s /home/ubuntu/rsc/npm ]; then
	ln -s $(which npm) /home/ubuntu/rsc/npm
fi

mkdir -p ~/.config/systemd/user
if [ -f webserver_secrets.env ]; then
	mv webserver_secrets.env ~/.config/systemd/user
fi
if [ -f webserver.service ]; then
	mv webserver.service ~/.config/systemd/user
	systemctl --user daemon-reload
fi
systemctl --user enable webserver
systemctl --user start webserver
journalctl --user --no-hostname --no-pager -n 20 -u webserver.service
