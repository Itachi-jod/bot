const axios = require("axios");

module.exports = {
  config: {
    name: "welcomeimage",
    version: "1.0",
    author: "MinatoCodes",
    description: "Send welcome image when a member joins",
    category: "events"
  },

  onStart: async function () {},

  onEvent: async function ({ api, event, usersData }) {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, logMessageData } = event;
    const { getStreamFromURL } = global.utils;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const gcname = threadInfo.threadName || "this group";
      const memberCount = threadInfo.participantIDs.length;
      const addedParticipants = logMessageData.addedParticipants;

      for (const participant of addedParticipants) {
        const uid = participant.userFbId;

        // Get user name
        const userInfo = await api.getUserInfo(uid);
        const name = userInfo[uid]?.name || "New Member";

        // Get HD profile picture using Goatbot's usersData
        const pfpUrl = await usersData.getAvatarUrl(uid);

        // Build welcome image API URL
        const imageUrl = `https://setwelcome-pic-api.vercel.app/api/pic?` +
          `url=${encodeURIComponent(pfpUrl)}&` +
          `num=${memberCount}&` +
          `name=${encodeURIComponent(name)}&` +
          `gcname=${encodeURIComponent(gcname)}`;

        // Fetch image stream
        const imageStream = await getStreamFromURL(imageUrl);

        // Send image only (no text)
        await api.sendMessage({ attachment: imageStream }, threadID);
      }

    } catch (err) {
      console.error("❌ Error in welcomeimage.js:", err);
    }
  }
};
