const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();
const configured = window.SH_SUPABASE_URL?.startsWith("https://") &&
  window.SH_SUPABASE_ANON_KEY && !window.SH_SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured ? window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_ANON_KEY) : null;
let allApps = [], activeFilter = "all";

function setStatus(message, error=false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function publicUrl(path) {
  return db.storage.from("apks").getPublicUrl(path).data.publicUrl;
}
function renderApps() {
  const term = $("searchInput").value.trim().toLowerCase();
  const shown = allApps.filter(app => (activeFilter === "all" || app.category === activeFilter) &&
    `${app.title} ${app.description || ""} ${app.category}`.toLowerCase().includes(term));
  $("appGrid").innerHTML = shown.map(app => `
    <article class="app-card">
      <div class="app-card-top"><div class="app-icon">${app.icon_path ? `<img src="${escapeHTML(publicUrl(app.icon_path))}" alt="">` : "✦"}</div><span class="category">${escapeHTML(app.category || "APP")}</span></div>
      <h3>${escapeHTML(app.title)}</h3><p>${escapeHTML(app.description || "বিস্তারিত তথ্য দেওয়া হয়নি।")}</p>
      <div class="app-meta"><span>VERSION ${escapeHTML(app.version || "N/A")}</span><span>${new Date(app.created_at).toLocaleDateString("bn-BD")}</span></div>
      <a class="btn btn-primary download-btn" href="${escapeHTML(publicUrl(app.apk_path))}" target="_blank" rel="noopener" download>DOWNLOAD APK <span>↓</span></a>
    </article>`).join("");
  if (!shown.length) setStatus(term || activeFilter !== "all" ? "এই ফিল্টারে কোনো অ্যাপ পাওয়া যায়নি।" : "এখনো কোনো অ্যাপ আপলোড করা হয়নি।");
  else setStatus(`${shown.length}টি অ্যাপ পাওয়া গেছে`);
}
async function loadApps() {
  if (!db) { setStatus("প্রথমে config.js ফাইলে Supabase URL ও anon key বসাও।", true); return; }
  const {data, error} = await db.from("apps").select("*").order("created_at", {ascending:false});
  if (error) { setStatus("অ্যাপ লোড করা যায়নি: " + error.message, true); return; }
  allApps = data || []; renderApps();
}
document.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
  btn.classList.add("active"); activeFilter = btn.dataset.filter; renderApps();
}));
$("searchInput").addEventListener("input", renderApps);

const modal = $("adminModal");
function openModal(){ modal.classList.add("show"); modal.setAttribute("aria-hidden","false"); }
function closeModal(){ modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); }
$("adminOpen").addEventListener("click", openModal);
$("adminClose").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if(e.target === modal) closeModal(); });

async function refreshAdmin() {
  if (!db) return;
  const {data:{session}} = await db.auth.getSession();
  if (!session) { $("loginBox").hidden = false; $("dashboard").hidden = true; return; }
  const {data: admin, error} = await db.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (error || !admin) {
    await db.auth.signOut();
    $("loginBox").hidden = false; $("dashboard").hidden = true;
    $("adminStatus").textContent = "এই অ্যাকাউন্টটি অ্যাডমিন হিসেবে অনুমোদিত নয়।";
    return;
  }
  $("loginBox").hidden = true; $("dashboard").hidden = false;
}
$("loginBtn").addEventListener("click", async () => {
  if (!db) return alert("আগে config.js সেটআপ করো।");
  const {error} = await db.auth.signInWithPassword({email:$("email").value.trim(), password:$("password").value});
  if (error) return alert(error.message);
  await refreshAdmin();
});
$("logoutBtn").addEventListener("click", async () => { await db.auth.signOut(); await refreshAdmin(); });
function safeFileName(name){ return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100) || "upload"; }
async function uploadFile(file, folder) {
  const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const {error} = await db.storage.from("apks").upload(path, file, {upsert:false, contentType:file.type || "application/octet-stream"});
  if (error) throw error;
  return path;
}
$("uploadBtn").addEventListener("click", async () => {
  const btn = $("uploadBtn"), apk = $("apkFile").files[0];
  if (!apk || !$("appTitle").value.trim()) return alert("অ্যাপের নাম ও APK ফাইল দিতে হবে।");
  if (!apk.name.toLowerCase().endsWith(".apk")) return alert("শুধু .apk ফাইল আপলোড করা যাবে।");
  if (apk.size > 200 * 1024 * 1024) return alert("APK ফাইল ২০০ MB-এর কম হতে হবে।");
  btn.disabled = true; btn.textContent = "UPLOADING...";
  $("adminStatus").textContent = "ফাইল আপলোড হচ্ছে, অপেক্ষা করো...";
  let apkPath = null, iconPath = null;
  try {
    apkPath = await uploadFile(apk, "downloads");
    const icon = $("appIcon").files[0];
    if (icon) iconPath = await uploadFile(icon, "icons");
    const {error} = await db.from("apps").insert({
      title:$("appTitle").value.trim(), description:$("appDescription").value.trim(),
      version:$("appVersion").value.trim(), category:$("appCategory").value,
      apk_path:apkPath, icon_path:iconPath
    });
    if (error) throw error;
    $("adminStatus").textContent = "সফলভাবে আপলোড হয়েছে! স্টোরে এখন দেখা যাবে।";
    ["appTitle","appDescription","appVersion","apkFile","appIcon"].forEach(id => $(id).value = "");
    await loadApps();
  } catch (err) {
    $("adminStatus").textContent = "আপলোড ব্যর্থ: " + err.message;
  } finally { btn.disabled = false; btn.textContent = "UPLOAD TO STORE"; }
});
if (db) { refreshAdmin(); db.auth.onAuthStateChange(() => refreshAdmin()); }
loadApps();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
