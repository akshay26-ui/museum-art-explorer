const API = "https://collectionapi.metmuseum.org/public/collection/v1";
const LIMIT = 12;

let ids   = [];
let page  = 1;
let favs  = JSON.parse(localStorage.getItem("favs") || "[]");

const input  = document.getElementById("query");
const btn    = document.getElementById("btn");
const dept   = document.getElementById("dept");
const sort   = document.getElementById("sort");
const grid   = document.getElementById("grid");
const loader = document.getElementById("loader");
const error  = document.getElementById("error");
const count  = document.getElementById("count");
const pages  = document.getElementById("pages");

async function search() {
  const q = input.value.trim() || "painting";
  let url = `${API}/search?q=${encodeURIComponent(q)}&hasImages=true`;
  if (dept.value) url += `&departmentId=${dept.value}`;

  show(loader);
  hide(error);
  grid.innerHTML = "";
  count.textContent = "";
  pages.innerHTML = "";

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.objectIDs || data.objectIDs.length === 0) {
      hide(loader);
      grid.innerHTML = `<p class="empty">No artworks found for "${q}"</p>`;
      return;
    }

    ids  = data.objectIDs;
    page = 1;
    count.textContent = `${ids.length.toLocaleString()} artworks found`;
    loadPage();

  } catch (e) {
    hide(loader);
    error.textContent = "Something went wrong. Please check your connection and try again.";
    show(error);
  }
}

async function loadPage() {
  show(loader);
  grid.innerHTML = "";
  pages.innerHTML = "";
  window.scrollTo({ top: 0, behavior: "smooth" });

  const start  = (page - 1) * LIMIT;
  const slice  = ids.slice(start, start + LIMIT);

  try {
    const results = await Promise.all(
      slice.map(id =>
        fetch(`${API}/objects/${id}`)
          .then(r => r.json())
          .catch(() => null)
      )
    );

    const valid = results.filter(a => a && a.primaryImageSmall);

    if (valid.length === 0) {
      grid.innerHTML = `<p class="empty">No images available on this page. Try another search.</p>`;
      hide(loader);
      return;
    }

    const sorted = sortList(valid);
    sorted.forEach(a => grid.appendChild(makeCard(a)));
    buildPages();

  } catch (e) {
    error.textContent = "Failed to load artworks. Please try again.";
    show(error);
  }

  hide(loader);
}

function sortList(list) {
  const mode = sort.value;
  return [...list].sort((a, b) => {
    if (mode === "az")  return (a.title || "").localeCompare(b.title || "");
    if (mode === "za")  return (b.title || "").localeCompare(a.title || "");
    if (mode === "old") return (a.objectBeginDate || 0) - (b.objectBeginDate || 0);
    if (mode === "new") return (b.objectBeginDate || 0) - (a.objectBeginDate || 0);
    return 0;
  });
}

function makeCard(a) {
  const liked = favs.includes(a.objectID);
  const card  = document.createElement("div");
  card.className = "card";

  const wrap = document.createElement("div");
  wrap.className = "wrap";

  if (a.primaryImageSmall) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src     = a.primaryImageSmall;
    img.alt     = a.title || "Artwork";
    img.loading = "lazy";
    wrap.appendChild(img);
  } else {
    wrap.innerHTML = `<div class="noimg">🖼️</div>`;
  }

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = `
    <h3 class="title">${a.title || "Untitled"}</h3>
    <p class="artist">${a.artistDisplayName || "Unknown Artist"}</p>
    <p class="date">${a.objectDate || "Date unknown"}</p>
    <span class="dept">${a.department || ""}</span>
    <div class="bottom">
      <span class="medium">${a.medium ? a.medium.slice(0, 55) : "—"}</span>
      <button class="fav" data-id="${a.objectID}">${liked ? "❤️" : "🤍"}</button>
    </div>
  `;

  body.querySelector(".fav").addEventListener("click", function () {
    toggleFav(a.objectID, this);
  });

  card.appendChild(wrap);
  card.appendChild(body);
  return card;
}

function toggleFav(id, el) {
  const i = favs.indexOf(id);
  if (i === -1) {
    favs.push(id);
    el.textContent = "❤️";
  } else {
    favs.splice(i, 1);
    el.textContent = "🤍";
  }
  localStorage.setItem("favs", JSON.stringify(favs));
}

function buildPages() {
  const total = Math.ceil(ids.length / LIMIT);
  if (total <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "← Prev";
  prev.disabled = page === 1;
  prev.addEventListener("click", () => { page--; loadPage(); });

  const info = document.createElement("span");
  info.className = "info";
  info.textContent = `Page ${page} of ${total}`;

  const next = document.createElement("button");
  next.textContent = "Next →";
  next.disabled = page === total;
  next.addEventListener("click", () => { page++; loadPage(); });

  pages.append(prev, info, next);
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

let timer;
input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  clearTimeout(timer);
  timer = setTimeout(search, 300);
});

btn.addEventListener("click", search);
dept.addEventListener("change", search);
sort.addEventListener("change", () => { if (ids.length) { page = 1; loadPage(); } });

search();