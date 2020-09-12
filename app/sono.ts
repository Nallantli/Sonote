import { ipcRenderer, remote } from 'electron';
const { dialog } = remote;
import Sortable from 'sortablejs';
import hotkeys from 'hotkeys-js';
import fs from 'fs';

let libraries: string[] = [];
let codeboxcount = 0;
let wallcount = 0;
let current: any = {};
let currentWalls = 0;
let has_error: any = {};
let wallnames: any = {};

let openfile: string | undefined = undefined;

hotkeys('ctrl+n, command+n', newFile);
hotkeys('ctrl+s, command+s', () => saveFile(false));
hotkeys('ctrl+shift+s, command+shift+s', () => saveFile(true));
hotkeys('ctrl+o, command+o', openFile);
hotkeys('ctrl+shift+n, command+shift+n', () => { addWall(true) });
hotkeys('ctrl+w, command+w', closeCurrentWall);
hotkeys('ctrl+shift+i, command+shift+i', devTools);

function openFile(): void {
	document.getElementById('status-operation')!.innerText = "Opening File...";
	document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-folder-open"></i>`;
	let path: string[] | undefined = dialog.showOpenDialogSync({
		"title": "Open Notebook",
		"filters": [{
			"name": "Notebook",
			"extensions": ["snb"]
		}]
	});
	if (path != undefined) {
		loadAllData(JSON.parse(fs.readFileSync(path[0], 'utf8')));
		openfile = path[0];
		openWall(0);
		refresh(undefined, 0, -1);

		document.title = openfile + " - Sonote";
		document.getElementById('window-title')!.innerText = openfile + " - Sonote";
		document.getElementById('status-filename')!.innerText = openfile;

		setTimeout(() => {
			document.getElementById('status-operation')!.innerText = "Idle";
			document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-check"></i>`;
		}, 300);
	}
}

function saveFile(force: boolean): void {
	document.getElementById('status-operation')!.innerText = "Saving File...";
	document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-save"></i>`;
	if (openfile == undefined || force == true) {
		let path: string | undefined = dialog.showSaveDialogSync({
			"title": "Save Notebook",
			"filters": [{
				"name": "Notebook",
				"extensions": ["snb"]
			}]
		});
		if (path != undefined) {
			fs.writeFileSync(path, JSON.stringify(getAllData()), 'utf8');
			openfile = path;

			document.title = openfile + " - Sonote";
			document.getElementById('window-title')!.innerText = openfile + " - Sonote";
			document.getElementById('status-filename')!.innerText = openfile;
			setTimeout(() => {
				document.getElementById('status-operation')!.innerText = "Idle";
				document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-check"></i>`;
			}, 300);
		}
	} else {
		fs.writeFileSync(openfile, JSON.stringify(getAllData()), 'utf8');
		setTimeout(() => {
			document.getElementById('status-operation')!.innerText = "Idle";
			document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-check"></i>`;
		}, 300);
	}
}

function devTools(): void {
	remote.getCurrentWindow().webContents.toggleDevTools();
}

function newFile(): void {
	resetData();
	openfile = undefined;
}

function resetData(): void {
	wallnames = {};
	current = {};
	currentWalls = 0;
	codeboxcount = 0;
	wallcount = 0;
	has_error = {};
	libraries = [];

	ipcRenderer.send("streamMain", {
		head: "new"
	});

	document.getElementById("tabs")!.innerHTML = "";
	document.getElementById("wall-cont")!.innerHTML = "";
	document.getElementById("library-list")!.innerHTML = `<div class="library-name"><i class="far fa-file-code"></i> std.so</div>`;

	document.title = "Sonote";
	document.getElementById('window-title')!.innerText = "Sonote";
	document.getElementById('status-filename')!.innerText = "";
	document.getElementById('status-wallname')!.innerText = "";

}

function loadAllData(data: { libraries: string[], walls: { wallName: string, codeboxes: { code: string, pinned: boolean }[] }[] }): void {
	resetData();

	data.libraries.forEach((l) => {
		addLibrary(decodeURIComponent(l));
	});

	let last: number;
	data.walls.forEach((wall) => {
		let wallID = addWall(false, decodeURIComponent(wall.wallName));
		for (let i = 0; i < wall.codeboxes.length; i++) {
			last = addCodeBox(i == 0 ? undefined : last, wallID, false, wall.codeboxes[i].code);
			if (wall.codeboxes[i].pinned)
				pinCodeBox(last);
			refresh(last, wallID, -2);
		}
	});
}

