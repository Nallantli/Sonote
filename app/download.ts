import { ipcRenderer } from 'electron';

ipcRenderer.on('listen', function (_event, value) {
	document.getElementById('info')!.innerHTML += `<p>${value}</p>`;
});