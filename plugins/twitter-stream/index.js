const needle = require('needle');
const { bearertoken, filter, includetag } = require("./config.json");
const twitterApi = "https://api.twitter.com";

async function streamConnect(retryAttempt, callback) {
	let stream;
	const currentRules = await getAllRules();
	await deleteAllRules(currentRules);
	await setRules([filter])
	.then(() => {
		console.log(`${new Date().toLocaleString()} [hnschat-bot] info - starting plugin twitter-stream\nConnecting to stream.. `);

		stream = needle.get(twitterApi+'/2/tweets/search/stream', {
	        headers: {
	            "User-Agent": "v2FilterStreamJS",
	            "authorization": `Bearer ${bearertoken}`
	        },
	        timeout: 15_000
	    });

		stream.on('data', data => {
			try {
	    		const json = JSON.parse(data);
	    		const t = json.data.text;
	    		const message = includetag ? t : t.replace(filter.value.split(" ")[0]+" ","");
	    		callback(message);
	    		// A successful connection resets retry count.
	    		retryAttempt = 0;
			} 
			catch(err) {
	    		if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
	    			console.log(`${data.detail}\n${err}`);
	    			process.exit(1)
	            } else {
	                // Keep alive signal received. Do nothing.
	            };
			};
		}).on('err', error => {
	        if (error.code !== 'ECONNRESET') {
	            console.log(error.code);
	            process.exit(1);
	        } 
	        else {
	            // This reconnection logic will attempt to reconnect when a disconnection is detected.
	            // To avoid rate limits, this logic implements exponential backoff, so the wait time
	            // will increase if the client cannot reconnect to the stream.
	            setTimeout(() => {
	                console.warn("A connection error occurred. Reconnecting...")
	                streamConnect(++retryAttempt, callback);
	            }, 2 ** retryAttempt);
	        };
	    });
		return stream;
	});
};

async function getAllRules() {
    const response = await needle('get', twitterApi+'/2/tweets/search/stream/rules', {
        headers: {
            "authorization": `Bearer ${bearertoken}`
        }
    });

    if (response.statusCode !== 200) {
        console.log("Error:", response.statusMessage, response.statusCode)
        throw new Error(response.body);
    };

	return (response.body);
};

async function deleteAllRules(rules) {
	if (!Array.isArray(rules.data)) return null;
    const ids = rules.data.map(rule => rule.id);
    const data = {
        "delete": {
            "ids": ids
        }
    };
    const response = await needle('post', twitterApi+'/2/tweets/search/stream/rules', data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${bearertoken}`
        }
    });
    if (response.statusCode !== 200) {
        throw new Error(response.body);
    };
    return (response.body);
};

async function deleteAllRules(rules) {
	if (!Array.isArray(rules.data)) return null;

    const ids = rules.data.map(rule => rule.id);

    const data = {
        "delete": {
            "ids": ids
        }
    };

    const response = await needle('post', twitterApi+'/2/tweets/search/stream/rules', data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${bearertoken}`
        }
    });

    if (response.statusCode !== 200) {
        throw new Error(response.body);
    };

    return (response.body);
};

async function setRules(rules) {
    const data = {
        "add": rules
    };

    const response = await needle('post', twitterApi+'/2/tweets/search/stream/rules', data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${bearertoken}`
        }
    });

    if (response.statusCode !== 201) {
        throw new Error(response.body);
    };

	return (response.body);
};

module.exports = {
	twitter: {
		streamConnect: streamConnect
	}
};