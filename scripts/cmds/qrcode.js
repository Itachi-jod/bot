const axios = require("axios");

module.exports = {
  config: {
    name: "qrcode",
    version: "1.0",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Generate a QR code from text or a link"
    },
    longDescription: {
      en: "Generates a QR code image from any given text or URL."
    },
    category: "image",
    guide: {
      en: "{pn} <text or link>\nExample: {pn} Hello World"
    }
  },

  onStart: async function ({ message, args }) {
    if (!args[0]) {
      return message.reply("❌ | Please provide text or a URL to generate a QR code.");
    }

    const text = encodeURIComponent(args.join(" "));
    const apiUrl = `https://text-qr.vercel.app/?url=${text}`;

    try {
      // Get QR image as a stream
      const imageStream = await global.utils.getStreamFromURL(apiUrl, "qrcode.png");

      await message.reply({
        body: `✅ | Here is your QR code for:\n${decodeURIComponent(text)}`,
        attachment: imageStream
      });
    } catch (err) {
      console.error(err);
      message.reply("❌ | Failed to generate QR code. Please try again later.");
    }
  }
};
