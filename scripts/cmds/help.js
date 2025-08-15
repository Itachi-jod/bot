const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

module.exports = {
  config: {
    name: "help",
    version: "2.2",
    author: "ItachiInx1de",
    countDown: 5,
    role: 0,
    shortDescription: { en: "View all commands and their usage" },
    longDescription: { en: "Shows a list of all available commands or details of a specific command." },
    category: "info",
    guide: { en: "{pn} [command]" },
    priority: 1,
  },

  onStart: async function ({ message, args, event, role }) {
    const { threadID } = event;
    const prefix = getPrefix(threadID);
    const tempFiles = [];

    // Random search list
    const searchList = ["zoro", "madara", "obito", "luffy", "itachi", "tanjiro", "akaza", "nezuko", "muzan", "sukuna", "goku", "senpai"];
    const randomSearch = searchList[Math.floor(Math.random() * searchList.length)];

    try {
      // Fetch a random image from your Pinterest API
      const apiUrl = `https://pin-api-itachi.vercel.app/api/pinterest?q=${encodeURIComponent(randomSearch)}`;
      const res = await axios.get(apiUrl, { timeout: 15000 });
      const images = extractImageUrls(res.data);

      let helpImageStream = null;
      if (images.length > 0) {
        const randomImageUrl = images[Math.floor(Math.random() * images.length)];
        const imgResponse = await axios.get(randomImageUrl, { responseType: "arraybuffer" });
        const cacheDir = path.join(__dirname, "cache");
        await fs.ensureDir(cacheDir);
        const imgPath = path.join(cacheDir, `help_${Date.now()}.jpg`);
        await fs.outputFile(imgPath, imgResponse.data);
        tempFiles.push(imgPath);
        helpImageStream = fs.createReadStream(imgPath);
      }

      if (args.length === 0) {
        const categories = {};
        let msg = "╔════════════╗\n";
        msg += "║        HELP MENU        ║\n";
        msg += "╚════════════╝\n";

        for (const [name, value] of commands) {
          if (value.config.role > 1 && role < value.config.role) continue;
          const category = value.config.category || "Uncategorized";
          categories[category] = categories[category] || [];
          categories[category].push(name);
        }

        for (const [category, cmds] of Object.entries(categories)) {
          msg += `\n╭───── ${category.toUpperCase()} ────\n`;
          cmds.sort().forEach(cmd => {
            msg += `│ →${cmd}\n`;
          });
          msg += `╰─────────────\n`;
        }

        msg += "╔═════════════╗\n";
        msg += `║ Total commands: ${commands.size}\n`;
        msg += `║ Type "${prefix}help [command]" for details.\n`;
        msg += "╚═════════════╝\n";
        msg += "┌─────────────┐\n";
        msg += "│ Created by Itachi Sensei\n";
        msg += "└─────────────┘";

        await message.reply({
          body: msg,
          attachment: helpImageStream || null,
        });

      } else {
        const commandName = args[0].toLowerCase();
        const command = commands.get(commandName) || commands.get(aliases.get(commandName));

        if (!command) {
          await message.reply(`Command "${commandName}" not found.`);
          return;
        }

        const config = command.config;
        const usage = (config.guide?.en || "No guide available")
          .replace(/{p}/g, prefix)
          .replace(/{n}/g, config.name);

        const detail = `
╔══════════════╗
🔹 *Command:* ${config.name}
📖 *Description:* ${config.longDescription?.en || "No description"}
📝 *Aliases:* ${config.aliases?.join(", ") || "None"}
⚡ *Version:* ${config.version || "1.0"}
👤 *Author:* ${config.author || "Unknown"}
🔑 *Role:* ${roleTextToString(config.role)}
⏳ *Cooldown:* ${config.countDown || 1}s
├───────────────

💡 *Usage:*
${usage}
├───────────────
<text> = required | [a|b|c] = choose one
╚══════════════╝
`;

        await message.reply(detail);
      }
    } catch (err) {
      console.error(`[HELP] Error: ${err.message}`);
      await message.reply(`❌ | Error fetching help or image: ${err.message}`);
    } finally {
      for (const file of tempFiles) {
        try { await fs.unlink(file); } catch {}
      }
    }
  },
};

function roleTextToString(role) {
  switch (role) {
    case 0: return "All users";
    case 1: return "Group admins";
    case 2: return "Bot admins";
    default: return "Unknown";
  }
}

// Extract image URLs safely from your API response
function extractImageUrls(data) {
  const urls = new Set();

  function addIfValid(u) {
    if (typeof u === "string" && /^https?:\/\//.test(u)) urls.add(u);
  }

  function walk(obj) {
    if (!obj) return;
    if (Array.isArray(obj)) obj.forEach(walk);
    else if (typeof obj === "object") {
      if (obj.url) addIfValid(obj.url);
      if (obj.image_url) addIfValid(obj.image_url);
      Object.values(obj).forEach(walk);
    } else if (typeof obj === "string") addIfValid(obj);
  }

  walk(data);
  return Array.from(urls);
                                                 }
