// @ts-nocheck

const { Client, Collection, Intents, Guild } = require("discord.js");
const fs = require("fs");
const { GiveawaysManager } = require("./utils/giveaway");
const Ascii = require("ascii-table");
const table = new Ascii("Database");
const schemas = require("./database/schemas");
const {Signale} = require('signale');
const signale = require('signale');
const client = new Client({
        allowedMentions: { parse: ["users"] },
        intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MEMBERS,
                Intents.FLAGS.GUILD_MESSAGES,
        ],
});

const options = {
	disabled: false,
	interactive: false,
	logLevel: 'info',
	scope: 'custom',
	secrets: [],
	stream: process.stdout,
	types: {
	  loading: {
			badge: '↻',
			color: 'yellow',
			label: 'loading',
			logLevel: 'info'
	  }
	}
};

const custom = new Signale(options);

table.setHeading("Schema", "Status");

client.commands = new Collection();
client.aliases = new Collection();
client.categories = fs.readdirSync("src/commands/");
client.prefixes = new Collection();
client.giveawaysManager = new GiveawaysManager(client, {
        storage: "./src/database/json/giveaways.json",
        updateCountdownEvery: 5000,
        default: {
                botsCanWin: false,
                embedColor: "#CD1C6C",
                embedColorEnd: "#CD1C6C",
                reaction: "🎉",
        },
});

fs.readdirSync("src/handler/").forEach((handler) =>
        require(`./handler/${handler}`)(client)
);

Object.keys(schemas).forEach((schema) => {
        schemas[schema]();

        table.addRow(schema, "✅");
});

(async () => {
        const Guilds = await schemas.guild().findAll();

        if (!Guild.length) return;

        Guilds.forEach((guild) =>
                client.prefixes.set(guild.dataValues.guildID, guild.dataValues.prefix)
        );
})();
console.log("=============================")
signale.watch(`Loading DB`)
custom.loading("\n" + table.toString());

client.login(process.env.TOKEN);
