// Lodestone's website, shared by every page: the header, the home page's cycling headline,
// scrolling rows and comparison, and the newest version and changelog read from the public
// releases on GitHub. (The download page's version picker is in download.js.)

/** Set this to your Ko-fi page (https://ko-fi.com/...) when it exists; every Ko-fi button uses it. */
const KOFI_URL = "";

const RELEASES = "https://api.github.com/repos/SparkFruit/lodestone-releases/releases";
const LATEST_PAGE = "https://github.com/SparkFruit/lodestone-releases/releases/latest";
/** In-depth posts, by version: the updates list links to them. */
const POSTS = { "0.2.0": "posts/lodestone-0-2-0.html" };
/** Where this page sits relative to the site's root ("" or "../"), for links it makes. */
const BASE = document.querySelector('link[rel="stylesheet"][href*="styles.css"]').getAttribute("href").replace(/styles\.css.*$/, "");

// ---------------------------------------------------------------- headline
const words = ["made easy", "in a minute", "with your friends", "on your own PC", "with any modpack", "without port forwarding"];
const rotate = document.getElementById("rotate");
let wordIndex = 0;
if (rotate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  setInterval(() => {
    rotate.classList.add("out");
    setTimeout(() => {
      wordIndex = (wordIndex + 1) % words.length;
      rotate.textContent = words[wordIndex];
      rotate.classList.remove("out");
      rotate.classList.add("in");
      requestAnimationFrame(() => requestAnimationFrame(() => rotate.classList.remove("in")));
    }, 450);
  }, 2600);
}

// ---------------------------------------------------------------- scrolling rows
const types = [
  ["grass_block", "Vanilla", "The game as Mojang makes it"],
  ["bookshelf", "Paper", "Fast, with Bukkit plugins"],
  ["amethyst_block", "Purpur", "Paper with extra options"],
  ["crafting_table", "Fabric", "Light mods, quick updates"],
  ["barrel", "NeoForge", "Big modded worlds"],
  ["chest", "Forge", "The classic mod loader"],
  ["emerald_ore", "Quilt", "Fabric-compatible mods"],
  ["diamond_ore", "Modpacks", "From Modrinth and CurseForge"],
  ["gold_block", "Bedrock", "Phones, consoles and Windows"],
];
const features = [
  ["lodestone", "No port forwarding", "Addresses through playit.gg"],
  ["beacon", "Live analytics", "CPU, memory, TPS, players"],
  ["chest", "Backups", "On a schedule, one-click restore"],
  ["redstone_ore", "Game rules", "Keep inventory and more"],
  ["grass_block", "World map", "Drawn from your save files"],
  ["amethyst_block", "Remote management", "Friends help, with a password"],
  ["bookshelf", "Mods in one click", "Dependencies included"],
  ["gold_block", "Geyser", "Bedrock players on Java"],
];
const chip = ([block, title, text]) =>
  `<div class="chip"><img src="assets/blocks/${block}.webp" alt="" loading="lazy" /><div><b>${title}</b><span>${text}</span></div></div>`;
// Each row holds its cards twice, so scrolling by half loops without a jump.
const fill = (id, list) => {
  const track = document.getElementById(id);
  if (track) track.innerHTML = [...list, ...list].map(chip).join("");
};
fill("track-a", types);
fill("track-b", features);

// ---------------------------------------------------------------- comparison
// Columns: Lodestone, SquidServers, Aternos, Minehut, playit.gg, e4mc, Essential.
const Y = () => ["yes", "✓", "Yes"];
const P = (text) => ["part", "–", text];
const N = () => ["no", "✕", "No"];
const rows = [
  ["Free", "No monthly fees", [Y(), Y(), Y(), P("Free tier"), Y(), Y(), Y()]],
  ["No port forwarding", "Works behind any router", [Y(), Y(), Y(), Y(), Y(), Y(), Y()]],
  ["Stays online when you leave", "Friends keep playing without you", [Y(), Y(), P("Stops when empty"), P("Sleeps when empty"), Y(), N(), N()]],
  ["Sets up the server for you", "Pick a version and go", [Y(), Y(), Y(), Y(), N(), N(), N()]],
  ["Any mods or modpack", "Modrinth, CurseForge or your own", [Y(), Y(), P("Some"), P("Some"), N(), Y(), Y()]],
  ["Performance analytics", "TPS, memory and players", [Y(), Y(), N(), N(), N(), N(), N()]],
  ["Friends can help manage", "With a password you give them", [Y(), N(), Y(), N(), N(), N(), N()]],
  ["Live world map", "Built in, no plugins", [Y(), N(), N(), N(), N(), N(), N()]],
];
const cell = ([kind, mark, text], us) => `<td${us ? ' class="us"' : ""}><span class="mark ${kind}">${mark}</span><span>${text}</span></td>`;
const compareBody = document.getElementById("compare-body");
if (compareBody) {
  compareBody.innerHTML = rows
    .map(([title, sub, cells]) => `<tr><td><b>${title}</b><small>${sub}</small></td>${cells.map((c, i) => cell(c, i === 0)).join("")}</tr>`)
    .join("");
}

