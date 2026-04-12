const { Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// store last panel message
const panelMessages = new Map();

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    {
      name: "panel",
      description: "Send or update container panel",
      default_member_permissions: PermissionFlagsBits.Administrator.toString()
    }
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("✅ Command loaded");
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "panel") {

    // 🔒 Admin only
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "❌ No permission to use this.",
        ephemeral: true
      });
    }

    // 📦 PURE CONTAINER UI
    const panel = {
      components: [
        {
          type: 17, // container
          components: [
            {
              type: 10,
              content: "# 📦 Kryzen System Panel"
            },
            {
              type: 14 // separator
            },
            {
              type: 10,
              content:
                "✅ Status: Online\n" +
                "🚀 Host: Railway\n" +
                "⚙️ Type: Components v2 Container\n\n" +
                "Use this panel for logs, info, or systems."
            }
          ]
        }
      ]
    };

    try {
      const oldId = panelMessages.get(interaction.guildId);

      if (oldId) {
        const msg = await interaction.channel.messages.fetch(oldId).catch(() => null);

        if (msg) {
          await msg.edit(panel);
          return interaction.reply({
            content: "✅ Panel updated.",
            ephemeral: true
          });
        }
      }

      const sent = await interaction.channel.send(panel);
      panelMessages.set(interaction.guildId, sent.id);

      await interaction.reply({
        content: "✅ Panel sent.",
        ephemeral: true
      });

    } catch (err) {
      console.error(err);
      interaction.reply({
        content: "❌ Failed to send panel.",
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
