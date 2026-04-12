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
// AUTO RESPONDER STORAGE
// =======================
const autoResponders = new Map();

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
// MESSAGE EVENT
// =======================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // =====================
  // AUTO RESPONDER CHECK
  // =====================
  const trigger = message.content.toLowerCase();

  if (autoResponders.has(trigger)) {
    return message.reply(autoResponders.get(trigger));
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // =====================
  // AVATAR
  // =====================
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

  // =====================
  // SAY
  // =====================
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission.");
    }

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Mention a channel.");

    const text = message.content
      .slice(PREFIX.length + cmd.length)
      .trim()
      .replace(channel.toString(), "")
      .trim();

    if (!text) return message.reply("❌ Provide a message.");

    await channel.send(text);

    await message.delete().catch(() => {});
  }

  // =====================
  // CREATE AUTO RESPONDER
  // =====================
  if (cmd === "autoresponder") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Admin only.");
    }

    const name = args.shift()?.toLowerCase();
    const response = args.join(" ");

    if (!name || !response) {
      return message.reply("Usage: `.autoresponder <name> <message>`");
    }

    autoResponders.set(name, response);

    return message.reply(`✅ Auto responder **${name}** created.`);
  }

  // =====================
  // DELETE AUTO RESPONDER
  // =====================
  if (cmd === "deleteautoresponder") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Admin only.");
    }

    const name = args[0]?.toLowerCase();

    if (!name) {
      return message.reply("Usage: `.deleteautoresponder <name>`");
    }

    if (!autoResponders.has(name)) {
      return message.reply("❌ Responder not found.");
    }

    autoResponders.delete(name);

    return message.reply(`🗑️ Auto responder **${name}** deleted.`);
  }
});

// =======================
// SLASH COMMANDS
// =======================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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

  if (interaction.commandName === "say") {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "❌ No permission.",
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

    setTimeout(() => {
      reply.delete().catch(() => {});
    }, 3000);
  }
});

// =======================
// LOGIN
// =======================
client.login(process.env.TOKEN);
