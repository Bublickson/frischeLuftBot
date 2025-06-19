import axios from "axios";
import dayjs from "dayjs";
import { logToFile } from "./logger.js";

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
  const level = user.notifications.pollution_level;
  const aqiThreshold = pollutionLevels[level];
  const emoji = pollutionLevelsEmoji[level] || "";
  const isEnabled = user.notifications.enabled;

  const notificationInfo = isEnabled
    ? `📬 You will receive notifications if the *AQI level* exceeds *${aqiThreshold}*`
    : `🚫 You will not receive any notifications.`;

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
          {
            text: "📊 Pollution Level",
            callback_data: "notify_pollution_level",
          },
          { text: "🔴 Turn off", callback_data: "notify_off" },
        ],
      ],
    },
  };
  return { text, options };
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
      return "Sensitive Groups";
    case aqi >= 51:
      return "Moderate";
    case aqi <= 50:
      return "Good";
    default:
      return "Unknown type";
  }
}

const pollutionLevels = {
  Good: 0,
  Moderate: 51,
  "Sensitive Groups": 101,
  Unhealthy: 151,
  "Very Unhealthy": 201,
  Hazardous: 300,
};

const pollutionLevelsEmoji = {
  Moderate: "🟡",
  "Sensitive Groups": "🟠",
  Unhealthy: "🔴",
};

export async function getAirData(stationID) {
  const aqicnAPI = process.env.AQICN_API_TOKEN;

  const response = await axios.get(
    `https://api.waqi.info/feed/@${stationID}/?token=${aqicnAPI}`
  );

  if (response.data.data.status == "error") {
    return "Unknown ID";
  }

  return response.data;
}

export async function airQualityNotifications(user, lastAirLevel = "Good") {
  const response = await getAirData(user.geolocation.stationID);

  if (
    response.data.aqi >= pollutionLevels[user.notifications.pollution_level]
  ) {
    if (pollutionLevels[lastAirLevel] < response.data.aqi) {
      return [
        "⚠️ *Attention, the air quality has worsened.* ⚠️\n\n We will notify you when it returns to a normal level." +
          (await airQualityInformation(user.geolocation.stationID, response)),
        airDescription(response.data.aqi),
      ];
    } else {
      logToFile(
        `❌ Качество воздуха, ниже чем самый высокий отправленный уровень, у пользователя ${user.first_name}, id:${user.id}`
      );
    }
  } else if (
    response.data.aqi <= pollutionLevels[user.notifications.pollution_level] &&
    lastAirLevel != "Good"
  ) {
    logToFile(
      `✅ Отработанно когда ниже уровень загрезнение, у пользователя ${user.first_name}, id:${user.id}`
    );
    return [
      "✅ *Air quality has returned to desired level*" +
        (await airQualityInformation(user.geolocation.stationID, response)),
      "Good",
    ];
  } else {
    logToFile(
      `❌ Не одно условие не сработало, у пользователя ${user.first_name}, id:${user.id}`
    );
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
