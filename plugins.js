import fs from "fs";
import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export class PluginManager {
	constructor(bot) {
		this.bot = bot;

		this.dir = `${__dirname}plugins/`;
		this.plugins = [];
	}

	async loadPlugins() {
		let output = new Promise(resolve => {
			fs.readdir(this.dir, (err, files) => {
				if (files.length) {
					files.forEach((file, k) => {
						let name = file.split(".")[0];
						if (this.bot.config.plugins.includes(name)) {
							import(`${url.pathToFileURL(`${this.dir}/${file}`).href}?t=${Date.now()}`).then(p => {
								this.plugins.push({
									name: name,
									plugin: new p["Plugin"](this.bot)
								});
								console.log(`LOADED PLUGIN: ${name}`);
							});
						}
						if (k == files.length - 1) {
							resolve();
						}
					});
				}
				else {
					resolve();
				}
			});
		});
		return await output;
	}

	async reloadPlugins() {
		this.plugins.forEach(plugin => {
			let name = plugin.name;
			plugin.plugin = null;
			console.log(`UNLOADED PLUGIN: ${name}`);
		});
		this.plugins = [];
		return await this.loadPlugins();
	}

	emit(command, msg) {
		let plugins;

		let cmd,params;
		switch (command) {
			case "COMMAND":
				let split = msg.message.split(" ");
				cmd = split[0].substring(1);
				split.shift();
				params = split;
				plugins = this.pluginsForCommand(cmd);
				break;

			case "MESSAGE":
				plugins = this.pluginsForType(command);
				break;

			case "ERROR":
			case "SUCCESS":
				plugins = this.pluginsForResponses(msg.type);
				break;
		}

		switch (command) {
			case "COMMAND":
				if (plugins.length) {
					this.bot.startTyping(msg.conversation);
				}
				break;
		}

		this.pluginEmit(plugins, command, msg, cmd, params);
	}

	pluginEmit(plugins, command, msg, cmd=false, params=false) {
		plugins.forEach(p => {
			p.plugin.events.emit(command, msg, cmd, params);
		});
	}

	pluginsForCommand(command) {
		return this.plugins.filter(p => {
			return p.plugin.commands && p.plugin.commands.includes(command);
		});
	}

	pluginsForType(type) {
		return this.plugins.filter(p => {
			return p.plugin.types && p.plugin.types.includes(type);
		});
	}

	pluginsForResponses(type) {
		return this.plugins.filter(p => {
			return p.plugin.responses && p.plugin.responses.includes(type);
		});
	}
}