const http = require("http");
const path = require("path");
const fs = require("fs/promises");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT || 8787);
const API_KEY = String(process.env.API_KEY || "").trim();
function normalizeOrigin(rawOrigin) {
  const raw = String(rawOrigin || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.origin;
  } catch {
    return "";
  }
}

const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);
const fallbackOrigins = [
  normalizeOrigin(process.env.WEBSITE_URL || ""),
  normalizeOrigin(process.env.FRONTEND_URL || ""),
  "https://wedoria.onrender.com",
  "https://wedoria.co",
  "https://www.wedoria.co"
].filter(Boolean);
const ALLOWED_ORIGINS = Array.from(new Set([...configuredOrigins, ...fallbackOrigins]));
const MAX_BODY_SIZE_BYTES = Number(process.env.MAX_BODY_SIZE_BYTES || 1024 * 1024);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60);
const CONTENT_FILE_PATH = path.join(__dirname, "..", "data", "invite-content.json");
const RSVP_SUBMISSIONS_FILE_PATH = path.join(__dirname, "..", "data", "rsvp-submissions.json");
const rateLimitStore = new Map();

function normalizePassword(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

const EMAIL_CONFIG = {
  recipientEmail: String(process.env.RECIPIENT_EMAIL || process.env.RECIPENT_EMAIL || "").trim(),
  senderEmail: String(process.env.SENDER_EMAIL || process.env.SNEDER_EMAIL || "").trim(),
  senderName: String(process.env.SENDER_NAME || "Terence & Shanice Wedding").trim(),
  websiteUrl: String(process.env.WEBSITE_URL || "").trim(),
  gmailAppPassword: normalizePassword(
    process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || ""
  )
};

const canSendEmail = Boolean(
  EMAIL_CONFIG.senderEmail && EMAIL_CONFIG.gmailAppPassword
);

const emailTransporter = canSendEmail
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_CONFIG.senderEmail,
        pass: EMAIL_CONFIG.gmailAppPassword
      }
    })
  : null;

if (emailTransporter) {
  emailTransporter
    .verify()
    .then(() => {
      console.log("Email transport verified and ready.");
    })
    .catch((error) => {
      console.error("Email transport verification failed:", error?.message || error);
    });
}

if (!canSendEmail) {
  console.warn(
    "Email transport disabled: set RECIPIENT_EMAIL, SENDER_EMAIL, and one of GMAIL_APP_PASSWORD, EMAIL_APP_PASSWORD, or SMTP_PASSWORD to enable outgoing emails."
  );
}

async function readInviteContent() {
  try {
    const text = await fs.readFile(CONTENT_FILE_PATH, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildFamilyMembers(inviteContent) {
  const families = inviteContent?.access?.localFamilies;
  if (!Array.isArray(families) || families.length === 0) return [];
  return families.flatMap((family) =>
    (family.members || []).map((memberName) => ({
      familyId: family.id,
      familyLabel: family.label,
      name: memberName,
      normalizedName: normalizeName(memberName)
    }))
  );
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isOriginAllowed(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;
  if (ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(normalizedOrigin);
}

function buildCorsHeaders(origin) {
  const allowOrigin = isOriginAllowed(origin);
  return {
    "Access-Control-Allow-Origin": allowOrigin ? (origin || "*") : "null",
    "Access-Control-Allow-Headers": "content-type, x-api-key",
    "Access-Control-Allow-Methods": "POST, GET, PUT, OPTIONS",
    Vary: "Origin"
  };
}

function buildSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store"
  };
}

function getEmailHealth() {
  const missing = [];
  if (!EMAIL_CONFIG.senderEmail) missing.push("SENDER_EMAIL");
  if (!EMAIL_CONFIG.gmailAppPassword) {
    missing.push("GMAIL_APP_PASSWORD|EMAIL_APP_PASSWORD|SMTP_PASSWORD");
  }

  return {
    configured: canSendEmail,
    missing
  };
}

function writeJson(res, statusCode, payload, origin) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...buildSecurityHeaders(),
    ...buildCorsHeaders(origin)
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_SIZE_BYTES) {
    const tooLargeError = new Error("Request body too large");
    tooLargeError.code = "PAYLOAD_TOO_LARGE";
    throw tooLargeError;
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_SIZE_BYTES) {
      const tooLargeError = new Error("Request body too large");
      tooLargeError.code = "PAYLOAD_TOO_LARGE";
      throw tooLargeError;
    }
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(body || "{}");
  } catch {
    const badJsonError = new Error("Invalid JSON payload");
    badJsonError.code = "INVALID_JSON";
    throw badJsonError;
  }
}

