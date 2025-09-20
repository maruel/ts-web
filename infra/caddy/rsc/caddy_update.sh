#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

# Forcefully update the caddy binary.

set -eu
cd "$(dirname $0)"

if [ -f caddy ]; then
  rm caddy
fi

./caddy_build.sh
go clean -cache -testcache -modcache
./caddy_install.sh
