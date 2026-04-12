import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,

  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder
} from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".";

// ================= READY =================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= MESSAGE COMMANDS =================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ================= .AVATAR =================
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const avatarURL = user.displayAvatarURL({
      size: 1024,
      extension: 'png',
      forceStatic: false
    });

    const components = [
      new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`**Here's ${user.username}'s avatar**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Large)
            .setDivider(true)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems({
            media: { url: avatarURL }
          })
        )
    ];

    return message.reply({ components });
  }

  // ================= .SAY =================
  if (cmd === "say") {
    // admin only
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission to use this command.");
    }

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Mention a channel.");

    // extract message text properly
    const text = message.content
      .slice(PREFIX.length + cmd.length)
      .trim()
      .replace(channel.toString(), "")
      .trim();

    if (!text) return message.reply("❌ Provide a message.");

    await channel.send(text);

    // 🧹 delete command message
    await message.delete().catch(() => {});
  }
});

client.login(process.env.TOKEN);
