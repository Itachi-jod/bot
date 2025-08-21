const axios = require('axios');
const fs = require('fs');

module.exports = {
  config: {
    name: "squeeze",
    aliases: ["sq"],
    version: "1.2",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "Squeeze image with avatars",
    category: "18+",
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
      const apiURL = `https://squeeze-api-itachi.vercel.app/api/squeeze?avatar1=${encodeURIComponent(av1)}&avatar2=${encodeURIComponent(av2)}`;
      const response = await axios.get(apiURL, { responseType: "arraybuffer" });

      // Save image
      const path = "squeeze.png";
      fs.writeFileSync(path, response.data);
      message.reply({ body: "「 ohh No 🥺 」", attachment: fs.createReadStream(path) });

    } catch (err) {
      console.error(err.response ? err.response.data : err.message);
      message.reply("An error occurred while generating the image.");
    }
  }
};
