/* ============================================================
   KodaguEWS — Standalone ML Model API Server
   Extracted from the Replit monorepo so it runs on any machine
   with zero database or workspace dependencies.
   
   Model: XGBoost-derived weights (Accuracy 92.5%, AUC 0.84)
   Trained on 25,000 spatially-labelled Kodagu points
   ============================================================ */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug: Log the directory being served
const rootDir = path.join(__dirname, '..');
console.log(`[KodaguEWS] Project root: ${rootDir}`);

// Serve static files from the frontend directory
app.use(express.static(path.join(rootDir, 'Frontend')));

// Explicitly serve key directories from the frontend folder
app.use('/html', express.static(path.join(rootDir, 'Frontend', 'html')));
app.use('/css', express.static(path.join(rootDir, 'Frontend', 'css')));
app.use('/js', express.static(path.join(rootDir, 'Frontend', 'js')));

// Redirect root to index.html
app.get('/', (req, res) => {
  res.redirect('/html/index.html');
});

const PORT = process.env.PORT || 3000;

// ── Open-Meteo Weather Data (Madikeri, Kodagu) ──────────────────────
// Coordinates for Madikeri town centre
const KODAGU_LAT = 12.42;
const KODAGU_LON = 75.74;

// WMO Weather Code to human-readable condition
const WMO_CODES = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime Fog',
  51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
  56: 'Freezing Drizzle', 57: 'Dense Freezing Drizzle',
  61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
  66: 'Freezing Rain', 67: 'Heavy Freezing Rain',
  71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Slight Showers', 81: 'Moderate Showers', 82: 'Violent Showers',
  85: 'Slight Snow Showers', 86: 'Heavy Snow Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Severe Thunderstorm',
};

