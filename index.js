const {
  Client,
  GatewayIntentBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require("discord.js");

// ✅ CLIENT MUST BE FIRST FIX
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= READY EVENT =================
client.once("ready", async () => {
  console.log(`${client.user.tag} is online`);

  // wait for Railway + Discord sync
  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch("1493379919294627933");

      if (!channel) return console.log("Channel not found");

      // ===== CONTAINER MESSAGE =====
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**Script loader
                                              -# copy for pc**")
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("```loadstring(game:HttpGet("https://vss.pandadevelopment.net/virtual/file/7d7489f4b9e04ff7"))()```")
        );
          .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
          await channel.send({
  components: [
    container,
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "supported games",
          url: "https://discord.com/channels/1491419835039612958/1492584777881227515"
        }
      ]
    }
  ],
  flags: 1 << 15
});

      await channel.send({
        components: [container],
        flags: 1 << 15
      });

      console.log("Container sent!");

    } catch (err) {
      console.log("Container error:", err);
    }
  }, 3000);
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
