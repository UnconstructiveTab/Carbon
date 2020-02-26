let getConfig = (callback) => {
	fetch(chrome.runtime.getURL("/assets/json/config.json")).then((resp) => resp.json()).then((data) => {
		callback(data);
	});
};

getConfig((config) => {
	let uid = () => Math.floor(Math.random() * (1e7 - 1e5) + 1e5).toString(16),
		serial = localStorage.getItem("carbon_serial");
	
	let connectionTest = () => {
		let setStrength = (mbps) => {
			let score = (mbps == 0) ? 0 :
						(mbps < 20) ? 1 :
						(mbps < 70) ? 2 :
						(mbps >= 70) ? 3 : 0;
	
			document.getElementById("signal").src = "/assets/img/signal-" + score + ".svg";
		};

		let xhr = new XMLHttpRequest();
		let startTime = (new Date()).getTime();
		try {
			xhr.open("GET", config.scheme + "://" + config.host + config.connect + "?" + uid(), true);
			xhr.send();
		} catch(e) {
			console.warn("Couldn't connect to host test.");
			setStrength(0);
		}
	
		xhr.onload = () => {
			if(xhr.status !== 200) {
				console.warn("Couldn't connect to host test.");
				setStrength(0);
			} else {
				let endTime = (new Date()).getTime();
				let fileSize = xhr.responseText.length;
				let mbps = Math.floor((fileSize / ((endTime - startTime) / 1000) / 1024 ));
				console.log("Measuring " + Math.round(mbps) + "mbps.");
				setStrength(mbps);
			}
		};
	};

	chrome.runtime.onMessage.addListener(
	(request) => {
		if(request.sender == "background") {
			console.log("[*] Received message from bg:", request.data);
			
		}
	});

	localStorage.getItem("isActive") === "true" ? document.getElementById("connectionStatus").checked = true : "";

	document.getElementById("serial").innerHTML = serial;

	document.getElementById("toggleConnection").addEventListener("click", () => {
		connectionTest();
		let status = document.getElementById("connectionStatus").checked;
		document.getElementById("connectionStatus").checked = !status;
		status = !status;

		localStorage.setItem("isActive", status.toString());

		chrome.runtime.sendMessage({
			sender: "popup",
			data: {
				isActive: status
			}
		});
	});

	document.getElementById("checkConnection").addEventListener("click", () => {
		connectionTest();
	});

	document.getElementById("version").innerText = chrome.runtime.getManifest().version;

	document.getElementById("server").innerText = config.host + ":" + config.port;

	document.getElementById("username").innerText = config.username;

	chrome.browserAction.setBadgeText({
		text: ""
	});

	chrome.notifications.clear("authError");
	
	if(localStorage.getItem("authError") === "true") {
		localStorage.removeItem("authError");
		document.getElementById("connectionStatus").checked = false;
	}

	connectionTest();
});
