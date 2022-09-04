/* eslint-disable no-undef */

/**
 * @param { HTMLParagraphElement } element
 */
async function onDeleteClick(element) {
	const row = element.closest('tr');

	const id = row.getAttribute('data-id');
	const td = row.querySelector('td:nth-child(1)');
	const type = td.getAttribute('data-type');
	const value = td.querySelector('div:nth-child(1)').innerText;

	const confirm = window.confirm(`Are you sure you want to delete ${type} "${value}"?`);

	if (!confirm) return;

	/*** @type {Response} */
	const response = await fetch(`/api/v1/channel/banphrase/${id}`, {
		method: 'DELETE',
	});

	/** @type { ACKBanphrase } */
	const json = await response.json();

	if (json.error) {
		alert(json.error);
		return;
	}

	row.remove();
}

/**
 * @param { number } id
 */
function onEditClick(id) {
	const div = document.querySelector(`tr[data-id="${id}"] ~ tr#banphrase-edit-menu`);
	const hidden = div.classList.contains('d-none');
	if (hidden) {
		div.classList.remove('d-none');
	} else {
		div.classList.add('d-none');
	}
}

const banphraseEditPb1Container = (id) =>
	`tr[data-id='${id}']#banphrase-edit-menu td #banphrase-edit-pb1-container`;
const banphraseEditRegexContainer = (id) =>
	`tr[data-id='${id}']#banphrase-edit-menu td #banphrase-edit-regex-container`;

/**
 * @param { HTMLSelectElement } element
 * @param { number } id
 */
function newBanphraseTypeChange(element, id) {
	const newValue = element.value;
	let oldElement;
	let newElement;

	switch (newValue) {
		case 'pb1': {
			newElement = document.querySelector(banphraseEditPb1Container(id));
			oldElement = document.querySelector(banphraseEditRegexContainer(id));
			break;
		}
		case 'regex': {
			newElement = document.querySelector(banphraseEditRegexContainer(id));
			oldElement = document.querySelector(banphraseEditPb1Container(id));
			break;
		}
		default: {
			return;
		}
	}

	newElement.classList.remove('d-none');
	oldElement.classList.add('d-none');
}

/**
 * @param { HTMLSelectElement } element
 * @param { number } id
 */
function onAddBanphraseChange(element) {
	const newValue = element.value;
	const regex = 'div#banphrase-add form div#banphrase-add-regex-container';
	const pb1 = 'div#banphrase-add form div#banphrase-add-pb1-container';

	switch (newValue) {
		case 'pb1': {
			document.querySelector(pb1).classList.remove('d-none');
			document.querySelector(regex).classList.add('d-none');
			break;
		}
		case 'regex': {
			document.querySelector(regex).classList.remove('d-none');
			document.querySelector(pb1).classList.add('d-none');
			break;
		}
		default: {
			return;
		}
	}
}

/**
 * @param { Event } event
 * @param { number } id
 */
async function onEditSubmit(event, id) {
	const data = {
		id,
		type: event.target.type.value,
		regex: event.target.regex.value,
		pb1: event.target.pb1.value,
	};

	const response = await fetch(`/api/v1/channel/banphrase/${id}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	const json = await response.json();

	console.log({ json });
}

/**
 * @param { Event } event
 * @param { number } id
 */
async function onAddSubmit(event) {
	const data = {
		type: event.target.type.value,
		regex: event.target.regex.value,
		pb1: event.target.pb1.value,
	};

	console.log({ data });

	const response = await fetch(`/api/v1/channel/banphrase`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	const json = await response.json();

	console.log({ json });
}

/**
 * @typedef { object } ACKBanphrase
 * @property { string } id
 * @property { 'ACK' } status
 * @property { string } [error]
 */
