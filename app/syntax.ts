function codeFormatter(elmntTxt : string) {
	var commentcolor = "#c3d350";
	var sonoColor = "black";
	var sonoKeywordColor = "#00509d";
	var sonoStringColor = "#f4a261";
	var sonoNumberColor = "#fdc500";
	var sonoPropertyColor = "#ce4257";
	elmntTxt = sonoMode(elmntTxt);
	return elmntTxt;

	/* function extract(str : string, start : string, end : string, func : any, repl : string) {
		var s, e, d = "",
			a = [];
		while (str.search(start) > -1) {
			s = str.search(start);
			e = str.indexOf(end, s);
			if (e == -1) {
				e = str.length;
			}
			if (repl) {
				a.push(func(str.substring(s, e + (end.length))));
				str = str.substring(0, s) + repl + str.substr(e + (end.length));
			} else {
				d += str.substring(0, s);
				d += func(str.substring(s, e + (end.length)));
				str = str.substr(e + (end.length));
			}
		}
		this.rest = d + str;
		this.arr = a;
	} */

	function commentMode(txt : string) {
		return "<span style=color:" + commentcolor + ">" + txt + "</span>";
	}

	function sonoMode(txt : string) {
		var rest = txt,
			done = "",
			i, cc, tt = "",
			sfnuttpos, dfnuttpos, wfnuttpos, comlinepos, keywordpos, numpos, mypos, dotpos, y;
		for (i = 0; i < rest.length; i++) {
			cc = rest.substr(i, 1);
			tt += cc;
		}
		rest = tt;
		y = 1;
		while (y == 1) {
			sfnuttpos = getPos(rest, "'", "'", sonoStringMode);
			dfnuttpos = getPos(rest, '"', '"', sonoStringMode);
			wfnuttpos = getPos(rest, '`', '`', sonoStringMode);
			comlinepos = getPos(rest, /\#/, "\n", commentMode);
			numpos = getNumPos(rest, sonoNumberMode);
			keywordpos = getKeywordPos(rest, sonoKeywordMode);
			dotpos = getDotPos(rest, sonoPropertyMode);
			if (Math.max(numpos[0], sfnuttpos[0], dfnuttpos[0], wfnuttpos[0], comlinepos[0], keywordpos[0], dotpos[0]) == -1) {
				break;
			}
			mypos = getMinPos(numpos, sfnuttpos, dfnuttpos, wfnuttpos, comlinepos, keywordpos, dotpos);
			if (mypos[0] == -1) {
				break;
			}
			if (mypos[0] > -1) {
				done += rest.substring(0, mypos[0]);
				done += mypos[2](rest.substring(mypos[0], mypos[1]));
				rest = rest.substr(mypos[1]);
			}
		}
		rest = done + rest;
		return `<span style="color:${sonoColor}">${rest}</span>`;
	}

	function sonoStringMode(txt : string) {
		return `<span style="color:${sonoStringColor}">${txt}</span>`;
	}

	function sonoKeywordMode(txt : string) {
		return `<span style="font-weight:bold;color:${sonoKeywordColor}">${txt}</span>`;
	}

	function sonoNumberMode(txt : string) {
		return `<span style="color:${sonoNumberColor}">${txt}</span>`;
	}

	function sonoPropertyMode(txt : string) {
		return `<span style="font-style:italic;color:${sonoPropertyColor}">${txt}</span>`;
	}

	function getDotPos(txt : string, func : any) {
		var x, i, j, s, e, arr = [".", "<", " ", ";", "(", "+", ")", "[", "]", ",", "&", ":", "{", "}", "/", "-", "*", "|", "%"];
		s = txt.indexOf(".");
		if (s > -1) {
			x = txt.substr(s + 1);
			for (j = 0; j < x.length; j++) {
				let cc = x[j];
				for (i = 0; i < arr.length; i++) {
					if (cc.indexOf(arr[i]) > -1) {
						e = j;
						return [s + 1, e + s + 1, func];
					}
				}
			}
		}
		return [-1, -1, func];
	}

	function getMinPos(...args : any[]) {
		var i, arr = [];
		for (i = 0; i < args.length; i++) {
			if (args[i][0] > -1) {
				if (arr.length == 0 || args[i][0] < arr[0]) {
					arr = args[i];
				}
			}
		}
		if (arr.length == 0) {
			arr = args[i];
		}
		return arr;
	}

	function getKeywordPos(txt : string, func : any) {
		var words, i, pos, rpos = -1,
			rpos2 = -1,
			patt;
		words = ["abstract", "struct", "static", "break", "class", "case", "catch", "char", "code", "final", "vec", "num", "str", "feat",
			"do", "then", "else", "new", "load", "import", "extends", "false", "true", "in", "switch", "goto", "Function", "goto", "Number", "String", "Rule",
			"Dictionary", "Phone", "Matrix", "Feature", "Vector", "var", "null", "return",
			"this", "throw", "throw", "try", "until", "mat", "word"
		];
		for (i = 0; i < words.length; i++) {
			pos = txt.indexOf(words[i]);
			if (pos > -1) {
				patt = /\W/g;
				if (txt.substr(pos + words[i].length, 1).match(patt) && txt.substr(pos - 1, 1).match(patt)) {
					if (pos > -1 && (rpos == -1 || pos < rpos)) {
						rpos = pos;
						rpos2 = rpos + words[i].length;
					}
				}
			}
		}
		return [rpos, rpos2, func];
	}

	function getPos(txt : string, start : string | RegExp, end : string, func : any) {
		var s, e;
		s = txt.search(start);
		e = txt.indexOf(end, s + (end.length));
		if (e == -1) {
			e = txt.length;
		}
		return [s, e + (end.length), func];
	}

	function getNumPos(txt : string, func : any) {
		var arr = ["\n", " ", ";", "(", "+", ")", "[", "]", ",", "&", ":", "{", "}", "/", "-", "*", "|", "%", "="],
			i, j, c, startpos = 0,
			endpos, word;
		for (i = 0; i < txt.length; i++) {
			for (j = 0; j < arr.length; j++) {
				c = txt.substr(i, arr[j].length);
				if (c == arr[j]) {
					if (c == "-" && (txt.substr(i - 1, 1) == "e" || txt.substr(i - 1, 1) == "E")) {
						continue;
					}
					endpos = i;
					if (startpos < endpos) {
						word = txt.substring(startpos, endpos);
						if (!isNaN(Number(word))) {
							return [startpos, endpos, func];
						}
					}
					i += arr[j].length;
					startpos = i;
					i -= 1;
					break;
				}
			}
		}
		return [-1, -1, func];
	}
}