#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

set -eu
cd "$(dirname $0)"

# This is before DNS is configured so an IP address is required.

if [ $# -ne 1 ]; then
	echo "Usage: $0 IP" >&2
	exit 1
fi

IP=$1
REMOTE="ubuntu@$IP"

# Make sure ssh works.
ssh $REMOTE "exit 0"

# Send the oracle specific files.
ssh $REMOTE "mkdir -p rsc"
scp rsc/.*.conf $REMOTE:rsc
scp rsc/*.* $REMOTE:rsc

# Send caddy files too. They are not Oracle-specific.
scp ../caddy/rsc/*.* $REMOTE:rsc

# Run the init script.
ssh $REMOTE "./rsc/init.sh"
