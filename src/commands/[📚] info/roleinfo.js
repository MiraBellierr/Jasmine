const Discord = require("discord.js");
const { argsError } = require("../../utils/errors");
const { getRoleFromArguments } = require("../../utils/getters");

module.exports = {
	name: "roleinfo",
	aliases: ["role"],
	category: "[📚] info",
	description: "Returns role information",
	usage: "<role>",
	run: async (client, message, args) => {
		if (!args.length) return argsError(module.exports, client, message);

		const role = await getRoleFromArguments(message, args.join(" "));

		if (!role) return argsError(module.exports, client, message);

		const guildMembers = await role.guild.members.fetch();
		const memberCount = guildMembers.filter((member) =>
			member.roles.cache.has(role.id)
		).size;

		let permission;
		const moderatorPermissions = [
			"KICK_MEMBERS",
			"BAN_MEMBERS",
			"MANAGE_CHANNELS",
			"MANAGE_GUILD",
			"MANAGE_MESSAGES",
			"MUTE_MEMBERS",
			"DEAFEN_MEMBERS",
			"MOVE_MEMBERS",
			"MANAGE_NICKNAMES",
			"MANAGE_ROLES",
			"MANAGE_WEBHOOKS",
			"MANAGE_EMOJIS_AND_STICKERS",
		];

		if (role.permissions.has("ADMINISTRATOR")) {
			permission = "Administrator";
		} else if (role.permissions.any(moderatorPermissions, false)) {
			permission = "Moderator";
		} else {
			permission = "Member";
		}

		const status = {
			false: "No",
			true: "Yes",
		};

		const embed = new Discord.MessageEmbed()
			.setAuthor({
				name: message.author.username,
				iconURL: message.author.displayAvatarURL({ dynamic: true }),
			})
			.setTitle("Role Information")
			.setDescription(
				`**• ID:** ${role.id}\n**• Name:** ${
					role.name
				}\n**• Mention:** ${role}\n**• Hex:** ${role.hexColor.toUpperCase()}\n**• Members with this role:** ${memberCount}\n**• Position:** ${
					role.position
				}\n**• Hoisted status:** ${status[role.hoist]}\n**• Mentionable:** ${
					status[role.mentionable]
				}\n**• Permission:** ${permission}`
			)
			.setColor(role.hexColor)
			.setThumbnail(role.guild.iconURL({ dynamic: true }))
			.setTimestamp()
			.setFooter({ text: client.user.tag, iconURL: client.user.avatarURL() });

		message.reply({ embeds: [embed] });
	},
};
