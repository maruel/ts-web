#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

# Install node as user.

set -eu
cd "$(dirname $0)"
cd ./..

if ! which nvm &> /dev/null; then
	# TODO: Update from time to time.
	curl -sSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
	. ~/.nvm/nvm.sh
fi

if ! which node &> /dev/null; then
	nvm install --no-progress node
fi

npm install -g --no-fund --no-audit sqlite3
