const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActivityType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".";

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'Owned by Nex',
      type: ActivityType.Custom
    }]
  });
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // steal emoji
  if (cmd === "steal") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission");

    const emoji = args[0];
    const name = args[1];

    if (!emoji || !name)
      return message.reply("Usage: .steal <emoji> <name>");

    const regex = /<?a?:\w+:(\d+)>?/;
    const match = emoji.match(regex);

    if (!match) return message.reply("Invalid emoji");

    const emojiID = match[1];
    const animated = emoji.startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? "gif" : "png"}`;

    try {
      const newEmoji = await message.guild.emojis.create({
        attachment: url,
        name: name
      });

      message.reply(`Created emoji ${newEmoji.name}`);
    } catch (err) {
      console.error(err);
      message.reply("Failed to add emoji");
    }
  }

  // steal sticker (reply required)
  if (cmd === "stealsticker") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission");

    const name = args[0];
    if (!name)
      return message.reply("Usage: .stealsticker <name> (reply to a sticker)");

    const replied = await message.fetchReference().catch(() => null);
    if (!replied)
      return message.reply("Reply to a message with a sticker");

    const sticker = replied.stickers.first();
    if (!sticker)
      return message.reply("No sticker found");

    try {
      const newSticker = await message.guild.stickers.create({
        file: sticker.url,
        name: name,
        tags: "stolen"
      });

      message.reply(`Created sticker ${newSticker.name}`);
    } catch (err) {
      console.error(err);
      message.reply("Failed to add sticker");
    }
  }
});

client.login(process.env.TOKEN); 
