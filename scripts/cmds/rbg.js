const axios = require("axios");

module.exports = {
  config: {
    name: "rbg",
    aliases: ["rmbg"],
    version: "1.0",
    role: 0,
    author: "MinatoCodes",
    countDown: 5,
    longDescription: "Remove background from images.",
    category: "image",
    guide: {
      en: "{pn} - Reply to an image to remove its background."
    }
  },
  onStart: async function ({ message, event }) {
    // Check if the user replied to a message with an image
    if (
      !event.messageReply ||
      !event.messageReply.attachments ||
      !event.messageReply.attachments[0] ||
      event.messageReply.attachments[0].type !== "photo"
    ) {
      return message.reply("❌| Please reply to an image to remove its background.");
    }

    const imgUrl = encodeURIComponent(event.messageReply.attachments[0].url);
    const apiUrl = `https://minato-rembg.vercel.app/api/rmbg?url=${imgUrl}`;

    try {
      // Request background removal from the API
      const response = await axios.get(apiUrl);

      if (!response.data || !response.data.url) {
        throw new Error("Invalid API response.");
      }

      const imageStream = await global.utils.getStreamFromURL(response.data.url, "bg-removed.png");

      // Send the image with background removed
      await message.reply({
        body: "✅| Here is your image with background removed:",
        attachment: imageStream,
      });
    } catch (error) {
      console.error("Error during background removal:", error);
      message.reply("❌| Failed to remove the background. Please try again later.");
    }
  },
};
