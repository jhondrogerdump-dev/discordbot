const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

// ================== CLIENT FIRST (IMPORTANT FIX) ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ================== CONFIG ==================
const PREFIX = ".";
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const afk = new Map();

// ================== WARN DB ==================
const file = "./warns.json";
if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");

const read = () => JSON.parse(fs.readFileSync(file));
const write = (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

function addWarn(id, guild, reason, mod) {
  const db = read();
  if (!db[guild]) db[guild] = {};
  if (!db[guild][id]) db[guild][id] = [];

  db[guild][id].push({ reason, mod });
  write(db);
}

// ================== UI (CONTAINER) ==================
function ui(channel, title, text) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${title}**`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(text)
    );

  return channel.send({
    components: [container],
    flags: 1 << 15 // FIX: stable container flag
  });
}

// ================== READY EVENT ==================
client.once("ready", async () => {
  console.log(`${client.user.tag} is online`);

  // Slash commands
  const cmds = [
    new SlashCommandBuilder().setName("ping").setDescription("Ping bot"),
    new SlashCommandBuilder().setName("avatar").setDescription("Show avatar"),
    new SlashCommandBuilder().setName("help").setDescription("Help menu")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: cmds
    });
    console.log("Slash commands loaded");
  } catch (err) {
    console.log("Slash command error:", err);
  }

  // OPTIONAL: startup message (Railway safe)
  try {
    const channel = await client.channels.fetch("YOUR_CHANNEL_ID").catch(() => null);
    if (channel) {
      channel.send({
        content: "Bot is online 🚀"
      });
    }
  } catch (e) {
    console.log("Startup message failed:", e);
  }
});

// ================== MESSAGE COMMANDS ==================
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  // AFK return
  if (afk.has(msg.author.id)) {
    afk.delete(msg.author.id);
    msg.channel.send("welcome back");
  }

  if (!msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ---------------- PING ----------------
  if (cmd === "ping") {
    return ui(msg.channel, "Ping", `${client.ws.ping}ms`);
  }

  // ---------------- AVATAR ----------------
  if (cmd === "avatar") {
    const user = msg.mentions.users.first() || msg.author;

    return msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(user.tag)
          .setImage(user.displayAvatarURL({ size: 1024 }))
      ]
    });
  }

  // ---------------- AFK ----------------
  if (cmd === "afk") {
    const reason = args.join(" ") || "AFK";
    afk.set(msg.author.id, reason);

    return ui(msg.channel, "AFK SET", `Reason: ${reason}`);
  }

  // ---------------- SAY ----------------
  if (cmd === "say") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return msg.reply("admin only");
    }

    const channel = msg.mentions.channels.first();
    const text = args.slice(1).join(" ");

    if (!channel || !text) {
      return msg.reply("Use: .say #channel message");
    }

    await msg.delete().catch(() => {});
    return channel.send(text);
  }

  // ---------------- WARN (basic start) ----------------
  if (cmd === "warn") {
    const user = msg.mentions.users.first();
    if (!user) return msg.reply("mention user");

    const reason = args.slice(1).join(" ") || "no reason";

    addWarn(user.id, msg.guild.id, reason, msg.author.id);

    return ui(
      msg.channel,
      "USER WARNED",
      `${user.tag}\nReason: ${reason}`
    );
  }
});

// ================== LOGIN ==================
client.login(TOKEN);
