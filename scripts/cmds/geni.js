const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[GENI] Loading geni.js from: ${__dirname}`);

const CACHE_FOLDER = path.join(__dirname, "cache");
const PRIMARY_API_URL = "https://asmit-docs.onrender.com/generate";
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2";
const HUGGINGFACE_API_KEY = "your_huggingface_api_key"; // Get from https://huggingface.co/settings/tokens

async function downloadImage(prompt, apiUrl, isHuggingFace = false) {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = isHuggingFace 
    ? HUGGINGFACE_API_URL
    : `${PRIMARY_API_URL}?prompt=${encodedPrompt}`;
  const filePath = path.join(CACHE_FOLDER, `geni_${Date.now()}.jpg`);
  
  console.log(`[GENI] Sending request: ${url}`);
  try {
    const startTime = Date.now();
    const config = {
      method: isHuggingFace ? "POST" : "GET",
      url,
      responseType: "stream",
      timeout: 60000,
      headers: isHuggingFace ? {
        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json"
      } : {}
    };
    if (isHuggingFace) {
      config.data = { inputs: prompt };
    }

    const response = await retryRequest(config);
    const responseTime = Date.now() - startTime;
    console.log(`[GENI] Response time for ${url}: ${responseTime}ms`);

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
    console.error(`[GENI] Endpoint ${url} failed: ${error.message}`);
    if (error.response) {
      console.log(`[GENI] Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

async function fetchGeneratedImage(prompt, useHuggingFace = false) {
  if (useHuggingFace && (!HUGGINGFACE_API_KEY || HUGGINGFACE_API_KEY === "your_huggingface_api_key")) {
    throw new Error("Hugging Face API key not configured. Get one from https://huggingface.co/settings/tokens.");
  }

  const filePath = await downloadImage(prompt, useHuggingFace ? HUGGINGFACE_API_URL : PRIMARY_API_URL, useHuggingFace);
  
  const stats = fs.statSync(filePath);
  if (stats.size > 25 * 1024 * 1024) {
    fs.unlinkSync(filePath);
    throw new Error("Image file is too large (>25MB). Try a different prompt.");
  }

  return {
    message: `🖼️ Generated for: ${prompt}`,
    filePath
  };
}

async function retryRequest(config, retries = 2, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios(config);
    } catch (error) {
      const status = error.response?.status;
      const message = error.message || "Unknown error";
      console.error(`[GENI] Request to ${config.url} failed (attempt ${i + 1}/${retries}): ${status} - ${message}`);
      if (status === 429 && i < retries - 1) {
        console.log(`[GENI] Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

async function handleGeniCommand(api, event, args) {
  const { threadID, messageID } = event;
  const prompt = args.join(" ").trim() || "Generate a random image";

  try {
    console.log(`[GENI] Command received: prompt=${prompt}, threadID=${threadID}, messageID=${messageID}`);

    // React ⌛
    api.setMessageReaction("⌛", messageID, (err) => {
      if (err) console.error(`[GENI] Reaction ⌛ error: ${err.message}`);
    }, true);

    let imageData;
    try {
      imageData = await fetchGeneratedImage(prompt);
    } catch (error) {
      console.log(`[GENI] Primary API failed, trying Hugging Face API: ${error.message}`);
      imageData = await fetchGeneratedImage(prompt, true);
    }

    console.log(`[GENI] Sending image: ${imageData.message.substring(0, 100)}..., file: ${imageData.filePath}`);

    await api.sendMessage(
      {
        body: imageData.message,
        attachment: fs.createReadStream(imageData.filePath)
      },
      threadID,
      (err) => {
        if (err) {
          console.error(`[GENI] Send message error: ${err.message}`);
          api.sendMessage("❌ Failed to send generated image.", threadID, messageID);
          api.setMessageReaction("❌", messageID, () => {}, true);
        } else {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }
        fs.unlink(imageData.filePath, (err) => {
          if (err) console.error(`[GENI] Cleanup error for ${imageData.filePath}: ${err.message}`);
          else console.log(`[GENI] Cleaned up: ${imageData.filePath}`);
        });
      },
      messageID
    );

  } catch (error) {
    console.error(`[GENI] Error: ${error.message}`);
    const status = error.response?.status;
    let errorMessage;
    if (status === 400) {
      errorMessage = "Bad request. Check your prompt (e.g., A cute cat).";
    } else if (status === 403) {
      errorMessage = "Invalid API key or access issue. Check the Hugging Face API key or contact asmit-docs.onrender.com.";
    } else if (status === 404) {
      errorMessage = `API endpoint not found. Try manually with:\n` +
                     `curl -i "https://asmit-docs.onrender.com/generate?prompt=${encodeURIComponent(prompt)}"\n` +
                     `Note: Hugging Face API fallback also failed. Get a key from https://huggingface.co/settings/tokens.`;
    } else if (error.message.includes("timeout")) {
      errorMessage = `API timed out. Try again or test manually with:\n` +
                     `curl -i "https://asmit-docs.onrender.com/generate?prompt=${encodeURIComponent(prompt)}"\n` +
                     `Contact asmit-docs.onrender.com for support.`;
    } else if (status === 429) {
      errorMessage = "API rate limit exceeded. Please try again later.";
    } else {
      errorMessage = error.message || "❌ Sorry, couldn’t generate an image. Try a different prompt!";
    }
    await api.sendMessage(errorMessage, threadID, messageID);
    api.setMessageReaction("❌", messageID, (err) => {
      if (err) console.error(`[GENI] Reaction ❌ error: ${err.message}`);
    }, true);
  }
}

module.exports = {
  config: {
    name: "geni",
    aliases: ["gen"],
    version: "1.1.0",
    author: "Lord Itachi",
    countDown: 3,
    role: 0, // Open to all users (SFW)
    shortDescription: "Generate an image from a prompt",
    longDescription: "Generates an image using asmit-docs.onrender.com or Hugging Face Stable Diffusion API based on the provided prompt. Similar to neko command.",
    category: "utility",
    guide: `{pn} <prompt>
Examples:
  {pn} A cute cat
  {pn}gen A futuristic city
  {pn} A fantasy landscape
Default:
  - prompt: Generate a random image (if none provided)
Alias: gen
Note: Images must be <25MB. If the primary API fails, it falls back to Hugging Face API (requires API key from https://huggingface.co/settings/tokens). Test manually with curl if errors persist (see error message).`
  },

  onStart: async function ({ api, event, args }) {
    return handleGeniCommand(api, event, args);
  },

  onLoad: async function () {
    try {
      await fs.ensureDir(CACHE_FOLDER);
      console.log(`[GENI] Cache directory ready: ${CACHE_FOLDER}`);
      console.log(`[GENI] Command loaded successfully`);
    } catch (error) {
      console.error(`[GENI] Cache setup error: ${error.message}`);
    }
  }
};