async function readRsvpSubmissions() {
  try {
    const text = await fs.readFile(RSVP_SUBMISSIONS_FILE_PATH, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeRsvpSubmissions(submissions) {
  await fs.mkdir(path.dirname(RSVP_SUBMISSIONS_FILE_PATH), { recursive: true });
  await fs.writeFile(RSVP_SUBMISSIONS_FILE_PATH, JSON.stringify(submissions, null, 2), "utf8");
}

function isValidInviteContent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const requiredKeys = ["hero", "intro", "eventDetails", "theme", "gallery", "faq", "rsvp", "access", "footer"];
  return requiredKeys.every((key) => key in value);
}

function buildRsvpEmailHtml(rsvp) {
  const esc = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const guestName = esc(rsvp.fullName || rsvp.verifiedGuest || "Guest");
  const websiteUrl = esc(EMAIL_CONFIG.websiteUrl || "http://localhost:8080");
  const isAttending = rsvp.attendance === "yes";
  const attText = isAttending ? "Attending" : rsvp.attendance === "no" ? "Not Attending" : rsvp.attendance || "Unknown";
  const attColor = isAttending ? "#4a7c59" : "#a04040";
  const attBg = isAttending ? "#eaf4ee" : "#faeaea";
  const submittedAt = rsvp.submittedAt
    ? new Date(rsvp.submittedAt).toLocaleString("en-SG", { dateStyle: "long", timeStyle: "short" })
    : new Date().toLocaleString("en-SG", { dateStyle: "long", timeStyle: "short" });

  const detailRow = (label, value, shade) =>
    `<tr>
      <td style="padding:10px 16px;font-size:13px;color:#888;font-family:Georgia,serif;background:${shade};width:130px;vertical-align:top">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#3a3028;font-family:Georgia,serif;background:${shade}">${esc(value)}</td>
    </tr>`;

  let familySection = "";
  if (Array.isArray(rsvp.familyResponses) && rsvp.familyResponses.length > 0) {
    const familyRows = rsvp.familyResponses.map((f, i) => {
      const fIsAttending = f.attendance === "yes";
      const fAttText = fIsAttending ? "Attending" : f.attendance === "no" ? "Not Attending" : "—";
      const fAttColor = fIsAttending ? "#4a7c59" : "#a04040";
      const shade = i % 2 === 0 ? "#faf8f5" : "#fff";
      return `<tr>
        <td style="padding:10px 16px;font-size:14px;color:#3a3028;font-family:Georgia,serif;background:${shade}">${esc(f.name)}</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:bold;color:${fAttColor};font-family:Georgia,serif;background:${shade}">${fAttText}</td>
      </tr>`;
    }).join("");

    familySection = `
      <tr><td style="padding:0 32px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:6px;overflow:hidden;margin-top:8px">
          <tr style="background:#e8e0d4">
            <td colspan="2" style="padding:10px 16px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7c6f5b;font-family:Georgia,serif">Family Members</td>
          </tr>
          <tr style="background:#e8e0d4">
            <th style="padding:8px 16px;font-size:12px;color:#7c6f5b;font-family:Georgia,serif;text-align:left;font-weight:normal">Name</th>
            <th style="padding:8px 16px;font-size:12px;color:#7c6f5b;font-family:Georgia,serif;text-align:left;font-weight:normal">Response</th>
          </tr>
          ${familyRows}
        </table>
      </td></tr>
      <tr><td style="padding:0 32px"><div style="height:24px"></div></td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RSVP Notification</title></head>
<body style="margin:0;padding:0;background-color:#f0ebe4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe4">
  <tr><td align="center" style="padding:40px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden">

      <!-- Header -->
      <tr>
        <td style="background:#3a3028;padding:0;text-align:center">
          <div style="padding:16px 32px 4px;font-size:11px;letter-spacing:4px;color:#c9b99a;font-family:Georgia,serif;text-transform:uppercase">6 March 2027</div>
          <div style="padding:4px 32px 8px;font-size:30px;color:#f5ede0;font-family:Georgia,serif;font-weight:normal;letter-spacing:1px">Terence &amp; Shanice</div>
          <div style="padding:0 32px 16px;font-size:11px;letter-spacing:3px;color:#c9b99a;font-family:Georgia,serif;text-transform:uppercase">Thomson Road Baptist Church</div>
          <div style="height:3px;background:#c9b99a"></div>
        </td>
      </tr>

      <!-- Subheader -->
      <tr>
        <td style="background:#f5f0ea;padding:16px 32px;text-align:center">
          <span style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9a8878;font-family:Georgia,serif">New RSVP Received</span>
        </td>
      </tr>

      <!-- Guest name + attendance badge -->
      <tr>
        <td style="padding:28px 32px 8px;text-align:center">
          <div style="font-size:24px;color:#3a3028;font-family:Georgia,serif">${guestName}</div>
          ${rsvp.familyLabel ? `<div style="font-size:13px;color:#9a8878;font-family:Georgia,serif;margin-top:4px">${esc(rsvp.familyLabel)}</div>` : ""}
          <div style="margin-top:14px">
            <span style="display:inline-block;padding:7px 24px;background:${attBg};color:${attColor};font-size:13px;font-weight:bold;font-family:Georgia,serif;border-radius:20px;letter-spacing:1px">${attText}</span>
          </div>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:20px 32px 0"><div style="border-top:1px solid #e8e0d4"></div></td></tr>

      <!-- RSVP details -->
      <tr><td style="padding:8px 32px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:6px;overflow:hidden">
          ${detailRow("Email", rsvp.email || "—", "#faf8f5")}
          ${detailRow("Kids attending", rsvp.kidsCount || "0", "#fff")}
          ${detailRow("Dietary needs", rsvp.dietary || "None", "#faf8f5")}
          ${rsvp.message ? detailRow("Message", rsvp.message, "#fff") : ""}
        </table>
      </td></tr>

      <tr><td><div style="height:24px"></div></td></tr>

      <!-- Family RSVP section -->
      ${familySection}

      <!-- Website link section -->
      <tr>
        <td style="padding:0 32px 20px;text-align:center">
          <div style="padding:16px;border:1px solid #e8e0d4;border-radius:8px;background:#faf8f5;text-align:center">
            <div style="font-size:12px;color:#6b5b4b;font-family:Georgia,serif;margin-bottom:6px">Need to update your RSVP details?</div>
            <div style="font-size:12px;color:#6b5b4b;font-family:Georgia,serif;margin-bottom:12px">Click the button below to return to the website and make changes.</div>
            <a href="${websiteUrl}" style="display:inline-block;padding:8px 20px;border-radius:999px;background:#c9b99a;color:#3a3028;text-decoration:none;font-size:12px;font-weight:bold;font-family:Georgia,serif">Back to Website</a>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#3a3028;padding:20px 32px;text-align:center">
          <div style="font-size:12px;color:#c9b99a;font-family:Georgia,serif">Submitted on ${submittedAt}</div>
          <div style="font-size:11px;color:#6a5a4a;font-family:Georgia,serif;margin-top:6px">This is an automated notification from your wedding RSVP site.</div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildRsvpEmailText(rsvp) {
  const websiteUrl = String(EMAIL_CONFIG.websiteUrl || "http://localhost:8080");
  const guestName = String(rsvp.fullName || rsvp.verifiedGuest || "Guest");
  const attendance = rsvp.attendance === "yes" ? "Attending" : rsvp.attendance === "no" ? "Not Attending" : "Unknown";
  const submittedAt = rsvp.submittedAt
    ? new Date(rsvp.submittedAt).toLocaleString("en-SG", { dateStyle: "long", timeStyle: "short" })
    : new Date().toLocaleString("en-SG", { dateStyle: "long", timeStyle: "short" });

  return [
    `RSVP received for ${guestName}`,
    `Attendance: ${attendance}`,
    `Submitted on: ${submittedAt}`,
    "",
    "Need to update your RSVP details?",
    "Open the website below to make changes:",
    `Back to website: ${websiteUrl}`
  ].join("\n");
}

function buildGuestContactEmailHtml(request) {
  const esc = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const name = esc(request.name || "Unknown");
  const email = esc(request.email || "Unknown");
  const contactNumber = esc(request.contactNumber || request.contactDetails || "Unknown");
  const details = esc(request.contactDetails || "No additional details provided");
  const attemptedGuestName = esc(request.attemptedGuestName || "Not provided");
  const source = esc(request.source || "Unknown");
  const submittedAt = request.requestedAt
    ? new Date(request.requestedAt).toLocaleString("en-SG", { dateStyle: "long", timeStyle: "short" })
    : new Date().toLocaleString("en-SG", { dateStyle: "long", timeStyle: "short" });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guest Contact Request</title></head>
<body style="margin:0;padding:24px;background:#f6f1eb;font-family:Georgia,serif;color:#3a3028">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e0d4;border-radius:8px;overflow:hidden">
    <tr><td style="padding:20px 24px;background:#3a3028;color:#f5ede0;font-size:20px">Guest Contact Request</td></tr>
    <tr><td style="padding:18px 24px">
      <p style="margin:0 0 10px"><strong>Name:</strong> ${name}</p>
      <p style="margin:0 0 10px"><strong>Email:</strong> ${email}</p>
      <p style="margin:0 0 10px"><strong>Contact number:</strong> ${contactNumber}</p>
      <p style="margin:0 0 10px"><strong>Contact details:</strong><br>${details}</p>
      <p style="margin:0 0 10px"><strong>Attempted guest name:</strong> ${attemptedGuestName}</p>
      <p style="margin:0 0 10px"><strong>Source:</strong> ${source}</p>
      <p style="margin:16px 0 0;color:#6a5a4a;font-size:13px">Submitted on ${submittedAt}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function resolveRsvpRecipientEmail(rsvp) {
  return String(rsvp?.email || "").trim();
}

function isValidEmail(value) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeText(value, maxLength = 300) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidAttendance(value) {
  return value === "yes" || value === "no";
}

function validateRsvpPayload(payload) {
  const fullName = sanitizeText(payload?.fullName, 120);
  const email = sanitizeText(payload?.email, 200);
  const attendance = sanitizeText(payload?.attendance, 10).toLowerCase();
  const kidsCountRaw = String(payload?.kidsCount || "0").trim();
  const kidsCount = Number.parseInt(kidsCountRaw, 10);

  // email is optional — guests without email can still RSVP
  if (!fullName || !isValidAttendance(attendance)) {
    return { valid: false, error: "Invalid RSVP payload" };
  }
  if (email && !isValidEmail(email)) {
    return { valid: false, error: "Invalid email address" };
  }

  if (!Number.isInteger(kidsCount) || kidsCount < 0 || kidsCount > 10) {
    return { valid: false, error: "kidsCount must be between 0 and 10" };
  }

  const familyResponses = Array.isArray(payload?.familyResponses)
    ? payload.familyResponses.slice(0, 20).map((item) => ({
        name: sanitizeText(item?.name, 120),
        attendance: sanitizeText(item?.attendance, 10).toLowerCase()
      }))
    : [];

  const invalidFamily = familyResponses.some((item) => !item.name || !isValidAttendance(item.attendance));
  if (invalidFamily) {
    return { valid: false, error: "Invalid family RSVP payload" };
  }

  return {
    valid: true,
    data: {
      fullName,
      email,
      attendance,
      kidsCount: String(kidsCount),
      dietary: sanitizeText(payload?.dietary, 300),
      message: sanitizeText(payload?.message, 1000),
      verifiedGuest: sanitizeText(payload?.verifiedGuest, 120),
      familyLabel: sanitizeText(payload?.familyLabel, 120),
      familyResponses,
      submittedAt: sanitizeText(payload?.submittedAt, 80)
    }
  };
}

function validateContactPayload(payload) {
  const name = sanitizeText(payload?.name, 120);
  const email = sanitizeText(payload?.email, 200);
  const contactNumber = sanitizeText(payload?.contactNumber || payload?.contactDetails, 50);

  if (!name || !isValidEmail(email) || !contactNumber) {
    return { valid: false, error: "Name, email, and contact number are required" };
  }

  return {
    valid: true,
    data: {
      name,
      email,
      contactNumber,
      contactDetails: sanitizeText(payload?.contactDetails || contactNumber, 500),
      attemptedGuestName: sanitizeText(payload?.attemptedGuestName, 120),
      source: sanitizeText(payload?.source || "access-card", 80),
      requestedAt: sanitizeText(payload?.requestedAt, 80)
    }
  };
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.socket?.remoteAddress || "unknown");
}

function isRateLimited(req, routeKey) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${routeKey}:${ip}`;

  const existing = rateLimitStore.get(key);
  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  return false;
}

function findUniqueGuestMatch(rawInput, familyMembers) {
  const input = normalizeName(rawInput);
  if (!input) return null;

  const exactMatch = familyMembers.find((member) => member.normalizedName === input);
  if (exactMatch) {
    return exactMatch;
  }

  const singleTokenInput = !input.includes(" ");
  if (singleTokenInput) {
    const firstNameMatches = familyMembers.filter(
      (member) => member.normalizedName.split(" ")[0] === input
    );
    if (firstNameMatches.length === 1) {
      return firstNameMatches[0];
    }
  }

  const prefixMatches = familyMembers.filter((member) => member.normalizedName.startsWith(`${input} `));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const origin = String(req.headers.origin || "");
  const pathname = fullUrl.pathname;
  const allowedPaths = new Set([
    "/api/guest-check",
    "/api/invite-content",
    "/api/rsvp",
    "/api/guest-contact",
    "/api/rsvp-submissions",
    "/api/email-test",
    "/health"
  ]);

  if (!isOriginAllowed(origin)) {
    writeJson(res, 403, { error: "Origin not allowed" }, origin);
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...buildSecurityHeaders(),
      ...buildCorsHeaders(origin)
    });
    res.end();
    return;
  }

  if (!allowedPaths.has(pathname)) {
    writeJson(res, 404, { error: "Not found" }, origin);
    return;
  }

  if (pathname === "/health") {
    writeJson(res, 200, { ok: true, email: getEmailHealth() }, origin);
    return;
  }

  // ── SMTP connectivity test (API-key protected) ──────────────────────────
  if (pathname === "/api/email-test" && req.method === "GET") {
    if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
      writeJson(res, 401, { error: "Unauthorized" }, origin);
      return;
    }
    if (!emailTransporter) {
      writeJson(res, 503, { ok: false, error: "Email service is not configured", health: getEmailHealth() }, origin);
      return;
    }
    try {
      await emailTransporter.verify();
      writeJson(res, 200, { ok: true, message: "SMTP connection verified" }, origin);
    } catch (err) {
      writeJson(res, 500, {
        ok: false,
        error: err?.message || "Unknown SMTP error",
        code: err?.code,
        command: err?.command,
        response: err?.response
      }, origin);
    }
    return;
  }
  // ────────────────────────────────────────────────────────────────────────

  const isPublicRoute = pathname === "/api/guest-check" || pathname === "/api/guest-contact" || pathname === "/api/rsvp";
  if (isPublicRoute && isRateLimited(req, pathname)) {
    writeJson(res, 429, { error: "Too many requests" }, origin);
    return;
  }

  const requiresApiKey = pathname === "/api/invite-content" || pathname === "/api/rsvp-submissions";
  if (requiresApiKey && API_KEY && req.headers["x-api-key"] !== API_KEY) {
    writeJson(res, 401, { allowed: false, error: "Unauthorized" }, origin);
    return;
  }

  // ── RSVP submission → send email notification ────────────────────────────
  if (pathname === "/api/rsvp" && req.method === "POST") {
    try {
      const rsvpInput = await readJsonBody(req);
      const validated = validateRsvpPayload(rsvpInput);
      if (!validated.valid) {
        writeJson(res, 400, { sent: false, error: validated.error }, origin);
        return;
      }

      const rsvp = validated.data;
      const guestName = String(rsvp.fullName || rsvp.verifiedGuest || "Guest");
      const attLabel = rsvp.attendance === "yes" ? "Attending" : rsvp.attendance === "no" ? "Not Attending" : rsvp.attendance || "Unknown";
      const guestEmail = resolveRsvpRecipientEmail(rsvp);

      if (!emailTransporter) {
        writeJson(res, 503, { sent: false, error: "Email service is not configured" }, origin);
        return;
      }

      if (!guestEmail) {
        // No guest email provided — skip email, still treat as success
        writeJson(res, 200, { sent: false, reason: "No guest email provided" }, origin);
        return;
      }

      // Send RSVP confirmation to the guest
      await emailTransporter.sendMail({
        from: `"${EMAIL_CONFIG.senderName}" <${EMAIL_CONFIG.senderEmail}>`,
        to: guestEmail,
        subject: `Your RSVP has been received — ${EMAIL_CONFIG.senderName}`,
        html: `<p>Hi ${escapeHtml(guestName)},</p><p>Thank you for your RSVP! We've received your response (<strong>${attLabel}</strong>) and can't wait to celebrate with you.</p><p>With love,<br>${escapeHtml(EMAIL_CONFIG.senderName)}</p>`
      });

      // Also notify the organizer if RECIPIENT_EMAIL is configured
      if (EMAIL_CONFIG.recipientEmail) {
        await emailTransporter.sendMail({
          from: `"${EMAIL_CONFIG.senderName}" <${EMAIL_CONFIG.senderEmail}>`,
          to: EMAIL_CONFIG.recipientEmail,
          replyTo: guestEmail,
          subject: `New RSVP: ${guestName} — ${attLabel}`,
          text: buildRsvpEmailText(rsvp),
          html: buildRsvpEmailHtml(rsvp)
        });
      }

      writeJson(res, 200, { sent: true, to: guestEmail }, origin);
    } catch (err) {
      if (err?.code === "PAYLOAD_TOO_LARGE") {
        writeJson(res, 413, { sent: false, error: "Payload too large" }, origin);
        return;
      }
      if (err?.code === "INVALID_JSON") {
        writeJson(res, 400, { sent: false, error: "Invalid JSON payload" }, origin);
        return;
      }

      console.error("RSVP email error:", {
        message: err?.message,
        code: err?.code,
        command: err?.command,
        response: err?.response
      });
      writeJson(res, 500, { sent: false, error: "Failed to send email" }, origin);
    }
    return;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Guest contact request → send to organizer inbox ─────────────────────
  if (pathname === "/api/guest-contact" && req.method === "POST") {
    try {
      const requestInput = await readJsonBody(req);
      const validated = validateContactPayload(requestInput);
      if (!validated.valid) {
        writeJson(res, 400, { sent: false, error: validated.error }, origin);
        return;
      }

      if (!emailTransporter) {
        writeJson(res, 503, { sent: false, error: "Email service is not configured" }, origin);
        return;
      }

      const { name, email, contactNumber, contactDetails, attemptedGuestName, source, requestedAt } = validated.data;

      await emailTransporter.sendMail({
        from: `"${EMAIL_CONFIG.senderName}" <${EMAIL_CONFIG.senderEmail}>`,
        to: EMAIL_CONFIG.recipientEmail,
        replyTo: email,
        subject: `Guest List Contact Request: ${name}`,
        html: buildGuestContactEmailHtml({
          name,
          email,
          contactNumber,
          contactDetails,
          attemptedGuestName,
          source,
          requestedAt
        })
      });

      writeJson(res, 200, { sent: true }, origin);
    } catch (err) {
      if (err?.code === "PAYLOAD_TOO_LARGE") {
        writeJson(res, 413, { sent: false, error: "Payload too large" }, origin);
        return;
      }
      if (err?.code === "INVALID_JSON") {
        writeJson(res, 400, { sent: false, error: "Invalid JSON payload" }, origin);
        return;
      }

      console.error("Guest contact request error:", {
        message: err?.message,
        code: err?.code,
        command: err?.command,
        response: err?.response
      });
      writeJson(res, 500, { sent: false, error: "Failed to send contact request" }, origin);
    }
    return;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── RSVP submissions persistence (for cache-proof restore) ──────────────
  if (pathname === "/api/rsvp-submissions") {
    if (req.method === "GET") {
      try {
        const submissions = await readRsvpSubmissions();
        writeJson(res, 200, { submissions }, origin);
      } catch {
        writeJson(res, 500, { error: "Failed to load RSVP submissions" }, origin);
      }
      return;
    }

    if (req.method === "PUT") {
      try {
        const payload = await readJsonBody(req);
        const submissions = Array.isArray(payload) ? payload : payload?.submissions;

        if (!Array.isArray(submissions)) {
          writeJson(res, 400, { saved: false, error: "Invalid RSVP submissions payload" }, origin);
          return;
        }

        if (submissions.length > 5000) {
          writeJson(res, 400, { saved: false, error: "Too many RSVP submissions in one request" }, origin);
          return;
        }

        await writeRsvpSubmissions(submissions);
        writeJson(res, 200, { saved: true }, origin);
      } catch (err) {
        if (err?.code === "PAYLOAD_TOO_LARGE") {
          writeJson(res, 413, { saved: false, error: "Payload too large" }, origin);
          return;
        }
        if (err?.code === "INVALID_JSON") {
          writeJson(res, 400, { saved: false, error: "Invalid JSON payload" }, origin);
          return;
        }

        writeJson(res, 500, { saved: false, error: "Failed to save RSVP submissions" }, origin);
      }
      return;
    }

    writeJson(res, 405, { error: "Method not allowed" }, origin);
    return;
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (pathname === "/api/invite-content") {
    if (req.method === "GET") {
      try {
        const text = await fs.readFile(CONTENT_FILE_PATH, "utf8");
        writeJson(res, 200, { content: JSON.parse(text) }, origin);
      } catch (error) {
        if (error?.code === "ENOENT") {
          writeJson(res, 200, { content: null }, origin);
          return;
        }

        writeJson(res, 500, { error: "Failed to load content" }, origin);
      }
      return;
    }

    if (req.method === "PUT") {
      try {
        const payload = await readJsonBody(req);
        if (!isValidInviteContent(payload)) {
          writeJson(res, 400, { error: "Invalid content payload" }, origin);
          return;
        }

        await fs.mkdir(path.dirname(CONTENT_FILE_PATH), { recursive: true });
        await fs.writeFile(CONTENT_FILE_PATH, JSON.stringify(payload, null, 2), "utf8");
        writeJson(res, 200, { saved: true }, origin);
      } catch (err) {
        if (err?.code === "PAYLOAD_TOO_LARGE") {
          writeJson(res, 413, { saved: false, error: "Payload too large" }, origin);
          return;
        }
        if (err?.code === "INVALID_JSON") {
          writeJson(res, 400, { saved: false, error: "Invalid JSON payload" }, origin);
          return;
        }

        writeJson(res, 500, { saved: false, error: "Failed to save content" }, origin);
      }
      return;
    }

    writeJson(res, 405, { error: "Method not allowed" }, origin);
    return;
  }

  let name = "";

  if (req.method === "GET") {
    name = fullUrl.searchParams.get("name") || "";
  } else if (req.method === "POST") {
    try {
      const parsed = await readJsonBody(req);
      name = parsed.name || "";
    } catch {
      name = "";
    }
  } else {
    writeJson(res, 405, { error: "Method not allowed" }, origin);
    return;
  }

  const inviteContent = await readInviteContent();
  const allFamilyMembers = buildFamilyMembers(inviteContent);

  const matchedMember = findUniqueGuestMatch(name, allFamilyMembers);
  const allowed = Boolean(matchedMember);

  let familyMembers = [];
  let familyLabel = "";
  if (matchedMember) {
    familyLabel = matchedMember.familyLabel;
    familyMembers = allFamilyMembers.filter((member) => member.familyId === matchedMember.familyId).map(
      (member) => member.name
    );
  }

  writeJson(
    res,
    200,
    {
      allowed,
      matchedGuest: matchedMember ? matchedMember.name : null,
      familyLabel,
      familyMembers
    },
    origin
  );
});

server.listen(PORT, () => {
  console.log(`Guest check API running at http://localhost:${PORT}/api/guest-check`);
});
