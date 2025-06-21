import fs from "fs";
import { logToFile } from "./logger.js";

const FILE_PATH = "users.json";

export function readUsersSync() {
  try {
    const data = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    logToFile(`❌ Failed to read user data: ${error.message}`);
    return { users: [] };
  }
}

function writeUsersSync(users) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify({ users }, null, 2), "utf-8");
  } catch (error) {
    logToFile(`❌ Failed to write user data: ${error.message}`);
  }
}

export function findUser(id) {
  const { users } = readUsersSync();
  const user = users.find((user) => user.id === id);

  if (!user) {
    logToFile(`⚠️ User with id ${id} not found in database`);
    return null;
  }

  return user;
}

export function saveUserProfile(userInfo) {
  const data = readUsersSync();
  const exists = data.users.some((user) => user.id === userInfo.id);

  if (!exists) {
    userInfo.notifications = { enabled: false, pollution_level: "Moderate" };
    userInfo.geolocation = { name: "none" };
    data.users.push(userInfo);
    writeUsersSync(data.users);
    logToFile(
      `✅ User profile saved: ${userInfo.first_name}, id:${userInfo.id}`
    );
  } else {
    logToFile(
      `ℹ️ User profile exists: ${userInfo.first_name}, id:${userInfo.id}`
    );
  }
}

export function saveUserData(user_id, newUserData, dataTopic) {
  const data = readUsersSync();
  const user = data.users.find((u) => u.id === user_id);

  if (user) {
    user[dataTopic] = {
      ...user[dataTopic],
      ...newUserData,
    };
    writeUsersSync(data.users);
    logToFile(`✅ Settings saved for user: ${user.first_name}, id:${user.id}`);
  } else {
    logToFile(`⚠️ User not found while saving settings, id:${user_id}`);
  }
}
