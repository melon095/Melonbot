#!/usr/bin/env node

import { exec } from 'node:child_process';
import { exit } from 'node:process';

const EVENTSUB_DIRECTORY = './EventSub';

const BUILD_COMMAND = `cd ${EVENTSUB_DIRECTORY} && make build`;
const TEST_COMMAND = `cd ${EVENTSUB_DIRECTORY} && make test`;

const args = process.argv.splice(2);

if (args[0] === undefined) {
	print_usage();
	exit(0);
}

switch (args[0]) {
	case 'build': {
		build();
		break;
	}
	case 'test': {
		test();
		break;
	}
	default: {
		print_usage();
		break;
	}
}

function build() {
	exec(BUILD_COMMAND, (error, stdout, stderr) => {
		if (error) {
			console.error(`[BUILD] exec error: ${error}`);
		}
		if (stderr) {
			console.error(`[BUILD] stderr: ${stderr}`);
		}
		if (!stdout) {
			console.log(`[BUILD] Build completed... ${stdout}`);
		} else {
			console.log(`[BUILD] stdout: ${stdout}`);
		}
	});
}

function test() {
	exec(TEST_COMMAND, (error, stdout, stderr) => {
		if (error) {
			console.error(`[TEST] exec error: ${error}`);
		}
		if (stderr) {
			console.error(`[TEST] stderr: ${stderr}`);
		}
		console.log(`[TEST] stdout: ${stdout}`);
	});
}

function print_usage() {
	const file = import.meta.url.split('/').pop();
	console.log(`Usage: node ${file} <command>`);
	console.log(`\n\tnode ${file} build`);
	console.log(`\t-- Builds EventSub to ./EventSub/bin/eventsub(.exe)`);
	console.log(`\n\tnode ${file} test`);
	console.log(`\n\tnpm run build:eventsub`);
	console.log(`\n\tnpm run test:eventsub`);
	exit(0);
}
