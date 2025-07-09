const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

module.exports = {
  config: {
    name: "help",
    version: "2.1",
    author: "Itachi Sensei ",
    countDown: 5,
    role: 0,
    shortDescription: { en: "View all commands and their usage" },
    longDescription: { en: "Shows a list of all available commands or details of a specific command." },
    category: "info",
    guide: { en: "{pn} [command]" },
    priority: 1,
  },

  onStart: async function ({ message, args, event, threadsData, role }) {
    const { threadID } = event;
    const prefix = getPrefix(threadID);

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

      const helpListImage = "https://i.ibb.co/YFP565g4/image.jpg";
      await message.reply({
        body: msg,
        attachment: await global.utils.getStreamFromURL(helpListImage),
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