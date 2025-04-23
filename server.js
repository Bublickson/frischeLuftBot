import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

import {
  START_MESSAGE,
  getNotificationMessage,
  airQualityInformation,
} from "./utils/messages.js";

import {
  findUser,
  saveUserProfile,
  saveUserData,
} from "./utils/userService.js";

import { Geolocation } from "./utils/geolocation.js";
import { testNotifications } from "./utils/notificator.js";

dotenv.config();
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const telegramAPI = process.env.TELEGRAM_API_TOKEN;

const PORT = 3000;
export const bot = new TelegramBot(telegramAPI, { polling: true });
const tempGeoData = {};
const templastSendedMessage = {};

testNotifications();

bot.onText("/start", (msg) => {
  bot.sendMessage(msg.chat.id, START_MESSAGE, { parse_mode: "Markdown" });
  saveUserProfile(msg.chat);
});

bot.onText(`/air`, async (msg) => {
  const user = findUser(msg.chat.id);

  try {
    const airData = await airQualityInformation(
      user.geolocation.stationID,
      user.notifications
    );
    bot.sendMessage(msg.chat.id, airData, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      "Failed to retrieve air quality data. Please try again later."
    );
    console.log(error);
  }
});

bot.onText("/notifications", (msg) => {
  const user = findUser(msg.chat.id);

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Turn on", callback_data: "notify_on" },
          {
            text: "Pollution Level",
            callback_data: "notify_pollution_level",
          },
          { text: "Turn off", callback_data: "notify_off" },
        ],
      ],
    },
  };

  if (user.geolocation.stationID) {
    bot.sendMessage(
      msg.chat.id,
      `Notifications settings:\n\n${getNotificationMessage(user)}`,
      options
    );
  } else {
    bot.sendMessage(
      msg.chat.id,
      `Please use /location to set up your station location`
    );
  }
});

bot.on("callback_query", (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const user = findUser(msg.chat.id);

  if (data === "notify_pollution_level") {
    let message =
      "Select the air pollution level threshold at which you want to receive a notification.";
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Moderate", callback_data: "moderate" },
            {
              text: "Unhealthy for Sensitive Groups",
              callback_data: "unhealthy_sensitive",
            },
            { text: "Unhealthy", callback_data: "unhealthy" },
          ],
        ],
      },
    };
    bot.sendMessage(msg.chat.id, message, options);
  }

  if (
    tempGeoData[msg.chat.id] &&
    (data === "1" || data === "2" || data === "3")
  ) {
    const geoData = tempGeoData[msg.chat.id][parseInt(data) - 1];
    saveUserData(msg.chat.id, geoData, "geolocation");

    bot.editMessageText(`You have picked: *${geoData.name}*`, {
      chat_id: msg.chat.id,
      message_id: msg.message_id, // ID сообщения, которое нужно обновить
      parse_mode: "Markdown",
    });

    delete tempGeoData[msg.chat.id];
  }

  const optionsSettings = {
    moderate: { pollution_level: "moderate" },
    unhealthy_sensitive: { pollution_level: "unhealthy_sensitive" },
    unhealthy: { pollution_level: "unhealthy" },
    notify_on: { enabled: true },
    notify_off: { enabled: false },
  };

  if (optionsSettings[data]) {
    const settingsKey = Object.keys(optionsSettings[data]);
    const settingsValue = optionsSettings[data][settingsKey];
    if (user.notifications[settingsKey] !== settingsValue) {
      saveUserData(msg.chat.id, optionsSettings[data], "notifications");
      if (templastSendedMessage[msg.chat.id]) {
        bot
          .editMessageText(getNotificationMessage(user), {
            chat_id: msg.chat.id,
            message_id: templastSendedMessage[msg.chat.id],
          })
          .catch((err) => {
            console.log("Ошибка при обновлении:", err.message);
          });
      } else {
        bot
          .sendMessage(msg.chat.id, getNotificationMessage(user))
          .then((sentedMessage) => {
            templastSendedMessage[msg.chat.id] = sentedMessage.message_id;
          });
      }
    }
  }
  bot.answerCallbackQuery(callbackQuery.id);
});

bot.onText("/location", (msg) => {
  bot.sendMessage(msg.chat.id, "Пожалуйста, отправь своё местоположение:", {
    reply_markup: {
      keyboard: [
        [
          {
            text: "📍 Отправить местоположение",
            request_location: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

bot.on("message", async (msg) => {
  delete templastSendedMessage[msg.chat.id];
  if (msg.location) {
    const { latitude, longitude } = msg.location;
    const geoData = await Geolocation(latitude, longitude, 20);

    bot.sendMessage(msg.chat.id, "Спасибо! Местоположение получено.", {
      reply_markup: {
        remove_keyboard: true,
      },
    });

    setTimeout(() => {
      let text = "Пожалуйста, выберите станцию:\n\n";

      geoData.forEach((station, index) => {
        text += `${index + 1}. ${station.name}: \n distance: *${
          station.distance
        }* km\n\n`;
      });

      tempGeoData[msg.chat.id] = geoData;

      bot.sendMessage(msg.chat.id, text, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "1", callback_data: "1" },
              { text: "2", callback_data: "2" },
              { text: "3", callback_data: "3" },
            ],
          ],
        },
      });
    }, 500);
  }
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
