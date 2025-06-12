import fs from "fs/promises";
import { logToFile } from "./logger.js";

export async function loadUserData() {
  try {
    return JSON.parse(await fs.readFile("users.json", "utf-8"));
  } catch (error) {
    logToFile(`❌ Failed to load user data: ${error.message}`);
  }
}

const userData = await loadUserData();

export const findUser = (id) => userData.users.find((user) => user.id === id);

export async function saveUserProfile(userInfo) {
  try {
    if (!userData.users.some((user) => user.id === userInfo.id)) {
      userInfo.notifications = { enabled: false, pollution_level: "Moderate" };
      userInfo.geolocation = { name: "none" };
      userData.users.push(userInfo);
      await fs.writeFile(
        "users.json",
        JSON.stringify(userData, null, 2),
        "utf-8"
      );
      logToFile(
        `✅ User profile saved: ${userInfo.first_name}, id:${userInfo.id}`
      );
    } else {
      logToFile(
        `ℹ️ User profile exists: ${userInfo.first_name}, id:${userInfo.id}`
      );
    }
  } catch (error) {
    logToFile(`❌ User profile saving Error: ${error.message}`);
  }
}

export async function saveUserData(user_id, newUserData, dataTopic) {
  try {
    const user = findUser(user_id);

    if (user) {
      user[dataTopic] = {
        ...user[dataTopic],
        ...newUserData, // обновляем или добавляем только нужные поля
      };
      await fs.writeFile(
        "users.json",
        JSON.stringify(userData, null, 2),
        "utf-8"
      );
      logToFile(
        `✅ Settings saved for user: ${user.first_name}, id:${user.id}`
      );
    } else {
      logToFile(
        `⚠️ User was not found, while saving settings: ${user.first_name}, id:${user.id}`
      );
    }
  } catch (error) {
    logToFile(`❌ Settings saving Error: ${error.message}`);
  }
}

/* Если пользователь 1 запросил данные из файла и ты читаешь файл синхронно, 
бот зависнет и не ответит пользователю 2, пока не закончит чтение.

Если читать файл асинхронно, 
бот будет одновременно отвечать и пользователю 2, и другим, 
пока ждёт данные для пользователя 1. */
