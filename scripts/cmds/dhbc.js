const axios = require("axios");
const { getStreamFromURL } = global.utils;

module.exports = {
	config: {
		name: "dhbc",
		version: "2.0",
		author: "NTKhang + Modified by Denish",
		countDown: 5,
		role: 0,
		description: {
			vi: "Chơi game đoán nhân vật anime",
			en: "Play anime character guessing game"
		},
		category: "game",
		guide: {
			en: "{pn}"
		},
		envConfig: {
			reward: 1000
		}
	},

	langs: {
		vi: {
			reply: "Hãy reply tin nhắn này với tên nhân vật anime (chỉ tên đầu tiên):",
			notPlayer: "⚠️ Bạn không phải là người chơi của câu hỏi này",
			correct: "🎉 Chính xác! Bạn nhận được %1$",
			wrong: "❌ Sai rồi! Đáp án đúng là: %1"
		},
		en: {
			reply: "Please reply this message with the anime character's first name:",
			notPlayer: "⚠️ You are not the player of this question",
			correct: "🎉 Correct! You received %1$",
			wrong: "❌ Wrong! The correct answer was: %1"
		}
	},

	onStart: async function ({ message, event, commandName, getLang }) {
		try {
			const res = await axios.get("https://random-animel.vercel.app/api/random-character");
			const char = res.data.character;
			const firstName = char.name.split(" ")[0];

			message.reply({
				body: getLang("reply"),
				attachment: await getStreamFromURL(char.images.jpg)
			}, (err, info) => {
				if (err) return;
				global.GoatBot.onReply.set(info.messageID, {
					commandName,
					messageID: info.messageID,
					author: event.senderID,
					character: char,
					firstName
				});
			});
		} catch (e) {
			message.reply("⚠️ Failed to fetch anime character.");
		}
	},

	onReply: async function ({ message, Reply, event, getLang, usersData, envCommands, commandName, api }) {
		const { author, messageID, character, firstName } = Reply;
		if (event.senderID != author)
			return message.reply(getLang("notPlayer"));

		// Delete the image question
		api.unsendMessage(messageID);

		// Check answer (only first name, case-insensitive)
		const userAns = formatText(event.body.trim().split(" ")[0]);
		const correct = formatText(firstName);

		global.GoatBot.onReply.delete(messageID);

		if (userAns === correct) {
			await usersData.addMoney(event.senderID, envCommands[commandName].reward);
			message.reply(getLang("correct", envCommands[commandName].reward));
		} else {
			message.reply(getLang("wrong", character.name));
		}
	}
};

function formatText(text) {
	return text.normalize("NFD")
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[đ|Đ]/g, (x) => x == "đ" ? "d" : "D");
}
