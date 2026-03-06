# BSSIDFinder

An interactive web-based tool for locating WiFi access points using Apple's WLOC geolocation service and the WiGLE API. Click anywhere on the map to discover nearby access points, or search globally by SSID/BSSID.

Built on top of [acheong08/apple-corelocation-experiments](https://github.com/acheong08/apple-corelocation-experiments).

## Features

- **Dual-source lookups** — Queries Apple's WLOC API and WiGLE simultaneously for maximum coverage
- **Interactive map** — Dark, light, standard, and topo tile layers via Leaflet.js
- **SSID search** — Search WiGLE's global database by network name (supports wildcards)
- **BSSID search** — Look up a specific MAC address across WiGLE
- **Address/coordinate search** — Jump to any location by address or lat/long via Nominatim geocoding
- **Hotlist** — Highlight specific BSSIDs in red/bold to track devices of interest
- **Search history** — All searches persist in localStorage with one-click replay
- **CSV export** — Download all accumulated results as a CSV file
- **Result accumulation** — Results from multiple clicks/searches stack in one table
- **Auto-launch** — The EXE opens your browser automatically on startup

## Data returned per access point

| Field | Description |
|-------|-------------|
| Source | Apple or WiGLE |
| BSSID | MAC address |
| SSID | Network name (WiGLE only) |
| Latitude / Longitude | GPS coordinates |
| Altitude | Elevation in meters |
| H. Accuracy / V. Accuracy | Horizontal and vertical accuracy |
| Speed / Course | Movement data (Apple only) |
| Timestamp | When the AP was last seen |
| Floor | Indoor floor level (Apple only) |

## Quick start

### From source

```
go run ./cmd/demo-api
```

The UI opens at http://127.0.0.1:1974.

### Build an EXE

```
go build -o demo-api.exe ./cmd/demo-api
```

Double-click the EXE — it launches the server and opens your browser.

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--lat` | 39.8283 | Default map latitude (US center) |
| `--long` | -98.5795 | Default map longitude |
| `--china` | false | Use Apple's China-region API |

## Usage

1. **Click the map** — Queries Apple WLOC (and WiGLE if credentials are entered) for nearby access points. Results appear as pins and in the table below.
2. **Search by address** — Type an address or `lat, long` in the top-left search bar and press Go.
3. **WiGLE setup** — Enter your WiGLE API Name and Token in the bar below the map. Credentials are saved in your browser's localStorage.
4. **SSID search** — Type a network name (e.g. "Marriott") in the SSID field and click Search. Uses WiGLE's `ssidlike` parameter so partial matches work.
5. **BSSID search** — Enter a full or partial MAC address and click Search.
6. **Hotlist** — Paste comma-separated BSSIDs into the Hotlist field. Matching rows turn red/bold and sort to the top.
7. **History** — Click the History button (top-right) to replay any previous search. History persists across browser sessions.
8. **CSV download** — Click "Download CSV" to export all results.

## WiGLE API

To use WiGLE features, you need a free account at [wigle.net](https://wigle.net). Generate an API Name and Token from your account settings. The credentials are stored only in your browser — they are never saved server-side.

## How it works

**Apple WLOC:** Uses a spiral search pattern starting from the clicked location to find the nearest valid tile via Apple's `gs-loc.apple.com/clls/wloc` endpoint. Once a starting BSSID is found, it iteratively queries for nearby access points until convergence.

**WiGLE:** Queries `api.wigle.net/api/v2/network/search` with a geographic bounding box (±0.005°) around the clicked point, or globally by SSID/BSSID for direct searches.

Both queries run concurrently — neither blocks the other.

## Credits

- [acheong08/apple-corelocation-experiments](https://github.com/acheong08/apple-corelocation-experiments) — Original WLOC research and implementation
- [WiGLE](https://wigle.net) — Wireless network database
- [Leaflet.js](https://leafletjs.com) — Interactive maps
- [CartoDB](https://carto.com) — Dark Matter and Positron tile layers
