import { axiosIPv4 } from "../api.js";
import dayjs from "dayjs";

export const START_MESSAGE = `
🌿 *Welcome* to the FrischeLuft Bot.

This service provides up-to-date information about air quality in your area and helps you stay informed about potential environmental risks.

ℹ️ Want to learn how to use the bot? Type */help* or watch the *video* below:
`;
export const INFO_MESSAGE = `
🌍 Set your /location
Find the nearest air quality monitoring station for accurate, localized data.

🔔 Enable /notifications
Receive timely alerts when air quality drops in your area. The notification system is adjustable to your preferences.

💨 Check current /air quality
Get the latest air quality index and key indicators.
  `;

export const GEOLOCATION_DESKTOP_MESSAGE = `
1️⃣ *Click* on the 📎 paperclip icon at the bottom of the chat.

2️⃣ *Select* _Location_ from the menu.

3️⃣ *Choose* your current or any desired location and send it.

📍 Once your location is received, it will be automatically processed to find the nearest air quality monitoring station.
`;

export function getNotificationMessage(user) {
  const level = user.notifications.pollution_level;
  const aqiThreshold = pollutionLevels[level];
  const emoji = pollutionLevelsEmoji[level] || "";
  const isEnabled = user.notifications.enabled;

  const notificationInfo = isEnabled
    ? `📬 You will receive notifications if the AQI level exceeds *${aqiThreshold}*`
    : `🚫 You will not receive notifications.`;

  const text =
    `🔔 *Notification Settings*\n\n` +
    `*Status:* ${isEnabled ? "🟢 ON" : "🔴 OFF"}\n` +
    `*Pollution level:* ${level} ${emoji}\n` +
    `*Geolocation:* ${user.geolocation.name} 🌍\n\n` +
    notificationInfo;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🟢 Turn on", callback_data: "notify_on" },
          { text: "🔴 Turn off", callback_data: "notify_off" },
        ],
        [
          {
            text: "📊 Pollution Level",
            callback_data: "notify_pollution_level",
          },
        ],
      ],
    },
  };
  return { text, options };
}

export function airDescription(aqi) {
  switch (true) {
    case aqi >= 300:
      return "Hazardous";
    case aqi >= 200:
      return "Very Unhealthy";
    case aqi >= 150:
      return "Unhealthy";
    case aqi >= 100:
      return "Sensitive Groups";
    case aqi >= 50:
      return "Moderate";
    case aqi < 50:
      return "Good";
    default:
      return "Unknown type";
  }
}

const pollutionLevels = {
  Good: 0,
  Moderate: 50,
  "Sensitive Groups": 100,
  Unhealthy: 150,
  "Very Unhealthy": 200,
  Hazardous: 300,
};

const pollutionLevelsEmoji = {
  Moderate: "🟡",
  "Sensitive Groups": "🟠",
  Unhealthy: "🔴",
};

export async function getAirData(stationID) {
  const aqicnAPI = process.env.AQICN_API_TOKEN;

  const response = await axiosIPv4.get(
    `https://api.waqi.info/feed/@${stationID}/?token=${aqicnAPI}`
  );

  if (response.data.status !== "ok") {
    const errorMessage = `❌ Некорректный ответ API: ${JSON.stringify(
      response.data
    )}`;
    throw new Error(errorMessage);
  }

  return response.data;
}

export async function airQualityNotifications(user, lastAirLevel = "Good") {
  const response = await getAirData(user.geolocation.stationID);

  if (
    response.data.aqi >= pollutionLevels[user.notifications.pollution_level]
  ) {
    if (response.data.aqi >= pollutionLevels[lastAirLevel]) {
      return [
        "⚠️ *Attention, the air quality has worsened.* ⚠️\n\nWe will notify you when it returns to a normal level." +
          (await airQualityInformation(user.geolocation.stationID, response)),
        airDescription(response.data.aqi),
      ];
    } else {
      console.log(
        `🟡 Air quality level is lower than the highest notified level for user ${user.first_name}, id:${user.id}`
      );
    }
  } else if (
    response.data.aqi < pollutionLevels[user.notifications.pollution_level] &&
    lastAirLevel != "Good"
  ) {
    return [
      "✅ *Air quality has returned to desired level*" +
        (await airQualityInformation(user.geolocation.stationID, response)),
      "Good",
    ];
  }
  return [null, null];
}

export async function airQualityInformation(stationID, response) {
  if (!stationID) {
    return "Please use /location to set up your station location";
  }

  response ??= await getAirData(stationID);

  const data = response.data;

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
