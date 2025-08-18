const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "mistake",
    aliases: ["msk"],
    version: "1.1",
    author: "MinatoCodes",
    countDown: 5,
    role: 0,
    shortDescription: "Mistake profile image",
    longDescription: "Generate a Mistake effect profile image",
    category: "image",
    guide: {
      en: "{pn} @tag"
    }
  },

  langs: {
    en: {
      noTag: "You must tag the person you want to get profile picture of"
    }
  },

  onStart: async function ({ event, message, usersData }) {
    let avt;
    const uid1 = event.senderID;
    const uid2 = Object.keys(event.mentions)[0];

    if (event.type === "message_reply") {
      avt = await usersData.getAvatarUrl(event.messageReply.senderID);
    } else {
      if (!uid2) {
        avt = await usersData.getAvatarUrl(uid1);
      } else {
        avt = await usersData.getAvatarUrl(uid2);
      }
    }

    // API call with avatar as query
    const apiUrl = `https://mistake-api.vercel.app/api/mistake?avatar=${encodeURIComponent(avt)}`;

    // Download image to temp folder
    const imagePath = path.join(__dirname, "cache", `mistake_${Date.now()}.jpg`);
    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(imagePath, response.data);

    // Send message with fixed body + image
    message.reply({
      body: "「The Biggest Mistake」",
      attachment: fs.createReadStream(imagePath)
    }, () => {
      fs.unlinkSync(imagePath); // delete after sending
    });
  }
};
