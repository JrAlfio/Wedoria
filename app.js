const STORAGE_KEY = "withjoy-inspired-rsvp-content-v1";
const ACCESS_SESSION_KEY = "withjoy-inspired-guest-access-v1";
const RSVP_STORAGE_KEY = "withjoy-inspired-rsvp-submissions-v1";
const CONTENT_SYNC_DEBOUNCE_MS = 700;
const EDITOR_ALLOWED_GUESTS = new Set(["terence chia", "shanice see"]);
const CALENDAR_EVENT_START_DATE = "20270306";
const CALENDAR_EVENT_END_DATE = "20270307";
const RUNTIME_CONFIG = window.WITHJOY_CONFIG || {};

function normalizeApiBaseUrl(rawBaseUrl) {
  const raw = String(rawBaseUrl || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function buildApiUrl(pathname) {
  const safePath = String(pathname || "").startsWith("/") ? pathname : `/${pathname}`;
  const configuredBase = normalizeApiBaseUrl(RUNTIME_CONFIG.apiBaseUrl);
  const baseUrl = configuredBase || window.location.origin;
  return new URL(safePath, `${baseUrl}/`).toString();
}

const CONTENT_BACKEND_ENDPOINT = buildApiUrl("/api/invite-content");

const defaultContent = {
  hero: {
    tagline: "Together with their families",
    coupleNames: "Terence & Shanice",
    weddingDate: "Saturday, 6 March 2027",
    venueName: "Thomson Road Baptist Church, Singapore",
    ctaText: "RSVP Now",
    heroImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
  },
  intro: {
    welcomeTitle: "You Are Invited",
    welcomeMessage:
      "Join us as we celebrate the making of our marriage covenant and our union, surrended by people we love most. We can't wait to share this unforgettable day with you!"
  },
  eventDetails: [
    { title: "Time", value: "10.15am-1pm \nPlease be seated by 10.15am" },
    { title: "Ceremony", value: "Level 2 Sanctuary, \nThompson Road Baptist Church" },
    { title: "Address", value: "45 Thomson Road, Singapore 307584" },
    { title: "Getting There", value: "MRT: Novena Stn (10mins walk)\nBuses: 56, 57, 131, 141, 161, 851, 980 (4-7mins walk)" }
  ],
  theme: {
    title: "Theme & Dress Code",
    summary: "A romantic garden evening with timeless silhouettes and earthy elegance.",
    details: [
      { title: "Theme", value: "Power Ranger X Spring Colours! " },
      { title: "Dress Code", value: "Smart Casual \nLadies, kindly refrain from wearing white" },
      { title: "Colour Palette ", value: "[Insert Image]" }
    ]
  },
  gallery: [
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80"
  ],
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        question: "Can I bring a plus one?",
        answer: "As we are keeping our celebration intimate and within a comfortable capacity, we have carefully planned our guest list. Your invitation will indicate if your plus-one has been included. We appreciate your understanding. "
      },
      {
        question: "What time should I arrive?",
        answer: "Please be seated by 10.15am, as we will commence the ceremony promptly. Guest arriving after this time may be seated after the walk-in has concluded."
      },
      {
        question: "Is parking available?",
        answer: "As parking is limited at the church, we would recommend parking at the following location: \n- United Square Shopping Mall (5-8mins walk)\n- IRAS Revenus House (10mins walk)\n- 37A Cambridge Rd, MSCP HDB (10-12mins walk)"
      },
      {
        question: "Are children welcome?",
        answer: "Yes! If your children's name is not included in the invite, please let us know. A cry room is available at the back of the hall. or a free-roaming space outside the hall for your use. "
      }
    ]
  },
  rsvp: {
    description: "Please respond by XXX October 2027 so we can prepare your seat with care."
  },
  access: {
    enabled: true,
    hint: "Please enter your name to access the RSVP page.",
    mode: "local",
    endpoint: buildApiUrl("/api/guest-check"),
    method: "POST",
    apiKey: "",
    apiKeyHeader: "x-api-key",
    requestNameField: "name",
    successField: "allowed",
    guestList: ["Olivia Tan", "Ethan Lim", "Grace Lee", "Daniel Chua", "Terence Chia", "Thomas Chia", "Koo Sheau Chin", "Koo Sheau Hong", "Koo Sheau Long", "Joseph See", "Kenneth See", "Alicia Lim", "Anna Dungca", "Shanice See"],
    localFamilies: [
      {
        id: "tan-family",
        label: "Tan Family",
        members: ["Olivia Tan", "Ethan Lim"]
      },
      {
        id: "lee-family",
        label: "Lee Family",
        members: ["Grace Lee", "Daniel Chua"]
      },
      {
        id: "chia-family-3",
        label: "Chia Family",
        members: ["Terence Chia", "Thomas Chia", "Koo Sheau Chin"]
      },
      {
        id: "hong-family-4",
        label: "Hong Family",
        members: ["Koo Sheau Hong", "Koo Sheau Long"]
      },
      {
        id: "see-family-5",
        label: "See Family",
        members: ["Joseph See", "Kenneth See", "Alicia Lim", "Anna Dungca"]
      }
    ]
  },
  footer: {
    message: "With love, Terence & Shanice"
  }
};

let content = loadContent();
let contentSyncTimer = null;
let verifiedGuestContext = null;

const el = {
  hero: document.getElementById("hero"),
  accessGate: document.getElementById("accessGate"),
  accessGuestView: document.getElementById("accessGuestView"),
  accessContactView: document.getElementById("accessContactView"),
  accessHint: document.getElementById("accessHint"),
  accessForm: document.getElementById("accessForm"),
  accessName: document.getElementById("accessName"),
  accessResult: document.getElementById("accessResult"),
  contactToggleLink: document.getElementById("contactToggleLink"),
  backToGuestLink: document.getElementById("backToGuestLink"),
  contactRequestForm: document.getElementById("contactRequestForm"),
  contactRequestName: document.getElementById("contactRequestName"),
  contactRequestEmail: document.getElementById("contactRequestEmail"),
  contactRequestNumber: document.getElementById("contactRequestNumber"),
  contactRequestSubmit: document.getElementById("contactRequestSubmit"),
  contactRequestResult: document.getElementById("contactRequestResult"),
  familyRsvpSection: document.getElementById("familyRsvpSection"),
  familyRsvpTitle: document.getElementById("familyRsvpTitle"),
  familyRsvpHint: document.getElementById("familyRsvpHint"),
  familyRsvpList: document.getElementById("familyRsvpList"),
  heroTagline: document.getElementById("heroTagline"),
  coupleNames: document.getElementById("coupleNames"),
  weddingDate: document.getElementById("weddingDate"),
  venueName: document.getElementById("venueName"),
  heroCta: document.getElementById("heroCta"),
  welcomeTitle: document.getElementById("welcomeTitle"),
  welcomeMessage: document.getElementById("welcomeMessage"),
  eventDetails: document.getElementById("eventDetails"),
  themeTitle: document.getElementById("themeTitle"),
  themeSummary: document.getElementById("themeSummary"),
  themeDetails: document.getElementById("themeDetails"),
  galleryGrid: document.getElementById("galleryGrid"),
  faqTitle: document.getElementById("faqTitle"),
  faqList: document.getElementById("faqList"),
  rsvpDescription: document.getElementById("rsvpDescription"),
  footerMessage: document.getElementById("footerMessage"),
  rsvpForm: document.getElementById("rsvpForm"),
  rsvpResult: document.getElementById("rsvpResult"),
  editorToggle: document.getElementById("editorToggle"),
  editor: document.getElementById("editor"),
  editorClose: document.getElementById("editorClose"),
  editorForm: document.getElementById("editorForm"),
  saveProgress: document.getElementById("saveProgress"),
  saveProgressResult: document.getElementById("saveProgressResult"),
  exportContent: document.getElementById("exportContent"),
  exportRsvpSummary: document.getElementById("exportRsvpSummary"),
  importContent: document.getElementById("importContent"),
  resetContent: document.getElementById("resetContent")
};

