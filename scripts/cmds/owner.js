const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "owner",
    aliases: ["itachi", "creator"],
    version: "1.0",
    author: "Itachiffx",
    role: 0,
    shortDescription: { en: "Displays information about the bot's creator 🤫🗿🚬." },
    longDescription: { en: "Provides details about the bot's creator, including name, Facebook link, photo, and video. 🫵🏻😂💗" },
    category: "owner",
    guide: { en: "Use {p}owner to reveal the creator's details. 🤫🗿" },
    creatorDetails: {
      name: "Itachi",
      fbLink: "https://www.facebook.com/profile.php?id=100088286122703", // Updated FB link
      photoLink: "https://i.ibb.co/VWCRL3Rn/image.jpg", // ✅ New Image
      videoLink: "https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1735180380937-959.mp4",
    },
  },

  onStart: async function ({ api, event }) {
    try {
      const { creatorDetails } = this.config;

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const photoPath = path.join(cacheDir, "creator_photo.jpg");
      const photoResponse = await axios.get(creatorDetails.photoLink, { responseType: "arraybuffer" });
      await fs.outputFile(photoPath, photoResponse.data);

      const message = `Meet the Creator! 🫵🏻💗\n\nName: ${creatorDetails.name} 🗿\nFacebook: ${creatorDetails.fbLink} 🚬`;

      await api.sendMessage(
        {
          body: message,
          attachment: fs.createReadStream(photoPath),
        },
        event.threadID,
        async () => {
          try {
            const videoPath = path.join(cacheDir, "creator_video.mp4");
            const videoResponse = await axios.get(creatorDetails.videoLink, { responseType: "arraybuffer" });
            await fs.outputFile(videoPath, videoResponse.data);

            await api.sendMessage(
              {
                body: "Here's a short video of the creator! 😍💗",
                attachment: fs.createReadStream(videoPath),
              },
              event.threadID
            );

            try {
              await fs.unlink(photoPath);
              await fs.unlink(videoPath);
            } catch (cleanupError) {
              console.warn("Error cleaning up files:", cleanupError.message);
            }
          } catch (videoError) {
            console.error("Error fetching video:", videoError.message);
            await api.sendMessage("Failed to fetch the video. 🤫", event.threadID);
          }
        }
      );
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in Owner Command:`, error.message);
      await api.sendMessage("An error occurred while fetching the creator's details. 🤫", event.threadID);
    }
  },
};
