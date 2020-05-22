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
 * The "Create Note" command.
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


/**
 * The "Create Reference" command.
 *
 * Which creates references (to books, papers, movies, etc).
 */
export async function createReference() {

	let refType = await vscode.window.showQuickPick(
		Array.from(referenceTemplates.keys()), {
		placeHolder: "Create what type of reference?"
	});

	if (refType === undefined) {
		return;
	}

	let title = await vscode.window.showInputBox({
		placeHolder: "Reference title"
	});

	if (title === undefined) {
		return;
	}

	let template = referenceTemplates.get(refType);

	if (template === undefined) {
		return;
	}

	template = template.replace(`title = ""`, `title = "${title}"`);

	let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
	if (repo === undefined) {
		return;
	}

	let cleanTitle = util.canonicalizeString(title);
	let fileName = repo + "/references/" + util.timestamp() + "-" + cleanTitle + ".toml";

	fs.writeFileSync(fileName, template);

	let setting: vscode.Uri = vscode.Uri.parse("file:" + fileName);

	let doc = await vscode.workspace.openTextDocument(setting);
	vscode.window.showTextDocument(doc);
}


/**
 * The "Create Sketch" command.
 *
 * Which (guess what?) creates a sketch (of a note).
 */
export async function createSketch() {
	let title = await vscode.window.showInputBox({
		placeHolder: "Sketch title"
	});

	if (title === undefined) {
		return;
	}

	let repo = vscode.workspace.getConfiguration().get<string>("zeka-vs-code.repository");
	if (repo === undefined) {
		return;
	}

	let cleanTitle = util.canonicalizeString(title);
	let fileName = repo + "/sketches/" + util.timestamp() + "-" + cleanTitle + ".md";

	fs.writeFileSync(fileName, `# ${title}` + "\n\n");

	let setting: vscode.Uri = vscode.Uri.parse("file:" + fileName);

	let doc = await vscode.workspace.openTextDocument(setting);
	vscode.window.showTextDocument(doc);
}


/**
 * The "Follow link under cursor" command.
 *
 * Which opens the note or reference whose link is right under the cursor.
 */
export async function followLinkUnderCursor() {
	util.followLink(util.getLinkUnderCursor());
}


// Templates used when creating a new reference.
const referenceTemplates = new Map([
	["Book", `type = "book"
title = ""
subtitle = ""
author = "" # ["", ""]
year =
month =
edition = # 1 or "Special Edition"
volume =
numPages =
publisher = ""
`],

	["ConferencePaper", `type = "conferencePaper"
title = ""
subtitle = ""
author = "" # ["", ""]
year =
month =
numPages =
conference = ""
`],

	["JournalPaper", `type = "journalPaper"
title = ""
subtitle = ""
author = "" # ["", ""]
year =
month =
numPages =
journal = ""
volume =
number =
`],

	["TechnicalReport", `type = "technicalReport"
title = ""
subtitle = ""
author = "" # ["", ""]
year =
month =
numPages =
institution = ""
code = ""
`],

	["BlogPost", `type = "blogPost"
title = ""
subtitle = ""
author = "" # ["", ""]
year =
month =
url = ""
`],

	["Movie", `type = "movie"
title = ""
subtitle = ""
director = "" # ["", ""]
actors = "" # ["", ""]
year =
`],

	["Game", `type = "game"
title = ""
subtitle = ""
designer = "" # ["", ""]
studio = ""
publisher = ""
platform = "" # ["", ""]
year =
`]
]);
