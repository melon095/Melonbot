import { defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import monacoEditor, { IMonacoEditorOpts } from 'vite-plugin-monaco-editor';

const monaco = (monacoEditor as any).default as (opts: IMonacoEditorOpts) => PluginOption;

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svgr(), react(), monaco({})],
	server: {
		fs: {
			allow: ['./wasm/monaco_lsp', './src', './node_modules'],
		},
	},
});
