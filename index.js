const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActivityType
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 🔴 DND + Custom Status
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'Owned by Nex',
      type: ActivityType.Custom
    }]
  });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // BAN
  if (commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return interaction.reply({ content: 'No permission.', ephemeral: true });

    const user = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply('User not found.');

    await member.ban();
    return interaction.reply(`🔨 Banned ${user.tag}`);
  }

  // KICK
  if (commandName === 'kick') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return interaction.reply({ content: 'No permission.', ephemeral: true });

    const user = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply('User not found.');

    await member.kick();
    return interaction.reply(`👢 Kicked ${user.tag}`);
  }

  // TIMEOUT
  if (commandName === 'timeout') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return interaction.reply({ content: 'No permission.', ephemeral: true });

    const user = interaction.options.getUser('target');
    const minutes = interaction.options.getInteger('minutes');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply('User not found.');

    await member.timeout(minutes * 60 * 1000);
    return interaction.reply(`⏱ Timed out ${user.tag} for ${minutes} min`);
  }

  // CLEAR
  if (commandName === 'clear') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return interaction.reply({ content: 'No permission.', ephemeral: true });

    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100)
      return interaction.reply({ content: '1–100 only.', ephemeral: true });

    await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `🧹 Deleted ${amount}`, ephemeral: true });
  }
});

// 🔑 LOGIN (Railway uses ENV)
client.login(process.env.TOKEN);
