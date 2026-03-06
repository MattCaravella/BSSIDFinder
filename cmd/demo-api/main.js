var lat = parseFloat(document.getElementById("lat").dataset.name);
var long = parseFloat(document.getElementById("long").dataset.name);
var china = document.getElementById("china").dataset.name;
var map;
if (china == "true") {
  var getTiles = function (baseUrl, tilePoint) {
    String.prototype.formatString = function () {
      let a = this;
      let b;
      for (b in arguments) {
        a = a.replace(/{[0-9]}/, arguments[b]);
      }
      return a;
    };

    tilePoint = baseUrl;
    baseUrl = this._url;
    var offset = Math.pow(2, tilePoint.z - 1);
    var x = tilePoint.x - offset;
    var y = offset - tilePoint.y - 1;
    var z = tilePoint.z;
    return baseUrl.formatString(parseInt(Math.random() * 10) % 4, x, y, z);
  };

  var subdomains = "0123";
  var baiduCRS = new L.Proj.CRS(
    "EPSG:3857",
    "+proj=merc +a=6378206 +b=6356584.314245179 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs",
    {
      resolutions: (function () {
        var res = [];
        for (var i = 0; i < 20; ++i) {
          res[i] = Math.pow(2, 18 - i);
        }
        return res;
      })(),
      origin: [-3.3554432e7, 3.3554432e7],
      bounds: L.bounds(
        [-3.3554432e7, 3.3554432e7],
        [3.3554432e7, -3.3554432e7],
      ),
    },
  );
  var baiduLayer = L.tileLayer(
    "http://maponline{0}.bdimg.com/tile/?qt=tile&x={1}&y={2}&z={3}&styles=pl",
    {
      minZoom: 3,
      noWrap: false,
    },
  );

  baiduLayer.getTileUrl = getTiles;
  map = L.map("map", {
    crs: baiduCRS,
  })
    .setView([lat, long], 5)
    .addLayer(baiduLayer);
} else {
  var darkMatter = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
  });
  var osmStandard = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  var positron = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
  });
  var topoMap = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  });
  map = L.map("map", {}).setView([lat, long], 5).addLayer(darkMatter);
  L.control.layers({
    "Dark": darkMatter,
    "Standard": osmStandard,
    "Light": positron,
    "Topo": topoMap,
  }, null, { position: "topright" }).addTo(map);
}

var currentPoints = [];
var hotlist = [];
var mapMarkers = [];

// WiGLE credentials from localStorage
function getWiGLECreds() {
  return {
    name: document.getElementById("wigle-api-name").value.trim(),
    token: document.getElementById("wigle-api-token").value.trim()
  };
}
function saveWiGLECreds() {
  var creds = getWiGLECreds();
  localStorage.setItem("wigle_api_name", creds.name);
  localStorage.setItem("wigle_api_token", creds.token);
}
function loadWiGLECreds() {
  document.getElementById("wigle-api-name").value = localStorage.getItem("wigle_api_name") || "";
  document.getElementById("wigle-api-token").value = localStorage.getItem("wigle_api_token") || "";
}


// History stored in localStorage
function getHistory() {
  try { return JSON.parse(localStorage.getItem("wloc_history") || "[]"); }
  catch(e) { return []; }
}
function saveHistory(history) {
  localStorage.setItem("wloc_history", JSON.stringify(history));
}
function addHistoryEntry(lat, lng, points) {
  var history = getHistory();
  history.unshift({
    lat: lat,
    lng: lng,
    time: new Date().toISOString(),
    count: points.length,
    points: points
  });
  if (history.length > 50) history = history.slice(0, 50);
  saveHistory(history);
  renderHistoryList();
}
function renderHistoryList() {
  var list = document.getElementById("history-list");
  var history = getHistory();
  list.innerHTML = "";
  if (!history.length) {
    list.innerHTML = '<li class="history-empty">No searches yet</li>';
    return;
  }
  history.forEach(function(entry, idx) {
    var li = document.createElement("li");
    var d = new Date(entry.time);
    var timeStr = d.toLocaleDateString() + " " + d.toLocaleTimeString();
    li.innerHTML =
      '<div class="hist-time">' + timeStr + '</div>' +
      '<div class="hist-loc">' + entry.lat.toFixed(6) + ', ' + entry.lng.toFixed(6) + '</div>' +
      '<div class="hist-count">' + entry.count + ' access points</div>';
    li.addEventListener("click", function() { loadHistoryEntry(idx); });
    list.appendChild(li);
  });
}
function clearMapMarkers() {
  mapMarkers.forEach(function(m) { map.removeLayer(m); });
  mapMarkers = [];
}
function loadHistoryEntry(idx) {
  var history = getHistory();
  var entry = history[idx];
  if (!entry) return;
  // Clear current markers and load history data
  clearMapMarkers();
  currentPoints = entry.points;
  entry.points.forEach(function(p) {
    var m = L.marker([p.y, p.x]).addTo(map).bindPopup(p.id);
    mapMarkers.push(m);
  });
  map.setView([entry.lat, entry.lng], 15);
  renderTable();
  // Close the panel
  document.getElementById("history-panel").style.display = "none";
}

