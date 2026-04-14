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
const PREFIX = ".";

// ---------------- SAFE DB ----------------
const file = "./warns.json";
if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");

function read() {
  return JSON.parse(fs.readFileSync(file));
}
function write(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function warnUser(id, guild, reason, mod) {
  const db = read();
  if (!db[guild]) db[guild] = {};
  if (!db[guild][id]) db[guild][id] = [];

  db[guild][id].push({ reason, mod, time: Date.now() });
  write(db);
}

function getWarns(id, guild) {
  const db = read();
  return db[guild]?.[id] || [];
}

function clearWarns(id, guild) {
  const db = read();
  if (db[guild]) db[guild][id] = [];
  write(db);
}

// ---------------- BOT ----------------
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
const logChannel = new Map();

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

// ---------------- LOG ----------------
async function log(guild, text) {
  const id = logChannel.get(guild.id);
  if (!id) return;

  const ch = guild.channels.cache.get(id);
  if (ch) ch.send(text);
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

  // AFK return
  if (afk.has(message.author.id)) {
    afk.delete(message.author.id);
    message.channel.send("Welcome back!");
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ---------------- PING ----------------
  if (cmd === "ping") {
    return message.channel.send(`🏓 ${client.ws.ping}ms`);
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
    afk.set(message.author.id, args.join(" ") || "AFK");
    return message.channel.send("AFK set.");
  }

  // ---------------- SAY (NEW FIXED) ----------------
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Admin only.");
    }

    const channel = message.mentions.channels.first();
    const text = args.slice(1).join(" ");

    if (!channel || !text) return message.reply("Usage: .say #channel message");

    await message.delete().catch(() => {});
    return channel.send(text);
  }

  // ---------------- WARN ----------------
  if (cmd === "warn") {
    const user = message.mentions.users.first();
    if (!user) return;

    const reason = args.slice(1).join(" ") || "No reason";

    warnUser(user.id, message.guild.id, reason, message.author.tag);

    return message.channel.send(`${user.tag} warned: ${reason}`);
  }

  // ---------------- WARNINGS ----------------
  if (cmd === "warnings") {
    const user = message.mentions.users.first() || message.author;

    const warns = getWarns(user.id, message.guild.id);

    if (!warns.length) return message.channel.send("No warnings.");

    return message.channel.send(
      warns.map((w,i)=>`${i+1}. ${w.reason} (${w.mod})`).join("\n")
    );
  }

  // ---------------- UNWARN ----------------
  if (cmd === "unwarn") {
    const user = message.mentions.users.first();
    if (!user) return;

    clearWarns(user.id, message.guild.id);

    return message.channel.send("Warnings cleared.");
  }

  // ---------------- KICK ----------------
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return;

    await user.kick();
    return message.channel.send("Kicked.");
  }

  // ---------------- BAN ----------------
  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return;

    await user.ban();
    return message.channel.send("Banned.");
  }

  // ---------------- UNBAN ----------------
  if (cmd === "unban") {
    await message.guild.bans.remove(args[0]);
    return message.channel.send("Unbanned.");
  }

  // ---------------- TIMEOUT ----------------
  if (cmd === "timeout") {
    const user = message.mentions.members.first();
    await user.timeout(ms(args[1]));
    return message.channel.send("Timed out.");
  }

  // ---------------- UNTIMEOUT ----------------
  if (cmd === "untimeout") {
    const user = message.mentions.members.first();
    await user.timeout(null);
    return message.channel.send("Untimed out.");
  }

  // ---------------- HELP ----------------
  if (cmd === "help") {
    return message.channel.send(`
Commands:
.say #channel msg
.warn
.warnings
.unwarn
.kick
.ban
.unban
.timeout
.untimeout
.afk
.avatar
.ping
`);
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
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
