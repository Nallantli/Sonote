var Chart = require('chart.js');
Chart.defaults.global.animation.duration = 0;

function toJSON(v: { type: string, value: any }): any {
	switch (v.type) {
		case 'Dictionary':
			let json: any = {};
			Object.keys(v.value).forEach((key: string) => {
				const raw_value = v.value[key];
				let value;
				switch (raw_value.type) {
					case 'Number':
						value = Number(raw_value.value);
						break;
					case 'Dictionary':
						value = toJSON(raw_value);
						break;
					case 'Vector':
						value = toJSON(raw_value);
						break;
					case 'Boolean':
						value = raw_value.value;
						break;
					default:
						value = String(raw_value.value);
						break;
				}
				json[key] = value;
			});
			return json;
		case 'Vector':
			let array: any[] = [];
			v.value.forEach((raw_value: { type: string, value: any }) => {
				let value;
				switch (raw_value.type) {
					case 'Number':
						value = Number(raw_value.value);
						break;
					case 'Dictionary':
						value = toJSON(raw_value);
						break;
					case 'Vector':
						value = toJSON(raw_value);
						break;
					case 'Boolean':
						value = raw_value.value;
						break;
					default:
						value = String(raw_value.value);
						break;
				}
				array.push(value);
			});
			return array;
		default:
			return undefined;
	}
}

function createChart(id: string, dict: { type: string, value: any }) : boolean {
	const chart = toJSON(dict);
	const ctx = document.getElementById(id);
	try {
		new Chart(ctx, chart);
		return true;
	} catch (err) {
		return false;
	}
}