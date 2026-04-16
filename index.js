client.once("ready", async () => {
  console.log(`${client.user.tag} ready`);

  const channel = await client.channels.fetch("YOUR_CHANNEL_ID");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("**Bot is now ONLINE 🚀**")
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Running on Railway hosting")
    );

  channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
});
