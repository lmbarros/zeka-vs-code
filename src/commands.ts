/******************************************************************************\
* Zeka VS Code                                                                 *
*                                                                              *
* © 2020 Leandro Motta Barros                                                  *
*                                                                              *
* Licensed under the MIT license. See LICENSE.txt for details.                 *
\******************************************************************************/

import * as vscode from "vscode";
import * as util from "./util";
import * as fs from "fs";


/**
 * The Create Note command.
 *
 * Used to (...drum roll...) create a note.
 */
export async function createNote() {
	let title = await vscode.window.showInputBox({
		placeHolder: "Note title"
	});

	if (title === undefined) {
		return;
	}

	let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
	if (repo === undefined) {
		return;
	}

	let cleanTitle = util.canonicalizeString(title);
	let fileName = repo + "/notes/" + util.timestamp() + "-" + cleanTitle + ".md";

	fs.writeFileSync(fileName, `# ${title}` + "\n\n");

	let setting: vscode.Uri = vscode.Uri.parse("file:" + fileName);

	let doc = await vscode.workspace.openTextDocument(setting);
	vscode.window.showTextDocument(doc);
}
