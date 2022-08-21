const { price, locale } = require("./config.json");

const questions = {
	EN: [
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
			question: "You will be given admin privledges on this channel.\n\nDo you own the TLD that matches this channel name and/or want to give admin access to whoever does (y/n)?",
			answers: ["n", "y"]
		}
	],
	FR: [
		{ 
			param: "name",
			question: "Comment aimez-vous que la chaîne s'appelle?\n\nLes chaînes peuvent contenir des lettres minuscules, des chiffres et des traits d'union, mais ne peuvent pas commencer ou se terminer par un trait d'union.",
			pattern: "^[a-z0-9-]+$"
		},
		{ 
			param: "public",
			question: `Les canaux privés ne sont accessibles que par les domaines de sous-niveau sur un domian de niveau supérieur qui correspond au nom du canal. Par exemple, un canal privé nommé "exemple" ne serait accessible que par des noms tels que"un.exemple" ou "un-autre.exemple"\n\nCette chaîne doit-elle être privée ou publique?`,
			answers: ["privé", "publique"]
		},
		{ 
			param: "tldadmin",
			question: "Vous recevrez des privilèges d'administrateur sur ce canal.\n\nPossédez-vous le domaine de premier niveau qui correspond à ce nom de chaîne et/ou souhaitez-vous accorder un accès administrateur à quiconque le possède (y/n)?",
			answers: ["n", "y"]
		}
	],
	ES: [
		{ 
			param: "name",
			question: "¿Cómo quieres que se llame el canal?\n\nLos canales pueden contener letras minúsculas, números y guiones, pero no pueden comenzar ni terminar con un guión.",
			pattern: "^[a-z0-9-]+$"
		},
		{ 
			param: "public",
			question: `Solo se puede acceder a los canales privados mediante dominios de nivel inferior en un dominio de nivel superior que coincida con el nombre del canal. Por ejemplo, un canal privado llamado "ejemplo" solo sería accesible por nombres como "un.ejemplo" o "otro.ejemplo".\n\n¿Este canal debe ser privado o público?`,
			answers: ["privado", "público"]
		},
		{ 
			param: "tldadmin",
			question: "Se le otorgarán privilegios de administrador en este canal.\n\n¿Es dueño del dominio de nivel superior que coincide con el nombre de este canal y/o desea otorgar acceso de administrador a quien lo haga (y/n)?",
			answers: ["n", "y"]
		}
	]
};

module.exports = {
	channel: {
		price: price,
		questions: questions[locale]
	}
};