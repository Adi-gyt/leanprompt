# LeanPrompt

**Write better AI prompts. Stop burning tokens.**

A VS Code extension that helps you structure your prompts intelligently — so you get better answers from Claude, ChatGPT, and Gemini without wasting your free session limits.

> Built in 2 days using prompt engineering. No prior web dev experience needed to use it.

---

## Why LeanPrompt?

If you use Claude or ChatGPT to help you code, you've probably hit these problems:

- 🔴 **Token limit hit mid-session** — context lost, have to start over
- 🔴 **Vague prompts get vague answers** — "fix my code" doesn't work
- 🔴 **Pasting too much code** — wastes tokens, confuses the AI
- 🔴 **No way to hand off context** — switching chats loses everything

LeanPrompt solves all of this from inside VS Code.

---

## Features

### 🎯 Guided Prompt Builder
Step-by-step flow that structures your prompt automatically:
- What do you need? (debug, review, learn, quiz, continue)
- Your code — extracted directly from your active editor
- Your error or wrong output
- Your hypothesis — makes AI responses dramatically better

### ⚡ Smart Code Extraction
- Pull code directly from your active VS Code editor — one click
- Supports 2 files simultaneously
- Auto-truncates large files at logical boundaries (not mid-function)
- Shows token estimate per file before you send

### 📊 Token Meter
- Real-time token count as you build your prompt
- Color-coded: green → yellow → red
- Warns before you hit limits
- Suggests trimming strategies

### 🔄 Session Handoff
- Detects when your chat is getting long
- Generates a handoff prompt to paste into a fresh chat
- Preserves context without re-explaining everything

### 🤖 Model Awareness
- Toggle between Sonnet (efficient) and Opus (powerful)
- Reminds you Opus costs 3-5x more tokens
- Chat counter tracks how many messages you've sent

### 📋 One-Click Copy
- Generated prompt copies to clipboard instantly
- Open Claude, ChatGPT, or Gemini directly from the panel
- No API key needed — works with free accounts

---

## Installation

### From VS Code Marketplace
*(Coming soon)*

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search `LeanPrompt`
4. Click Install

### Manual Install (now)
```bash
git clone https://github.com/yourusername/leanprompt
cd leanprompt
npm install
npm run compile
npx vsce package
```
Then in VS Code: Extensions → `...` → Install from VSIX → select the `.vsix` file

---

## How to Use

**1. Open LeanPrompt**
`Ctrl+Shift+K` (or `Cmd+Shift+K` on Mac)

**2. Pick what you need**
- Debug — I have an error
- Debug — Wrong output
- Review — Code works, want feedback
- Learn — Explain a concept
- Learn — Quiz me
- Continue — Already in a chat

**3. Extract your code**
Click **Extract from Editor** — pulls your active file automatically

**4. Add your error or output**
Paste the error message or wrong result

**5. Add your hypothesis** *(optional but powerful)*
What do you think is happening? This alone improves AI responses significantly.

**6. Generate → Copy → Paste**
Hit **Generate Prompt**, copy it, paste into Claude or ChatGPT.

---

## Screenshots

*Coming soon — see demo reel*

---

## Who Is This For?

- Students learning to code with AI assistance
- Developers who hit Claude's free token limits regularly
- Anyone who wants more structured, efficient AI prompts
- ECE / embedded / RTL learners using AI for Verilog, VHDL, SystemVerilog

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` | Open LeanPrompt |
| `Ctrl+Shift+A` | Configure API Keys |

---

## Privacy

- Everything runs locally in VS Code
- No data sent anywhere (unless you use an API key)
- API keys stored securely by VS Code — never in plain text
- No telemetry, no tracking

---

## Roadmap

- [ ] Publish to VS Code Marketplace
- [ ] Claude API direct integration (send and receive in sidebar)
- [ ] ChatGPT API integration
- [ ] Token usage history
- [ ] Custom prompt templates
- [ ] VHDL / SystemVerilog specific prompt modes

---

## Built With

- TypeScript + VS Code Extension API
- Vanilla JS / HTML / CSS (webview)
- Built using prompt engineering — AI-assisted development

---

## License

MIT — free to use, modify, and distribute.

---

## About

LeanPrompt started as a personal tool to stop wasting Claude tokens while learning RTL and FPGA design. It turned into something anyone can use.

**Made by an ECE student, for anyone who codes with AI.**
