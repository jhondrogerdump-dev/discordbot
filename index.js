const {
  Client,
  GatewayIntentBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", async () => {
  console.log(`${client.user.tag} is online`);

  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch("1493379919294627933");
      if (!channel) return console.log("Channel not found");

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**Kryzen.net**\n-# supported games")
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "
> - [Diesel n steel](https://www.roblox.com/games/131667667758514/Diesel-n-steel)
> - [be a brainrot](https://www.roblox.com/games/105626692504093/Be-a-Brainrot)
> - [swing obby for brainrots](https://www.roblox.com/games/114640202062357/Swing-Obby-for-Brainrots)
> - [be a lucky block](https://www.roblox.com/games/124473577469410/Be-a-Lucky-Block?gameSearchSessionInfo=2090b61e-90dd-4dfd-8e5a-d1fa896baf47&isAd=false&nativeAdData=&numberOfLoadedTiles=40&page=searchPage&placeId=124473577469410&position=0&universeId=9787206684)
> - [car dealership tycoon](https://www.roblox.com/games/1554960397/2X-CASH-Car-Dealership-Tycoon)
> - [Piggy](https://www.roblox.com/games/4623386862/Piggy)
>  - [Basketball Legends](https://www.roblox.com/games/14259168147/Basketball-Legends)
> -    [Arsenal](https://www.roblox.com/games/286090429/Arsenal) 
-# more games will be supported soon"
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

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

      console.log("Container sent!");

    } catch (err) {
      console.log("Container error:", err);
    }
  }, 3000);
});

client.login(process.env.TOKEN);
