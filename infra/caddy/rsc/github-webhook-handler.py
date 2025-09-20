#!/usr/bin/env python3
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

"""GitHub Webhook Handler for GitHub App

It listens to workflow_run that complete successfully, then run upload-server.py.
"""

import argparse
import json
import os
import subprocess
import sys


def run(payload, args):
    if args.event != "workflow_job":
        print(f"ignoring event {args.event}", file=sys.stderr)
        return 0
    if payload["action"] != "completed":
        print(f'ignoring action {payload["action"]}', file=sys.stderr)
        return 0
    wf = payload["workflow_job"]
    if wf["conclusion"] != "success":
        print(f'ignoring conclusion {wf["conclusion"]}', file=sys.stderr)
        return 0
    if wf["head_branch"] != "main":
        print(f'ignoring branch {wf["head_branch"]}', file=sys.stderr)
        return 0
    install_id = payload["installation"]["id"]
    job_id = wf["id"]
    run_id = wf["run_id"]
    print(f"Running install for {run_id} / {job_id}", file=sys.stderr)
    # Asynchronously start a subprocess. GitHub webhooks must be extremely fast.
    with open("../logs/update-server.log", "a") as f:
        subprocess.Popen(
            [
                sys.executable,
                "update-server.py",
                "--app-id",
                args.app_id,
                "--private-key",
                args.private_key,
                "--extract-dir",
                args.extract_dir,
                "--install-id",
                str(install_id),
                "--run-id",
                str(run_id),
                "--job-id",
                str(job_id),
            ],
            stdout=f,
            stderr=f,
        )
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--app-id",
        default=os.environ.get("HTTP_X_GITHUB_HOOK_INSTALLATION_TARGET_ID", ""),
        help="GitHub App ID, a number as a string",
    )
    parser.add_argument(
        "--event",
        default=os.environ.get("HTTP_X_GITHUB_EVENT", ""),
        help="GitHub event, e.g. 'push'",
    )
    parser.add_argument(
        "--private-key",
        default="private-key.pem",
        help="GitHub Apps' private key generated from the web UI",
    )
    parser.add_argument("--extract-dir", required=True, help="Directory to extract to")
    args = parser.parse_args()
    payload = json.load(sys.stdin)
    ret = run(payload, args)
    resp = '{"ok": true}'
    sys.stdout.write("Content-type: application/json\n")
    sys.stdout.write(f"Content-Length: {len(resp)}\n\n")
    sys.stdout.write(resp)
    return ret


if __name__ == "__main__":
    sys.exit(main())
