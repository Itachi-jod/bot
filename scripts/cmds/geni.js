const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[GENI] Loading geni.js from: ${__dirname}`);

const CACHE_FOLDER = path.join(__dirname, "cache");
const PRIMARY_API_URL = "https://asmit-docs.onrender.com/generate";

async function downloadImage(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `${PRIMARY_API_URL}?prompt=${encodedPrompt}`;
  const filePath = path.join(CACHE_FOLDER, `geni_${Date.now()}.jpg`);
  
  console.log(`[GENI] Sending request: ${url}`);
  try {
    const startTime = Date.now();
    const response = await axios({
      method: "GET",
      url,
      responseType: "stream",
      timeout: 60000,
    });

    const responseTime = Date.now() - startTime;
    console.log(`[GENI] Response time: ${responseTime}ms`);

    await fs.ensureDir(CACHE_FOLDER);
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
          reject(new Error("Downloaded image file is invalid or empty."));
        } else {
          resolve(filePath);
        }
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`[GENI] Failed: ${error.message}`);
    if (error.response) {
      console.log(`[GENI] Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

async function handleGeniCommand(api, event, args) {
  const { threadID, messageID } = event;
  const prompt = args.join(" ").trim() || "Generate a random image";

  try {
    api.setMessageReaction("⌛", messageID, () => {}, true);
    console.log(`[GENI] Prompt received: ${prompt}`);

    const filePath = await downloadImage(prompt);
    const stats = fs.statSync(filePath);
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      throw new Error("Image file is too large (>25MB). Try a different prompt.");
    }

    await api.sendMessage(
      {
        body: `🖼️ Generated for: ${prompt}`,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
        fs.unlink(filePath, () => {});
      },
      messageID
    );

  } catch (error) {
    console.error(`[GENI] Error: ${error.message}`);
    await api.sendMessage(`❌ Failed to generate image: ${error.message}`, threadID, messageID);
    api.setMessageReaction("❌", messageID, () => {}, true);
  }
}

module.exports = {
  config: {
    name: "geni",
    aliases: ["gen"],
    version: "1.0.0",
    author: "Lord Itachi",
    countDown: 3,
    role: 0,
    shortDescription: "Generate an image from a prompt",
    longDescription: "Uses asmit-docs.onrender.com to generate an image based on your prompt.",
    category: "utility",
    guide: `{pn} <prompt>
Examples:
  {pn} A cute cat
  {pn} A futuristic city
  {pn} A fantasy village

Default: 'Generate a random image' if no prompt is given.`
  },

  onStart: async function ({ api, event, args }) {
    return handleGeniCommand(api, event, args);
  },

  onLoad: async function () {
    try {
      await fs.ensureDir(CACHE_FOLDER);
      console.log(`[GENI] Cache directory ready: ${CACHE_FOLDER}`);
    } catch (error) {
      console.error(`[GENI] Cache setup error: ${error.message}`);
    }
  }
};