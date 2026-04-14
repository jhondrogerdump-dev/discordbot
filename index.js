const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require("discord.js");

const Database = require("better-sqlite3");
const ms = require("ms");
const fs = require("fs");

// ---------------- ENV ----------------
const TOKEN = process.env.TOKEN;
const PREFIX = process.env.PREFIX || ".";

// ---------------- DB FIX ----------------
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

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
`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const afk = new Map();

// ---------------- CONTAINER SENDER (FIXED) ----------------
function sendContainer(channel, title, desc) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${title}**\n${desc}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

  return channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- COMMANDS ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const member = message.member;

  // ---------------- TEST ----------------
  if (cmd === "ping") {
    return sendContainer(message.channel, "Bot Status", "Bot is working correctly ✅");
  }

  // ---------------- WARN ----------------
  if (cmd === "warn") {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return sendContainer(message.channel, "Error", "No permission.");

    const user = message.mentions.users.first();
    if (!user) return sendContainer(message.channel, "Warn", "Mention a user.");

    const reason = args.slice(1).join(" ") || "No reason";

    db.prepare(
      "INSERT INTO warns (userId, guildId, reason, moderator, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run(user.id, message.guild.id, reason, message.author.id, Date.now());

    return sendContainer(message.channel, "Warned", `${user.tag}\nReason: ${reason}`);
  }

  // ---------------- AVATAR ----------------
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**${user.tag}'s Avatar**\n${user.displayAvatarURL({ size: 1024 })}`
      )
    );

    return message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
});

if (!TOKEN) {
  console.log("❌ TOKEN missing in Railway variables");
} else {
  client.login(TOKEN);
}
