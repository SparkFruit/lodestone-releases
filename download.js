// The download page: the newest Windows installer on the big button, and a picker for every
// version with its changes and files. Uses getReleases() and helpers from app.js.

const select = document.getElementById("version-select");
const notes = document.getElementById("version-notes");
const files = document.getElementById("version-files");
const date = document.getElementById("version-date");
const postLink = document.getElementById("version-post");

/** The files people download (installers), not the update feed or its signatures. */
const downloadable = (asset) => /\.(exe|msi|dmg|appimage|deb|rpm)$/i.test(asset.name);

const fileKind = (name) =>
  /\.exe$|\.msi$/i.test(name) ? "Windows installer" : /\.dmg$/i.test(name) ? "macOS" : /\.appimage$/i.test(name) ? "Linux AppImage" : /\.deb$/i.test(name) ? "Linux .deb" : /\.rpm$/i.test(name) ? "Linux .rpm" : "File";

function showVersion(release, latest) {
  date.textContent = `${latest ? "Latest · " : ""}${formatDate(release.published_at)}`;
  notes.innerHTML = notesList(release.body);
  const post = POSTS[versionOf(release)];
  postLink.hidden = !post;
  if (post) postLink.href = post;
  const list = release.assets.filter(downloadable);
  files.innerHTML = list.length
    ? list
        .map((a) => {
          const sha = a.digest?.startsWith("sha256:") ? a.digest.slice(7) : null;
          return `<div class="file">
            <div class="file-info"><b>${escapeHtml(a.name)}</b><span>${fileKind(a.name)} · ${formatSize(a.size)}</span>
            ${sha ? `<code class="sha" title="SHA-256">SHA-256 ${sha}</code>` : ""}</div>
            <a class="btn btn-primary btn-sm" href="${a.browser_download_url}">Download</a>
          </div>`;
        })
        .join("")
    : '<p class="muted">No downloads for this version.</p>';
}

(async () => {
  let releases;
  try {
    releases = await getReleases();
    if (!releases.length) throw new Error("none");
  } catch {
    files.innerHTML = `<p class="muted">Couldn't load the versions right now. <a href="${LATEST_PAGE}">See them on GitHub</a>.</p>`;
    for (const button of document.querySelectorAll(".dl-latest")) button.href = button.dataset.fallback;
    return;
  }

  // The big button: the newest installer, downloaded straight away.
  const latest = releases[0];
  const setup = installerOf(latest);
  for (const button of document.querySelectorAll(".dl-latest")) {
    button.href = setup ? setup.browser_download_url : button.dataset.fallback;
    button.querySelector("span").textContent = `Download ${versionOf(latest)}`;
  }
  for (const meta of document.querySelectorAll(".dl-latest-meta")) {
    meta.textContent = setup ? `${formatSize(setup.size)} · ${formatDate(latest.published_at)}` : "See every version below";
  }

  // The picker: every version, the newest first.
  select.innerHTML = releases.map((r, i) => `<option value="${i}">Lodestone ${escapeHtml(versionOf(r))}${i === 0 ? " (latest)" : ""}</option>`).join("");
  const wanted = new URLSearchParams(location.search).get("v");
  const start = Math.max(0, releases.findIndex((r) => versionOf(r) === wanted));
  select.value = String(start);
  showVersion(releases[start], start === 0);
  select.addEventListener("change", () => {
    const i = Number(select.value);
    showVersion(releases[i], i === 0);
    history.replaceState(null, "", `?v=${versionOf(releases[i])}#versions`);
  });
})();
