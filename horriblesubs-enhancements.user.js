// ==UserScript==
// @name        HorribleSubs Enhancements
// @namespace   Violentmonkey Scripts
// @version     1.1.2
// @description Restores the download links in the latest releases on the front page. More to come?
// @author      Hajile-Haji
// @match       https://horriblesubs.info/
// ==/UserScript==

const releases = document.querySelector('.latest-releases');
const css = `.latest-releases .appended-links{background-color:#FFF;box-shadow:0 3px 5px -4px rgba(0,0,0,.4) inset}.latest-releases .appended-links a{color:#DA4453;display:inline;padding:0}.latest-releases .appended-links a:hover{background-color:transparent!important;color:#DADADA}.loader,.loader:after,.loader:before{border-radius:50%;width:2.5em;height:2.5em;-webkit-animation:load7 1.8s infinite ease-in-out;animation:load7 1.8s infinite ease-in-out}.loader{color:#AAA;font-size:10px;margin:5px auto;position:relative;text-indent:-9999em;-webkit-transform:translate(0,-2.5em);-ms-transform:translateZ(0);transform:translate(0,-2.5em);-webkit-animation-delay:-.16s;animation-delay:-.16s;z-index:0}.loader::after,.loader::before{content:'';position:absolute;top:0}.loader::before{left:-3.5em;-webkit-animation-delay:-.32s;animation-delay:-.32s}.loader::after{left:3.5em}@-webkit-keyframes load7{0%,100%,80%{box-shadow:0 2.5em 0 -1.3em}40%{box-shadow:0 2.5em 0 0}}@keyframes load7{0%,100%,80%{box-shadow:0 2.5em 0 -1.3em}40%{box-shadow:0 2.5em 0 0}}`;

let init = true;
let mutationConfig = {
	attributes: false,
	childList: true,
	subtree: false
};
let observer = new MutationObserver(mutationCallback);

function mutationCallback(mutationsList) {
	for (let mutation of mutationsList) {
		if (mutation.type == 'childList') {
			if (init) {
				init = false;
				initStyle();
			}

			initItems();
		}
	}
}

function initStyle() {
	const style = document.createElement('style');
	style.innerText = css;
	releases.parentNode.appendChild(style);
}

function initItems() {
	const triggers = document.querySelectorAll('.latest-releases ul > li:not([data-clicked]):not([data-open-state]) > a');

	triggers.forEach(trigger => {
		const parent = trigger.parentNode;
		parent.dataset.clicked = false;
		parent.dataset.openState = false;
		bindClick(trigger);
	});
}

function bindClick(item) {
	item.addEventListener('click', e => {
		e.preventDefault();

		const link = e.target.closest('a');
		const parent = link.parentNode;

		if (parent.dataset.clicked.toBool()) {
			toggleOpenState(parent);
		} else {
			parent.dataset.clicked = true;
			const loader = showLoader(parent);

			getShowId(link.pathname, link.hash.match(/\d+/g)[0])
				.then(markup => appendMarkup(parent, markup, loader));
		}
	});
}

function getShowId(url, epNum) {
	return new Promise((resp, rej) => {
		fetchHtml(url)
			.then(res => {
				const elements = parseData(res);
				const scripts = [].slice.call(elements.querySelectorAll('script'));
				const showID = scripts.filter(s => s.innerText.includes('hs_showid'))[0].innerText.match(/\d+/g)[0];

				getEpisodeList(showID, epNum)
					.then(markup => resp(markup));
			});
	});
}

function getEpisodeList(showID, epNum) {
	return new Promise((resp, rej) => {
		fetchHtml(`/api.php?method=getshows&type=show&showid=${showID}`)
			.then(res => {
				const elements = parseData(res);
				// need this because they're using an ID that starts with a number, which isn't correct
				const id = elements.getElementById(epNum);
				const markup = id.querySelector('.rls-links-container');

				resp(markup);
			});
	});
}

function appendMarkup(parent, markup, loader) {
	markup.classList.remove('rls-links-container');
	markup.classList.add('appended-links');
	parent.appendChild(markup);
	loader.remove();
}

function showLoader(parent) {
	const loader = document.createElement('div');
	loader.classList.add('loader');
	loader.innerText = 'Loading...';
	parent.appendChild(loader);
	parent.dataset.openState = true;

	return loader;
}

function toggleOpenState(parent) {
	if (parent.dataset.openState.toBool()) {
		parent.dataset.openState = false;
		parent.lastElementChild.classList.add('hide');
	} else {
		parent.dataset.openState = true;
		parent.lastElementChild.classList.remove('hide');
	}
}

function parseData(data) {
	const parser = new DOMParser();
	return parser.parseFromString(data, 'text/html');
}

function fetchHtml(url) {
	return new Promise((resp, rej) => {
		fetch(url)
			.then(res => res.text())
			.then(body => resp(body))
			.catch(err => {
				throw Error(err);
			});
	});
}

String.prototype.toBool = function() {
	let bool = undefined;
	if (this.toLowerCase() === 'true') bool = true;
	if (this.toLowerCase() === 'false') bool = false;
	if (typeof bool === 'boolean') return bool;
	throw Error('String is not a boolean.');
};

observer.observe(releases, mutationConfig);
