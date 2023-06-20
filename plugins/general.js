import events from "events";

export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["commands", "whoami", "whois", "whatis"];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			switch (command) {
				case "commands":
					let commands = [];
					this.bot.PluginManager.plugins.forEach(p => {
						if (p.name !== "admin") {
							if (!p.plugin.commands) {
								p.plugin.commands = [];
							}
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
					let userSplit = msg.message.split(" ");
					if (userSplit.length > 1) {
						let user = userSplit[1];
						if (user[0] == "@") {
							user = user.substring(1);
						}
						else {
							user = this.bot.userForName(user).id;
						}
						this.bot.sendMessage(msg, { message: user, reply: 1 });
					}
					break;

				case "whatis":
					let channelSplit = msg.message.split(" ");
					if (channelSplit.length > 1) {
						let channel = channelSplit[1];
						if (channel[0] == "@") {
							channel = channel.substring(1);
						}
						else {
							channel = this.bot.channelForName(channel).id;
						}
						this.bot.sendMessage(msg, { message: channel, reply: 1 });
					}
					break;
			}
		});
	}
}