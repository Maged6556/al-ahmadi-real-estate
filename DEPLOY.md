# Production deployment and recovery

This runbook targets a fresh Ubuntu LTS VPS with Docker Engine and the Docker Compose v2 plugin. Use a DNS name you control; the site and API are exposed only through Nginx on ports 80/443. PostgreSQL, Redis, and the application containers have no public host ports.

## 1. Prepare the host

1. Point the domain's A/AAAA records to the VPS. Allow inbound TCP 22, 80, and 443 in the cloud firewall and host firewall.
2. Install Docker Engine and the Compose v2 plugin from Docker's official repository. Create a non-root deploy account and add it to the `docker` group. Treat Docker access as root-equivalent.
3. Clone this repository to a stable location such as `/opt/al-ahmadi`, and authenticate that host to GHCR with a read-only package token:

   ```sh
   echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u "$GHCR_OWNER" --password-stdin
   ```

4. Create the production environment file and restrict its permissions:

   ```sh
   cd /opt/al-ahmadi
   cp .env.production.example .env
   chmod 600 .env
   ```

   Set `DOMAIN`, `GHCR_OWNER`, and `GHCR_REPOSITORY`. Generate distinct, URL-safe hex secrets for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_ACCESS_SECRET`, and `WEB_REVALIDATION_SECRET`:

   ```sh
   openssl rand -hex 32
   ```

   Set all three Cloudinary credentials. Set a verified Resend `RESEND_API_KEY`, `EMAIL_FROM` on the verified sender domain, and `WEB_BASE_URL=https://<your-domain>` for account email. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` only for the initial admin seed. Set `BROKER_LICENSE_NUMBER` if the broker registration number should appear in the footer. Never commit `.env` or paste secrets into CI logs.

5. Obtain the TLS certificate before starting the proxy. Install Certbot on the host and run:

   ```sh
   sudo certbot certonly --standalone --agree-tos --non-interactive \
     --email admin@example.com -d example.com
   ```

   Use the real domain and an operational certificate contact. Port 80 must be available during issuance. If using a non-default certificate directory, set `LETSENCRYPT_DIR` in `.env`.

6. Configure a GitHub Actions repository variable `NEXT_PUBLIC_SITE_URL=https://example.com` before the first release. Configure the `production` environment with `DEPLOY_HOST`, `DEPLOY_PORT` (optional), `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY`, and `DEPLOY_KNOWN_HOSTS`. `DEPLOY_PATH` is the checked-out project directory on the VPS. `DEPLOY_KNOWN_HOSTS` must contain the verified SSH host key; do not generate trust-on-first-use keys inside the workflow.

7. Verify the sending domain in Resend and publish the exact SPF, DKIM, and DMARC DNS records Resend provides. Use an aligned `EMAIL_FROM` address and send a verification/reset test before opening registration. Email jobs use BullMQ on Redis with up to five exponential retries; provider failures are logged without logging the recipient's action token or message body.

## 2. First deployment

The CI workflow runs lint, tests, typecheck, formatting, dependency audit, and production builds. After CI succeeds on `main`, the release workflow builds and scans the API and web images, pushes SHA-tagged images to GHCR, and deploys over SSH if the production SSH secrets are configured.

To deploy manually on the VPS, first log in to GHCR and run:

```sh
cd /opt/al-ahmadi
bash scripts/deploy.sh sha-<full-commit-sha>
```

The script pulls both images, starts dependencies, applies committed Prisma migrations from the API container, and waits for API, web, and proxy health checks before recording the active image tag. For initial setup, create the first administrator once:

```sh
docker compose -f docker-compose.prod.yml --profile init run --rm seed
```

Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env` after the seed succeeds. The seed never promotes an existing account or resets its password.

Check service health and logs:

```sh
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api web proxy
curl --fail https://example.com/healthz
```

Renew the certificate through Certbot's system timer. Install a deploy hook so Nginx reloads the renewed certificate:

```sh
sudo certbot renew --deploy-hook \
  'cd /opt/al-ahmadi && docker compose -f docker-compose.prod.yml exec -T proxy nginx -s reload'
```

The proxy serves HTTP only for ACME/health routing and redirects site traffic to HTTPS. HSTS is enabled after TLS termination.

## 3. Application rollback

The deploy script automatically returns to the last healthy application image tag if the new deployment fails its health checks. To roll back manually:

```sh
cd /opt/al-ahmadi
bash scripts/rollback.sh
```

Or specify a known SHA tag: `bash scripts/rollback.sh sha-<full-commit-sha>`. Rollback changes the application images only; it does not reverse database migrations or restore database state. Keep schema migrations backward-compatible with the previous app release and use expand/migrate/contract changes. Take a database backup before any destructive schema operation.

## 4. Database backups

`bash scripts/backup.sh` creates a PostgreSQL custom-format dump in `BACKUP_DIR` (default: `./backups`), writes a SHA-256 sidecar, restricts files to owner-only permissions, and prunes matching local backups older than 30 days. Schedule it daily, for example with a root-owned systemd timer or cron. The backup directory must be on encrypted persistent storage and must be copied to an independent off-site location; local retention is not a disaster-recovery strategy.

Verify backup integrity and restore it into an isolated database without touching the application database:

```sh
RESTORE_DB="al_ahmadi_restore_$(date -u +%Y%m%d%H%M%S)"
export RESTORE_DB
bash scripts/restore.sh ./backups/db-<timestamp>.dump
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U al_ahmadi -d "$RESTORE_DB" \
  -c 'SELECT count(*) FROM "User";'
```

The restore script verifies the adjacent checksum when present, validates the PostgreSQL archive, creates a new database, and refuses to target the live `al_ahmadi` database. It intentionally fails if the restore database already exists. Review the restored record counts and application-level invariants before any recovery cutover. A production database replacement requires a maintenance window, a fresh pre-restore backup, stopping application writes, explicit operator approval, and a tested cutover procedure.

Perform and record a restore drill at least quarterly. Record the backup identifier, checksum result, restore duration, table counts, and any corrective actions without including credentials or personal data in the record.

## 5. Operations

- Database and Redis data live in named Docker volumes. Back up PostgreSQL separately; Redis only stores rate-limit state.
- `GET /healthz` is an API liveness check. `/readyz` checks database and Redis connectivity and is used by container health checks.
- Only the Nginx proxy publishes host ports. Restrict SSH to trusted operators and keep the OS, Docker Engine, and base images patched.
- Review CI dependency audit and Trivy image scan results before each release. Dependabot proposes weekly dependency, Docker base-image, and GitHub Actions updates.
- Use SHA image tags for deploy and rollback; `latest` is informational, not the production deployment pin.
- Account lifecycle and consent data handling are summarized in [DATA-HANDLING.md](./DATA-HANDLING.md). Review all localized legal policy templates with qualified local counsel before launch; they are not legal advice.
