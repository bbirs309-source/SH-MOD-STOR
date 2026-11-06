const $ = (id) => document.getElementById(id);

// Show a useful message instead of silently stopping if a file or CDN is missing.
function setStatus(message, error = false) {
  const el = $("status");
  if (el) {
    el.textContent = message;
    el.classList.toggle("error", error);
  }
}
function setAdminStatus(message, error = false) {
  const el = $("adminStatus");
  if (el) {
    el.textContent = message;
    el.classList.toggle("error", error);
  }
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

if ($("year")) $("year").textContent = new Date().getFullYear();

const configured = Boolean(
  window.SH_SUPABASE_URL?.startsWith("https://") &&
  window.SH_SUPABASE_ANON_KEY &&
  !window.SH_SUPABASE_ANON_KEY.includes("YOUR_")
);
const supabaseLib = window.supabase;
const db = configured && supabaseLib?.createClient
  ? supabaseLib.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_ANON_KEY)
  : null;

let allApps = [];
let activeFilter = "all";

function publicUrl(path) {
  if (!path || !db) return "#";
  return db.storage.from("apks").getPublicUrl(path).data.publicUrl;
}

function renderApps() {
  const search = $("searchInput");
  const grid = $("appGrid");
  if (!search || !grid) return;
  const term = search.value.trim().toLowerCase();
  const shown = allApps.filter(app =>
    (activeFilter === "all" || app.category === activeFilter) &&
    `${app.title || app.name || ""} ${app.description || ""} ${app.category || ""}`.toLowerCase().includes(term)
  );
  grid.innerHTML = shown.map(app => `
    <article class="app-card">
      <div class="app-card-top"><div class="app-icon">${app.icon_path ? `<img src="${escapeHTML(publicUrl(app.icon_path))}" alt="">` : "✦"}</div><span class="category">${escapeHTML(app.category || "APP")}</span></div>
      <h3>${escapeHTML(app.title || app.name || "Untitled app")}</h3><p>${escapeHTML(app.description || "বিস্তারিত তথ্য দেওয়া হয়নি।")}</p>
      <div class="app-meta"><span>VERSION ${escapeHTML(app.version || "N/A")}</span><span>${app.created_at ? new Date(app.created_at).toLocaleDateString("bn-BD") : ""}</span></div>
      <a class="btn btn-primary download-btn" href="${escapeHTML(publicUrl(app.apk_path))}" target="_blank" rel="noopener" download>DOWNLOAD APK <span>↓</span></a>
    </article>`).join("");
  if (!shown.length) setStatus(term || activeFilter !== "all" ? "এই ফিল্টারে কোনো অ্যাপ পাওয়া যায়নি।" : "এখনো কোনো অ্যাপ আপলোড করা হয়নি।");
  else setStatus(`${shown.length}টি অ্যাপ পাওয়া গেছে`);
}

async function loadApps() {
  if (!configured) {
    setStatus("config.js-এ Supabase Project URL ও Publishable/anon key ঠিক করো।", true);
    return;
  }
  if (!db) {
    setStatus("Supabase লাইব্রেরি লোড হয়নি। ইন্টারনেট/CDN সংযোগ পরীক্ষা করে পেজ Refresh করো।", true);
    return;
  }
  const { data, error } = await db.from("apps").select("*").order("created_at", { ascending: false });
  if (error) {
    setStatus("অ্যাপ লোড করা যায়নি: " + error.message, true);
    return;
  }
  allApps = data || [];
  renderApps();
}

document.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
  btn.classList.add("active");
  activeFilter = btn.dataset.filter || "all";
  renderApps();
}));
if ($("searchInput")) $("searchInput").addEventListener("input", renderApps);

const modal = $("adminModal");
function openModal() {
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}
if ($("adminOpen")) $("adminOpen").addEventListener("click", openModal);
if ($("adminClose")) $("adminClose").addEventListener("click", closeModal);
if (modal) modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

