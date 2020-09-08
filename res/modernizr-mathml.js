/*! modernizr 3.3.1 (Custom Build) | MIT *
 * https://modernizr.com/download/?-mathml-setclasses !*/
! function (e, n, t) {
	function o(e, n) {
		return typeof e === n
	}

	function s() {
		var e, n, t, s, a, i, r;
		for (var l in d)
			if (d.hasOwnProperty(l)) {
				if (e = [], n = d[l], n.name && (e.push(n.name.toLowerCase()), n.options && n.options.aliases && n.options.aliases.length))
					for (t = 0; t < n.options.aliases.length; t++) e.push(n.options.aliases[t].toLowerCase());
				for (s = o(n.fn, "function") ? n.fn() : n.fn, a = 0; a < e.length; a++) i = e[a], r = i.split("."), 1 === r.length ? Modernizr[r[0]] = s : (!Modernizr[r[0]] || Modernizr[r[0]] instanceof Boolean || (Modernizr[r[0]] = new Boolean(Modernizr[r[0]])), Modernizr[r[0]][r[1]] = s), f.push((s ? "" : "no-") + r.join("-"))
			}
	}

	function a(e) {
		var n = p.className,
			t = Modernizr._config.classPrefix || "";
		if (u && (n = n.baseVal), Modernizr._config.enableJSClass) {
			var o = new RegExp("(^|\\s)" + t + "no-js(\\s|$)");
			n = n.replace(o, "$1" + t + "js$2")
		}
		Modernizr._config.enableClasses && (n += " " + t + e.join(" " + t), u ? p.className.baseVal = n : p.className = n)
	}

	function i() {
		return "function" != typeof n.createElement ? n.createElement(arguments[0]) : u ? n.createElementNS.call(n, "http://www.w3.org/2000/svg", arguments[0]) : n.createElement.apply(n, arguments)
	}

	function r() {
		var e = n.body;
		return e || (e = i(u ? "svg" : "body"), e.fake = !0), e
	}

	function l(e, t, o, s) {
		var a, l, f, d, c = "modernizr",
			u = i("div"),
			m = r();
		if (parseInt(o, 10))
			for (; o--;) f = i("div"), f.id = s ? s[o] : c + (o + 1), u.appendChild(f);
		return a = i("style"), a.type = "text/css", a.id = "s" + c, (m.fake ? m : u).appendChild(a), m.appendChild(u), a.styleSheet ? a.styleSheet.cssText = e : a.appendChild(n.createTextNode(e)), u.id = c, m.fake && (m.style.background = "", m.style.overflow = "hidden", d = p.style.overflow, p.style.overflow = "hidden", p.appendChild(m)), l = t(u, e), m.fake ? (m.parentNode.removeChild(m), p.style.overflow = d, p.offsetHeight) : u.parentNode.removeChild(u), !!l
	}
	var f = [],
		d = [],
		c = {
			_version: "3.3.1",
			_config: {
				classPrefix: "",
				enableClasses: !0,
				enableJSClass: !0,
				usePrefixes: !0
			},
			_q: [],
			on: function (e, n) {
				var t = this;
				setTimeout(function () {
					n(t[e])
				}, 0)
			},
			addTest: function (e, n, t) {
				d.push({
					name: e,
					fn: n,
					options: t
				})
			},
			addAsyncTest: function (e) {
				d.push({
					name: null,
					fn: e
				})
			}
		},
		Modernizr = function () {};
	Modernizr.prototype = c, Modernizr = new Modernizr;
	var p = n.documentElement,
		u = "svg" === p.nodeName.toLowerCase(),
		m = c.testStyles = l;
	Modernizr.addTest("mathml", function () {
		var e;
		return m("#modernizr{position:absolute;display:inline-block}", function (n) {
			n.innerHTML += "<math><mfrac><mi>xx</mi><mi>yy</mi></mfrac></math>", e = n.offsetHeight > n.offsetWidth
		}), e
	}), s(), a(f), delete c.addTest, delete c.addAsyncTest;
	for (var h = 0; h < Modernizr._q.length; h++) Modernizr._q[h]();
	e.Modernizr = Modernizr
}(window, document);