import cron from "node-cron";
import { readUsers } from "./userService.js";
import { airQualityNotifications } from "./messages.js";
import { bot } from "../server.js";
import { logToFile } from "./logger.js";

const lastAirLevels = {}; // Храним по user.id

export async function testNotifications() {
  cron.schedule("*/10 * * * * *", async () => {
    const usersData = await readUsers();

    for (const user of usersData.users) {
      console.log(user);
      if (user.notifications.enabled) {
        console.log(user.first_name);
        const airData = await airQualityNotifications(
          user,
          lastAirLevels[user.id]
        );

        if (airData[0] && airData[1] !== lastAirLevels[user.id]) {
          lastAirLevels[user.id] = airData[1];

          bot.sendMessage(user.id, airData[0], {
            parse_mode: "Markdown",
          });

          logToFile(
            `✅ Message send to: ${user.first_name}, id:${user.id}, ${airData[1]}`
          );
        } else {
          logToFile(
            `❌ Message not send to: ${user.first_name}, id:${user.id} the same AQI level(${airData[1]})`
          );
        }
      }
    }
  });
}

// * * * * * -> каждую минуту

//  */5 * * * * * -> каждые 5 сек
