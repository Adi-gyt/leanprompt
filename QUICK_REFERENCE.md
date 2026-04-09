# ⚡ Study Bridge Quick Reference

## Keyboard Shortcuts

| Shortcut | What It Does |
|----------|-------------|
| `Ctrl+Shift+K` (Mac: `Cmd+Shift+K`) | Open Dashboard |
| `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) | Configure API Keys |

---

## Dashboard Sections

### 📋 Session
Set your study goal, deadline, current topic, study phase, and weak spots.
- **Auto-saves** 1 second after you stop typing
- **Export** → Save as JSON backup
- **Clear** → Start fresh

### 📂 Code
Load code files from VS Code to include in prompts.
- **Load File 1/2** → Copy current active file
- **Size warning** → Shows if file >100KB
- **Copilot Summary** → Paste error messages

### ⚡ Prompt Generator
Create compressed prompts for Claude/ChatGPT.

**5 Prompt Types:**
1. **Code Verify** — Check RTL syntax + synthesizability
   - Use when: Getting Copilot errors
   - Output: "Errors flagged, fix suggestions"

2. **Concept Check** — Verify your understanding
   - Use when: Learning new topic
   - Output: "Correct/gaps pointed out"

3. **Debug** — Find root cause
   - Use when: Code not working
   - Output: "Root cause + minimal fix"

4. **Quiz Me** — Test your knowledge
   - Use when: Weak on a topic
   - Output: "One question at a time"

5. **Session Handoff** — Carry context to next chat
   - Use when: Switching to new Claude chat
   - Output: "Copy → Paste at start of new chat"

### 📝 Notes
Log things you learned or struggled with.
- **Auto-saves** each note
- **Timestamps** automatically added
- **Last 10** shown (older ones preserved)

### 📊 Progress
Track hours + topics per study session.
- **Hours** — How long you studied (0.5, 1, 2.5, etc.)
- **Topic** — What you covered
- **Stats** — Shows total hours & session count

### ⚙️ Settings
Configure API keys (optional).
- **Claude API** → Optional for direct integration
- **ChatGPT API** → Optional for GPT-4o access
- **Default** → Use clipboard (always free)

---

## Workflow Examples

### Example 1: Quick Bug Fix (5 min)
```
1. Open buggy code in VS Code
2. Press Ctrl+Shift+K
3. Load File 1 (click button)
4. Select "Debug" prompt
5. Click "Generate"
6. Click "Copy"
7. Paste into Claude → Get fix
```

### Example 2: Learning New Topic (30 min)
```
1. Press Ctrl+Shift+K
2. Set Goal + Deadline
3. Type Topic: "FSM Design"
4. Add Weak Spots: "Reset logic"
5. Select "Concept Check"
6. Generate + Copy
7. Explain in Claude
8. Log session: 0.5h - FSM basics
```

### Example 3: Quiz Prep (15 min)
```
1. Press Ctrl+Shift+K
2. Set Topic & Phase
3. Add your weak spots
4. Select "Quiz Me"
5. Generate + Copy
6. Paste into Claude
7. Answer questions
8. Get feedback
9. Log progress: 0.25h - Quiz review
```

---

## Tips

### 💰 Save Tokens
- **Weak spots** → Auto-populate prompts (no need to re-explain)
- **Phase info** → Context about difficulty level
- **Code truncation** → Only first 2000 chars per file
- **Session handoff** → Reuse context, don't re-explain

### ⏱️ Time Management
- Log **every session**, even 15-minute ones
- Weak spots → Focus revision time
- Progress stats → See which topics take longest

### 🎯 Effective Learning
- **Phase 1** → Learn basics first, then move to Phase 2
- **Phase 2** → Target weak spots, ask quiz questions
- **Phase 3** → Advanced optimization, edge cases
- Don't skip phases!

### 📱 Works Best With
- **Claude.ai** → Free access (copy-paste)
- **ChatGPT** → Free in India with ChatGPT GO
- **API keys** → Optional, for faster integration

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Code not loading | Open file first, then click Load |
| Dashboard doesn't appear | Press Ctrl+Shift+K again |
| Session not saved | Workspace folder must be open |
| Prompt looks empty | Click "Generate" first |
| File too large warning | Truncate code manually or continue (takes more tokens) |
| API key rejected | Check you pasted whole key, no spaces |

---

## What Gets Saved?

✅ Saved locally (in `.study-bridge/session.json`):
- Goal, deadline, phase, weak spots
- Session log (notes)
- Progress entries (hours + topics)

❌ NOT saved:
- Code you paste (only while dashboard open)
- Prompts (re-generate as needed)

---

## Privacy & Security

🔒 **Your data stays on your computer:**
- No cloud sync (unless you export)
- API keys encrypted by VS Code
- No tracking or telemetry
- Export anytime for backup

---

## Need Help?

1. **Check README** → Full documentation
2. **Check SETUP.md** → Installation help
3. **GitHub Issues** → Report bugs
4. **Try again** → Many issues solve themselves 😅

---

## Study Plans by Goal

### 🎯 Goal: Learn Verilog (RTL)
```
Week 1:  Phase 1 — Gates, MUX, basic combinatorial
Week 2:  Phase 1 — Latches, flip-flops, sequential
Week 3:  Phase 2 — FSM, state machines, weak spots
Week 4:  Phase 2 — Reset logic, clock gating, quiz heavy
Week 5:  Phase 3 — CDC, metastability, advanced
Week 6:  Phase 3 — Optimize, interview prep
```
**Weak Spots to Watch:** Reset logic, latch inference, CDC

### 🎯 Goal: Data Structures & Algorithms
```
Week 1:  Phase 1 — Arrays, linked lists, basics
Week 2:  Phase 1 — Stacks, queues, trees
Week 3:  Phase 2 — Tree traversals, sorting, weak spots
Week 4:  Phase 2 — Graph algorithms, dynamic programming
Week 5:  Phase 3 — Optimization, system design
Week 6:  Phase 3 — Interview problems
```
**Weak Spots to Watch:** DP, graph algorithms, complexity analysis

---

## Keyboard Shortcuts (All OSes)

| Action | Shortcut |
|--------|----------|
| Open Dashboard | `Ctrl+Shift+K` / `Cmd+Shift+K` |
| Configure API | `Ctrl+Shift+A` / `Cmd+Shift+A` |
| Focus search | `Ctrl+F` (in dashboard) |

---

**Pro Tip:** Pin this reference somewhere you can see it while studying! 📌

---

**Last Updated:** April 2026
**Study Bridge v1.0**
