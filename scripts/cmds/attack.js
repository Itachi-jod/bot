const fs = require("fs");
const path = require("path");
const axios = require("axios");
const warJsonPath = path.join(__dirname, "atck.json");

function readWarJson() {
  try {
    return JSON.parse(fs.readFileSync(warJsonPath, "utf8"));
  } catch {
    return {};
  }
}

function writeWarJson(data) {
  fs.writeFileSync(warJsonPath, JSON.stringify(data, null, 2));
}

let t = [];
const warData = readWarJson();
if (warData.uids) t = warData.uids;

const permissions = ["100088286122703"];

module.exports = {
  config: {
    name: "attack",
    version: "3.0",
    author: "Lord Itachi",
    countDown: 5,
    role: 0,
    shortDescription: "Roast attack someone automatically",
    longDescription: "Auto attacks with insults when a specific UID chats",
    category: "fun",
    guide: {
      en: "{p}attack on <uid> — enable roast\n{p}attack off <uid> — disable roast"
    },
  },

  onStart: async function ({ api, event, args }) {
    const subCommand = args[0];
    const userId = event.senderID.toString();

    if (!permissions.includes(userId)) {
      return api.sendMessage("❌ You don't have permission.", event.threadID, event.messageID);
    }

    if (subCommand === "on") {
      const uidToAdd = args[1];
      if (!uidToAdd) return api.sendMessage("⚠️ Please provide a UID.", event.threadID, event.messageID);

      if (!t.includes(uidToAdd)) {
        t.push(uidToAdd);
        writeWarJson({ uids: t });
      }

      return api.sendMessage(`😈 Roast enabled for UID: ${uidToAdd}`, event.threadID, event.messageID);
    }

    if (subCommand === "off") {
      const uidToRemove = args[1];
      if (!uidToRemove) return api.sendMessage("⚠️ Provide UID to stop.", event.threadID, event.messageID);

      t = t.filter(uid => uid !== uidToRemove);
      writeWarJson({ uids: t });

      return api.sendMessage(`👿 Roast disabled for UID: ${uidToRemove}`, event.threadID, event.messageID);
    }

    return api.sendMessage("😈 Usage: attack on/off <uid>", event.threadID, event.messageID);
  },

  onChat: async function ({ api, event }) {
    const sender = event.senderID.toString();
    if (!t.includes(sender)) return;

    try {
      // Try your custom API first
      const res = await axios.get("https://attack-api.onrender.com", {
        timeout: 4000,
        headers: { Accept: "text/plain" }
      });

      const roast = res.data?.trim();
      if (!roast) throw new Error("Empty roast");

      return api.sendMessage(roast, event.threadID, event.messageID);
    } catch {
      // Fallback to evilinsult.com
      try {
        const fallback = await axios.get("https://evilinsult.com/generate_insult.php?lang=en&type=json");
        const insult = fallback.data.insult;

        return api.sendMessage(insult, event.threadID, event.messageID);
      } catch (err2) {
        return api.sendMessage("❌ Both APIs failed. Try again later.", event.threadID, event.messageID);
      }
    }
  }
};
