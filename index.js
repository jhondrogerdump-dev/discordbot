require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const db = require("./db");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = process.env.PREFIX || ".";
const afkUsers = new Map();

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

// ---------------- MESSAGE HANDLER ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // AFK check remove
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    message.reply("Welcome back, your AFK is removed.");
  }

  // AFK mention check
  message.mentions.users.forEach((user) => {
    if (afkUsers.has(user.id)) {
      message.channel.send(`${user.tag} is AFK: ${afkUsers.get(user.id)}`);
    }
  });

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const member = message.member;

  const log = async (embed) => {
    const ch = message.guild.channels.cache.get(process.env.MOD_LOGS);
    if (ch) ch.send({ embeds: [embed] });
  };

  // ---------------- WARN ----------------
  if (cmd === "warn") {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("No permission.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention a user.");

    const reason = args.slice(1).join(" ") || "No reason";

    db.prepare(
      "INSERT INTO warns (userId, guildId, reason, moderator, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run(user.id, message.guild.id, reason, message.author.id, Date.now());

    message.reply(`${user.tag} has been warned.`);

    log(new EmbedBuilder()
      .setTitle("User Warned")
      .setDescription(`${user.tag} was warned`)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Moderator", value: message.author.tag }
      )
      .setColor("Yellow"));
  }

  // ---------------- UNWARN ----------------
  if (cmd === "unwarn") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention a user.");

    db.prepare("DELETE FROM warns WHERE userId = ? AND guildId = ?")
      .run(user.id, message.guild.id);

    message.reply(`All warns removed for ${user.tag}`);
  }

  // ---------------- BAN ----------------
  if (cmd === "ban") {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("No permission.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention a user.");

    await user.ban({ reason: args.slice(1).join(" ") || "No reason" });
    message.reply(`${user.user.tag} banned.`);
  }

  // ---------------- UNBAN ----------------
  if (cmd === "unban") {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("No permission.");

    const userId = args[0];
    if (!userId) return message.reply("Provide user ID.");

    await message.guild.bans.remove(userId);
    message.reply("User unbanned.");
  }

  // ---------------- KICK ----------------
  if (cmd === "kick") {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("No permission.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention a user.");

    await user.kick(args.slice(1).join(" ") || "No reason");
    message.reply(`${user.user.tag} kicked.`);
  }

  // ---------------- TIMEOUT ----------------
  if (cmd === "timeout") {
    if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("No permission.");

    const user = message.mentions.members.first();
    const time = args[1];

    if (!user || !time) return message.reply("Usage: .timeout @user 10m");

    await user.timeout(require("ms")(time), "Timeout");
    message.reply(`${user.user.tag} timed out.`);
  }

  // ---------------- UNTIMEOUT ----------------
  if (cmd === "untimeout") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user.");

    await user.timeout(null);
    message.reply(`${user.user.tag} timeout removed.`);
  }

  // ---------------- AFK ----------------
  if (cmd === "afk") {
    const reason = args.join(" ") || "AFK";
    afkUsers.set(message.author.id, reason);
    message.reply(`You are now AFK: ${reason}`);
  }

  // ---------------- AVATAR ----------------
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setColor("Blue");

    message.channel.send({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
