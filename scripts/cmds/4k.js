const axios = require("axios");

module.exports = {
  config: {
    name: "4k",
    aliases: ["upscale"],
    version: "1.3",
    role: 0,
    author: "ItachiInx1de",
    countDown: 5,
    longDescription: "Upscale images to 4K resolution.",
    category: "image",
    guide: {
      en: "{pn} - Reply to an image to upscale it to 4K resolution."
    }
  },
  onStart: async function ({ message, event }) {
    if (
      !event.messageReply ||
      !event.messageReply.attachments ||
      !event.messageReply.attachments[0] ||
      event.messageReply.attachments[0].type !== "photo"
    ) {
      return message.reply("❌| Please reply to an image to upscale it.");
    }

    const imgUrl = encodeURIComponent(event.messageReply.attachments[0].url);
    const apiUrl = `https://4k-api.vercel.app/api/upscale?url=${imgUrl}`;

    const processingMsg = await message.reply("🔄| Processing... Please wait a moment.");

    try {
      const imageStream = await global.utils.getStreamFromURL(apiUrl, "upscaled-image.png");

      await message.reply({
        body: "✅| Here is your 4K upscaled image:",
        attachment: imageStream
      });

      if (processingMsg.messageID) {
        await message.unsend(processingMsg.messageID);
      }
    } catch (error) {
      console.error("Error during image upscaling:", error);
      message.reply("❌| Failed to upscale your image. Please try again later.");
    }
  },
};
