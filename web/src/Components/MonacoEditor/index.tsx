import React, { createRef, useEffect, useMemo, useRef } from 'react';

import 'monaco-editor/esm/vs/editor/editor.all.js';

import 'monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickInput/standaloneQuickInputService.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { buildWorkerDefinition } from 'monaco-editor-workers';

import {
	MonacoServices,
	MonacoLanguageClient,
	ErrorAction,
	CloseAction,
} from 'monaco-languageclient';

import { MessageTransports } from 'vscode-languageclient';
import {
	MessageReader,
	MessageWriter,
	DataCallback,
	Disposable,
	Message,
	AbstractMessageReader,
	AbstractMessageWriter,
} from 'vscode-jsonrpc';

import { WebWorkerMonacoContext } from './../../App';

type Schema = {
	$schema: string;
	line_endings: 'unix' | 'windows';
};

type EditorProps = {
	defaultLanguage: Schema;
	className: string;
};

export const $Schema: Schema = {
	$schema: '', // todo
	line_endings: 'unix',
};

class WorkerMessageReader extends AbstractMessageReader implements MessageReader {
	protected callback: DataCallback | undefined;
	protected readonly _events: Message[] = [];

	constructor(protected readonly worker: Worker) {
		super();

		this.worker.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);

				if (this.callback !== undefined) {
					this.callback(message);
				}
			} catch (error) {
				console.error(error);

				this.fireError(error);
			}
		};
	}

	listen(callback: DataCallback): Disposable {
		this.callback = callback;

		while (this._events.length > 0) {
			const event = this._events.shift();
			if (event !== undefined) {
				this.callback(event);
			}
		}

		return {
			dispose: () => {
				this.worker.terminate(); // TODO
			},
		};
	}
}

class WorkerMessageWriter extends AbstractMessageWriter implements MessageWriter {
	private _errCount = 0;

	constructor(protected readonly worker: Worker) {
		super();
	}

	async write(msg: Message): Promise<void> {
		try {
			const data = JSON.stringify(msg);

			this.worker.postMessage(data);
		} catch (error) {
			this._errCount++;
			console.error(error);

			this.fireError(error, msg, this._errCount);
		}
	}

	end(): void {}
}

function createLanguageServerClient(transports: MessageTransports): MonacoLanguageClient {
	return new MonacoLanguageClient({
		name: 'Rhai Language Server',
		clientOptions: {
			documentSelector: [{ language: 'rhai' }],
			errorHandler: {
				error: () => ({ action: ErrorAction.Continue }),
				closed: () => ({ action: CloseAction.DoNotRestart }),
			},
		},
		connectionProvider: {
			get: async function () {
				return transports;
			},
		},
	});
}

export default function ({ className, defaultLanguage }: EditorProps) {
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
	const ref = createRef<HTMLDivElement>();
	const webWorkerContext = React.useContext(WebWorkerMonacoContext);
	if (webWorkerContext === null) throw new Error('WebWorkerMonacoContext is null');

	let languageClient: MonacoLanguageClient;

	useEffect(() => {
		if (ref.current !== null) {
			buildWorkerDefinition('dist', new URL('', window.location.href).href, true);

			monaco.languages.register({
				id: 'rhai',
				extensions: ['.rhai'],
				aliases: ['Rhai', 'rhai'],
				mimetypes: ['text/rhai'],
			});

			// self.MonacoEnvironment = {
			// 	getWorker: function (workerId, label) {
			// 		function getWorkerModule(moduleUrl: string, label: string) {
			// 			const url = new URL(moduleUrl, window.location.href).href;

			// 			return new Worker(url, {
			// 				name: label,
			// 				type: 'module',
			// 			});
			// 		}

			// 		if (label === 'rhai') {
			// 			return getWorkerModule('wasm/monaco_lsp/worker.js', label);
			// 		}

			// 		throw new Error(`Unknown worker label: ${label}`);
			// 	},
			// };

			editorRef.current = monaco.editor.create(ref.current, {
				// model: monaco.editor.createModel(
				// 	JSON.stringify(defaultLanguage),
				// 	'rhai',
				// 	monaco.Uri.parse('inmemory://model.json'),
				// ),
				glyphMargin: true,
				lightbulb: {
					enabled: false, // TODO
				},
				automaticLayout: true, // TODO
			});

			MonacoServices.install();

			languageClient = createLanguageServerClient({
				reader: new WorkerMessageReader(webWorkerContext),
				writer: new WorkerMessageWriter(webWorkerContext),
				detached: true,
			});

			languageClient.start();
		}

		window.onbeforeunload = function () {
			languageClient?.stop();
		};

		return function () {
			languageClient?.stop();
		};
	}, []);

	return (
		<div
			ref={ref}
			style={{ height: '50vh' }}
			className={className}
			onClick={() => webWorkerContext.postMessage('forsen')}
		/>
	);
}
