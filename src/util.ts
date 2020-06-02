/******************************************************************************\
* Zeka VS Code                                                                 *
*                                                                              *
* © 2020 Leandro Motta Barros                                                  *
*                                                                              *
* Licensed under the MIT license. See LICENSE.txt for details.                 *
\******************************************************************************/

import * as vscode from "vscode";
import * as fs from "fs";
import * as glob from "glob";
import * as bombadil from "@sgarciac/bombadil";
import { QuickPickItem } from "vscode";


// A regex matching (and capturing) the timestamp IDs I use for the Zeka
// "objects".
const zekaLinkIDRegex = `([0-9]{5}[0-1][0-9][0-3][0-9][0-2][0-9](?:[0-5][0-9]){2})`;

// A regex matching a link to a note, something like "[extra][[0202005140845]]",
// where the "[extra]" part is optional. Captures the "extra" part and the
// timestamp ID.
const zekaNoteLinkRegex = new RegExp(
	`(?:\\[([^\\[\\]]+)\\])?` +
	`\\[\\[` + zekaLinkIDRegex + `\\]\\]`);

// A regex matching a link to a reference, something like
// "{extra}{{0202005140845}}", where the "{extra}" part is optional. Captures
// the "extra" part and the timestamp ID.
const zekaReferenceLinkRegex = new RegExp(
	`(?:\\{([^\\{\\}]+)\\})?` +
	`\\{\\{` + zekaLinkIDRegex + `\\}\\}`);

// A regex matching a link to an attachment, something like
// "(extra)((0202005140845))", where the "(extra)" part is optional. Captures
// the "extra" part and the timestamp ID.
const zekaAttachmentLinkRegex = new RegExp(
	`(?:\\(([^\\(\\)]+)\\))?` +
	`\\(\\(` + zekaLinkIDRegex + `\\)\\)`);

// A regex matching any type of Zeka link. Please don't rely on the captures
// from this regex.
const zekaLinkRegex = new RegExp(
	`(?:` + zekaNoteLinkRegex.source + `)` +
	`|(?:`+ zekaReferenceLinkRegex.source + `)` +
	`|(?:`+ zekaAttachmentLinkRegex.source + `)`);


/**
 * Converts a string to a format I feel comfortable to use in file names.
 *
 * Basically, it removes things like diacritics, spaces and punctuation.
 *
 * See https://stackoverflow.com/a/37511463 for the clever diacritics removal
 * enchantment I used here. Everything else are just dumb heuristics that seem
 * to work reasonably well for me.
 *
 * @param s The string to be canonicalized.
 */
