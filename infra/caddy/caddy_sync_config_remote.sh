#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

set -eu
cd "$(dirname $0)"
cd ./rsc

if [ $# -ne 1 ]; then
	echo "Usage: $0 REMOTE"
	exit 1
fi

REMOTE=$1
./caddy validate Caddyfile
scp *.conf $REMOTE:rsc
scp *.py $REMOTE:rsc
ssh $REMOTE "sudo systemctl reload caddy && sudo journalctl --no-hostname -f -u caddy"