function getAllData(): { libraries: string[], walls: { wallName: string, codeboxes: { code: string, pinned: boolean }[] }[] } {
	let data: any = [];

	const wallTabs = document.getElementById(`tabs`)!.children;

	Array.from(wallTabs).forEach((tab) => {
		let wallData: any = {};
		let wallID = Number(tab.id.split("-")[1]);
		wallData.wallName = document.getElementById(`wallname-${wallID}`)?.innerText as string;
		wallData.codeboxes = [];

		const boxes = document.getElementById(`wall-${wallID}`)!.children;
		Array.from(boxes).forEach((box) => {
			let boxID = Number(box.id.split("-")[1]);
			wallData.codeboxes.push({
				code: document.getElementById(`cbi-${boxID}`)?.innerHTML.replace(/\<span.*?\>/gi, "").replace(/\<\/span\>/gi, "") as string,
				pinned: document.getElementById(`cbo-${boxID}`)?.classList.contains("pinned-box")
			});
		})

		data.push(wallData);
	});

	return {
		libraries: libraries,
		walls: data
	};
}

ipcRenderer.on('code-finished', function (_event, arg: { id: number, result: any }) {
	document.getElementById('status-operation')!.innerText = "Idle";
	document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-check"></i>`;

	document.getElementById(`cbo-${arg.id}`)!.innerHTML = renderDatum(arg.result, 0);
	document.getElementById(`rt-${arg.id}`)!.style.display = "none";

	Object.keys(new_charts).forEach((key) => {
		createChart(`chart-${key}`, new_charts[key].graph);
	});

	new_charts = {};
});

function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

ipcRenderer.on('listen', function (_event, result: { header: string, id: number, body: string }) {
	switch (result.header) {
		case 'OUT':
			if (has_error[result.id]) {
				document.getElementById(`cbp-${result.id}`)!.innerHTML = '';
				has_error[result.id] = false;
			}
			document.getElementById(`cbp-${result.id}`)!.innerHTML += escapeHtml(result.body);
			break;
		case 'ERR':
			has_error[result.id] = true;
			if (result.body.trim() == "null")
				document.getElementById(`cbp-${result.id}`)!.innerHTML = `<div class="error-cont">Undefined Error</div>`;
			else
				document.getElementById(`cbp-${result.id}`)!.innerHTML = `<div class="error-cont">${escapeHtml(result.body)}</div>`;
			break;
		case 'LIB-ERR':
			alert(result.body);
			break;
		case 'LIB-LOAD':
			updateLibList(decodeURIComponent(result.body));
			break;
	}
});

function addWall(createBox: boolean, name?: string): number {
	const wallID = wallcount;
	const wallHTML = `<div class="wall" id="wall-${wallID}"></div>`;
	const tabHTML = `
	<li class="tablinks selectedtab" id="tab-${wallID}">
		<i class="fab fa-buffer tab-icon"></i>
		<button class="opentab" onclick="openWall(${wallID})" ondblclick="renameWall(${wallID})" id="wallname-cont-${wallID}">
			<span id="wallname-${wallID}"></span>
		</button>
		<button class="closetab" onclick="closeWall(${wallID})">
			<i class="fas fa-times-circle"></i>
		</button>
	</li>`

	document.getElementById('wall-cont')!.innerHTML += wallHTML;
	document.getElementById('tabs')!.innerHTML += tabHTML;

	current[wallID] = 0;
	wallcount++;
	currentWalls++;
	if (name == undefined) {
		setWallName(wallID, `untitled`);
		$(`#wallname-${wallID}`).trigger('dblclick');
	}
	else
		setWallName(wallID, name);
	openWall(wallID);
	if (createBox) {
		addCodeBox(undefined, wallID, false);
	}
	return wallID;
}

function renameWall(wallID: number): void {
	document.getElementById(`wallname-cont-${wallID}`)!.innerHTML = `<input class="wallname-input" id="wallname-input-${wallID}" type="text" value="${wallnames[wallID]}">`;
	document.getElementById(`wallname-input-${wallID}`)!.addEventListener('keyup', (event) => {
		if (event.key === 'Enter') {
			setWallName(wallID);
		}
		if (event.key === 'Escape') {
			(<HTMLInputElement>document.getElementById(`wallname-input-${wallID}`)).value = wallnames[wallID];
			setWallName(wallID);
		}
	});
	$(`#wallname-input-${wallID}`).trigger('focus').trigger('select');
	$(`#wallname-input-${wallID}`).one('blur', () => {
		(<HTMLInputElement>document.getElementById(`wallname-input-${wallID}`)).value = wallnames[wallID];
		setWallName(wallID);
	});
}