export function canonicalizeString(s: string): string {
	return s.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\(\[\{]/g, "-")
		.replace(/[\)\]\}]/g, "")
		.replace(/[\'\"\`]/g, "")
		.replace(/[\.\,\!\?\;\/\\]/g, " ")
		.replace(":", "-")
		.replace(/ *- */g, "-")
		.replace(/^ +/g, "")
		.replace(/ +$/g, "")
		.replace(/ +/g, " ")
		.replace(/ +/g, "_");
}


/**
 * Returns a string timestamp in the same format one would get by running `date
 * +0%Y%m%d%H%M%S` in the shell.
 *
 * This is what I use to generate the file names used in Zeka.
 *
 * Note this format is Y10K-compliant. I don't want any trouble with my file
 * names if I happen to live until my 8020th birthday!
 *
 * @todo As of now the code itself is not Y10K-compliant: I am just adding a "0"
 *       suffix to the (for the time being) four-digit year.
 */
export function timestamp(): string {
	let now = new(Date);

	let Y = `${now.getFullYear()}`;
	let m = (now.getMonth() + 1 < 10 ? "0" : "") + `${now.getMonth() + 1}`;
	let d = (now.getDate() < 10 ? "0" : "") + `${now.getDate()}`;
	let H = (now.getHours() < 10 ? "0" : "") + `${now.getHours()}`;
	let M = (now.getMinutes() < 10 ? "0" : "") + `${now.getMinutes()}`;
	let S = (now.getSeconds() < 10 ? "0" : "") + `${now.getSeconds()}`;

	return `0${Y}${m}${d}${H}${M}${S}`;
}


/**
  * Checks if the Zeka repository is properly configured, if it exists, etc,
  * and, if so, executes a given function.
  *
  * This is used to prevent running anything if the Zeka repository is not in
  * place. (We could cause a mess if we tried).
  *
  * @param func The function to execute.
  */
export function checkRepoThen(func: () => void) {
	let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
	if (repo === undefined || repo === "") {
		vscode.window.showErrorMessage("No Zeka repository configured! Please define it in the settings.");
		return;
	}

	if (!fs.existsSync(repo)) {
		vscode.window.showErrorMessage(`No Zeka repository found at '${repo}'.`);
		return;
	}

	func();
}

/**
 * The types of links we can have in a Zeka document.
 */
export enum LinkType {
	Note,
	Reference,
	Attachment
}

/**
 * Encodes information about a link to a Zeka object.
 *
 * A link looks like this:
 *
 * - Link to Note: [extra][[id]]
 * - Link to Reference: {extra}{{id}}
 * - Link to Attachment: (extra)((id))
 *
 * The "extra" part (including the brackets) is optional.
 */
export class ZekaLink {
	public constructor(
		readonly type: LinkType,
		readonly id: string,
		readonly extra: string) {}
}


// Returns the text of the Zeka link under the cursor. If no link is under the
// cursor, returns an empty string.
function getLinkTextUnderCursor(): string {
	let editor = vscode.window.activeTextEditor;
	let doc = editor?.document;

	if (editor === undefined || doc === undefined) {
		return "";
	}

	let linkRange = doc.getWordRangeAtPosition(editor.selection.active, zekaLinkRegex);
	if (linkRange === undefined) {
		return "";
	}

	let linkText = doc.getText(linkRange);

	if (linkText === undefined) {
		return "";
	}

	return linkText;
}


/**
 * Returns the link under the cursor, or `undefined` if there is no link under
 * the cursor.
 */
export function getLinkUnderCursor(): (ZekaLink|undefined) {
	let linkText = getLinkTextUnderCursor();
	if (linkText === "") {
		return undefined;
	}

	let matches = linkText.match(zekaNoteLinkRegex);
	if (matches !== null) {
		return new ZekaLink(LinkType.Note, matches[2], matches[1]);
	}

	matches = linkText.match(zekaReferenceLinkRegex);
	if (matches !== null) {
		return new ZekaLink(LinkType.Reference, matches[2], matches[1]);
	}

	matches = linkText.match(zekaAttachmentLinkRegex);
	if (matches !== null) {
		return new ZekaLink(LinkType.Attachment, matches[2], matches[1]);
	}

	console.log("Something fishy with getLinkUnderCursor(): should have had a match!");
	return undefined;
}

export function followLink(link: ZekaLink|undefined) {
	if (link === undefined) {
		return;
	}

	let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
	if (repo === undefined || repo === "") {
		console.error("Something fishy in followLink(): no Zeka repository configured!");
		return;
	}

	switch(link.type) {
		case LinkType.Note:
			openFileByGlob(`${repo}/notes/${link.id}*.md`);
			break;

		case LinkType.Reference:
			openFileByGlob(`${repo}/references/${link.id}*.toml`);
			break;

		case LinkType.Attachment:
			openFileByGlob(`${repo}/attachments/${link.id}*`);
			break;
	}
}

// Opens a file matching `theGlob`. Expects that one, and only one, match will
// exist.
function openFileByGlob(theGlob: string) {
	glob(theGlob, async function(err, files) {
		if (err !== null) {
			console.error(`Error looking for files with glob ${theGlob}.`);
			return;
		}

		if (files.length === 0) {
			vscode.window.showErrorMessage(`No match found for ${theGlob}.`);
			return;
		}

		if (files.length > 1) {
			vscode.window.showErrorMessage(`Ops, got multiple matches for ${theGlob}.`);
			return;
		}

		let setting: vscode.Uri = vscode.Uri.parse("file:" + files[0]);

		let doc = await vscode.workspace.openTextDocument(setting);
		vscode.window.showTextDocument(doc);
	});
}


// Opens a file matching `theGlob`. Expects that one, and only one, match will
// exist.
export function getListForLinkCreation(): QuickPickItem[] {
	let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
	if (repo === undefined || repo === "") {
		console.error("Something fishy in getListForLinkCreation: no Zeka repository configured!");
		return [];
	}

	const theGlob = `${repo}/{notes,references,attachments}/[0-9][0-9][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9][0-5][0-9]-*`;

	let files = glob.sync(theGlob);
	let list: QuickPickItem[] = [];

	for (const file of files) {
		let linkOption = linkOptionFromFileName(file);
		if (linkOption === undefined) {
			continue;
		}
		list.push(linkOption);
	}

	return list;
}


// Given a file name, return a QuickPickItem representing it (for use in a
// "create link" operation).
function linkOptionFromFileName(fileName: string): QuickPickItem|undefined {
	let fileRegex = /.*\/(notes|references|attachments)\/([0-9]{5}[0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9][0-5][0-9])-(.*)/;

	let matches = fileName.match(fileRegex);
	if (matches?.length !== 4){
		console.error(`Found file with unexpected name: ${fileName}`);
		return undefined;
	}

	let type = matches[1];
	let id = matches[2];
	let title = matches[3];
	let description = "";

	let allText = "";

	switch (type) {
		case "notes":
			allText = fs.readFileSync(fileName, {encoding: "utf8"});
			const lines = allText.split("\n", 1);
			if (lines.length >= 1) {
				title = lines[0].substr(2);
			}
			break;

		case "references":
			allText = fs.readFileSync(fileName, {encoding: "utf8"});
			let tomlReader = new bombadil.TomlReader();
			tomlReader.readToml(allText);
			let data = tomlReader.result;

			// Title
			if (data.title !== undefined) {
				let theTitle = data.title;
				if (typeof theTitle === "string") {
					title = theTitle;
				} else if (Array.isArray(theTitle)) {
					title = theTitle.join("; ");
				}
			}

			// Subtitle
			if (data.subtitle !== undefined) {
				let theSubtitle = data.subtitle;
				if (typeof theSubtitle === "string") {
					title += ": " + theSubtitle;
				} else {
					console.log(`Bad subtitle type (${typeof theSubtitle}) for file ${fileName}.`);
				}
			}

			// Edition
			if (data.edition !== undefined) {
				let theEdition = data.edition;
				if (typeof theEdition === "string" || typeof theEdition === "number") {
					title += ", " + theEdition + "Ed.";
				} else {
					console.log(`Bad edition type (${typeof theEdition}) for file ${fileName}.`);
				}
			}

			// Author
				let theAuthor = data.author;
				if (typeof theAuthor === "string") {
					description = theAuthor;
				} else if (Array.isArray(theAuthor)) {
					description = theAuthor.join("; ");
				}
			break;
	}

	return {
		label: title,
		description: description,
		detail: id,
	};
}