console.log("[WithJoy] app.js v20260429 loaded");
initializeApp();

async function initializeApp() {
  await hydrateContentFromBackend();
  await hydrateRsvpSubmissionsFromBackend();
  renderAll();
  bindEvents();
  initAccessGate();
}

function loadContent() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultContent);

  try {
    const parsed = JSON.parse(saved);
    return deepMerge(structuredClone(defaultContent), parsed);
  } catch {
    return structuredClone(defaultContent);
  }
}

function saveContent() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
}

function buildBackendHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };

  const apiKeyValue = String(content.access?.apiKey || "").trim();
  if (apiKeyValue && apiKeyValue.toLowerCase() !== "change-me") {
    headers[content.access.apiKeyHeader || "x-api-key"] = apiKeyValue;
  }

  return headers;
}

async function hydrateContentFromBackend() {
  try {
    const response = await fetch(CONTENT_BACKEND_ENDPOINT, {
      method: "GET",
      headers: buildBackendHeaders()
    });

    if (!response.ok) return;

    const result = await response.json();
    const remoteContent = result?.content;
    if (!isValidInviteContent(remoteContent)) {
      scheduleContentSync();
      return;
    }

    content = deepMerge(structuredClone(defaultContent), remoteContent);
    saveContent();
  } catch {
    // Keep local data when backend is unavailable.
  }
}

function scheduleContentSync() {
  if (contentSyncTimer) {
    window.clearTimeout(contentSyncTimer);
  }

  contentSyncTimer = window.setTimeout(() => {
    persistContentToBackend();
  }, CONTENT_SYNC_DEBOUNCE_MS);
}

async function persistContentToBackend() {
  try {
    const response = await fetch(CONTENT_BACKEND_ENDPOINT, {
      method: "PUT",
      headers: buildBackendHeaders(),
      body: JSON.stringify(content)
    });

    return response.ok;
  } catch {
    // Local storage remains the fallback when backend sync fails.
    return false;
  }
}

function getRsvpSubmissionsEndpoint() {
  const fallbackEndpoint = buildApiUrl("/api/rsvp-submissions");
  const accessEndpoint = String(content.access?.endpoint || "").trim();
  if (!accessEndpoint) {
    return fallbackEndpoint;
  }

  if (accessEndpoint.includes("/api/guest-check")) {
    return accessEndpoint.replace(/\/api\/guest-check$/, "/api/rsvp-submissions");
  }

  try {
    const parsed = new URL(accessEndpoint);
    parsed.pathname = "/api/rsvp-submissions";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return fallbackEndpoint;
  }
}

async function hydrateRsvpSubmissionsFromBackend() {
  const endpoint = getRsvpSubmissionsEndpoint();

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: buildBackendHeaders()
    });

    if (!response.ok) return;

    const result = await response.json();
    const remoteSubmissions = Array.isArray(result?.submissions) ? result.submissions : [];
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(remoteSubmissions));
  } catch {
    // Keep local submissions if backend is unavailable.
  }
}

async function persistRsvpSubmissionsToBackend(submissions) {
  const endpoint = getRsvpSubmissionsEndpoint();

  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: buildBackendHeaders(),
      body: JSON.stringify({ submissions })
    });

    return response.ok;
  } catch {
    return false;
  }
}

function isValidInviteContent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const requiredKeys = ["hero", "intro", "eventDetails", "theme", "gallery", "faq", "rsvp", "access", "footer"];
  return requiredKeys.every((key) => key in value);
}

function renderAll() {
  renderPreview();
  renderEditorForm();
}

function renderPreview() {
  renderHero();
  renderIntro();
  renderEventDetails();
  renderTheme();
  renderGallery();
  renderFaq();
  renderRsvp();
  renderFooter();
  renderAccess();
  renderFamilyRsvpSection();
}

function renderAccess() {
  el.accessHint.textContent = content.access.hint;
}

function setAccessFeedback(message) {
  if (el.accessResult) {
    el.accessResult.textContent = message;
    return;
  }

  if (!el.accessHint) return;
  el.accessHint.textContent = message || content.access?.hint || "";
}

function renderHero() {
  el.hero.style.backgroundImage = `url(${content.hero.heroImage})`;
  el.heroTagline.textContent = content.hero.tagline;
  el.coupleNames.textContent = content.hero.coupleNames;
  el.weddingDate.textContent = content.hero.weddingDate;
  el.venueName.textContent = content.hero.venueName;
  el.heroCta.textContent = content.hero.ctaText;
}

function renderIntro() {
  el.welcomeTitle.textContent = content.intro.welcomeTitle;
  el.welcomeMessage.textContent = content.intro.welcomeMessage;
}

function renderEventDetails() {
  el.eventDetails.innerHTML = "";
  content.eventDetails.forEach((detail) => {
    const card = document.createElement("article");
    card.className = "detail-card";
    card.innerHTML = `<h3>${escapeHtml(detail.title)}</h3><p>${formatDetailText(detail.value)}</p>`;
    el.eventDetails.append(card);
  });
}

function renderTheme() {
  el.themeTitle.textContent = content.theme.title;
  el.themeSummary.textContent = content.theme.summary;
  el.themeDetails.innerHTML = "";

  content.theme.details.forEach((item) => {
    const card = document.createElement("article");
    card.className = "detail-card";
    card.innerHTML = `<h3>${escapeHtml(item.title)}</h3><p>${formatDetailText(item.value)}</p>`;
    el.themeDetails.append(card);
  });
}

function renderGallery() {
  el.galleryGrid.innerHTML = "";
  content.gallery.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Wedding memory";
    el.galleryGrid.append(img);
  });
}

function renderFaq() {
  el.faqTitle.textContent = content.faq.title;
  el.faqList.innerHTML = "";

  content.faq.items.forEach((item) => {
    const faqItem = document.createElement("details");
    faqItem.className = "faq-item";
    faqItem.innerHTML = `<summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p>`;
    el.faqList.append(faqItem);
  });
}

function renderRsvp() {
  el.rsvpDescription.textContent = content.rsvp.description;
}

function renderFooter() {
  el.footerMessage.textContent = content.footer.message;
}

