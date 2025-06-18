const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "mlbb",
    aliases: [],
    author: "Vex_Kshitiz",
    version: "1.0",
    cooldowns: 5,
    role: 0,
    shortDescription: "",
    longDescription: "Get information about a Mobile Legends: Bang Bang hero.",
    category: "fun",
    guide: "{p}mlbb {heroName}",
  },

  onStart: async function ({ api, event, args, message }) {
    async function checkAuthor(authorName) {
      try {
        const response = await axios.get('https://author-check.vercel.app/name');
        const apiAuthor = response.data.name;
        return apiAuthor === authorName;
      } catch (error) {
        console.error("Error checking author:", error);
        return false;
      }
    }

    const isAuthorValid = await checkAuthor(module.exports.config.author);
    if (!isAuthorValid) {
      await message.reply("Author changer alert! This command belongs to Vex_Kshitiz.");
      return;
    }

    const heroName = args.join(" ");
    if (!heroName) {
      message.reply("Please provide a hero name.");
      return;
    }

    const mlbbApiUrl = `https://bang-bang.vercel.app/mlbb?hero=${encodeURIComponent(heroName)}`;

    try {
      const response = await axios.get(mlbbApiUrl);
      const { title, description, image, info } = response.data;

      const infoText = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      const messageBody = `Hero: ${title}\n\nDescription: ${description}\n\n${infoText}`;

      const tempImagePath = path.join(__dirname, "cache", `${Date.now()}_${title}.jpg`);

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempImagePath);
        writer.on("finish", resolve);
        writer.on("error", reject);
        axios.get(image, { responseType: "stream" }).then(imageResponse => {
          imageResponse.data.pipe(writer);
        }).catch(reject);
      });

      const stream = fs.createReadStream(tempImagePath);
      message.reply({
        body: messageBody,
        attachment: stream,
      }, (err) => {
        if (err) console.error(err);
        fs.unlink(tempImagePath, (err) => {
          if (err) console.error(`Error deleting temp file: ${err}`);
        });
      });

    } catch (error) {
      console.error(error);
      message.reply("Sorry, an error occurred while processing your request.");
    }
  }
};
