import { PluginManager } from "./plugins.js";
import { e2ee } from "./e2ee.js";
import { ws } from "./ws.js";
import config from "./config.json" assert { type: 'json' };

function log(string) {
	console.log(string);
}

export class HNSChat {
	constructor() {
		this.PluginManager = new PluginManager(this);

		this.ws = new ws(this);
		this.e2ee = new e2ee();

		this.keys;
		this.session;
		this.domain;
		this.domains;
		this.conversation;

		this.users;
		this.active;

		this.channels;
		this.pms;

		this.gotChannels;
		this.gotPms;
		this.gotMentions;

		this.replying;

		this.init();
	}

	time() {
		return Math.floor(Date.now() / 1000);
	}

	async init() {
		this.config = config;

		await this.PluginManager.loadPlugins();

		this.keys = config.keys;
		this.session = config.session;
		this.domain = config.domain;
		this.conversation = config.conversation;

		await this.ws.connect();
	}

	regex(pattern, string) {
		return [...string.matchAll(pattern)];
	}

	rtrim = (str, chr) => str.replace(new RegExp(!chr ? '\\s+$' : chr + '+$'), '');

	replaceRange(s, start, end, substitute) {
		var before = s.substr(0, start);
		var after = s.substr(end, (s.length -end));

		return before+substitute+after;
	}

	sorted(array, by) {
		return array.sort((a, b) => a[by].localeCompare(b[by]));
	}

	isAdmin(user) {
		if (this.config.admins.includes(user)) {
			return true;
		}
		return false;
	}

	sendDomain() {
		if (!this.domain) {
			if (this.domains.length) {
				this.domain = this.domains[0].id;
				localStorage.setItem("domain", this.domain);
			}
			else {
				this.openURL("/id");
				return;
			}
		}
		this.ws.send(`DOMAIN ${this.domain}`);
	}

	message(data) {
		let message = data.toString();
		let parsed = message.match(/(?<command>[A-Z]+)(\s(?<body>.+))?/);
		this.handle(parsed.groups);
	}

	handle(parsed) {
		let command = parsed.command;
		var body = parsed.body;

		switch (command) {
			case "DOMAIN":
				break;

			default:
				if (body) {
					body = JSON.parse(body);

					for (var k in body) {
						try {
							body[k] = JSON.parse(body[k]);
						}
						catch {}

						for (var i in body[k]) {
							try {
								body[k][i] = JSON.parse(body[k][i]);
							}
							catch {}
						}
					}
				}
				break;
		}

		switch (command) {
			case "ERROR":
				this.PluginManager.emit(command, body);
				break;

			case "SUCCESS":
				this.PluginManager.emit(command, body);
				break;

			case "IDENTIFIED":
				this.ws.send("DOMAINS");
				break;

			case "DOMAINS":
				this.domains = body;
				this.sendDomain();
				break;

			case "DOMAIN":
				this.ws.send("USERS");
				break;

			case "USERS":
				body.forEach((user, k) => {
					body[k].domain = body[k].domain.toString();
				});
				this.users = body;
				this.ws.send(`CHANNELS`);
				this.ws.send(`PMS`);
				this.ws.send("PING");
				break;

			case "USER":
				this.users = this.users.filter(u => {
					return u.id != body.id;
				});

				body.domain = body.domain.toString();
				this.users.push(body);

				if (body.id !== this.domain) {
					let pm = this.pmWithUser(body.id);
					if (pm) {
						this.makeSecret(pm);
					}
				}
				break;

			case "CHANNELS":
				this.channels = body;
				this.gotChannels = true;
				this.ready(true);
				break;

			case "PMS":
				this.pms = body;
				if (this.pms.length) {
					let sorted = this.pms.sort((a, b) => {
						return b.activity - a.activity;
					});
					sorted.forEach((conversation, k) => {
						this.makeSecret(conversation).then((key) => {
							if (k == body.length - 1) {
								this.gotPms = true;
								this.ready(true);
							}
						});
					});
				}
				else {
					this.gotPms = true;
					this.ready(true);
				}
				break;

			case "PM":
				this.pms.push(body);
				this.makeSecret(body);
				break;

			case "MESSAGE":
				let c;
				if (this.isChannel(body.conversation)) {
					c = this.channelForID(body.conversation);
				}
				else {
					c = this.pmForID(body.conversation);
				}
				c.activity = body.time;

				if (body.user === this.domain) return;
			
				if (this.conversation && body.conversation !== this.conversation) return;

				this.decryptMessageIfNeeded(body.conversation, body).then(decrypted => {
					let user = this.userForID(body.user).domain;

					body.message = decrypted[0];

					try {
						body.message = JSON.parse(body.message);
					}
					catch {}

					if (body.message.action) {
						body.message = body.message.action;
						body.isAction = true;
					}
					else if (body.message.message) {
						body.message = body.message.message;
					}

					if (typeof body.message == "string") {
						if (body.message.substring(0, this.config.trigger.length) == this.config.trigger) {
							this.PluginManager.emit("COMMAND", body);
						}
						else {
							this.PluginManager.emit(command, body);
						}
					}
				});
				break;

			case "PONG":
				this.active = body.active;
				break;
		}
	}

