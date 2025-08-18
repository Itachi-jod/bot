const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "wholesome",
    aliases: ["ws"],
    version: "1.1",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "Wholesome profile effect",
    longDescription: "Generate a wholesome avatar for your crush/lover",
    category: "fun",
    guide: {
      en: "{pn} @tag"
    }
  },

  langs: {
    en: {
      noTag: "You must tag the person you want to make wholesome."
    }
  },

  onStart: async function ({ event, message, usersData }) {
    let avatarUrl;
    const uid1 = event.senderID;
    const uid2 = Object.keys(event.mentions)[0];

    if (event.type === "message_reply") {
      avatarUrl = await usersData.getAvatarUrl(event.messageReply.senderID);
    } else {
      if (!uid2) {
        avatarUrl = await usersData.getAvatarUrl(uid1);
      } else {
        avatarUrl = await usersData.getAvatarUrl(uid2);
      }
    }

    // API call with avatar as query
    const apiUrl = `https://wholesome-api-itachi.vercel.app/api/wholesome?avatar=${encodeURIComponent(avatarUrl)}`;

    // Download image to temp folder
    const imagePath = path.join(__dirname, "cache", `wholesome_${Date.now()}.jpg`);
    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(imagePath, response.data);

    // Send message with wholesome body + image
    message.reply({
      body: "「 is that true?🥰❤️ 」",
      attachment: fs.createReadStream(imagePath)
    }, () => {
      fs.unlinkSync(imagePath); // delete after sending
    });
  }
};
