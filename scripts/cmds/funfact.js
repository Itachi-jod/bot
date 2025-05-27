const axios = require('axios');

module.exports = {
  config: {
    name: "funfact",
    aliases: ["fact"],
    version: "2.0",
    author: "Lord Itachi",
    countDown: 3,
    role: 0,
    shortDescription: {
      en: "Get a fun random fact"
    },
    longDescription: {
      en: "Fetch and display a random fun fact from the Lord Itachi's Fact API"
    },
    category: "fun",
    guide: {
      en: "{pn} - Get a random fun fact"
    }
  },

  onStart: async function ({ message }) {
    try {
      const response = await axios.get("https://fact-api-8k5i.onrender.com");

      const fact = response.data?.fact || response.data?.data?.fact || response.data?.data;

      if (!fact) {
        return message.reply("❌ Oops! Couldn't fetch a fact. Try again later.");
      }

      message.reply(
        `✨ 𝗙𝘂𝗻 𝗙𝗮𝗰𝘁 𝗼𝗳 𝘁𝗵𝗲 𝗗𝗮𝘆 ✨\n\n` +
        `🧠 ${fact}\n\n` +
        `©️ Powered by Itachi's API`
      );
    } catch (error) {
      console.error("FunFact Error:", error.message);
      message.reply("⚠️ Sorry, the fact server isn't responding right now. Try again soon.");
    }
  }
};
