/******************************************************************************\
* Zeka VS Code                                                                 *
*                                                                              *
* © 2020 Leandro Motta Barros                                                  *
*                                                                              *
* Licensed under the MIT license. See LICENSE.txt for details.                 *
\******************************************************************************/

import * as vscode from "vscode";
import * as fs from "fs";


// This gets called when the extension is activated.
export function activate(context: vscode.ExtensionContext) {
	console.log("Activating the zeka-vs-code extension.");

	// Create Note
	let disposable = vscode.commands.registerCommand('lmb.zeka-vs-code.createNote', () => {
		checkRepoThen(() => {
			createNote();
		});
	});

	context.subscriptions.push(disposable);
}

// This method get called when the extension is deactivated.
export function deactivate() {}


// Create note command.
function createNote() {
	vscode.window.showInputBox({
		placeHolder: "Note title"
	}).then(title => {
		if (title === undefined) {
			return;
		}

		let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
		if (repo === undefined) {
			return;
		}

		let filteredTitle = canonicalizeString(title);
		let fileName = repo + "/notes/" + timeTag() + "-" + filteredTitle + ".md";

		fs.writeFileSync(fileName, `# ${title}` + "\n\n");

		var setting: vscode.Uri = vscode.Uri.parse("file:" + fileName);
		vscode.workspace.openTextDocument(setting).then((doc: vscode.TextDocument) => {
			vscode.window.showTextDocument(doc);
		});
	});
}



// Checks if the repo exists where configured and, if so, executes func.
function checkRepoThen(func: () => void) {
	let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
	if (repo === undefined || repo === "") {
		vscode.window.showErrorMessage("No repository defined! Please define it in the settings.");
		return;
	}

	if (!fs.existsSync(repo)) {
		vscode.window.showErrorMessage(`Repository not found at '${repo}'.`);
		return;
	}

	func();
}


// Returns the date/time "tag" I use in my filenames.Equivalent to
// `date +0%Y%m%d%H%M%S` in the shell.
function timeTag(): string {
	let now = new(Date);

	let Y = `${now.getFullYear()}`;
	let m = (now.getMonth() + 1 < 10 ? "0" : "") + `${now.getMonth() + 1}`;
	let d = (now.getDate() < 10 ? "0" : "") + `${now.getDate()}`;
	let H = (now.getHours() < 10 ? "0" : "") + `${now.getHours()}`;
	let M = (now.getMinutes() < 10 ? "0" : "") + `${now.getMinutes()}`;
	let S = (now.getSeconds() < 10 ? "0" : "") + `${now.getSeconds()}`;

	// I want my notes Y10K compliant! (But, yeah, this hardcoded leading zero
	// is a ticking bomb!)
	return `0${Y}${m}${d}${H}${M}${S}`;
}


// Filters out stuff like diacritics and spaces from a string so that I feel
// comfortable using it on a file name.
//
// See https://stackoverflow.com/a/37511463 for the clever diacritics removal
// enchantment I used here.
//
// The rest of it are just heuristics that seem to work reasonably well for me.
function canonicalizeString(title: string): string {
	return title.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\(\[\{]/g, "-")
		.replace(/[\)\]\}]/g, "")
		.replace(/[\.\,\!\?\;]/g, " ")
		.replace(":", "-")
		.replace(/ *- */g, "-")
		.replace(/^ +/g, "")
		.replace(/ +$/g, "")
		.replace(/ +/g, " ")
		.replace(/ +/g, "_");
}