// ---------------------------------------------------------------- releases
const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const formatSize = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

/** Release notes are "- " lines; anything else becomes a plain line. */
const notesList = (body) => {
  const lines = (body || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "<ul><li>Bug fixes and improvements.</li></ul>";
  return `<ul>${lines.map((l) => `<li>${escapeHtml(l.replace(/^[-*]\s*/, ""))}</li>`).join("")}</ul>`;
};

/** Every published release, newest first (fetched once per page). */
let releasesPromise;
function getReleases() {
  releasesPromise ??= fetch(RELEASES, { headers: { Accept: "application/vnd.github+json" } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((list) => list.filter((r) => !r.draft && !r.prerelease));
  return releasesPromise;
}
const versionOf = (release) => release.tag_name.replace(/^v/, "");
const installerOf = (release) => release.assets.find((a) => /-setup\.exe$/i.test(a.name));

async function loadReleases() {
  let releases;
  try {
    releases = await getReleases();
    if (!releases.length) throw new Error("none");
  } catch {
    const timeline = document.getElementById("timeline");
    if (timeline) timeline.innerHTML = `<p class="muted">Couldn't load the updates right now. <a href="${LATEST_PAGE}">See them on GitHub</a>.</p>`;
    return;
  }

  // The newest version wherever the page shows it.
  const latest = releases[0];
  const setup = installerOf(latest);
  const meta = document.getElementById("dl-meta");
  if (meta && setup) meta.textContent = `Version ${versionOf(latest)} · ${formatSize(setup.size)} · ${formatDate(latest.published_at)}`;
  for (const label of document.querySelectorAll(".version-label")) label.textContent = `Free · v${versionOf(latest)}`;

  const timeline = document.getElementById("timeline");
  if (!timeline) return;
  const limit = Number(timeline.dataset.limit || 50);
  timeline.innerHTML = releases
    .slice(0, limit)
    .map((r, i) => {
      const post = POSTS[versionOf(r)];
      return `<article class="entry reveal"><div class="entry-card">
          <div class="entry-head"><h3>Lodestone ${escapeHtml(versionOf(r))}</h3>${i === 0 ? '<span class="tag">Latest</span>' : ""}<time datetime="${r.published_at}">${formatDate(r.published_at)}</time></div>
          ${notesList(r.body)}
          ${post ? `<a class="text-link" href="${BASE}${post}">Read the in-depth post →</a>` : ""}
        </div></article>`;
    })
    .join("");
  observe(timeline.querySelectorAll(".reveal"));
}

// ---------------------------------------------------------------- Ko-fi
for (const link of document.querySelectorAll(".kofi-link")) {
  if (KOFI_URL) {
    link.href = KOFI_URL;
    link.removeAttribute("aria-disabled");
    link.target = "_blank";
    link.rel = "noopener";
    link.querySelector(".soon")?.remove();
    if (link.textContent.includes("(soon)")) link.textContent = "Ko-fi ↗";
  } else {
    link.addEventListener("click", (e) => e.preventDefault());
  }
}

// ---------------------------------------------------------------- nav, menu, reveals
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 10);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

const menu = document.getElementById("menu");
const links = document.getElementById("links");
menu.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});
links.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    links.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }
});

const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("seen");
        io.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 },
);
function observe(elements) {
  for (const el of elements) io.observe(el);
}
for (const el of document.querySelectorAll(".panel, .tile, .table-wrap, .dl-card, .about-card, .faq-list, .platform, .version-card, .post-card, .steps li")) el.classList.add("reveal");
observe(document.querySelectorAll(".reveal"));

loadReleases();
for (const year of document.querySelectorAll("#year")) year.textContent = String(new Date().getFullYear());
