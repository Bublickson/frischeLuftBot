import axios from "axios";
import { logToFile } from "./logger.js";

export async function Geolocation(lat, lng, distance) {
  const aqicnAPI = process.env.AQICN_API_TOKEN;
  const kmPerDegreeLat = 111.32; // перевод градусов широты в километры

  // Отклонение по широте (север и юг)
  const deltaLat = distance / kmPerDegreeLat;

  // Отклонение по долготе (восток и запад)
  const deltaLng =
    distance / (kmPerDegreeLat * Math.cos((lat * Math.PI) / 180));

  // Границы (север, юг, запад, восток)
  const north = lat + deltaLat;
  const south = lat - deltaLat;
  const east = lng + deltaLng;
  const west = lng - deltaLng;

  const response = await axios.get(
    `https://api.waqi.info/v2/map/bounds?latlng=${south},${west},${north},${east}&networks=all&token=${aqicnAPI}`
  );

  if (response.data.status !== "ok") {
    const errorMessage = `❌ Некорректный ответ API: ${JSON.stringify(
      response.data
    )}`;
    throw new Error(errorMessage);
  }

  return findClosestStations(lat, lng, response.data);
}

function findClosestStations(userLat, userLng, apiResponse) {
  // Добавляем расстояние к каждой станции
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

  // Сортируем станции по расстоянию (от ближней к дальней)
  stations.sort((a, b) => a.distance - b.distance);

  return stations.slice(0, 3);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371; // Радиус Земли в километрах

  // Переводим координаты в радианы
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
