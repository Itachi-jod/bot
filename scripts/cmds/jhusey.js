const axios = require("axios");

async function talkToJhusey(prompt) {
  try {
    const res = await axios.post("https://jhusey-ai.onrender.com/chat", {
      message: prompt
    });
    return res.data?.response || "No response from Jhusey.";
  } catch (err) {
    console.error("Jhusey AI error:", err.message);
    return "Jhusey is sleeping... try again later.🙂";
  }
}

module.exports = {
  config: {
    name: "jhusey",
    version: "2.0",
    author: "Lord Itachi",
    role: 0,
    shortDescription: "Chat with Jhusey AI",
    longDescription: "Just mention 'jhusey' and it will reply!",
    category: "ai",
    guide: {
      en: "Just type anything with 'jhusey' in the message"
    }
  },

  // Dummy onStart to avoid install error
  onStart: async function () {},

  onChat: async function ({ message, event }) {
    const content = event.body?.toLowerCase() || "";
    if (!content.includes("jhusey")) return;

    const prompt = content.replace(/jhusey/gi, "").trim();
    if (!prompt) return message.reply("Yes? What would you like to ask?");

    const reply = await talkToJhusey(prompt);
    message.reply(reply, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: module.exports.config.name,
        uid: event.senderID
      });
    });
  },

  onReply: async function ({ message, args, event, Reply }) {
    if (event.senderID !== Reply.uid) return;

    const prompt = args.join(" ");
    if (!prompt) return;

    const reply = await talkToJhusey(prompt);
    message.reply(reply, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: module.exports.config.name,
        uid: event.senderID
      });
    });
  }
};
