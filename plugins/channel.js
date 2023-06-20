import events from "events";
		
export class Plugin {
	constructor(bot) {
		this.bot = bot;

		this.events = new events.EventEmitter();

		this.commands = ["channel"];
		this.types = ["MESSAGE"];
		this.responses = ["PM", "CREATECHANNEL", "RECEIVEDPAYMENT"];

		this.queued = [];
		this.started = [];
		this.channelPrice = 50;
		this.channelCreation = [];
		this.channelQuestions = [
			{ 
				param: "name",
				question: "What do you want the channel to be called?\n\nChannels can contain lowercase letters, numbers, and hyphens, but can't start or end with a hyphen.",
				pattern: "^[a-z0-9-]+$"
			},
			{ 
				param: "public",
				question: `Private channels can only be accessed by SLD's on a TLD that matches the channel name. For example, a private channel named "example" would only be accesible by names such as "an.example" or "another.example"\n\nShould this channel be private or public?`,
				answers: ["private", "public"]
			},
			{ 
				param: "tldadmin",
				question: "You will be given admin privledges on this channel.\n\nDo you own the TLD that matches this channel name and/or want to give admin access to whoever does?",
				answers: ["no", "yes"]
			}
		];

		this.init();
	}

	init() {
		this.events.on("COMMAND", (msg, command, params) => {
			switch (command) {
				case "channel":
					if (this.bot.isChannel(msg.conversation)) {
						this.queued.push({
							user: msg.user,
							message: `Creating a channel only takes a minute. You'll need to answer a few questions and then send a payment of ${this.channelPrice} HNS to complete the process. Type ${this.bot.config.trigger}channel to get started.`
						});

						let data = {
							domain: this.bot.userForID(msg.user).domain
						}
						this.bot.send("PM", data);
						this.bot.sendMessage(msg, { message: "I've sent you a PM with more information on creating a channel", reply: 1 });
					}
					else {
						this.channelCreation[msg.user] = {
							question: 0
						}
						this.bot.sendMessage(msg, { message: this.channelQuestions[this.channelCreation[msg.user].question].question, reply: 1 });
					}
					break;
			}
		});

		this.events.on("MESSAGE", msg => {
			if (!this.bot.isChannel(msg.conversation)) {
				if (typeof this.channelCreation[msg.user] !== "undefined") {
					let q = this.channelQuestions[this.channelCreation[msg.user].question];
					if (q) {
						if (q.pattern) {
							const regex = new RegExp(q.pattern);
							if (regex.test(msg.message)) {
								this.channelCreation[msg.user].question += 1;
								this.channelCreation[msg.user][q.param] = msg.message;
							}
						}
						else if (q.answers) {
							if (q.answers.includes(msg.message.toLowerCase())) {
								this.channelCreation[msg.user].question += 1;

								let index = q.answers.indexOf(msg.message.toLowerCase());
								this.channelCreation[msg.user][q.param] = index;
							}
						}

						if (this.channelCreation[msg.user].question > this.channelQuestions.length - 1) {
							let data = this.channelCreation[msg.user];
							data.user = msg.user;
							delete data.question;

							this.bot.send("CREATECHANNEL", data);
						}
						else {
							let nextQ = this.channelQuestions[this.channelCreation[msg.user].question];
							let question = this.channelQuestions[this.channelCreation[msg.user].question].question;

							if (nextQ.answers) {
								let answers = `[${nextQ.answers.map(this.capitalize).join("/")}]`;

								question += "\n\n"+answers;
							}
							this.bot.sendMessage(msg, { message: question });
						}
					}
					else {
						try {
							let json = JSON.parse(msg.message);

							if (json.hnschat) {
								let id = this.channelCreation[msg.user].id;
								let tx = json.payment;
								let amount = json.amount;

								let data = {
									user: msg.user,
									channel: id,
									tx: tx,
									amount: amount
								};
								this.bot.send("RECEIVEDPAYMENT", data);
							}
						}
						catch {
							const regex = new RegExp("^(?:[a-z0-9]{64})$");
							if (regex.test(msg.message)) {
								let id = this.channelCreation[msg.user].id;
								let tx = msg.message;

								let data = {
									user: msg.user,
									channel: id,
									tx: tx
								};
								this.bot.send("RECEIVEDPAYMENT", data);
							}
						}
					}
				}
			}
		});

		this.events.on("ERROR", msg => {
			switch (msg.type) {
				case "PM":
					this.handlePMReply(msg);
					break;

				case "CREATECHANNEL":
					if (msg.user) {
						let pm = this.bot.pmWithUser(msg.user);
						if (pm) {
							this.bot.sendMessage(pm, { message: `${msg.message} Type ${this.bot.config.trigger}channel to start over.` });
						}
					}
					break;

				case "RECEIVEDPAYMENT":
					if (msg.user) {
						let pm = this.bot.pmWithUser(msg.user);
						if (pm) {
							this.bot.sendMessage(pm, { message: msg.message });
						}
					}
					break;
			}
		});

		this.events.on("SUCCESS", msg => {
			switch (msg.type) {
				case "PM":
					this.handlePMReply(msg);
					break;

				case "CREATECHANNEL":
					if (msg.user) {
						let pm = this.bot.pmWithUser(msg.user);
						if (pm) {
							this.bot.sendMessage(pm, { message: `That's it! Just send a payment of ${msg.fee} HNS to complete your registration.` });
							this.bot.sendMessage(pm, { message: `If you don't have the Bob Wallet extension you can send the payment to hnschat/ (hs1qf0cxy6ukhgjlmqfhe0tpw800t2tcul4s0szwqa) and respond to this message with ONLY the transaction hash.` });
							this.bot.sendMessage(pm, { message: `Once the payment is verified it will take roughly 30 minutes to confirm and for the channel to appear.` });
							this.channelCreation[msg.user]["id"] = msg.id;
						}
					}
					break;

				case "RECEIVEDPAYMENT":
					if (msg.user) {
						let pm = this.bot.pmWithUser(msg.user);
						if (pm) {
							this.bot.sendMessage(pm, { message: `You're all set! Your channel should be live within 30 minutes.` });
							delete this.channelCreation[msg.user];
						}
					}
					break;
			}
		});
	}

	handlePMReply(msg) {
		if (msg.id) {
			let otherUser = this.bot.otherUserFromPM(msg.id);
			let queuedMessage = this.queuedMessage(otherUser.id);
			if (queuedMessage) {
				this.queued = this.queued.filter(q => {
					return q.id !== queuedMessage.user;
				});
				this.bot.sendMessage(msg, { message: queuedMessage.message });
			}
		}
	}

	queuedMessage(user) {
		return this.queued.filter(q => {
			return q.user == user;
		})[0];
	}

	capitalize(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}