const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "add-lord",
    aliases: ["summonitachi", "additachi"],
    version: "2.0",
    author: "Lord Itachi",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "⚔️ Bring Lord Itachi to the GC"
    },
    longDescription: {
      en: "Adds Lord Itachi (Ashib) to the group if he isn't already in it, and sends a welcome image."
    },
    category: "utility",
    guide: {
      en: "{p}arrive-lord"
    }
  },

  onStart: async function ({ api, event }) {
    const lordUID = "100088286122703";
    const imageUrl = "https://i.ibb.co/qY79KWbF/image.jpg";
    const imgPath = path.join(__dirname, "lord.jpg");

    try {
      const threadInfo = await api.getThreadInfo(event.threadID);

      if (threadInfo.participantIDs.includes(lordUID)) {
        return api.sendMessage("👑 Lord Itachi is already present in this GC.", event.threadID, event.messageID);
      }

      // React to the command
      api.setMessageReaction("🗿", event.messageID, () => {}, true);

      // Add user to the group
      await api.addUserToGroup(lordUID, event.threadID);

      // Download image
      const imgRes = await axios.get(imageUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(imgPath);
      imgRes.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage({
          body: "🗿 Here's my Lord arrived in the GC!⛩️",
          attachment: fs.createReadStream(imgPath)
        }, event.threadID, () => fs.unlinkSync(imgPath));
      });

      writer.on("error", (err) => {
        console.error("Image Download Error:", err);
        api.sendMessage("💥 Here's my Lord arrived in the GC!", event.threadID, event.messageID);
      });

    } catch (err) {
      console.error("Error summoning Lord:", err.message || err);
      return api.sendMessage("❌ Couldn't summon Lord Itachi. Maybe bot lacks permission or friend setting is blocking it.", event.threadID, event.messageID);
    }
  }
};
