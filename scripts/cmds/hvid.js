const axios = require('axios');

module.exports = {
  config: {
    name: 'hvid',
    version: '1.0.69',
    author: 'MinatoCodes',
    role: 0,
    description: {
      en: 'Host your file (video, image, etc.) for free on GitHub.',
    },
    category: 'utility',
    guide: {
      en: '{p}hvid (reply with a file, e.g., video, image)',
    },
  },

  onStart: async function ({ message, api, event }) {
    api.setMessageReaction("✨", event.messageID, (err) => {}, true);
    try {
      if (!event.messageReply || !event.messageReply.attachments || !event.messageReply.attachments[0]) {
        return message.reply("Please reply to a file (e.g., video, image).");
      }

      const fileUrl = event.messageReply.attachments[0].url;
      const apiEndpoint = `https://hostvideo-api.vercel.app/api/upload?url=${encodeURIComponent(fileUrl)}`;
      const response = await axios.get(apiEndpoint);

      const fileRawUrl = response.data.url;
      message.reply(fileRawUrl);

    } catch (error) {
      console.error('Error hosting file:', error);
      message.reply('❌ Failed to host the file.');
    }
  },
};