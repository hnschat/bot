const { subtle } = require('crypto').webcrypto;

var http = require("https");
var WebSocket = require("ws");

let config = require("./config.json");
let session = config.session;
let domain = config.domain;
let keys = config.keys;
let conversation = config.conversation;

var socket;
var users,conversations;

getUsers().then(r => {
	users = r.users;

	getConversations().then(r => {
		conversations = r.conversations;

		var pms = 0;
		Object.keys(conversations).forEach(c => {
			if (!conversations[c].group) {
				pms += 1;
			}
		});

		var ready = 0;
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
	socket = new WebSocket("wss://ws.hns.chat");

	socket.onopen = e => {
		socket.send("IDENTIFY "+session);
	};

	socket.onmessage = e => {
		parse(e);
	};
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
	let output = new Promise(function(resolve){
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

	return await output;
}

function parse(e) {
	let message = e.data;
	let split = message.match(/(?<command>[A-Z]+)\s(?<body>.+)/);
	let command = split.groups.command;
	let body = JSON.parse(split.groups.body);

	switch (command) {
		case "MESSAGE":
			if (conversation && body.conversation !== conversation) {
				return;
			}

			if (Object.keys(conversations).includes(body.conversation)) {
				messageBody(body).then(decoded => {
					if (decoded === "!hns") {
						hnsPrice().then(response => {
							if (response) {
								reply(body, "$"+response);
							}
						});
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

function reply(message, string) {
	let dkey = conversations[message.conversation].key || null;
	encryptIfNeeded(message.conversation, string, dkey).then(function(m){
		let data = {
			action: "sendMessage",
			conversation: message.conversation,
			from: domain,
			message: m
		};

		ws("ACTION", data);
	});
}

async function encryptIfNeeded(conversation, message, dkey) {
	let output = new Promise(function(resolve) {
		if (dkey) {
			encryptMessage(message, dkey, conversation).then(function(m){
				resolve(m);
			});
		}
		else {
			resolve(message);
		}
	});

	return await output;
}

function ws(command, body) {
	socket.send(command+" "+JSON.stringify(body));
}

async function hnsPrice() {
	let options = {
		host: "api.coingecko.com",
		path: "/api/v3/simple/price?ids=handshake&vs_currencies=usd",
	}

	let output = new Promise(resolve => {
		http.get(options, r => {
			var response = '';
			
			r.on('data', chunk => {
				response += chunk;
			});
			r.on('end', () => {
				let json = JSON.parse(response);
				resolve(json.handshake.usd);
			});
		}).on('error', e => {
			resolve();
		});
	});

	return await output;
}

async function api(data) {
	if (session) {
		data["key"] = session;
	}

	let output = new Promise(resolve => {
		data = JSON.stringify(data);

		let options = {
			host: "hns.chat",
			path: "/api",
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
		        'Content-Length': Buffer.byteLength(data)
			}
		}

		var req = http.request(options, r => {
			var response = '';
			r.on('data', chunk => {
				response += chunk;
			});
			r.on('end', () => {
				let json = JSON.parse(response);
				resolve(json);
			});
		}).on('error', e => {
			resolve();
		});

		req.write(data);
		req.end();
	});

	return await output;
}

async function makeSecretIfNeeded(c) {
	let output = new Promise(resolve => {
		if (!conversations[c].group) {
			makeSecret(c).then(r => {
				resolve();
			});
		}
		else {
			resolve();
		}
	});

	return await output;
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
	let c = conversations[id];

	let user = Object.keys(c.users).filter(user => {
		return user !== domain;
	}).join(", ");

	return c.users[user];
}

function getUsers() {
	let data = {
		action: "getUsers"
	};

	return api(data);
}

function getConversations() {
	let data = {
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