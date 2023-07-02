import events from "events";

import fetch from "node-fetch";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["hns", "blockheight", "height", "bh"];

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
								this.bot.sendMessage(msg, { message: `${(input / price).toLocaleString("en-US", { minimumFractionDigits: 2 })} HNS` });
							}
							else {
								this.bot.sendMessage(msg, { message: `$${(price * input).toLocaleString("en-US", { minimumFractionDigits: 2 })}` });
							}
						}
						else {
							this.bot.sendMessage(msg, { message: `$${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` });
						}
					});
					break;

				case "blockheight":
				case "height":
				case "bh":
					fetch("https://varo.domains/api?action=getInfo").then(response => response.json()).then(r => {
						this.bot.sendMessage(msg, { message: r.data.blockHeight, style: "fancy" });
					});
					break;
			}
		});
	}
}