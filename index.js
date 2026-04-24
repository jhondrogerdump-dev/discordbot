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
  console.log(`✅ Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'Owned by Nex',
      type: ActivityType.Custom
    }]
  });
});

// 📩 MESSAGE COMMANDS
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // 🔨 BAN
  if (cmd === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("No permission.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention a user.");

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("User not found.");

    await member.ban();
    message.reply(`🔨 Banned ${user.tag}`);
  }

  // 👢 KICK
  if (cmd === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("No permission.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention a user.");

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("User not found.");

    await member.kick();
    message.reply(`👢 Kicked ${user.tag}`);
  }

  // ⏱ TIMEOUT
  if (cmd === "timeout") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("No permission.");

    const user = message.mentions.users.first();
    const minutes = parseInt(args[1]);

    if (!user || isNaN(minutes))
      return message.reply("Usage: .timeout @user 5");

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("User not found.");

    await member.timeout(minutes * 60 * 1000);
    message.reply(`⏱ Timed out ${user.tag} for ${minutes} min`);
  }

  // 🧹 CLEAR
  if (cmd === "clear") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return message.reply("No permission.");

    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100)
      return message.reply("1–100 only.");

    await message.channel.bulkDelete(amount, true);
    message.channel.send(`🧹 Deleted ${amount}`).then(msg => {
      setTimeout(() => msg.delete(), 3000);
    });
  }

  // 😈 STEAL EMOJI
  if (cmd === "steal") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission.");

    const emoji = args[0];
    const name = args[1];

    if (!emoji || !name)
      return message.reply("Usage: .steal <emoji> <name>");

    const regex = /<?a?:\w+:(\d+)>?/;
    const match = emoji.match(regex);

    if (!match) return message.reply("Invalid emoji.");

    const emojiID = match[1];
    const animated = emoji.startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? "gif" : "png"}`;

    try {
      const newEmoji = await message.guild.emojis.create({
        attachment: url,
        name: name
      });

      message.reply(`✅ Stole emoji: <${animated ? "a" : ""}:${newEmoji.name}:${newEmoji.id}>`);
    } catch (err) {
      console.error(err);
      message.reply("Failed to steal emoji.");
    }
  }
});

// 🔑 LOGIN
client.login(process.env.TOKEN);
