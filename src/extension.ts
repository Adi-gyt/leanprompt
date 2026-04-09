import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface SessionData {
    sessionLog: Array<{ timestamp: string; message: string }>;
    progressEntries: Array<{ date: string; hours: number; topic: string }>;
    chatCount: number;
    promptNumber: number;
}

interface ApiConfig {
    claudeApiKey?: string;
    chatGptApiKey?: string;
    defaultProvider: 'clipboard' | 'claude' | 'chatgpt';
}

const DEFAULT_SESSION_DATA: SessionData = {
    sessionLog: [],
    progressEntries: [],
    chatCount: 0,
    promptNumber: 0
};

const DEFAULT_API_CONFIG: ApiConfig = {
    defaultProvider: 'clipboard'
};

let sessionData: SessionData = { ...DEFAULT_SESSION_DATA };
let apiConfig: ApiConfig     = { ...DEFAULT_API_CONFIG };
let workspaceFolder: string  = '';
let lastActiveEditor: vscode.TextEditor | undefined;

export function activate(context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    loadSessionData(context);
    loadApiConfig(context);

    lastActiveEditor = vscode.window.activeTextEditor;
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) { lastActiveEditor = editor; }
    }, null, context.subscriptions);

    const openDashboard = vscode.commands.registerCommand('study-bridge.openDashboard', () => {
        StudyBridgePanel.createOrShow(context);
    });

    const configureApi = vscode.commands.registerCommand('study-bridge.configureApi', () => {
        configureApiKeys(context);
    });

    const exportSession = vscode.commands.registerCommand('study-bridge.exportSession', () => {
        exportSessionToFile();
    });

    const importSession = vscode.commands.registerCommand('study-bridge.importSession', () => {
        importSessionFromFile(context);
    });

    context.subscriptions.push(openDashboard, configureApi, exportSession, importSession);

    
}

export function deactivate() {}

function loadSessionData(context: vscode.ExtensionContext) {
    const workspaceFile = workspaceFolder
        ? path.join(workspaceFolder, '.study-bridge', 'session.json')
        : null;
    const globalData = context.globalState.get<SessionData>('studyBridgeSession');

    if (workspaceFile && fs.existsSync(workspaceFile)) {
        try {
            const content = fs.readFileSync(workspaceFile, 'utf-8');
            sessionData = JSON.parse(content);
        } catch (e) {
            sessionData = globalData || { ...DEFAULT_SESSION_DATA };
        }
    } else if (globalData) {
        sessionData = globalData;
    } else {
        sessionData = { ...DEFAULT_SESSION_DATA };
    }
}

function loadApiConfig(context: vscode.ExtensionContext) {
    const saved = context.globalState.get<ApiConfig>('studyBridgeApiConfig');
    if (saved) { apiConfig = saved; }
}

function saveSessionData(context: vscode.ExtensionContext) {
    context.globalState.update('studyBridgeSession', sessionData);

    if (workspaceFolder) {
        const dir      = path.join(workspaceFolder, '.study-bridge');
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
        const filePath = path.join(dir, 'session.json');
        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
    }
}

function saveApiConfig(context: vscode.ExtensionContext) {
    context.globalState.update('studyBridgeApiConfig', apiConfig);
}

async function configureApiKeys(context: vscode.ExtensionContext) {
    const choice = await vscode.window.showQuickPick(
        [
            { label: 'Use Clipboard (Free)',    description: 'Copy prompts, paste in Claude/ChatGPT' },
            { label: 'Add Claude API Key',      description: 'Optional: Direct Claude integration' },
            { label: 'Add ChatGPT API Key',     description: 'Optional: For GPT-4o access' },
            { label: 'Clear All Keys',          description: 'Remove saved API credentials' }
        ],
        { placeHolder: 'Choose AI integration method' }
    );

    if (!choice) { return; }

    if (choice.label.includes('Claude')) {
        const key = await vscode.window.showInputBox({
            placeHolder: 'sk-ant-...',
            prompt: 'Enter Claude API key (from console.anthropic.com)',
            password: true
        });
        if (key) {
            apiConfig.claudeApiKey    = key;
            apiConfig.defaultProvider = 'claude';
            saveApiConfig(context);
            vscode.window.showInformationMessage('Claude API key configured');
        }
    } else if (choice.label.includes('ChatGPT')) {
        const key = await vscode.window.showInputBox({
            placeHolder: 'sk-...',
            prompt: 'Enter ChatGPT API key (from platform.openai.com)',
            password: true
        });
        if (key) {
            apiConfig.chatGptApiKey   = key;
            apiConfig.defaultProvider = 'chatgpt';
            saveApiConfig(context);
            vscode.window.showInformationMessage('ChatGPT API key configured');
        }
    } else if (choice.label.includes('Clear')) {
        apiConfig = { ...DEFAULT_API_CONFIG };
        saveApiConfig(context);
        vscode.window.showInformationMessage('API keys cleared');
    }
}

