import events from "events";

import fetch from "node-fetch";
		
export class admin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["reload"];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			if (msg.user != this.bot.config.admin) {
				return;
			}

			switch (command) {
				case "reload":
					this.bot.PluginManager.reloadPlugins().then(() => {
						this.bot.reply(msg, "Reloaded");
					});
					break;
			}
		});
	}
}