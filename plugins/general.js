import events from "events";

import fetch from "node-fetch";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["commands", "whoami", "whois"];

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
					this.bot.sendMessage(msg, { message: `Here is a list of my available commands:\n${commands.join(", ")}` });
					break;

				case "whoami":
					this.bot.sendMessage(msg, { message: msg.user, reply: 1 });
					break;

				case "whois":
					let split = msg.message.split(" ");
					if (split.length > 1) {
						let user = split[1];
						if (user[0] == "@") {
							user = user.substring(1);
						}
						else {
							user = this.bot.userForName(user).id;
						}
						this.bot.sendMessage(msg, { message: user, reply: 1 });
					}
					break;
			}
		});
	}
}