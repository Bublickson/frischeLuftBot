import cron from "node-cron";
import { readUsersSync } from "./userService.js";
import { airQualityNotifications } from "./messages.js";
import { bot } from "../server.js";

const lastAirLevels = {}; // Храним по user.id

export async function notifications() {
  cron.schedule("*/15 * * * *", async () => {
    const usersData = readUsersSync();

    for (const user of usersData.users) {
      try {
        if (!user.notifications.enabled) {
          delete lastAirLevels[user.id];
          continue;
        }

        const [message, newLevel] = await airQualityNotifications(
          user,
          lastAirLevels[user.id]
        );

        if (message === null && newLevel === null) continue;

        if (newLevel === lastAirLevels[user.id]) {
          console.log(
            `🔁 Message not send to: ${user.first_name}, id:${user.id} – same AQI level (${newLevel})`
          );
          continue;
        }

        // Если есть сообщение и уровень изменился — отправляем
        lastAirLevels[user.id] = newLevel;

        bot.sendMessage(user.id, message, {
          parse_mode: "Markdown",
        });

        console.log(
          `✅ Message send to: ${user.first_name}, id:${user.id}, ${newLevel}`
        );
      } catch (error) {
        console.error(
          `Error while processing notification for: ${user.first_name}, id:${user.id}`,
          error
        );
      }
    }
  });
}

// * * * * * -> каждую минуту

//  */5 * * * * * -> каждые 5 сек
