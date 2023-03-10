import { webcrypto } from "crypto";
const { subtle } = webcrypto;

export class e2ee {
	async generateKeys() {
		const keyPair = await subtle.generateKey(
			{
				name: "ECDH",
				namedCurve: "P-256",
			},
			true,
			["deriveKey", "deriveBits"]
		);

		const publicKeyJwk = await subtle.exportKey(
			"jwk",
			keyPair.publicKey
		);

		const privateKeyJwk = await subtle.exportKey(
			"jwk",
			keyPair.privateKey
		);

		return { publicKeyJwk, privateKeyJwk };
	}

	async importKey(x, y, d) {
		const privateKey = await subtle.importKey(
			"jwk",
			{
				kty: "EC",
				crv: "P-256",
				x: x,
				y: y,
				d: d,
				ext: true,
			},
			{
				name: "ECDH",
				namedCurve: "P-256",
			},
			true,
			["deriveKey", "deriveBits"]
			);

			const privateKeyJwk = await subtle.exportKey(
				"jwk",
				privateKey
		);

		return privateKeyJwk;
	}

	async deriveKey(publicKeyJwk, privateKeyJwk) {
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

	async encryptMessage(text, derivedKey, conversation) {
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

	async decryptMessage(text, derivedKey, conversation) {
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
		} 
		catch {
			return text;
		}
	};
}