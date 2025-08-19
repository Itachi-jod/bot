const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "us",
    aliases: ["together"],
    version: "1.1",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "We together",
    longDescription: "Generate a couple avatar effect for you and your crush/lover",
    category: "love",
    guide: {
      en: "{pn} @tag"
    }
  },

  langs: {
    en: {
      noTag: "You must tag someone to generate the image."
    }
  },

  onStart: async function ({ event, message, usersData }) {
    const mention = Object.keys(event.mentions);

    if (mention.length === 0) {
      return message.reply(this.langs.en.noTag);
    }

    let uid1, uid2;
    if (mention.length === 1) {
      uid1 = event.senderID;
      uid2 = mention[0];
    } else {
      uid1 = mention[1];
      uid2 = mention[0];
    }

    // Get avatars
    const avatar1 = await usersData.getAvatarUrl(uid1);
    const avatar2 = await usersData.getAvatarUrl(uid2);

    // API call
    const apiUrl = `https://us-api-itachi.vercel.app/api/us?avatar1=${encodeURIComponent(avatar1)}&avatar2=${encodeURIComponent(avatar2)}`;

    // Save image temporarily
    const imagePath = path.join(__dirname, "cache", `us_${Date.now()}.jpg`);
    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(imagePath, response.data);

    // Send and auto-delete
    message.reply({
      body: "Just You And Me<3",
      attachment: fs.createReadStream(imagePath)
    }, () => {
      fs.unlinkSync(imagePath);
    });
  }
};
