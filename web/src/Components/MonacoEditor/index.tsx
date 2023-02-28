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
import { language, conf } from 'monaco-editor/esm/vs/basic-languages/rust/rust';

import {
	MonacoServices,
	MonacoLanguageClient,
	ErrorAction,
	CloseAction,
	State as MonacoLangaugeState,
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

type EditorProps = {
	defaultLanguage: string;
	className: string;
};

class WorkerMessageReader extends AbstractMessageReader implements MessageReader {
	protected isReady = false;
	protected callback: DataCallback | undefined;
	protected readonly _events: Message[] = [];

	constructor(protected readonly worker: Worker) {
		super();

		this.worker.onmessage = ({ data }) => {
			try {
				console.log('read', data);

				if (data === 'ok') {
					this.isReady = true;
					return;
				} else if (this.isReady === false) {
					console.warn('Worker not ready yet');

					return;
				}

				const message = JSON.parse(data);

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
			console.log('write', msg);

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
				console.log('get', transports);

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

	let languageClient = useMemo(() => {
		return createLanguageServerClient({
			reader: new WorkerMessageReader(webWorkerContext),
			writer: new WorkerMessageWriter(webWorkerContext),
			detached: true,
		});
	}, []);

	function LanguageStateIsStarted() {
		return languageClient.state === MonacoLangaugeState.Running;
	}

	useEffect(() => {
		if (ref.current !== null) {
			monaco.languages.register({
				id: 'rhai',
				extensions: ['.rhai'],
				mimetypes: ['text/plain'],
			});

			// Use rust monarch for now.
			monaco.languages.setMonarchTokensProvider('rhai', language);
			monaco.languages.setLanguageConfiguration('rhai', conf);
			monaco.editor.setTheme('vs');

			// window.MonacoEnvironment = {
			// 	getWorker: function (id, label) {
			// 		console.log('getWorker', id, label);

			// 		return new Worker(
			// 			'/node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
			// 			{
			// 				type: 'module',
			// 			},
			// 		);
			// 	},
			// };

			editorRef.current = monaco.editor.create(ref.current, {
				language: 'rhai',
				model: monaco.editor.createModel(
					defaultLanguage,
					'rhai',
					monaco.Uri.parse('inmemory://file.rhai'),
				),
				glyphMargin: true,
				lightbulb: {
					enabled: false, // TODO
				},
				automaticLayout: true, // TODO
			});

			console.log(monaco.editor.tokenize(defaultLanguage, 'rhai'));

			MonacoServices.install();

			// TODO: Does nothing at the moment.
			if (LanguageStateIsStarted()) {
				languageClient.stop().then(() => {
					languageClient.start();
				});
			} else {
				languageClient.start();
			}
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