function setWallName(wallID: number, name?: string): void {
	if (name == undefined) {
		name = (<HTMLInputElement>document.getElementById(`wallname-input-${wallID}`)).value;
		if (name == "")
			return;
		try {
			document.getElementById(`wallname-cont-${wallID}`)!.innerHTML = `<span id="wallname-${wallID}"></span>`;
		} catch { }
	}
	wallnames[wallID] = name;
	document.getElementById(`wallname-${wallID}`)!.innerText = name;
	document.getElementById('status-wallname')!.innerText = wallnames[wallID];
}

function openWall(wallID: number): void {
	document.getElementById('status-wallname')!.innerText = wallnames[wallID];

	if (!document.getElementById(`tab-${wallID}`)?.classList.contains("selectedtab")) {
		refresh(undefined, wallID, 0);
	}

	let list1 = document.getElementsByClassName("tablinks");
	let list2 = document.getElementsByClassName("wall");
	for (var i = 0; i < list1.length; i++) {
		list1[i].classList.remove("selectedtab");
		(<HTMLElement>list2[i]).style.display = "none";
		Sortable.get((<HTMLElement>list2[i]))?.destroy();
	}
	document.getElementById(`tab-${wallID}`)!.classList.add("selectedtab");
	document.getElementById(`wall-${wallID}`)!.style.display = "block";

	Sortable.create(document.getElementById(`wall-${wallID}`)!, {
		animation: 150,
		group: `wall-${wallID}`,
		swapThreshold: 1,
		onUpdate: () => {
			refresh(undefined, wallID, 0);
		}
	});
}

function closeCurrentWall(): void {
	closeWall(Number(document.getElementsByClassName('selectedtab')[0].id.split('-')[1]));
}

function closeWall(wallID: number): void {
	if (currentWalls > 1) {
		currentWalls--;
		if (document.getElementById(`tab-${wallID}`)!.classList.contains("selectedtab")) {
			let id: number;
			let temp = document.getElementById(`tab-${wallID}`)!.previousElementSibling;
			if (temp != null) {
				id = Number((<HTMLElement>temp).id.split("-")[1]);
			} else {
				id = Number(document.getElementById(`tab-${wallID}`)!.nextElementSibling?.id.split("-")[1]);
			}
			openWall(id);
		}
		document.getElementById(`tab-${wallID}`)!.remove();
		document.getElementById(`wall-${wallID}`)!.remove();
	}
}

function addCodeBox(id: number | undefined, wallID: number, top: boolean, code?: string): number {
	const boxN = codeboxcount;
	has_error[boxN] = false;
	const codeboxHTML =
		`
	<div class="codebox" id="cb-${boxN}">
		<div class="codebox-bar">
			<button class="cb-button runbutton" onclick="addCodeBox(${boxN}, true)"><i class="fas fa-plus"></i></button>
		</div>
		<div class="codebox-output" id="cbo-${boxN}"><div class="vector-cont"></div></div>
		<div class="codebox-input-cont" id="cbic-${boxN}">
		<div contenteditable="true" class="codebox-input" id="cbi-${boxN}" onfocus="setInputWatch('#cbi-${boxN}')" onblur="removeInputWatch('#cbi-${boxN}')" oninput="refresh(${boxN}, ${wallID}, 300)"></div>
		<div class="codebox-input-print" id="cbip-${boxN}"><div></div></div>
		</div>
		<div class="codebox-print" id="cbp-${boxN}"></div>
		<div class="codebox-bar">
			<button class="cb-button runbutton" onclick="addCodeBox(${boxN}, ${wallID}, false)"><i class="fas fa-plus"></i></button>
			<button class="cb-button runbutton" onclick="pinCodeBox(${boxN})"><i class="fas fa-thumbtack"></i></button>
			<div class="running-thread" id="rt-${boxN}" style="display:none"><i class="fas fa-circle-notch spinner"></i></div>
			<button class="cb-button closebutton" onclick="closeCodeBox(${boxN}, ${wallID})"><i class="fas fa-minus"></i></button>
		</div>
	</div>`;

	if (id == undefined) {
		document.getElementById(`wall-${wallID}`)!.innerHTML += codeboxHTML;
	} else {
		if (top)
			document.getElementById(`cb-${id}`)!.insertAdjacentHTML("beforebegin", codeboxHTML);
		else
			document.getElementById(`cb-${id}`)!.insertAdjacentHTML("afterend", codeboxHTML);
	}
	codeboxcount++;
	current[wallID]++;

	if (code != undefined) {
		document.getElementById(`cbi-${boxN}`)!.innerHTML = code;
	}

	return boxN;
}

