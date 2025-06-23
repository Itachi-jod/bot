const { getTime } = global.utils;
if (!global.temp.welcomeEvent)
  global.temp.welcomeEvent = {};

module.exports = {
  config: {
    name: "welcome",
    version: "1.7",
    author: "NTKhang",
    category: "events"
  },

  langs: {
    vi: {
      session1: "sáng",
      session2: "trưa",
      session3: "chiều",
      session4: "tối",
      welcomeMessage: "Cảm ơn bạn đã mời tôi vào nhóm!\nPrefix bot: %1\nĐể xem danh sách lệnh hãy nhập: %1help",
      multiple1: "bạn",
      multiple2: "các bạn",
      defaultWelcomeMessage: "Xin chào {userName}.\nChào mừng bạn đến với {boxName}.\nChúc bạn có buổi {session} vui vẻ!"
    },
    en: {
      session1: "morning",
      session2: "noon",
      session3: "afternoon",
      session4: "evening",
      welcomeMessage: "Thank you for inviting me to the group!\nBot prefix: %1\nTo view the list of commands, please enter: %1help",
      multiple1: "you",
      multiple2: "you guys",
      defaultWelcomeMessage: ""
    }
  },

  onStart: async ({ threadsData, message, event, api, getLang }) => {
    if (event.logMessageType == "log:subscribe")
      return async function () {
        const hours = getTime("HH");
        const { threadID } = event;
        const { nickNameBot } = global.GoatBot.config;
        const prefix = global.utils.getPrefix(threadID);
        const dataAddedParticipants = event.logMessageData.addedParticipants;

        // If new member is bot
        if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
          if (nickNameBot)
            api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
          return; // Don't send welcome message to bot itself
        }

        // Setup temp cache if not exists
        if (!global.temp.welcomeEvent[threadID])
          global.temp.welcomeEvent[threadID] = {
            joinTimeout: null,
            dataAddedParticipants: []
          };

        // Add new members to list
        global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);

        // Clear old timeout if exists
        clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

        // Set new timeout
        global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
          const threadData = await threadsData.get(threadID);
          if (threadData.settings.sendWelcomeMessage == false)
            return;

          const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
          const dataBanned = threadData.data.banned_ban || [];
          const threadName = threadData.threadName;
          const userName = [];

          for (const user of dataAddedParticipants) {
            if (dataBanned.some((item) => item.id == user.userFbId))
              continue;
            userName.push(user.fullName);
          }

          if (userName.length == 0) return;

          // ❌ Do not send any welcome message or attachment
          delete global.temp.welcomeEvent[threadID];
        }, 1500);
      };
  }
};
