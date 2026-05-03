// ============================================================
//  HazardEye IMO — map.js
//  NBSC Campus map with border restriction & click-to-pin
// ============================================================

// ------ NBSC CAMPUS BOUNDS ------
const NBSC_BOUNDS = L.latLngBounds(
  [8.3568, 124.8658],   // SW corner
  [8.3618, 124.8705]    // NE corner
);

// NBSC Campus polygon border (based on actual satellite screenshots)
const NBSC_POLYGON = [
  [8.36149, 124.86763],  // North Gate area
  [8.36114, 124.86793],  // Gate 1
  [8.36096, 124.86835],
  [8.36097, 124.86883],  // Near Billing
  [8.36075, 124.86922],  // Billing Office
  [8.36010, 124.86930],
  [8.35996, 124.86887],  // Covered Court
  [8.35980, 124.86757],  // SC Building
  [8.35946, 124.86838],  // Canteen
  [8.35900, 124.86850],
  [8.35870, 124.86820],
  [8.35840, 124.86780],
  [8.35820, 124.86730],
  [8.35830, 124.86690],
  [8.35870, 124.86660],
  [8.35920, 124.86645],
  [8.35980, 124.86640],
  [8.36040, 124.86650],
  [8.36090, 124.86670],
  [8.36130, 124.86700],
  [8.36149, 124.86763],  // close polygon
];

// Priority colors
const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High:     '#c9a227',
  Medium:   '#4a7fd4',
  Low:      '#6b7280'
};

// Global state
let mainMap        = null;
let submitMap      = null;
let submitMarker   = null;
let allIncidents   = [];
let mainMarkers    = [];

