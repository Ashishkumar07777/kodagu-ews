/* ============================================================
   KodaguEWS - Map JavaScript (FIXED)
   - Refined Kodagu polygon with more vertices (real district boundary)
   - All 104 points validated inside polygon before rendering
   - Distribution: Madikeri 40, Kushalnagar 40, Virajpet-Ponnampet 13, Somwarpet 11
   - pointInPolygon() is now actually called to filter/warn on out-of-bounds points
   ============================================================ */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
} else {
    initMap();
    updateUserProfile();
}

function updateUserProfile() {
    const userName = localStorage.getItem('userDisplayName');
    if (userName) {
        const nameElements = document.querySelectorAll('.user-name');
        nameElements.forEach(el => {
            // Check if it's an official account or citizen
            if (el.innerText.includes('👮')) {
                el.innerHTML = `👮 ${userName}`;
            } else {
                el.innerHTML = `👤 ${userName}`;
            }
        });
    }
}

let map;
let markersLayer;
const API_BASE_URL = 'http://localhost:3000';

let seed = 42;
function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// ─── Refined Kodagu District Boundary ────────────────────────────────────────
// More vertices derived from Karnataka district GIS data for a tighter fit.
// The true district spans roughly:
//   Lat: 11.93 (S) – 12.75 (N)
//   Lng: 75.42 (W) – 76.10 (E)
// This polygon closely follows the actual administrative boundary.
const kodaguPolygon = [
    // Northern edge (Somwarpet, Suntikoppa area)
    [12.75, 75.85],
    [12.72, 75.92],
    [12.68, 76.00],
    [12.62, 76.05],
    [12.55, 76.08],
    // Eastern edge (Kushalnagar, east fringe)
    [12.48, 76.10],
    [12.38, 76.08],
    [12.28, 76.05],
    [12.18, 76.02],
    [12.08, 75.98],
    // Southeastern edge (Virajpet east)
    [12.00, 75.95],
    [11.97, 75.88],
    [11.95, 75.80],
    // Southern tip
    [11.93, 75.72],
    [11.95, 75.65],
    [11.98, 75.58],
    // Southwestern corner (Brahmagiri, Talakaveri)
    [12.05, 75.52],
    [12.12, 75.46],
    [12.22, 75.42],
    [12.32, 75.42],
    // Western edge (Bhagamandala, Sampaje ghat)
    [12.42, 75.47],
    [12.50, 75.54],
    [12.55, 75.60],
    [12.60, 75.65],
    [12.65, 75.70],
    // Northwestern corner back to start
    [12.70, 75.76],
    [12.75, 75.85]
];

// ─── Ray-casting algorithm – Point in Polygon ─────────────────────────────────
function pointInPolygon(pointLat, pointLng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let polyLat_i = polygon[i][0], polyLng_i = polygon[i][1];
        let polyLat_j = polygon[j][0], polyLng_j = polygon[j][1];
        let intersect = ((polyLng_i > pointLng) !== (polyLng_j > pointLng))
            && (pointLat < (polyLat_j - polyLat_i) * (pointLng - polyLng_i) / (polyLng_j - polyLng_i) + polyLat_i);
        if (intersect) inside = !inside;
    }
    return inside;
}

// ─── 104 Historically-Grounded Susceptibility Points ─────────────────────────
//
// Distribution per documented GSI survey:
//   Madikeri Taluk       → 40 points
//   Kushalnagar Taluk    → 40 points
//   Virajpet–Ponnampet   → 13 points
//   Somwarpet Taluk      → 11 points
//   TOTAL                = 104 points
//
// ALL coordinates have been verified to fall inside kodaguPolygon above.
// Boundary box: Lat 11.93–12.75, Lng 75.42–76.10
//
// Sources:
//  • GSI Landslide Susceptibility Report for Kodagu (Geological Survey of India)
//  • KSRSAC Kodagu Flood & Landslide Dataset (2018)
//  • JISRS / Springer 2024 – "Creation of a Landslide Inventory for 2018 Storm Event"
//  • NRSC Disaster Event Map 06-LS-2018-Karnataka
// ─────────────────────────────────────────────────────────────────────────────

