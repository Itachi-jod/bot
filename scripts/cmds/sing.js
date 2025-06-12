const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const ytSearch = require("yt-search");

const CACHE_FOLDER = path.join(__dirname, "cache");

async function downloadAudio(videoId, filePath) {
    const url = `https://mr-kshitizyt-hfhj.onrender.com/download?id=${videoId}`;
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
    });

    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}

async function fetchAudioFromReply(event) {
    const attachment = event.messageReply?.attachments?.[0];
    if (!attachment || (attachment.type !== "video" && attachment.type !== "audio")) {
        throw new Error("⚠️ | Please reply to a valid video or audio attachment.");
    }

    const shortUrl = attachment.url;
    const response = await axios.get(`https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(shortUrl)}`);
    return response.data.title;
}

async function fetchAudioFromQuery(query) {
    const results = await ytSearch(query);
    if (results?.videos?.length > 0) {
        const video = results.videos[0];
        return {
            videoId: video.videoId,
            title: video.title,
            duration: video.timestamp || "Unknown"
        };
    } else {
        throw new Error("❌ | No results found for the given query.");
    }
}

async function handleAudioCommand(api, event, args) {
    const { threadID, messageID, messageReply } = event;
    await fs.ensureDir(CACHE_FOLDER);
    api.setMessageReaction("🕢", messageID, () => {}, true);

    try {
        let videoData;

        if (messageReply?.attachments?.length > 0) {
            const title = await fetchAudioFromReply(event);
            videoData = await fetchAudioFromQuery(title);
        } else if (args.length > 0) {
            const query = args.join(" ");
            videoData = await fetchAudioFromQuery(query);
        } else {
            return api.sendMessage("⚠️ | Please provide a query or reply to a video/audio attachment.", threadID, messageID);
        }

        const { videoId, title, duration } = videoData;
        const filePath = path.join(CACHE_FOLDER, `${videoId}.mp3`);
        await downloadAudio(videoId, filePath);

        const stats = fs.statSync(filePath);
        if (stats.size > 25 * 1024 * 1024) {
            fs.unlinkSync(filePath);
            return api.sendMessage("⚠️ | Audio file is too large to send (>25MB).", threadID, messageID);
        }

        api.sendMessage({
            body: `🎶 Title: ${title}\n⏱ Duration: ${duration}`,
            attachment: fs.createReadStream(filePath)
        }, threadID, () => fs.unlink(filePath), messageID);

        api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (error) {
        console.error("❌ Error:", error.message || error);
        api.setMessageReaction("❌", messageID, () => {}, true);
        api.sendMessage("❌ | An error occurred while processing your request.", threadID, messageID);
    }
}

module.exports = {
    config: {
        name: "sing",
        version: "1.3",
        author: "It's Kshitiz (updated by Lord Itachi)",
        countDown: 10,
        role: 0,
        shortDescription: "Download and send audio from YouTube",
        longDescription: "Downloads audio from YouTube using a query or from a video/audio reply, and sends it with duration info",
        category: "music",
        guide: "{p}sing [song name] or reply to a video/audio",
    },

    onStart({ api, event, args }) {
        return handleAudioCommand(api, event, args);
    }
};
