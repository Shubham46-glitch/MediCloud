# HTTPS and reverse proxy on EC2

> **Verification status:** No EC2 host, Nginx configuration, DNS record, certificate, certificate issuer, or renewal task was inspected. This document is a verification and reproduction checklist; it does not claim a current TLS implementation.

## A. Purpose

The deployment context describes Nginx as a reverse proxy in front of the Express API. The browser should call the API over HTTPS. The backend defaults to port 5000; keep it local/private when a reverse proxy is used. The repository contains no Nginx site file, systemd/PM2 configuration, or certificate automation.

## B. Prerequisites

- Confirmed EC2 instance, OS, domain name, DNS ownership, static address strategy, and backend bind address.
- Security group and host firewall rules approved for intended public ports. Common pattern is 443 and possibly 80 for redirect or certificate validation; this is not a verified MediCloud rule.
- Choose and document an approved certificate authority/issuance and renewal process. Do not assume Certbot or automatic renewal.
- Backend is installed and passes a local health check before proxy configuration.

## C. Inspect existing host

Connect through the approved administration path, then inspect without exposing private key contents:

```bash
nginx -t
systemctl status nginx
sudo nginx -T
sudo ss -ltnp
curl -i http://127.0.0.1:5000/api/health
```

`nginx -T` may print configuration values; review/redact output before sharing. Identify upstream host/port, enabled server blocks, certificate file paths, HTTP/HTTPS listeners, and renewal timer/service. Record only safe paths and metadata. If these commands are unavailable, mark the host setup unknown.

## D. Reproduction workflow (not historical selections)

1. Install Nginx using the OS-supported package manager after confirming the distribution and patch policy.
2. Create a site/server block for the approved API hostname. Configure the upstream to the local Express listener (typically `127.0.0.1:5000` if the process binds locally); retain standard forwarding headers and request IDs as appropriate.
3. Configure the backend CORS origin to match the exact frontend origin. Keep the API listener inaccessible from public ingress.
4. Obtain and install a certificate using the chosen, owner-approved certificate mechanism. Record issuer, hostname, expiry, safe certificate paths, renewal command/timer, and contact/owner after verification.
5. Configure HTTPS listener and approved redirect behavior. Do not copy certificate/key material into the repository.
6. Run `sudo nginx -t`; only after it passes, reload Nginx with `sudo systemctl reload nginx`.
7. Verify local upstream and public `https://<api-host>/api/health`, hostname match, chain, expiry, and browser mixed-content behavior.

No exact config directive set, certificate command, or renewal interval can be specified as the existing configuration because none is available to inspect.

## E. Verification and common errors

| Check | Command / evidence | Common correction |
|---|---|---|
| Nginx syntax | `sudo nginx -t` | Fix reported file/line before reload |
| Upstream health | `curl -i http://127.0.0.1:5000/api/health` | Start backend and align proxy target/port |
| Listener exposure | `sudo ss -ltnp` plus EC2 security group | Bind backend locally/private; remove public port 5000 ingress |
| TLS hostname/expiry | `openssl s_client -connect <host>:443 -servername <host> </dev/null` | Install correct full chain/certificate and verify renewal |
| Public endpoint | `curl -i https://<api-host>/api/health` | Check DNS, address association, security group, Nginx, and certificate |
| Renewal | Inspect actual timer/service and run documented dry run if supported | Establish monitored renewal; do not assume it exists |

Certificate expiry can also be checked with:

```bash
echo | openssl s_client -servername <api-host> -connect <api-host>:443 2>/dev/null | openssl x509 -noout -enddate
```

Do not reload Nginx until configuration tests pass. Keep private key permissions restrictive and never include keys in docs/logs.