function pinCodeBox(boxN: number): void {
	document.getElementById(`cbo-${boxN}`)!.classList.toggle("pinned-box");
	document.getElementById(`cbic-${boxN}`)!.classList.toggle("pinned-input");
	document.getElementById(`cbi-${boxN}`)!.contentEditable = document.getElementById(`cbi-${boxN}`)!.contentEditable == 'true' ? 'false' : 'true';
}

function closeCodeBox(boxN: number, wallID: number): void {
	if (current[wallID] > 1) {
		document.getElementById(`cb-${boxN}`)!.remove();
		refresh(undefined, wallID, 0);
		current[wallID]--;
	}
}

let writingTimeout: NodeJS.Timeout | null = null;

function refresh(boxN: number | undefined, wallID: number, delay: number): void {
	if (boxN != undefined) {
		document.getElementById('status-operation')!.innerText = "Typing...";
		document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-pen"></i>`;
		const content = codeFormatter(document.getElementById(`cbi-${boxN}`)!.innerText).replace(/\n\n/gi, "\n").replace(/\t/gi, `<span style="white-space:pre">\t</span>`).split("\n").map((e: string) => {
			return `<div>${e}</div>`
		}).join("");
		document.getElementById(`cbip-${boxN}`)!.innerHTML = content;
	}

	if (delay >= 0) {
		if (writingTimeout != null)
			clearTimeout(writingTimeout);
		writingTimeout = setTimeout(() => {
			refreshOutputs(wallID);
		}, delay);
	} else if (delay == -1) {
		refreshOutputs(wallID);
	}
}

function refreshOutputs(wallID: number): void {
	document.getElementById('status-operation')!.innerText = "Running...";
	document.getElementById('status-icon')!.innerHTML = `<i class="fas fa-circle-notch spinner"></i>`;
	const blocks = document.getElementById(`wall-${wallID}`)!.children;

	let codeInfo = [];

	for (let i = 0; i < blocks.length; i++) {
		let id = Number(blocks[i].id.split("-")[1]);
		codeInfo.push(getCodeInfo(id));
	}

	ipcRenderer.send("streamMain", {
		head: "run",
		body: codeInfo
	});
}

function addLibrary(libname?: string): void {
	ipcRenderer.send("streamMain", {
		head: "lib",
		body: encodeURIComponent(libname == undefined ? (<HTMLInputElement>document.getElementById(`library-new`)).value.trim() : libname)
	});
}

function updateLibList(libname: string): void {
	document.getElementById("library-list")!.innerHTML += `<div class="library-name"><i class="far fa-file-code"></i> ${libname}</div>`;
	(<HTMLInputElement>document.getElementById(`library-new`)).value = "";
	libraries.push(libname);
}

function getCodeInfo(boxN: number): { id: number, body: string } {
	document.getElementById(`rt-${boxN}`)!.style.display = "inline-block";
	document.getElementById(`cbp-${boxN}`)!.innerHTML = "";
	has_error[boxN] = false;
	return {
		id: boxN,
		body: encodeURIComponent(document.getElementById(`cbi-${boxN}`)!.innerText)
	};
}

let chartcount = 0;
let new_charts: any = {};

function renderDatum(value: { type: string, value: any }, i: number): string {
	switch (value.type) {
		case 'null':
			return `<i class="null-datum">${value.value}</i>`;
		case 'Rule':
			return renderRule(value.value);
		case 'Dictionary':
			return renderDict(value.value, i);
		case 'Vector':
			let html = `<div class="vector-cont">`;
			value.value.forEach((e: { type: string, value: any }) => {
				html += `<div>${renderDatum(e, i + 1)}</div>`;
			});
			html += `</div>`;
			return html;
		case 'Matrix':
			return `<math class="ruledisplay"><mrow>${renderRuleComp(value.value)}</mrow></math>`;
		case 'String':
			let s = '"' + value.value + '"';
			if (s.length > 100)
				s = s.substr(0, 100) + "..."
			return `<span>${s}</span><span class="type-datum"> -> String</span>`;
		default:
			return `<span>${value.value}</span><span class="type-datum"> -> ${value.type}</span>`;
	}
}

