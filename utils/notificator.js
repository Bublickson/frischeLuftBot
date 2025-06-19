import cron from "node-cron";
import { readUsers } from "./userService.js";
import { airQualityNotifications } from "./messages.js";
import { bot } from "../server.js";
import { logToFile } from "./logger.js";

const lastAirLevels = {}; // Храним по user.id

export async function testNotifications() {
  cron.schedule("*/10 * * * * *", async () => {
    const usersData = await readUsers();
    console.log(lastAirLevels);

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
          logToFile(
            `❌ Message not send to: ${user.first_name}, id:${user.id} – same AQI level (${newLevel})`
          );
          continue;
        }

        // Если есть сообщение и уровень изменился — отправляем
        lastAirLevels[user.id] = newLevel;

        bot.sendMessage(user.id, message, {
          parse_mode: "Markdown",
        });

        logToFile(
          `✅ Message send to: ${user.first_name}, id:${user.id}, ${newLevel}`
        );
      } catch (err) {
        console.error(`Ошибка при обработке ${user.first_name}:`, err);
      }
    }
  });
}

// * * * * * -> каждую минуту

//  */5 * * * * * -> каждые 5 сек
