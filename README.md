# Wedding RSVP Invite (WithJoy-inspired)

A wedding invitation site with:
- Guest access gate
- RSVP form
- Family RSVP support
- Optional invite editor
- Optional backend API for persistence + email notifications

## Security changes applied

This project has been tightened for production:
- Removed hardcoded API key and Gmail app password from source code.
- Backend now reads secrets from environment variables.
- Added request body size limits.
- Added basic IP rate limiting for public endpoints.
- Added stricter CORS handling with allowlist support.
- Added secure HTTP response headers in backend.
- Added frontend CSP meta policy.
- Added runtime API config in [config.js](config.js).

## Local run (frontend only)

```bash
cd "/Users/terencechia/Desktop/WithJoy Project Live"
python3 -m http.server 5500
```

Open http://localhost:5500.

## Local run (backend)

```bash
cd "/Users/terencechia/Desktop/WithJoy Project Live/backend-example"
npm install
cp .env.example .env
# edit .env with your values
node guest-check-server.js
```

## Backend environment variables

Copy [backend-example/.env.example](backend-example/.env.example) to `.env` and fill values.

Required for email features:
- `RECIPIENT_EMAIL`
- `SENDER_EMAIL`
- `GMAIL_APP_PASSWORD`

Recommended for production:
- `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`
- `API_KEY=<long-random-string>`

## Deploy to production (wedoria.co)

**For managed backend (Recommended):** Open [deploy/RENDER_DEPLOY.md](deploy/RENDER_DEPLOY.md)
- Render hosts Node backend (free tier available)
- GoDaddy hosts frontend
- Zero server management

**For VPS backend (Alternative):** Open [deploy/GODADDY_VPS_DEPLOY.md](deploy/GODADDY_VPS_DEPLOY.md)
- GoDaddy VPS hosts everything
- Full control, more setup required

**Compare both approaches:** [deploy/DEPLOYMENT_PATHS.md](deploy/DEPLOYMENT_PATHS.md)

All configs are ready for **wedoria.co** with sender **Wedoria@gmail.com**.

Update [backend-example/.env](backend-example/.env) before deploying:
- Set `GMAIL_APP_PASSWORD` to your actual 16-character Gmail app password
- `API_KEY`, `ALLOWED_ORIGINS`, and domain are pre-configured

## Important production notes

- Never store Gmail app password or API keys in [app.js](app.js), [index.html](index.html), or [config.js](config.js).
- Keep secrets only in backend environment variables (stored in [backend-example/.env](backend-example/.env) or Render dashboard).
- Always use HTTPS in production.
- Rotate Gmail app passwords periodically (current one may have been exposed in old source).