function renderDict(dict: any, i: number): string {
	if (dict.type != undefined && dict.type.type == "String" && dict.type.value == 'canvas-graph') {
		new_charts[chartcount] = dict;
		return `<canvas id="chart-${chartcount++}" height="${dict.height.value}"></canvas>`;
	} else {
		let html = `<table class="dict-cont">`;
		Object.keys(dict).forEach((key) => {
			html += `<tr><td class="dict-key">${key}</td>`;
			html += `<td class="dict-value">${renderDatum(dict[key], i + 1)}</td></tr>`;
		});
		html += `</table>`;
		return html;
	}
}

function renderRule(rule: any): string {
	let html = `<math class="ruledisplay"><mrow>`;
	html += `<mrow><ms class="rchar ruletype" lquote rquote><b>${rule.type}</b></ms></mrow>`;
	html += `<mo class="rulesep">&nbsp│&nbsp</mo>`;
	if (rule.search.type != 'null')
		html += renderRuleComp(rule.search);
	else
		html += `<mrow><ms class="rchar" lquote rquote>∅</ms></mrow>`;
	html += `<mo class="rulesep">&nbsp→&nbsp</mo>`;
	if (rule.trans.data.length > 0)
		html += renderRuleComp(rule.trans);
	else
		html += `<mrow><ms class="rchar" lquote rquote>∅</ms></mrow>`;
	html += `<mo class="rulesep ruleslash">⧸</mo>`;
	html += renderRuleComp(rule.init);
	html += `<mo class="rulesep">&nbsp___&nbsp</mo>`;
	html += renderRuleComp(rule.fin);
	html += `</mrow></math>`
	return html;
}

function renderRuleComp(comp: { type: string, data: any }): string {
	let html = `<mrow>`;
	switch (comp.type) {
		case 'null':
			break;
		case 'phone':
			html += `<ms class="rchar" lquote rquote>${comp.data.replace("_", "\u035C").replace("^", "#")}</ms>`
			break;
		case 'matrix':
			html += `<mo class="lbracket" fence="true">[</mo><mtable>`;
			comp.data.forEach((f: { polarity: string, key: string }) => {
				html += `
					<mtr>
						<mtd>
							<mrow>
								<mo>${f.polarity}</mo>
								<mi>${f.key}</mi>
							</mrow>
						</mtd>
					</mtr>`;
			});
			html += `</mtable><mo class="rbracket" fence="true">]</mo>`;
			break;
		case 'array':
			comp.data.forEach((e: { type: string, data: any }) => {
				html += renderRuleComp(e);
			});
			break;
	}
	html += `</mrow>`;
	return html;
}

function showLibraries(): void {
	if (document.getElementById('loads')!.style.display == 'block')
		document.getElementById('loads')!.style.display = 'none';
	else
		document.getElementById('loads')!.style.display = 'block';
}


function removeInputWatch(element: string): void {
	$(element).off('keydown');
}

function setInputWatch(element: string): void {
	$(element).on('keydown', function (e) {
		let range = window.getSelection()!.getRangeAt(0);
		let p_range = range.cloneRange();
		p_range.selectNodeContents(this);
		p_range.setEnd(range.startContainer, range.startOffset);
		let selectionStart = p_range.toString().length;
		let selectionEnd = selectionStart + range.toString().length;

		// Enter Key?
		if (e.key === 'Enter') {
			// selection?
			if (selectionStart == selectionEnd) {
				// find start of the current line
				let sel = selectionStart;
				let text = this.innerText;
				while (sel > 0 && text[sel - 1] != '\n')
					sel--;

				let lineStart = sel;
				while (text[sel] == ' ' || text[sel] == '\t')
					sel++;

				if (sel > lineStart) {
					// Insert carriage return and indented text
					document.execCommand('insertText', false, '\n' + text.substr(lineStart, sel - lineStart));

					// Scroll caret visible
					this.blur();
					this.focus();
					return false;
				}
			}
		}
		// Tab key?
		if (e.key === 'Tab') {
			// These single character operations are undoable
			if (!e.shiftKey) {
				document.execCommand('insertText', false, '\t');
			} else {
				let text = this.innerText;
				if (selectionStart > 0 && text[selectionStart - 1] == '\t') {
					document.execCommand('delete');
				}
			}

			return false;
		}

		return true;
	});
}

document.getElementById('library-new')!.addEventListener('keyup', (event) => {
	if (event.key === 'Enter') {
		event.preventDefault();
		addLibrary();
	}
});

addLibrary('res/sonote.so');

Sortable.create(document.getElementById(`tabs`)!, {
	animation: 150
});