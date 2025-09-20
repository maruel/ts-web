#!/bin/bash
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

# Reload the config for a running caddy server without shutting it down.

set -eu
sudo systemctl reload caddy

echo "Run:"
echo "sudo journalctl -n 20 -u caddy"
