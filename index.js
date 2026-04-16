let sent = false;

client.once("ready", async () => {
  if (sent) return;
  sent = true;

  const channel = await client.channels.fetch("1493379919294627933");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("**SYSTEM ONLINE 🚀**")
    );

  channel.send({
    components: [container],
    flags: 1 << 15
  });
});