function renderEditorForm() {
  const sections = [
    {
      title: "Hero",
      fields: [
        ["hero.tagline", "Tagline"],
        ["hero.coupleNames", "Couple Names"],
        ["hero.weddingDate", "Wedding Date"],
        ["hero.venueName", "Venue"],
        ["hero.ctaText", "CTA Text"],
        ["hero.heroImage", "Hero Image URL"]
      ]
    },
    {
      title: "Welcome",
      fields: [
        ["intro.welcomeTitle", "Welcome Title"],
        ["intro.welcomeMessage", "Welcome Message", true]
      ]
    },
    {
      title: "Theme + RSVP + Footer",
      fields: [
        ["theme.title", "Theme Section Title"],
        ["theme.summary", "Theme Summary", true],
        ["rsvp.description", "RSVP Description", true],
        ["footer.message", "Footer Message"]
      ]
    }
  ];

  el.editorForm.innerHTML = "";

  sections.forEach((section) => {
    const group = createCollapsibleEditorGroup(section.title);
    section.fields.forEach(([path, label, multiline]) => {
      group.append(createField(path, label, multiline));
    });
    el.editorForm.append(group);
  });

  el.editorForm.append(createDetailsEditor());
  el.editorForm.append(createThemeEditor());
  el.editorForm.append(createGalleryEditor());
  el.editorForm.append(createFaqEditor());
  el.editorForm.append(createAccessEditor());
}

function createDetailsEditor() {
  const group = createCollapsibleEditorGroup("Event Details");

  content.eventDetails.forEach((detail, index) => {
    group.append(createField(`eventDetails.${index}.title`, `Card ${index + 1} Title`));
    const valueField = createField(`eventDetails.${index}.value`, `Card ${index + 1} Value`, true);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-btn";
    remove.textContent = "Remove detail";
    remove.addEventListener("click", () => {
      content.eventDetails.splice(index, 1);
      onContentChanged();
    });
    valueField.append(remove);
    group.append(valueField);
  });

  group.append(
    createSectionActionButton("Add Event Detail", () => {
      content.eventDetails.push({
        title: "New Detail",
        value: "Add detail here"
      });
      onContentChanged();
    })
  );

  return group;
}

function createGalleryEditor() {
  const group = createCollapsibleEditorGroup("Gallery Image URLs");

  content.gallery.forEach((src, index) => {
    const row = createField(`gallery.${index}`, `Image ${index + 1} URL`);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-btn";
    remove.textContent = "Remove image";
    remove.addEventListener("click", () => {
      content.gallery.splice(index, 1);
      onContentChanged();
    });
    row.append(remove);
    group.append(row);
  });

  group.append(
    createSectionActionButton("Add Gallery Image", () => {
      content.gallery.push("https://images.unsplash.com/photo-1529634597503-139d3726fed5?auto=format&fit=crop&w=1200&q=80");
      onContentChanged();
    })
  );

  return group;
}

function createThemeEditor() {
  const group = createCollapsibleEditorGroup("Theme Cards");

  content.theme.details.forEach((item, index) => {
    group.append(createField(`theme.details.${index}.title`, `Theme Card ${index + 1} Title`));
    const valueField = createField(`theme.details.${index}.value`, `Theme Card ${index + 1} Value`, true);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-btn";
    remove.textContent = "Remove theme detail";
    remove.addEventListener("click", () => {
      content.theme.details.splice(index, 1);
      onContentChanged();
    });
    valueField.append(remove);
    group.append(valueField);
  });

  group.append(
    createSectionActionButton("Add Theme Detail", () => {
      content.theme.details.push({
        title: "New Theme Detail",
        value: "Add detail here"
      });
      onContentChanged();
    })
  );

  return group;
}

function createFaqEditor() {
  const group = createCollapsibleEditorGroup("FAQ");

  group.append(createField("faq.title", "FAQ Section Title"));

  content.faq.items.forEach((item, index) => {
    group.append(createField(`faq.items.${index}.question`, `FAQ ${index + 1} Question`));
    const answerField = createField(`faq.items.${index}.answer`, `FAQ ${index + 1} Answer`, true);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-btn";
    remove.textContent = "Remove FAQ";
    remove.addEventListener("click", () => {
      content.faq.items.splice(index, 1);
      onContentChanged();
    });

    answerField.append(remove);
    group.append(answerField);
  });

  group.append(
    createSectionActionButton("Add FAQ Item", () => {
      content.faq.items.push({
        question: "New FAQ question",
        answer: "Add your answer here."
      });
      onContentChanged();
    })
  );

  return group;
}

function createAccessEditor() {
  const group = createCollapsibleEditorGroup("Guest Access");

  group.append(createField("access.hint", "Access Hint", true));
  group.append(createField("access.mode", "Mode (backend or local)"));
  group.append(createField("access.endpoint", "Backend Endpoint URL"));
  group.append(createField("access.method", "Backend Method (POST or GET)"));
  group.append(createField("access.apiKeyHeader", "API Key Header Name"));
  group.append(createField("access.apiKey", "API Key Value"));
  group.append(createField("access.requestNameField", "Request Name Field"));
  group.append(createField("access.successField", "Response Success Field"));

  group.append(createLocalFamilyBuilder());

  const guests = document.createElement("details");
  guests.className = "editor-row";
  const summary = document.createElement("summary");
  summary.textContent = "Fallback Local Guest List (legacy)";
  const guestsInput = document.createElement("textarea");
  guestsInput.rows = 4;
  guestsInput.value = content.access.guestList.join("\n");
  guestsInput.addEventListener("input", (event) => {
    content.access.guestList = event.target.value
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    saveContent();
    scheduleContentSync();
  });
  guests.append(summary, guestsInput);
  group.append(guests);

  return group;
}

function createLocalFamilyBuilder() {
  const wrapper = document.createElement("section");
  wrapper.className = "editor-row";

  const title = document.createElement("span");
  title.textContent = "Local Families";
  wrapper.append(title);

  const bulkImport = document.createElement("details");
  bulkImport.className = "editor-row";

  const bulkSummary = document.createElement("summary");
  bulkSummary.textContent = "Bulk Add Families";

  const bulkHint = document.createElement("small");
  bulkHint.textContent = "One family per line. Format: Family Name: Member 1, Member 2, Member 3";

  const families = Array.isArray(content.access.localFamilies) ? content.access.localFamilies : [];

  const bulkInput = document.createElement("textarea");
  bulkInput.rows = 5;
  bulkInput.placeholder = "Family Name: Member 1, Member 2, Member 3";
  bulkInput.value = serializeLocalFamiliesForBulkInput(families);

  const importButton = createSectionActionButton("Import families", () => {
    const parsedFamilies = parseLocalFamiliesBulkInput(bulkInput.value);
    if (parsedFamilies.length === 0) {
      alert("No valid families found. Use format: Family Name: Member 1, Member 2");
      return;
    }

    content.access.localFamilies = parsedFamilies;
    content.access.guestList = Array.from(new Set(parsedFamilies.flatMap((family) => family.members)));
    onContentChanged();
  });

  bulkImport.append(bulkSummary, bulkHint, bulkInput, importButton);
  wrapper.append(bulkImport);

  families.forEach((family, familyIndex) => {
    const familyTitle = String(family.label || `Family ${familyIndex + 1}`).trim();
    const block = createCollapsibleEditorGroup(familyTitle, false);

    const familyLabelField = createField(
      `access.localFamilies.${familyIndex}.label`,
      `Family ${familyIndex + 1} Name`
    );
    block.append(familyLabelField);

    const members = Array.isArray(family.members) ? family.members : [];
    members.forEach((_, memberIndex) => {
      const memberField = createField(
        `access.localFamilies.${familyIndex}.members.${memberIndex}`,
        `Member ${memberIndex + 1}`
      );

      const removeMemberBtn = createSectionActionButton("Remove member", () => {
        content.access.localFamilies[familyIndex].members.splice(memberIndex, 1);
        onContentChanged();
      });
      memberField.append(removeMemberBtn);
      block.append(memberField);
    });

    block.append(
      createSectionActionButton("Add member", () => {
        content.access.localFamilies[familyIndex].members.push("New Family Member");
        onContentChanged();
      })
    );

    block.append(
      createSectionActionButton("Remove family", () => {
        content.access.localFamilies.splice(familyIndex, 1);
        onContentChanged();
      })
    );

    wrapper.append(block);
  });

  wrapper.append(
    createSectionActionButton("Add family", () => {
      if (!Array.isArray(content.access.localFamilies)) {
        content.access.localFamilies = [];
      }

      content.access.localFamilies.push({
        id: `family-${Date.now()}`,
        label: "New Family",
        members: ["New Family Member"]
      });
      onContentChanged();
    })
  );

  return wrapper;
}

