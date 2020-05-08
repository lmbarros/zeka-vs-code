/******************************************************************************\
* Zeka VS Code                                                                 *
*                                                                              *
* © 2020 Leandro Motta Barros                                                  *
*                                                                              *
* Licensed under the MIT license. See LICENSE.txt for details.                 *
\******************************************************************************/

import * as vscode from "vscode";
import * as commands from "./commands";
import * as util from "./util";


// This gets called when the extension is activated.
export function activate(context: vscode.ExtensionContext) {
	console.log("Activating the zeka-vs-code extension.");

	// Create Note
	let disposable = vscode.commands.registerCommand('lmb.zeka-vs-code.createNote', () => {
		util.checkRepoThen(() => { commands.createNote(); });
	});

	context.subscriptions.push(disposable);

	// Create Reference
	disposable = vscode.commands.registerCommand('lmb.zeka-vs-code.createReference', () => {
		util.checkRepoThen(() => { commands.createReference(); });
	});

	context.subscriptions.push(disposable);

	// Create Sketch
	disposable = vscode.commands.registerCommand('lmb.zeka-vs-code.createSketch', () => {
		util.checkRepoThen(() => { commands.createSketch(); });
	});

	context.subscriptions.push(disposable);
}

// This method get called when the extension is deactivated.
export function deactivate() {}
