import events from "events";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["confetti"];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			switch (command) {
				case "confetti":
					this.bot.reply(msg, "CONFETTI!", { effect: "confetti" });
					break;
			}
		});
	}
}