function exportSessionToFile() {
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName  = 'session'
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9\-]/g, '');
    const filename   = `study-bridge-${safeName}-${timestamp}.json`;
    const exportPath = path.join(workspaceFolder, filename);
    fs.writeFileSync(exportPath, JSON.stringify(sessionData, null, 2));
    vscode.window.showInformationMessage(`Session exported to ${filename}`);
}

async function importSessionFromFile(context: vscode.ExtensionContext) {
    const files = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'JSON': ['json'] }
    });

    if (files && files.length > 0) {
        try {
            const content = fs.readFileSync(files[0].fsPath, 'utf-8');
            const parsed  = JSON.parse(content);
            // Basic validation
            if (typeof parsed === 'object' && parsed !== null) {
                sessionData = { ...DEFAULT_SESSION_DATA, ...parsed };
                saveSessionData(context);
                vscode.window.showInformationMessage('Session imported successfully');
            } else {
                vscode.window.showErrorMessage('Invalid session file');
            }
        } catch (e) {
            vscode.window.showErrorMessage('Failed to import session');
        }
    }
}

function estimateTokens(code: string): number {
    return Math.ceil(code.length / 4);
}

function generateCodeSummary(code: string): string {
    const summaryParts: string[] = [];
    const funcMatches = code.match(/(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:\(|function)/g) || [];
    const funcs = funcMatches
        .map(m => m.replace(/(?:function|const|let|var)\s+/, '').replace(/\s*[=(]/g, '').trim())
        .filter(Boolean)
        .slice(0, 5);
    if (funcs.length > 0) { summaryParts.push('Funcs: ' + funcs.join(', ')); }
    const ifCount   = (code.match(/\bif\s*\(/g)          || []).length;
    const loopCount = (code.match(/\b(for|while)\s*[\({]/g) || []).length;
    if (ifCount > 0 || loopCount > 0) {
        summaryParts.push('Control: if(' + ifCount + ') loop(' + loopCount + ')');
    }
    return summaryParts.length > 0 ? summaryParts.join(' | ') : 'N/A';
}

function smartTruncate(code: string, maxChars: number = 10000): { truncated: string; wasTruncated: boolean } {
    if (code.length <= maxChars) { return { truncated: code, wasTruncated: false }; }
    const truncated       = code.substring(0, maxChars);
    const lastBraceIndex  = Math.max(
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

class StudyBridgePanel {
    public static currentPanel: StudyBridgePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _context: vscode.ExtensionContext;

    public static createOrShow(context: vscode.ExtensionContext) {
        if (StudyBridgePanel.currentPanel) {
            StudyBridgePanel.currentPanel._panel.reveal();
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
        StudyBridgePanel.currentPanel = new StudyBridgePanel(panel, context);
    }

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this._panel   = panel;
        this._context = context;
        this._panel.webview.html = this.getHtml();
        this.setupMessageHandlers();
        this._panel.onDidDispose(() => {
            StudyBridgePanel.currentPanel = undefined;
        });
    }

    private getHtml(): string {
        const webview   = this._panel.webview;
        const mediaPath = vscode.Uri.joinPath(this._context.extensionUri, 'media');

        const styleUri  = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'script.js'));

        const htmlPath = vscode.Uri.joinPath(mediaPath, 'index.html').fsPath;
        let html       = fs.readFileSync(htmlPath, 'utf-8');

        html = html.replace('{{STYLE_URI}}',  styleUri.toString());
        html = html.replace('{{SCRIPT_URI}}', scriptUri.toString());

        return html;
    }

    private setupMessageHandlers() {
        this._panel.webview.onDidReceiveMessage(async message => {

            if (message.command === 'update') {
                const d = message.data;
                if (d.chatCount        !== undefined) { sessionData.chatCount    = d.chatCount; }
                if (d.promptNumber     !== undefined) { sessionData.promptNumber = d.promptNumber; }
                if (d.sessionLog && d.sessionLog.length > 0) {
                    sessionData.sessionLog = [...sessionData.sessionLog, ...d.sessionLog].slice(-100);
                }
                if (d.progressEntries && d.progressEntries.length > 0) {
                    sessionData.progressEntries = [...sessionData.progressEntries, ...d.progressEntries];
                }
                saveSessionData(this._context);
                this._panel.webview.postMessage({ command: 'showNotification', type: 'success', message: 'Saved' });
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

            if (message.command === 'export') {
                exportSessionToFile();
                return;
            }

            if (message.command === 'getApiStatus') {
                this._panel.webview.postMessage({
                    command: 'apiStatus',
                    status: {
                        hasClaudeKey:    !!apiConfig.claudeApiKey,
                        hasChatGptKey:   !!apiConfig.chatGptApiKey,
                        defaultProvider: apiConfig.defaultProvider
                    }
                });
                return;
            }

            if (message.command === 'configureApi') {
                configureApiKeys(this._context);
                return;
            }

            if (message.command === 'requestSessionData') {
                this._panel.webview.postMessage({
                    command: 'loadSession',
                    data:    sessionData
                });
                return;
            }
        });
    }
}
