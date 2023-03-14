import events from "events";

import fetch from "node-fetch";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["hns"];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			switch (command) {
				case "hns":
					fetch("https://varo.domains/api?action=getInfo").then(response => response.json()).then(r => {
						let price = r.data.price;

						if (params.length) {
							let input = params[0].replace(/[^\$0-9\.]/g, '');
							if (input[0] === "$") {
								input = input.substring(1);
								this.bot.reply(msg, `${(input / price).toLocaleString("en-US")} HNS`);
							}
							else {
								this.bot.reply(msg, `$${(price * input).toLocaleString("en-US")}`);
							}
						}
						else {
							this.bot.reply(msg, `$${price.toLocaleString("en-US")}`);
						}
					});
					break;
			}
		});
	}
}