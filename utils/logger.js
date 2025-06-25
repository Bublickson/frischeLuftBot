import fs from "fs";
import path from "path";

// Путь к файлу логов
const logFile = path.resolve("logs.txt");

// Функция для записи логов
export function logToFile(message) {
  const timestamp = new Date().toLocaleString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFile(logFile, logMessage, (error) => {
    if (error) {
      console.error("Ошибка при записи в лог:", error);
    }
  });
}
