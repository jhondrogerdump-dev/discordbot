const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = ".";
const afkUsers = new Map();

// MESSAGE EVENT
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Remove AFK when user talks
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);

    const backEmbed = new EmbedBuilder()
      .setColor('#808080')
      .setDescription(`✅ ${message.author.tag} is no longer AFK`);

    return message.channel.send({ embeds: [backEmbed] });
  }

  // Check AFK mentions
  for (const user of message.mentions.users.values()) {
    if (afkUsers.has(user.id)) {
      const reason = afkUsers.get(user.id);

      const afkEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle('💤 User is AFK')
        .setDescription(`**${user.tag}** is currently AFK\n📌 Reason: ${reason}`);

      return message.channel.send({ embeds: [afkEmbed] });
    }
  }

  // AFK COMMAND
  if (message.content.startsWith(prefix + "afk")) {
    const reason = message.content.split(" ").slice(1).join(" ") || "No reason provided";

    afkUsers.set(message.author.id, reason);

    const afkEmbed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle('💤 AFK Set')
      .setDescription(`You are now AFK\n📌 Reason: ${reason}`);

    return message.channel.send({ embeds: [afkEmbed] });
  }
});

client.login(process.env.TOKEN);
