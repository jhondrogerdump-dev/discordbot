let sent = false;

client.once("ready", async () => {
  if (sent) return;
  sent = true;

  const channel = await client.channels.fetch("YOUR_CHANNEL_ID");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("**SYSTEM ONLINE 🚀**")
    );

  channel.send({
    components: [container],
    flags: 1 << 15
  });
});
