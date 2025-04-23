import axios from "axios";
import dayjs from "dayjs";

export const START_MESSAGE = `
*Welcome!* 👋
I'm your personal Air Quality Bot. Here's what I can do for you:

*1. 🌍 Find the nearest air quality station:*
*Using your /location*, I can detect the closest station to monitor the air quality in your area. You can also manually select the nearest stations if you prefer.

*2. 💨 Provide real-time air quality data:*
Get the latest air quality information for your area. 
*You can do this with /air*

*3. 🔔 Send notifications when air quality drops:*
I'll notify you if the air quality in your area falls below your chosen threshold. 
*You can easily manage notifications with — /notifications*
  `;

export function getNotificationMessage(user) {
  return `Notifications are: ${
    user.notifications.enabled ? "enabled ✅" : "disabled 🚫"
  } \nPollution level is: ${
    user.notifications.pollution_level
  } \nGeolocation is: ${user.geolocation.name}`;
}

export function airDescription(aqi) {
  switch (true) {
    case aqi > 300:
      return "Hazardous";
    case aqi >= 201:
      return "Very Unhealthy";
    case aqi >= 151:
      return "Unhealthy";
    case aqi >= 101:
      return "Unhealthy for Sensitive Groups";
    case aqi >= 51:
      return "Moderate";
    case aqi <= 50:
      return "Good";
    default:
      return "Unknown type";
  }
}

const pollutionLevelNumbers = {
  moderate: 51,
  unhealthy_sensitive: 101,
  unhealthy: 151,
};

export async function airQualityInformation(stationID, notifications) {
  const aqicnAPI = process.env.AQICN_API_TOKEN;

  console.log(pollutionLevelNumbers[notifications.pollution_level]);

  if (!stationID) {
    return "Please use /location to set up your station location";
  }

  const response = await axios.get(
    `https://api.waqi.info/feed/@${stationID}/?token=${aqicnAPI}`
  );

  if (response.data.data.status == "error") {
    return "Unknown ID";
  }

  /* if(notifications.pollution_level) {

  } */

  const data = response.data.data;

  const city = data.city?.name ?? "Unknown city";
  const aqi = data.aqi ?? "N/A";
  const temperature = data.iaqi?.t?.v ?? "N/A";
  const humidity = data.iaqi?.h?.v ?? "N/A";
  const pm25 = data.iaqi?.pm25?.v ?? "N/A";

  const forecastPm25 = data.forecast?.daily?.pm25 ?? "";
  const date = data.time?.s
    ? dayjs(data.time.s).format("HH:mm, DD.MM.YY")
    : "N/A";

  const forecastMessage = forecastPm25.length
    ? `🔮 Forecast for PM 2.5 in the coming days:\n${forecastPm25
        .map((day) => {
          const dayDate = dayjs(day.day).format("DD.MM");
          return `- ${dayDate}: Max: ${day.max}, Min: ${day.min}, Average: ${day.avg}`;
        })
        .join("\n")}`
    : "";

  return `\`\`\`json
📍 City: ${city}
📅 Last analysis: ${date}
💨 AQI: ${aqi} (${airDescription(aqi)})
    
📊 Indicators:
- Temperature: ${temperature}°C
- Humidity: ${humidity}%
- PM 2.5: ${pm25}

${forecastMessage}
    \`\`\` `;
}