// ============================================================
//  INIT MAIN MAP (Map tab)
// ============================================================
function initMainMap() {
  if (mainMap) return;

  mainMap = L.map('map', {
    center: [8.3595, 124.8675],
    zoom: 17,
    minZoom: 16,
    maxZoom: 19,
    maxBounds: NBSC_BOUNDS,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(mainMap);

  // Draw NBSC campus border
  L.polygon(NBSC_POLYGON, {
    color:       '#c9a227',
    weight:      2.5,
    opacity:     0.9,
    fillColor:   '#c9a227',
    fillOpacity: 0.04,
    dashArray:   '6,4'
  }).addTo(mainMap).bindTooltip('NBSC Campus', {
    permanent: true,
    direction: 'center',
    className: 'nbsc-label'
  });

  // Add campus label style
  if (!document.getElementById('nbsc-map-style')) {
    const style = document.createElement('style');
    style.id = 'nbsc-map-style';
    style.textContent = `
      .nbsc-label {
        background: rgba(201,162,39,.15);
        border: 1px solid #c9a227;
        color: #c9a227;
        font-weight: 700;
        font-size: 13px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        padding: 4px 10px;
        border-radius: 8px;
        box-shadow: none;
      }
      .nbsc-label::before { display: none; }
      .hazard-popup .leaflet-popup-content-wrapper {
        background: #0f1829;
        color: #e8eaf0;
        border: 1px solid #1e3060;
        border-radius: 10px;
        box-shadow: 0 4px 24px rgba(0,0,0,.6);
      }
      .hazard-popup .leaflet-popup-tip { background: #0f1829; }
      .hazard-popup .leaflet-popup-content { margin: 12px 16px; }
    `;
    document.head.appendChild(style);
  }
}

// ============================================================
//  RENDER MARKERS on main map
// ============================================================
function renderMarkers(incidents) {
  if (!mainMap) initMainMap();

  // Clear old markers
  mainMarkers.forEach(m => mainMap.removeLayer(m));
  mainMarkers = [];

  incidents.forEach(r => {
    if (!r.latitude || !r.longitude) return;

    const color = PRIORITY_COLORS[r.priority] || '#888';
    const icon  = makeIcon(color, r.priority);

    const marker = L.marker([parseFloat(r.latitude), parseFloat(r.longitude)], { icon });

    const dateStr = r.reported_at ? r.reported_at.toString().split('T')[0] : '-';
    marker.bindPopup(`
      <div>
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#e8eaf0">${r.title}</div>
        <div style="margin:3px 0;font-size:12px;color:#8a9abf">
          <span style="color:${color};font-weight:600">● ${r.priority}</span>
          &nbsp;·&nbsp; ${r.status}
        </div>
        <div style="font-size:11px;color:#3a4a6a;margin-top:4px">${(r.location_address||'').split(',')[0]}</div>
        <div style="font-size:11px;color:#3a4a6a">${dateStr}</div>
        <button onclick="viewIncident(${r.id})"
          style="margin-top:10px;width:100%;padding:6px;background:#c9a227;border:none;
                 border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;color:#0a0c14">
          View Details
        </button>
      </div>
    `, { className: 'hazard-popup' });

    marker.addTo(mainMap);
    mainMarkers.push(marker);
  });
}

// ============================================================
//  MAKE CUSTOM ICON
// ============================================================
function makeIcon(color, priority) {
  const pulse = priority === 'Critical' ? `
    <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.2">
      <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
    </circle>` : '';

  return L.divIcon({
    className: '',
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        ${pulse}
        <path d="M14 2C8.477 2 4 6.477 4 12c0 7 10 22 10 22s10-15 10-22c0-5.523-4.477-10-10-10z"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="14" cy="12" r="4" fill="white" opacity="0.9"/>
      </svg>`,
    iconSize:    [28, 36],
    iconAnchor:  [14, 36],
    popupAnchor: [0, -38]
  });
}

// ============================================================
//  APPLY FILTERS
// ============================================================
function applyFilters() {
  const status   = document.getElementById('statusFilter')?.value   || '';
  const priority = document.getElementById('priorityFilter')?.value || '';

  const filtered = allIncidents.filter(r => {
    const okS = !status   || r.status   === status;
    const okP = !priority || r.priority === priority;
    return okS && okP;
  });

  renderMarkers(filtered);
}

// ============================================================
//  LOAD INCIDENTS from API
// ============================================================
async function loadIncidents() {
  try {
    if (!mainMap) initMainMap();

    const res  = await fetch(`${CONFIG?.API_BASE_URL || 'http://localhost:3000/api'}/incidents`);
    const data = await res.json();

    if (!data.success) return;
    allIncidents = data.incidents || [];

    renderMarkers(allIncidents);
    renderReportsTable(allIncidents);

  } catch (e) {
    console.error('loadIncidents error:', e);
  }
}

// ============================================================
//  RENDER REPORTS TABLE
// ============================================================
function renderReportsTable(incidents) {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;

  if (!incidents.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#3a4a6a">No reports found.</td></tr>';
    return;
  }

  tbody.innerHTML = incidents.map(r => {
    const date = r.reported_at ? r.reported_at.toString().split('T')[0] : '-';
    return `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#3a4a6a">#${String(r.id).padStart(3,'0')}</td>
        <td>
          <div style="font-weight:600;font-size:13px">${r.title}</div>
          <div style="font-size:11px;color:#8a9abf;margin-top:2px">${r.category||''}</div>
        </td>
        <td style="color:#8a9abf;font-size:12px">${r.category||'-'}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${priorityBadge(r.priority)}</td>
        <td style="color:#8a9abf;font-size:12px">${date}</td>
        <td>
          <button class="btn-action btn-view" onclick="viewIncident(${r.id})">View</button>
        </td>
      </tr>`;
  }).join('');
}

function statusBadge(s) {
  const map = {
    'Pending':      'badge-pending',
    'Verified':     'badge-verified',
    'In Progress':  'badge-inprogress',
    'Resolved':     'badge-resolved',
    'False Report': 'badge-false'
  };
  return `<span class="badge ${map[s]||'badge-pending'}">${s}</span>`;
}

function priorityBadge(p) {
  const map = {
    'Low':      'badge-low',
    'Medium':   'badge-medium',
    'High':     'badge-high',
    'Critical': 'badge-critical'
  };
  return `<span class="badge ${map[p]||'badge-medium'}">${p}</span>`;
}

async function viewIncident(id) {
  try {
    const res  = await fetch(`${CONFIG?.API_BASE_URL || 'http://localhost:3000/api'}/incidents/${id}`);
    const data = await res.json();
    const r    = data.incident || data;

    document.getElementById('modalTitle').textContent = r.title || 'Incident Details';
    document.getElementById('modalBody').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <div style="color:#3a4a6a;font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Status</div>
          ${statusBadge(r.status)}
        </div>
        <div>
          <div style="color:#3a4a6a;font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Priority</div>
          ${priorityBadge(r.priority)}
        </div>
        <div style="grid-column:1/-1">
          <div style="color:#3a4a6a;font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Description</div>
          <div style="font-size:13px;line-height:1.6">${r.description||'-'}</div>
        </div>
        <div style="grid-column:1/-1">
          <div style="color:#3a4a6a;font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Location</div>
          <div style="font-size:13px">${r.location_address||'-'}</div>
          <div style="font-size:11px;color:#3a4a6a;font-family:'JetBrains Mono',monospace;margin-top:3px">${r.latitude ? r.latitude+'°N, '+r.longitude+'°E' : ''}</div>
        </div>
        <div>
          <div style="color:#3a4a6a;font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Category</div>
          <div style="font-size:13px">${r.category||'-'}</div>
        </div>
        <div>
          <div style="color:#3a4a6a;font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Reporter</div>
          <div style="font-size:13px">${r.username||'Anonymous'}</div>
        </div>
        ${r.admin_notes ? `
        <div style="grid-column:1/-1">
          <div style="color:#3a4a6a;font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Admin Notes</div>
          <div style="font-size:13px;background:#162035;padding:10px 12px;border-radius:8px;font-style:italic">${r.admin_notes}</div>
        </div>` : ''}
      </div>
    `;
    document.getElementById('incidentModal').classList.remove('hidden');
  } catch (e) {
    console.error('viewIncident error:', e);
  }
}

function initSubmitMap() {
  if (submitMap) return;

  submitMap = L.map('submitMap', {
    center: [8.3595, 124.8675],
    zoom: 17,
    minZoom: 16,
    maxZoom: 19,
    maxBounds: NBSC_BOUNDS,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(submitMap);

  L.polygon(NBSC_POLYGON, {
    color:       '#c9a227',
    weight:      2,
    opacity:     0.8,
    fillColor:   '#c9a227',
    fillOpacity: 0.04,
    dashArray:   '6,4'
  }).addTo(submitMap);

  const info = L.control({ position: 'topright' });
  info.onAdd = () => {
    const div = L.DomUtil.create('div');
    div.innerHTML = `
      <div style="background:rgba(15,24,41,.9);border:1px solid #1e3060;border-radius:8px;
                  padding:8px 14px;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;
                  color:#8a9abf;max-width:200px;line-height:1.5">
        📍 <strong style="color:#c9a227">Click on the map</strong><br>
        to pin your hazard location within NBSC Campus
      </div>`;
    return div;
  };
  info.addTo(submitMap);

  submitMap.on('click', function(e) {
    const { lat, lng } = e.latlng;

    if (!NBSC_BOUNDS.contains([lat, lng])) {
      showOutOfBoundsWarning();
      return;
    }

    document.getElementById('latitude').value  = lat.toFixed(8);
    document.getElementById('longitude').value = lng.toFixed(8);

    const locDisplay = document.getElementById('locationDisplay');
    const locText    = document.getElementById('locationText');
    locDisplay.style.border     = '1px solid #22c55e';
    locDisplay.style.color      = '#22c55e';
    locDisplay.style.background = 'rgba(34,197,94,.05)';
    locText.textContent = `📍 ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;

    if (submitMarker) {
      submitMarker.setLatLng([lat, lng]);
    } else {
      submitMarker = L.marker([lat, lng], {
        icon: makeIcon('#c9a227', 'High'),
        draggable: true
      }).addTo(submitMap);

      submitMarker.on('dragend', function(ev) {
        const pos = ev.target.getLatLng();

        if (!NBSC_BOUNDS.contains(pos)) {
          submitMarker.setLatLng([lat, lng]);
          showOutOfBoundsWarning();
          return;
        }

        document.getElementById('latitude').value  = pos.lat.toFixed(8);
        document.getElementById('longitude').value = pos.lng.toFixed(8);
        locText.textContent = `📍 ${pos.lat.toFixed(6)}°N, ${pos.lng.toFixed(6)}°E`;
      });
    }

    submitMarker.bindPopup(
      '<div style="font-size:12px;color:#e8eaf0;font-family:sans-serif">📍 Hazard location set!<br><small style="color:#8a9abf">Drag to adjust</small></div>',
      { className: 'hazard-popup' }
    ).openPopup();
  });
}

function showOutOfBoundsWarning() {
  const existing = document.getElementById('nbsc-warning');
  if (existing) return;

  const warn = document.createElement('div');
  warn.id = 'nbsc-warning';
  warn.style.cssText = `
    position:fixed;top:80px;right:20px;
    background:#0f1829;border:1px solid #ef4444;border-left:3px solid #ef4444;
    border-radius:10px;padding:14px 20px;
    font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;
    color:#ef4444;z-index:9999;box-shadow:0 4px 24px rgba(0,0,0,.6);
    display:flex;align-items:center;gap:10px;max-width:320px;
  `;
  warn.innerHTML = `
    <span style="font-size:18px">⚠️</span>
    <span><strong>Outside NBSC Campus!</strong><br>
    <span style="color:#8a9abf;font-size:12px">Please pin your location inside the NBSC campus boundary.</span></span>
  `;
  document.body.appendChild(warn);
  setTimeout(() => warn.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  initMainMap();
  loadIncidents();

  const submitLink = document.getElementById('submitNavLink');
  if (submitLink) {
    submitLink.addEventListener('click', () => {
      setTimeout(() => {
        initSubmitMap();
        if (submitMap) submitMap.invalidateSize();
      }, 100);
    });
  }

  const gpsBtn = document.getElementById('getCurrentLocation');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      gpsBtn.textContent = '⏳ Getting location...';
      gpsBtn.disabled    = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="2"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg> Use Current Location`;
          gpsBtn.disabled = false;

          let { latitude: lat, longitude: lng } = pos.coords;

          if (!NBSC_BOUNDS.contains([lat, lng])) {
            lat = 8.3595;
            lng = 124.8675;
            showOutOfBoundsWarning();
          }

          if (!submitMap) initSubmitMap();
          submitMap.setView([lat, lng], 18);

          document.getElementById('latitude').value  = lat.toFixed(8);
          document.getElementById('longitude').value = lng.toFixed(8);

          const locDisplay = document.getElementById('locationDisplay');
          const locText    = document.getElementById('locationText');
          locDisplay.style.border     = '1px solid #22c55e';
          locDisplay.style.color      = '#22c55e';
          locDisplay.style.background = 'rgba(34,197,94,.05)';
          locText.textContent = `📍 ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;

          if (submitMarker) {
            submitMarker.setLatLng([lat, lng]);
          } else {
            submitMarker = L.marker([lat, lng], {
              icon: makeIcon('#c9a227', 'High'),
              draggable: true
            }).addTo(submitMap);

            submitMarker.on('dragend', function(ev) {
              const p = ev.target.getLatLng();
              if (!NBSC_BOUNDS.contains(p)) {
                submitMarker.setLatLng([lat, lng]);
                showOutOfBoundsWarning();
                return;
              }
              document.getElementById('latitude').value  = p.lat.toFixed(8);
              document.getElementById('longitude').value = p.lng.toFixed(8);
              locText.textContent = `📍 ${p.lat.toFixed(6)}°N, ${p.lng.toFixed(6)}°E`;
            });
          }
        },
        (err) => {
          gpsBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="2"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg> Use Current Location`;
          gpsBtn.disabled = false;
          alert('Could not get your location. Please click on the map to pin manually.');
        }
      );
    });
  }

  const refreshBtn = document.getElementById('refreshMap');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadIncidents);
  }

  ['statusFilter', 'priorityFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyFilters);
  });
});