function getHotlist() {
  var val = document.getElementById("hotlist-input").value.trim();
  if (!val) return [];
  return val.split(/[,\s]+/).map(function(s) { return s.trim().toUpperCase(); }).filter(Boolean);
}

function isHotlisted(bssid) {
  var upper = bssid.toUpperCase();
  for (var i = 0; i < hotlist.length; i++) {
    if (upper === hotlist[i]) return true;
  }
  return false;
}

function renderTable() {
  hotlist = getHotlist();
  var tbody = document.getElementById("results-body");
  tbody.innerHTML = "";

  // Sort: hotlisted items first, then the rest in original order
  var hotItems = [];
  var normalItems = [];
  currentPoints.forEach(function(p) {
    if (isHotlisted(p.id)) hotItems.push(p);
    else normalItems.push(p);
  });
  var sorted = hotItems.concat(normalItems);

  sorted.forEach(function(p, i) {
    var tr = document.createElement("tr");
    if (isHotlisted(p.id)) tr.className = "hotlist-row";
    tr.innerHTML =
      "<td>" + (i + 1) + "</td>" +
      "<td>" + (p.source || "") + "</td>" +
      "<td>" + p.id + "</td>" +
      "<td>" + (p.ssid || "") + "</td>" +
      "<td>" + p.y + "</td>" +
      "<td>" + p.x + "</td>" +
      "<td>" + p.alt + "</td>" +
      "<td>" + p.h_acc + "</td>" +
      "<td>" + p.v_acc + "</td>" +
      "<td>" + p.speed + "</td>" +
      "<td>" + p.course + "</td>" +
      "<td>" + p.timestamp + "</td>" +
      "<td>" + p.floor + "</td>";
    tbody.appendChild(tr);
  });

  document.getElementById("results-count").textContent =
    currentPoints.length + " access points found";
  document.getElementById("download-csv").style.display = currentPoints.length ? "inline-block" : "none";
  document.getElementById("clear-results").style.display = currentPoints.length ? "inline-block" : "none";
}

function plotPoint(p) {
  var m = L.marker([p.y, p.x]).addTo(map).bindPopup(p.id);
  mapMarkers.push(m);
}
let blocker = false;
async function onMapClick(e) {
  if (blocker) return;
  blocker = true;
  var loading = document.createElement("dialog");
  loading.innerHTML = "Loading...";
  document.body.appendChild(loading);
  loading.showModal();

  var cleanUp = function() {
    blocker = false;
    loading.remove();
  };

  var lat = e.latlng.lat;
  var long = e.latlng.lng;
  var wigleCreds = getWiGLECreds();
  saveWiGLECreds();
  var postBody = { lat: lat, long: long };
  if (wigleCreds.name && wigleCreds.token) {
    postBody.wigle_api_name = wigleCreds.name;
    postBody.wigle_api_token = wigleCreds.token;
  }
  var resp = await fetch("/gps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postBody),
  });
  if (!resp.ok) {
    cleanUp();
    alert("Error: " + resp.status);
    return;
  }
  resp = await resp.json();
  console.log(resp);
  plotPoint(resp.closest);
  resp.points.forEach(plotPoint);

  // Accumulate results
  var newPoints = [resp.closest].concat(resp.points);
  currentPoints = currentPoints.concat(newPoints);
  addHistoryEntry(lat, long, newPoints);
  renderTable();
  cleanUp();
}
map.on("click", onMapClick);

// Re-render table when hotlist changes
document.getElementById("hotlist-input").addEventListener("input", renderTable);

// Clear results
document.getElementById("clear-results").addEventListener("click", function() {
  currentPoints = [];
  renderTable();
});

