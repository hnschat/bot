import { WebSocket } from "ws";

export class ws {
	constructor(parent) {
		this.parent = parent;

		this.ping;
		this.typing;
	}

	async connect() {
		let connected = new Promise(resolve => {
			this.socket = new WebSocket(`wss://${this.parent.config.host}/wss`);

			this.socket.onopen = (e) => {
				console.log("CONNECTED");
				this.identify();

				this.ping = setInterval(() => {
					this.send("PING");
				}, 30000);

				this.typing = setInterval(() => {
					this.parent.sendTyping();
				}, 2000);

				resolve();
			}

			this.socket.onclose = (e) => {
				console.log("DISCONNECTED");
				clearInterval(this.ping);
				clearInterval(this.typing);

				this.parent.ready(false);
				setTimeout(() => {
					this.connect();
				}, 2000);
			}

			this.socket.onmessage = (e) => {
				//console.log(`IN: ${e.data}`);
				this.parent.message(e.data);
			}

			this.socket.onerror = (e) => {
				console.log("ERROR CONNECTING");
			}
		});

		return await connected;
	}

	send(message) {
		//console.log(`OUT: ${message}`);
		this.socket.send(message);
	} 

	identify() {
		this.send(`IDENTIFY ${this.parent.session}`);
	}
}