module.exports = {
  config: {
    name: "reverse",
    aliases: ["rev"],
    version: "1.0",
    author: "Lord Itachi",
    countDown: 3,
    role: 0,
    shortDescription: {
      en: "Reverse any message"
    },
    longDescription: {
      en: "Reverses the given text and sends it back"
    },
    category: "fun",
    guide: {
      en: "{pn} your text here"
    }
  },

  onStart: async function ({ api, event, args }) {
    if (!args[0]) {
      return api.sendMessage("⚠️ Please provide some text to reverse.\n\nExample:\nreverse I love you", event.threadID, event.messageID);
    }

    const input = args.join(" ");
    const reversed = input.split("").reverse().join("");
    
    const msg = `🔁 Reversed Text:\n${reversed}`;
    api.sendMessage(msg, event.threadID, event.messageID);
  }
};
