const IMPORT_PATH = './pkg/';
const JS_PATH = IMPORT_PATH + 'monaco_lsp.js';

function Uint8ArrayToString(arr) {
	let str = '';
	for (let i = 0; i < arr.length; i++) {
		str += String.fromCharCode(arr[i]);
	}
	return str;
}

function Console(type, data) {
	console[type](Uint8ArrayToString(data));
}

function LogOnFunctionCall(name, args) {
	console.log('Function called', name, args);
}

/**
 * @type { JavascriptEnvironment }
 */
const Environment = {
	js_atty_stderr: function () {
		LogOnFunctionCall('js_atty_stderr', arguments);
		return false;
	},
	js_on_stderr: function (data) {
		LogOnFunctionCall('js_on_stderr', arguments);

		Console('errror', data);
	},
	js_on_stdout: function (data) {
		LogOnFunctionCall('js_on_stdout', arguments);

		Console('log', data);
	},
	js_on_stdin: async function (buffer) {
		LogOnFunctionCall('js_on_stdin', arguments);

		return 0;
	}, // TODO

	js_discover_rhai_config: function () {
		LogOnFunctionCall('js_discover_rhai_config', arguments);

		return undefined;
	}, // TODO

	js_env_var: (name) => name, // TODO

	js_cwd: function () {
		LogOnFunctionCall('js_cwd', arguments);

		return '/';
	}, // TODO
	js_is_absolute_path: function (path) {
		LogOnFunctionCall('js_is_absolute_path', arguments);

		path.startsWith('/');
	}, // TODO
	js_is_absolute: function (path) {
		LogOnFunctionCall('js_is_absolute', arguments);

		path.startsWith('/');
	}, // TODO
	js_is_dir: function (path) {
		LogOnFunctionCall('js_is_dir', arguments);

		false;
	}, // TODO
	js_read_file: async function (path) {
		LogOnFunctionCall('js_read_file', arguments);

		return new Uint8Array();
	},

	js_sleep: async function (ms) {
		LogOnFunctionCall('js_sleep', arguments);

		return new Promise((resolve) => setTimeout(resolve, ms));
	},

	js_url_to_file_path: function (url) {
		LogOnFunctionCall('js_url_to_file_path', arguments);

		url;
	}, // TODO
	js_write_file: async function (path, data) {
		LogOnFunctionCall('js_write_file', arguments);

		return 0;
	}, // TODO
};

/**
 * @type { JavascriptLspInterface }
 */
const LspInterface = {
	js_on_message: function (message) {
		LogOnFunctionCall('js_on_message', arguments);

		postMessage({ from: 'lsp', data: message });
	},
};

import(JS_PATH).then(async (wasm) => {
	console.log('module', wasm);

	const wasm_memory = await wasm.default();

	wasm.start(Environment, LspInterface);

	// const asd = wasm_memory.memory.buffer[0];

	// onmessage = (event) => {
	// 	message_handle.cb(event.data);
	// };
});
