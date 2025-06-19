import fs from "fs/promises";
import { logToFile } from "./logger.js";

const FILE_PATH = "users.json";

export async function readUsers() {
  try {
    const data = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    logToFile(`❌ Failed to read user data: ${error.message}`);
    return { users: [] };
  }
}

async function writeUsers(users) {
  try {
    await fs.writeFile(FILE_PATH, JSON.stringify({ users }, null, 2), "utf-8");
  } catch (error) {
    logToFile(`❌ Failed to write user data: ${error.message}`);
  }
}

export async function findUser(id) {
  const { users } = await readUsers();
  const user = users.find((user) => user.id === id);

  if (!user) {
    logToFile(`⚠️ User with id ${id} not found in database`);
    return null;
  }

  return user;
}
export async function saveUserProfile(userInfo) {
  const data = await readUsers();
  const exists = data.users.some((user) => user.id === userInfo.id);

  if (!exists) {
    userInfo.notifications = { enabled: false, pollution_level: "Moderate" };
    userInfo.geolocation = { name: "none" };
    data.users.push(userInfo);
    await writeUsers(data.users);
    logToFile(
      `✅ User profile saved: ${userInfo.first_name}, id:${userInfo.id}`
    );
  } else {
    logToFile(
      `ℹ️ User profile exists: ${userInfo.first_name}, id:${userInfo.id}`
    );
  }
}

export async function saveUserData(user_id, newUserData, dataTopic) {
  const data = await readUsers();
  const user = data.users.find((u) => u.id === user_id);

  if (user) {
    user[dataTopic] = {
      ...user[dataTopic],
      ...newUserData,
    };
    await writeUsers(data.users);
    logToFile(`✅ Settings saved for user: ${user.first_name}, id:${user.id}`);
  } else {
    logToFile(`⚠️ User not found while saving settings, id:${user_id}`);
  }
}

/* Если пользователь 1 запросил данные из файла и ты читаешь файл синхронно, 
бот зависнет и не ответит пользователю 2, пока не закончит чтение.

Если читать файл асинхронно, 
бот будет одновременно отвечать и пользователю 2, и другим, 
пока ждёт данные для пользователя 1. */
