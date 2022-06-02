require("dotenv").config();
const { ShardingManager } = require("discord.js");
const log = require("node-pretty-log");
const manager = new ShardingManager("src/engine.js", {
	token: process.env.TOKEN,
});

console.log(" __  __     ______     __   __     __   __     ______    ")
console.log("/\ \/ /    /\  __ \   /\ "-.\ \   /\ "-.\ \   /\  __ \   ")
console.log("\ \  _"-.  \ \  __ \  \ \ \-.  \  \ \ \-.  \  \ \  __ \  ")
console.log(" \ \_\ \_\  \ \_\ \_\  \ \_\\"\_\  \ \_\\"\_\  \ \_\ \_\ ")
console.log("  \/_/\/_/   \/_/\/_/   \/_/ \/_/   \/_/ \/_/   \/_/\/_/ ")
console.log("                                                         ")

manager.on("shardCreate", (shard) => log("info", `Launched shard ${shard.id}`));
manager.spawn();
