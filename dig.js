const http = require('http');
const { Resolver } = require("dns");
const resolver = new Resolver();
const CacheableLookup = require('cacheable-lookup');
const cacheable = new CacheableLookup();
cacheable.install(http.globalAgent);

const ns = [
    "103.196.38.38",
    "103.196.38.39"
];

resolver.setServers(ns);
cacheable.servers = ns;


const log = v => { 
	console.log( v );
}

const lookup_v1 = async params => {
	http.get("http://"+params.domain, {
	    lookup: cacheable.lookup
	}, (err, result) => {
		params.callBack( err ? err : result );

	});
}

const lookup_v2 = async params => {
	resolver.resolveNs(params.domain, (err, records) => {
		params.callBack( err ? err : records );
	})
}

const target = ``;

(function()
{

	try
	{
		lookup_v2( { 
			domain: target,
			callBack: log
		} );

	}
	catch(err)
	{
		log(err);
	
	}


})();