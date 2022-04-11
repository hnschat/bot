const { subtle } = require('crypto');

let http = require("https");
let WebSocket = require("ws");

let config = require("./config.json");
let session = config.session;
let domain = config.domain;
let keys = config.keys;
let conversation = config.conversation;

let socket;
let users,conversations;

const snappyResponses = [
	"Buy another name",
	"Maybe code some more ya lazy bum",
	"Ask Matthew for a selfie, even if he didn't DM you",
	"Fly to the moon in the curve of a spoon",
	"Chase the dragon",
	"Go to bed!"
];

const buildIdeas = [
	"Burner function on PC messages",
	"Rate limit ip/session/name",
	"video-player",
	"change color input type to color",
	"give message style linear-gradient (37deg,$color1,$color2)"
];


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
					if ( decoded.substr( 0, 4 ) === "$dig" )
					{
						const domain = decoded.substr( 5 );

						// 
					}

					if ( decoded.substr( 0, 5 ) === "$help" && decoded.indexOf( "avatar") !== -1 )
					{
						cmcPrice(5221).then(response => {
							if (response) {
								const usr = users.forEach( (u, i) =>
								{
									( u.id == body.user ) && reply(body, "Hi "+u.domain+"/. You can set a TXT record like this: \"profile avatar=url-to-png/gif/NFT\". It can take up to 20 minutes for your avatar to become visible after that");

								});
							}
						});

					}					

					switch (decoded)
					{
						case "$whoami":
							cmcPrice(5221).then(response => {
								if (response) {
									const usr = users.forEach( (u, i) =>
									{
										( u.id == body.user ) && reply(body, u.domain+"/");

									});
								}
							});
							break;

						case "$eth":
							cmcPrice(1027).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$btc":
							cmcPrice(1).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$ar":
							cmcPrice(5632).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$atom":
							cmcPrice(3794).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$icp":
							cmcPrice(8916).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$cake":
							cmcPrice(7186).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$doge":
							cmcPrice(74).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$hns":
							cmcPrice(5221).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$xau":
							cmcPrice(3575).then(response => {
								if (response) {
									reply( body, "$"+Math.round( response * 100000 ) / 100000 );
								}
							});
							break;

						case "$bot, what should i do?":
							cmcPrice(5221).then(response => {
								if (response) {
									reply( body, snappyResponses[Math.round( Math.random() * 5 -1 )] );
								}
							});
							break;		

						case "$bot, i have a question":
							cmcPrice(5221).then(response => {
								if (response) {
									const usr = users.forEach( (u, i) =>
									{
										( u.id == body.user ) && reply(body, "Hi "+u.domain+"/, how can i help you?");

									});
								}
							});
							break;

						case "$bot, are you there?":
							cmcPrice(5221).then(response => {
								if (response) {
									const usr = users.forEach( (u, i) =>
									{
										( u.id == body.user ) && reply(body, "Hi "+u.domain+"/, i am here!");

									});
								}
							});
							break;

						case "$bot, what are your options?":
							cmcPrice(5221).then(response => {
								if (response) {
									const usr = users.forEach( (u, i) =>
									{
										( u.id == body.user ) && reply(body, `
											--$whoami --$eth --$btc --$ar --$atom --$icp --$cake --$doge --$hns --$xau --$bot, are you there? --$bot, what should i do?
										`);

									});
								}
							});
							break;

						default: return;

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

async function cmcPrice(id) {
	let options = {
		host: "naturalmystic.shop",
		path: "/api/v1/exchange-proxy/latest/?id="+id+"&NM_API_KEY=ush88989-ahd986t-auhcd7787-x7",
	}

	let output = new Promise(resolve => {
		http.get(options, r => {
			let response = '';
			
			r.on('data', chunk => {
				response += chunk;
			});
			r.on('end', () => {
				let json = JSON.parse(response);
				const data = json.data[id];
				resolve(data.quote.USD.price);
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