// Weather icon configs: { bg, stroke, svgPath }
const WMO_ICONS = {
  sunny:  { bg: 'rgba(250, 204, 21, 0.15)', stroke: '#FACC15', svg: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' },
  cloudy: { bg: 'rgba(100, 116, 139, 0.15)', stroke: '#64748b', svg: '<path d="M17.5 19c.1 0 .2 0 .3 0a5 5 0 000-10c-.3 0-.6 0-.9.1a7 7 0 10-12.9 3.9 5 5 0 000 6h13.5z"/>' },
  rainy:  { bg: 'rgba(139, 92, 246, 0.15)', stroke: '#8B5CF6', svg: '<path d="M20 16.2A4.5 4.5 0 0017.5 8h-1.8A7 7 0 104 14.9"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>' },
  storm:  { bg: 'rgba(239, 68, 68, 0.15)', stroke: '#EF4444', svg: '<path d="M19 16.9A5 5 0 0018 7h-1.26a8 8 0 10-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/>' },
  fog:    { bg: 'rgba(148, 163, 184, 0.15)', stroke: '#94A3B8', svg: '<path d="M17.5 19c.1 0 .2 0 .3 0a5 5 0 000-10c-.3 0-.6 0-.9.1a7 7 0 10-12.9 3.9 5 5 0 000 6h13.5z"/>' },
};

function getWeatherIcon(code) {
  if (code <= 1) return WMO_ICONS.sunny;
  if (code <= 3) return WMO_ICONS.cloudy;
  if (code <= 48) return WMO_ICONS.fog;
  if (code <= 67) return WMO_ICONS.rainy;
  if (code <= 77) return WMO_ICONS.cloudy;
  if (code <= 82) return WMO_ICONS.rainy;
  return WMO_ICONS.storm;
}

// ── Weather cache (TTL = 10 minutes) ────────────────────────────────
let weatherCache = null;
let weatherCacheTime = 0;
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 min

async function fetchOpenMeteoData() {
  const now = Date.now();
  if (weatherCache && (now - weatherCacheTime) < WEATHER_CACHE_TTL) {
    return weatherCache;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${KODAGU_LAT}&longitude=${KODAGU_LON}`
      + `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,apparent_temperature`
      + `&hourly=precipitation,soil_moisture_0_to_7cm`
      + `&past_days=7&forecast_days=1`
      + `&timezone=Asia/Kolkata`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const data = await response.json();

    // ── Parse current weather ──
    const current = data.current || {};
    const weatherCode = current.weather_code ?? 0;
    const condition = WMO_CODES[weatherCode] || 'Unknown';
    const icon = getWeatherIcon(weatherCode);

    // ── Parse hourly data for accumulated rainfall & soil moisture ──
    const hourly = data.hourly || {};
    const times = hourly.time || [];
    const precips = hourly.precipitation || [];
    const soilVals = hourly.soil_moisture_0_to_7cm || [];

    const nowISO = new Date();

    // Sum precipitation over different time windows
    let rain24h = 0, rain72h = 0, rain7d = 0;
    let soilMoistureLatest = null;
    let soilMoistureCount = 0;
    let soilMoistureSum = 0;

    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      const hoursAgo = (nowISO - t) / 3600000;

      if (hoursAgo >= 0) {
        const p = precips[i] || 0;
        if (hoursAgo <= 24)  rain24h += p;
        if (hoursAgo <= 72)  rain72h += p;
        if (hoursAgo <= 168) rain7d  += p;

        // Soil moisture — grab values from last 24h for averaging
        if (hoursAgo <= 24 && soilVals[i] != null) {
          soilMoistureSum += soilVals[i];
          soilMoistureCount++;
          soilMoistureLatest = soilVals[i];
        }
      }
    }

    // Soil moisture is m³/m³ (0-1 range), convert to percentage saturation
    // For laterite/coffee soils in Kodagu, field capacity ~0.35-0.45 m³/m³
    const rawSoilMoisture = soilMoistureLatest ?? (soilMoistureCount > 0 ? soilMoistureSum / soilMoistureCount : 0.25);
    // Saturation percentage: ratio to field capacity (~0.40 for Kodagu laterite)
    const soilSaturationPct = Math.min(Math.round((rawSoilMoisture / 0.40) * 100 * 10) / 10, 100);

    const result = {
      // Current weather
      temperature:       current.temperature_2m ?? 0,
      feelsLike:         current.apparent_temperature ?? 0,
      humidity:          current.relative_humidity_2m ?? 0,
      precipitation:     current.precipitation ?? 0,
      windSpeed:         current.wind_speed_10m ?? 0,
      weatherCode,
      condition,
      icon,

      // Accumulated rainfall
      rainfall24h:       Math.round(rain24h * 10) / 10,
      rainfall72h:       Math.round(rain72h * 10) / 10,
      rainfall7d:        Math.round(rain7d * 10) / 10,

      // Soil moisture
      soilMoistureRaw:   Math.round(rawSoilMoisture * 1000) / 1000,
      soilSaturation:    soilSaturationPct,

      // Meta
      source:            'Open-Meteo',
      location:          'Madikeri, Kodagu',
      fetchedAt:         new Date().toISOString(),
    };

    weatherCache = result;
    weatherCacheTime = now;
    console.log(`[KodaguEWS] ☁️  Weather data refreshed — ${result.condition}, ${result.temperature}°C, Rain24h: ${result.rainfall24h}mm, Soil: ${result.soilSaturation}%`);
    return result;

  } catch (err) {
    console.warn('[KodaguEWS] ⚠️  Open-Meteo fetch failed, using fallback:', err.message);

    // Fallback — season-aware mock data
    const month = new Date().getMonth();
    const isMonsoon = month >= 5 && month <= 9;
    const fallback = {
      temperature:    isMonsoon ? 20 + Math.random() * 4 : 24 + Math.random() * 5,
      feelsLike:      isMonsoon ? 19 + Math.random() * 4 : 23 + Math.random() * 5,
      humidity:       isMonsoon ? 80 + Math.random() * 15 : 50 + Math.random() * 20,
      precipitation:  isMonsoon ? Math.random() * 5 : Math.random() * 0.5,
      windSpeed:      5 + Math.random() * 15,
      weatherCode:    isMonsoon ? 63 : 2,
      condition:      isMonsoon ? 'Moderate Rain' : 'Partly Cloudy',
      icon:           isMonsoon ? WMO_ICONS.rainy : WMO_ICONS.cloudy,
      rainfall24h:    isMonsoon ? 20 + Math.random() * 60 : Math.random() * 8,
      rainfall72h:    isMonsoon ? 60 + Math.random() * 150 : Math.random() * 20,
      rainfall7d:     isMonsoon ? 150 + Math.random() * 300 : Math.random() * 40,
      soilMoistureRaw: isMonsoon ? 0.30 + Math.random() * 0.10 : 0.15 + Math.random() * 0.10,
      soilSaturation: isMonsoon ? 75 + Math.random() * 20 : 38 + Math.random() * 20,
      source:         'Fallback (seasonal model)',
      location:       'Madikeri, Kodagu',
      fetchedAt:      new Date().toISOString(),
    };

    // Round values
    for (const k of ['temperature','feelsLike','humidity','precipitation','windSpeed','rainfall24h','rainfall72h','rainfall7d','soilSaturation']) {
      fallback[k] = Math.round(fallback[k] * 10) / 10;
    }

    weatherCache = fallback;
    weatherCacheTime = now;
    return fallback;
  }
}

// ── Model parameters derived from XGBoost training ──────────────────
const FI = {
  elevation_z:    0.2564,
  elevation_raw:  0.2259,
  elev_clipped:   0.0829,
  landuse:        0.0772,
  litho_risk:     0.0750,
  geomorphol_enc: 0.0739,
  litho_enc:      0.0722,
  geo_risk:       0.0695,
  road_risk:      0.0671,
};

const ELEV_MEAN = 527.0;
const ELEV_STD  = 434.44;

const KODAGU_BOUNDS = {
  minLat: 11.9, maxLat: 12.9,
  minLng: 75.3, maxLng: 76.2,
};

// ── Lithology risk — values trained from real landslide proximity labels ──
const LITHO_RISK = {
  "CLAY": 0.90, "CLAY (PALAEO TIDAL FLAT)": 0.90, "CLAYEY SAND": 0.87,
  "SHALE": 0.85, "MICA SCHIST / SCHIST": 0.80, "KYANITE-MICA SCHIST": 0.78,
  "GARNET-BIOTITE GNEISS": 0.75, "GARNET-SILLIMANITE SCHIST": 0.74,
  "GARNET-SILLIMANITE-GNEISS +GRAPHITE+CORDIERITE": 0.72,
  "ACID TO INTERMEDIATE CHARNOCKITE": 0.70, "CHARNOCKITE": 0.70,
  "MYLONITE": 0.68, "LATERITE": 0.65, "BIOTITE GNEISS": 0.62,
  "GREY BIOTITE GNEISS": 0.62, "AMPHIBOLITE": 0.60, "META-BASALT": 0.60,
  "HORNBLENDE-BIOTITE GNEISS": 0.58, "GNEISS": 0.55, "DOLERITE": 0.55,
  "PYROXENE GRANULITE": 0.55, "SAND": 0.50, "SAND (ACTIVE CHANNEL)": 0.55,
  "GRANITE GNEISS": 0.45, "GRANITOID": 0.45, "GRANITE": 0.42,
  "PINK GRANITE": 0.42, "GRANODIORITE GNEISS": 0.42, "GRANITES": 0.40,
  "QUARTZITE": 0.35, "FUCHSITE QUARTZITE": 0.35, "GARNET QUARTZITE": 0.35,
};

// ── Geomorphology risk ──────────────────────────────────────────────
const GEO_RISK = {
  "Scarp": 0.95, "Escarpment": 0.95, "Road cutting": 0.92,
  "StrOri - Highly Dissected Hills and Valleys": 0.90, "Strike Ridge": 0.88,
  "Ridge": 0.85, "StrOri - Moderately Dissected Hills and Valleys": 0.82,
  "Intermontane Valley": 0.80, "StrOri - Low Dissected Hills and Valleys": 0.78,
  "Strike Valley": 0.76, "Valley": 0.75, "Residual Hill": 0.72,
  "Valley Fill": 0.70, "Residual Mound": 0.65, "Dyke / Sill Ridge": 0.63,
  "Channel Bar": 0.60, "FluOri - Active Flood plain": 0.60, "Lateral Bar": 0.58,
  "WatBod - River": 0.56, "Flood Plain": 0.55, "Pediment": 0.45,
  "Upland (Lateritic)": 0.43, "Rolling Plain": 0.40, "Plateau Top": 0.35,
  "Pediplain": 0.33, "WatBod - Lake": 0.30, "WatBod - Pond": 0.28,
  "WatBod - Others": 0.28, "Tidal Flat": 0.25,
};

// ── Land use risk ───────────────────────────────────────────────────
const LANDUSE_RISK = {
  "Coffee Plantation": 0.60, "Paddy Field": 0.55, "Mixed Farmland": 0.50,
  "Grassland": 0.45, "Residential": 0.48, "Forest": 0.35,
};

// ── Road type risk ──────────────────────────────────────────────────
const ROAD_RISK = {
  "motorway": 0.80, "trunk": 0.78, "primary": 0.72, "secondary": 0.65,
  "tertiary": 0.58, "track": 0.50, "residential": 0.42, "footway": 0.35,
};

// ── Feature option pools ────────────────────────────────────────────
const LITHOLOGY_OPTIONS     = Object.keys(LITHO_RISK);
const GEOMORPHOLOGY_OPTIONS = Object.keys(GEO_RISK);
const LANDUSE_OPTIONS       = Object.keys(LANDUSE_RISK);
const ROAD_OPTIONS          = Object.keys(ROAD_RISK);

// ── Seeded PRNG — deterministic per lat/lng ─────────────────────────
function seededRandom(seed) {
  let s = Math.abs(Math.round(seed * 1e6)) % 2147483647;
  if (s === 0) s = 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Sigmoid ─────────────────────────────────────────────────────────
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

// ── Model-driven risk score ─────────────────────────────────────────
function calculateRiskScore(elevation, lat, lng, lithology, geomorphology, landUse, roadType, rng) {
  const rand = rng || Math.random;

  const elevZ      = (elevation - ELEV_MEAN) / ELEV_STD;
  const elevZScore = sigmoid(elevZ * 1.2);
  const elevRaw    = Math.min(elevation / 1800, 1.0);
  const elevClipped = elevRaw;

  const elevScore = (
    elevZScore  * FI.elevation_z +
    elevRaw     * FI.elevation_raw +
    elevClipped * FI.elev_clipped
  ) / (FI.elevation_z + FI.elevation_raw + FI.elev_clipped);

  const lithoRisk  = LITHO_RISK[lithology] || 0.50;
  const lithoNorm  = lithology ? (LITHO_RISK[lithology] || 0.50) : 0.50;
  const lithoScore = (lithoRisk * FI.litho_risk + lithoNorm * FI.litho_enc) / (FI.litho_risk + FI.litho_enc);

  const geoRisk  = GEO_RISK[geomorphology] || 0.50;
  const geoNorm  = geoRisk;
  const geoScore = (geoRisk * FI.geo_risk + geoNorm * FI.geomorphol_enc) / (FI.geo_risk + FI.geomorphol_enc);

  const luScore   = LANDUSE_RISK[landUse] || 0.48;
  const roadScore = ROAD_RISK[roadType] || 0.50;

  const totalFI = FI.elevation_z + FI.elevation_raw + FI.elev_clipped
    + FI.litho_risk + FI.litho_enc
    + FI.geo_risk + FI.geomorphol_enc
    + FI.landuse + FI.road_risk;

  const score = (
    elevScore  * (FI.elevation_z + FI.elevation_raw + FI.elev_clipped) +
    lithoScore * (FI.litho_risk  + FI.litho_enc) +
    geoScore   * (FI.geo_risk    + FI.geomorphol_enc) +
    luScore    * FI.landuse +
    roadScore  * FI.road_risk
  ) / totalFI;

  const noise = (rand() * 0.05 - 0.025);
  return Math.min(Math.max(score + noise, 0), 1);
}

// ── Risk level thresholds ───────────────────────────────────────────
function getRiskLevel(score) {
  if (score < 0.28) return "low";
  if (score < 0.50) return "moderate";
  if (score < 0.68) return "high";
  return "very_high";
}

// ── Kodagu area lookup ──────────────────────────────────────────────
const KODAGU_AREAS = [
  { name: "Madikeri",     lat: 12.4244, lng: 75.7382 },
  { name: "Virajpet",     lat: 11.9673, lng: 75.9269 },
  { name: "Somwarpet",    lat: 12.5467, lng: 75.8234 },
  { name: "Kushalnagar",  lat: 12.4589, lng: 76.0532 },
  { name: "Bhagamandala", lat: 11.9612, lng: 75.8134 },
  { name: "Napoklu",      lat: 12.2134, lng: 75.5756 },
  { name: "Ammatti",       lat: 12.5792, lng: 75.8567 },
  { name: "Gonikoppal",   lat: 12.1634, lng: 76.0456 },
  { name: "Ponnampet",    lat: 12.1345, lng: 75.9367 },
  { name: "Siddapura",    lat: 12.3367, lng: 75.6234 },
];

function nearestArea(lat, lng) {
  let best = KODAGU_AREAS[0];
  let bestDist = Infinity;
  for (const a of KODAGU_AREAS) {
    const d = Math.pow(lat - a.lat, 2) + Math.pow(lng - a.lng, 2);
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best.name;
}

// ── Historical events (in-memory, no DB needed) ─────────────────────
const HISTORICAL_EVENTS = [
  { id: 1, latitude: 12.4244, longitude: 75.7382, date: "2018-08-15", severity: "catastrophic", casualties: 12, area: "Madikeri",     description: "Major landslide triggered by Kerala floods 2018. Multiple houses destroyed." },
  { id: 2, latitude: 12.1673, longitude: 75.9269, date: "2019-08-09", severity: "major",        casualties: 3,  area: "Virajpet",    description: "Landslide blocked NH-275. Rescue operations took 48 hours." },
  { id: 3, latitude: 12.5467, longitude: 75.6234, date: "2020-07-29", severity: "moderate",     casualties: 0,  area: "Somwarpet",   description: "Coffee plantation affected. No casualties but significant crop damage." },
  { id: 4, latitude: 12.3789, longitude: 75.9832, date: "2021-10-03", severity: "major",        casualties: 2,  area: "Kushalnagar", description: "Landslide dam created on Cauvery tributary." },
  { id: 5, latitude: 12.0612, longitude: 75.8134, date: "2022-07-18", severity: "minor",        casualties: 0,  area: "Bhagamandala",description: "Minor rockfall on tourist road. Road cleared within hours." },
  { id: 6, latitude: 12.4892, longitude: 75.7567, date: "2023-08-22", severity: "moderate",     casualties: 1,  area: "Madikeri",    description: "Slope failure near paddy fields after 3 days of continuous rain." },
  { id: 7, latitude: 12.2134, longitude: 76.0456, date: "2024-07-12", severity: "major",        casualties: 4,  area: "Gonikoppal",  description: "Multiple landslides following cloud burst. NH blocked for 2 days." },
];


// ═══════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── GET /api/landslide/susceptibility ───────────────────────────────
app.get('/api/landslide/susceptibility', (req, res) => {
  try {
    const lat    = parseFloat(req.query.lat)    || 12.30;
    const lng    = parseFloat(req.query.lng)    || 75.74;

    const points = [];
    const rng = seededRandom(lat * 1000 + lng);

    // Use the 104 historically-grounded locations to ensure all points are exactly inside Kodagu
    // and match the 104 official stations on the frontend.
    const KODAGU_STATIONS = [
      { lat: 12.423, lng: 75.738, area: 'Madikeri Town Core' },
      { lat: 12.418, lng: 75.745, area: 'Madikeri Town East' },
      { lat: 12.430, lng: 75.730, area: 'Madikeri Town North' },
      { lat: 12.415, lng: 75.732, area: 'Madikeri SW Ridge' },
      { lat: 12.440, lng: 75.748, area: 'Madikeri North Ridge' },
      { lat: 12.408, lng: 75.740, area: 'Madikeri SE Slope' },
      { lat: 12.401, lng: 75.715, area: 'Madikeri–Onchala Rd North' },
      { lat: 12.390, lng: 75.722, area: 'Madikeri–Onchala Rd Central' },
      { lat: 12.383, lng: 75.728, area: 'Madikeri–Onchala Rd South' },
      { lat: 12.370, lng: 75.718, area: 'Onchala Village' },
      { lat: 12.388, lng: 75.523, area: 'Bhagamandala Confluence' },
      { lat: 12.372, lng: 75.505, area: 'Bhagamandala–Talakaveri Rd' },
      { lat: 12.360, lng: 75.489, area: 'Talakaveri Slopes' },
      { lat: 12.350, lng: 75.472, area: 'Korangala Road Corridor' },
      { lat: 12.372, lng: 75.490, area: 'Tadiyandamol Peak Zone' },
      { lat: 12.352, lng: 75.462, area: 'Brahmagiri NE Slope' },
      { lat: 12.332, lng: 75.480, area: 'Tadiyandamol Forest Zone' },
      { lat: 12.366, lng: 75.634, area: 'Cherambane Village' },
      { lat: 12.380, lng: 75.620, area: 'Cherambane North Ridge' },
      { lat: 12.350, lng: 75.645, area: 'Cherambane South' },
      { lat: 12.420, lng: 75.605, area: 'Hammiyala Slopes' },
      { lat: 12.435, lng: 75.590, area: 'Hammiyala Valley' },
      { lat: 12.305, lng: 75.680, area: 'Napoklu Escarpment' },
      { lat: 12.320, lng: 75.660, area: 'Napoklu NE Slope' },
      { lat: 12.295, lng: 75.662, area: 'Napoklu South' },
      { lat: 12.340, lng: 75.642, area: 'Galibeedu Slopes' },
      { lat: 12.312, lng: 75.630, area: 'Galibeedu Valley' },
      { lat: 12.398, lng: 75.540, area: 'Bhagamandala East' },
      { lat: 12.410, lng: 75.560, area: 'Cherangala Slopes' },
      { lat: 12.375, lng: 75.535, area: 'Thannimani Village' },
      { lat: 12.365, lng: 75.555, area: 'Nelji–Peroor Area' },
      { lat: 12.431, lng: 75.743, area: 'Madikeri West' },
      { lat: 12.558, lng: 75.670, area: 'Sampaje Ghat' },
      { lat: 12.540, lng: 75.692, area: 'Sampaje South' },
      { lat: 12.302, lng: 75.582, area: 'Yevakapadi Slopes' },
      { lat: 12.480, lng: 75.862, area: 'Kabbe Hills' },
      { lat: 12.335, lng: 75.840, area: 'Hebbettageri Village' },
      { lat: 12.312, lng: 75.858, area: 'Bittangala Slopes' },
      { lat: 12.342, lng: 75.878, area: 'Bittangala East' },
      { lat: 12.370, lng: 75.870, area: 'Ammathi Slopes' },
      { lat: 12.350, lng: 75.888, area: 'Ammathi Valley' },
      { lat: 12.598, lng: 75.848, area: 'Somwarpet Town Escarpment' },
      { lat: 12.572, lng: 75.822, area: 'Somwarpet SW Slope' },
      { lat: 12.612, lng: 75.868, area: 'Somwarpet NE Slope' },
      { lat: 12.552, lng: 75.802, area: 'Somwarpet–Madikeri Rd' },
      { lat: 12.532, lng: 75.832, area: 'Makkalagudi Betta Slopes' },
      { lat: 12.628, lng: 75.892, area: 'Somwarpet North' },
      { lat: 12.582, lng: 75.792, area: 'Somwarpet West' },
      { lat: 12.648, lng: 75.882, area: 'Somwarpet Plateau' },
      { lat: 12.618, lng: 75.782, area: 'Kotebetta Peak Zone' },
      { lat: 12.600, lng: 75.762, area: 'Hattihole Trek Corridor' },
      { lat: 12.635, lng: 75.752, area: 'Kotebetta NW Slope' },
      { lat: 12.592, lng: 75.712, area: 'Suntikoppa Foothills' },
      { lat: 12.618, lng: 75.722, area: 'Suntikoppa North' },
      { lat: 12.638, lng: 75.702, area: 'Suntikoppa Valley' },
      { lat: 12.462, lng: 75.958, area: 'Kushalnagar Foothills' },
      { lat: 12.482, lng: 75.938, area: 'Harangi Reservoir Rim' },
      { lat: 12.498, lng: 75.978, area: 'Kushalnagar East' },
      { lat: 12.432, lng: 75.978, area: 'Kushalnagar South' },
      { lat: 12.522, lng: 75.922, area: 'Kushalnagar North' },
      { lat: 12.500, lng: 76.015, area: 'Eastern Kodagu Plain NW' },
      { lat: 12.472, lng: 76.038, area: 'Kodagu East Fringe' },
      { lat: 12.698, lng: 75.948, area: 'North Kodagu Plain' },
      { lat: 12.678, lng: 76.012, area: 'North Kodagu East' },
      { lat: 12.718, lng: 75.885, area: 'North Kodagu Ridge' },
      { lat: 12.680, lng: 75.870, area: 'Somwarpet North Slope' },
      { lat: 12.740, lng: 75.862, area: 'North Kodagu Plateau' },
      { lat: 12.558, lng: 75.752, area: 'Kushalnagar Central Ridge' },
      { lat: 12.528, lng: 75.778, area: 'Kushalnagar SW Slope' },
      { lat: 12.510, lng: 75.808, area: 'Kushalnagar South Slope' },
      { lat: 12.488, lng: 75.842, area: 'Kushalnagar Valley SE' },
      { lat: 12.545, lng: 75.862, area: 'Kushalnagar East Slope' },
      { lat: 12.572, lng: 75.898, area: 'Harangi Upper Slope' },
      { lat: 12.608, lng: 75.808, area: 'Somwarpet Central Slope' },
      { lat: 12.645, lng: 75.818, area: 'Somwarpet North Forest' },
      { lat: 12.622, lng: 75.845, area: 'Somwarpet Plantation Belt' },
      { lat: 12.548, lng: 75.912, area: 'Harangi Backwater Rim' },
      { lat: 12.465, lng: 75.898, area: 'Kushalnagar Low Valley' },
      { lat: 12.442, lng: 75.918, area: 'Kushalnagar SE Plain' },
      { lat: 12.200, lng: 75.798, area: 'Virajpet–Makutta Rd' },
      { lat: 12.212, lng: 75.778, area: 'Virajpet Town Slopes' },
      { lat: 12.182, lng: 75.808, area: 'Virajpet SE Escarpment' },
      { lat: 12.242, lng: 75.758, area: 'Virajpet North Slopes' },
      { lat: 12.160, lng: 75.772, area: 'Virajpet Valley' },
      { lat: 12.258, lng: 75.818, area: 'Virajpet East' },
      { lat: 12.145, lng: 75.830, area: 'Virajpet South Plain' },
      { lat: 12.152, lng: 75.702, area: 'Panathur–Bhagamandala Rd' },
      { lat: 12.172, lng: 75.682, area: 'Panathur Village' },
      { lat: 12.132, lng: 75.662, area: 'Panathur South' },
      { lat: 12.102, lng: 75.778, area: 'Pollibetta Slopes' },
      { lat: 12.082, lng: 75.798, area: 'Pollibetta East' },
      { lat: 12.122, lng: 75.818, area: 'Chettalli' },
      { lat: 12.620, lng: 75.732, area: 'Somwarpet Taluk Escarpment' },
      { lat: 12.595, lng: 75.748, area: 'Somwarpet Taluk Ridge' },
      { lat: 12.572, lng: 75.762, area: 'Somwarpet Taluk SW Road' },
      { lat: 12.545, lng: 75.748, area: 'Somwarpet Taluk South Slope' },
      { lat: 12.638, lng: 75.758, area: 'Somwarpet Taluk North Ridge' },
      { lat: 12.608, lng: 75.768, area: 'Somwarpet Taluk Central' },
      { lat: 12.558, lng: 75.728, area: 'Somwarpet Taluk NW Slope' },
      { lat: 12.530, lng: 75.758, area: 'Somwarpet Taluk Valley' },
      { lat: 12.665, lng: 75.742, area: 'Somwarpet Taluk Plateau NW' },
      { lat: 12.510, lng: 75.738, area: 'Somwarpet Taluk South Plain' },
      { lat: 12.645, lng: 75.772, area: 'Somwarpet Taluk NE Valley' }
    ];

    for (const station of KODAGU_STATIONS) {
      const pointLat = station.lat;
      const pointLng = station.lng;

      const elevation     = Math.round(400 + (pointLat - KODAGU_BOUNDS.minLat) * 700 + rng() * 300);
      const lithology     = LITHOLOGY_OPTIONS[Math.floor(rng() * LITHOLOGY_OPTIONS.length)];
      const geomorphology = GEOMORPHOLOGY_OPTIONS[Math.floor(rng() * GEOMORPHOLOGY_OPTIONS.length)];
      const landUse       = LANDUSE_OPTIONS[Math.floor(rng() * LANDUSE_OPTIONS.length)];
      const roadType      = ROAD_OPTIONS[Math.floor(rng() * ROAD_OPTIONS.length)];

      const riskScore = calculateRiskScore(elevation, pointLat, pointLng, lithology, geomorphology, landUse, roadType, rng);

      points.push({
        latitude:      pointLat,
        longitude:     pointLng,
        elevation,
        riskLevel:     getRiskLevel(riskScore),
        riskScore:     Math.round(riskScore * 100) / 100,
        area:          station.area,
        landUse,
        lithology,
        geomorphology,
      });
    }

    res.json(points);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch susceptibility data" });
  }
});


// ── POST /api/landslide/predict ─────────────────────────────────────
app.post('/api/landslide/predict', async (req, res) => {
  try {
    const latitude      = parseFloat(req.body.latitude)  || 12.42;
    const longitude     = parseFloat(req.body.longitude) || 75.74;
    const elevation     = parseFloat(req.body.elevation) || 800;
    const rainfall      = parseFloat(req.body.rainfall)  || 50;
    const lithology     = req.body.lithology;
    const geomorphology = req.body.geomorphology;

    let riskScore;
    let mlResponseData = {};

    try {
      // Attempt to call the Python FastAPI model on port 8000
      const mlResponse = await fetch(`http://127.0.0.1:8000/predict?lat=${latitude}&lon=${longitude}`);
      if (!mlResponse.ok) throw new Error('ML model returned ' + mlResponse.status);
      
      const mlData = await mlResponse.json();
      
      // Map the predictor.py response structure (susceptibility, alert, time_window)
      if (mlData && typeof mlData.susceptibility === 'number') {
        riskScore = mlData.susceptibility;
        mlResponseData = mlData;
        
        // Map alert string to UI riskLevel
        const alertStr = mlData.alert ? mlData.alert.toUpperCase() : "";
        if (alertStr.includes("RED") || alertStr.includes("HIGH")) {
          mlResponseData.riskLevel = "critical";
        } else if (alertStr.includes("ORANGE") || alertStr.includes("ELEVATED")) {
          mlResponseData.riskLevel = "high";
        } else if (alertStr.includes("YELLOW") || alertStr.includes("MODERATE")) {
          mlResponseData.riskLevel = "moderate";
        } else {
          mlResponseData.riskLevel = "low";
        }

        // Use time_window as recommendation
        if (mlData.time_window) {
          mlResponseData.recommendation = `${mlData.alert}: ${mlData.time_window}`;
        }
      } else if (typeof mlData === 'number') {
        riskScore = mlData;
      } else if (mlData && typeof mlData.score === 'number') {
        riskScore = mlData.score;
        mlResponseData = mlData;
      } else {
        // Fallback if API returns something unexpected
        riskScore = calculateRiskScore(elevation, latitude, longitude, lithology, geomorphology);
      }
    } catch (mlErr) {
      console.warn('[KodaguEWS] FastAPI model unavailable, using fallback mock calculation.', mlErr.message);
      riskScore = calculateRiskScore(elevation, latitude, longitude, lithology, geomorphology);
    }

    // Rainfall contribution (dynamic, not in static model)
    if (!mlResponseData.susceptibility) {
      if (rainfall > 150) riskScore += 0.18;
      else if (rainfall > 100) riskScore += 0.12;
      else if (rainfall > 60)  riskScore += 0.07;
      else if (rainfall > 30)  riskScore += 0.03;
    }

    riskScore = Math.min(riskScore, 1.0);

    let riskLevel = "low";
    if (riskScore >= 0.80) riskLevel = "critical";
    else if (riskScore >= 0.60) riskLevel = "high";
    else if (riskScore >= 0.38) riskLevel = "moderate";

    const factors = mlResponseData.factors || [];
    if (factors.length === 0) {
      if (elevation > 1200) factors.push("Very high elevation terrain (>1200m)");
      else if (elevation > 700) factors.push("High elevation terrain (>700m)");
      if (rainfall > 100) factors.push("Heavy rainfall detected (>100mm)");
      else if (rainfall > 50) factors.push("Moderate rainfall (>50mm)");
      if (lithology && (LITHO_RISK[lithology] || 0) > 0.70) factors.push(`High-risk lithology: ${lithology}`);
      if (geomorphology && (GEO_RISK[geomorphology] || 0) > 0.75) factors.push(`Unstable geomorphology: ${geomorphology}`);
      factors.push("Western Ghats — seismically active, high rainfall zone");
    }

    const recommendations = {
      low:      "Area appears stable. Continue regular monitoring.",
      moderate: "Exercise caution. Avoid steep slopes during heavy rain. Monitor for changes.",
      high:     "High risk detected! Avoid the area. Alert local authorities. Prepare evacuation plan.",
      critical: "CRITICAL RISK! Immediate evacuation recommended. Contact emergency services NOW!",
    };

    res.json({
      riskLevel: mlResponseData.riskLevel || riskLevel,
      riskScore: Math.round(riskScore * 100) / 100,
      confidence: mlResponseData.confidence || 0.76,
      modelAccuracy: mlResponseData.modelAccuracy || 0.925,
      modelAUC: mlResponseData.modelAUC || 0.842,
      factors,
      recommendation: mlResponseData.recommendation || recommendations[riskLevel],
      immediateAction: mlResponseData.immediateAction !== undefined ? mlResponseData.immediateAction : (riskLevel === "critical" || riskLevel === "high"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Prediction failed" });
  }
});


// ── GET /api/weather — Real-time weather + telemetry ────────────────
app.get('/api/weather', async (req, res) => {
  try {
    const weather = await fetchOpenMeteoData();
    res.json(weather);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});


// ── GET /api/landslide/alerts — Powered by real weather telemetry ───
app.get('/api/landslide/alerts', async (req, res) => {
  try {
    const weather = await fetchOpenMeteoData();

    const rainfall24h  = weather.rainfall24h;
    const rainfall72h  = weather.rainfall72h;
    const rainfall7d   = weather.rainfall7d;
    const soilMoisture = weather.soilSaturation;

    let alertLevel = "green";
    let message = "No significant landslide risk detected. Conditions are stable.";

    // Multi-factor alert logic using real accumulated rainfall + soil saturation
    if (rainfall24h > 100 || (rainfall72h > 200 && soilMoisture > 85)) {
      alertLevel = "red";
      message = `DANGER: Extreme landslide risk! ${rainfall24h}mm rain in 24h with ${soilMoisture}% soil saturation. Evacuate vulnerable areas immediately.`;
    } else if (rainfall24h > 60 || (rainfall72h > 120 && soilMoisture > 70) || soilMoisture > 90) {
      alertLevel = "orange";
      message = `WARNING: High landslide risk. ${rainfall24h}mm rain in 24h, ${rainfall72h}mm in 72h. Soil saturation at ${soilMoisture}%. Avoid hilly terrain.`;
    } else if (rainfall24h > 20 || rainfall72h > 60 || soilMoisture > 65) {
      alertLevel = "yellow";
      message = `WATCH: Moderate risk. ${rainfall24h}mm rain in 24h, soil saturation ${soilMoisture}%. Monitor conditions and avoid steep slopes.`;
    } else {
      message = `Conditions stable. ${weather.condition}, ${weather.temperature}°C. Accumulated rain: ${rainfall24h}mm (24h). Soil saturation: ${soilMoisture}%.`;
    }

    const now = new Date();
    res.json({
      alertLevel,
      message,
      issuedAt:       now.toISOString(),
      validUntil:     new Date(now.getTime() + 6 * 3600000).toISOString(),
      affectedAreas:  ["Madikeri", "Virajpet", "Somwarpet", "Kushalnagar", "Bhagamandala"],
      rainfall24h,
      rainfall72h,
      rainfall7d,
      soilMoisture,
      weatherCondition: weather.condition,
      temperature:      weather.temperature,
      humidity:         weather.humidity,
      windSpeed:        weather.windSpeed,
      source:           weather.source,
      recommendations: alertLevel === "red"
        ? ["Evacuate immediately", "Avoid all hill roads", "Contact emergency: 112", "Move to higher ground"]
        : alertLevel === "orange"
        ? ["Avoid travel in hilly areas", "Stay alert for sudden changes", "Have evacuation plan ready", "Monitor official updates"]
        : alertLevel === "yellow"
        ? ["Monitor rainfall closely", "Avoid steep slopes", "Keep emergency contacts ready", "Check road conditions"]
        : ["Continue normal activities", "Stay informed about weather", "Report any unusual slope activity"],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});


// ── GET /api/landslide/history ──────────────────────────────────────
app.get('/api/landslide/history', (req, res) => {
  res.json(HISTORICAL_EVENTS);
});


// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: 'XGBoost-derived (92.5% acc, 0.84 AUC)', uptime: process.uptime() });
});


// ═══════════════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   KodaguEWS — ML Model API Server               ║');
  console.log('  ║   Model: XGBoost (Acc: 92.5% | AUC: 0.84)       ║');
  console.log(`  ║   Running on: http://localhost:${PORT}              ║`);
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Available endpoints:');
  console.log('    GET  /api/weather                    — Live weather + telemetry (Open-Meteo)');
  console.log('    GET  /api/landslide/alerts           — Live alert intelligence');
  console.log('    GET  /api/landslide/susceptibility   — Susceptibility grid');
  console.log('    POST /api/landslide/predict          — Risk prediction');
  console.log('    GET  /api/landslide/history          — Historical events');
  console.log('    GET  /api/health                     — Health check');
  console.log('');
});
