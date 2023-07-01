import events from "events";

import fetch from "node-fetch";
import xml2js from "xml2js";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["theshake"];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			switch (command) {
				case "theshake":
					fetch("https://theshake.substack.com/feed").then(response => response.text()).then(str => {
						this.parseXML(str).then(data => {
							const { link } = data.rss.channel[0].item[0];
							this.bot.sendMessage(msg, { message: link[0] });
						});
			        });
					break;
			}
		});
	}

	async parseXML(data) {
		const parser = new xml2js.Parser();
		return await new Promise(resolve => {
			parser.parseStringPromise(data).then(result => {
				resolve(result);				
			}).catch(err => {
				resolve();
			});
		});
	};
}