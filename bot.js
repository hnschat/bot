const { subtle } = require('crypto').webcrypto;

const xml2js = require('xml2js');

const http = require("https");
const WebSocket = require("ws");
const { session, domain, keys, conversation, trigger } = require("./config.json");

var socket;
var users,conversations;

getUsers().then(r => {
	users = r.users;

	getConversations().then(r => {
		conversations = r.conversations;

		let pms = 0;
		Object.keys(conversations).forEach(c => {
			if (!conversations[c].group) {
				pms += 1;
			}
		});

		let ready = 0;
		Object.keys(conversations).forEach(c => {
			makeSecretIfNeeded(c).then(d => {
				if (!conversations[c].group) {
					ready += 1;
				}

				if (ready == pms) {
					setupWebSocket();
				}
			});
		});
	});
});

function log(m) {
	console.log(m);
}

function setupWebSocket() {
	if (!socket) {
		socket = new WebSocket("wss://ws.hns.chat");

		socket.onopen = e => {
			socket.send("IDENTIFY "+session);
		};

		socket.onmessage = e => {
			parse(e);
		};

		socket.onclose = e => {
			socket = false;
		};
	}
}

function isGroup(id) {
	try {
		if (conversations[id].group) {
			return true;
		}
	}
	catch (error) {}
	return false;
}

async function messageBody(message) {
	return await new Promise(function(resolve){
		if (isGroup(message.conversation)) {
			resolve(message.message);
		}
		else {
			let dkey = conversations[message.conversation].key;
			decryptMessage(message.message, dkey, message.conversation).then(function(decoded){
				resolve(decoded);
			});
		}
	});
}

function parse(e) {
	const message = e.data;
	const split = message.match(/(?<command>[A-Z]+)\s(?<body>.+)/);
	const command = split.groups.command;
	const body = JSON.parse(split.groups.body);

	switch (command) {
		case "MESSAGE":
			if (body.user === domain) return;
			
			if (conversation && body.conversation !== conversation) return;
			
			if (Object.keys(conversations).includes(body.conversation)) {
				messageBody(body).then(decoded => {
					if (decoded[0] === trigger) {
						handleCommand(body, decoded);
					}
				});
			}
			break;

		case "CONVERSATION":
			conversations[conversation.id] = body;
			makeSecret(body);
			break;
	}
}

function handleCommand(msg, message) {
	let split = message.split(" ");
	const command = split[0].substring(1);
	split.shift();
	const params = split;

	switch (command) {
		case "hns":
			fetchData({
				host: "api.coingecko.com",
				path: "/api/v3/simple/price?ids=handshake&vs_currencies=usd",
			}).then(response => {
				if (response) {
					const data = JSON.parse(response);
					let price = data.handshake.usd;

					if (params.length) {
						let input = params[0].replace(/[^\$0-9\.]/g, '');
						if (input[0] === "$") {
							input = input.substring(1);
							reply(msg, `${(input / price).toLocaleString("en-US")} HNS`);
						}
						else {
							reply(msg, `$${(price * input).toLocaleString("en-US")}`);
						}
					}
					else {
						reply(msg, `$${price.toLocaleString("en-US")}`);
					}
				}
			});
			break;

		case "theshake":
			fetchData({
				host: "theshake.substack.com", 
				path: "/feed"
			}).then(response => {
				if (response) {	
					parseXML(response).then(data => {
						const { link } = data.rss.channel[0].item[0];;
						reply(msg, `${link}`);
					});
				}
			});
			break;
		
		default: break;
	}

}

function reply(message, string) {
	const dkey = conversations[message.conversation].key || null;
	encryptIfNeeded(message.conversation, string, dkey).then(function(m){
		const data = {
			action: "sendMessage",
			conversation: message.conversation,
			from: domain,
			message: m
		};

		ws("ACTION", data);
	});
}

async function parseXML(data) {
	const parser = new xml2js.Parser();
	return await new Promise(resolve => {
		parser.parseStringPromise(data).then(result => {
			resolve(result);				
		}).catch(err => {
			// log(err);
			resolve();
		});
	});
};

async function encryptIfNeeded(conversation, message, dkey) {
	return await new Promise(resolve => {
		if (dkey) {
			encryptMessage(message, dkey, conversation).then(function(m){
				resolve(m);
			});
		}
		else {
			resolve(message);
		}
	});
}

function ws(command, body) {
	socket.send(command+" "+JSON.stringify(body));
}

async function fetchData(options) {
	return await new Promise(resolve => {
		http.get(options, r => {
			let data = '';
			
			r.on('data', chunk => {
				data += chunk;
			});
			r.on('end', () => {
				resolve(data);
			});
		}).on('error', e => {
			resolve();
		});
	});
}


async function api(data) {
	if (session) {
		data["key"] = session;
	}

	return await new Promise(resolve => {
		data = JSON.stringify(data);

		const options = {
			host: "hns.chat",
			path: "/api",
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
		        'Content-Length': Buffer.byteLength(data)
			}
		}

		const req = http.request(options, r => {
			let response = '';
			r.on('data', chunk => {
				response += chunk;
			});
			r.on('end', () => {
				const json = JSON.parse(response);
				resolve(json);
			});
		}).on('error', e => {
			resolve();
		});

		req.write(data);
		req.end();
	});
}

async function makeSecretIfNeeded(c) {
	return await new Promise(resolve => {
		if (!conversations[c].group) {
			makeSecret(c).then(r => {
				resolve();
			});
		}
		else {
			resolve();
		}
	});
}

async function makeSecret(k) {
	let derivedKey = new Promise(resolve => {
		let otherUser = getOtherUser(k);
		let otherKey = JSON.parse(otherUser.pubkey);

		if (otherKey) {
			deriveKey(otherKey, keys.privateKeyJwk).then(d => {
				conversations[k].key = d;
				resolve(d);
			});
		}
		else {
			resolve();
		}
	}); 

	return await derivedKey;
}

function getOtherUser(id) {
	const c = conversations[id];

	const user = Object.keys(c.users)
	 .filter(u => u !== domain)
	 .join(", ");

	return c.users[user];
}

function getUsers() {
	const data = {
		action: "getUsers"
	};

	return api(data);
}

function getConversations() {
	const data = {
		action: "getConversations",
		domain: domain
	};

	return api(data);
}

async function deriveKey(publicKeyJwk, privateKeyJwk) {
  const publicKey = await subtle.importKey(
    "jwk",
    publicKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );

  const privateKey = await subtle.importKey(
    "jwk",
    privateKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  return await subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

async function encryptMessage(text, derivedKey, conversation) {
  const encodedText = new TextEncoder().encode(text);

  const encryptedData = await subtle.encrypt(
    { name: "AES-GCM", iv: new TextEncoder().encode(conversation) },
    derivedKey,
    encodedText
  );

  const uintArray = new Uint8Array(encryptedData);

  const string = String.fromCharCode.apply(null, uintArray);

  const base64Data = btoa(string);

  return base64Data;
};

async function decryptMessage(text, derivedKey, conversation) {
  try {
    const initializationVector = new Uint8Array(new TextEncoder().encode(conversation)).buffer;

    const string = atob(text);
    const uintArray = new Uint8Array(
      [...string].map((char) => char.charCodeAt(0))
    );
    const algorithm = {
      name: "AES-GCM",
      iv: initializationVector,
    };
    const decryptedData = await subtle.decrypt(
      algorithm,
      derivedKey,
      uintArray
    );

    return new TextDecoder().decode(decryptedData);
  } catch (e) {
    return text;
  }
};