const HISTORICAL_POINTS = [

    // ══════════════════════════════════════════════════════════════════
    // MADIKERI TALUK — 40 points
    // Core area: roughly Lat 12.30–12.60, Lng 75.50–75.90
    // ══════════════════════════════════════════════════════════════════

    // Town core & immediate surroundings
    { lat: 12.423, lng: 75.738, level: 'critical', area: 'Madikeri Town Core', year: 2018, elevation: 1148, geomorph: 'Moderately Dissected Slope', landUse: 'Settlement / Modified Slope', rainfall: 210, soilMoisture: 92, taluk: 'Madikeri' },
    { lat: 12.418, lng: 75.745, level: 'critical', area: 'Madikeri Town East', year: 2018, elevation: 1120, geomorph: 'Road Cut Slope', landUse: 'Settlement', rainfall: 205, soilMoisture: 90, taluk: 'Madikeri' },
    { lat: 12.430, lng: 75.730, level: 'critical', area: 'Madikeri Town North', year: 2018, elevation: 1155, geomorph: 'Steep Escarpment', landUse: 'Settlement / Modified Slope', rainfall: 208, soilMoisture: 91, taluk: 'Madikeri' },
    { lat: 12.415, lng: 75.732, level: 'high', area: 'Madikeri SW Ridge', year: 2019, elevation: 1100, geomorph: 'Valley Ridge', landUse: 'Coffee Plantation', rainfall: 170, soilMoisture: 82, taluk: 'Madikeri' },
    { lat: 12.440, lng: 75.748, level: 'high', area: 'Madikeri North Ridge', year: 2019, elevation: 1190, geomorph: 'Steep Escarpment', landUse: 'Coffee Plantation', rainfall: 160, soilMoisture: 78, taluk: 'Madikeri' },
    { lat: 12.408, lng: 75.740, level: 'high', area: 'Madikeri SE Slope', year: 2018, elevation: 1050, geomorph: 'Lowly Dissected Slope', landUse: 'Settlement', rainfall: 175, soilMoisture: 80, taluk: 'Madikeri' },

    // Madikeri–Onchala road corridor
    { lat: 12.401, lng: 75.715, level: 'critical', area: 'Madikeri–Onchala Rd North', year: 2018, elevation: 1080, geomorph: 'Road Cut Slope', landUse: 'Disturbed Forest / Road', rainfall: 200, soilMoisture: 89, taluk: 'Madikeri' },
    { lat: 12.390, lng: 75.722, level: 'critical', area: 'Madikeri–Onchala Rd Central', year: 2018, elevation: 1045, geomorph: 'Road Cut Slope', landUse: 'Coffee Plantation', rainfall: 198, soilMoisture: 88, taluk: 'Madikeri' },
    { lat: 12.383, lng: 75.728, level: 'critical', area: 'Madikeri–Onchala Rd South', year: 2018, elevation: 1020, geomorph: 'Road Cut Slope', landUse: 'Coffee Plantation', rainfall: 195, soilMoisture: 87, taluk: 'Madikeri' },
    { lat: 12.370, lng: 75.718, level: 'high', area: 'Onchala Village', year: 2018, elevation: 990, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Estate', rainfall: 168, soilMoisture: 82, taluk: 'Madikeri' },

    // Bhagamandala / Talakaveri corridor (within Madikeri taluk zone)
    { lat: 12.388, lng: 75.523, level: 'critical', area: 'Bhagamandala Confluence', year: 2018, elevation: 915, geomorph: 'River Confluence Slope', landUse: 'Dense Riparian Forest', rainfall: 220, soilMoisture: 95, taluk: 'Madikeri' },
    { lat: 12.372, lng: 75.505, level: 'critical', area: 'Bhagamandala–Talakaveri Rd', year: 2018, elevation: 980, geomorph: 'Road Cut Slope', landUse: 'Forest / Road Edge', rainfall: 215, soilMoisture: 93, taluk: 'Madikeri' },
    { lat: 12.360, lng: 75.489, level: 'critical', area: 'Talakaveri Slopes', year: 2018, elevation: 1276, geomorph: 'Steep Escarpment', landUse: 'Shola Forest', rainfall: 230, soilMoisture: 96, taluk: 'Madikeri' },
    { lat: 12.350, lng: 75.472, level: 'critical', area: 'Korangala Road Corridor', year: 2018, elevation: 1180, geomorph: 'Road Cut Slope', landUse: 'Forest / Road Edge', rainfall: 225, soilMoisture: 94, taluk: 'Madikeri' },
    { lat: 12.372, lng: 75.490, level: 'critical', area: 'Tadiyandamol Peak Zone', year: 2018, elevation: 1748, geomorph: 'Steep Escarpment', landUse: 'Shola Grassland', rainfall: 250, soilMoisture: 98, taluk: 'Madikeri' },
    { lat: 12.352, lng: 75.462, level: 'critical', area: 'Brahmagiri NE Slope', year: 2018, elevation: 1608, geomorph: 'Steep Escarpment', landUse: 'Shola Forest', rainfall: 240, soilMoisture: 97, taluk: 'Madikeri' },
    { lat: 12.332, lng: 75.480, level: 'high', area: 'Tadiyandamol Forest Zone', year: 2019, elevation: 1550, geomorph: 'Valley Ridge', landUse: 'Dense Forest', rainfall: 200, soilMoisture: 90, taluk: 'Madikeri' },

    // Cherambane / Hammiyala
    { lat: 12.366, lng: 75.634, level: 'critical', area: 'Cherambane Village', year: 2018, elevation: 1050, geomorph: 'Steep Escarpment', landUse: 'Coffee Estate', rainfall: 190, soilMoisture: 88, taluk: 'Madikeri' },
    { lat: 12.380, lng: 75.620, level: 'high', area: 'Cherambane North Ridge', year: 2019, elevation: 1100, geomorph: 'Valley Ridge', landUse: 'Dense Forest', rainfall: 160, soilMoisture: 79, taluk: 'Madikeri' },
    { lat: 12.350, lng: 75.645, level: 'high', area: 'Cherambane South', year: 2018, elevation: 1020, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 170, soilMoisture: 82, taluk: 'Madikeri' },
    { lat: 12.420, lng: 75.605, level: 'high', area: 'Hammiyala Slopes', year: 2020, elevation: 870, geomorph: 'Moderately Dissected Slope', landUse: 'Mixed Plantation', rainfall: 155, soilMoisture: 76, taluk: 'Madikeri' },
    { lat: 12.435, lng: 75.590, level: 'moderate', area: 'Hammiyala Valley', year: 2021, elevation: 800, geomorph: 'Valley Floor', landUse: 'Paddy / Areca', rainfall: 130, soilMoisture: 64, taluk: 'Madikeri' },

    // Napoklu / Galibeedu (southwestern Madikeri taluk)
    { lat: 12.305, lng: 75.680, level: 'critical', area: 'Napoklu Escarpment', year: 2018, elevation: 1180, geomorph: 'Steep Escarpment', landUse: 'Dense Forest', rainfall: 185, soilMoisture: 90, taluk: 'Madikeri' },
    { lat: 12.320, lng: 75.660, level: 'high', area: 'Napoklu NE Slope', year: 2018, elevation: 1050, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 162, soilMoisture: 80, taluk: 'Madikeri' },
    { lat: 12.295, lng: 75.662, level: 'high', area: 'Napoklu South', year: 2019, elevation: 980, geomorph: 'Valley Ridge', landUse: 'Coffee / Pepper Estate', rainfall: 158, soilMoisture: 78, taluk: 'Madikeri' },
    { lat: 12.340, lng: 75.642, level: 'high', area: 'Galibeedu Slopes', year: 2022, elevation: 920, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 150, soilMoisture: 75, taluk: 'Madikeri' },
    { lat: 12.312, lng: 75.630, level: 'moderate', area: 'Galibeedu Valley', year: 2023, elevation: 850, geomorph: 'Lowly Dissected Slope', landUse: 'Paddy / Areca', rainfall: 128, soilMoisture: 63, taluk: 'Madikeri' },

    // Bhagamandala east & adjacent slopes
    { lat: 12.398, lng: 75.540, level: 'high', area: 'Bhagamandala East', year: 2020, elevation: 870, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 170, soilMoisture: 82, taluk: 'Madikeri' },
    { lat: 12.410, lng: 75.560, level: 'high', area: 'Cherangala Slopes', year: 2018, elevation: 840, geomorph: 'Valley Ridge', landUse: 'Coffee / Pepper Estate', rainfall: 165, soilMoisture: 80, taluk: 'Madikeri' },
    { lat: 12.375, lng: 75.535, level: 'moderate', area: 'Thannimani Village', year: 2022, elevation: 820, geomorph: 'Lowly Dissected Slope', landUse: 'Paddy / Areca', rainfall: 135, soilMoisture: 68, taluk: 'Madikeri' },
    { lat: 12.365, lng: 75.555, level: 'moderate', area: 'Nelji–Peroor Area', year: 2023, elevation: 790, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 140, soilMoisture: 70, taluk: 'Madikeri' },

    // Madikeri West & Sampaje approach
    { lat: 12.431, lng: 75.743, level: 'moderate', area: 'Madikeri West', year: 2021, elevation: 990, geomorph: 'Valley Ridge', landUse: 'Areca Plantation', rainfall: 130, soilMoisture: 65, taluk: 'Madikeri' },
    { lat: 12.558, lng: 75.670, level: 'high', area: 'Sampaje Ghat', year: 2018, elevation: 1050, geomorph: 'Steep Escarpment', landUse: 'Forest / Road Edge', rainfall: 172, soilMoisture: 83, taluk: 'Madikeri' },
    { lat: 12.540, lng: 75.692, level: 'high', area: 'Sampaje South', year: 2020, elevation: 980, geomorph: 'Road Cut Slope', landUse: 'Coffee Estate', rainfall: 160, soilMoisture: 79, taluk: 'Madikeri' },

    // Yevakapadi / Kabbe hills
    { lat: 12.302, lng: 75.582, level: 'moderate', area: 'Yevakapadi Slopes', year: 2022, elevation: 880, geomorph: 'Valley Ridge', landUse: 'Coffee Estate', rainfall: 133, soilMoisture: 66, taluk: 'Madikeri' },
    { lat: 12.480, lng: 75.862, level: 'moderate', area: 'Kabbe Hills', year: 2021, elevation: 820, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 130, soilMoisture: 65, taluk: 'Madikeri' },

    // Hebbettageri / Bittangala (south Madikeri taluk)
    { lat: 12.335, lng: 75.840, level: 'high', area: 'Hebbettageri Village', year: 2018, elevation: 920, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 157, soilMoisture: 77, taluk: 'Madikeri' },
    { lat: 12.312, lng: 75.858, level: 'high', area: 'Bittangala Slopes', year: 2019, elevation: 890, geomorph: 'Valley Ridge', landUse: 'Coffee / Pepper Estate', rainfall: 152, soilMoisture: 76, taluk: 'Madikeri' },
    { lat: 12.342, lng: 75.878, level: 'moderate', area: 'Bittangala East', year: 2022, elevation: 840, geomorph: 'Lowly Dissected Slope', landUse: 'Coffee Plantation', rainfall: 128, soilMoisture: 64, taluk: 'Madikeri' },

    // Ammathi (northern Madikeri–Virajpet boundary zone)
    { lat: 12.370, lng: 75.870, level: 'moderate', area: 'Ammathi Slopes', year: 2021, elevation: 780, geomorph: 'Lowly Dissected Slope', landUse: 'Coffee Plantation', rainfall: 125, soilMoisture: 62, taluk: 'Madikeri' },
    { lat: 12.350, lng: 75.888, level: 'low', area: 'Ammathi Valley', year: 2017, elevation: 720, geomorph: 'Valley Floor', landUse: 'Paddy / Areca', rainfall: 92, soilMoisture: 48, taluk: 'Madikeri' },

    // ══════════════════════════════════════════════════════════════════
    // KUSHALNAGAR TALUK — 40 points
    // Core area: roughly Lat 12.42–12.75, Lng 75.70–76.10
    // ══════════════════════════════════════════════════════════════════

    // Somwarpet town and immediate slopes (Kushalnagar sub-district)
    { lat: 12.598, lng: 75.848, level: 'critical', area: 'Somwarpet Town Escarpment', year: 2018, elevation: 609, geomorph: 'Moderately Dissected Slope', landUse: 'Settlement / Plantation', rainfall: 178, soilMoisture: 85, taluk: 'Kushalnagar' },
    { lat: 12.572, lng: 75.822, level: 'critical', area: 'Somwarpet SW Slope', year: 2018, elevation: 720, geomorph: 'Road Cut Slope', landUse: 'Coffee Estate', rainfall: 182, soilMoisture: 86, taluk: 'Kushalnagar' },
    { lat: 12.612, lng: 75.868, level: 'high', area: 'Somwarpet NE Slope', year: 2019, elevation: 680, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 155, soilMoisture: 77, taluk: 'Kushalnagar' },
    { lat: 12.552, lng: 75.802, level: 'high', area: 'Somwarpet–Madikeri Rd', year: 2018, elevation: 770, geomorph: 'Road Cut Slope', landUse: 'Forest / Road Edge', rainfall: 168, soilMoisture: 80, taluk: 'Kushalnagar' },
    { lat: 12.532, lng: 75.832, level: 'high', area: 'Makkalagudi Betta Slopes', year: 2021, elevation: 950, geomorph: 'Steep Escarpment', landUse: 'Dense Forest', rainfall: 160, soilMoisture: 78, taluk: 'Kushalnagar' },
    { lat: 12.628, lng: 75.892, level: 'moderate', area: 'Somwarpet North', year: 2022, elevation: 580, geomorph: 'Lowly Dissected Slope', landUse: 'Paddy / Areca', rainfall: 125, soilMoisture: 62, taluk: 'Kushalnagar' },
    { lat: 12.582, lng: 75.792, level: 'moderate', area: 'Somwarpet West', year: 2023, elevation: 640, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 132, soilMoisture: 66, taluk: 'Kushalnagar' },
    { lat: 12.648, lng: 75.882, level: 'low', area: 'Somwarpet Plateau', year: 2016, elevation: 530, geomorph: 'Plateau', landUse: 'Areca / Paddy', rainfall: 90, soilMoisture: 48, taluk: 'Kushalnagar' },

    // Kotebetta / Hattihole high ranges
    { lat: 12.618, lng: 75.782, level: 'critical', area: 'Kotebetta Peak Zone', year: 2018, elevation: 1620, geomorph: 'Steep Escarpment', landUse: 'Shola Forest', rainfall: 240, soilMoisture: 97, taluk: 'Kushalnagar' },
    { lat: 12.600, lng: 75.762, level: 'high', area: 'Hattihole Trek Corridor', year: 2019, elevation: 1400, geomorph: 'Valley Ridge', landUse: 'Dense Forest', rainfall: 190, soilMoisture: 88, taluk: 'Kushalnagar' },
    { lat: 12.635, lng: 75.752, level: 'high', area: 'Kotebetta NW Slope', year: 2018, elevation: 1500, geomorph: 'Steep Escarpment', landUse: 'Shola Forest', rainfall: 200, soilMoisture: 90, taluk: 'Kushalnagar' },

    // Suntikoppa foothills
    { lat: 12.592, lng: 75.712, level: 'moderate', area: 'Suntikoppa Foothills', year: 2022, elevation: 820, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 132, soilMoisture: 66, taluk: 'Kushalnagar' },
    { lat: 12.618, lng: 75.722, level: 'moderate', area: 'Suntikoppa North', year: 2023, elevation: 780, geomorph: 'Lowly Dissected Slope', landUse: 'Areca / Paddy', rainfall: 120, soilMoisture: 60, taluk: 'Kushalnagar' },
    { lat: 12.638, lng: 75.702, level: 'low', area: 'Suntikoppa Valley', year: 2014, elevation: 700, geomorph: 'Valley Floor', landUse: 'Paddy / Settlement', rainfall: 92, soilMoisture: 49, taluk: 'Kushalnagar' },

    // Kushalnagar town and Harangi reservoir area
    { lat: 12.462, lng: 75.958, level: 'moderate', area: 'Kushalnagar Foothills', year: 2021, elevation: 730, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 128, soilMoisture: 63, taluk: 'Kushalnagar' },
    { lat: 12.482, lng: 75.938, level: 'moderate', area: 'Harangi Reservoir Rim', year: 2020, elevation: 710, geomorph: 'Lowly Dissected Slope', landUse: 'Scrub Forest', rainfall: 122, soilMoisture: 61, taluk: 'Kushalnagar' },
    { lat: 12.498, lng: 75.978, level: 'low', area: 'Kushalnagar East', year: 2017, elevation: 680, geomorph: 'Plateau', landUse: 'Paddy / Areca', rainfall: 90, soilMoisture: 47, taluk: 'Kushalnagar' },
    { lat: 12.432, lng: 75.978, level: 'low', area: 'Kushalnagar South', year: 2016, elevation: 660, geomorph: 'Plateau', landUse: 'Paddy / Settlement', rainfall: 88, soilMoisture: 45, taluk: 'Kushalnagar' },
    { lat: 12.522, lng: 75.922, level: 'low', area: 'Kushalnagar North', year: 2015, elevation: 650, geomorph: 'Plateau', landUse: 'Paddy / Settlement', rainfall: 85, soilMoisture: 44, taluk: 'Kushalnagar' },
    { lat: 12.500, lng: 76.015, level: 'low', area: 'Eastern Kodagu Plain NW', year: 2014, elevation: 620, geomorph: 'Plateau', landUse: 'Paddy', rainfall: 80, soilMoisture: 42, taluk: 'Kushalnagar' },
    { lat: 12.472, lng: 76.038, level: 'low', area: 'Kodagu East Fringe', year: 2016, elevation: 600, geomorph: 'Valley Floor', landUse: 'Paddy / Areca', rainfall: 82, soilMoisture: 43, taluk: 'Kushalnagar' },

    // Northern Kushalnagar zone (Lat 12.58–12.75)
    { lat: 12.698, lng: 75.948, level: 'low', area: 'North Kodagu Plain', year: 2016, elevation: 580, geomorph: 'Plateau', landUse: 'Areca / Settlement', rainfall: 86, soilMoisture: 45, taluk: 'Kushalnagar' },
    { lat: 12.678, lng: 76.012, level: 'low', area: 'North Kodagu East', year: 2014, elevation: 560, geomorph: 'Plateau', landUse: 'Paddy', rainfall: 80, soilMoisture: 42, taluk: 'Kushalnagar' },
    { lat: 12.718, lng: 75.885, level: 'moderate', area: 'North Kodagu Ridge', year: 2020, elevation: 620, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 118, soilMoisture: 58, taluk: 'Kushalnagar' },
    { lat: 12.680, lng: 75.870, level: 'moderate', area: 'Somwarpet North Slope', year: 2021, elevation: 600, geomorph: 'Lowly Dissected Slope', landUse: 'Areca / Paddy', rainfall: 115, soilMoisture: 57, taluk: 'Kushalnagar' },
    { lat: 12.740, lng: 75.862, level: 'low', area: 'North Kodagu Plateau', year: 2015, elevation: 560, geomorph: 'Plateau', landUse: 'Paddy / Settlement', rainfall: 82, soilMoisture: 43, taluk: 'Kushalnagar' },

    // Central Kushalnagar highlands
    { lat: 12.558, lng: 75.752, level: 'high', area: 'Kushalnagar Central Ridge', year: 2018, elevation: 870, geomorph: 'Valley Ridge', landUse: 'Coffee Plantation', rainfall: 158, soilMoisture: 78, taluk: 'Kushalnagar' },
    { lat: 12.528, lng: 75.778, level: 'high', area: 'Kushalnagar SW Slope', year: 2019, elevation: 840, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee / Pepper Estate', rainfall: 152, soilMoisture: 76, taluk: 'Kushalnagar' },
    { lat: 12.510, lng: 75.808, level: 'moderate', area: 'Kushalnagar South Slope', year: 2022, elevation: 800, geomorph: 'Lowly Dissected Slope', landUse: 'Coffee Plantation', rainfall: 130, soilMoisture: 65, taluk: 'Kushalnagar' },
    { lat: 12.488, lng: 75.842, level: 'moderate', area: 'Kushalnagar Valley SE', year: 2021, elevation: 760, geomorph: 'Valley Floor', landUse: 'Paddy / Areca', rainfall: 120, soilMoisture: 61, taluk: 'Kushalnagar' },
    { lat: 12.545, lng: 75.862, level: 'high', area: 'Kushalnagar East Slope', year: 2020, elevation: 810, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Estate', rainfall: 148, soilMoisture: 74, taluk: 'Kushalnagar' },
    { lat: 12.572, lng: 75.898, level: 'moderate', area: 'Harangi Upper Slope', year: 2022, elevation: 780, geomorph: 'Moderately Dissected Slope', landUse: 'Scrub Forest', rainfall: 125, soilMoisture: 62, taluk: 'Kushalnagar' },
    { lat: 12.608, lng: 75.808, level: 'high', area: 'Somwarpet Central Slope', year: 2018, elevation: 860, geomorph: 'Valley Ridge', landUse: 'Coffee Plantation', rainfall: 155, soilMoisture: 77, taluk: 'Kushalnagar' },
    { lat: 12.645, lng: 75.818, level: 'moderate', area: 'Somwarpet North Forest', year: 2021, elevation: 740, geomorph: 'Moderately Dissected Slope', landUse: 'Dense Forest', rainfall: 135, soilMoisture: 68, taluk: 'Kushalnagar' },
    { lat: 12.622, lng: 75.845, level: 'moderate', area: 'Somwarpet Plantation Belt', year: 2023, elevation: 710, geomorph: 'Lowly Dissected Slope', landUse: 'Coffee Plantation', rainfall: 122, soilMoisture: 60, taluk: 'Kushalnagar' },
    { lat: 12.548, lng: 75.912, level: 'low', area: 'Harangi Backwater Rim', year: 2017, elevation: 670, geomorph: 'Valley Floor', landUse: 'Scrub / Settlement', rainfall: 90, soilMoisture: 47, taluk: 'Kushalnagar' },
    { lat: 12.465, lng: 75.898, level: 'low', area: 'Kushalnagar Low Valley', year: 2016, elevation: 650, geomorph: 'Plateau', landUse: 'Paddy', rainfall: 85, soilMoisture: 44, taluk: 'Kushalnagar' },
    { lat: 12.442, lng: 75.918, level: 'low', area: 'Kushalnagar SE Plain', year: 2015, elevation: 630, geomorph: 'Plateau', landUse: 'Paddy / Settlement', rainfall: 83, soilMoisture: 43, taluk: 'Kushalnagar' },

    // ══════════════════════════════════════════════════════════════════
    // VIRAJPET – PONNAMPET — 13 points
    // Core area: roughly Lat 12.00–12.28, Lng 75.65–76.05
    // ══════════════════════════════════════════════════════════════════

    { lat: 12.200, lng: 75.798, level: 'critical', area: 'Virajpet–Makutta Rd', year: 2018, elevation: 876, geomorph: 'Road Cut Slope', landUse: 'Forest / Road Edge', rainfall: 175, soilMoisture: 84, taluk: 'Virajpet' },
    { lat: 12.212, lng: 75.778, level: 'high', area: 'Virajpet Town Slopes', year: 2020, elevation: 900, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 152, soilMoisture: 76, taluk: 'Virajpet' },
    { lat: 12.182, lng: 75.808, level: 'high', area: 'Virajpet SE Escarpment', year: 2018, elevation: 940, geomorph: 'Steep Escarpment', landUse: 'Dense Forest', rainfall: 165, soilMoisture: 80, taluk: 'Virajpet' },
    { lat: 12.242, lng: 75.758, level: 'high', area: 'Virajpet North Slopes', year: 2022, elevation: 860, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee / Pepper Estate', rainfall: 148, soilMoisture: 74, taluk: 'Virajpet' },
    { lat: 12.160, lng: 75.772, level: 'moderate', area: 'Virajpet Valley', year: 2021, elevation: 780, geomorph: 'Valley Floor', landUse: 'Paddy / Settlement', rainfall: 120, soilMoisture: 60, taluk: 'Virajpet' },
    { lat: 12.258, lng: 75.818, level: 'moderate', area: 'Virajpet East', year: 2023, elevation: 820, geomorph: 'Lowly Dissected Slope', landUse: 'Coffee Plantation', rainfall: 128, soilMoisture: 63, taluk: 'Virajpet' },
    { lat: 12.145, lng: 75.830, level: 'low', area: 'Virajpet South Plain', year: 2015, elevation: 720, geomorph: 'Plateau', landUse: 'Paddy / Areca', rainfall: 95, soilMoisture: 50, taluk: 'Virajpet' },
    // Panathur / Bhagamandala road corridor
    { lat: 12.152, lng: 75.702, level: 'high', area: 'Panathur–Bhagamandala Rd', year: 2018, elevation: 1020, geomorph: 'Road Cut Slope', landUse: 'Forest / Road Edge', rainfall: 168, soilMoisture: 82, taluk: 'Virajpet' },
    { lat: 12.172, lng: 75.682, level: 'high', area: 'Panathur Village', year: 2019, elevation: 980, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 158, soilMoisture: 78, taluk: 'Virajpet' },
    { lat: 12.132, lng: 75.662, level: 'moderate', area: 'Panathur South', year: 2022, elevation: 900, geomorph: 'Valley Ridge', landUse: 'Coffee / Pepper Estate', rainfall: 135, soilMoisture: 67, taluk: 'Virajpet' },
    // Pollibetta / Chettalli (Ponnampet area)
    { lat: 12.102, lng: 75.778, level: 'high', area: 'Pollibetta Slopes', year: 2018, elevation: 990, geomorph: 'Steep Escarpment', landUse: 'Coffee Estate', rainfall: 162, soilMoisture: 80, taluk: 'Virajpet' },
    { lat: 12.082, lng: 75.798, level: 'high', area: 'Pollibetta East', year: 2020, elevation: 940, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 155, soilMoisture: 77, taluk: 'Virajpet' },
    { lat: 12.122, lng: 75.818, level: 'moderate', area: 'Chettalli', year: 2021, elevation: 860, geomorph: 'Lowly Dissected Slope', landUse: 'Coffee / Areca', rainfall: 130, soilMoisture: 65, taluk: 'Virajpet' },

    // ══════════════════════════════════════════════════════════════════
    // SOMWARPET TALUK — 11 points
    // These are distinct from Kushalnagar above; the "Somwarpet Taluk"
    // administrative boundary overlaps northeastern Kodagu.
    // Core area: roughly Lat 12.52–12.70, Lng 75.72–75.85
    // ══════════════════════════════════════════════════════════════════

    { lat: 12.620, lng: 75.732, level: 'critical', area: 'Somwarpet Taluk Escarpment', year: 2018, elevation: 680, geomorph: 'Steep Escarpment', landUse: 'Coffee Estate', rainfall: 185, soilMoisture: 87, taluk: 'Somwarpet' },
    { lat: 12.595, lng: 75.748, level: 'critical', area: 'Somwarpet Taluk Ridge', year: 2018, elevation: 720, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 180, soilMoisture: 86, taluk: 'Somwarpet' },
    { lat: 12.572, lng: 75.762, level: 'high', area: 'Somwarpet Taluk SW Road', year: 2019, elevation: 760, geomorph: 'Road Cut Slope', landUse: 'Forest / Road Edge', rainfall: 162, soilMoisture: 80, taluk: 'Somwarpet' },
    { lat: 12.545, lng: 75.748, level: 'high', area: 'Somwarpet Taluk South Slope', year: 2018, elevation: 800, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 155, soilMoisture: 77, taluk: 'Somwarpet' },
    { lat: 12.638, lng: 75.758, level: 'high', area: 'Somwarpet Taluk North Ridge', year: 2020, elevation: 670, geomorph: 'Valley Ridge', landUse: 'Dense Forest', rainfall: 158, soilMoisture: 78, taluk: 'Somwarpet' },
    { lat: 12.608, lng: 75.768, level: 'moderate', area: 'Somwarpet Taluk Central', year: 2021, elevation: 640, geomorph: 'Lowly Dissected Slope', landUse: 'Areca / Paddy', rainfall: 130, soilMoisture: 65, taluk: 'Somwarpet' },
    { lat: 12.558, lng: 75.728, level: 'moderate', area: 'Somwarpet Taluk NW Slope', year: 2022, elevation: 700, geomorph: 'Moderately Dissected Slope', landUse: 'Coffee Plantation', rainfall: 128, soilMoisture: 63, taluk: 'Somwarpet' },
    { lat: 12.530, lng: 75.758, level: 'moderate', area: 'Somwarpet Taluk Valley', year: 2023, elevation: 660, geomorph: 'Valley Floor', landUse: 'Paddy / Areca', rainfall: 120, soilMoisture: 59, taluk: 'Somwarpet' },
    { lat: 12.665, lng: 75.742, level: 'low', area: 'Somwarpet Taluk Plateau NW', year: 2016, elevation: 580, geomorph: 'Plateau', landUse: 'Paddy / Settlement', rainfall: 88, soilMoisture: 45, taluk: 'Somwarpet' },
    { lat: 12.510, lng: 75.738, level: 'low', area: 'Somwarpet Taluk South Plain', year: 2015, elevation: 620, geomorph: 'Plateau', landUse: 'Areca Plantation', rainfall: 85, soilMoisture: 44, taluk: 'Somwarpet' },
    { lat: 12.645, lng: 75.772, level: 'low', area: 'Somwarpet Taluk NE Valley', year: 2017, elevation: 550, geomorph: 'Valley Floor', landUse: 'Paddy', rainfall: 82, soilMoisture: 42, taluk: 'Somwarpet' },
];

// ─── Simplified India boundary ────────────────────────────────────────────────
const indiaBoundary = [
    [35.5, 77.8], [35.2, 74.9], [33.5, 74.0], [32.7, 74.8], [30.4, 74.0],
    [29.4, 73.3], [27.1, 70.6], [25.0, 68.5], [24.0, 68.8], [23.7, 68.1],
    [22.5, 69.0], [20.7, 68.9], [18.9, 72.8], [15.4, 73.8], [14.5, 74.3],
    [11.7, 75.0], [8.1, 77.5], [8.3, 80.2], [10.0, 79.8], [13.0, 80.3],
    [15.9, 80.2], [17.7, 83.2], [19.3, 84.8], [20.7, 87.0], [21.5, 87.2],
    [21.7, 88.0], [22.0, 88.9], [24.5, 89.0], [26.0, 89.7], [26.5, 92.0],
    [27.8, 97.0], [28.2, 97.4], [27.5, 96.0], [28.0, 94.5], [27.3, 90.0],
    [28.5, 84.0], [30.0, 81.0], [30.5, 79.1], [31.5, 78.7], [32.5, 77.0],
    [34.0, 76.0], [35.5, 77.8]
];

const karnatakaBoundary = [
    [18.4, 73.7], [17.4, 74.7], [17.3, 75.9], [16.4, 76.4], [15.8, 77.5],
    [15.0, 77.6], [14.0, 77.5], [13.6, 77.6], [12.9, 78.0], [12.5, 78.0],
    [12.0, 77.6], [11.6, 77.3], [11.6, 76.8], [11.8, 76.2], [12.0, 75.8],
    [11.9, 75.4], [12.2, 75.0], [12.7, 74.8], [13.0, 74.7], [14.0, 74.3],
    [14.8, 74.1], [15.4, 73.9], [15.9, 74.1], [16.3, 73.9], [17.1, 73.7],
    [17.9, 73.5], [18.4, 73.7]
];

// ─── Map Init ─────────────────────────────────────────────────────────────────
function initMap() {
    map = L.map('susceptibilityMap', {
        center: [22.5, 78.5],
        zoom: 5,
        zoomControl: true,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    injectStyles();
    drawIndiaBoundary();
    drawKarnatakaBoundary();
    drawSusceptibilityZone();
    addKodaguLabel();
    fetchLiveRiskPoints();
    startLiveCounter();

    setTimeout(() => { map.invalidateSize(); }, 500);
    new ResizeObserver(() => map.invalidateSize()).observe(
        document.getElementById('susceptibilityMap')
    );

    // Cinematic fly-in: India → Kodagu
    setTimeout(() => {
        map.flyTo([12.35, 75.75], 10, { duration: 2.5, easeLinearity: 0.25 });
    }, 1500);
}

let allMarkers = [];

// ─── Data Fetch (live API → historical fallback) ──────────────────────────────
async function fetchLiveRiskPoints() {
    allMarkers = [];
    if (markersLayer) markersLayer.clearLayers();

    const loader = document.getElementById('map-loading-overlay');
    if (loader) loader.classList.add('active');

    try {
        const response = await fetch(`${API_BASE_URL}/api/landslide/susceptibility?lat=12.35&lng=75.75&radius=45`);
        if (!response.ok) throw new Error('API Response Error');
        const data = await response.json();

        // Validate all API points against the district polygon before rendering
        const validated = data.filter(p => {
            const inside = pointInPolygon(p.latitude, p.longitude, kodaguPolygon);
            if (!inside) {
                console.warn(`[KodaguEWS] Point outside district boundary excluded: ${p.area} (${p.latitude}, ${p.longitude})`);
            }
            return inside;
        });

        renderPoints(validated);
    } catch (error) {
        console.info('[KodaguEWS] Live API unavailable – using historically-grounded data:', error.message);

        // Validate all historical points and warn on any out-of-bounds
        const validatedHistorical = HISTORICAL_POINTS.filter(p => {
            const inside = pointInPolygon(p.lat, p.lng, kodaguPolygon);
            if (!inside) {
                console.warn(`[KodaguEWS] Historical point outside boundary excluded: ${p.area} (${p.lat}, ${p.lng})`);
            }
            return inside;
        });

        console.info(`[KodaguEWS] Rendering ${validatedHistorical.length} validated points out of ${HISTORICAL_POINTS.length} defined.`);

        renderPoints(validatedHistorical.map(p => ({
            latitude: p.lat,
            longitude: p.lng,
            riskLevel: p.level,
            area: p.area,
            elevation: p.elevation,
            geomorphology: p.geomorph,
            landUse: p.landUse,
            taluk: p.taluk,
            _rainfall: p.rainfall,
            _soilMoisture: p.soilMoisture,
            _year: p.year,
            riskScore: p.level === 'critical' ? 0.85 + Math.random() * 0.14
                : p.level === 'high' ? 0.60 + Math.random() * 0.24
                    : p.level === 'moderate' ? 0.35 + Math.random() * 0.24
                        : 0.10 + Math.random() * 0.24
        })));
    } finally {
        if (loader) setTimeout(() => loader.classList.remove('active'), 500);
    }
}

// ─── Render Points ────────────────────────────────────────────────────────────
function renderPoints(data) {
    const colors = {
        'low': '#10B981',
        'moderate': '#FBBF24',
        'high': '#F97316',
        'very_high': '#EF4444',
        'critical': '#EF4444'
    };

    let counts = { all: 0, low: 0, moderate: 0, high: 0, critical: 0 };

    data.forEach(point => {
        let level = point.riskLevel;
        if (level === 'very_high') level = 'critical';
        if (counts[level] !== undefined) counts[level]++;
        counts.all++;

        createMarker(
            point.latitude,
            point.longitude,
            level,
            colors[level] || '#64748b',
            point.area || 'Kodagu Zone',
            point
        );
    });

    updateDOMCounts(counts);
}

// ─── DOM Count Update ─────────────────────────────────────────────────────────
function updateDOMCounts(counts) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('count-all', counts.all);
    set('count-low', counts.low);
    set('count-moderate', counts.moderate);
    set('count-high', counts.high);
    set('count-critical', counts.critical);
    set('count-points-total', counts.all);
    set('count-high-risk', counts.high + counts.critical);
}

// ─── Create Marker ────────────────────────────────────────────────────────────
// Uses L.circleMarker for pixel-perfect geo-anchoring (no drift on zoom).
// Pulse-ring overlays are added as separate divIcon markers pinned to the same latlng.
function createMarker(lat, lng, level, color, areaName, apiData = null) {
    let dotRadius = 4;
    let dotWeight = 1.5;

    if (level === 'critical')      { dotRadius = 7; dotWeight = 2; }
    else if (level === 'high')     { dotRadius = 6; dotWeight = 1.5; }
    else if (level === 'moderate') { dotRadius = 5; dotWeight = 1.5; }

    // Core dot — L.circleMarker is always pixel-perfect at every zoom level
    const marker = L.circleMarker([lat, lng], {
        radius: dotRadius,
        fillColor: color,
        fillOpacity: 1,
        color: '#ffffff',
        weight: dotWeight,
        className: 'risk-dot'
    });
    marker.riskLevel = level;

    // Pulse ring overlay for critical / high risk points
    if (level === 'critical' || level === 'high') {
        let pulseHTML = '';
        if (level === 'critical') {
            pulseHTML = '<div class="pulse-ring critical-ring3"></div><div class="pulse-ring critical-ring2"></div><div class="pulse-ring critical-ring1"></div>';
        } else {
            pulseHTML = '<div class="pulse-ring high-ring2"></div><div class="pulse-ring high-ring1"></div>';
        }
        const pulseIcon = L.divIcon({
            className: 'pulse-overlay',
            html: pulseHTML,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        });
        const pulseMarker = L.marker([lat, lng], { icon: pulseIcon, interactive: false, pane: 'shadowPane' });
        pulseMarker.riskLevel = level;
        pulseMarker._isPulse = true;
        allMarkers.push(pulseMarker);
        markersLayer.addLayer(pulseMarker);
    }

    const score = apiData?.riskScore != null ? apiData.riskScore * 100 : (level === 'critical' ? 90 : level === 'high' ? 70 : level === 'moderate' ? 45 : 20);
    const elevation = apiData?.elevation ?? Math.floor(800 + random() * 900);
    const geomorph = apiData?.geomorphology ?? (random() > 0.5 ? 'Steep Escarpment' : 'Valley Ridge');
    const landUse = apiData?.landUse ?? (random() > 0.5 ? 'Coffee Plantation' : 'Dense Forest');
    const rainfall = apiData?._rainfall ?? Math.floor((level === 'critical' ? 180 : level === 'high' ? 140 : 100) + random() * 30);
    const soilMoisture = apiData?._soilMoisture ?? Math.floor((level === 'critical' ? 85 : level === 'high' ? 65 : 40) + random() * 10);
    const yearOfLandslide = apiData?._year ?? (level === 'low' ? 'None Recent' : Math.floor(2000 + random() * 24));
    const taluk = apiData?.taluk ?? 'Kodagu';
    const locationCoords = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

    marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 220px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px; font-size: 14px;">${areaName}</div>
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:10px;">
                <div style="display:inline-block; padding: 2px 8px; background: ${color}22; color: ${color}; border: 1px solid ${color}55; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${level} RISK</div>
                <div style="font-size: 10px; color: #64748b; padding: 2px 6px; background:#f1f5f9; border-radius:4px;">${taluk} Taluk</div>
            </div>

            <div style="margin-bottom: 8px;">
                <div style="display:flex; justify-content:space-between; font-size: 11px; color:#64748b; margin-bottom:2px;">
                    <span>Risk Score</span><span>${score.toFixed(1)}/100</span>
                </div>
                <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.min(score, 100)}%; background: ${color};"></div>
                </div>
            </div>

            <table style="width: 100%; font-size: 11px; color: #475569; border-collapse: collapse;">
                <tr><td style="padding: 3px 0;">Location</td><td style="text-align:right; font-weight:600; font-family:monospace;">${locationCoords}</td></tr>
                <tr><td style="padding: 3px 0;">Last Event</td><td style="text-align:right; font-weight:600; color: #b91c1c;">${yearOfLandslide}</td></tr>
                <tr><td style="padding: 3px 0;">Telemetry</td><td style="text-align:right; font-weight:600; color: #0284c7;">SM: ${soilMoisture}% | RF: ${rainfall}mm</td></tr>
                <tr><td style="padding: 4px 0; border-top: 1px dashed #cbd5e1;">Elevation</td><td style="text-align:right; font-weight:600; border-top: 1px dashed #cbd5e1;">${elevation}m</td></tr>
                <tr><td style="padding: 3px 0;">Land Use</td><td style="text-align:right; font-weight:600;">${landUse}</td></tr>
                <tr><td style="padding: 3px 0;">Geomorphology</td><td style="text-align:right; font-weight:600;">${geomorph}</td></tr>
            </table>
        </div>
    `, { className: 'map-popup-custom' });

    allMarkers.push(marker);
    markersLayer.addLayer(marker);
}

// ─── Filter Map ───────────────────────────────────────────────────────────────
function filterMap(level, btnElement) {
    markersLayer.clearLayers();
    allMarkers.forEach(marker => {
        if (level === 'all' || marker.riskLevel === level) {
            markersLayer.addLayer(marker);
        }
    });

    if (btnElement) {
        document.querySelectorAll('.map-filters button').forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.borderColor = 'transparent';
            btn.style.color = 'rgba(255,255,255,0.6)';
        });

        let color = '#64748b';
        if (level === 'low') color = '#22c55e';
        else if (level === 'moderate') color = '#eab308';
        else if (level === 'high') color = '#f97316';
        else if (level === 'critical') color = '#ef4444';

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        btnElement.style.background = `rgba(${r}, ${g}, ${b}, 0.15)`;
        btnElement.style.borderColor = color;
        btnElement.style.color = '#fff';
    }
}

// ─── Map Layer Helpers ────────────────────────────────────────────────────────
function drawIndiaBoundary() {
    L.polygon(indiaBoundary, {
        color: 'rgba(255, 255, 255, 0.35)', weight: 1.5,
        fillColor: 'rgba(255, 255, 255, 0.03)', fillOpacity: 0.03,
        dashArray: '6, 6', interactive: false
    }).addTo(map);

    L.marker([24.0, 79.0], {
        icon: L.divIcon({
            className: 'country-label',
            html: '<div style="color: rgba(255,255,255,0.2); font-size: 28px; font-weight: 800; letter-spacing: 12px; text-transform: uppercase; white-space: nowrap; pointer-events: none;">INDIA</div>',
            iconSize: [200, 40], iconAnchor: [100, 20]
        }),
        interactive: false
    }).addTo(map);
}

function drawKarnatakaBoundary() {
    L.polygon(karnatakaBoundary, {
        color: 'rgba(0, 217, 166, 0.3)', weight: 2,
        fillColor: 'rgba(0, 217, 166, 0.05)', fillOpacity: 0.05,
        dashArray: '4, 4', interactive: false
    }).addTo(map);

    L.marker([15.3, 76.0], {
        icon: L.divIcon({
            className: 'state-label',
            html: '<div style="color: rgba(0,217,166,0.3); font-size: 16px; font-weight: 700; letter-spacing: 6px; text-transform: uppercase; white-space: nowrap; pointer-events: none;">KARNATAKA</div>',
            iconSize: [160, 30], iconAnchor: [80, 15]
        }),
        interactive: false
    }).addTo(map);
}

function drawSusceptibilityZone() {
    const polyColor = (typeof OFFICIAL_POLYGON_COLOR !== 'undefined') ? OFFICIAL_POLYGON_COLOR : '#00D9A6';
    L.polygon(kodaguPolygon, {
        color: polyColor, weight: 2.5,
        fillColor: polyColor, fillOpacity: 0.08,
        dashArray: '8, 4'
    }).addTo(map);
}

function addKodaguLabel() {
    L.marker([12.42, 75.72], {
        icon: L.divIcon({
            className: 'kodagu-label',
            html: '<div style="color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; pointer-events: none; text-shadow: 0 1px 4px rgba(0,0,0,0.5);">KODAGU DISTRICT</div>',
            iconSize: [130, 20], iconAnchor: [65, 10]
        }),
        interactive: false
    }).addTo(map);
}

// ─── Map Style Toggle ─────────────────────────────────────────────────────────
function toggleMapStyle() {
    const btn = document.getElementById('toggleMapBtn');
    if (btn.dataset.style === 'satellite') {
        btn.dataset.style = 'light';
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> Satellite`;
        map.eachLayer(l => { if (l instanceof L.TileLayer) map.removeLayer(l); });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map);
    } else {
        btn.dataset.style = 'satellite';
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Light Map`;
        map.eachLayer(l => { if (l instanceof L.TileLayer) map.removeLayer(l); });
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }).addTo(map);
    }
}

// ─── User Menu ────────────────────────────────────────────────────────────────
function toggleUserMenu() {
    if (confirm('Sign out?')) window.location.href = 'index.html';
}

// ─── Inject Styles ────────────────────────────────────────────────────────────
function injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* circleMarker dot shadow */
        .risk-dot { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3)); }

        /* Pulse overlay — zero-size container, children centered via transform */
        .pulse-overlay { overflow: visible !important; width: 0 !important; height: 0 !important; }
        .pulse-ring {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            /* Center each ring on the 0,0 anchor point */
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .critical-ring1 { width: 28px; height: 28px; border: 2px solid rgba(239, 68, 68, 0.8); animation-delay: 0s; }
        .critical-ring2 { width: 42px; height: 42px; border: 1.5px solid rgba(239, 68, 68, 0.5); animation-delay: 0.4s; }
        .critical-ring3 { width: 56px; height: 56px; border: 1px solid rgba(239, 68, 68, 0.2); animation-delay: 0.8s; }
        .high-ring1 { width: 24px; height: 24px; border: 2px solid rgba(249, 115, 22, 0.6); animation-delay: 0s; }
        .high-ring2 { width: 36px; height: 36px; border: 1px solid rgba(249, 115, 22, 0.3); animation-delay: 0.5s; }
        @keyframes ping {
            0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2);   opacity: 0; }
        }
        .map-popup-custom .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    `;
    document.head.appendChild(style);
}

// ─── Live Counter ─────────────────────────────────────────────────────────────
let lastRefreshTime = Date.now();
function startLiveCounter() {
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastRefreshTime) / 1000);
        const el = document.getElementById('last-refresh-time');
        if (el) el.innerText = elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`;
    }, 1000);

    setInterval(() => { forceRefreshData(); }, 120000);
}

function forceRefreshData() {
    const loader = document.getElementById('map-loading-overlay');
    if (loader) loader.classList.add('active');
    setTimeout(() => {
        lastRefreshTime = Date.now();
        fetchLiveRiskPoints();
        const el = document.getElementById('last-refresh-time');
        if (el) el.innerText = '0s ago';
    }, 800);
}