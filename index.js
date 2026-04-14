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

// ---------------- SETUP ----------------
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

// ---------------- CONTAINER HELPER ----------------
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

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // AFK return
  if (afk.has(message.author.id)) {
    afk.delete(message.author.id);
    sendContainer(message.channel, "AFK", "Welcome back! AFK removed.");
  }

  // AFK mention
  message.mentions.users.forEach(u => {
    if (afk.has(u.id)) {
      message.channel.send(`${u.tag} is AFK\nreason: ${afk.get(u.id)}`);
    }
  });

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const member = message.member;

  // ---------------- PING ----------------
  if (cmd === "ping") {
    const sent = await message.channel.send("Pinging...");
    const latency = sent.createdTimestamp - message.createdTimestamp;

    return sendContainer(
      message.channel,
      "🏓 Pong!",
      `Latency: **${latency}ms**`
    );
  }

  // ---------------- AVATAR ----------------
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## User's Avatar")
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${user.tag}**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(user.displayAvatarURL({ size: 1024 }))
      );

    return message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  // ---------------- AFK ----------------
  if (cmd === "afk") {
    const reason = args.join(" ") || "AFK";

    afk.set(message.author.id, reason);

    return sendContainer(
      message.channel,
      "AFK System",
      `user is **Afk**\n---\n**reason : ${reason}**`
    );
  }

  // ---------------- WARN ----------------
  if (cmd === "warn") {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return sendContainer(message.channel, "Error", "No permission.");

    const user = message.mentions.users.first();
    if (!user) return sendContainer(message.channel, "Warn", "Mention user.");

    const reason = args.slice(1).join(" ") || "No reason";

    db.prepare(
      "INSERT INTO warns (userId, guildId, reason, moderator, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run(user.id, message.guild.id, reason, message.author.id, Date.now());

    return sendContainer(message.channel, "Warned", `${user.tag}\nReason: ${reason}`);
  }

  // ---------------- KICK ----------------
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return sendContainer(message.channel, "Kick", "Mention user.");

    await user.kick(args.join(" ") || "No reason");

    return sendContainer(message.channel, "Kicked", `${user.user.tag}`);
  }

  // ---------------- BAN ----------------
  if (cmd === "ban") {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return sendContainer(message.channel, "Error", "No permission.");

    const user = message.mentions.members.first();
    if (!user) return sendContainer(message.channel, "Ban", "Mention user.");

    await user.ban({ reason: args.join(" ") || "No reason" });

    return sendContainer(message.channel, "Banned", `${user.user.tag}`);
  }

  // ---------------- UNBAN ----------------
  if (cmd === "unban") {
    const id = args[0];
    if (!id) return sendContainer(message.channel, "Unban", "User ID required.");

    await message.guild.bans.remove(id);

    return sendContainer(message.channel, "Unbanned", id);
  }

  // ---------------- TIMEOUT ----------------
  if (cmd === "timeout") {
    const user = message.mentions.members.first();
    const time = args[1];

    if (!user || !time)
      return sendContainer(message.channel, "Timeout", ".timeout @user 10m");

    await user.timeout(ms(time), "Timeout");

    return sendContainer(message.channel, "Timed Out", `${user.user.tag}`);
  }

  // ---------------- UNTIMEOUT ----------------
  if (cmd === "untimeout") {
    const user = message.mentions.members.first();
    if (!user) return sendContainer(message.channel, "Untimeout", "Mention user.");

    await user.timeout(null);

    return sendContainer(message.channel, "Untimeout", `${user.user.tag}`);
  }
});

// ---------------- LOGIN ----------------
if (!TOKEN) {
  console.log("❌ Missing TOKEN in Railway variables");
} else {
  client.login(TOKEN);
}
