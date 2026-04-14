const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Database = require('better-sqlite3');
const ms = require('ms');
require('dotenv').config();

// -------- sqlite setup (warnings) --------
const fs = require('fs');
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
const db = new Database('./data/warns.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS warns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild TEXT,
    user TEXT,
    reason TEXT,
    mod TEXT,
    time INTEGER
  )
`);

function addWarn(guildId, userId, reason, modId) {
  const stmt = db.prepare('INSERT INTO warns (guild, user, reason, mod, time) VALUES (?, ?, ?, ?, ?)');
  return stmt.run(guildId, userId, reason, modId, Date.now());
}

function getWarns(guildId, userId) {
  const stmt = db.prepare('SELECT id, reason, mod, time FROM warns WHERE guild = ? AND user = ? ORDER BY time DESC');
  return stmt.all(guildId, userId);
}

function delWarn(warnId, guildId) {
  const stmt = db.prepare('DELETE FROM warns WHERE id = ? AND guild = ?');
  return stmt.run(warnId, guildId);
}

// -------- afk storage (volatile) --------
const afkUsers = new Map(); // key: "guild-userID", value: { reason, timestamp }

// -------- bot client --------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

// -------- slash command definitions --------
const commands = [
  new SlashCommandBuilder().setName('warn').setDescription('warn someone').addUserOption(opt => opt.setName('user').setDescription('who').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('why').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  new SlashCommandBuilder().setName('warnings').setDescription('show warnings for a user').addUserOption(opt => opt.setName('user').setDescription('who').setRequired(true)).setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  new SlashCommandBuilder().setName('unwarn').setDescription('remove a warning by id').addUserOption(opt => opt.setName('user').setDescription('user').setRequired(true)).addIntegerOption(opt => opt.setName('id').setDescription('warning id').setRequired(true)).setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  new SlashCommandBuilder().setName('kick').setDescription('kick a member').addUserOption(opt => opt.setName('user').setDescription('who').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('why').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('ban a member').addUserOption(opt => opt.setName('user').setDescription('who').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('why').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  new SlashCommandBuilder().setName('unban').setDescription('unban by user id').addStringOption(opt => opt.setName('user_id').setDescription('id of banned user').setRequired(true)).setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  new SlashCommandBuilder().setName('timeout').setDescription('timeout a member').addUserOption(opt => opt.setName('user').setDescription('who').setRequired(true)).addStringOption(opt => opt.setName('duration').setDescription('10m, 1h, 1d etc').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('why').setRequired(false)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('untimeout').setDescription('remove timeout').addUserOption(opt => opt.setName('user').setDescription('who').setRequired(true)).setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  new SlashCommandBuilder().setName('afk').setDescription('set yourself as afk').addStringOption(opt => opt.setName('reason').setDescription('reason').setRequired(false)),
  new SlashCommandBuilder().setName('avatar').setDescription('show user avatar').addUserOption(opt => opt.setName('user').setDescription('who').setRequired(false))
];

// -------- register commands (only once on startup) --------
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands.map(c => c.toJSON()) });
    console.log('commands registered (global)');
  } catch (err) {
    console.error('failed to register commands', err);
  }
});

// -------- command handler (yes it's long, deal with it) --------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, member, guild, user } = interaction;
  const target = options.getMember('user');
  const reason = options.getString('reason') || 'no reason provided';
  const botMember = guild.members.me;

  // helper for hierarchy check
  const isHigherOrEqual = (targetMem, modMem) => {
    if (modMem.id === guild.ownerId) return false;
    return targetMem.roles.highest.position >= modMem.roles.highest.position;
  };

  if (commandName === 'warn') {
    if (!target) return interaction.reply({ content: 'user not found', ephemeral: true });
    if (!botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) return interaction.reply({ content: 'i need kick perms', ephemeral: true });
    if (isHigherOrEqual(target, member) && member.id !== guild.ownerId) return interaction.reply({ content: 'you cant warn that user (role hierarchy)', ephemeral: true });
    addWarn(guild.id, target.id, reason, user.id);
    const embed = new EmbedBuilder().setColor(0xffa500).setTitle(`⚠️ warned ${target.user.tag}`).addFields({ name: 'reason', value: reason }, { name: 'mod', value: user.tag }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    try { await target.send(`you were warned in ${guild.name}: ${reason}`); } catch(e) { /* dm off */ }
  }

  else if (commandName === 'warnings') {
    if (!target) return interaction.reply({ content: 'user not found', ephemeral: true });
    const warns = getWarns(guild.id, target.id);
    if (!warns.length) return interaction.reply({ content: `${target.user.tag} has no warnings.`, ephemeral: true });
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle(`warnings for ${target.user.tag}`).setDescription(warns.map(w => `**id:** ${w.id} | **reason:** ${w.reason} | **mod:** <@${w.mod}> | **<t:${Math.floor(w.time/1000)}:R>**`).join('\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  else if (commandName === 'unwarn') {
    if (!target) return interaction.reply({ content: 'user not found', ephemeral: true });
    const warnId = options.getInteger('id');
    const warns = getWarns(guild.id, target.id);
    if (!warns.find(w => w.id === warnId)) return interaction.reply({ content: `warning id ${warnId} not found`, ephemeral: true });
    delWarn(warnId, guild.id);
    await interaction.reply({ content: `✅ removed warning #${warnId} from ${target.user.tag}` });
  }

  else if (commandName === 'kick') {
    if (!target) return interaction.reply({ content: 'user not found', ephemeral: true });
    if (!target.kickable) return interaction.reply({ content: 'i cannot kick that user', ephemeral: true });
    if (isHigherOrEqual(target, member) && member.id !== guild.ownerId) return interaction.reply({ content: 'you cannot kick due to role hierarchy', ephemeral: true });
    await target.kick(reason);
    await interaction.reply({ content: `🔨 kicked ${target.user.tag} | reason: ${reason}` });
  }

  else if (commandName === 'ban') {
    if (!target) return interaction.reply({ content: 'user not found', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: 'i cannot ban that user', ephemeral: true });
    if (isHigherOrEqual(target, member) && member.id !== guild.ownerId) return interaction.reply({ content: 'you cannot ban due to role hierarchy', ephemeral: true });
    await target.ban({ reason });
    await interaction.reply({ content: `🔨 banned ${target.user.tag} | reason: ${reason}` });
  }

  else if (commandName === 'unban') {
    const userId = options.getString('user_id');
    if (!botMember.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'i need ban perms', ephemeral: true });
    try {
      const banList = await guild.bans.fetch();
      const banned = banList.get(userId);
      if (!banned) return interaction.reply({ content: 'user id not found in bans', ephemeral: true });
      await guild.members.unban(userId);
      await interaction.reply({ content: `✅ unbanned ${banned.user.tag} (${userId})` });
    } catch (err) {
      await interaction.reply({ content: 'failed to unban, check id or perms', ephemeral: true });
    }
  }

  else if (commandName === 'timeout') {
    if (!target) return interaction.reply({ content: 'user not found', ephemeral: true });
    if (!target.moderatable) return interaction.reply({ content: 'i cannot timeout that user', ephemeral: true });
    if (isHigherOrEqual(target, member) && member.id !== guild.ownerId) return interaction.reply({ content: 'you cannot timeout due to role hierarchy', ephemeral: true });
    const durationStr = options.getString('duration');
    const durMs = ms(durationStr);
    if (!durMs || durMs < 1000 || durMs > 28*24*60*60*1000) return interaction.reply({ content: 'invalid duration (max 28d, min 1s). use 10m, 1h, 1d', ephemeral: true });
    await target.timeout(durMs, reason);
    await interaction.reply({ content: `⏰ timed out ${target.user.tag} for ${durationStr} | ${reason}` });
  }

  else if (commandName === 'untimeout') {
    if (!target) return interaction.reply({ content: 'user not found', ephemeral: true });
    if (!target.moderatable) return interaction.reply({ content: 'i cannot remove timeout from that user', ephemeral: true });
    await target.timeout(null);
    await interaction.reply({ content: `✅ removed timeout from ${target.user.tag}` });
  }

  else if (commandName === 'afk') {
    const afkReason = options.getString('reason') || 'AFK';
    const key = `${guild.id}-${user.id}`;
    afkUsers.set(key, { reason: afkReason, timestamp: Date.now() });
    await interaction.reply({ content: `you're now afk: ${afkReason}`, ephemeral: true });
  }

  else if (commandName === 'avatar') {
    const targetUser = options.getUser('user') || user;
    const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${targetUser.tag}'s avatar`).setImage(targetUser.displayAvatarURL({ size: 1024, dynamic: true })).setFooter({ text: `id: ${targetUser.id}` });
    await interaction.reply({ embeds: [embed] });
  }
});

// -------- afk message detector (mentions) --------
client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  const guildId = msg.guild.id;
  const authorId = msg.author.id;
  const key = `${guildId}-${authorId}`;

  // remove afk when user speaks
  if (afkUsers.has(key)) {
    const data = afkUsers.get(key);
    afkUsers.delete(key);
    await msg.reply(`welcome back ${msg.author} — you were afk: ${data.reason}`);
  }

  // check mentions for afk users
  for (const [mentionedId, mentionedUser] of msg.mentions.users) {
    const afkKey = `${guildId}-${mentionedId}`;
    if (afkUsers.has(afkKey)) {
      const data = afkUsers.get(afkKey);
      await msg.reply(`${mentionedUser.tag} is afk: ${data.reason}`);
    }
  }
});

// -------- go go go --------
client.login(process.env.TOKEN);