// Search bar
var searchInput = document.getElementById("search-input");
var searchBtn = document.getElementById("search-btn");

async function doSearch() {
  var query = searchInput.value.trim();
  if (!query) return;

  // Check if input is lat, long coordinates
  var coords = query.split(/[,\s]+/).map(Number);
  if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1]) &&
      coords[0] >= -90 && coords[0] <= 90 && coords[1] >= -180 && coords[1] <= 180) {
    map.setView([coords[0], coords[1]], 15);
    return;
  }

  // Otherwise geocode the address via Nominatim
  try {
    var res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query));
    var data = await res.json();
    if (data.length > 0) {
      map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 15);
    } else {
      alert("Location not found");
    }
  } catch (err) {
    alert("Geocoding failed: " + err.message);
  }
}

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") doSearch();
});

// Download CSV
document.getElementById("download-csv").addEventListener("click", function() {
  if (!currentPoints.length) return;
  var csv = "Source,BSSID,SSID,Latitude,Longitude,Altitude,H_Accuracy,V_Accuracy,Speed,Course,Timestamp,Floor\n";
  currentPoints.forEach(function(p) {
    csv += (p.source || "") + "," + p.id + "," + (p.ssid || "") + "," + p.y + "," + p.x + "," + p.alt + "," + p.h_acc + "," + p.v_acc + "," + p.speed + "," + p.course + "," + p.timestamp + "," + p.floor + "\n";
  });
  var blob = new Blob([csv], { type: "text/csv" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "wifi_access_points.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

// Prevent map clicks when interacting with search box
document.getElementById("search-box").addEventListener("click", function(e) {
  e.stopPropagation();
});

// WiGLE SSID/BSSID search
async function doWiGLESearch(type) {
  var inputId = type === "ssid" ? "wigle-ssid-search" : "wigle-bssid-search";
  var query = document.getElementById(inputId).value.trim();
  if (!query) return;

  var creds = getWiGLECreds();
  if (!creds.name || !creds.token) {
    alert("Enter WiGLE API Name and Token first");
    return;
  }
  saveWiGLECreds();

  var loading = document.createElement("dialog");
  loading.innerHTML = "Searching WiGLE...";
  document.body.appendChild(loading);
  loading.showModal();

  try {
    var resp = await fetch("/wigle/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: type,
        query: query,
        wigle_api_name: creds.name,
        wigle_api_token: creds.token
      }),
    });
    if (!resp.ok) {
      var errText = await resp.text();
      alert("WiGLE search error: " + errText);
      return;
    }
    var data = await resp.json();
    if (!data.points || data.points.length === 0) {
      alert("No results found");
      return;
    }
    data.points.forEach(plotPoint);
    currentPoints = currentPoints.concat(data.points);
    // Center map on first result
    map.setView([data.points[0].y, data.points[0].x], 12);
    addHistoryEntry(data.points[0].y, data.points[0].x, data.points);
    renderTable();
  } catch (err) {
    alert("WiGLE search failed: " + err.message);
  } finally {
    loading.remove();
  }
}

document.getElementById("wigle-ssid-btn").addEventListener("click", function() { doWiGLESearch("ssid"); });
document.getElementById("wigle-bssid-btn").addEventListener("click", function() { doWiGLESearch("bssid"); });
document.getElementById("wigle-ssid-search").addEventListener("keydown", function(e) {
  if (e.key === "Enter") doWiGLESearch("ssid");
});
document.getElementById("wigle-bssid-search").addEventListener("keydown", function(e) {
  if (e.key === "Enter") doWiGLESearch("bssid");
});

// History panel toggle
document.getElementById("history-btn").addEventListener("click", function(e) {
  e.stopPropagation();
  var panel = document.getElementById("history-panel");
  panel.style.display = panel.style.display === "block" ? "none" : "block";
});
document.getElementById("history-panel").addEventListener("click", function(e) {
  e.stopPropagation();
});
document.getElementById("history-btn").addEventListener("mousedown", function(e) {
  e.stopPropagation();
});
document.getElementById("history-clear-btn").addEventListener("click", function() {
  saveHistory([]);
  renderHistoryList();
});

// Initialize history list on load
renderHistoryList();

// Load saved WiGLE credentials
loadWiGLECreds();
document.getElementById("wigle-api-name").addEventListener("change", saveWiGLECreds);
document.getElementById("wigle-api-token").addEventListener("change", saveWiGLECreds);
