// ===== Hardcoded Group Challenges (for prototype) =====
const CHALLENGES = [
  {
    id: 'c1',
    name: 'November Step Sprint',
    description: 'Walk more this month. Small steps, big wins!',
    goal: { value: 30000, unit: 'steps', type: 'steps' },
    start: '2025-11-01',
    end: '2025-11-30',
    members: [
      { id: 'u_you', name: 'You',   avatar: '/assets/people.png', progress: 12450 },
      { id: 'u_ana', name: 'Ana',   avatar: '/assets/people.png', progress: 15680 },
      { id: 'u_joa', name: 'João',  avatar: '/assets/people.png', progress:  8450 },
      { id: 'u_rai', name: 'Rita',  avatar: '/assets/people.png', progress: 21200 },
    ],
    active: true,
  },
  {
    id: 'c2',
    name: 'Car-Free Week',
    description: 'Avoid the car for a week. Count commutes done walking/bike/public transport.',
    goal: { value: 10, unit: 'eco trips', type: 'count' },
    start: '2025-11-10',
    end: '2025-11-17',
    members: [
      { id: 'u_you', name: 'You',   avatar: '/assets/people.png', progress: 3 },
      { id: 'u_ana', name: 'Ana',   avatar: '/assets/people.png', progress: 5 },
      { id: 'u_joa', name: 'João',  avatar: '/assets/people.png', progress: 2 },
    ],
    active: true,
  }
];

// Small helpers
function pct(n, d) { return Math.max(0, Math.min(100, Math.round((n / d) * 100))); }
function fmtGoal(goal) { return `${goal.value} ${goal.unit}`; }
function sortByProgressDesc(members) {
  return [...members].sort((a, b) => (b.progress || 0) - (a.progress || 0));
}


// ---- Theme bootstrap: default = LIGHT ----
const saved = localStorage.getItem('theme'); // 'dark' | 'light' | null
if (saved === 'dark') {
  document.documentElement.classList.add('theme-dark');
} else {
  document.documentElement.classList.remove('theme-dark');
}

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch])
  );

// ---- Ensure Leaflet is loaded (JS + CSS) before using window.L ----
let _leafletPromise = null;
function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletPromise) return _leafletPromise;

  _leafletPromise = new Promise((resolve, reject) => {
    // CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // JS
    const jsId = 'leaflet-js';
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    } else {
      const check = () => (window.L ? resolve() : setTimeout(check, 50));
      check();
    }
  });
  return _leafletPromise;
}

// ===== Hardcoded sustainable routes (Lisbon-ish coords) =====
const ROUTE_DATA = [
  {
    id: 'r1',
    title: 'Walk + Metro to IST',
    dest: 'Instituto Superior Técnico',
    eta: '22 min',
    co2: '≈ 0.1 kg CO₂',
    steps: [
      'Walk to Terreiro do Paço Metro (3 min)',
      'Blue Line to Alameda (12 min)',
      'Walk to IST (7 min)',
    ],
    segments: [
      { mode: 'walk', coords: [
        [38.7078, -9.1366], [38.7073, -9.1367]
      ]},
      { mode: 'metro', coords: [
        [38.7073, -9.1367], [38.7361, -9.1330]
      ]},
      { mode: 'walk', coords: [
        [38.7361, -9.1330], [38.7369, -9.1397]
      ]},
    ],
    center: [38.722, -9.137],
    zoom: 13
  },
  {
    id: 'r2',
    title: 'Bike via Av. Almirante Reis',
    dest: 'Instituto Superior Técnico',
    eta: '18 min',
    co2: '≈ 0 kg CO₂',
    steps: [
      'Pick up shared bike (1 min)',
      'Cycle up Av. Almirante Reis (15 min)',
      'Dock bike near IST (2 min)',
    ],
    segments: [
      { mode: 'bike', coords: [
        [38.7082, -9.1368], [38.7190, -9.1350], [38.7295, -9.1340],
        [38.7361, -9.1330], [38.7369, -9.1397]
      ]},
    ],
    center: [38.724, -9.136],
    zoom: 13
  },
  {
    id: 'r3',
    title: 'Bus + Walk (eco)',
    dest: 'Instituto Superior Técnico',
    eta: '26 min',
    co2: '≈ 0.3 kg CO₂',
    steps: [
      'Walk to bus stop (4 min)',
      'Bus to Saldanha (18 min)',
      'Walk to IST (4 min)',
    ],
    segments: [
      { mode: 'walk', coords: [
        [38.7078, -9.1366], [38.7100, -9.1372]
      ]},
      { mode: 'bus', coords: [
        [38.7100, -9.1372], [38.7230, -9.1370], [38.7325, -9.1400], [38.7365, -9.1405]
      ]},
      { mode: 'walk', coords: [
        [38.7365, -9.1405], [38.7369, -9.1397]
      ]},
    ],
    center: [38.725, -9.139],
    zoom: 13
  }
];

