var SyntaxTools = {

	XML : {
		/**
		 *	Uses the built-in XML parser to generate a DOM from the string provided.
		 *	Returns null if the string does not contain a well-formed XML document, and the XMLDocument object otherwise.
		 *  Throws an exception if there is no built-in XML parsing facility available.
		 */
		parse: function (str) {
			"use strict";
			var doc;
			if (typeof window.DOMParser !== "undefined") {
				try {
					doc = (new DOMParser()).parseFromString(str, "application/xml");
				} catch (ex) {
					return null;
				}
				return doc.getElementsByTagName("parsererror").length > 0 ? null : doc;
			}
			if (typeof window.ActiveXObject !== "undefined") {
				doc = new window.ActiveXObject('Microsoft.XMLDOM');
				doc.async = "false";
				return doc.loadXML(str) ? doc : null;
			}
			throw "This browser has insufficient Javascript XML support.";
		},

		/**
		 *	Unparses the DOM (sub)tree provided into a string, leaving existing whitespace nodes as they are.
		 *	Returns an empty string for null nodes.
		 *  Throws an exception if there is no built-in XML unparsing facility.
		 */
		unparse: function (node) {
			"use strict";
			if (node === null) {
				return "";
			}
			if (typeof window.XMLSerializer !== "undefined") {
				return (new window.XMLSerializer()).serializeToString(node);
			}
			if (typeof node.xml !== "undefined") {
				return node.xml;
			}
			throw "This browser has insufficient Javascript XML support.";
		},

		/**
		 *	Transform the first argument into a formatted string representation, replacing whitespace text nodes with easy to
		 *	read indentations. If the first argument is a string, attempts to parse this string into an XMLDocument first.
		 *	If the second argument is a number, uses this number of blanks for indentation. If it is a string, uses the content of that
		 *	string as indentation (e.g. "\t"). The second argument defaults to two blanks.
		 *	Returns null in case of parsing errors or empty string as document.
		 */
		prettify: function (xml, space) {
			"use strict";
			var root = (typeof xml === "string") ? SyntaxTools.XML.parse(xml) : xml,
				indent = [ "\n" ],
				spaces = (typeof space === "string") ? space : (typeof space === "number") ? new Array(space + 1).join(" ") : "  ";
			for (var node = root, next, level = -1; node; node = next) {
				if (level > 0) {
					if (node.nodeType === 3) {
						if (/^\s*$/.test(node.nodeValue)) {
							if (node.nextSibling) {
								node.nodeValue = indent[level];
							} else if (node.previousSibling) {
								node.nodeValue = indent[level - 1];							
							} else {
								node.nodeValue = "";
							}
						}
					} else {
						if (!node.nextSibling) {
							node.parentNode.appendChild(root.createTextNode(indent[level - 1]));											
						} else if (node.nextSibling.nodeType !== 3) {
							node.parentNode.insertBefore(root.createTextNode(indent[level]), node.nextSibling);							
						}
						if (!node.previousSibling) {
							node.parentNode.insertBefore(root.createTextNode(indent[level]), node);						
						}	
					}
				}
				next = node.firstChild;
				if (next) {
					level += 1;
					if (level >= indent.length) {
						indent[level] = indent[level - 1] + spaces;
					}
				} else {
					next = node.nextSibling;
					while (!next && node !== root) {
						node = node.parentNode;
						level -= 1;			
						next = node.nextSibling;
					}
				}
			}
			return root && SyntaxTools.XML.unparse(root);
		},

		/**
		 * Transform the argument into a string representation, emptying whitespace text nodes. 
		 * If the first argument is a string, attempts to parse this string into an XMLDocument first.
		 * Returns null in case of parsing errors or empty string as document.
		 */
		minimize: function (xml) {
			"use strict";
			var root = (typeof xml === "string") ? SyntaxTools.XML.parse(xml) : xml;
			for (var node = root, next; node; node = next) {
				if (node.nodeType === 3 && /^\s*$/.test(node.nodeValue)) {
					node.nodeValue = "";
				}
				next = node.firstChild;
				if (!next) {
					next = node.nextSibling;
					while (!next && node !== root) {
						node = node.parentNode;
						next = node.nextSibling;
					}
				}
			}
			return root && SyntaxTools.XML.unparse(root);
		},

		/**
		 *	XSLT utility, transforms the first argument (XMLNode) using the given xsl of the second argument.
		 */
		transform: function (node, xslRoot) {
			"use strict";
			if (typeof window.XSLTProcessor !== "undefined") {
				var processor = new window.XSLTProcessor();
				processor.importStylesheet(xslRoot);
				return processor.transformToDocument(node);
			}
			if (typeof node.transformNode !== "undefined") {
				return node.transformNode(xslRoot);
			}
			throw "This browser has insufficient Javascript XML support.";
		},

		/**
		 * Escapes the provided string for inclusion as text node or attribute value.
		 * Replace <, >, & and ". Does not add surrounding quotes.
		 */
		escape: function (str) {
			"use strict";
			return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
	},

	JSON: {
		/**
		 *	Uses the built-in JSON parser to generate a Javascript object from the string provided.
		 *	Returns null if the string does not contain well-formed JSON, and the object otherwise.
		 */
		parse: function (str) {
			"use strict";
			try {
				return JSON.parse(str);
			} catch (e) {
				return null;
			}
		},

		/**
		 *	Unparses the Javascript object provided into a string, by default without extra whitespace.
		 *	Returns an "null" string for null nodes.
		 */
		unparse: function (obj) {
			"use strict";
			return JSON.stringify(obj);
		},

		/**
		 *	Transform the first argument into a formatted string representation, replacing whitespace outside strings 
		 *  with easy to read indentations. 
		 *  If the first argument is a string, attempts to parse this string into a Javascript object first.
		 *	If the second argument is a number, uses this number of blanks for indentation. If it is a string, uses 
		 *  the content of that string as indentation (e.g. "\t"). The second argument defaults to two blanks.
		 *	Returns a "null" string for null nodes, and null in case of parsing errors.
		 */
		prettify: function (json, blanks) {
			"use strict";
			var obj = (typeof json === "string") ? SyntaxTools.JSON.parse(json) : json;
			return obj && JSON.stringify(obj, null, typeof blanks !== "undefined" ? blanks : 2);
		},

		/**
		 * Transform the argument into a string representation, removeing whitespaces outside properties and string literals. 
		 * If the first argument is a string, attempts to parse this string into a javascript object first.
		 * Returns a "null" string for null nodes, and null in case of parsing errors.
		 */
		minimize: function (json) {
			"use strict";
			var obj = (typeof json === "string") ? SyntaxTools.JSON.parse(json) : json;
			return obj && JSON.stringify(obj);
		},
		
		/**
		 * Escapes the provided string for inclusion as property or string literal.
		 * Replaces non-printable control codes, \ and ". Does not add surrounding quotes.
		 */
		escape: function (str) {
			"use strict";
			return str.replace(/[\x00-\x1f"\\]/g, function (ch) {
				var u = ch.charCodeAt(0);
				switch (u) {
				case 8: return "\\b";
				case 9: return "\\t";
				case 10: return "\\n";
				case 12: return "\\f";
				case 13: return "\\r";
				case 34: return "\\\"";
				case 92: return "\\\\";
				default: return (u < 16 ? "\\u000" : "\\u00") + u.toString(16);
				}
			});
		}
	}
};