function createField(path, label, multiline = false) {
  const row = document.createElement("label");
  row.className = "editor-row";

  const title = document.createElement("span");
  title.textContent = label;

  const field = multiline ? document.createElement("textarea") : document.createElement("input");
  if (multiline) field.rows = 3;
  field.value = getByPath(content, path) || "";
  field.dataset.path = path;
  field.addEventListener("input", (event) => {
    setByPath(content, path, event.target.value);
    saveContent();
    scheduleContentSync();
    renderPreview();
  });

  row.append(title, field);
  return row;
}

function createCollapsibleEditorGroup(title, isOpen = false) {
  const group = document.createElement("details");
  group.className = "editor-group editor-collapsible";
  group.open = isOpen;

  const summary = document.createElement("summary");
  summary.textContent = title;
  group.append(summary);

  return group;
}

function createSectionActionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost-btn";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function parseLocalFamiliesBulkInput(rawText) {
  const lines = String(rawText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line, index) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) return null;

      const label = line.slice(0, separatorIndex).trim();
      const membersText = line.slice(separatorIndex + 1).trim();
      if (!label || !membersText) return null;

      const members = membersText
        .split(/,|;|\|/)
        .map((member) => member.trim())
        .filter(Boolean);

      if (members.length === 0) return null;

      return {
        id: makeFamilyId(label, index),
        label,
        members
      };
    })
    .filter(Boolean);
}

function serializeLocalFamiliesForBulkInput(families) {
  return (Array.isArray(families) ? families : [])
    .map((family) => {
      const label = String(family?.label || "").trim();
      const members = Array.isArray(family?.members)
        ? family.members.map((member) => String(member || "").trim()).filter(Boolean)
        : [];

      if (!label || members.length === 0) {
        return "";
      }

      return `${label}: ${members.join(", ")}`;
    })
    .filter(Boolean)
    .join("\n");
}

function makeFamilyId(label, index) {
  const slug = String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `${slug}-${index + 1}` : `family-${index + 1}`;
}

function bindEvents() {
  el.rsvpForm.addEventListener("submit", onRsvpSubmit);
  el.accessForm.addEventListener("submit", onAccessSubmit);
  el.contactToggleLink?.addEventListener("click", onContactUsLinkClick);
  el.backToGuestLink?.addEventListener("click", onBackToGuestLinkClick);
  el.contactRequestForm?.addEventListener("submit", onContactRequestSubmit);
  el.saveProgress.addEventListener("click", onSaveProgressClick);
  el.exportRsvpSummary?.addEventListener("click", onExportRsvpSummaryClick);

  el.editorToggle.addEventListener("click", () => {
    if (!canCurrentGuestUseEditor()) {
      return;
    }
    el.editor.classList.add("open");
    el.editor.setAttribute("aria-hidden", "false");
  });

  el.editorClose.addEventListener("click", () => {
    el.editor.classList.remove("open");
    el.editor.setAttribute("aria-hidden", "true");
  });

  el.exportContent.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wedding-invite-content.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  el.importContent.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = JSON.parse(await file.text());
      content = deepMerge(structuredClone(defaultContent), imported);
      onContentChanged();
    } catch {
      alert("Invalid JSON file");
    }

    event.target.value = "";
  });

  el.resetContent.addEventListener("click", () => {
    const ok = confirm(
      "Are you sure you want to reset the invite?\n\nThis will remove your current edits (including families, event details, and FAQ) and restore defaults."
    );
    if (!ok) return;

    content = structuredClone(defaultContent);
    onContentChanged();
  });
}

async function onSaveProgressClick() {
  const rsvpState = captureRsvpFormState();
  saveContent();

  el.saveProgress.disabled = true;
  el.saveProgressResult.textContent = "Saving...";

  const backendSaved = await persistContentToBackend();
  if (backendSaved) {
    el.saveProgressResult.textContent = "Saved. Your latest progress is available next time.";
  } else {
    el.saveProgressResult.textContent = "Saved in this browser, but backend save failed. Please check server/API key.";
  }

  applyRsvpFormState(rsvpState);

  el.saveProgress.disabled = false;
}

function captureRsvpFormState() {
  const state = {
    attendance: String(el.rsvpForm?.elements?.attendance?.value || ""),
    familyAttendanceByName: {}
  };

  Array.from(el.familyRsvpList?.querySelectorAll("[data-family-member]") || []).forEach((row) => {
    const key = normalizeName(row.dataset.familyMember || "");
    const select = row.querySelector("select");
    const value = String(select?.value || "");
    if (key) {
      state.familyAttendanceByName[key] = value;
    }
  });

  return state;
}

function applyRsvpFormState(state) {
  if (!state || typeof state !== "object") return;

  const attendanceField = el.rsvpForm?.elements?.attendance;
  const savedAttendance = String(state.attendance || "");
  if (attendanceField && (savedAttendance === "" || savedAttendance === "yes" || savedAttendance === "no")) {
    attendanceField.value = savedAttendance;
  }

  const familyAttendanceByName = state.familyAttendanceByName || {};
  Array.from(el.familyRsvpList?.querySelectorAll("[data-family-member]") || []).forEach((row) => {
    const key = normalizeName(row.dataset.familyMember || "");
    const select = row.querySelector("select");
    if (!select || !key) return;

    const savedValue = String(familyAttendanceByName[key] || "");
    if (savedValue === "" || savedValue === "yes" || savedValue === "no") {
      select.value = savedValue;
    }
  });
}

