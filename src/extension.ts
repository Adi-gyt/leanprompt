import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface SessionData {
    chatCount: number;
    promptNumber: number;
}

const DEFAULT_SESSION_DATA: SessionData = {
    chatCount: 0,
    promptNumber: 0
};

let sessionData: SessionData = { ...DEFAULT_SESSION_DATA };
let lastActiveEditor: vscode.TextEditor | undefined;

export function activate(context: vscode.ExtensionContext) {
    const stored = context.globalState.get<SessionData>('leanPromptSession');
    if (stored) { sessionData = { ...DEFAULT_SESSION_DATA, ...stored }; }

    lastActiveEditor = vscode.window.activeTextEditor;
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) { lastActiveEditor = editor; }
    }, null, context.subscriptions);

    const openPanel = vscode.commands.registerCommand('leanprompt.open', () => {
        LeanPromptPanel.createOrShow(context);
    });

    context.subscriptions.push(openPanel);
}

export function deactivate() {}

function saveSessionData(context: vscode.ExtensionContext) {
    context.globalState.update('leanPromptSession', sessionData);
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

function generateCodeSummary(code: string): string {
    const summaryParts: string[] = [];
    const funcMatches = code.match(/(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:\(|function)/g) || [];
    const funcs = funcMatches
        .map(m => m.replace(/(?:function|const|let|var)\s+/, '').replace(/\s*[=(]/g, '').trim())
        .filter(Boolean)
        .slice(0, 5);
    if (funcs.length > 0) { summaryParts.push('Funcs: ' + funcs.join(', ')); }
    const ifCount   = (code.match(/\bif\s*\(/g)           || []).length;
    const loopCount = (code.match(/\b(for|while)\s*[\({]/g) || []).length;
    if (ifCount > 0 || loopCount > 0) {
        summaryParts.push('Control: if(' + ifCount + ') loop(' + loopCount + ')');
    }
    return summaryParts.length > 0 ? summaryParts.join(' | ') : 'N/A';
}

function smartTruncate(code: string, maxChars: number = 10000): { truncated: string; wasTruncated: boolean } {
    if (code.length <= maxChars) { return { truncated: code, wasTruncated: false }; }
    const truncated      = code.substring(0, maxChars);
    const lastBraceIndex = Math.max(
        truncated.lastIndexOf('}'),
        truncated.lastIndexOf(']'),
        truncated.lastIndexOf(')')
    );
    if (lastBraceIndex > maxChars * 0.75) {
        return { truncated: truncated.substring(0, lastBraceIndex + 1) + '\n// ... [TRUNCATED]', wasTruncated: true };
    }
    const lastNewlineIndex = truncated.lastIndexOf('\n');
    if (lastNewlineIndex > maxChars * 0.5) {
        return { truncated: truncated.substring(0, lastNewlineIndex) + '\n// ... [TRUNCATED]', wasTruncated: true };
    }
    return { truncated: truncated + '\n// ... [TRUNCATED]', wasTruncated: true };
}

function analyzeCode(editor: vscode.TextEditor): {
    code: string; filename: string; tokenCount: number;
    summary: string; truncated: boolean; sizeKb: number;
} {
    const code     = editor.selection && !editor.selection.isEmpty
        ? editor.document.getText(editor.selection)
        : editor.document.getText();
    const filename = path.basename(editor.document.fileName);
    const sizeKb   = code.length / 1024;
    const { truncated, wasTruncated } = smartTruncate(code, 10000);
    const tokenCount = estimateTokens(truncated);
    const summary    = generateCodeSummary(truncated);
    return { code: truncated, filename, tokenCount, summary, truncated: wasTruncated, sizeKb };
}

class LeanPromptPanel {
    public static currentPanel: LeanPromptPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _context: vscode.ExtensionContext;

    public static createOrShow(context: vscode.ExtensionContext) {
        if (LeanPromptPanel.currentPanel) {
            LeanPromptPanel.currentPanel._panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            'leanPrompt',
            'LeanPrompt',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media')
                ]
            }
        );
        LeanPromptPanel.currentPanel = new LeanPromptPanel(panel, context);
    }

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this._panel   = panel;
        this._context = context;
        this._panel.webview.html = this.getHtml();
        this.setupMessageHandlers();
        this._panel.onDidDispose(() => {
            LeanPromptPanel.currentPanel = undefined;
        });
    }

    private getHtml(): string {
        const webview   = this._panel.webview;
        const mediaPath = vscode.Uri.joinPath(this._context.extensionUri, 'media');
        const styleUri  = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'script.js'));
        const htmlPath  = vscode.Uri.joinPath(mediaPath, 'index.html').fsPath;
        let html        = fs.readFileSync(htmlPath, 'utf-8');
        html = html.replace('{{STYLE_URI}}',  styleUri.toString());
        html = html.replace('{{SCRIPT_URI}}', scriptUri.toString());
        html = html + '<!-- ' + Date.now() + ' -->';
        return html;
    }

    private setupMessageHandlers() {
        this._panel.webview.onDidReceiveMessage(async message => {

            if (message.command === 'update') {
                const d = message.data;
                if (d.chatCount    !== undefined) { sessionData.chatCount    = d.chatCount; }
                if (d.promptNumber !== undefined) { sessionData.promptNumber = d.promptNumber; }
                saveSessionData(this._context);
                return;
            }

            if (message.command === 'openUrl') {
                vscode.env.openExternal(vscode.Uri.parse(message.url));
                return;
            }

            if (message.command === 'copyPrompt') {
                await vscode.env.clipboard.writeText(message.text);
                this._panel.webview.postMessage({ command: 'showNotification', type: 'success', message: 'Copied to clipboard' });
                return;
            }

            if (message.command === 'extractCode') {
                const editor = vscode.window.activeTextEditor || lastActiveEditor;
                if (!editor) {
                    this._panel.webview.postMessage({ command: 'showNotification', type: 'error', message: 'No active file open' });
                    return;
                }
                const analysis = analyzeCode(editor);
                this._panel.webview.postMessage({
                    command:    'codeExtracted',
                    code:       analysis.code,
                    filename:   analysis.filename,
                    slot:       message.slot,
                    sizeKb:     analysis.sizeKb.toFixed(1),
                    truncated:  analysis.truncated,
                    tokenCount: analysis.tokenCount,
                    summary:    analysis.summary
                });
                return;
            }

            if (message.command === 'requestSessionData') {
                this._panel.webview.postMessage({
                    command: 'loadSession',
                    data: { chatCount: sessionData.chatCount, promptNumber: 0 }
                });
                return;
            }
        });
    }
}
