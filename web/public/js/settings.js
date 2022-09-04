/**
 * @param {HTMLParagraphElement} element
 */
async function onDeleteClick(element) {
	const row = element.closest('tr');

	const id = row.getAttribute('data-id');
	const td = row.querySelector('td:nth-child(1)');
	const type = td.getAttribute('data-type');
	const value = td.querySelector('div:nth-child(1)').innerText;

	const confirm = window.confirm(`Are you sure you want to delete ${type} "${value}"?`);

	if (!confirm) return;

	/**
	 * @type {Response}
	 */
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
 * @typedef { object } ACKBanphrase
 * @property { string } id
 * @property { 'ACK' } status
 * @property { string } [error]
 */
