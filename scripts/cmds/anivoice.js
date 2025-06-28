const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "anivoice",
    aliases: [ "animevoice"],
    version: "1.1",
    author: "kshitiz (updated by minato)",
    description: "Sends a random anime voice from allowed categories",
    guide: "{pn}anivoice naruto",
    cooldowns: 5,
   
  },

  onStart: async function ({ args, api, event }) {
    const allowedCategories = ['jjk', 'naruto', 'ds', 'aot', 'bleach', 'onepiece'];
    const category = args[0]?.toLowerCase();

    if (!category || !allowedCategories.includes(category)) {
      return api.sendMessage(
        `Invalid category! Please choose one from the allowed list:\n${allowedCategories.join(", ")}`, 
        event.threadID,
        event.messageID // reply to user's message
      );
    }

    try {
      const response = await axios.get(`https://anivoice-opef.onrender.com/kshitiz/${category}`, {
        responseType: 'arraybuffer'
      });

      const tempFilePath = path.join(__dirname, 'temp_voice.mp3');
      fs.writeFileSync(tempFilePath, response.data);

      api.sendMessage(
        { 
          attachment: fs.createReadStream(tempFilePath)
        }, 
        event.threadID,
        () => {
          fs.unlinkSync(tempFilePath);
        },
        event.messageID // reply to user's message
      );
    } catch (error) {
      console.error(error);
      api.sendMessage(
        "Error fetching or sending voice audio.", 
        event.threadID,
        event.messageID // reply to user's message
      );
    }
  }
};