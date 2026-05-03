# Deployment Path Comparison

Your domain: **wedoria.co**
Sender email: **Wedoria@gmail.com**
Frontend: GoDaddy cPanel/shared hosting
Backend: Choose below

---

## Path A: Render (Managed Cloud) ✅ RECOMMENDED

**Effort:** 15 minutes
**Cost:** Free tier available (with limits)
**Complexity:** Click buttons in Render dashboard

### What happens

1. Push code to Git
2. Render auto-deploys (no server management)
3. Point GoDaddy DNS to Render
4. Done

### Step-by-step

1. Open [deploy/RENDER_DEPLOY.md](RENDER_DEPLOY.md)
2. Follow steps 1-8
3. Your site runs on GoDaddy frontend + Render backend

### Pros

- No server management
- Auto SSL/HTTPS
- Auto scaling
- Simple rollbacks
- Render handles monitoring

### Cons

- Free tier sleeps after 15 mins (upgrade costs ~$7/month)
- Limited data transfer (100GB/month on free)
- Dependent on Render uptime

---

## Path B: GoDaddy VPS (Self-Hosted)

**Effort:** 45 minutes
**Cost:** ~$5-10/month VPS rental
**Complexity:** Run commands on server

### What happens

1. Rent VPS from GoDaddy
2. SSH into server, run install scripts
3. PM2 manages Node process
4. Nginx reverse proxies /api to Node
5. Certbot handles SSL

### Step-by-step

1. Rent GoDaddy VPS (Windows or Linux)
2. Open [deploy/GODADDY_VPS_DEPLOY.md](GODADDY_VPS_DEPLOY.md)
3. Follow steps 1-10
4. Everything runs on your VPS

### Pros

- Full control
- No rate limits (set your own)
- No sleep issues
- Cheaper long-term for high traffic
- Keep all data on your own server

### Cons

- Server management (updates, monitoring)
- You handle SSL renewal
- More complex debugging
- On-call for issues

---

## My recommendation

**Use Render** for your wedding site because:
1. Wedding is time-sensitive event (need it working now)
2. Traffic is predictable (50-500 guests)
3. Render free tier is enough
4. Zero server ops (focus on wedding, not DevOps)
5. Auto-scales if you go viral somehow

**Use VPS** only if:
1. You want to host everything yourself
2. You plan to reuse the VPS for other projects
3. You need always-on (no cold-start issues)
4. You're comfortable with server management

---

## Current status

✅ Code hardened (secrets in env vars)
✅ All configs updated for Wedoria.co
✅ Both deploy guides ready

**Next action:** Pick Render or VPS and open the corresponding guide.
