const moment = require("moment-timezone");

let sentTimes = {
  morning: false,
  afternoon: false,
  night: false
};

module.exports = {
  config: {
    name: "greet",
    version: "1.0",
    author: "Lord Itachi",
    role: 0,
    shortDescription: "Auto greetings and replies",
    longDescription: "Automatically sends Good Morning, Good Afternoon, and Good Night messages by Nepali time, and replies with a roast if someone greets.",
    category: "automation",
    guide: "No command needed. It works automatically."
  },

  onStart: async function () {
    const threadID = "9537555536312130"; // Replace with your actual threadID

    setInterval(async () => {
      const time = moment().tz("Asia/Kathmandu");
      const hour = time.hour();
      const minute = time.minute();

      // Reset daily flags at 3AM
      if (hour === 3 && minute === 0) {
        sentTimes = { morning: false, afternoon: false, night: false };
      }

      // 5:00 AM - Good Morning
      if (hour === 5 && minute === 0 && !sentTimes.morning) {
        global.api.sendMessage("Good morning everyone", threadID);
        sentTimes.morning = true;
      }

      // 12:00 PM - Good Afternoon
      if (hour === 12 && minute === 0 && !sentTimes.afternoon) {
        global.api.sendMessage("Good afternoon everyone", threadID);
        sentTimes.afternoon = true;
      }

      // 00:00 AM - Good Night
      if (hour === 0 && minute === 0 && !sentTimes.night) {
        global.api.sendMessage("Good night everyone", threadID);
        sentTimes.night = true;
      }

    }, 60 * 1000); // Check every minute
  },

  onChat: async function ({ event, api }) {
    const msg = (event.body || "").toLowerCase();
    if (msg.includes("good morning") || msg.includes("good night")) {
      return api.sendMessage("chup lagerw khurukkana sut muji🥰", event.threadID, event.messageID);
    }
  }
};
