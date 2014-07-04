$(function() {
	var Operation = function(params) {
		var message = params.message || function(code, pattern, line) {
			return "<strong>Error (linea " + line + "):</strong> Error al matchear <strong>'" + code + "'</strong> con <strong>'" + pattern + "'</strong>."; 
		};

		this.errors = [];

		this.pattern = params.pattern;

		this.transform = function(code) {
			if(!params.transform) {
				return code;
			}

			var i,
				regex,
				patterns = params.pattern.split("|");
				transforms = params.transform.split("|");

			for(i = 0; i < patterns.length; i++) {
				regex = new RegExp("^" + patterns[i], "i");
				if(regex.test(code)) {
					return transforms[i];
				}
			}
		}

		this.message = function(code, error) {
			var line,
				errorLines,
				current;

			if(!error) {
				for(var i = 0; i < this.errors.length; i++) {
					current = this.errors[i];
					if(!error || current.code.trim().length < error.code.trim().length) {
						error = current;
					}
				}
			}

			errorLines = error.code.split("\n");
			line = (code.split("\n").length - errorLines.length + 1)

			return message(errorLines[0], error.pattern, line || 1);
		};
	}

	Operation.prototype.is = function(code) {
		var multiTokenRegex = new RegExp("^\\(((.+)(\\|.+)+)\\)", "i"),
			result,
			patterns;

		this.errors = [];

		if($.isArray(this.pattern)) {
			patterns = this.pattern;

			for(var i = 0; i < patterns.length; i++) {
				result = this._is(code, patterns[i]);

				if(result.success) {
					result.errors = this.errors;
					return result;
				}
				else {
					this.errors = this.errors.concat(result.errors);
				}
			}

			this.errors.push({ code: code, pattern: patterns.join(",") });

			return { success: false, errors: this.errors };
		}
		else {
			result = this._is(code, this.pattern);

			result.errors = this.errors = this.errors.concat(result.errors);

			return result;
		}
	}

	Operation.prototype._is = function(code, pattern) {
		var tokenRegex = new RegExp("\\{\\{(\\w+)\\}\\}", "i"),
			originalCode = code,
			transformed = "",
			errors = [],
			patternRegex,
			staticPattern,
			index,
			name,
			result;

		do {
			patternIndex = pattern.search(tokenRegex);

			if(patternIndex === 0) {
				name = pattern.match(tokenRegex);

				result = operations[name[1]].is(code);

				pattern = pattern.substr(name[0].length, pattern.length);

				if(result.success) {
					code = code.substr(result.index, code.length);
					errors = errors.concat(result.errors);
					transformed += result.transformed;
				}
				else {
					return result;
				}
			}
			else {
				patternIndex = patternIndex > -1 ? patternIndex : pattern.length;

				staticPattern = pattern.substr(0, patternIndex);

				patternRegex = new RegExp("^(" + staticPattern + ")", "i");

				if(patternRegex.test(code)) {
					pattern = pattern.substr(patternIndex, pattern.length);

					index = code.match(patternRegex)[1] || {};
					index = index.length || 0;

					transformed += this.transform(code.substr(0, index));
					code = code.substr(index, code.length);
				}
				else {
					return { success: false, errors: errors.concat([{ code: code, pattern: staticPattern }]) };
				}
			}
		} while(pattern.length > 0);

		return { success: true, code: code, transformed: transformed, index: originalCode.length - code.length, errors: errors };
	}

	Object.values = function (obj) {
		var key,
			vals = [];

		for(key in obj) {
			if(obj.hasOwnProperty(key)) {
				vals.push(obj[key]);
			}
		}

		return vals;
	}

	var texts = {
		"crear_proc": "CREAR PROC crearTabla (\n\
	*dato1 entero,\n\
	*dato2 entero,\n\
	*dato3 entero\n\
)\n\
FIN PARAMETROS\n\
\n\
CREAR TABLA tabla1\n\
	( col1 decimal, col2 entero, col3 entero )\n\
FIN PROC",
		
		"crear_tabla": "CREAR TABLA miTabla\n\
(legajo entero, sueldo decimal, edad entero)",

		"mostrar": "MOSTRAR legajo, sueldo, edad\n\
DESDE miTabla\n\
FILTRAR legajo MAYOR QUE 2000 y edad MENOR QUE 60\n\
ORDENADO POR sueldo"
	};

	var keywords = {
		types: {
			"entero": "INT",
			"decimal": "DECIMAL"
		},

		operators: {
			"mayor que": ">",
			"menor que": "<",
			"mayor o igual que": ">=",
			"menor o igual que": "<=",
			"igual que": "="
		},

		procedure: {
			"crear proc": "CREATE PROCEDURE",
			"*": "@",
			"fin parametros": "AS BEGIN",
			"fin proc": "END"
		},

		table: {
			create: {
				"crear tabla": "CREATE TABLE",
				"columna": "COLUMN"
			},
			select: {
				"mostrar": "SELECT",
				"desde": "FROM",
				"filtrar": "WHERE",
				"ordenado por": "ORDER BY",

				connectors: {
					"o": "OR",
					"y": "AND"
				},

				functions: {
					"suma": "SUM",
					"maximo": "MAX",
					"minimo": "MIN"
				}
			}
		}
	};

	var operations = {
		/* GLOBAL */
		"global": new Operation({
			pattern: [
				"{{s}}{{global_unitary}}{{s}};{{global}}{{end}}",
				"{{s}}{{global_unitary}}{{s}};{{s}}{{end}}",
				"{{s}}{{global_unitary}}{{s}}{{end}}"
			]
		}),

		"global_unitary": new Operation({
			pattern: [
				"{{crear_proc}}",
				"{{crear_tabla}}",
				"{{mostrar}}"
			]
		}),

		"end": new Operation({
			pattern: "$"
		}),

		/* CREAR PROC*/
		"crear_proc": new Operation({
			pattern: "{{crear_proc_keyword}}{{sm}}{{name}}{{s}}\\({{s}}{{parameter}}{{s}}\\){{s}}{{fin_parametros_keyword}}{{sm}}{{contenido}}{{sm}}{{fin_proc_keyword}}"
		}),

		"crear_proc_keyword": new Operation({
			pattern: "CREAR PROC",
			transform: "CREATE PROCEDURE"
		}),

		"fin_parametros_keyword": new Operation({
			pattern: "FIN PARAMETROS",
			transform: "AS BEGIN"
		}),

		"fin_proc_keyword": new Operation({
			pattern: "FIN PROC",
			transform: "END"
		}),

		"parameter": new Operation({
			pattern: [
				"{{prename}}{{name}}{{sm}}{{token_type}},{{s}}{{parameter}}",
				"{{prename}}{{name}}{{sm}}{{token_type}}"
			]
		}),

		"prename": new Operation({
			pattern: "\\*",
			transform: "@"
		}),

		"contenido": new Operation({
			pattern: [
				"{{mostrar}}",
				"{{crear_tabla}}"
			]
		}),

		/* CREAR TABLA */
		"crear_tabla": new Operation({
			pattern: "{{crear_tabla_keyword}}{{sm}}{{name}}{{s}}\\({{s}}{{columna}}{{s}}\\)"
		}),

		"crear_tabla_keyword": new Operation({
			pattern: "CREAR TABLA",
			transform: "CREATE TABLE"
		}),

		"columna": new Operation({
			pattern: [
				"{{name}}{{sm}}{{token_type}},{{s}}{{columna}}",
				"{{name}}{{sm}}{{token_type}}"
			]
		}),

		"token_type": new Operation({
			pattern: Object.keys(keywords.types).join("|"),
			transform: Object.values(keywords.types).join("|")
		}),

		/* MOSTRAR */
		"mostrar": new Operation({
			pattern: "{{mostrar_keyword}}{{sm}}{{opcion}}{{sm}}{{desde_keyword}}{{sm}}{{name}}{{filtrado}}{{ordenado}}"
		}),

		"mostrar_keyword": new Operation({
			pattern: "MOSTRAR",
			transform: "SELECT"
		}),

		"desde_keyword": new Operation({
			pattern: "DESDE",
			transform: "FROM"
		}),

		"opcion": new Operation({
			pattern: [
				"{{operacion}}",
				"{{seleccolumnas}}"
			]
		}),

		"operacion": new Operation({
			pattern: "{{funcion}}{{s}}\\({{name}}\\)"
		}),

		"funcion": new Operation({
			pattern: Object.keys(keywords.table.select.functions).join("|"),
			transform: Object.values(keywords.table.select.functions).join("|")
		}),

		"seleccolumnas": new Operation({
			pattern: [
				"{{name}},{{s}}{{seleccolumnas}}",
				"{{name}}"
			]
		}),

		"filtrado": new Operation({
			pattern: [
				"{{sm}}{{filtrar_keyword}}{{sm}}{{condicion}}",
				"{{blank}}"
			]
		}),

		"filtrar_keyword": new Operation({
			pattern: "FILTRAR",
			transform: "WHERE"
		}),

		"condicion": new Operation({
			pattern: [
				"{{name}}{{s}}{{operador}}{{s}}{{valor}}{{sm}}{{conector}}{{sm}}{{condicion}}",
				"{{valor}}{{s}}{{operador}}{{s}}{{name}}{{sm}}{{conector}}{{sm}}{{condicion}}",
				"{{name}}{{s}}{{operador}}{{s}}{{valor}}",
				"{{valor}}{{s}}{{operador}}{{s}}{{name}}"
			]
		}),

		"operador": new Operation({
			pattern: Object.keys(keywords.operators).join("|"),
			transform: Object.values(keywords.operators).join("|")
		}),

		"conector": new Operation({
			pattern: Object.keys(keywords.table.select.connectors).join("|"),
			transform: Object.values(keywords.table.select.connectors).join("|")
		}),

		"valor": new Operation({
			pattern: "\\d+(,\\d+)?"
		}),

		"name": new Operation({
			pattern: "\\w+"
		}),

		"ordenado": new Operation({
			pattern: [
				"{{sm}}{{ordenado_por_keyword}}{{sm}}{{name}}",
				"{{blank}}"
			]
		}),

		"ordenado_por_keyword": new Operation({
			pattern: "ORDENADO POR",
			transform: "ORDER BY"
		}),

		"blank": new Operation({
			pattern: ""
		}),

		"s": new Operation({
			pattern: "(\\s)*"
		}),

		"sm": new Operation({
			pattern: "(\\s)+"
		})
	};


	var strToObject = function(str) {
		var obj = {},
			words = str.split(" ");

		for (var i = 0; i < words.length; i++) { 
			obj[words[i]] = true;
		}

		return obj;
	}

	var leafs = function(obj) {
		var value,
			result = [],
			keys = Object.keys(obj);

		for(var i = 0; i < keys.length; i++) {
			value = obj[keys[i]];

			if($.isPlainObject(value)) {
				result = result.concat(leafs(value));
			}
			else {
				result.push(keys[i]);
			}
		}

		return result;
	}

	var tokens = leafs(keywords);

	CodeMirror.defineMIME("text/x-customsql", {
		name: "sql",
		keywords: strToObject(tokens.join(" ")),
		builtin: strToObject("entero decimal"),
		atoms: strToObject("unknown"),
		operatorChars: new RegExp("^(" + operations.operador.pattern + ")", "i")
	});

	var codeEditor = CodeMirror.fromTextArea($("#code").get(0), {
		lineNumbers: true,
		styleActiveLine: true,
		mode: "text/x-customsql"
	});

	var outputEditor = CodeMirror.fromTextArea($("#output").get(0), {
		lineNumbers: true,
		styleActiveLine: true,
		mode: "text/x-mysql"
	});

	var showTokens = function(tokens, node) {
		for(var i = 0; i < tokens.length; i++) {
			node.append("<li>" + tokens[i] + "</li>");
		}
	}

	showTokens(tokens, $("#tokens"));

	$("#crear_proc").click(function() {
		codeEditor.setValue(texts["crear_proc"]);
	});

	$("#crear_tabla").click(function() {
		codeEditor.setValue(texts["crear_tabla"]);
	});

	$("#mostrar").click(function() {
		codeEditor.setValue(texts["mostrar"]);
	});

	$("#mix").click(function() {
		var text = [texts["crear_proc"], texts["crear_tabla"], texts["mostrar"]].join(";\n\n")
		codeEditor.setValue(text);
	});

	$("#compile").click(function() {
		var errorsNode = $("#errors");
		var code = codeEditor.getValue();
		var output = "";

		var operation = operations.global;
		var result = operation.is(code);

		errorsNode.empty();

		if(result.success) {
			errorsNode.append('<div class="alert alert-success"><strong>¡Bien hecho!</strong> su código no tiene errores.</div>');
			outputEditor.setValue(result.transformed);
		}
		else {
			errorsNode.append('<div class="alert alert-danger">' + operation.message(code) + '</div>');
		}
	});

	$("#mix").click();
});