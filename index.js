const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,

  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require("discord.js");

const Database = require("better-sqlite3");
const ms = require("ms");
const fs = require("fs");

// ---------------- ENV ----------------
const TOKEN = process.env.TOKEN;
const PREFIX = process.env.PREFIX || ".";
const MOD_LOGS = process.env.MOD_LOGS;

// ---------------- SAFE DB ----------------
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

// ---------------- BOT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const afk = new Map();

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- HELPER (CONTAINER SENDER) ----------------
function sendContainer(channel, title, desc) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${title}**\n${desc}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

  return channel.send({ components: [container] });
}

// ---------------- COMMANDS ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // AFK return
  if (afk.has(message.author.id)) {
    afk.delete(message.author.id);
    sendContainer(message.channel, "AFK System", "Welcome back! Your AFK is removed.");
  }

  // AFK mention
  message.mentions.users.forEach(u => {
    if (afk.has(u.id)) {
      message.channel.send(`${u.tag} is AFK: ${afk.get(u.id)}`);
    }
  });

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const member = message.member;

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

    sendContainer(
      message.channel,
      "User Warned",
      `${user.tag} has been warned\nReason: ${reason}`
    );
  }

  // ---------------- UNWARN ----------------
  if (cmd === "unwarn") {
    const user = message.mentions.users.first();
    if (!user) return sendContainer(message.channel, "Unwarn", "Mention a user.");

    db.prepare("DELETE FROM warns WHERE userId=? AND guildId=?")
      .run(user.id, message.guild.id);

    sendContainer(message.channel, "Unwarn", `${user.tag} warnings removed.`);
  }

  // ---------------- BAN ----------------
  if (cmd === "ban") {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return sendContainer(message.channel, "Error", "No permission.");

    const user = message.mentions.members.first();
    if (!user) return sendContainer(message.channel, "Ban", "Mention a user.");

    await user.ban({ reason: args.join(" ") || "No reason" });

    sendContainer(message.channel, "Banned", `${user.user.tag} has been banned.`);
  }

  // ---------------- UNBAN ----------------
  if (cmd === "unban") {
    const id = args[0];
    if (!id) return sendContainer(message.channel, "Unban", "User ID required.");

    await message.guild.bans.remove(id);

    sendContainer(message.channel, "Unbanned", `User ${id} unbanned.`);
  }

  // ---------------- KICK ----------------
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return sendContainer(message.channel, "Kick", "Mention a user.");

    await user.kick(args.join(" ") || "No reason");

    sendContainer(message.channel, "Kicked", `${user.user.tag} kicked.`);
  }

  // ---------------- TIMEOUT ----------------
  if (cmd === "timeout") {
    const user = message.mentions.members.first();
    const time = args[1];

    if (!user || !time)
      return sendContainer(message.channel, "Timeout", ".timeout @user 10m");

    await user.timeout(ms(time), "Timeout");

    sendContainer(message.channel, "Timeout", `${user.user.tag} timed out.`);
  }

  // ---------------- UNTIMEOUT ----------------
  if (cmd === "untimeout") {
    const user = message.mentions.members.first();
    if (!user) return sendContainer(message.channel, "Untimeout", "Mention user.");

    await user.timeout(null);

    sendContainer(message.channel, "Untimeout", `${user.user.tag} timeout removed.`);
  }

  // ---------------- AFK ----------------
  if (cmd === "afk") {
    const reason = args.join(" ") || "AFK";
    afk.set(message.author.id, reason);

    sendContainer(message.channel, "AFK Enabled", `Reason: ${reason}`);
  }

  // ---------------- AVATAR ----------------
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${user.tag}'s Avatar**`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(user.displayAvatarURL({ size: 1024 }))
      );

    message.channel.send({ components: [container] });
  }
});

// ---------------- LOGIN ----------------
if (!TOKEN) {
  console.log("❌ Missing TOKEN in Railway variables!");
} else {
  client.login(TOKEN);
  }