	pm(user, message) {
		let domain = this.userForID(user).domain;
		this.queued.push({
			domain: domain,
			message: message
		});

		let data = { 
			domain: domain 
		};
		this.ws.send(`PM ${JSON.stringify(data)}`);
	}

	otherUserFromPM(id) {
		let pm = this.pmForID(id);
		let otherUserID = this.otherUser(pm.users);
		let otherUser = this.userForID(otherUserID);
		return otherUser;
	}

	ready(bool) {
		if (!bool) {
			this.gotChannels = false;
			this.gotPms = false;
			this.gotMentions = false;
		}
	}

	isChannel(name) {
		if (name.toString().length == 8) {
			return true;
		}
		return false;
	}

	channelForID(id) {
		return this.channels.filter(c => {
			return c.id == id;
		})[0];
	}

	channelForName(name) {
		return this.channels.filter(c => {
			return c.name == name;
		})[0];
	}

	pmForID(id) {
		return this.pms.filter(c => {
			return c.id == id;
		})[0];
	}

	pmWithUser(id) {
		return this.pms.filter(c => {
			return c.users.includes(id);
		})[0];
	}

	otherUser(users) {
		return users.filter(u => {
			return u !== this.domain;
		})[0];
	}

	userForID(id) {
		return this.users.filter(u => {
			return u.id == id;
		})[0];
	}

	userForName(name) {
		let matches = this.users.filter(u => {
			return u.domain == name;
		});

		matches.sort((a, b) => {
			return a.locked - b.locked;
		});

		return matches[0];
	}

	usersForConversation(id) {
		let conversation = this.channels.filter(c => {
			return c.id == id;
		})[0];

		var users = this.users.filter(u => {
			return !u.locked;
		});
		if (!conversation.public) {
			users = this.users.filter(u => {
				return !u.locked && u.tld == conversation.name;
			});
		}

		return users;
	}

	userIsActive(id) {
		return this.active.includes(id);
	}

	async makeSecret(conversation) {
		let output = new Promise(resolve => {
			let otherUserID = this.otherUser(conversation.users);
			let otherUser = this.userForID(otherUserID);
			let otherKey = otherUser.pubkey;

			this.e2ee.deriveKey(otherKey, this.keys.privateKeyJwk).then(key => {
				otherUser.sharedkey = key;
				resolve(key);
			});
		});

		return await output;
	}

	async decryptedBody(conversation, message) {
		let output = new Promise(resolve => {
			let pm = this.pmForID(conversation);
			let user = this.userForID(this.otherUser(pm.users));

			this.e2ee.decryptMessage(message, user.sharedkey, conversation).then(decrypted => {
				resolve(decrypted.trim());
			});
		});

		return await output;
	}

	async decryptMessageIfNeeded(conversation, message) {
		let body = new Promise(resolve => {
			if (this.isChannel(conversation)) {
				resolve(message.message);
			}
			else {
				this.decryptedBody(conversation, message.message).then(decrypted => {
					resolve(decrypted);
				});
			}
		});

		let replyBody = new Promise(resolve => {
			if (message.p_message) {
				if (this.isChannel(conversation)) {
					resolve(message.p_message);
				}
				else {
					this.decryptedBody(conversation, message.p_message).then(decrypted => {
						resolve(decrypted);
					});
				}
			}
			else {
				resolve();
			}
		});

		let prepared = await Promise.all([body, replyBody]);
		return prepared;
	}

	async encryptedBody(conversation, message) {
		let output = new Promise(resolve => {
			let pm = this.pmForID(conversation);
			let user = this.userForID(this.otherUser(pm.users));

			this.e2ee.encryptMessage(message, user.sharedkey, conversation).then(encrypted => {
				resolve(encrypted.trim());
			});
		});

		return await output;
	}

	async encryptMessageIfNeeded(conversation, message) {
		let output = new Promise(resolve => {
			if (this.isChannel(conversation)) {
				resolve(message);
			}
			else {
				this.encryptedBody(conversation, message).then(encrypted => {
					resolve(encrypted);
				});
			}
		});

		return await output;
	}

	send(type, data) {
		let output = `${type}`
		if (typeof data == "object") {
			output += ` ${JSON.stringify(data)}`;
		}
		else {
			output += ` ${data}`;
		}
		this.ws.send(output);
	}

	sendMessage(msg, data={}) {
		let conversation = msg.conversation || msg.id;

		let message = {
			hnschat: 1
		}

		if (data.reply) {
			this.replying = msg.id;
			delete data.reply;
		}

		message = JSON.stringify({ ...message, ...data });

		this.encryptMessageIfNeeded(conversation, message).then(encrypted => {
			let m = {
				conversation: conversation,
				message: encrypted
			}

			if (this.replying) {
				m.replying = this.replying;
			}

			this.ws.send(`MESSAGE ${JSON.stringify(m)}`);

			this.replying = null;
		});
	}
}

new HNSChat();