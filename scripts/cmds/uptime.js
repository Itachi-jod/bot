module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "1.2",
    author: "Lord Itachi",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Shows how long the bot has been active"
    },
    longDescription: {
      en: "Displays the total uptime in a fancy way"
    },
    category: "system",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event }) {
    const uptime = process.uptime(); // in seconds
    const days = Math.floor(uptime / (60 * 60 * 24));
    const hours = Math.floor((uptime % (60 * 60 * 24)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const msg = `🤍 𝗕𝗼𝘁 𝗦𝘁𝗮𝘁𝘂𝘀\n━━━━━━━━━━━━━━━\n📆 Days   : ${days}\n⏰ Hours  : ${hours}\n🕰️ Minutes: ${minutes}\n⏱️ Seconds: ${seconds}\n━━━━━━━━━━━━━━━\n✅ 𝗧𝗵𝗲 𝗯𝗼𝘁 𝗶𝘀 𝗿𝘂𝗻𝗻𝗶𝗻𝗴 𝘀𝗺𝗼𝗼𝘁𝗵𝗹𝘆!`;

    api.sendMessage(msg, event.threadID, event.messageID);
  }
};