function refreshCurrentGuestFamilyContext() {
  const currentGuest = String(verifiedGuestContext?.matchedGuest || "").trim();
  if (!currentGuest) return;

  const refreshed = verifyGuestNameLocal(currentGuest);
  if (!refreshed?.allowed) return;

  setVerifiedGuestContext({
    matchedGuest: refreshed.matchedGuest || currentGuest,
    familyMembers: Array.isArray(refreshed.familyMembers) ? refreshed.familyMembers : [currentGuest],
    familyLabel: refreshed.familyLabel || verifiedGuestContext?.familyLabel || ""
  });
}

function initAccessGate() {
  if (!content.access || content.access.enabled === false) {
    unlockInvite();
    updateEditorAccess();
    return;
  }

  document.body.classList.add("locked");
  setAccessFeedback("");
  showGuestAccessView();
  clearAccessSession();
  setVerifiedGuestContext(null);
  el.accessForm.reset();
  el.contactRequestForm?.reset();
  updateEditorAccess();
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatUtcTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function buildWeddingCalendarIcs(rsvp) {
  const summary = escapeIcsText(content.hero?.coupleNames ? `${content.hero.coupleNames} Wedding` : "Wedding Celebration");
  const location = escapeIcsText(content.hero?.venueName || "Wedding Venue");
  const guestName = escapeIcsText(rsvp?.fullName || rsvp?.verifiedGuest || "Guest");
  const description = escapeIcsText(`Wedding celebration on 6 March 2027. RSVP by: ${guestName}.`);
  const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}@withjoy-invite`;
  const dtStamp = formatUtcTimestamp(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WithJoy Inspired Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${CALENDAR_EVENT_START_DATE}`,
    `DTEND;VALUE=DATE:${CALENDAR_EVENT_END_DATE}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function downloadWeddingCalendarIcs(submission) {
  const isAttending = String(submission?.attendance || "").toLowerCase() === "yes";
  if (!isAttending) return;

  const icsContent = buildWeddingCalendarIcs(submission);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "wedding-6-march-2027.ics";
  link.click();
  URL.revokeObjectURL(url);
}

function showGuestAccessView() {
  if (el.accessGuestView) {
    el.accessGuestView.hidden = false;
  }

  if (el.accessContactView) {
    el.accessContactView.hidden = true;
  }
}

function showContactAccessView() {
  if (el.accessGuestView) {
    el.accessGuestView.hidden = true;
  }

  if (el.accessContactView) {
    el.accessContactView.hidden = false;
  }
}

function isValidEmailAddress(value) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getContactRequestEndpoint() {
  const fallbackEndpoint = buildApiUrl("/api/guest-contact");
  const accessEndpoint = String(content.access?.endpoint || "").trim();
  if (!accessEndpoint) {
    return fallbackEndpoint;
  }

  if (accessEndpoint.includes("/api/guest-check")) {
    return accessEndpoint.replace(/\/api\/guest-check$/, "/api/guest-contact");
  }

  try {
    const parsed = new URL(accessEndpoint);
    parsed.pathname = "/api/guest-contact";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return fallbackEndpoint;
  }
}

async function onContactUsLinkClick(event) {
  event.preventDefault();
  showContactAccessView();
  if (el.contactRequestResult) {
    el.contactRequestResult.textContent = "";
  }

  const prefillName = String(el.accessName?.value || "").trim();
  if (prefillName && el.contactRequestName && !el.contactRequestName.value.trim()) {
    el.contactRequestName.value = prefillName;
  }

  el.contactRequestName?.focus();
}

function onBackToGuestLinkClick(event) {
  event.preventDefault();
  showGuestAccessView();
  el.accessName?.focus();
}

async function onContactRequestSubmit(event) {
  event.preventDefault();

  const name = String(el.contactRequestName?.value || "").trim();
  const email = String(el.contactRequestEmail?.value || "").trim();
  const contactNumber = String(el.contactRequestNumber?.value || "").trim();

  if (!name || !email || !contactNumber) {
    if (el.contactRequestResult) {
      el.contactRequestResult.textContent = "Please fill in name, email, and contact number.";
    }
    return;
  }

  if (!isValidEmailAddress(email)) {
    if (el.contactRequestResult) {
      el.contactRequestResult.textContent = "Please provide a valid email.";
    }
    return;
  }

  const endpoint = getContactRequestEndpoint();
  const headers = buildBackendHeaders();

  if (el.contactRequestSubmit) {
    el.contactRequestSubmit.disabled = true;
  }
  if (el.contactRequestResult) {
    el.contactRequestResult.textContent = "Sending your contact details...";
  }

  try {
    const attemptedGuestName = String(el.accessName?.value || "").trim();
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        email,
        contactNumber,
        contactDetails: contactNumber,
        attemptedGuestName,
        source: "access-card",
        requestedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      let backendError = "";
      try {
        const result = await response.json();
        backendError = String(result?.error || "").trim();
      } catch {
        backendError = "";
      }

      throw new Error(backendError || `Contact request failed (${response.status})`);
    }

    if (el.contactRequestResult) {
      el.contactRequestResult.textContent = "Thanks. We received your contact details and will reach out soon.";
    }
    el.contactRequestForm?.reset();
  } catch (error) {
    if (el.contactRequestResult) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("failed to fetch")) {
        el.contactRequestResult.textContent = "Unable to reach the server. Please start the backend server and try again.";
      } else {
        el.contactRequestResult.textContent = `Could not send contact details: ${message}`;
      }
    }
  } finally {
    if (el.contactRequestSubmit) {
      el.contactRequestSubmit.disabled = false;
    }
  }
}

function loadAccessSession() {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_SESSION_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAccessSession(name, context) {
  localStorage.setItem(
    ACCESS_SESSION_KEY,
    JSON.stringify({
      verified: true,
      name,
      context,
      at: new Date().toISOString()
    })
  );
}

function clearAccessSession() {
  localStorage.removeItem(ACCESS_SESSION_KEY);
}

function unlockInvite(name = "", context = null) {
  document.body.classList.remove("locked");
  if (name) {
    el.rsvpForm.elements.fullName.value = name;
  }

  if (context) {
    setVerifiedGuestContext(context);
  } else if (name) {
    setVerifiedGuestContext({
      matchedGuest: name,
      familyMembers: [name],
      familyLabel: ""
    });
  } else {
    setVerifiedGuestContext(null);
  }

  updateEditorAccess(name);
  restoreRsvpForGuest(name);
}

function canCurrentGuestUseEditor(nameOverride = "") {
  const candidate = String(nameOverride || verifiedGuestContext?.matchedGuest || "").trim().toLowerCase();
  return EDITOR_ALLOWED_GUESTS.has(candidate);
}

function updateEditorAccess(nameOverride = "") {
  const allowed = canCurrentGuestUseEditor(nameOverride);

  if (el.editorToggle) {
    el.editorToggle.hidden = !allowed;
    el.editorToggle.disabled = !allowed;
  }

  const editorActionButtons = [el.saveProgress, el.exportContent, el.exportRsvpSummary, el.importContent, el.resetContent];
  editorActionButtons.forEach((button) => {
    if (!button) return;
    button.disabled = !allowed;
  });

  if (!allowed && el.editor) {
    el.editor.classList.remove("open");
    el.editor.setAttribute("aria-hidden", "true");
  }
}

async function onAccessSubmit(event) {
  event.preventDefault();

  const rawName = (el.accessName.value || "").trim();
  console.log("[WithJoy] Access submit for:", JSON.stringify(rawName));
  console.log("[WithJoy] content.access.mode:", content.access?.mode);
  console.log("[WithJoy] localFamilies:", JSON.stringify(content.access?.localFamilies));
  if (!rawName) {
    setAccessFeedback("Please enter your full name.");
    return;
  }

  setAccessFeedback("Checking guest list...");

  try {
    const result = await verifyGuestName(rawName);
    console.log("[WithJoy] verifyGuestName result:", JSON.stringify(result));
    if (!result.allowed) {
      setAccessFeedback("We could not find this name in the guest list. Please try again.");
      return;
    }

    const matchedGuest = result.matchedGuest || rawName;
    const familyMembers = Array.isArray(result.familyMembers) && result.familyMembers.length > 0 ? result.familyMembers : [matchedGuest];
    const guestContext = {
      matchedGuest,
      familyMembers,
      familyLabel: result.familyLabel || ""
    };

    saveAccessSession(matchedGuest, guestContext);
    unlockInvite(matchedGuest, guestContext);
    setAccessFeedback("Access granted.");
  } catch {
    const fallback = verifyGuestNameLocal(rawName);
    if (fallback.allowed) {
      const fallbackGuest = fallback.matchedGuest || rawName;
      const fallbackContext = {
        matchedGuest: fallbackGuest,
        familyMembers: fallback.familyMembers || [fallbackGuest],
        familyLabel: fallback.familyLabel || ""
      };

      saveAccessSession(fallbackGuest, fallbackContext);
      unlockInvite(fallbackGuest, fallbackContext);
      setAccessFeedback("Access granted using local guest list.");
      return;
    }

    setAccessFeedback("Unable to verify right now. Please try again shortly.");
  }
}

async function verifyGuestName(name) {
  const mode = String(content.access.mode || "local").trim().toLowerCase();
  const endpoint = String(content.access.endpoint || "").trim();
  const localResult = verifyGuestNameLocal(name);

  if (mode !== "backend") {
    if (localResult.allowed) {
      return localResult;
    }

    if (!endpoint) {
      return localResult;
    }
  }

  if (!endpoint && mode === "backend") {
    return localResult;
  }

  const backendResult = await verifyGuestNameBackend(name);

  // In backend mode, fallback to local list if backend check fails.
  return backendResult.allowed ? backendResult : localResult;
}

async function verifyGuestNameBackend(name) {
  const method = (content.access.method || "POST").toUpperCase();
  const endpoint = String(content.access.endpoint || "").trim();
  if (!endpoint) {
    return { allowed: false };
  }

  const fieldName = content.access.requestNameField || "name";
  const successField = content.access.successField || "allowed";
  const headers = {
    "Content-Type": "application/json"
  };

  const apiKeyValue = String(content.access.apiKey || "").trim();
  if (apiKeyValue && apiKeyValue.toLowerCase() !== "change-me") {
    headers[content.access.apiKeyHeader || "x-api-key"] = apiKeyValue;
  }

  let response;
  if (method === "GET") {
    const url = new URL(endpoint);
    url.searchParams.set(fieldName, name);
    response = await fetch(url.toString(), { method: "GET", headers });
  } else {
    response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({ [fieldName]: name })
    });
  }

  if (!response.ok) {
    return { allowed: false };
  }

  const result = await response.json();
  const allowedValue = result?.[successField];
  const allowed = parseAllowedValue(allowedValue);
  if (!allowed) {
    return { allowed: false };
  }

  const matchedGuest = typeof result?.matchedGuest === "string" && result.matchedGuest.trim() ? result.matchedGuest.trim() : name;
  const familyMembers = Array.isArray(result?.familyMembers)
    ? result.familyMembers.map((item) => String(item).trim()).filter(Boolean)
    : [matchedGuest];

  return {
    allowed: true,
    matchedGuest,
    familyMembers,
    familyLabel: typeof result?.familyLabel === "string" ? result.familyLabel : ""
  };
}

function verifyGuestNameLocal(name) {
  const localFamilies = Array.isArray(content.access.localFamilies) ? content.access.localFamilies : [];
  const familyLookup = localFamilies.flatMap((family, familyIndex) => {
    const familyId = family.id || `family-${familyIndex + 1}`;
    const familyLabel = String(family.label || `Family ${familyIndex + 1}`).trim();
    const members = Array.isArray(family.members) ? family.members : [];

    return members
      .map((memberName) => String(memberName || "").trim())
      .filter(Boolean)
      .map((memberName) => ({
        familyId,
        familyLabel,
        name: memberName,
        normalizedName: normalizeName(memberName)
      }));
  });

  const matchedFamilyMember = findUniqueFamilyMemberMatch(familyLookup, name);
  if (matchedFamilyMember) {
    const familyMembers = familyLookup
      .filter((member) => member.familyId === matchedFamilyMember.familyId)
      .map((member) => member.name);

    return {
      allowed: true,
      matchedGuest: matchedFamilyMember.name,
      familyMembers,
      familyLabel: matchedFamilyMember.familyLabel
    };
  }

  const list = Array.isArray(content.access.guestList) ? content.access.guestList : [];
  const matchedNormalized = findUniqueGuestMatch(list, name);
  if (!matchedNormalized) {
    return { allowed: false };
  }

  const matchedGuest = list.find((guestName) => normalizeName(guestName) === matchedNormalized) || name;
  return {
    allowed: true,
    matchedGuest,
    familyMembers: [matchedGuest],
    familyLabel: ""
  };
}

function findUniqueFamilyMemberMatch(familyLookup, rawInput) {
  const input = normalizeName(rawInput);
  if (!input) return null;

  const exactMatch = familyLookup.find((member) => member.normalizedName === input);
  if (exactMatch) {
    return exactMatch;
  }

  const singleTokenInput = !input.includes(" ");
  if (singleTokenInput) {
    const firstNameMatches = familyLookup.filter((member) => member.normalizedName.split(" ")[0] === input);
    if (firstNameMatches.length === 1) {
      return firstNameMatches[0];
    }
  }

  const prefixMatches = familyLookup.filter((member) => member.normalizedName.startsWith(`${input} `));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  return null;
}

function setVerifiedGuestContext(context) {
  if (!context || typeof context !== "object") {
    verifiedGuestContext = null;
    renderFamilyRsvpSection();
    return;
  }

  const matchedGuest = String(context.matchedGuest || "").trim();
  const familyMembers = Array.isArray(context.familyMembers)
    ? context.familyMembers.map((item) => String(item).trim()).filter(Boolean)
    : [];

  verifiedGuestContext = {
    matchedGuest: matchedGuest || familyMembers[0] || "",
    familyMembers: familyMembers.length > 0 ? familyMembers : matchedGuest ? [matchedGuest] : [],
    familyLabel: String(context.familyLabel || "").trim()
  };

  renderFamilyRsvpSection();
}

function renderFamilyRsvpSection() {
  if (!el.familyRsvpSection || !el.familyRsvpList) return;

  const existingResponseByMember = new Map(
    Array.from(el.familyRsvpList.querySelectorAll("[data-family-member]")).map((row) => {
      const select = row.querySelector("select");
      return [normalizeName(row.dataset.familyMember || ""), select?.value || ""];
    })
  );

  el.familyRsvpList.innerHTML = "";

  if (!verifiedGuestContext || verifiedGuestContext.familyMembers.length === 0) {
    el.familyRsvpSection.hidden = true;
    return;
  }

  const matchedNormalized = normalizeName(verifiedGuestContext.matchedGuest);
  const otherMembers = verifiedGuestContext.familyMembers.filter(
    (member) => normalizeName(member) !== matchedNormalized
  );

  if (otherMembers.length === 0) {
    el.familyRsvpSection.hidden = true;
    return;
  }

  el.familyRsvpSection.hidden = false;
  el.familyRsvpTitle.textContent = verifiedGuestContext.familyLabel
    ? `${verifiedGuestContext.familyLabel} RSVP`
    : "Family RSVP";
  el.familyRsvpHint.textContent = "You can RSVP on behalf of the rest of your family members below.";

  otherMembers.forEach((memberName, index) => {
    const row = document.createElement("label");
    row.className = "family-member-row";
    row.dataset.familyMember = memberName;

    const title = document.createElement("span");
    title.textContent = memberName;

    const select = document.createElement("select");
    select.name = `familyAttendance_${index}`;
    select.innerHTML =
      '<option value="">Select attendance</option>' +
      '<option value="yes">Attending</option>' +
      '<option value="no">Not attending</option>';

    const existingValue = existingResponseByMember.get(normalizeName(memberName));
    if (existingValue === "yes" || existingValue === "no") {
      select.value = existingValue;
    }

    row.append(title, select);
    el.familyRsvpList.append(row);
  });
}

function findUniqueGuestMatch(guestList, rawInput) {
  const input = normalizeName(rawInput);
  if (!input) return null;

  const normalizedGuests = guestList
    .map((name) => normalizeName(name))
    .filter(Boolean);

  if (normalizedGuests.includes(input)) {
    return input;
  }

  const singleTokenInput = !input.includes(" ");
  if (singleTokenInput) {
    const firstNameMatches = normalizedGuests.filter((guest) => guest.split(" ")[0] === input);
    if (firstNameMatches.length === 1) {
      return firstNameMatches[0];
    }
  }

  const prefixMatches = normalizedGuests.filter((guest) => guest.startsWith(`${input} `));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  return null;
}

function parseAllowedValue(value) {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "allowed";
  }

  return false;
}

function formatDetailText(value) {
  return escapeHtml(value)
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .replace(/\n/g, "<br>");
}

function normalizeName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

async function onRsvpSubmit(event) {
  event.preventDefault();

  if (document.body.classList.contains("locked")) {
    el.rsvpResult.textContent = "Please verify your guest name first.";
    return;
  }

  const data = new FormData(event.target);
  const entry = Object.fromEntries(data.entries());
  const familyResponses = Array.from(el.familyRsvpList.querySelectorAll("[data-family-member]")).map((row) => {
    const select = row.querySelector("select");
    return {
      name: row.dataset.familyMember,
      attendance: select?.value || ""
    };
  });

  const answeredFamilyResponses = familyResponses.filter((item) => item.attendance);
  if (answeredFamilyResponses.length > 0) {
    entry.familyResponses = answeredFamilyResponses;
  }

  if (verifiedGuestContext?.familyLabel) {
    entry.familyLabel = verifiedGuestContext.familyLabel;
  }

  if (verifiedGuestContext?.matchedGuest) {
    entry.verifiedGuest = verifiedGuestContext.matchedGuest;
  }

  const existing = loadRsvpSubmissions();
  const submission = {
    ...entry,
    submittedAt: new Date().toISOString()
  };

  const submissionKey = getSubmissionKey(submission);
  const existingIndex = existing.findIndex((item) => getSubmissionKey(item) === submissionKey);
  if (existingIndex >= 0) {
    existing[existingIndex] = submission;
  } else {
    existing.push(submission);
  }

  localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(existing));

  const backendSaved = await persistRsvpSubmissionsToBackend(existing);
  el.rsvpResult.textContent = backendSaved
    ? "Thanks for your RSVP. Your response has been saved."
    : "Thanks for your RSVP. Saved in this browser only (backend sync failed).";
  downloadWeddingCalendarIcs(submission);

  // Send email notification via backend (fire-and-forget, non-blocking)
  const rsvpEndpoint = (content.access?.endpoint || buildApiUrl("/api/guest-check"))
    .replace(/\/api\/guest-check$/, "/api/rsvp");
  fetch(rsvpEndpoint, {
    method: "POST",
    headers: buildBackendHeaders(),
    body: JSON.stringify(submission)
  }).catch(() => {
    // Email sending failure doesn't affect the local RSVP save
  });
}

function loadRsvpSubmissions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function onExportRsvpSummaryClick() {
  const summary = summarizeRsvpAttendance();
  const summaryRowsHtml = [
    "<tr><th style=\"text-align:left;padding:6px;border:1px solid #ccc\">Metric</th><th style=\"text-align:left;padding:6px;border:1px solid #ccc\">Count</th></tr>",
    `<tr><td style=\"padding:6px;border:1px solid #ccc\">Total invited</td><td style=\"padding:6px;border:1px solid #ccc\">${summary.totalInvited}</td></tr>`,
    `<tr><td style=\"padding:6px;border:1px solid #ccc\">Attending</td><td style=\"padding:6px;border:1px solid #ccc\">${summary.attending}</td></tr>`,
    `<tr><td style=\"padding:6px;border:1px solid #ccc\">Not attending</td><td style=\"padding:6px;border:1px solid #ccc\">${summary.notAttending}</td></tr>`,
    `<tr><td style=\"padding:6px;border:1px solid #ccc\">Not responded</td><td style=\"padding:6px;border:1px solid #ccc\">${summary.notResponded}</td></tr>`
  ].join("");

  const guestRowsHtml = summary.guestRows
    .map(
      (row) =>
        `<tr><td style=\"padding:6px;border:1px solid #ccc\">${escapeExcelCell(row.name)}</td><td style=\"padding:6px;border:1px solid #ccc\">${escapeExcelCell(row.status)}</td><td style=\"padding:6px;border:1px solid #ccc\">${escapeExcelCell(row.kidsCount)}</td><td style=\"padding:6px;border:1px solid #ccc\">${escapeExcelCell(row.dietary)}</td></tr>`
    )
    .join("");

  const excelHtml = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <table>
    ${summaryRowsHtml}
  </table>
  <br />
  <table>
    <tr><th style="text-align:left;padding:6px;border:1px solid #ccc">Guest</th><th style="text-align:left;padding:6px;border:1px solid #ccc">Status</th><th style="text-align:left;padding:6px;border:1px solid #ccc">Kids attending</th><th style="text-align:left;padding:6px;border:1px solid #ccc">Dietary notes</th></tr>
    ${guestRowsHtml}
  </table>
