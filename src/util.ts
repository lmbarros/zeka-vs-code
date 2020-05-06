/******************************************************************************\
* Zeka VS Code                                                                 *
*                                                                              *
* © 2020 Leandro Motta Barros                                                  *
*                                                                              *
* Licensed under the MIT license. See LICENSE.txt for details.                 *
\******************************************************************************/

import * as vscode from "vscode";
import * as fs from "fs";


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
