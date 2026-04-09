# 💡 Customization & Development Tips

This document explains how to modify Study Bridge for your needs.

---

## Customizing Prompt Templates

Don't like the default prompts? Easy to change!

### Location
File: `src/extension.ts` → search for `generatePrompt()` function

### Example: Add "Interview Prep" Prompt

1. Open `src/extension.ts`
2. Find the `<select id="promptType">` section in the HTML
3. Add new option:
   ```html
   <option value="interview">🎤 Interview Prep — Practice explaining concepts</option>
   ```

4. Find the `generatePrompt()` function in the JavaScript section
5. Add this at the end of the if-else chain:
   ```javascript
   } else if (type === 'interview') {
       prompt = `[INTERVIEW PREP]
Topic: ${topic} | Phase: ${phase}

Ask me an interview question about ${topic}.
Wait for my answer, then:
1. Correct any mistakes
2. Point out what I explained well
3. Suggest how to improve answer

Make it realistic and challenging.`;
   }
   ```

6. Run `npm run compile`
7. Press `Ctrl+Shift+F5` to reload
8. Test it!

---

## Adding New Study Phases

Default phases are "Basics", "Exam gaps", "Deep grind". Want to customize?

### In the Dashboard UI

The phases are stored in `sessionData.customPhases`. Users can modify via:

**For Developers:** Edit directly in `src/extension.ts`:

```typescript
const DEFAULT_SESSION_DATA: SessionData = {
    // ... other fields ...
    customPhases: [
        'Phase 1 — Theory',
        'Phase 2 — Practice',
        'Phase 3 — Projects',
        'Phase 4 — Optimization'
    ]
};
```

Recompile and all users get the new phases.

---

## Changing Colors & Theme

### Dark Mode (Current)
All colors use CSS variables. Find them in the `<style>` section:

```css
body { background: #0d1117; color: #e6edf3; }
```

### Switch to Light Theme

Find and replace:
- `#0d1117` (very dark) → `#ffffff` (white)
- `#e6edf3` (light text) → `#1d1d1d` (dark text)
- `#58a6ff` (blue) → `#0969da` (darker blue)
- `#30363d` (borders) → `#e0e0e0` (light borders)

---

## Adding Keyboard Shortcuts

### Command Palette Shortcut

Edit `package.json` → `contributes.keybindings`:

```json
{
    "command": "study-bridge.openDashboard",
    "key": "ctrl+shift+k",
    "mac": "cmd+shift+k",
    "when": "editorFocus || explorerViewletVisible"
}
```

The `"when"` clause means: only work when editor is focused.

### Add "Quick Note" Shortcut

1. Register new command in `src/extension.ts`:
```typescript
const quickNote = vscode.commands.registerCommand('study-bridge.quickNote', async () => {
    const note = await vscode.window.showInputBox({
        prompt: 'Quick note:',
        placeHolder: 'Type something you learned...'
    });
    if (note) {
        // Add to sessionData.sessionLog
        sessionData.sessionLog.push({
            timestamp: new Date().toLocaleTimeString(),
            message: note
        });
    }
});
context.subscriptions.push(quickNote);
```

2. Add to `package.json`:
```json
{
    "command": "study-bridge.quickNote",
    "title": "Study Bridge: Quick Note",
    "key": "ctrl+shift+n",
    "mac": "cmd+shift+n"
}
```

---

## Integration Ideas

### 1. VS Code Problems Panel
Automatically extract errors from "Problems" panel:

```typescript
// In setupMessageHandlers():
const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
const errors = diagnostics
    .filter(d => d.severity === vscode.DiagnosticSeverity.Error)
    .map(d => `${d.source}: ${d.message}`)
    .join('\n');

// Auto-populate copilotSummary with errors
```

### 2. Git History
Track which commits correspond to study sessions:

```typescript
// Get current git branch/commit info
const exec = require('child_process').exec;
exec('git log -1 --oneline', (err, stdout) => {
    sessionData.sessionLog.push({
        timestamp: new Date().toLocaleTimeString(),
        message: `Committed: ${stdout.trim()}`
    });
});
```

### 3. Study Statistics Dashboard
Show in a side panel:

```html
<div class="stats-dashboard">
    <h2>📊 This Week</h2>
    <p>Total Hours: <strong id="weekHours">8.5h</strong></p>
    <p>Topics Covered: <strong id="topicCount">4</strong></p>
    <p>Avg Session: <strong id="avgSession">2.1h</strong></p>
    
    <canvas id="hoursChart"></canvas> <!-- Chart.js library -->
</div>
```