async function refreshAdmin() {
  if (!db) return;
  try {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      if ($("loginBox")) $("loginBox").hidden = false;
      if ($("dashboard")) $("dashboard").hidden = true;
      return;
    }
    const { data: admin, error } = await db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!admin) {
      await db.auth.signOut();
      if ($("loginBox")) $("loginBox").hidden = false;
      if ($("dashboard")) $("dashboard").hidden = true;
      setAdminStatus("এই ইমেইলটি Admin হিসেবে অনুমোদিত নয়। Supabase admin_users টেবিলে UUID যোগ করো।", true);
      return;
    }
    if ($("loginBox")) $("loginBox").hidden = true;
    if ($("dashboard")) $("dashboard").hidden = false;
    setAdminStatus("Admin হিসেবে লগইন হয়েছে।");
  } catch (err) {
    setAdminStatus("Admin যাচাই করা যায়নি: " + (err.message || err), true);
  }
}

if ($("loginBtn")) $("loginBtn").addEventListener("click", async () => {
  const btn = $("loginBtn");
  if (!db) {
    setAdminStatus(!configured ? "config.js-এ Supabase URL/Key ঠিক নেই।" : "Supabase JavaScript CDN লোড হয়নি। ইন্টারনেট চালু করে Refresh করো।", true);
    return;
  }
  const email = $("email")?.value.trim();
  const password = $("password")?.value;
  if (!email || !password) {
    setAdminStatus("ইমেইল ও পাসওয়ার্ড দুটোই লিখো।", true);
    return;
  }
  btn.disabled = true;
  btn.textContent = "LOGGING IN...";
  setAdminStatus("লগইন যাচাই করা হচ্ছে...");
  try {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshAdmin();
  } catch (err) {
    setAdminStatus("লগইন ব্যর্থ: " + (err.message || err), true);
  } finally {
    btn.disabled = false;
    btn.textContent = "LOGIN";
  }
});

if ($("logoutBtn")) $("logoutBtn").addEventListener("click", async () => {
  if (!db) return;
  const { error } = await db.auth.signOut();
  if (error) setAdminStatus("Logout সমস্যা: " + error.message, true);
  await refreshAdmin();
});

function safeFileName(name) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "upload";
}
async function uploadFile(file, folder) {
  const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await db.storage.from("apks").upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream"
  });
  if (error) throw error;
  return path;
}

if ($("uploadBtn")) $("uploadBtn").addEventListener("click", async () => {
  const btn = $("uploadBtn");
  const apk = $("apkFile")?.files?.[0];
  const title = $("appTitle")?.value.trim();
  if (!db) return setAdminStatus("Supabase সংযোগ নেই।", true);
  if (!apk || !title) return setAdminStatus("অ্যাপের নাম ও APK ফাইল দিতে হবে।", true);
  if (!apk.name.toLowerCase().endsWith(".apk")) return setAdminStatus("শুধু .apk ফাইল আপলোড করা যাবে।", true);
  if (apk.size > 200 * 1024 * 1024) return setAdminStatus("APK ফাইল ২০০ MB-এর কম হতে হবে।", true);
  btn.disabled = true;
  btn.textContent = "UPLOADING...";
  setAdminStatus("ফাইল আপলোড হচ্ছে, অপেক্ষা করো...");
  try {
    
const {error} = await db.from("apps").insert({
  name: $("appTitle").value.trim(),
  title: $("appTitle").value.trim(),
  description: $("appDescription").value.trim(),
  version: $("appVersion").value.trim(),
  category: $("appCategory").value,
  apk_path: apkPath,
  icon_path: iconPath
});
    if (error) throw error;
    setAdminStatus("সফলভাবে আপলোড হয়েছে! স্টোরে এখন দেখা যাবে।");
    ["appTitle", "appDescription", "appVersion", "apkFile", "appIcon"].forEach(id => { if ($(id)) $(id).value = ""; });
    await loadApps();
  } catch (err) {
    setAdminStatus("আপলোড ব্যর্থ: " + (err.message || err), true);
  } finally {
    btn.disabled = false;
    btn.textContent = "UPLOAD TO STORE";
  }
});

if (db) {
  refreshAdmin();
  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
      // Defer work until the auth callback has returned.
      setTimeout(() => refreshAdmin(), 0);
    }
  });
}
loadApps();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
