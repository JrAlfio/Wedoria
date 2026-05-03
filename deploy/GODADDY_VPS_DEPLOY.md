# Render Cloud Deployment (Recommended)

For managed backend hosting on Render (not VPS), see RENDER_DEPLOY.md.
This file is kept for reference if you choose GoDaddy VPS later.

---

# GoDaddy VPS Deployment Runbook (Alternative)

This runbook deploys frontend + backend on one GoDaddy VPS using:
- Nginx (public web server)
- Node.js backend on localhost:8787
- PM2 process manager
- SSL via Certbot

Assumed domain in this file: wedoria.co

If your actual domain is different, replace:
- wedoria.co
- www.wedoria.co

## 1) GoDaddy DNS records

In GoDaddy DNS Management, create/update:

1. Type: A
   Name: @
   Value: <YOUR_VPS_PUBLIC_IP>
   TTL: 600

2. Type: A
   Name: www
   Value: <YOUR_VPS_PUBLIC_IP>
   TTL: 600

Wait for propagation (usually 5-30 minutes, sometimes longer).

## 2) Upload project to VPS

Upload project files to:
- /var/www/withjoy

Required files include:
- index.html
- styles.css
- app.js
- config.js
- backend-example/*
- deploy/nginx-withjoy.conf

## 3) VPS package install

Run on VPS:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 4) Backend setup

```bash
cd /var/www/withjoy/backend-example
npm install
cp .env.example .env
```

Edit .env and set at minimum:
- API_KEY
- ALLOWED_ORIGINS
- RECIPIENT_EMAIL
- SENDER_EMAIL
- GMAIL_APP_PASSWORD
- WEBSITE_URL

Note: current backend email transport uses Gmail service. SENDER_EMAIL should be a Gmail account with App Password enabled.

## 5) Start backend with PM2

```bash
cd /var/www/withjoy/backend-example
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Verify:

```bash
curl http://127.0.0.1:8787/health
```

Expected:

```json
{"ok":true}
```

## 6) Nginx config

```bash
sudo cp /var/www/withjoy/deploy/nginx-withjoy.conf /etc/nginx/sites-available/withjoy
sudo ln -sf /etc/nginx/sites-available/withjoy /etc/nginx/sites-enabled/withjoy
sudo nginx -t
sudo systemctl reload nginx
```

## 7) Frontend runtime config

For same-origin VPS setup, keep this in config.js:

```js
window.WITHJOY_CONFIG = {
  apiBaseUrl: ""
};
```

This makes frontend call /api/* on the same domain.

## 8) Enable HTTPS

```bash
sudo certbot --nginx -d everafter.com -d www.everafter.com
```

Choose redirect to HTTPS when prompted.

## 9) Smoke tests

Run from your local machine:

```bash
curl -I https://everafter.com
curl https://everafter.com/health
```

Open in browser and verify:
- guest access works
- RSVP submit works
- contact form works
- email notifications arrive

## 10) Post-launch checks

```bash
pm2 status
pm2 logs withjoy-api --lines 100
sudo systemctl status nginx
```

If backend fails:
- check /var/www/withjoy/backend-example/.env
- confirm Gmail App Password is valid
- confirm firewall allows ports 80 and 443
