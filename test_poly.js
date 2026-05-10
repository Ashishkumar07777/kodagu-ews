const kodaguPolygon = [
    [12.75, 75.85], [12.72, 75.92], [12.68, 76.00], [12.62, 76.05], [12.55, 76.08],
    [12.48, 76.10], [12.38, 76.08], [12.28, 76.05], [12.18, 76.02], [12.08, 75.98],
    [12.00, 75.95], [11.97, 75.88], [11.95, 75.80], [11.93, 75.72], [11.95, 75.65],
    [11.98, 75.58], [12.05, 75.52], [12.12, 75.46], [12.22, 75.42], [12.32, 75.42],
    [12.42, 75.47], [12.50, 75.54], [12.55, 75.60], [12.60, 75.65], [12.65, 75.70],
    [12.70, 75.76], [12.75, 75.85]
];

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

// generate points in a grid around 12.35, 75.75, radius=45
const lat = 12.35;
const lng = 75.75;
const radius = 45;
const gridStep = 0.04;
const latRange = radius / 111;
const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));

let insideCount = 0;
let outsideCount = 0;

for (let dlat = -latRange; dlat <= latRange; dlat += gridStep) {
  for (let dlng = -lngRange; dlng <= lngRange; dlng += gridStep) {
    const pointLat = Math.round((lat + dlat) * 10000) / 10000;
    const pointLng = Math.round((lng + dlng) * 10000) / 10000;
    const inside = pointInPolygon(pointLat, pointLng, kodaguPolygon);
    if (inside) insideCount++; else outsideCount++;
  }
}
console.log("Inside:", insideCount, "Outside:", outsideCount);
