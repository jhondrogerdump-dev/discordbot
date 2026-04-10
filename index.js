const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = ".";
const afkUsers = new Map(); // store AFK users

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if user is AFK and remove it when they talk
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);

    const backEmbed = new EmbedBuilder()
      .setColor('#808080')
      .setDescription(`✅ Welcome back ${message.author}, your AFK has been removed.`);

    message.channel.send({ embeds: [backEmbed] });
  }

  // Mention check (if someone pings AFK user)
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const reason = afkUsers.get(user.id);

      const afkPingEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle('User is AFK')
        .setDescription(`💤 ${user.tag} is currently AFK\n📌 Reason: **${reason}**`);

      message.channel.send({ embeds: [afkPingEmbed] });
    }
  });

  // AFK Command
  if (message.content.startsWith(prefix + "afk")) {
    const args = message.content.split(" ").slice(1);
    const reason = args.join(" ") || "No reason provided";

    afkUsers.set(message.author.id, reason);

    const afkEmbed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle('AFK Set')
      .setDescription(`💤 You are now AFK\n📌 Reason: **${reason}**`);

    message.channel.send({ embeds: [afkEmbed] });
  }
});

;
