# 🚀 Setup Guide for Study Bridge (Beginner)

Follow these steps carefully. This guide assumes you have VS Code installed.

---

## Step 1: Install Node.js

**What is Node.js?** It's a tool that lets you run JavaScript outside the browser. You need it to build the extension.

1. Go to https://nodejs.org
2. Download the **LTS** (Long Term Support) version
3. Run the installer and follow the steps
4. Open Terminal/PowerShell and verify:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers (e.g., `v18.17.0`)

---

## Step 2: Get the Code

Choose one:

### Option A: Clone from GitHub (if you uploaded it)
```bash
git clone https://github.com/yourusername/study-bridge
cd study-bridge
```

### Option B: Create folder manually
1. Create a folder: `C:\Users\YourName\study-bridge` (Windows) or `~/study-bridge` (Mac/Linux)
2. Copy all the files we created (`extension.ts`, `package.json`, etc.) into this folder

---

## Step 3: Install Dependencies

Open Terminal in the study-bridge folder and run:

```bash
npm install
```

This downloads all required libraries (~200MB). Wait for it to finish.

---

## Step 4: Compile TypeScript

TypeScript is a stricter version of JavaScript. We need to compile it:

```bash
npm run compile
```

You should see:
```
(no output = success!)
```

If you get errors, check:
- All files are in the right place
- You ran `npm install` first

---

## Step 5: Run the Extension

### In VS Code
1. Open the `study-bridge` folder in VS Code (`File → Open Folder`)
2. Press **F5** (or `Fn+F5` on Mac)
3. A new VS Code window opens → that's your test environment
4. Press **`Ctrl+Shift+K`** (Cmd+Shift+K on Mac)
5. 🎉 Dashboard should appear!

### Troubleshooting F5
If F5 doesn't work:
1. Click `Run → Start Debugging` (menu)
2. Select `Node.js` if prompted

---

## Step 6: Test the Extension

In the test VS Code window:

1. **Test Session Saving:**
   - Type a goal: "Learn Verilog"
   - Click Save
   - Close the dashboard
   - Press `Ctrl+Shift+K` again
   - ✅ Goal should still be there

2. **Test Code Loading:**
   - Create a test file: `test.v` with some Verilog code
   - In dashboard, click "Load File 1"
   - ✅ Code should appear

3. **Test Prompt Generation:**
   - Fill in topic, weak spots
   - Click "Generate Prompt"
   - ✅ Prompt should appear

4. **Test Notes:**
   - Type "Learned FSM basics"
   - Click "Add Note"
   - ✅ Note should appear

---

## Step 7: Package for Distribution

When ready to share:

```bash
npm install -g @vscode/vsce
vsce package
```

This creates `study-bridge-1.0.0.vsix` file (the extension installer).

Share this file, and others can:
1. Go to Extensions in VS Code
2. Click `...` → "Install from VSIX"
3. Select the .vsix file
4. Done!

---

## Step 8: Make Changes

Every time you edit `src/extension.ts`:

1. Run: `npm run compile`
2. In test VS Code: Press **`Ctrl+Shift+F5`** to reload
3. Changes take effect instantly

---

## Common Issues & Fixes

### "Command not found: npm"
- Node.js not installed correctly
- Restart terminal/computer
- Reinstall Node.js

### "npm ERR! 404 Not Found"
- Internet issue
- Try: `npm install` again
- Check internet connection

### "Extension not loading in F5"
- Close both VS Code windows
- Delete `out/` folder
- Run: `npm run compile`
- Press F5 again

### "Dashboard doesn't appear"
- Check browser console (press F12 in test window)
- Look for red errors
- Share screenshot in GitHub issue

---

## Development Workflow

```
You edit extension.ts
↓
npm run compile
↓
Ctrl+Shift+F5 (reload in test window)
↓
Test your changes
↓
Repeat!
```

---

## Next Steps

1. **Test more features** — Go through the README examples
2. **Customize** — Change colors, add new prompt types, etc.
3. **Share** — Package and ask friends to test
4. **Get feedback** — Improve based on what people say

---

## Need Help?

If you get stuck:

1. Check the error message carefully
2. Google it (copy the error text)
3. Ask on VS Code Marketplace forums
4. Post GitHub issue with:
   - What you were trying to do
   - What happened
   - Terminal output (copy-paste)

---

## Useful Resources

- [VS Code Extension Docs](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [NPM Beginner Guide](https://docs.npmjs.com/cli/v8/using-npm-as-a-beginner)

---

Happy developing! You've got this! 🚀
