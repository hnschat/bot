import events from "events";

import { Configuration, OpenAIApi } from "openai";
	
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["ai"];

		this.openai = new OpenAIApi(new Configuration({
		    organization: this.bot.config.openaiOrg,
		    apiKey: this.bot.config.openaiKey
		}));

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			switch (command) {
				case "ai":
					if (!this.bot.isChannel(msg.conversation)) {
						this.bot.sendMessage(msg, { message: "This command only works in channels." });
						return;
					}

					let message = params.join(" ");
					try {
						this.openai.createChatCompletion({
							model: "gpt-3.5-turbo",
							messages: [{role: "user", content: message}],
							user: msg.user
						}).then(r => {
							this.bot.sendMessage(msg, { message: r.data.choices[0].message.content });
						});
					}
					catch {
						this.bot.sendMessage(msg, { message: "Something went wrong. Sorry." });
					}
					break;
			}
		});
	}
}