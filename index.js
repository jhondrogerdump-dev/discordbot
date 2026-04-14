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

const fs = require("fs");
const ms = require("ms");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PREFIX = "..";

// ---------------- SAFE JSON DB ----------------
const file = "./warns.json";
if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");

function read() {
  return JSON.parse(fs.readFileSync(file));
}
function write(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function warnUser(userId, guildId, reason, mod) {
  const db = read();
  if (!db[guildId]) db[guildId] = {};
  if (!db[guildId][userId]) db[guildId][userId] = [];

  db[guildId][userId].push({ reason, mod, time: Date.now() });
  write(db);
}

function getWarns(userId, guildId) {
  const db = read();
  return db[guildId]?.[userId] || [];
}

function clearWarns(userId, guildId) {
  const db = read();
  if (db[guildId]) db[guildId][userId] = [];
  write(db);
}

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

// ---------------- READY ----------------
client.once("ready", async () => {
  console.log(`${client.user.tag} online`);

  const commands = [
    new SlashCommandBuilder().setName("ping").setDescription("Ping"),
    new SlashCommandBuilder().setName("avatar").setDescription("Avatar"),
    new SlashCommandBuilder().setName("help").setDescription("Help")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // AFK RETURN
  if (afk.has(message.author.id)) {
    afk.delete(message.author.id);
    sendContainer(message.channel, "AFK", "Welcome back!");
  }

  // AFK MENTION
  message.mentions.users.forEach(u => {
    if (afk.has(u.id)) {
      message.channel.send(`${u.tag} is AFK: ${afk.get(u.id)}`);
    }
  });

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ---------------- PING ----------------
  if (cmd === "ping") {
    return sendContainer(message.channel, "Ping", `${client.ws.ping}ms`);
  }

  // ---------------- AVATAR ----------------
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setTitle(user.tag)
      .setImage(user.displayAvatarURL({ size: 1024 }));

    return message.channel.send({ embeds: [embed] });
  }

  // ---------------- AFK ----------------
  if (cmd === "afk") {
    const reason = args.join(" ") || "AFK";
    afk.set(message.author.id, reason);

    return sendContainer(message.channel, "AFK Set", reason);
  }

  // ---------------- WARN ----------------
  if (cmd === "warn") {
    const user = message.mentions.users.first();
    if (!user) return;

    const reason = args.slice(1).join(" ") || "No reason";

    warnUser(user.id, message.guild.id, reason, message.author.tag);

    return sendContainer(message.channel, "Warned", `${user.tag}\n${reason}`);
  }

  // ---------------- WARNINGS ----------------
  if (cmd === "warnings") {
    const user = message.mentions.users.first() || message.author;

    const warns = getWarns(user.id, message.guild.id);

    if (!warns.length)
      return sendContainer(message.channel, "Warnings", "None");

    return sendContainer(
      message.channel,
      "Warnings",
      warns.map((w,i)=>`**${i+1}.** ${w.reason} (${w.mod})`).join("\n")
    );
  }

  // ---------------- UNWARN ----------------
  if (cmd === "unwarn") {
    const user = message.mentions.users.first();
    if (!user) return;

    clearWarns(user.id, message.guild.id);

    return sendContainer(message.channel, "Unwarned", user.tag);
  }

  // ---------------- KICK ----------------
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return;

    await user.kick();

    return sendContainer(message.channel, "Kicked", user.user.tag);
  }

  // ---------------- BAN ----------------
  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return;

    await user.ban();

    return sendContainer(message.channel, "Banned", user.user.tag);
  }

  // ---------------- HELP ----------------
  if (cmd === "help") {
    return sendContainer(
      message.channel,
      "Commands",
      `
..ping
..avatar
..afk
..warn
..warnings
..unwarn
..kick
..ban
      `
    );
  }
});

// ---------------- SLASH ----------------
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "ping")
    return i.reply(`${client.ws.ping}ms`);

  if (i.commandName === "avatar")
    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(i.user.tag)
          .setImage(i.user.displayAvatarURL({ size: 1024 }))
      ]
    });

  if (i.commandName === "help")
    return i.reply("Use ..help");
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
