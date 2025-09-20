#!/usr/bin/env python3
# Copyright 2025 Marc-Antoine Ruel. All rights reserved.
# Use of this source code is governed under the Apache License, Version 2.0
# that can be found in the LICENSE file.

"""Download a new server.

It downloads the "server-package" artifact and extracts it.
"""

import argparse
import datetime
import io
import jwt
import logging
import os
import shutil
import subprocess
import sys
import zipfile

import requests


class GitHubClient:
    def __init__(self, app_id, private_key_path, installation_id):
        self._app_id = app_id
        self._installation_id = installation_id
        self._access_token = None
        self._expired_at = None
        with open(private_key_path, "r") as f:
            self._private_key = f.read()

    def _generate_jwt(self):
        """Generate JWT for GitHub App authentication"""
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            "iat": int(now.timestamp()),
            "exp": int((now + datetime.timedelta(minutes=10)).timestamp()),
            "iss": self._app_id,
        }
        return jwt.encode(payload, self._private_key, algorithm="RS256")

    def get_access_token(self):
        """Get installation access token"""
        exp = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
            minutes=1
        )
        if not self._expired_at or self._expired_at < exp:
            headers = {
                "Authorization": f"Bearer {self._generate_jwt()}",
                "Accept": "application/vnd.github.v3+json",
            }
            response = requests.post(
                f"https://api.github.com/app/installations/{self._installation_id}/access_tokens",
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            self._access_token = data["token"]
            self._expires_at = datetime.datetime.fromisoformat(
                data["expires_at"].replace("Z", "+00:00")
            )
        return self._access_token

    def get_json(self, url, params=None):
        headers = {
            "Authorization": f"token {self.get_access_token()}",
            "Accept": "application/vnd.github.v3+json",
        }
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_raw(self, url, params=None):
        headers = {"Authorization": f"token {self.get_access_token()}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response


def rmtree(p):
    # Make everything writeable
    for root, dirs, files in os.walk(p):
        for d in dirs:
            os.chmod(os.path.join(root, d), 0o777)
        for f in files:
            os.chmod(os.path.join(root, f), 0o666)
    shutil.rmtree(p)


def extract_node_zip(zip_bytes, target_dir, npm_install=False):
    """Downloads into .new, then renames then old to .old and then replace with .new, then clean up.

    It marks everything as read-only.
    """
    # TODO: We should have A/B partitioning, so the flipping is unnecessary.
    new = target_dir + ".new"
    old = target_dir + ".old"
    if os.path.exists(old):
        rmtree(old)
    if os.path.exists(new):
        rmtree(new)
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        for member in zf.namelist():
            if member.endswith("/"):
                continue
            safe_name = member.replace("\\", "/").lstrip("/")
            if ".." in safe_name.split("/"):
                raise ValueError(f"Unsafe path detected: {member}")
            dest_path = os.path.join(new, safe_name)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            with open(dest_path, "wb") as f:
                f.write(zf.read(member))
    # Make everything read-only
    for root, dirs, files in os.walk(new):
        for f in files:
            os.chmod(os.path.join(root, f), 0o444)
        for d in dirs:
            os.chmod(os.path.join(root, d), 0o555)
    # Flip the directories then cleanup.
    if os.path.exists(target_dir):
        os.rename(target_dir, old)
    os.rename(new, target_dir)

    if npm_install:
        # Keep around old node_modules (for speed), and make sure everything is installed.
        # I'm not super happy about this code:
        old_node = os.path.join(old, "node_modules")
        if os.path.exists(old_node):
            os.rename(old_node, os.path.join(target_dir, "node_modules"))

        # Always install. It takes a while (25s at the moment on the VM) but we don't want random breakage.
        logging.info("Running npm")
        env = os.environ.copy()
        # We depend on the symlinks in ~/rsc.
        env["PATH"] = env["PATH"] + ":" + os.path.expanduser("~/rsc")
        subprocess.check_call(
            [
                "npm",
                "install",
                "--no-fund",
                "--no-audit",
                "--production",
                "--no-progress",
            ],
            cwd=target_dir,
            env=env,
        )

    logging.info("Running systemctl restart webserver")
    # Our environment variables are stripped from the context of the cgi webhook.
    env = os.environ.copy()
    if "XDG_RUNTIME_DIR" not in env:
        env["XDG_RUNTIME_DIR"] = f"/run/user/{os.getuid()}"
    if "DBUS_SYSTEM_BUS_ADDRESS" not in env:
        env["DBUS_SYSTEM_BUS_ADDRESS"] = "unix:path=" + env["XDG_RUNTIME_DIR"] + "/bus"
    subprocess.check_call(["systemctl", "--user", "restart", "webserver"], env=env)

    # Cleanup.
    logging.info("cleanup")
    if os.path.exists(old):
        rmtree(old)
    logging.info("Done")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--app-id", required=True, help="GitHub App ID, a number as a string"
    )
    parser.add_argument(
        "--private-key",
        default="private-key.pem",
        help="GitHub Apps' private key generated from the web UI",
    )
    parser.add_argument("--extract-dir", required=True, help="Directory to extract to")
    parser.add_argument("--install-id", required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--artifact-name", default="server-package")
    parser.add_argument(
        "--log-file", default=os.path.expanduser("~/logs/update-server.log")
    )
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s %(process)d %(levelname)s %(message)s",
        filename=args.log_file,
    )
    try:
        client = GitHubClient(args.app_id, args.private_key, args.install_id)
        # We assume we have only one job that archives only one package.
        # TODO: Filter on the job ID.
        url = f"https://api.github.com/repos/wapidou/webserver/actions/runs/{args.run_id}/artifacts"
        for pkg in client.get_json(url)["artifacts"]:
            if pkg["name"] != args.artifact_name:
                continue
            zip_url = pkg["archive_download_url"]
            logging.info(f"Downloading: {zip_url}")
            # This assumes the zip fits memory to save on I/O.
            extract_node_zip(client.get_raw(zip_url).content, args.extract_dir)
        return 0
    except Exception as e:
        logging.error(f"Error: {str(e)}")
        logging.error(f"args: {args}")
        logging.error(f"cwd: {os.getcwd()}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
