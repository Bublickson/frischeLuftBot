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
import { logToFile } from "./utils/logger.js";

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

bot.onText("/start", async (msg) => {
  bot.sendMessage(msg.chat.id, START_MESSAGE, { parse_mode: "Markdown" });
  await saveUserProfile(msg.chat);
});

bot.onText(`/air`, async (msg) => {
  const user = await findUser(msg.chat.id);
  logToFile(`User ${user.first_name} requested air quality data.`);

  try {
    const airData = await airQualityInformation(
      user.geolocation.stationID,
      null
    );
    bot.sendMessage(msg.chat.id, airData, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      "Failed to retrieve air quality data. Please try again later."
    );
    logToFile(
      `Error fetching air quality for user ${user.first_name}, ${msg.chat.id}: ${error.message}`
    );
  }
});

bot.onText("/notifications", async (msg) => {
  const user = await findUser(msg.chat.id);
  const { text, options } = getNotificationMessage(user);

  if (user.geolocation.stationID) {
    bot
      .sendMessage(msg.chat.id, text, options)
      .then((sentedMessage) => {
        templastSendedMessage[msg.chat.id] = sentedMessage.message_id;
      })
      .catch((error) => {
        logToFile(
          `Error sending notifications message for user ${user.first_name}, ${msg.chat.id}: ${error.message}`
        );
      });
  } else {
    bot
      .sendMessage(
        msg.chat.id,
        `Please use /location to set up your station location`
      )
      .catch((error) => {
        logToFile(
          `Error sending location prompt for user ${user.first_name}, ${msg.chat.id}: ${error.message}`
        );
      });
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  let user = await findUser(msg.chat.id);

  if (data === "notify_pollution_level") {
    const { text } = getNotificationMessage(user);

    const options = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🟡 Moderate — AQI 50+",
              callback_data: "moderate",
            },
          ],
          [
            {
              text: "🟠 Sensitive — AQI 100+",
              callback_data: "unhealthy_sensitive",
            },
          ],
          [
            {
              text: "🔴 Unhealthy — AQI 150+",
              callback_data: "unhealthy",
            },
          ],
        ],
      },
    };
    if (templastSendedMessage[msg.chat.id]) {
      bot
        .editMessageText(text, {
          chat_id: msg.chat.id,
          message_id: templastSendedMessage[msg.chat.id],
          parse_mode: options.parse_mode,
          reply_markup: options.reply_markup,
        })
        .catch((error) => {
          logToFile(
            `Error while editing a message for ${user.first_name}, ${msg.chat.id}, in ${data}: ${error.message}`
          );
        });
    } else {
      bot
        .sendMessage(msg.chat.id, text, options)
        .then((sentedMessage) => {
          templastSendedMessage[msg.chat.id] = sentedMessage.message_id;
        })
        .catch((error) => {
          logToFile(
            `Error while sending a message for ${user.first_name}, ${msg.chat.id} in ${data}: ${error.message}`
          );
        });
    }
  }

  if (
    tempGeoData[msg.chat.id] &&
    (data === "1" || data === "2" || data === "3")
  ) {
    const geoData = tempGeoData[msg.chat.id][parseInt(data) - 1];
    await saveUserData(msg.chat.id, geoData, "geolocation");

    bot.editMessageText(`You have picked: *${geoData.name}*`, {
      chat_id: msg.chat.id,
      message_id: msg.message_id, // ID сообщения, которое нужно обновить
      parse_mode: "Markdown",
    });

    delete tempGeoData[msg.chat.id];
  }

  const optionsSettings = {
    moderate: { pollution_level: "Moderate" },
    unhealthy_sensitive: { pollution_level: "Sensitive Groups" },
    unhealthy: { pollution_level: "Unhealthy" },
    notify_on: { enabled: true },
    notify_off: { enabled: false },
  };

  if (optionsSettings[data]) {
    const settingsKey = Object.keys(optionsSettings[data]);
    const settingsValue = optionsSettings[data][settingsKey];
    if (user.notifications[settingsKey] !== settingsValue) {
      await saveUserData(msg.chat.id, optionsSettings[data], "notifications");
      user = await findUser(msg.chat.id);
      const { text, options } = getNotificationMessage(user);
      if (templastSendedMessage[msg.chat.id]) {
        bot
          .editMessageText(text, {
            chat_id: msg.chat.id,
            message_id: templastSendedMessage[msg.chat.id],
            parse_mode: options.parse_mode,
            reply_markup: options.reply_markup,
          })
          .catch((error) => {
            logToFile(
              `Error while editing a message for ${user.first_name}, ${msg.chat.id}, in ${data}: ${error.message}`
            );
          });
      } else {
        bot
          .sendMessage(msg.chat.id, text, options)
          .then((sentedMessage) => {
            templastSendedMessage[msg.chat.id] = sentedMessage.message_id;
          })
          .catch((error) => {
            logToFile(
              `Error while sending a message for ${user.first_name}, ${msg.chat.id}, in ${data}: ${error.message}`
            );
          });
      }
    }
  }
  bot.answerCallbackQuery(callbackQuery.id).catch((err) => {
    logToFile(
      `Error in answerCallbackQuery for ${msg.chat.id}: ${err.message}`
    );
  });
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
    try {
      const { latitude, longitude } = msg.location;
      const geoData = await Geolocation(latitude, longitude, 20);

      await bot.sendMessage(msg.chat.id, "Спасибо! Местоположение получено.", {
        reply_markup: {
          remove_keyboard: true,
        },
      });

      setTimeout(() => {
        try {
          let text = "Пожалуйста, выберите станцию:\n\n";
          geoData.forEach((station, index) => {
            text += `${index + 1}. ${station.name}: \n distance: *${
              station.distance
            }* km\n\n`;
          });

          tempGeoData[msg.chat.id] = geoData;

          bot
            .sendMessage(msg.chat.id, text, {
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
            })
            .catch((err) => {
              logToFile(
                `Error sending station selection to ${msg.chat.id}: ${err.message}`
              );
            });
        } catch (error) {
          logToFile(
            `Error inside setTimeout for user ${msg.chat.id}: ${error.message}`
          );
        }
      }, 500);
    } catch (error) {
      logToFile(
        `Error handling location message for user ${msg.chat.id}: ${error.message}`
      );
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
