const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const Database = require("better-sqlite3");
const ms = require("ms");

// ---------------- ENV (INSIDE FILE) ----------------
const TOKEN = process.env.TOKEN || "PUT_YOUR_TOKEN_HERE";
const PREFIX = process.env.PREFIX || ".";
const MOD_LOGS = process.env.MOD_LOGS || "";

// ---------------- DATABASE ----------------
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

// ---------------- CLIENT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const afkUsers = new Map();

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // AFK return
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    message.reply("Welcome back, AFK removed.");
  }

  // AFK mention
  message.mentions.users.forEach((u) => {
    if (afkUsers.has(u.id)) {
      message.channel.send(`${u.tag} is AFK: ${afkUsers.get(u.id)}`);
    }
  });

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const member = message.member;

  const log = (embed) => {
    const ch = message.guild.channels.cache.get(MOD_LOGS);
    if (ch) ch.send({ embeds: [embed] });
  };

  // ---------------- WARN ----------------
  if (cmd === "warn") {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("No permission.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention user.");

    const reason = args.slice(1).join(" ") || "No reason";

    db.prepare(
      "INSERT INTO warns (userId, guildId, reason, moderator, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run(user.id, message.guild.id, reason, message.author.id, Date.now());

    message.reply(`${user.tag} warned.`);
  }

  // ---------------- UNWARN ----------------
  if (cmd === "unwarn") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention user.");

    db.prepare("DELETE FROM warns WHERE userId=? AND guildId=?")
      .run(user.id, message.guild.id);

    message.reply(`${user.tag} warns cleared.`);
  }

  // ---------------- BAN ----------------
  if (cmd === "ban") {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("No permission.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user.");

    await user.ban({ reason: args.slice(1).join(" ") || "No reason" });
    message.reply("User banned.");
  }

  // ---------------- UNBAN ----------------
  if (cmd === "unban") {
    const id = args[0];
    if (!id) return message.reply("Provide user ID.");

    await message.guild.bans.remove(id);
    message.reply("User unbanned.");
  }

  // ---------------- KICK ----------------
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user.");

    await user.kick(args.slice(1).join(" ") || "No reason");
    message.reply("User kicked.");
  }

  // ---------------- TIMEOUT ----------------
  if (cmd === "timeout") {
    const user = message.mentions.members.first();
    const time = args[1];

    if (!user || !time) return message.reply(".timeout @user 10m");

    await user.timeout(ms(time), "Timeout");
    message.reply("User timed out.");
  }

  // ---------------- UNTIMEOUT ----------------
  if (cmd === "untimeout") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user.");

    await user.timeout(null);
    message.reply("Timeout removed.");
  }

  // ---------------- AFK ----------------
  if (cmd === "afk") {
    const reason = args.join(" ") || "AFK";
    afkUsers.set(message.author.id, reason);
    message.reply(`AFK set: ${reason}`);
  }

  // ---------------- AVATAR ----------------
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setColor("Blue");

    message.channel.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
