const axios = require('axios');
const fs = require('fs');

module.exports = {
  config: {
    name: "marry",
    aliases: ["wife"],
    version: "1.2",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "Get a wife",
    category: "marry",
    guide: "{pn} <mention someone>"
  },

  onStart: async function ({ message, event, usersData }) {
    const mention = Object.keys(event.mentions);
    if (mention.length === 0) return message.reply("Please mention someone");

    try {
      let one, two;
      if (mention.length === 1) {
        one = event.senderID;
        two = mention[0];
      } else {
        one = mention[1];
        two = mention[0];
      }

      // Fetch avatars
      const av1 = await usersData.getAvatarUrl(one);
      const av2 = await usersData.getAvatarUrl(two);

      // API call
      const apiURL = `https://marry-api-itachi.vercel.app/api/marry?avatar1=${encodeURIComponent(av1)}&avatar2=${encodeURIComponent(av2)}`;
      const response = await axios.get(apiURL, { responseType: "arraybuffer" });

      // Save image
      const path = "marry.png";
      fs.writeFileSync(path, response.data);

      message.reply({ body: "「 Love you Babe🥰❤️ 」", attachment: fs.createReadStream(path) });

    } catch (err) {
      console.error(err.response ? err.response.data : err.message);
      message.reply("An error occurred while generating the image.");
    }
  }
};
