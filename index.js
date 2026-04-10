const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = ".";
const afkUsers = new Map();

// ---------------- MESSAGE ----------------
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // REMOVE AFK ON CHAT
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);

    await message.channel.send({
      content:
`🧱 **CONTAINER**
────────────────────
🟢 STATUS: BACK ONLINE
👤 USER: ${message.author}
────────────────────
✅ Your AFK has been removed`
    });
  }

  // AFK MENTION CHECK
  for (const user of message.mentions.users.values()) {
    if (afkUsers.has(user.id)) {
      const reason = afkUsers.get(user.id);

      await message.channel.send({
        content:
`🧱 **CONTAINER**
────────────────────
💤 STATUS: AFK DETECTED
👤 USER: ${user.tag}
📌 REASON: ${reason}
────────────────────`
      });
    }
  }

  // AFK COMMAND
  if (message.content.startsWith(prefix + "afk")) {
    const reason = message.content.split(" ").slice(1).join(" ") || "No reason provided";

    afkUsers.set(message.author.id, reason);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("remove_afk")
        .setLabel("Return from AFK")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({
      content:
`🧱 **CONTAINER**
────────────────────
💤 STATUS: AFK MODE ENABLED
👤 USER: ${message.author}
📌 REASON: ${reason}
────────────────────
👇 Press button to return`,
      components: [row]
    });
  }
});

// ---------------- BUTTON ----------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "remove_afk") {
    if (!afkUsers.has(interaction.user.id)) {
      return interaction.reply({
        content: "❌ You are not AFK.",
        ephemeral: true
      });
    }

    afkUsers.delete(interaction.user.id);

    return interaction.reply({
      content:
`🧱 **CONTAINER**
────────────────────
🟢 STATUS: BACK ONLINE
👤 USER: ${interaction.user}
────────────────────
✅ Welcome back!`,
      ephemeral: false
    });
  }
});

client.login(process.env.TOKEN);
