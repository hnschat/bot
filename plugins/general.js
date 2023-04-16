import events from "events";

import fetch from "node-fetch";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["commands", "whoami"];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			switch (command) {
				case "commands":
					let commands = [];
					this.bot.PluginManager.plugins.forEach(p => {
						if (p.name !== "admin") {
							commands = [...commands, ...p.plugin.commands];
						}
					});
					commands = commands.filter(c => {
						return c !== "commands"
					});
					commands.sort();
					commands.forEach((command, k) => {
						commands[k] = `${this.bot.config.trigger}${command}`;
					});
					this.bot.reply(msg, `Here is a list of my available commands:\n${commands.join(", ")}`);
					break;

				case "whoami":
					this.bot.reply(msg, msg.user, { reply: 1 });
					break;
			}
		});
	}
}