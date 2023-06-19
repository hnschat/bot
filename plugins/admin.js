import events from "events";

import fetch from "node-fetch";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["reload"];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			if (!this.bot.isAdmin(msg.user)) {
				this.bot.stopTyping(msg.conversation);
				return;
			}

			switch (command) {
				case "reload":
					this.bot.PluginManager.reloadPlugins().then(() => {
						this.bot.sendMessage(msg, { message: "Reloaded" });
					});
					break;
			}
		});
	}
}