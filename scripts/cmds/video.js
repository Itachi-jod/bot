const axios = require("axios");
const fs = require('fs-extra');
const path = require('path');
const { getStreamFromURL, shortenURL, randomString } = global.utils;

async function video(api, event, args, message) {
    api.setMessageReaction("⏰", event.messageID, () => {}, true);
    try {
        let title = '';
        let shortUrl = '';
        let videoId = '';

        const extractShortUrl = async () => {
            const attachment = event.messageReply.attachments[0];
            if (attachment.type === "video" || attachment.type === "audio") {
                return attachment.url;
            } else {
                throw new Error("Invalid attachment type.");
            }
        };

        if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
            shortUrl = await extractShortUrl();
            const musicRecognitionResponse = await axios.get(`https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(shortUrl)}`);
            title = musicRecognitionResponse.data.title;

            const searchResponse = await axios.get(`https://youtube-kshitiz-gamma.vercel.app/yt?search=${encodeURIComponent(title)}`);
            if (searchResponse.data.length > 0) {
                videoId = searchResponse.data[0].videoId;
            }

            shortUrl = await shortenURL(shortUrl);
        } else if (args.length === 0) {
            message.reply("Please provide a video name or reply to a video or audio attachment.");
            return;
        } else {
            title = args.join(" ");
            const searchResponse = await axios.get(`https://youtube-kshitiz-gamma.vercel.app/yt?search=${encodeURIComponent(title)}`);
            if (searchResponse.data.length > 0) {
                videoId = searchResponse.data[0].videoId;
            }
        }

        if (!videoId) {
            message.reply("No video found for the given query.");
            return;
        }

        const downloadResponse = await axios.get(`https://youtube-minato-lamda.vercel.app/api/download?videoId=${encodeURIComponent(videoId)}`);
        const videoData = downloadResponse.data.downloadResult.response["720p"];
        const videoUrl = videoData.download_url;
        const videoTitle = videoData.title;

        if (!videoUrl) {
            message.reply("Failed to retrieve download link for the video.");
            return;
        }

        const filePath = path.join(__dirname, "cache", `${videoId}.mp4`);
        const writer = fs.createWriteStream(filePath);
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        writer.on('finish', () => {
            const videoStream = fs.createReadStream(filePath);
            message.reply({ body: `📹 Playing: ${videoTitle}`, attachment: videoStream });
            api.setMessageReaction("✅", event.messageID, () => {}, true);
        });

        writer.on('error', (error) => {
            console.error("Error:", error);
            message.reply("Error downloading the video.");
        });

    } catch (error) {
        console.error("Error:", error);
        message.reply("An error occurred.");
    }
}

module.exports = {
    config: {
        name: "video", 
        version: "1.2",
        author: "Minato",
        countDown: 10,
        role: 0,
        shortDescription: "play video from youtube",
        longDescription: "play video from youtube with support for audio recognition.",
        category: "music",
        guide: "{p}video <videoname> or reply to audio/video" 
    },
    onStart: function ({ api, event, args, message }) {
        return video(api, event, args, message);
    }
};