const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".";

// ✅ Ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ✅ Message Command
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "avatar") {
    let user = message.mentions.users.first() || message.author;

    const avatarURL = user.displayAvatarURL({
      size: 1024,
      extension: 'png',
      forceStatic: false
    });

    const embed = new EmbedBuilder()
      .setColor(0x000000) // black
      .setImage(avatarURL);

    await message.reply({
      content: `Here's ${user}'s avatar`,
      embeds: [embed]
    });
  }
});

// ✅ Login (Railway env)
client.login(process.env.TOKEN);
