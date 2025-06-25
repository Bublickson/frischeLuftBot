import fs from "fs";

const FILE_PATH = "users.json";

export function readUsersSync() {
  try {
    const data = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to read user data: ${error}`);
    return { users: [] };
  }
}

function writeUsersSync(users) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify({ users }, null, 2), "utf-8");
  } catch (error) {
    console.error(`Failed to write user data: ${error}`);
  }
}

export function findUser(id) {
  const { users } = readUsersSync();
  const user = users.find((user) => user.id === id);

  if (!user) {
    console.log(`⚠️ User with id ${id} not found in database`);
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
    console.log(
      `💾 User profile saved: ${userInfo.first_name}, id:${userInfo.id}`
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
    console.log(
      `⚙️ Settings saved for user: ${user.first_name}, id:${user.id}`
    );
  } else {
    console.error(`⚠️ User not found while saving settings, id:${user_id}`);
  }
}
