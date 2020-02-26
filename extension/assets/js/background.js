let getConfig = (callback) => {
	fetch(chrome.runtime.getURL("/assets/json/config.json")).then((resp) => resp.json()).then((data) => {
		callback(data);
	});
};

getConfig((config) => {
	localStorage.setItem("isActive", "false");

	let proxy = {};

	proxy.factory = (scheme, host, port) => {
		return {
			value: {
				mode: "fixed_servers",
				rules: {
					proxyForHttp: {scheme: scheme, host: host, port: port},
					proxyForHttps: {scheme: scheme, host: host, port: port},
					proxyForFtp: {scheme: scheme, host: host, port: port},
					fallbackProxy: {scheme: scheme, host: host, port: port},
					bypassList: ["<local>", "chrome-devtools://*.*"]
				}
			}
		};
	};

	proxy.enable = (callback) => {
		let proxyConfig = proxy.factory(
			config.scheme,
			config.host, config.port
		);

		chrome.proxy.settings.set(proxyConfig, () => {
			callback(true);
		});
	};

	proxy.disable = (callback) => {
		chrome.proxy.settings.clear({}, () => {
			callback(true);
		});
	};

	chrome.runtime.onMessage.addListener(
	(request) => {
		if(request.sender == "popup") {
			console.log("[*] Received message from pop:", request.data);
			if(request.data.isActive == true) {
				proxy.enable(() => {
					console.log("[*] Proxy enabled");
				});
			} else if(request.data.isActive == false) {
				proxy.disable(() => {
					console.log("[*] Proxy disabled");
				});
			}
		}
	});

	let pending = [];

	let completed = (details) => {
		var index = pending.indexOf(details.requestId);
		if (index > -1) {
			pending.splice(index, 1);
		}
	};

	let provideCredentials = (details, callback) => {
		let gotCredentials = (credentials) => {
			callback({authCredentials: credentials});
		};

		if (pending.indexOf(details.requestId) != -1) {
			console.warn("Credentials are invalid for " + details.requestId);

			proxy.disable(() => {
				console.log("[*] Proxy disabled");
			});
	
			localStorage.setItem("authError", "true");

			chrome.browserAction.setBadgeText({
				text: "!"
			});

			chrome.browserAction.setBadgeBackgroundColor({
				color: "#FF0000"
			});

			chrome.notifications.create("authError", {
				type: "basic",
				iconUrl: "/assets/img/carbon128.png",
				title: "Carbon VPN Error",
				message: "Carbon failed to connect to the proxy because the provided credentials were invalid."
			});

			callback({cancel: true});
		} else {
			pending.push(details.requestId);
			console.log("Providing credentials to " + details.requestId);
			gotCredentials({
				username: config.username,
				password: config.password
			});
		}
	};

	chrome.webRequest.onAuthRequired.addListener(
		provideCredentials,
		{urls: ["<all_urls>"]},
		["asyncBlocking"]
	);
	
	chrome.webRequest.onCompleted.addListener(
		completed,
		{urls: ["<all_urls>"]}
	);
	
	chrome.webRequest.onErrorOccurred.addListener(
		completed,
		{urls: ["<all_urls>"]}
	);
	
	localStorage.getItem("carbon_serial") !== null ? "" : localStorage.setItem("carbon_serial", Math.floor(Math.random() * (1e10 - 1e5) + 1e3).toString(16).toUpperCase());
});