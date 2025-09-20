# Caddy

This is the reverse proxy. It handles HTTPS termination using LetsEncrypt TLS certificates.

## Things to update

- `example.com` to your domain name
- `<your_org>` to your GitHub org name
- keys in env files

## GitHub Apps

- Go to the organization GitHub Apps page. `https://github.com/organizations/<your_org>/settings/apps`
- New GitHub App
    - Name: caddy server node update
    - Homepage: `https://example.com`
    - Callback URL: `https://<your_domain>/webhook/github`
    - Permissions:
        - Actions: Read-only
        - Contents: Read-only
        - Metadata: Read-only (by default)
    - Events:
        - Workflow run
    - `https://github.com/organizations/<your_org>/settings/apps/caddy-server-node-update#private-key`
- Install App
    - For selected repositories: webserver
