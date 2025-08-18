const axios = require('axios');
const jimp = require("jimp");
const fs = require("fs");

module.exports = {
  config: {
    name: "wholesome",
    aliases: ["ws"],
    version: "1.0",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: "wholesome",
    longDescription: "wholesome avatar for crush/lover",
    category: "fun",
    guide: ""
  },

  onStart: async function ({ message, event, args }) {
    const mention = Object.keys(event.mentions);
    if (mention.length == 0) {
      return message.reply("You must tag a person.");
    }

    let one = mention[0]; // only use the first mention

    try {
      const imagePath = await bal(one);
      await message.reply({
        body: "「 is that true?🥰❤️ 」",
        attachment: fs.createReadStream(imagePath)
      });
      fs.unlinkSync(imagePath); // cleanup after sending
    } catch (error) {
      console.error("Error while running wholesome cmd:", error);
      await message.reply("An error occurred.");
    }
  }
};

async function bal(one) {
  // using the token you gave me
  const fbAvatarUrl = `https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991cbd5e562`;

  const avatar = await jimp.read(fbAvatarUrl);
  const template = await jimp.read("https://i.imgur.com/BnWiVXT.jpg");

  template.resize(512, 512).composite(avatar.resize(173, 173), 70, 186);

  const outPath = pathFile("wholesome.jpeg");
  await template.writeAsync(outPath);

  return outPath;
}

function pathFile(filename) {
  return __dirname + "/" + filename;
    }
