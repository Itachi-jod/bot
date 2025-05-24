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
    longDescription: "Ask anything to Jhusey AI powered by Gemini",
    category: "ai",
    guide: {
      en: "{p}jhusey [your message]"
    }
  },

  onStart: async function ({ message, args, event }) {
    const prompt = args.join(" ");
    if (!prompt) return message.reply("Please enter your message.\nExample: jhusey What is love?");

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
