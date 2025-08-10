const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "monitor",
    aliases: ["m"],
    version: "1.1",
    author: "MinatoCodes",
    role: 0,
    shortDescription: { en: "Displays the bot's uptime and ping." },
    longDescription: { en: "Find out how long the bot has been tirelessly serving you and its current ping." },
    category: "owner",
    guide: { en: "Use {p}monitor to reveal the bot's uptime and ping." }
  },

  onStart: async function ({ api, event }) {
    const startTime = Date.now();

    try {
      // List of search terms
      const searchList = ["zoro", "madara", "obito", "luffy", "itachi", "tanjiro", "Akaza", "nezuko", "muzan", "sukuna", "goku", "senpai"];
      const randomSearch = searchList.length ? searchList[Math.floor(Math.random() * searchList.length)] : "itachi";

      // Build API URL
      const apiUrl = `https://pinterest-api-delta.vercel.app/api/pinterest?q=${encodeURIComponent(randomSearch)}`;
      console.log("DEBUG: Fetching from", apiUrl);

      // Fetch from Pinterest API
      const res = await axios.get(apiUrl, { timeout: 10000 });
      const images = res.data?.images || [];

      if (!images.length) {
        return api.sendMessage("❌ No images found from Pinterest API.", event.threadID, event.messageID);
      }

      // Get a random image's URL (matching pin.js structure)
      const randomImageObj = images[Math.floor(Math.random() * images.length)];
      const randomImageUrl = randomImageObj?.image_url;

      if (!randomImageUrl || !randomImageUrl.startsWith("http")) {
        return api.sendMessage("❌ No valid image URL found from Pinterest API.", event.threadID, event.messageID);
      }

      // Download the image
      const imgResponse = await axios.get(randomImageUrl, { responseType: "arraybuffer", timeout: 15000 });

      // Save to cache
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const imgPath = path.join(cacheDir, "monitor_image.jpg");
      await fs.outputFile(imgPath, imgResponse.data);

      // Calculate uptime
      const uptimeSec = process.uptime();
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec / 3600) % 24);
      const minutes = Math.floor((uptimeSec / 60) % 60);
      const seconds = Math.floor(uptimeSec % 60);

      let uptimeStr = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (days === 0) uptimeStr = `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (hours === 0 && days === 0) uptimeStr = `${minutes} minutes, ${seconds} seconds`;
      if (minutes === 0 && hours === 0 && days === 0) uptimeStr = `${seconds} seconds`;

      const ping = Date.now() - startTime;

      // Send message
      await api.sendMessage({
        body: `Greetings! Your bot\nhas been running for:\n${uptimeStr}\n\nCurrent Ping: ${ping}ms`,
        attachment: fs.createReadStream(imgPath)
      }, event.threadID, event.messageID);

      // Clean up cache
      await fs.unlink(imgPath).catch(() => {});

    } catch (error) {
      console.error("Monitor command error:", error);
      return api.sendMessage("⚠️ An error occurred while fetching the monitor info.", event.threadID, event.messageID);
    }
  }
};
