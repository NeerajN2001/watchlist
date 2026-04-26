let globalData = [];

const container = document.getElementById("container");

// 🔗 GOOGLE SHEET CSV
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSN12GrJcbDFCnDsw2apNlaX4zg4JfPiXQiX4Q5sNS8TCmIjmkjokzvJv7qqV5cCjbtPW5OCbqR42du/pub?gid=0&single=true&output=csv";

// 🔹 CSV → JSON
function csvToJson(csv) {
  const lines = csv.split("\n").filter(l => l.trim() !== "");
  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    let obj = {};

    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim();
    });

    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') insideQuotes = !insideQuotes;
    else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// 🔹 FORMAT RATED
function formatRated(rated) {
  if (!rated) return "";
  const val = rated.trim();
  if (!isNaN(val)) return "+" + val;
  return val;
}

// 🔹 GENRES
function getGenres(str) {
  if (!str) return [];
  return str.split("|").map(s => s.trim());
}

// 🔹 LANGUAGES
function getLanguages(str) {
  if (!str) return [];
  return str.split("|").map(s => s.trim());
}

// 🔹 DATE PARSER (DD-MM-YYYY)
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  const parts = dateStr.split("-");
  if (parts.length !== 3) return new Date(0);

  const [day, month, year] = parts;
  return new Date(`${year}-${month}-${day}`);
}

// 🔹 LOAD DATA
async function loadData() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  globalData = csvToJson(text);

  populateGenres(globalData);
  populateLanguages(globalData);
  populateCategories(globalData);

  applySortAndRender();
}

// 🔹 GENRE FILTER
function populateGenres(data) {
  const set = new Set();

  data.forEach(item => {
    getGenres(item.Genre).forEach(g => set.add(g));
  });

  const select = document.getElementById("genreFilter");
  select.innerHTML = `<option value="">All Genres</option>`;

  set.forEach(g => {
    select.innerHTML += `<option value="${g}">${g}</option>`;
  });
}

// 🔹 LANGUAGE FILTER
function populateLanguages(data) {
  const set = new Set();

  data.forEach(item => {
    getLanguages(item.Language).forEach(l => set.add(l));
  });

  const select = document.getElementById("languageFilter");
  select.innerHTML = `<option value="">All Languages</option>`;

  set.forEach(l => {
    select.innerHTML += `<option value="${l}">${l}</option>`;
  });
}

// 🔹 CATEGORY FILTER
function populateCategories(data) {
  const set = new Set();

  data.forEach(item => {
    if (item.Category) {
      set.add(item.Category.trim());
    }
  });

  const select = document.getElementById("categoryFilter");
  select.innerHTML = `<option value="">All Categories</option>`;

  set.forEach(c => {
    select.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

// 🔹 SORT + FILTER + RENDER
function applySortAndRender() {
  let data = [...globalData];

  data = data.filter(item => item.Added?.trim().toUpperCase() === "Y");

  const sortType = document.getElementById("sortSelect").value;
  const genreFilter = document.getElementById("genreFilter").value;
  const languageFilter = document.getElementById("languageFilter").value;
  const categoryFilter = document.getElementById("categoryFilter").value;

  // SORT
  if (sortType === "name") {
    data.sort((a, b) => a.Name.localeCompare(b.Name));
  }

  else if (sortType === "release") {
    data.sort((a, b) => parseDate(b.Release) - parseDate(a.Release));
  }

  else if (sortType === "rating") {
    data.sort((a, b) => (parseInt(b.Rating) || 0) - (parseInt(a.Rating) || 0));
  }

  else if (sortType === "watched") {
    data.sort((a, b) => (b.Watched === "Y") - (a.Watched === "Y"));
  }

  else if (sortType === "genre") {
    if (genreFilter) {
      data = data.filter(item =>
        getGenres(item.Genre).includes(genreFilter)
      );
    }
  }

  else if (sortType === "language") {
    if (languageFilter) {
      data = data.filter(item =>
        getLanguages(item.Language).includes(languageFilter)
      );
    }
  }

  else if (sortType === "category") {
    if (categoryFilter) {
      data = data.filter(item =>
        item.Category?.trim() === categoryFilter
      );
    }
  }

  // RENDER
  container.innerHTML = "";
  data.forEach((item, index) => {
    container.appendChild(createCard(item, index));
  });
}

// 🔹 CREATE CARD
function createCard(item, index) {
  const rating = parseInt(item.Rating) || 0;
  const genres = getGenres(item.Genre);

  const watched = item.Watched?.trim().toUpperCase() === "Y";

  const badge = watched
    ? `<div class="badge watched">✔ Watched</div>`
    : `<div class="badge not-watched">⏳ Not Watched</div>`;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img src="${item.Poster || 'https://via.placeholder.com/300x450'}">

    <div class="content">
      ${badge}

      <div class="title">${item.Name}</div>

      <div class="meta">${item.Release}</div>
      <div class="meta">${item.Language}</div>
      <div class="meta">${item.Category}</div>

      <div class="meta">
        ${genres.map(g => `<span class="tag">${g}</span>`).join("")}
      </div>

      <div class="meta">Rated: ${formatRated(item.Rated)}</div>

      <div class="stars">
        ${Array.from({length: 10}, (_, i) => i + 1).map(i => `
          <span class="star ${i <= rating ? 'active' : ''}">★</span>
        `).join("")}
      </div>

      <div class="meta">Rating: ${rating}/10</div>
    </div>
  `;

  card.onclick = () => openModal(item);

  return card;
}

// 🔹 MODAL
function openModal(item) {
  const modal = document.getElementById("modal");
  const genres = getGenres(item.Genre);

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="closeModal()">×</span>

      <h2>${item.Name}</h2>

      <p><b>Release:</b> ${item.Release}</p>
      <p><b>Language:</b> ${item.Language}</p>
      <p><b>Category:</b> ${item.Category}</p>
      <p><b>Genre:</b> ${genres.join(", ")}</p>
      <p><b>Director/Studio:</b> ${item["Studio / Director"]}</p>
      <p><b>Watched:</b> ${item.Watched}</p>
      <p><b>Rated:</b> ${formatRated(item.Rated)}</p>
      <p><b>Rating:</b> ${item.Rating}</p>
    </div>
  `;

  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// 🔹 EVENTS
document.getElementById("sortSelect").addEventListener("change", () => {
  const sortType = document.getElementById("sortSelect").value;

  const genre = document.getElementById("genreFilter");
  const language = document.getElementById("languageFilter");
  const category = document.getElementById("categoryFilter");

  genre.style.display = "none";
  language.style.display = "none";
  category.style.display = "none";

  if (sortType === "genre") genre.style.display = "inline-block";
  if (sortType === "language") language.style.display = "inline-block";
  if (sortType === "category") category.style.display = "inline-block";

  applySortAndRender();
});

document.getElementById("genreFilter")
  .addEventListener("change", applySortAndRender);

document.getElementById("languageFilter")
  .addEventListener("change", applySortAndRender);

document.getElementById("categoryFilter")
  .addEventListener("change", applySortAndRender);

// 🔹 INIT
loadData();