</body>
</html>`;

  const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `rsvp-summary-${stamp}.xls`;
  link.click();
  URL.revokeObjectURL(url);

  if (el.saveProgressResult) {
    el.saveProgressResult.textContent = `RSVP summary exported. Attending: ${summary.attending}, Not attending: ${summary.notAttending}, Not responded: ${summary.notResponded}.`;
  }
}

function escapeExcelCell(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function summarizeRsvpAttendance() {
  const invitedGuests = getInvitedGuestMap();
  const rsvpDetailsByGuest = getLatestRsvpDetailsByGuest();

  let attending = 0;
  let notAttending = 0;
  let notResponded = 0;

  const guestRows = Array.from(invitedGuests.entries())
    .map(([normalizedName, displayName]) => {
      const details = rsvpDetailsByGuest.get(normalizedName) || null;
      const status = details?.status || "not responded";
      if (status === "attending") attending += 1;
      else if (status === "not attending") notAttending += 1;
      else notResponded += 1;

      return {
        name: displayName,
        status,
        kidsCount: details?.kidsCount || "",
        dietary: details?.dietary || ""
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    totalInvited: invitedGuests.size,
    attending,
    notAttending,
    notResponded,
    guestRows
  };
}

function getInvitedGuestMap() {
  const invited = new Map();
  const addGuest = (name) => {
    const displayName = String(name || "").trim();
    const key = normalizeName(displayName);
    if (!key || invited.has(key)) return;
    invited.set(key, displayName);
  };

  const localFamilies = Array.isArray(content.access?.localFamilies) ? content.access.localFamilies : [];
  if (localFamilies.length > 0) {
    localFamilies.forEach((family) => {
      const members = Array.isArray(family?.members) ? family.members : [];
      members.forEach(addGuest);
    });
  } else {
    const guestList = Array.isArray(content.access?.guestList) ? content.access.guestList : [];
    guestList.forEach(addGuest);
  }

  return invited;
}

function getLatestRsvpDetailsByGuest() {
  const submissions = loadRsvpSubmissions();
  const detailsByGuest = new Map();
  const ordered = [...submissions].sort((a, b) => {
    const aTime = Date.parse(a?.submittedAt || "") || 0;
    const bTime = Date.parse(b?.submittedAt || "") || 0;
    return aTime - bTime;
  });

  const mapAttendance = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "yes") return "attending";
    if (normalized === "no") return "not attending";
    return "";
  };

  ordered.forEach((submission) => {
    const kidsCount = String(submission?.kidsCount || "").trim();
    const dietary = String(submission?.dietary || "").trim();

    const primaryName = normalizeName(submission?.verifiedGuest || submission?.fullName || "");
    const primaryStatus = mapAttendance(submission?.attendance);
    if (primaryName && primaryStatus) {
      detailsByGuest.set(primaryName, {
        status: primaryStatus,
        kidsCount,
        dietary
      });
    }

    const familyResponses = Array.isArray(submission?.familyResponses) ? submission.familyResponses : [];
    familyResponses.forEach((response) => {
      const memberName = normalizeName(response?.name || "");
      const memberStatus = mapAttendance(response?.attendance);
      if (memberName && memberStatus) {
        detailsByGuest.set(memberName, {
          status: memberStatus,
          kidsCount: "",
          dietary: ""
        });
      }
    });
  });

  return detailsByGuest;
}

function getSubmissionKey(entry) {
  const verified = normalizeName(entry?.verifiedGuest || "");
  if (verified) return `verified:${verified}`;

  const fullName = normalizeName(entry?.fullName || "");
  return `name:${fullName}`;
}

function restoreRsvpForGuest(name) {
  const submissions = loadRsvpSubmissions();
  if (submissions.length === 0) return;

  const guestName = normalizeName(verifiedGuestContext?.matchedGuest || name || "");
  if (!guestName) return;

  const latest = [...submissions]
    .reverse()
    .find((item) => getGuestRsvpView(item, guestName));

  if (!latest) return;

  const guestView = getGuestRsvpView(latest, guestName);
  if (!guestView) return;

  const setFieldValue = (fieldName, value) => {
    const field = el.rsvpForm.elements[fieldName];
    if (field && typeof value === "string") {
      field.value = value;
    }
  };

  setFieldValue("fullName", guestView.fullName);
  setFieldValue("email", guestView.email);
  setFieldValue("attendance", guestView.attendance);
  setFieldValue("kidsCount", guestView.kidsCount);
  setFieldValue("dietary", guestView.dietary);
  setFieldValue("message", guestView.message);

  const familyResponses = Array.isArray(latest.familyResponses) ? latest.familyResponses : [];
  const responseByName = new Map(
    familyResponses.map((response) => [normalizeName(response.name || ""), response.attendance || ""])
  );

  const verifiedGuestKey = normalizeName(latest?.verifiedGuest || "");
  if (verifiedGuestKey && latest?.attendance) {
    responseByName.set(verifiedGuestKey, String(latest.attendance));
  }

  Array.from(el.familyRsvpList.querySelectorAll("[data-family-member]")).forEach((row) => {
    const key = normalizeName(row.dataset.familyMember || "");
    const select = row.querySelector("select");
    if (select && responseByName.has(key)) {
      select.value = responseByName.get(key);
    }
  });

  const submittedAt = latest.submittedAt ? new Date(latest.submittedAt) : null;
  const submittedText = submittedAt && !Number.isNaN(submittedAt.getTime())
    ? `Loaded your previous RSVP from ${submittedAt.toLocaleString()}.`
    : "Loaded your previous RSVP.";
  el.rsvpResult.textContent = `${submittedText} You can edit and submit again.`;
}

function getGuestRsvpView(submission, guestName) {
  const normalizedGuestName = normalizeName(guestName);
  const verifiedMatch = normalizeName(submission?.verifiedGuest || "") === normalizedGuestName;
  const fullNameMatch = normalizeName(submission?.fullName || "") === normalizedGuestName;
  const familyResponses = Array.isArray(submission?.familyResponses) ? submission.familyResponses : [];
  const familyMatch = familyResponses.find(
    (response) => normalizeName(response?.name || "") === normalizedGuestName
  );

  if (!verifiedMatch && !fullNameMatch && !familyMatch) {
    return null;
  }

  if (familyMatch && !verifiedMatch && !fullNameMatch) {
    return {
      fullName: verifiedGuestContext?.matchedGuest || familyMatch.name || "",
      email: "",
      attendance: String(familyMatch.attendance || ""),
      kidsCount: String(submission?.kidsCount || "0"),
      dietary: "",
      message: String(submission?.message || "")
    };
  }

  return {
    fullName: String(submission?.fullName || verifiedGuestContext?.matchedGuest || ""),
    email: String(submission?.email || ""),
    attendance: String(submission?.attendance || ""),
    kidsCount: String(submission?.kidsCount || "0"),
    dietary: String(submission?.dietary || ""),
    message: String(submission?.message || "")
  };
}

function onContentChanged() {
  saveContent();
  scheduleContentSync();
  renderAll();
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((acc, key) => acc[key], obj);
  target[last] = value;
}

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }

  if (typeof base !== "object" || base === null) {
    return override ?? base;
  }

  const result = { ...base };

  for (const key of Object.keys(override || {})) {
    if (!(key in base)) {
      result[key] = override[key];
      continue;
    }

    result[key] = deepMerge(base[key], override[key]);
  }

  return result;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
