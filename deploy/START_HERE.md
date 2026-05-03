# 🎯 Your Deployment Checklist (Wedoria.co + Render)

**Status:** Code hardened ✅ | Configs ready ✅ | Deployment guides ready ✅

---

## Before you deploy

### 1. Get Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** and **Windows (or other device)**
3. Generate 16-char password (copy without spaces)
4. Paste into [backend-example/.env](../backend-example/.env) line 16

**Important:** This password in .env is NOT safe on your local machine. After deployment:
- Delete [backend-example/.env](../backend-example/.env) from your computer
- Keep it ONLY in Render dashboard

### 2. Verify .env is correct

Check [backend-example/.env](../backend-example/.env):

```
✓ ALLOWED_ORIGINS=https://wedoria.co,https://www.wedoria.co
✓ SENDER_EMAIL=Wedoria@gmail.com
✓ RECIPIENT_EMAIL=Wedoria@gmail.com
✓ WEBSITE_URL=https://wedoria.co
✓ GMAIL_APP_PASSWORD=<your 16 chars>
✓ API_KEY=adab860753eb05e4513e9f97b7d9ed76d8850fc52090ac43c276518e487f7f1f
```

---

## Deployment (Choose one path)

### PATH A: Render (15 mins) ← RECOMMENDED

1. Open [deploy/RENDER_DEPLOY.md](../deploy/RENDER_DEPLOY.md)
2. Follow steps 1-8
3. You're done

### PATH B: GoDaddy VPS (45 mins)

1. Open [deploy/GODADDY_VPS_DEPLOY.md](../deploy/GODADDY_VPS_DEPLOY.md)
2. Follow steps 1-10
3. You're done

---

## After deployment

### Quick test

Open https://wedoria.co in browser and verify:
- [ ] Page loads without errors
- [ ] Guest access gate appears
- [ ] Can enter guest name
- [ ] RSVP form appears
- [ ] Can submit RSVP
- [ ] Email arrives at Wedoria@gmail.com
- [ ] Network tab shows /api calls working (not 401/403)

### Pre-launch checks

See [deploy/PRELAUNCH_CHECKLIST.md](../deploy/PRELAUNCH_CHECKLIST.md)

---

## Files you'll need to look at

**For Render:**
- [deploy/RENDER_DEPLOY.md](../deploy/RENDER_DEPLOY.md) ← start here
- [backend-example/.env](../backend-example/.env) ← update GMAIL_APP_PASSWORD
- [config.js](../config.js) ← will update with Render URL after deployment

**For VPS:**
- [deploy/GODADDY_VPS_DEPLOY.md](../deploy/GODADDY_VPS_DEPLOY.md) ← start here
- [backend-example/.env](../backend-example/.env) ← already updated
- [deploy/nginx-withjoy.conf](../deploy/nginx-withjoy.conf) ← reference only
- [backend-example/ecosystem.config.cjs](../backend-example/ecosystem.config.cjs) ← reference only

**Either path:**
- [deploy/DEPLOYMENT_PATHS.md](../deploy/DEPLOYMENT_PATHS.md) ← compare both approaches
- [deploy/PRELAUNCH_CHECKLIST.md](../deploy/PRELAUNCH_CHECKLIST.md) ← final QA

---

## Troubleshooting

**RSVP emails not sending?**
- Check Gmail app password is correct (not "testing")
- Verify 2-step verification is enabled on Gmail account
- Check Render/VPS logs for SMTP errors

**Guest access returning 401?**
- Check API_KEY in Render/VPS env matches [backend-example/.env](../backend-example/.env)
- Check ALLOWED_ORIGINS includes your domain

**CORS errors in browser?**
- Check Render/VPS dashboard env vars are correct
- May need to redeploy after changing env

**DNS not working?**
- Wait 30+ minutes for GoDaddy DNS to propagate
- Check with: `nslookup api.wedoria.co` (for Render subdomain)

---

## Questions before you start?

**Did you choose Render?** Yes → Open [deploy/RENDER_DEPLOY.md](../deploy/RENDER_DEPLOY.md)

**Did you choose VPS?** Yes → Open [deploy/GODADDY_VPS_DEPLOY.md](../deploy/GODADDY_VPS_DEPLOY.md)

**Still unsure?** Read [deploy/DEPLOYMENT_PATHS.md](../deploy/DEPLOYMENT_PATHS.md)

---

**Go live! 🚀**
