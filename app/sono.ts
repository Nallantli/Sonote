import { ipcRenderer } from 'electron';
import Sortable from 'sortablejs';

ipcRenderer.on('code-finished', function (_event, arg: { id: number, result: any }) {
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
			updateLibList(result.body);
			break;
	}
});

let libraries = [];
let codeboxcount = 0;
let current = 0;
let has_error: any = {};

function addCodeBox(id: number, top: boolean): void {
	const boxN = codeboxcount;
	has_error[boxN] = false;
	const codeboxHTML =
		`
	<div class="codebox" id="cb-${boxN}">
		<div class="codebox-bar">
			<button class="cb-button runbutton" onclick="addCodeBox(${boxN}, true)"><i class="fas fa-plus"></i></button>
		</div>
		<div class="codebox-output" id="cbo-${boxN}"></div>
		<div class="codebox-input-cont" id="cbic-${boxN}">
		<div contenteditable="true" class="codebox-input" id="cbi-${boxN}" oninput="refresh(${boxN}, 300)" onblur="refresh(${boxN}, 0)"></div>
		<div class="codebox-input-print" id="cbip-${boxN}"><div></div></div>
		</div>
		<div class="codebox-print" id="cbp-${boxN}"></div>
		<div class="codebox-bar">
			<button class="cb-button runbutton" onclick="addCodeBox(${boxN}, false)"><i class="fas fa-plus"></i></button>
			<button class="cb-button runbutton" onclick="pinCodeBox(${boxN})"><i class="fas fa-thumbtack"></i></button>
			<div class="running-thread" id="rt-${boxN}" style="display:none"><i class="fas fa-circle-notch spinner"></i>Running...</div>
			<button class="cb-button closebutton" onclick="closeCodeBox(${boxN})"><i class="fas fa-minus"></i></button>
		</div>
	</div>`;

	if (id == -1) {
		document.getElementById(`wall`)!.innerHTML += codeboxHTML;
	} else {
		if (top)
			document.getElementById(`cb-${id}`)!.insertAdjacentHTML("beforebegin", codeboxHTML);
		else
			document.getElementById(`cb-${id}`)!.insertAdjacentHTML("afterend", codeboxHTML);
	}
	setInputWatch(`#cbi-${boxN}`);
	codeboxcount++;
	current++;
}

function pinCodeBox(boxN: number): void {
	document.getElementById(`cbo-${boxN}`)!.classList.toggle("pinned-box");
	document.getElementById(`cbic-${boxN}`)!.classList.toggle("pinned-input");
	document.getElementById(`cbi-${boxN}`)!.contentEditable = document.getElementById(`cbi-${boxN}`)!.contentEditable == 'true' ? 'false' : 'true';
}

function closeCodeBox(boxN: number): void {
	if (current > 1) {
		document.getElementById(`cb-${boxN}`)!.remove();
		refresh(undefined, 0);
		current--;
	}
}

let writingTimeout : any = null;

function refresh(boxN: number | undefined, delay :number): void {
	if (boxN != undefined) {
		const content = codeFormatter(document.getElementById(`cbi-${boxN}`)!.innerText).replace(/\n\n/gi, "\n").replace(/\t/gi, `<span style="white-space:pre">\t</span>`).split("\n").map((e: string) => {
			return `<div>${e}</div>`
		}).join("");
		document.getElementById(`cbip-${boxN}`)!.innerHTML = content;
	}

	if (writingTimeout != null)
		clearTimeout(writingTimeout);
	writingTimeout = setTimeout(() => {
		refreshOutputs();
	}, delay);
}

function refreshOutputs(): void {
	const blocks = document.getElementById("wall")!.children;

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

function addLibrary(): void {
	ipcRenderer.send("streamMain", {
		head: "lib",
		body: encodeURIComponent((<HTMLInputElement>document.getElementById(`library-new`)).value.trim())
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
	console.log(rule.trans.elements);
	if (rule.trans.elements.length > 0)
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

addCodeBox(-1, false);
Sortable.create(document.getElementById('wall')!, {
	animation: 150,
	onUpdate: () => {
		refresh(undefined, 0);
	}
});