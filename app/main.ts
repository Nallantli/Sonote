// Modules to control application life and create native browser window

import { app, BrowserWindow, ipcMain } from 'electron';
import java from 'java';

let mainWindow: any;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		frame: false,
		backgroundColor: '#FFF',
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});

	mainWindow.loadFile('index.html');

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow();
	}
});

//JAVA

java.options.push("-Dfile.encoding=UTF-8");
java.options.push('-Xrs');
java.options.push('-Djava.awt.headless=true');
java.classpath.push("./bin");
java.classpath.push("./bin/SonoClient.jar");
java.classpath.push("./bin/external/json-simple-1.1.jar");

let listener = java.newProxy('Listener', {
	sendData: function (header: string, body: string, id: number, datum: any) {
		if (header == "DATUM") {
			if (datum != null) {
				mainWindow.webContents.send("code-finished", {
					id: id,
					result: datumJSON(datum)
				});
			}
		} else {
			mainWindow.webContents.send("listen", {
				header: header,
				body: body,
				id: id
			});
		}
	}
});

let decoder = java.newInstanceSync("Decoder", listener);

decoder.loadLibrarySync('sonote.so', null)

let execute_buffer: { event: any, arg: any }[] = [];
let buffer_timer = 50;

setInterval(() => {
	if (execute_buffer.length > 0) {
		const arg = execute_buffer[0].arg;
		const event = execute_buffer[0].event;
		execute_buffer.shift();
		executeBuffer(arg, event);
	}
}, buffer_timer);

function executeBuffer(arg: { head: string, body: any }, event: any): void {
	switch (arg.head) {
		case "run":
			let pairs: any[] = [];
			arg.body.forEach((p: { id: number, body: string }) => {
				pairs.push(java.newInstanceSync("BoxPair", p.id, p.body));
			});
			try {
				decoder.runSync(java.newArray("BoxPair", pairs));
			} catch (err) {
				console.log(err);
				console.log(arg);
			}
			break;
		case "lib":
			let outputArray = java.newArray("java.lang.Object", [
				java.newInstanceSync("LibraryOutput", listener, arg.body),
				java.newInstanceSync("LibraryError", listener),
				null
			]);
			let result = datumJSON(decoder.loadLibrarySync(arg.body, outputArray));
			if (result.type != "null" && result.value.length > 0) {
				event.sender.send(`listen`, {
					header: "LIB-LOAD",
					body: arg.body
				});
			}
			break;
	}
}

ipcMain.on("streamMain", function (event: any, arg: any) {
	execute_buffer.push({
		event: event,
		arg: arg
	});
});

function ruleComponentJSON(s: string): { type: string, data: any } {
	let comp: { type: string, data: any } = { type: "undefined", data: null };
	if (s.charAt(0) == '[') {
		comp.type = 'matrix';
		comp.data = [];
		s.substr(1, s.length - 2).split(", ").forEach((f) => {
			let e = f.split("|");
			comp.data.push({
				polarity: e[0] == "-" ? "−" : e[0],
				key: e[1]
			});
		});
	} else if (s.charAt(0) == '{') {
		comp.type = 'array';
		comp.data = [];
		s.substr(1, s.length - 2).split("; ").forEach((f) => {
			let res = ruleComponentJSON(f);
			if (res.type != "undefined")
				comp.data.push(res);
		});
	} else if (s == "null") {
		comp.type = "null";
	} else if (s == "") {
		return comp
	} else {
		comp.type = 'phone';
		comp.data = s;
	}
	return comp;
}

function datumJSON(datum: any): { type: string, value: any } {
	let type = datum.getTypeStringSync();
	switch (type) {
		case 'Number':
			return {
				type: type,
				value: datum.getNumberSync(null, null)
			};
		case 'null':
			return {
				type: type,
				value: "null"
			};
		case 'String':
			return {
				type: type,
				value: datum.getStringSync(null, null)
			};
		case 'Boolean':
			return {
				type: type,
				value: datum.getBoolSync(null, null)
			};
		case 'Vector':
			let elements: { type: string, value: any }[] = [];
			datum.getVectorSync(null, null).forEach((e: any) => {
				elements.push(datumJSON(e));
			});
			return {
				type: type,
				value: elements
			};
		case 'Dictionary':
			let json: any = {};
			datum.getMapSync(null, null).entrySetSync().toArraySync().forEach((e: any) => {
				let key: string = e.getKeySync();
				let value: any = datumJSON(e.getValueSync());
				json[key] = value;
			});
			return {
				type: type,
				value: json
			};
		case 'Matrix':
			return {
				type: type,
				value: ruleComponentJSON(datum.toStringTraceSync(null, null))
			};
		case 'Rule':
			let raw = datum.toStringTraceSync(null, null);
			let s1 = raw.split(" |> ");
			let s2 = s1[1].split(" // ");
			let s3 = s2[0].split(" -> ");
			let s4 = s2[1].split(" .. ");
			let rtypeRaw = s1[0];
			let searchRaw = s3[0];
			let transRaw = s3[1];
			let initRaw = s4[0];
			let finRaw = s4[1];

			let search = ruleComponentJSON(searchRaw);
			let trans = ruleComponentJSON(transRaw);
			let init = ruleComponentJSON(initRaw);
			let fin = ruleComponentJSON(finRaw);

			let ret = {
				type: rtypeRaw,
				search: search,
				trans: trans,
				init: init,
				fin: fin
			};

			return {
				type: type,
				value: ret
			};
		default:
			return {
				type: type,
				value: datum.toStringTraceSync(null, null)
			};
	}
}