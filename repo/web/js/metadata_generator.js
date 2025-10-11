let repository = {};

let formData = {
	url: '',
	app: {
		name: '',
		description: '',
		icon: '',
		directory: '',
		script: '',
		author: '',
		homepage: '',
		category: '',
		maturity: '',
		caption: '', 	// Legacy
	}
}

let errorElements = [];

function updateMetadataFromHTML(version) {
	if (version == 'v2') {
		const v2Parent = document.querySelector(`#form-v2-app`);
		const textInputs = v2Parent.querySelectorAll(`div input`);
		const textTextareas = v2Parent.querySelectorAll(`div textarea`);
		const textComboboxes = v2Parent.querySelectorAll(`div select`);
		const allInputs = [...textInputs, ...textTextareas, ...textComboboxes];

		allInputs.forEach((element) => {
			formData.app[element.id.replace('app-v2-', '')] = element.value;
		});
	}
}

async function getMetadata(url) {
	try {
		const response = await httpRequest(url);
		repository = response;
	} catch (err) {
		console.error("Failed to get metadata:", err);
	}
}

function httpRequest(url) {
	return fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			return response.json();
		});
}
/*
async function getMetadata(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');

        const data = await response.json();
        console.log("Loaded object:", data);
        console.log("Title:", data.title); // access properties
    } catch (err) {
        console.error("Error loading JSON:", err);
    }
}
*/

function showPageArea(name) {
	document.querySelector('#form-v1-app').classList.add('hidden');
	document.querySelector('#form-v2-app').classList.add('hidden');
	document.querySelector('#results').classList.add('hidden');
	document.querySelector('#form-url').classList.add('hidden');

	document.querySelector(`#${name}`).classList.remove('hidden');
}

function copyToClipboard(elementId) {
	const textArea = document.querySelector(elementId);
	textArea.select();
	document.execCommand('copy');
}