const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const CACHE_FOLDER = path.join(__dirname, "cache");

// Helper to add reaction and handle errors
async function react(api, threadID, messageID, reaction) {
  return new Promise((resolve) => {
    api.setMessageReaction(reaction, messageID, () => resolve(), true);
  });
}

async function downloadAudioStream(downloadUrl, filePath) {
  const response = await axios({
    url: downloadUrl,
    method: "GET",
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function fetchAudioFromReply(event) {
  const attachment = event.messageReply?.attachments?.[0];
  if (!attachment || (attachment.type !== "video" && attachment.type !== "audio")) {
    throw new Error("⚠️ | Please reply to a valid video or audio.");
  }

  const shortUrl = attachment.url;
  const response = await axios.get(`https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(shortUrl)}`);
  return response.data.title;
}

async function fetchAudioFromQuery(query) {
  const response = await axios.get(`https://yt-api-ya9f.onrender.com/search?query=${encodeURIComponent(query)}`);
  const videos = response.data;
  if (Array.isArray(videos) && videos.length > 0) {
    const video = videos[0];
    if (!video.videoId || typeof video.videoId !== "string" || !video.videoId.trim()) {
      throw new Error("❌ | videoId missing or invalid from search API response.");
    }
    return {
      videoId: video.videoId,
      title: video.title,
      duration: video.duration?.timestamp || "Unknown",
      url: video.url,
    };
  } else {
    throw new Error("❌ | No results found.");
  }
}

async function handleAudioCommand(api, event, args) {
  const { threadID, messageID, messageReply } = event;
  await fs.ensureDir(CACHE_FOLDER);

  // React processing start (⏳)
  await react(api, threadID, messageID, "⏳");

  try {
    let videoData;

    if (messageReply?.attachments?.length > 0) {
      const title = await fetchAudioFromReply(event);
      videoData = await fetchAudioFromQuery(title);
    } else if (args.length > 0) {
      const query = args.join(" ");
      videoData = await fetchAudioFromQuery(query);
    } else {
      await react(api, threadID, messageID, "❌");
      return api.sendMessage("⚠️ | Provide a search term or reply to a video/audio.", threadID, messageID);
    }

    if (!videoData || !videoData.videoId || typeof videoData.videoId !== "string" || !videoData.videoId.trim()) {
      await react(api, threadID, messageID, "❌");
      return api.sendMessage("❌ | Invalid video data received from API.", threadID, messageID);
    }

    const { videoId, title, duration, url } = videoData;

    const filePath = path.join(CACHE_FOLDER, `${videoId}.mp3`);

    await downloadAudioStream(`https://minato-mp3.vercel.app/api/ytmp3?url=${encodeURIComponent(url)}`, filePath);

    if (!fs.existsSync(filePath)) throw new Error("❌ | Downloaded file not found.");
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      fs.unlinkSync(filePath);
      throw new Error("❌ | File is empty.");
    }
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      await react(api, threadID, messageID, "❌");
      return api.sendMessage("⚠️ | Audio is too large to send (>25MB).", threadID, messageID);
    }

    // React completion ✅
    await react(api, threadID, messageID, "✅");

    api.sendMessage({
      body: `🎵 Title: ${title}\n🕒 Duration: ${duration}`,
      attachment: fs.createReadStream(filePath),
    }, threadID, () => fs.unlinkSync(filePath), messageID);

  } catch (error) {
    // React error ❌
    await react(api, event.threadID, event.messageID, "❌");
    api.sendMessage(error.message || "❌ | Something went wrong.", event.threadID, event.messageID);
  }
}

module.exports = {
  config: {
    name: "sing2",
    version: "1.0",
    author: "MinatoCodes",
    countDown: 10,
    role: 0,
    shortDescription: "Download audio from YouTube using title or reply to video/audio",
    longDescription: "Use this command to convert a video/audio into MP3 and send back.",
    category: "media",
    guide: "{pn} <title>\nReply to audio/video for best result"
  },

  onStart: async function({ api, event, args }) {
    return handleAudioCommand(api, event, args);
  }
};