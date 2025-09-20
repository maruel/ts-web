#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

# Build caddy with useful plugins.

set -eu
cd "$(dirname $0)"

echo "- Using $(go version)"
echo "- Building caddy with xcaddy"
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
xcaddy build --output caddy \
  --with github.com/abiosoft/caddy-hmac \
  --with github.com/abiosoft/caddy-json-parse \
  --with github.com/abiosoft/caddy-exec \
  --with github.com/aksdb/caddy-cgi/v2 \
  --with github.com/greenpau/caddy-security \
  --with github.com/greenpau/caddy-trace
VERSION="$(./caddy version | cut -f 1 -d ' ')"
