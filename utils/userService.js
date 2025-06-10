import fs from "fs/promises";
import { logToFile } from "./logger.js";

export async function loadUserData() {
  try {
    return JSON.parse(await fs.readFile("users.json", "utf-8"));
  } catch (error) {
    console.log("Failed to load user data", error);
  }
}

export async function findUser(id) {
  const userData = await loadUserData();
  return userData.users.find((user) => user.id === id);
}

export async function saveUserProfile(userInfo) {
  const userData = await loadUserData();
  try {
    if (!userData.users.some((user) => user.id === userInfo.id)) {
      userInfo.notifications = { enabled: false, pollution_level: "moderate" };
      userInfo.geolocation = { name: "none" };
      userData.users.push(userInfo);
      await fs.writeFile(
        "users.json",
        JSON.stringify(userData, null, 2),
        "utf-8"
      );
      console.log("✅ User profile saved:", userInfo);
      logToFile(`✅ User profile saved: ${userInfo}`);
    } else {
      console.log("ℹ️ User profile exists:", userInfo.id);
    }
  } catch (error) {
    console.error("❌ User profile saving Error:", error);
  }
}

export async function saveUserData(user_id, newUserData, dataTopic) {
  const userData = await loadUserData();
  try {
    const user = await findUser(user_id);

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
      console.log("✅ Settings saved for user:", user.first_name);
    } else {
      console.log("⚠️ User was not found, while saving settings:", user_id);
    }
  } catch (error) {
    console.error("❌ Settings saving Error:", error);
  }
}

/* Если пользователь 1 запросил данные из файла и ты читаешь файл синхронно, 
бот зависнет и не ответит пользователю 2, пока не закончит чтение.

Если читать файл асинхронно, 
бот будет одновременно отвечать и пользователю 2, и другим, 
пока ждёт данные для пользователя 1. */
