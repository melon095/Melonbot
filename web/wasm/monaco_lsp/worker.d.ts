interface JavascriptEnvironment {
	js_env_var: (arg0: string) => string;
	js_atty_stderr: () => boolean;
	js_on_stdin: (arg0: Uint8Array) => Promise<number>;
	js_on_stdout: (arg0: Uint8Array) => void;
	js_on_stderr: (arg0: Uint8Array) => void;
	js_read_file: (arg0: string) => Promise<Uint8Array>;
	js_write_file: (arg0: string, arg1: Uint8Array) => Promise<void>;
	js_sleep: (arg0: number) => Promise<void>;
	js_is_absolute: (arg0: string) => boolean;
	js_cwd: () => string;
	js_url_to_file_path: (arg0: string) => string | undefined;
	js_is_dir: (arg0: string) => boolean;
	js_discover_rhai_config: (arg0: string) => string | undefined;
}

interface JavascriptLspInterface {
	js_on_message: (stringified_rpc: string) => void;
}