---

## Testing Your Changes

### 1. Unit Tests
Create `src/test.ts`:

```typescript
import * as assert from 'assert';

// Test prompt generation
function testPromptGeneration() {
    const topic = "FSM Design";
    const weak = "Reset logic";
    
    // Your test logic
    assert.ok(prompt.includes("FSM"));
    console.log('✅ Prompt test passed');
}

testPromptGeneration();
```

Run with: `npm test`

### 2. Manual Testing Checklist

Before releasing, test all:
- [ ] Session saves correctly
- [ ] Code loads from active file
- [ ] Each prompt type generates valid text
- [ ] Notes persist after reload
- [ ] Progress entries calculate correct totals
- [ ] Export creates valid JSON
- [ ] Import loads previous session
- [ ] Keyboard shortcuts work
- [ ] Large files (100KB+) show warning
- [ ] API key configuration works

---

## Advanced: Add Claude API Integration

This requires the Anthropic SDK. Here's a template:

```typescript
// In setupMessageHandlers():
if (message.command === 'sendToApi') {
    const response = await callClaudeAPI(message.prompt);
    this._panel.webview.postMessage({
        command: 'apiResponse',
        response: response
    });
}

// Helper function
async function callClaudeAPI(prompt: string): Promise<string> {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiConfig.claudeApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    
    const data = await response.json();
    return data.content[0].text;
}
```

---

## Publishing to Marketplace

When ready to share with everyone:

### 1. Create Publisher Account
Go to: https://marketplace.visualstudio.com

### 2. Create Personal Access Token (PAT)
Instructions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

### 3. Package & Publish
```bash
vsce login  # Paste your PAT
vsce publish
```

Takes 5 minutes, then visible to everyone!

---

## Getting Feedback

### Community Channels
- VS Code Extension Marketplace reviews
- GitHub Issues
- Reddit: r/vscode, r/coding
- Dev.to posts
- Twitter/X (if you like social)

### Sample Feedback Form
Include in README:
```
Help us improve! Please answer:
1. What's your main use case?
2. What feature would help most?
3. Any bugs or crashes?

→ Open an issue with [FEEDBACK] tag
```

---

## Version Management

Update version in `package.json` for each release:

```json
{
    "version": "1.0.0"  // major.minor.patch
}
```

Semantic Versioning:
- **1.0.0** → **1.0.1**: Bug fixes
- **1.0.1** → **1.1.0**: New features (backward compatible)
- **1.1.0** → **2.0.0**: Breaking changes (major rewrite)

---

## Common Mistakes to Avoid

1. **❌ Storing sensitive data in code** 
   → ✅ Use VS Code globalState (encrypted)

2. **❌ Hardcoding file paths**
   → ✅ Use `vscode.workspace.workspaceFolders`

3. **❌ Large prompts without truncation**
   → ✅ Check length, warn user if too big

4. **❌ No error handling**
   → ✅ Wrap API calls in try-catch

5. **❌ Blocking UI with long operations**
   → ✅ Use `async/await` and show progress

---

## Next-Level Features

### Spaced Repetition
Quiz users on weak spots after N days:

```typescript
function suggestReview() {
    const today = new Date();
    sessionData.weakSpots.forEach(spot => {
        const lastQuizzed = sessionData.sessionLog
            .find(log => log.message.includes(spot));
        
        if (lastQuizzed && daysAgo(lastQuizzed.timestamp) > 3) {
            vscode.window.showInformationMessage(
                `Review: ${spot}?`,
                'Quiz Me', 'Skip'
            ).then(choice => {
                if (choice === 'Quiz Me') {
                    // Auto-select Quiz prompt type
                }
            });
        }
    });
}
```

### AI Learning Path
Suggest next topics based on progress:

```typescript
function suggestNextTopic() {
    const completedTopics = new Set(
        sessionData.progressEntries.map(e => e.topic)
    );
    
    const learningPath = [
        'Basic gates',
        'Multiplexers',
        'Latches & Flip-flops',
        'FSM Design',
        'Clock Domain Crossing',
        'Power Management'
    ];
    
    const nextTopic = learningPath.find(t => !completedTopics.has(t));
    return nextTopic;
}
```

---

## Questions?

File an issue on GitHub or ask in the community!

Happy coding! 🚀
