import { axiosIPv4 } from "../api.js";

export async function geolocation(lat, lng, distance) {
  const aqicnAPI = process.env.AQICN_API_TOKEN;
  const kmPerDegreeLat = 111.32; // Convert degrees of latitude to kilometers

  // Latitude offset (north and south)
  const deltaLat = distance / kmPerDegreeLat;

  // Longitude offset (east and west)
  const deltaLng =
    distance / (kmPerDegreeLat * Math.cos((lat * Math.PI) / 180));

  // Boundaries (north, south, west, east)
  const north = lat + deltaLat;
  const south = lat - deltaLat;
  const east = lng + deltaLng;
  const west = lng - deltaLng;

  const response = await axiosIPv4.get(
    `https://api.waqi.info/v2/map/bounds?latlng=${south},${west},${north},${east}&networks=all&token=${aqicnAPI}`
  );

  if (response?.data?.status !== "ok") {
    const errorMessage = `❌ Некорректный ответ API: ${JSON.stringify(
      response.data
    )}`;
    throw new Error(errorMessage);
  }

  return findClosestStations(lat, lng, response.data);
}

function findClosestStations(userLat, userLng, apiResponse) {
  // Add distance to each station
  const stations = apiResponse.data.map((station) => {
    const distance = calculateDistance(
      userLat,
      userLng,
      station.lat,
      station.lon
    );
    return {
      stationID: station.uid,
      name: station.station.name,
      distance: distance.toFixed(2),
    };
  });

  // Sort stations by distance (nearest first)
  stations.sort((a, b) => a.distance - b.distance);

  return stations.slice(0, 3);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371; // Earth's radius in kilometers

  // Convert coordinates to radians
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c; // distance in km
}
