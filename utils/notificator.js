import cron from "node-cron";
import { readUsers } from "./userService.js";
import { airQualityNotifications } from "./messages.js";
import { bot } from "../server.js";

const lastAirLevels = {}; // Храним по user.id

export async function testNotifications() {
  cron.schedule("0 * * * *", async () => {
    const usersData = await readUsers();

    for (const user of usersData.users) {
      if (user.notifications.enabled) {
        const airData = await airQualityNotifications(
          user.geolocation.stationID,
          user.notifications,
          lastAirLevels[user.id]
        );

        if (airData[0] && airData[1] !== lastAirLevels[user.id]) {
          lastAirLevels[user.id] = airData[1];

          bot.sendMessage(user.id, airData[0], {
            parse_mode: "Markdown",
          });

          console.log(
            `Сообщение отправлено: ${user.first_name}, ${airData[1]}`
          );
        } else {
          console.log(
            `Не отправлено (${user.first_name}): тот же уровень AQI (${airData[1]})`
          );
        }
      }
    }
  });
}

// * * * * * -> каждую минуту

//  */5 * * * * * -> каждые 5 сек
