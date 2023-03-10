import events from "events";

import fetch from "node-fetch";
		
export class hns {
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
					fetch("https://api.coingecko.com/api/v3/simple/price?ids=handshake&vs_currencies=usd").then(response => response.json()).then(r => {
						let price = r.handshake.usd;

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