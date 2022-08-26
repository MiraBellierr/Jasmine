const { EmbedBuilder } = require("discord.js");

module.exports = async (client, sticker) => {
  const logging = client.loggings.get(sticker.guild.id);

  if (!(logging && logging.defaultLogChannel)) {
    return;
  }

  if (!logging.emojiAndStickerChanges) {
    return;
  }

  const embed = new EmbedBuilder()
    .setAuthor({
      name: "Sticker Created",
      iconURL: sticker.guild.iconURL(),
    })
    .setColor("#CD1C6C")
    .setDescription(`**Sticker:** ${sticker.name}`)
    .setFooter({ text: `stickerid: ${sticker.id}` })
    .setTimestamp();

  let logChannel;

  if (logging.serverLogChannel) {
    logChannel = await sticker.guild.channels.fetch(logging.serverLogChannel);
  } else {
    logChannel = await sticker.guild.channels.fetch(logging.defaultLogChannel);
  }

  logChannel.send({ embeds: [embed] });
};
