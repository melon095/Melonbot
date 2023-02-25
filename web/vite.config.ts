import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import monacoEditor from 'vite-plugin-monaco-editor';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svgr(), react() /*, monacoEditor({})*/],
	// serve files from /wasm folder
	server: {
		fs: {
			allow: ['./wasm/monaco_lsp', './src', './node_modules'],
		},
	},
});
