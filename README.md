# FrischeLuftBot 🌍

FrischeLuftBot is a Telegram bot that provides up-to-date information about air quality in your area and helps you stay informed about potential environmental risks.

The bot is publicly available on **Telegram**:  
https://t.me/frischeLuftBot

🎬 Project video presentation:  
https://youtu.be/LAavYAXfkR8?si=KauWuQKvTssLDfeE

## ⚠ Server stability notice

Please note that the server is hosted in **Ukraine**.
Due to frequent power outages, temporary downtime may occur from time to time.

---

## 🚀 Features

🌍 **Set your location**  
Use `/location` to find the nearest air quality monitoring station and receive accurate, location-based data.

🔔 **Enable notifications**  
Use `/notifications` to receive alerts when air quality worsens in your area. The notification system can be adjusted to your personal preferences.

💨 **Check current air quality**  
Use `/air` to get the latest Air Quality Index (AQI) and key pollution indicators in real time.

---

## ⚙ How it works

FrischeLuftBot uses geolocation and real-time air quality data to provide precise, location-based environmental updates.

### 📍 Location detection
When a user shares their location, the bot:
- Calculates a geographic bounding box around the coordinates (up to 20 km radius)
- Requests nearby air quality stations from the **AQICN API**
- Sorts monitoring stations by distance
- Displays the three closest stations for manual selection

### 🌫 Air quality data processing
Once a station is selected:
- The bot retrieves real-time air quality data from AQICN
- Extracts:
  - Air Quality Index (AQI)
  - PM2.5
  - Temperature
  - Humidity
  - City name and timestamp
- Formats the data into a readable Telegram message
- Adds a short pollution level interpretation (Good, Moderate, Unhealthy, etc.)
- Includes a short PM2.5 forecast when available

### 🔔 Notification system
Users can enable notifications and define sensitivity levels:
- Moderate (AQI ≥ 50)
- Sensitive Groups (AQI ≥ 100)
- Unhealthy (AQI ≥ 150)

Every 15 minutes:
- The bot checks air quality updates automatically
- Sends alerts only if:
  - The AQI threshold is exceeded
  - Or the air quality improves back to normal
- Prevents duplicate notifications by tracking last known pollution levels

### 💾 User data storage
User settings are stored locally in a JSON file:
- Telegram ID and username
- Selected air quality station
- Notification status and pollution threshold

---

## 📄 License

MIT License
