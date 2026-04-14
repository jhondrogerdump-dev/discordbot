const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const Database = require("better-sqlite3");
const ms = require("ms");

// ---------------- ENV ----------------
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ---------------- PREFIX ----------------
const PREFIX = "..";

// ---------------- DB ----------------
const db = new Database("./data/warns.db");

db.exec(`
CREATE TABLE IF NOT EXISTS warns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  guildId TEXT,
  reason TEXT,
  moderator TEXT,
  timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS logs (
  guildId TEXT PRIMARY KEY,
  channelId TEXT
);
`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

const afk = new Map();

// ---------------- CONTAINER ----------------
function sendContainer(channel, title, desc) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(desc)
    );

  return channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

// ---------------- LOGGING ----------------
async function log(guild, text) {
  const data = db.prepare("SELECT channelId FROM logs WHERE guildId=?").get(guild.id);
  if (!data) return;

  const channel = guild.channels.cache.get(data.channelId);
  if (!channel) return;

  channel.send(text);
}

// ---------------- READY ----------------
client.once("ready", async () => {
  console.log(`${client.user.tag} online`);

  // Slash commands register
  const commands = [
    new SlashCommandBuilder().setName("ping").setDescription("Bot latency"),
    new SlashCommandBuilder().setName("avatar").setDescription("User avatar"),
    new SlashCommandBuilder().setName("help").setDescription("Help menu")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
});

// ---------------- MESSAGE EVENTS ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // PREFIX COMMANDS
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const member = message.member;

  // ---------------- SET LOGGING ----------------
  if (cmd === "setloggingchannel") {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return sendContainer(message.channel, "Error", "Admin only.");

    db.prepare("INSERT OR REPLACE INTO logs (guildId, channelId) VALUES (?, ?)")
      .run(message.guild.id, message.channel.id);

    return sendContainer(message.channel, "Logging Enabled", "Logs activated.");
  }

  // ---------------- DISABLE LOGGING ----------------
  if (cmd === "disableloggingchannel") {
    db.prepare("DELETE FROM logs WHERE guildId=?")
      .run(message.guild.id);

    return sendContainer(message.channel, "Logging Disabled", "Logs removed.");
  }

  // ---------------- WARN ----------------
  if (cmd === "warn") {
    const user = message.mentions.users.first();
    if (!user) return sendContainer(message.channel, "Warn", "Mention user.");

    const reason = args.slice(1).join(" ") || "No reason";

    db.prepare(
      "INSERT INTO warns (userId, guildId, reason, moderator, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run(user.id, message.guild.id, reason, message.author.id, Date.now());

    return sendContainer(message.channel, "User Warned", `${user.tag}\nReason: ${reason}`);
  }

  // ---------------- WARNINGS ----------------
  if (cmd === "warnings") {
    const user = message.mentions.users.first() || message.author;

    const warns = db.prepare(
      "SELECT * FROM warns WHERE userId=? AND guildId=?"
    ).all(user.id, message.guild.id);

    if (!warns.length)
      return sendContainer(message.channel, "Warnings", "No warnings found.");

    let text = warns.map(w =>
      `• ${w.reason} (by <@${w.moderator}>)`
    ).join("\n");

    return sendContainer(message.channel, `${user.tag} Warnings`, text);
  }

  // ---------------- AVATAR (EMBED FIXED) ----------------
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setColor("Blue");

    return message.channel.send({ embeds: [embed] });
  }

  // ---------------- HELP ----------------
  if (cmd === "help") {
    return sendContainer(
      message.channel,
      "Bot Help",
      `
..warn @user reason
..warnings @user
..kick @user
..ban @user
..unban id
..timeout @user 10m
..untimeout @user
..afk reason
..avatar @user
..setloggingchannel
..disableloggingchannel
      `
    );
  }
});

// ---------------- LOG EVENTS ----------------
client.on("messageDelete", m => log(m.guild, `🗑️ Message deleted in ${m.channel}`));
client.on("messageUpdate", (o, n) => log(n.guild, `✏️ Message edited in ${n.channel}`));

client.on("guildBanAdd", b => log(b.guild, `🔨 User banned: ${b.user.tag}`));
client.on("guildBanRemove", b => log(b.guild, `♻️ User unbanned: ${b.user.tag}`));

client.on("guildMemberUpdate", (o, n) => {
  if (o.communicationDisabledUntil !== n.communicationDisabledUntil) {
    log(n.guild, `⏳ Timeout changed for ${n.user.tag}`);
  }
});

client.on("roleCreate", r => log(r.guild, `🎭 Role created: ${r.name}`));
client.on("roleDelete", r => log(r.guild, `❌ Role deleted: ${r.name}`));

client.on("channelCreate", c => log(c.guild, `📁 Channel created: ${c.name}`));
client.on("channelDelete", c => log(c.guild, `🧹 Channel deleted: ${c.name}`));

// ---------------- SLASH COMMANDS ----------------
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "ping") {
    return i.reply(`🏓 ${client.ws.ping}ms`);
  }

  if (i.commandName === "avatar") {
    const user = i.user;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}`)
      .setImage(user.displayAvatarURL({ size: 1024 }));

    return i.reply({ embeds: [embed] });
  }

  if (i.commandName === "help") {
    return i.reply("Use ..help for full commands");
  }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