// Map colors per mode (match CSS dots)
const MODE_COLORS = {
  walk:  '#64748b',
  metro: '#1fa3a3',
  bus:   '#0ea5e9',
  bike:  '#0ea35b',
};

// Create Leaflet map (ensureLeaflet() must be resolved first)
function createLeafletMap(el, { center, zoom }) {
  const isDark = document.documentElement.classList.contains('theme-dark');

  const map = L.map(el, {
    zoomControl: false,
    attributionControl: true,
  }).setView(center, zoom);

  const lightTiles = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '&copy; OpenStreetMap contributors' }
  );
  const darkTiles = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    { attribution: '&copy; OpenStreetMap, &copy; CARTO' }
  );

  (isDark ? darkTiles : lightTiles).addTo(map);
  return map;
}

// Draw colored segments
function drawRouteSegments(map, segments) {
  segments.forEach(seg => {
    L.polyline(seg.coords, {
      color: MODE_COLORS[seg.mode] || '#0ea35b',
      weight: 5,
      opacity: 0.9,
      lineJoin: 'round'
    }).addTo(map);
  });
  const all = segments.flatMap(s => s.coords);
  if (all.length > 1) map.fitBounds(all, { padding: [30, 30] });
}



// Initialize your app
const app = new Framework7({
  el: '#app',
  name: 'My F7 Prototype',
  theme: 'auto',
  routes: [
    {
      path: '/',
      content: `
        <div class="page" data-name="home">
          <div class="navbar" role="navigation" aria-label="Top navigation">
            <div class="navbar-bg"></div>
            <div class="navbar-inner">
              <div class="left">
                <a href="/profile/" class="link tab-link" aria-label="Profile">
                  <span class="icon-only tab-icon-mask" style="--icon:url('/assets/people.png');"></span>
                  <span class="visually-hidden">Profile</span>
                </a>
              </div>
              <div class="title">Home</div>
              <div class="right">
                <a href="/settings/" class="link tab-link" aria-label="Settings">
                  <span class="icon-only tab-icon-mask" style="--icon:url('/assets/setting.png');"></span>
                  <span class="visually-hidden">Settings</span>
                </a>
              </div>
            </div>
          </div>
          <div class="page-content">
          <div class="block">
            <h1 class="no-margin">GreenWay</h1>
            <p>Use the bottom toolbar to navigate.</p>
          </div>
        </div>
        </div>
      `,
    },

    {
      path: '/profile/',
      content: `
        <div class="page" data-name="profile">
          <div class="navbar" role="navigation" aria-label="Top navigation">
            <div class="navbar-bg"></div>
            <div class="navbar-inner sliding">
              <a href="/" class="link" aria-label="Go back">
                <span class="icon-only tab-icon-mask" style="--icon:url('/assets/home.png');"></span>
                <span class="visually-hidden">Back</span>
              </a>
              <div class="title">User Profile</div>
            </div>
          </div>
          <div class="page-content">
            <div class="block block-strong">
              <p><b>User info</b></p>
            </div>
          </div>
        </div>
      `
    },

    {
      path: '/badges/',
      content: `
        <div class="page" data-name="badges">
          <div class="navbar" role="navigation" aria-label="Achievements navbar">
            <div class="navbar-bg"></div>
            <div class="navbar-inner sliding">
              <a href="/" class="link " aria-label="Go back">
                <span class="icon-only tab-icon-mask" style="--icon:url('/assets/home.png');"></span>
                <span class="visually-hidden">Back</span>
              </a>
              <div class="title">Achievements</div>
            </div>
          </div>

          <div class="page-content">
            <div class="block block-strong">
              <p>Collect achievements as you complete activities. Tap an unlocked badge to learn more.</p>
            </div>

            <div class="block">
              <div class="badges-grid">
                <button
                  class="badge-card"
                  data-earned="true">
                  <img src="/assets/badges/walking.png" alt="First 10 km badge">
                  <span class="badge-label">First 10 km</span>
                </button>

                <div class="badge-card locked" aria-label="Locked badge"></div>
                <div class="badge-card locked" aria-label="Locked badge"></div>
                <div class="badge-card locked" aria-label="Locked badge"></div>
                <div class="badge-card locked" aria-label="Locked badge"></div>
                <div class="badge-card locked" aria-label="Locked badge"></div>
                <div class="badge-card locked" aria-label="Locked badge"></div>
              </div>
            </div>
          </div>
        </div>
      `,
      on: {
        pageInit(e, page) {
          page.$el.on('click', '.badge-card[data-earned="true"]', () => {
            const title = 'First 10 km';
            const reason = 'You reached a total of 10 km. Keep it up!';
            const earnedAt = '2025-10-20';

            app.dialog.create({
              title: esc(title),
              text: `
                <div style="text-align:left">
                  <p>${esc(reason)}</p>
                  <p><b>Earned:</b> ${esc(earnedAt)}</p>
                </div>`,
              buttons: [{ text: 'OK', close: true }],
              cssClass: 'achievement-dialog'
            }).open();
          });
        }
      }
    },

    // ===== Route planner (now with in-page "maximize" follow view) =====
    {
      path: '/plan/',
      content: `
        <div class="page" data-name="plan">
          <div class="navbar" role="navigation" aria-label="Plan navbar">
            <div class="navbar-bg"></div>
            <div class="navbar-inner sliding">
              <a href="/" class="link " aria-label="Go back">
                <span class="icon-only tab-icon-mask" style="--icon:url('/assets/home.png')"></span>
                <span class="visually-hidden">Back</span>
              </a>
              <div class="title">Plan route</div>
            </div>
          </div>

          <div class="page-content">
            <!-- add id="searchBlock" so we can hide/show it -->
            <div id="searchBlock" class="block block-strong">
              <div class="list no-hairlines-md">
                <ul>
                  <li class="item-content item-input">
                    <div class="item-inner">
                      <div class="item-title item-label">Destination</div>
                      <div class="item-input-wrap">
                        <input id="destInput" type="text" placeholder="e.g., Destination" />
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
              <p><button id="searchBtn" class="button button-fill">Show sustainable options</button></p>
            </div>

            <!-- Options list (hidden until Search is clicked) -->
            <div id="optionsWrap" class="block" style="display:none;"></div>

            <!-- Follow view (hidden until an option is chosen) -->
            <div id="followWrap" class="block" style="display:none;">
              <div class="route-summary" style="margin-bottom:8px;">
                <div id="followTitle" style="font-weight:600;"></div>
                <div id="followMeta" class="route-meta"></div>
              </div>
              <div id="followChips" class="mode-chips" style="margin-bottom:8px;"></div>
              <div id="followMap" class="route-map" aria-label="Route map"></div>
              <p style="margin-top:8px; display:flex; gap:8px;">
                <button id="backToOptions" class="button button-outline">Back to options</button>
              </p>
            </div>
          </div>
        </div>
      `,
      on: {
        pageInit(e, page) {
          const $$ = app.$;
          const optionsWrap = $$('#optionsWrap');
          const followWrap  = $$('#followWrap');
          const searchBlock = $$('#searchBlock');   // ← get the search block

          let followMapInstance = null; // keep reference to destroy if needed

          function renderOptions() {
            optionsWrap.html(''); // clear
            ROUTE_DATA.forEach((r) => {
              const mapId = `mini-${r.id}`;
              const cardHtml = `
                <div class="card route-option">
                  <div class="card-content card-content-padding">
                    <div class="route-summary">
                      <div>${r.title}</div>
                      <div class="route-meta">${r.eta} · ${r.co2}</div>
                    </div>

                    <div class="mode-chips">
                      ${r.segments.map(s => `
                        <span class="chip">
                          <span class="dot dot-${s.mode}"></span>${s.mode.toUpperCase()}
                        </span>
                      `).join('')}
                    </div>

                    <div id="${mapId}" class="mini-map" aria-label="Map preview"></div>

                    <p style="margin:8px 0 0;">
                      <button class="button button-outline view-follow" data-id="${r.id}">View & follow</button>
                    </p>
                  </div>
                </div>
              `;
              optionsWrap.append(cardHtml);
            });

            // Reveal the options area now that content exists
            optionsWrap.css('display', '');

            // After cards are visible, load maps
            ensureLeaflet().then(() => {
              ROUTE_DATA.forEach((r) => {
                const el = document.getElementById(`mini-${r.id}`);
                if (el) {
                  const map = createLeafletMap(el, r);
                  drawRouteSegments(map, r.segments);
                }
              });
            }).catch((err) => {
              console.error('Leaflet failed to load:', err);
              app.toast && app.toast.show?.({ text: 'Map failed to load', closeTimeout: 2500 });
            });
          }

          // Only render when button is clicked
          $$('#searchBtn').on('click', () => {
            // Hide follow if it was open
            followWrap.css('display', 'none');
            optionsWrap.css('display', 'none'); // avoid flash while building
            renderOptions();
          });

          // Delegate: click "View & follow" -> maximize map in-page
          optionsWrap.on('click', '.view-follow', (ev) => {
            ev.preventDefault();
            const id = ev.target.getAttribute('data-id');
            const route = ROUTE_DATA.find(r => r.id === id) || ROUTE_DATA[0];

            // Hide search + options; show follow area
            searchBlock.css('display', 'none');   // ← hide the input + button
            optionsWrap.css('display', 'none');
            followWrap.css('display', '');

            // Fill follow header
            document.getElementById('followTitle').textContent = route.title;
            document.getElementById('followMeta').textContent  = `${route.eta} · ${route.co2}`;
            const chips = route.segments.map(s =>
              `<span class="chip"><span class="dot dot-${s.mode}"></span>${s.mode.toUpperCase()}</span>`
            ).join('');
            document.getElementById('followChips').innerHTML = chips;

            // Create big map
            ensureLeaflet().then(() => {
              const mapEl = document.getElementById('followMap');

              // If you switch routes, reset the container
              if (followMapInstance) {
                followMapInstance.remove();
                followMapInstance = null;
                mapEl.innerHTML = '';
              }

              followMapInstance = createLeafletMap(mapEl, route);
              drawRouteSegments(followMapInstance, route.segments);

              const all = route.segments.flatMap(s => s.coords);
              if (all.length > 0) {
                L.marker(all[0]).addTo(followMapInstance).bindPopup('Start');
                L.marker(all[all.length - 1]).addTo(followMapInstance).bindPopup('Destination');
              }
            });
          });

          // Back button to return to options
          $$('#backToOptions').on('click', () => {
            followWrap.css('display', 'none');
            optionsWrap.css('display', '');   // show options again
            searchBlock.css('display', '');   // ← show the input + button again
          });

          // Do NOT auto-render options on page load
          optionsWrap.css('display', 'none');
          followWrap.css('display', 'none');
        } 
      }
    },

{
  path: '/f3/',
  content: `
    <div class="page" data-name="challenges">
      <div class="navbar" role="navigation" aria-label="Challenges navbar">
        <div class="navbar-bg"></div>
        <div class="navbar-inner sliding">
          <a href="/" class="link" aria-label="Go back">
            <span class="icon-only tab-icon-mask" style="--icon:url('/assets/home.png');"></span>
            <span class="visually-hidden">Back</span>
          </a>
          <div class="title">Group Challenges</div>
          <div class="right">
            <a href="#" id="openCreate" class="link" aria-label="Create challenge">
              <span class="icon-only tab-icon-mask" style="--icon:url('/assets/plus.png');"></span>
              <span class="visually-hidden">Create challenge</span>
            </a>
          </div>
        </div>
      </div>

      <div class="page-content">
        <!-- LIST VIEW -->
        <div id="listView" class="block block-strong" aria-live="polite"></div>

        <!-- DETAILS VIEW (hidden by default) -->
        <div id="detailsView" class="block" style="display:none;">
          <div class="card">
            <div class="card-content card-content-padding">
              <a href="#" id="backToList" class="button button-outline" aria-label="Back to challenges">Back</a>
              <h2 id="dName" style="margin-top:12px;"></h2>
              <p id="dDesc" class="text-muted"></p>
              <div class="list simple-list">
                <ul>
                  <li><b>Goal</b> <span id="dGoal" class="text-muted"></span></li>
                  <li><b>Dates</b> <span id="dDates" class="text-muted"></span></li>
                </ul>
              </div>

              <h3 style="margin-top:18px;">Leaderboard</h3>
              <div id="dBoard" class="leaderboard"></div>

              <!-- Leave challenge button -->
              <div class="block" style="margin-top:16px;">
                <button id="leaveChallenge" class="button button-outline">Leave challenge</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CREATE CHALLENGE POPUP (full-screen) -->
      <div class="popup" id="createPopup" style="--popup-bg: var(--paper);">
        <div class="view">
          <div class="page">
            <div class="navbar" role="navigation" aria-label="Create challenge navbar">
              <div class="navbar-bg"></div>
              <div class="navbar-inner">
                <div class="left">
                  <a href="#" class="link popup-close" aria-label="Close">
                    <span class="icon-only tab-icon-mask" style="--icon:url('/assets/close.png');"></span>
                    <span class="visually-hidden">Close</span>
                  </a>
                </div>
                <div class="title">New Challenge</div>
                <div class="right"></div>
              </div>
            </div>

            <div class="page-content">
              <form id="createForm" class="list no-hairlines-md" aria-label="Create challenge form">
                <ul>
                  <li class="item-content item-input">
                    <div class="item-inner">
                      <div class="item-title item-label">Name</div>
                      <div class="item-input-wrap">
                        <input name="name" type="text" placeholder="e.g., Weekend Step-Off" required>
                      </div>
                    </div>
                  </li>
                  <li class="item-content item-input">
                    <div class="item-inner">
                      <div class="item-title item-label">Description</div>
                      <div class="item-input-wrap">
                        <textarea name="description" placeholder="What is this about?" required></textarea>
                      </div>
                    </div>
                  </li>

                  <!-- Goal with radio chips -->
                  <li class="item-content item-input">
                    <div class="item-inner">
                      <div class="item-title item-label">Goal</div>
                      <div class="item-input-wrap">
                        <input name="goalValue" type="number" min="1" placeholder="e.g., 10000" required>
                        <div class="chip-group" role="radiogroup" aria-label="Goal unit" style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
                          <label class="chip selectable">
                            <input type="radio" name="goalUnit" value="steps" checked>
                            <span>steps</span>
                          </label>
                          <label class="chip selectable">
                            <input type="radio" name="goalUnit" value="km">
                            <span>km</span>
                          </label>
                          <label class="chip selectable">
                            <input type="radio" name="goalUnit" value="minutes">
                            <span>minutes</span>
                          </label>
                          <label class="chip selectable">
                            <input type="radio" name="goalUnit" value="eco trips">
                            <span>eco trips</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </li>

                  <li class="item-content item-input">
                    <div class="item-inner">
                      <div class="item-title item-label">Add people</div>
                      <div class="item-input-wrap">
                        <div class="chips" id="peopleChips" style="display:flex;gap:6px;flex-wrap:wrap;">
                          <label class="chip selectable"><input type="checkbox" name="p_ana" checked><span>Ana</span></label>
                          <label class="chip selectable"><input type="checkbox" name="p_joao" checked><span>João</span></label>
                          <label class="chip selectable"><input type="checkbox" name="p_rita" checked><span>Rita</span></label>
                          <label class="chip selectable"><input type="checkbox" name="p_carl"><span>Carlos</span></label>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
                <div class="block">
                  <button type="submit" class="button button-fill">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

  `,
  on: {
  pageInit(e, page) {
    const $$ = app.$;
    const listView    = page.$el.find('#listView');
    const detailsView = page.$el.find('#detailsView');
    const popupSel    = '#createPopup';

    let currentChallengeId = null; // fallback if data-id isn't found

    function renderEmpty() {
      listView.html(`
        <div class="card">
          <div class="card-content card-content-padding">
            <h2>No active challenges yet</h2>
            <p class="text-muted">Start a new one and invite your friends.</p>
            <p><a href="#" id="ctaCreate" class="button button-fill">Create a challenge</a></p>
          </div>
        </div>
      `);
    }

    function renderList() {
      const active = CHALLENGES.filter(c => c.active);
      if (active.length === 0) { renderEmpty(); return; }

      listView.html(
        active.map(c => {
          const you = c.members.find(m => m.id === 'u_you') || { progress: 0 };
          const progressPct = pct(you.progress, c.goal.value);
          const top = sortByProgressDesc(c.members)[0];

          return `
            <div class="card">
              <div class="card-content card-content-padding">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                  <div>
                    <div style="font-weight:700;">${esc(c.name)}</div>
                    <div class="text-muted" style="font-size:13px;">Goal: ${esc(fmtGoal(c.goal))} • ${esc(c.start)}–${esc(c.end)}</div>
                  </div>
                  <button class="button button-outline view-details" data-id="${esc(c.id)}">View</button>
                </div>

                <div class="lb-mini" style="margin-top:10px;display:flex;align-items:center;gap:10px;">
                  <img alt="Leader avatar" src="${esc(top.avatar)}" class="avatar">
                  <div style="font-size:13px;">
                    <b>${esc(top.name)}</b> leads with <b>${esc(top.progress)}</b> ${esc(c.goal.unit)}
                  </div>
                </div>

                <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPct}">
                  <div class="progress-bar" style="width:${progressPct}%"></div>
                </div>
                <div class="text-muted" style="font-size:12px;">You: ${you.progress} / ${fmtGoal(c.goal)} (${progressPct}%)</div>
              </div>
            </div>
          `;
        }).join('')
      );
    }

    function renderDetails(id) {
      const c = CHALLENGES.find(x => x.id === id);
      if (!c) return;

      page.$el.find('#dName').text(c.name);
      page.$el.find('#dDesc').text(c.description);
      page.$el.find('#dGoal').text(fmtGoal(c.goal));
      page.$el.find('#dDates').text(`${c.start} – ${c.end}`);

      const boardHtml = sortByProgressDesc(c.members).map((m, idx) => `
        <div class="lb-row">
          <div class="lb-left">
            <span class="lb-rank">${idx + 1}</span>
            <img src="${esc(m.avatar)}" alt="" class="avatar">
            <span class="lb-name">${esc(m.name)}</span>
          </div>
          <div class="lb-score">${esc(m.progress)} ${esc(c.goal.unit)}</div>
        </div>
      `).join('');

      page.$el.find('#dBoard').html(boardHtml);

      listView.hide();
      detailsView.show();
      detailsView[0].scrollIntoView({ behavior: 'smooth' });

      // Stamp id + keep fallback
      page.$el.find('#leaveChallenge').attr('data-id', c.id);
      currentChallengeId = c.id;
    }

    // Initial paint
    renderList();

    // Open details
    listView.on('click', '.view-details', (ev) => {
      const id = ev.target.getAttribute('data-id');
      renderDetails(id);
    });

    // Back to list
    page.$el.find('#backToList').on('click', (e) => {
      e.preventDefault();
      detailsView.hide();
      listView.show();
      listView[0].scrollIntoView({ behavior: 'smooth' });
    });

    // Leave challenge (delegated + robust id fallback)
    page.$el.on('click', '#leaveChallenge', (e) => {
      e.preventDefault();
      const stampedId = e.currentTarget.getAttribute('data-id');
      const id = stampedId || currentChallengeId;
      const c = CHALLENGES.find(x => x.id === id);
      if (!c) return;

      app.dialog.confirm('Leave this challenge?', 'Confirm', () => {
        c.members = c.members.filter(m => m.id !== 'u_you');
        c.active = false;

        detailsView.hide();
        renderList();
        listView.show();
        listView[0]?.scrollIntoView({ behavior: 'smooth' });

        app.toast?.create({ text: 'You left the challenge', closeTimeout: 1500 })?.open();
      });
    });

    // Open popup (Create)
    page.$el.find('#openCreate').on('click', (e) => {
      e.preventDefault();
      app.popup.open(popupSel);
    });
    listView.on('click', '#ctaCreate', (e) => {
      e.preventDefault();
      app.popup.open(popupSel);
    });

    // Handle create submit
    page.$el.find('#createForm').on('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = (fd.get('name') || '').toString().trim();
      const description = (fd.get('description') || '').toString().trim();
      const goalValue = Math.max(1, Number(fd.get('goalValue') || 0));
      const goalUnit  = (fd.get('goalUnit') || 'steps').toString();

      const baseMembers = [
        fd.get('p_ana')  ? { id:'u_ana', name:'Ana',    avatar:'/assets/people.png', progress: 0 } : null,
        fd.get('p_joao') ? { id:'u_joa', name:'João',   avatar:'/assets/people.png', progress: 0 } : null,
        fd.get('p_rita') ? { id:'u_rai', name:'Rita',   avatar:'/assets/people.png', progress: 0 } : null,
        fd.get('p_carl') ? { id:'u_car', name:'Carlos', avatar:'/assets/people.png', progress: 0 } : null,
      ].filter(Boolean);

      const newChallenge = {
        id: `c${Date.now()}`,
        name,
        description,
        goal: { value: goalValue, unit: goalUnit, type: goalUnit === 'steps' ? 'steps' : 'count' },
        start: new Date().toISOString().slice(0,10),
        end:   new Date(Date.now() + 1000*60*60*24*7).toISOString().slice(0,10),
        members: [{ id:'u_you', name:'You', avatar:'/assets/people.png', progress: 0 }, ...baseMembers],
        active: true
      };

      CHALLENGES.unshift(newChallenge);
      app.popup.close(popupSel);
      renderList();

      app.toast?.create({ text: 'Challenge created', closeTimeout: 1500 })?.open();
    });
  }
}
},



    {
      path: '/settings/',
      content: `
        <div class="page" data-name="settings">
          <div class="navbar" role="navigation" aria-label="Top navigation">
            <div class="navbar-bg"></div>
            <div class="navbar-inner sliding">
              <a href="/" class="link" aria-label="Go back">
                <span class="icon-only tab-icon-mask" style="--icon:url('/assets/home.png');"></span>
                <span class="visually-hidden">Back</span>
              </a>
              <div class="title">Settings</div>
            </div>
          </div>

          <div class="page-content">
            <div class="list media-list" aria-label="Settings">
              <ul>
                <li class="item-divider" role="separator" aria-hidden="true">Appearance</li>

                <li>
                  <div class="item-content">
                    <div class="item-inner">
                      <div class="item-title-row">
                        <div class="item-title" id="label-dark">Dark mode</div>
                        <div class="item-after">
                          <label class="toggle toggle-init">
                            <input type="checkbox" id="darkToggle" aria-labelledby="label-dark">
                            <span class="toggle-icon"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>

              </ul>
            </div>
          </div>
        </div>
      `,
      on: {
        pageInit(e, page) {
          const isDark = document.documentElement.classList.contains('theme-dark');
          const toggle = page.$el.find('#darkToggle');
          const status = page.$el.find('#themeStatus');

          toggle.prop('checked', isDark);
          status.text(isDark ? 'Dark mode is ON' : 'Dark mode is OFF');

          toggle.on('change', (ev) => {
            const enabled = ev.target.checked;
            if (enabled) {
              document.documentElement.classList.add('theme-dark');
              localStorage.setItem('theme', 'dark');
              status.text('Dark mode is ON');
            } else {
              document.documentElement.classList.remove('theme-dark');
              localStorage.setItem('theme', 'light');
              status.text('Dark mode is OFF');
            }
          });
        }
      }
    },
  ],
});

// Create main view (enables router and transitions)
const mainView = app.views.create('.view-main', { url: '/' });

// Keep toolbar active state in sync with route
function setActiveToolbar(path) {
  const links = document.querySelectorAll('.toolbar .tab-link');
  links.forEach(a => a.classList.remove('tab-link-active'));
  if (path.startsWith('/f1')) {
    document.querySelector('.toolbar .tab-link[href="/f1/"]')?.classList.add('tab-link-active');
  } else if (path.startsWith('/f2')) {
    document.querySelector('.toolbar .tab-link[href="/f2/"]')?.classList.add('tab-link-active');
  } else if (path.startsWith('/f3')) {
    document.querySelector('.toolbar .tab-link[href="/f3/"]')?.classList.add('tab-link-active');
  }
}
setActiveToolbar(mainView.router.currentRoute.path || '/');
app.on('routeChange', (route) => setActiveToolbar(route.path || '/'));
