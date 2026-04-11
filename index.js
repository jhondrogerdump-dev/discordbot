const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".";

// ENV
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// =======================
// SLASH COMMAND REGISTER
// =======================
const commands = [
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Get a user's avatar")
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message (Admin only)')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Message to send')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Target channel')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
})();

// =======================
// READY
// =======================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// =======================
// PREFIX COMMANDS
// =======================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // 🔹 AVATAR
  if (cmd === "avatar") {
    let user = message.mentions.users.first() || message.author;

    const avatarURL = user.displayAvatarURL({
      size: 1024,
      extension: 'png',
      forceStatic: false
    });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setImage(avatarURL);

    return message.reply({
      content: `Here's ${user}'s avatar`,
      embeds: [embed]
    });
  }

  // 🔹 SAY (ADMIN ONLY + AUTO DELETE COMMAND)
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission to use this command.");
    }

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Please mention a channel.");

    // ✅ FIXED parsing
    const text = message.content
      .slice(PREFIX.length + cmd.length)
      .trim()
      .replace(channel.toString(), "")
      .trim();

    if (!text) return message.reply("❌ Please provide a message.");

    await channel.send(text);

    // 🧹 DELETE COMMAND MESSAGE
    await message.delete().catch(() => {});
  }
});

// =======================
// SLASH COMMANDS
// =======================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // 🔹 AVATAR
  if (interaction.commandName === "avatar") {
    const user = interaction.options.getUser('user') || interaction.user;

    const avatarURL = user.displayAvatarURL({
      size: 1024,
      extension: 'png',
      forceStatic: false
    });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setImage(avatarURL);

    return interaction.reply({
      content: `Here's ${user}'s avatar`,
      embeds: [embed]
    });
  }

  // 🔹 SAY (ADMIN ONLY + AUTO DELETE REPLY)
  if (interaction.commandName === "say") {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "❌ You don't have permission to use this command.",
        ephemeral: true
      });
    }

    const text = interaction.options.getString('text');
    const channel = interaction.options.getChannel('channel');

    await channel.send(text);

    const reply = await interaction.reply({
      content: "✅ Message sent!",
      fetchReply: true
    });

    // 🧹 DELETE BOT REPLY AFTER 3s
    setTimeout(() => {
      reply.delete().catch(() => {});
    }, 3000);
  }
});

// =======================
// LOGIN
// =======================
client.login(process.env.TOKEN);
