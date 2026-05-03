# Deploy to Render (Managed Backend Hosting)

**Render** is a managed platform. No PM2, Nginx, or certbot needed—Render handles it all.

**Domain:** wedoria.co

## 1) Prepare Git repository

Render deploys from Git. Create a repo with your project:

```bash
cd /Users/terencechia/Desktop/WithJoy\ Project\ Live
git init
git add -A
git commit -m "Initial commit"
```

Or, if already in git:

```bash
git add .
git commit -m "Production config for Render"
git push origin main
```

Push to GitHub, GitLab, or Gitea. (If not using Git yet, create a GitHub account and push there.)

## 2) Create Render Web Service

1. Go to https://dashboard.render.com
2. Sign up (free account)
3. Click **New** → **Web Service**
4. Connect your Git repo
5. Fill in:
   - **Name:** withjoy-api
   - **Runtime:** Node
   - **Root Directory:** backend-example
   - **Build Command:** `npm install`
   - **Start Command:** `node guest-check-server.js`
6. Click **Create Web Service**

Render will auto-deploy and give you a URL like:
`https://withjoy-api-xxxxx.onrender.com`

## 3) Set environment variables in Render

In Render dashboard, go to **Environment** and add:

```
PORT=8787
ALLOWED_ORIGINS=https://wedoria.co,https://www.wedoria.co
API_KEY=adab860753eb05e4513e9f97b7d9ed76d8850fc52090ac43c276518e487f7f1f
MAX_BODY_SIZE_BYTES=1048576
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
RECIPIENT_EMAIL=Wedoria@gmail.com
SENDER_EMAIL=Wedoria@gmail.com
SENDER_NAME=Terence & Shanice Wedding
WEBSITE_URL=https://wedoria.co
GMAIL_APP_PASSWORD=<YOUR_REAL_16_CHAR_PASSWORD>
```

**Important:** Replace `GMAIL_APP_PASSWORD` with your actual Gmail app password (16 chars, no spaces).

## 4) Verify backend is live

```bash
curl https://withjoy-api-xxxxx.onrender.com/health
```

Should return:
```json
{"ok":true}
```

## 5) Update frontend config

Edit [config.js](../config.js):

```js
window.WITHJOY_CONFIG = {
  apiBaseUrl: "https://withjoy-api-xxxxx.onrender.com"
};
```

Replace `xxxxx` with your actual Render service name.

## 6) Connect custom domain to Render

In Render dashboard, **Settings** → **Custom Domains** → Add domain.

You'll get a CNAME target. In GoDaddy DNS:

1. Go to **DNS Management** for wedoria.co
2. For subdomain `api`:
   - Type: CNAME
   - Name: api
   - Value: [Render CNAME target]
   - TTL: 600

OR, skip the subdomain and point root `@` to Render (Render supports root domains too).

Wait for DNS propagation (5-30 mins).

## 7) Upload frontend to GoDaddy

In GoDaddy cPanel:

1. **File Manager** → **public_html**
2. Upload:
   - index.html
   - styles.css
   - app.js
   - config.js (with updated apiBaseUrl)

Do **not** upload backend folder or .env files.

## 8) Final checks

1. Open https://wedoria.co in browser
2. Guest access should work
3. RSVP submit should call your Render backend
4. Check browser Network tab for /api requests (should be to Render URL)
5. Submit RSVP and verify email arrives

## Troubleshooting

**Backend errors?**
- Check Render dashboard **Logs** tab
- Verify env vars are set correctly
- Confirm GMAIL_APP_PASSWORD is valid (not "testing")

**CORS errors?**
- Ensure ALLOWED_ORIGINS in .env includes your GoDaddy domain
- Redeploy Render after env changes

**DNS not resolving?**
- Wait 30+ mins for GoDaddy DNS to propagate
- Use `nslookup api.wedoria.co` to check

## Render free tier limits

- **Free Web Service:** 750 hours/month (always-on free tier uses 730 hrs)
- **Data transfers:** Limited to ~100 GB/month
- **Sleep after 15 min inactivity** (can upgrade to paid for always-on)

For a wedding RSVP site, free tier is usually fine. If you exceed, Render will notify you.
