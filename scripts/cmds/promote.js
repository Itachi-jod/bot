module.exports = {
 config: {
 name: "promote",
 aliases: ["modme", "makeadmin"],
 version: "1.0",
 author: "MinatoCodes",
 cooldown: 5,
 description: "Promote the user to group admin (bot admin only)",
 usage: "promote",
 category: "group",
 permissions: [1] // Bot admin only
 },

 onStart: async function ({ api, event, usersData }) {
 const threadID = event.threadID;
 const senderID = event.senderID;

 try {
 const threadInfo = await api.getThreadInfo(threadID);
 const botID = api.getCurrentUserID();

 // 1. Check if bot is group admin
 const botIsAdmin = threadInfo.adminIDs.some(admin => admin.id == botID);
 if (!botIsAdmin) {
 return api.sendMessage(
 "❌ I need to be a group admin to promote users.",
 threadID,
 event.messageID
 );
 }

 // 2. Check if sender is already group admin
 const senderIsAdmin = threadInfo.adminIDs.some(admin => admin.id == senderID);
 if (senderIsAdmin) {
 return api.sendMessage(
 "⚠️ You are already a group admin.",
 threadID,
 event.messageID
 );
 }

 // 3. Promote sender to group admin
 await api.changeAdminStatus(threadID, senderID, true);
 const name = await usersData.getName(senderID);
 return api.sendMessage(
 `✅ ${name}, you have been promoted to group admin.`,
 threadID,
 event.messageID
 );
 } catch (err) {
 console.error("Promote command error:", err);
 return api.sendMessage(
 "❌ Failed to promote you. Please try again later.",
 threadID,
 event.messageID
 );
 }
 }
};