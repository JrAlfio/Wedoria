# Pre-Launch Checklist

## Security

- [ ] API_KEY is set in backend .env and not empty.
- [ ] GMAIL_APP_PASSWORD is set in backend .env (not in source files).
- [ ] ALLOWED_ORIGINS includes production domain(s) only.
- [ ] backend-example/.env is not committed to git.
- [ ] HTTPS is enabled and HTTP redirects to HTTPS.

## Infrastructure

- [ ] DNS A records point to VPS IP for @ and www.
- [ ] Nginx config test passes: sudo nginx -t
- [ ] Node backend process is online in PM2.
- [ ] PM2 startup persistence is configured.

## Application

- [ ] Frontend loads without console errors.
- [ ] /health returns {"ok":true} through public domain.
- [ ] Guest access validation works.
- [ ] RSVP save flow works.
- [ ] Contact request flow works.
- [ ] RSVP email notification is delivered.

## Data

- [ ] data/rsvp-submissions.json is writable by backend user.
- [ ] data/invite-content.json persists edits from Invite Editor.
- [ ] Backup plan exists for data folder.

## Final QA

- [ ] Mobile layout checked on iOS and Android.
- [ ] Desktop layout checked on Chrome and Safari.
- [ ] Form validation messages are user-friendly.
- [ ] No mixed-content warnings in browser.
