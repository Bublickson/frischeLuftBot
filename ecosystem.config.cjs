require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "frische-luft-bot",
      script: "./server.js",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
