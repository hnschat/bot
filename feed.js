const { subtle } = require('crypto');

const http = require("https");
const WebSocket = require("ws");

let xml2js = require('xml2js');

let config = require("./config.json");
let session = config.session;
let domain = config.domain;
let keys = config.keys;
let conversation = config.conversation;

let socket;
let users,conversations;

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
			if (!conversations[c].group) {
				makeSecret(c).then(d => {
					ready += 1;
					if (ready == pms) {
						setupWebSocket();
					}
				});
			}
		});
		setupWebSocket();
	});
});

function log(v) {
	console.log(v);
}

function setupWebSocket() {
	socket = new WebSocket("wss://ws.hns.chat");

	socket.onopen = e => {
		log(session);
		socket.send("IDENTIFY "+session);
	};

	socket.onmessage = e => {
		// log(e);
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

async function XMLparse(data,body) {
	let parser = new xml2js.Parser();
	parser.parseStringPromise(data).then(function (result) {
		const latest = result.rss.channel[0].item[0];
	  const { title, description, link } = latest;
	  const article = `${title}\n${description}\n${link}`;
	  reply(body,article);
	  return article;
	})
	.catch(err => {
	  log(err);
	});
};

function parse(e) {
	let message = e.data;
	let split = message.match(/(?<command>[A-Z]+)\s(?<body>.+)/);
	let command = split.groups.command;
	let body = JSON.parse(split.groups.body);

	
	switch (command) {
		case "MESSAGE":
			if (conversation && body.conversation !== conversation) return;

			if (Object.keys(conversations).includes(body.conversation)) {
				messageBody(body).then(decoded => {
					switch (decoded)
					{
						case "$theshake":
							getShakeFeed(body);
							break;
						
						default: 
							break;

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
	socket.send(`${command} ${JSON.stringify(body)}`);
}

async function getShakeFeed(replyBody) {
	let options = {
		host: "theshake.substack.com",
		path: "/feed",
	}

	let output = new Promise(resolve => {
		http.get(options, r => {
			let response = '';
			
			r.on('data', chunk => {
				response += chunk;
			});
			r.on('end', () => {
				let data = XMLparse(response,replyBody);
				resolve(data);// resolve(data.quote.USD.price);
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

		let req = http.request(options, r => {
			let response = '';
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

async function makeSecret(k) {
	log(k);
	let derivedKey = new Promise(resolve =>{
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
