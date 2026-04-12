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

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ===================== MESSAGE COMMANDS =====================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ===================== .AVATAR FIXED =====================
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const avatarURL = user.displayAvatarURL({
      size: 1024,
      extension: 'png',
      forceStatic: false
    });

    const container = new ContainerBuilder()
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
      );

    // 🔥 IMPORTANT FIX: components must be inside array properly
    return message.reply({
      components: [container]
    });
  }

  // ===================== .SAY FIXED =====================
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ No permission to use say.");
    }

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Use: .say #channel message");

    // better parsing fix
    const text = message.content
      .split(" ")
      .slice(2) // removes .say + #channel
      .join(" ");

    if (!text) return message.reply("❌ Provide a message.");

    await channel.send(text);

    // 🔥 FAST DELETE (fixed)
    setTimeout(() => {
      message.delete().catch(() => {});
    }, 100);
  }
});

client.login(process.env.TOKEN);
