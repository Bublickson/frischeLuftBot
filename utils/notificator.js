import cron from "node-cron";
import { loadUserData } from "./userService.js";
import { airQualityInformation } from "./messages.js";
import { bot } from "../server.js";

export async function testNotifications() {
  cron.schedule("0 * * * *", async () => {
    const usersData = await loadUserData();
    for (const user of usersData.users) {
      console.log(user.geolocation.stationID, user.notifications);
      if (user.notifications.enabled) {
        const airData = await airQualityInformation(
          user.geolocation.stationID,
          user.notifications
        );
        bot.sendMessage(user.id, airData, {
          parse_mode: "Markdown",
        });
        console.log(`Сообщение отправленно: ${user.first_name}`);
      }
    }
  });
}

// * * * * * -> каждую минуту

//  */5 * * * * * -> каждые 5 сек
