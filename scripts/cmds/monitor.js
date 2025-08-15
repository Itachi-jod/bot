const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "monitor",
    aliases: ["m"],
    version: "1.3",
    author: "ItachiInx1de",
    role: 0,
    shortDescription: { en: "Displays the bot's uptime and ping with a random image." },
    longDescription: { en: "Shows how long the bot has been running and its ping, with a random image from Pinterest." },
    category: "owner",
    guide: { en: "Use {p}monitor to reveal the bot's uptime, ping, and a random image." }
  },

  onStart: async function ({ api, event }) {
    const startTime = Date.now();
    const tempFiles = [];

    try {
      // Random search list
      const searchList = ["zoro", "madara", "obito", "luffy", "itachi", "tanjiro", "akaza", "nezuko", "muzan", "sukuna", "goku", "senpai"];
      const randomSearch = searchList[Math.floor(Math.random() * searchList.length)];

      // Fetch from your Pinterest API
      const apiUrl = `https://pin-api-itachi.vercel.app/api/pinterest?q=${encodeURIComponent(randomSearch)}`;
      const res = await axios.get(apiUrl, { timeout: 15000 });
      const images = extractImageUrls(res.data);

      if (!images.length) return api.sendMessage("❌ No images found from Pinterest API.", event.threadID, event.messageID);

      // Random image
      const randomImageUrl = images[Math.floor(Math.random() * images.length)];
      const imgResponse = await axios.get(randomImageUrl, { responseType: "arraybuffer", timeout: 15000 });

      // Save to cache
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const f = path.join(cacheDir, `monitor_${Date.now()}.jpg`);
      await fs.outputFile(f, imgResponse.data);
      tempFiles.push(f);

      // Calculate uptime
      const uptimeSec = process.uptime();
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec / 3600) % 24);
      const minutes = Math.floor((uptimeSec / 60) % 60);
      const seconds = Math.floor(uptimeSec % 60);

      let c = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (days === 0) c = `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      if (hours === 0 && days === 0) c = `${minutes} minutes, ${seconds} seconds`;
      if (minutes === 0 && hours === 0 && days === 0) c = `${seconds} seconds`;

      const m = Date.now() - startTime;

      // Send message with simplified body
      const imageStream = fs.createReadStream(f);
      await api.sendMessage({
        body: `Greetings! Your bot\nhas been running for:\n${c}\n\nCurrent Ping: ${m}`,
        attachment: imageStream
      }, event.threadID, event.messageID);

    } catch (error) {
      console.error("Monitor command error:", error);
      return api.sendMessage("⚠️ An error occurred while fetching the monitor info.", event.threadID, event.messageID);
    } finally {
      // Clean up cache
      for (const file of tempFiles) {
        try { await fs.unlink(file); } catch {}
      }
    }
  }
};

/**
 * Extract all image URLs from your Pinterest API response
 */
function extractImageUrls(data) {
  const urls = new Set();

  function addIfValid(u) {
    if (typeof u === "string" && /^https?:\/\//.test(u)) urls.add(u);
  }

  function walk(obj) {
    if (!obj) return;
    if (Array.isArray(obj)) obj.forEach(walk);
    else if (typeof obj === "object") {
      if (obj.url) addIfValid(obj.url);
      if (obj.image_url) addIfValid(obj.image_url);
      Object.values(obj).forEach(walk);
    } else if (typeof obj === "string") addIfValid(obj);
  }

  walk(data);
  return Array.from(urls);
  }
