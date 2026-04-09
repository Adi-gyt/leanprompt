(function() {
    const vscode = acquireVsCodeApi();

    let _sessionLog      = [];
    let _progressEntries = [];
    let _debounceTimer   = null;
    let _chatCount       = 0;
    let _promptNumber    = 0;
    let _currentModel    = 'sonnet';
    let _lastError       = '';
    let _lastCode        = '';
    let _sessionInputTokens = 0;

    vscode.postMessage({ command: 'requestSessionData' });

    window.addEventListener('message', function(event) {
        var msg = event.data;
        if (msg.command === 'showNotification') {
            showNotification(msg.message, msg.type);
        } else if (msg.command === 'loadSession') {
            populateFromSession(msg.data);
        } else if (msg.command === 'codeExtracted') {
            var slot         = msg.slot || 1;
            var areaId       = slot === 1 ? 'codeArea1'        : 'codeArea2';
            var nameId       = slot === 1 ? 'file1Name'        : 'file2Name';
            var sizeId       = slot === 1 ? 'file1Size'        : 'file2Size';
            var tokenId      = slot === 1 ? 'file1Tokens'      : 'file2Tokens';
            var summaryBarId = slot === 1 ? 'file1SummaryBar'  : 'file2SummaryBar';
            var summaryTxtId = slot === 1 ? 'file1SummaryText' : 'file2SummaryText';

            document.getElementById(areaId).value       = msg.code;
            document.getElementById(nameId).textContent = msg.filename;
            document.getElementById(sizeId).textContent = msg.sizeKb + ' KB';

            var tokenEl = document.getElementById(tokenId);
            tokenEl.textContent    = '~' + msg.tokenCount + ' tokens';
            tokenEl.style.display  = 'inline-block';

            var summaryBar = document.getElementById(summaryBarId);
            if (msg.summary && msg.summary !== 'N/A') {
                document.getElementById(summaryTxtId).textContent = msg.summary;
                summaryBar.classList.add('visible');
            } else {
                summaryBar.classList.remove('visible');
            }

            if (msg.truncated) { showNotification('File truncated at logical boundary', 'warning'); }

        } else if (msg.command === 'apiStatus') {
            showApiButtons(msg.status);
        }
    });

    function populateFromSession(data) {
        if (!data) { return; }
        _sessionLog      = data.sessionLog      || [];
        _progressEntries = data.progressEntries || [];
        _chatCount       = data.chatCount       || 0;
        _promptNumber    = data.promptNumber    || 0;
        updateChatCounter();
    }

    window.toggleSection = function(header) {
        var body  = header.nextElementSibling;
        var arrow = header.querySelector('.collapse-arrow');
        body.classList.toggle('collapsed');
        arrow.classList.toggle('open');
    };

    function updateChatCounter() {
        var badge      = document.getElementById('chatCountBadge');
        var alert      = document.getElementById('freshChatAlert');
        var alertCount = document.getElementById('alertCount');
        badge.textContent = _chatCount;
        badge.className   = 'chat-counter-badge';
        if (_chatCount >= 20) {
            badge.className        = 'chat-counter-badge danger';
            alertCount.textContent = _chatCount;
            alert.classList.add('show');
        } else if (_chatCount >= 15) {
            badge.className        = 'chat-counter-badge warn';
            alertCount.textContent = _chatCount;
            alert.classList.add('show');
        } else {
            alert.classList.remove('show');
        }
    }

    function incrementChatCount() {
        _chatCount++;
        updateChatCounter();
        vscode.postMessage({ command: 'update', data: { chatCount: _chatCount } });
    }

    window.resetChatCount = function() {
        _chatCount    = 0;
        _promptNumber = 0;
        updateChatCounter();
        vscode.postMessage({ command: 'update', data: { chatCount: 0, promptNumber: 0 } });
        showNotification('Chat counter reset', 'success');
    };

    window.cycleModel = function() {
        var badge = document.getElementById('modelBadge');
        if (_currentModel === 'sonnet') {
            _currentModel     = 'opus';
            badge.className   = 'model-badge opus';
            badge.innerHTML   = '<span>Opus</span><span style="font-size:9px;color:#6b21a8;">3-5x more tokens</span>';
            showNotification('Reminder: Opus costs 3-5x more tokens than Sonnet', 'warning');
        } else {
            _currentModel   = 'sonnet';
            badge.className = 'model-badge';
            badge.innerHTML = '<span>Sonnet</span><span style="font-size:9px;color:#166534;">recommended</span>';
            showNotification('Good choice - Sonnet is efficient', 'success');
        }
    };

    var PROMPT_HINTS = {
        works:        'Code runs correctly. Gets confirmation + one improvement tip. Fewest tokens.',
        wrongoutput:  'Code runs but result is wrong. Paste your actual vs expected output above.',
        error:        'Won\'t compile or crashes. Paste the error above.',
        concept:      'You explain it, AI flags gaps only. Most efficient way to learn.',
        quiz:         'One question at a time targeting your weak spots.',
        continuation: 'Already in a chat? Skip the setup - saves ~30% tokens.',
        handoff:      'Switching to a fresh chat. Copy this, paste it first.'
    };

    window.updatePromptHint = function() {
        var type = document.getElementById('promptType').value;
        document.getElementById('promptHint').textContent = PROMPT_HINTS[type] || '';
        var browserButtons = document.getElementById('browserButtons');
        if (type === 'handoff') {
            browserButtons.style.display = 'flex';
        } else {
            browserButtons.style.display = 'none';
        }              
    };

    window.extractCode = function(slot) {
        vscode.postMessage({ command: 'extractCode', slot: slot });
    };

    function compressErrors(raw) {
        if (!raw || raw.trim().length === 0) {
            document.getElementById('errorCompressed').style.display = 'none';
            return '';
        }
        var lines = raw.split('\n');
        var errorPatterns = [
            /error:/i, /syntax error/i, /undefined/i, /undeclared/i,
            /fatal:/i, /exception/i, /traceback/i, /cannot find/i,
            /no such/i, /expected/i, /unexpected/i, /failed/i
        ];
        var firstError = null;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            for (var j = 0; j < errorPatterns.length; j++) {
                if (errorPatterns[j].test(line)) { firstError = line; break; }
            }
            if (firstError) { break; }
        }
        if (firstError) {
            var compressed = firstError.trim().substring(0, 200);
            var box = document.getElementById('errorCompressed');
            box.textContent    = 'First error: ' + compressed;
            box.style.display  = 'block';
            return compressed;
        }
        document.getElementById('errorCompressed').style.display = 'none';
        return raw.trim().split('\n').slice(0, 3).join(' | ');
    }

    function buildCodeSection(c1, c2, fname1, fname2, summary1, summary2) {
        if (c1 && c2 && (c1.length + c2.length) > 8000) {
            if (c1.length > 4000) { c1 = c1.substring(0, 4000) + '\n// ... [trimmed]'; }
            if (c2.length > 4000) { c2 = c2.substring(0, 4000) + '\n// ... [trimmed]'; }
        }
        var section = '';
        if (c1 && c1.trim()) {
            section += 'FILE: ' + fname1;
            if (summary1 && summary1 !== 'N/A') { section += '\nSummary: ' + summary1; }
            section += '\n' + c1;
        }
        if (c2 && c2.trim()) {
            if (section) { section += '\n\n---\n\n'; }
            section += 'FILE: ' + fname2;
            if (summary2 && summary2 !== 'N/A') { section += '\nSummary: ' + summary2; }
            section += '\n' + c2;
        }
        return section;
    }

    window.generatePrompt = function() {
        var type     = document.getElementById('promptType').value;
        var goal     = '(not set)';
        var phase    = 'Unspecified';
        var weak     = '';
        var code1    = document.getElementById('codeArea1').value;
        var code2    = document.getElementById('codeArea2').value;
        var rawDiag  = document.getElementById('copilotSummary').value.trim();
        var fname1   = document.getElementById('file1Name').textContent;
        var fname2   = document.getElementById('file2Name').textContent;
        var summary1 = document.getElementById('file1SummaryText').textContent.trim();
        var summary2 = document.getElementById('file2SummaryText').textContent.trim();
        var isFirst  = (_promptNumber === 0);
        var thoughts = document.getElementById('thoughtsInput').value.trim();

        var nudge = document.getElementById('thoughtsNudge');
        if (!thoughts) {    nudge.classList.add('show');
        } else {
            nudge.classList.remove('show');
        }

        var diag = compressErrors(rawDiag) || rawDiag;

        var currentCode = code1 + code2;
        var isFollowUp  = !isFirst && (
            (diag && diag !== _lastError) ||
            (currentCode.trim() && currentCode !== _lastCode)
        );

        var banner = document.getElementById('followupBanner');
        if (isFollowUp && type !== 'continuation' && type !== 'handoff') {
            banner.classList.add('show');
        } else {
            banner.classList.remove('show');
        }

        var codeSection = buildCodeSection(code1, code2, fname1, fname2, summary1, summary2);
        var hasCode     = codeSection.trim().length > 0;
        var prompt = (_currentModel === 'opus') ? '[Model: Opus — use for complex reasoning]\n\n' : '';

        if (isFollowUp && (type === 'error' || type === 'wrongoutput')) {
            prompt = 'Applied the fix. Now:\n';
            if (diag)     { prompt += diag + '\n\n'; }
            else          { prompt += 'Output still wrong.\n\n'; }
            if (thoughts) { prompt += thoughts + '\n\n'; }
            if (hasCode)  { prompt += 'Updated code:\n' + codeSection + '\n\n'; }
            prompt += 'What went wrong? Give minimal correction only.';

        } else if (type === 'works') {
            if (isFirst) {
            prompt  = 'I am a student learning ' + phase + '.\n';
            prompt += 'Goal: ' + goal + '\n';
            }
            prompt += 'My code runs correctly. In 2-3 sentences:\n';
            prompt += '1. Confirm it is correct and why\n';
            prompt += '2. One improvement or thing to watch out for\n';
            prompt += 'Keep it brief.';
            if (thoughts) { prompt += '\n' + thoughts + '\n'; }
            if (hasCode)  { prompt += '\n\n---\n' + codeSection; }

        } else if (type === 'wrongoutput') {
            if (isFirst) {
            prompt  = 'I am a student learning ' + phase + '.\n';
            prompt += 'Goal: ' + goal + '\n';
            }
            prompt += 'My code runs but gives wrong output.\n';
            if (diag) { prompt += 'What I got: ' + diag + '\n'; }
            else      { prompt += 'What I got: [paste your actual output here]\n'; }
            if (thoughts) { prompt += '\n' + thoughts + '\n'; }
            prompt += '\nExplain simply:\n';
            prompt += '- What is wrong in my logic\n';
            prompt += '- Why it causes this output\n';
            prompt += '- Minimal fix only, do not rewrite\n';
            if (hasCode) { prompt += '\n---\n' + codeSection; }

        } else if (type === 'error') {
            if (isFirst) {
            prompt  = 'I am a student learning ' + phase + '.\n';
            prompt += 'Goal: ' + goal + '\n';
            }
            if (diag) { prompt += 'Error: ' + diag + '\n'; }
            else      { prompt += 'Error: [paste your error message here]\n'; }
            if (thoughts) { prompt += '\n' + thoughts + '\n'; }
            prompt += '\nExplain:\n';
            prompt += '- What this error means in plain English\n';
            prompt += '- Where in my code it is\n';
            prompt += '- Minimal fix only\n';
            prompt += 'Do not rewrite the whole file.\n';
            if (hasCode) { prompt += '\n---\n' + codeSection; }

        } else if (type === 'concept') {
            if (isFirst) {
            prompt  = 'I am a student learning ' + phase + '.\n';
            prompt += 'Goal: ' + goal + '\n';
            }
            if (weak)     { prompt += 'I struggle with: ' + weak + '\n'; }
            if (thoughts) { prompt += '\n' + thoughts + '\n'; }
            prompt += '\nHere is my understanding - flag gaps only, be brief:\n\n';
            if (!thoughts) { prompt += '[type your explanation here]'; }

        } else if (type === 'quiz') {
            if (isFirst) {
                if (isFirst) {
                prompt  = 'I am a student learning ' + phase + '.\n';
                prompt += 'Goal: ' + goal + '\n';
                }
                if (weak) { prompt += 'I struggle with: ' + weak + '\n'; }
                prompt += '\nAsk me ONE short question to test my understanding.\n';
                prompt += 'Wait for my answer before asking another.\n';
                prompt += 'Match difficulty to my current phase.';
            } else {
                prompt = '[Quiz follow-up] Next question please.';
            }

        } else if (type === 'continuation') {
            prompt = '[CONTINUATION - context already set earlier in this chat]\n';
            if (diag)     { prompt += 'Updated output/error: ' + diag + '\n'; }
            if (thoughts) { prompt += thoughts + '\n'; }
            if (hasCode)  { prompt += '\n' + codeSection + '\n'; }
            prompt += '\nSame goal. Continue from where we left off.';

        } else if (type === 'handoff') {
            prompt  = 'We are reaching the token limit of this chat.\n\n';
            prompt += 'Please summarize our conversation into a minimal handoff prompt I can paste into a fresh chat.\n\n';
            prompt += 'Include:\n';
            prompt += '- What we are building or debugging\n';
            prompt += '- The current problem or error\n';
            prompt += '- What we already tried\n';
            prompt += '- What the next step is\n\n';
            prompt += 'Keep it under 200 words. Plain text only, no headers.';
            _chatCount = 0;
            _promptNumber = 0;
            updateChatCounter();
            vscode.postMessage({ command: 'update', data: { chatCount: 0, promptNumber: 0 } });
        }

        _lastError = diag;
        _lastCode  = currentCode;

        if (type !== 'continuation' && type !== 'handoff') {
            _promptNumber++;
            vscode.postMessage({ command: 'update', data: { promptNumber: _promptNumber } });
        }
        
        var promptTokens = Math.ceil(prompt.length / 4);
        _sessionInputTokens += promptTokens;    

        var meter    = document.getElementById('tokenMeterBar');
        var tip      = document.getElementById('tokenMeterTip');
        var countEl  = document.getElementById('tokenMeterCount');
        var pct      = Math.min((promptTokens / 3000) * 100, 100);
        countEl.textContent  = promptTokens.toLocaleString();
        meter.style.width    = pct + '%';
        meter.className      = 'token-meter-bar';
        tip.className        = 'token-meter-tip';
        if (promptTokens > 3000) {
            meter.classList.add('danger');
            tip.classList.add('danger');
            tip.textContent = 'Large prompt — trim your code before sending.';
            document.getElementById('handoffTrigger').style.display = 'block';
        } else if (promptTokens > 2000) {
            meter.classList.add('warn');
            tip.classList.add('warn');
            tip.textContent = 'Getting long — consider removing File 2 or trimming code.';
            document.getElementById('handoffTrigger').style.display = 'none';
        } else if (promptTokens > 1000) {
            tip.textContent = 'Reasonable size — good to go.';
        } else {
            tip.textContent = 'Compact prompt — very efficient.';
            document.getElementById('handoffTrigger').style.display = 'none';
        }
        document.getElementById('promptOutput').textContent = prompt;
        showNotification(isFirst ? 'Prompt generated' : 'Follow-up prompt generated', 'success');
    };

    window.copyPrompt = function() {
        var text = document.getElementById('promptOutput').textContent;
        if (!text || text.indexOf('Prompt will appear here') !== -1) {
            showNotification('Generate a prompt first', 'error');
            return;
        }
        vscode.postMessage({ command: 'copyPrompt', text: text });
        incrementChatCount();
    };

    window.checkApiStatus = function() {
        var text = document.getElementById('promptOutput').textContent;
        if (!text || text.indexOf('Prompt will appear here') !== -1) {
            showNotification('Generate a prompt first', 'error');
            return;
        }
        vscode.postMessage({ command: 'getApiStatus' });
    };

    function showApiButtons(status) {
        var container = document.getElementById('apiProviderButtons');
        container.innerHTML = '';
        var providers = [{ id: 'clipboard', label: 'Copy to Clipboard', primary: false }];
        if (status.hasClaudeKey)  { providers.push({ id: 'claude',   label: 'Send to Claude',  primary: true }); }
        if (status.hasChatGptKey) { providers.push({ id: 'chatgpt',  label: 'Send to ChatGPT', primary: true }); }
        providers.forEach(function(p) {
            var btn = document.createElement('button');
            btn.textContent = p.label;
            if (p.primary) { btn.className = 'primary'; }
            btn.addEventListener('click', function() { sendToProvider(p.id); });
            container.appendChild(btn);
        });
        container.style.display = 'flex';
    }

    function sendToProvider(provider) {
        var prompt = document.getElementById('promptOutput').textContent;
        vscode.postMessage({ command: 'sendToApi', prompt: prompt, provider: provider });
        incrementChatCount();
    }

    function showNotification(message, type) {
        type = type || 'success';
        var notif = document.getElementById('notification');
        notif.textContent = message;
        notif.className   = 'notification show ' + type;
        setTimeout(function() { notif.classList.remove('show'); }, 3000);
    }

    window.updatePromptHint();

    function generateHandoffPrompt() {
        var prompt  = 'We are reaching the token limit of this chat.\n\n';
        prompt += 'Please summarize our conversation into a minimal handoff prompt I can paste into a fresh chat.\n\n';
        prompt += 'Include:\n';
        prompt += '- What we are building or debugging\n';
        prompt += '- The current problem or error\n';
        prompt += '- What we already tried\n';
        prompt += '- What the next step is\n\n';
        prompt += 'Keep it under 200 words. Plain text only, no headers.';
        document.getElementById('promptOutput').textContent = prompt;
        showNotification('Handoff prompt generated — copy and paste in your current chat', 'success');
        _chatCount = 0;
        _promptNumber = 0;
        updateChatCounter();
        vscode.postMessage({ command: 'update', data: { chatCount: 0, promptNumber: 0 } });
    }

    window.triggerHandoff = function() {
        generatePrompt();
        var text = document.getElementById('promptOutput').textContent;
        vscode.postMessage({ command: 'copyPrompt', text: text });
    };

    window.openClaude = function() {
        vscode.postMessage({ command: 'openUrl', url: 'https://claude.ai/new' });
    };
    
    window.openChatGPT = function() {
        vscode.postMessage({ command: 'openUrl', url: 'https://chat.openai.com' });
    };

    window.openGemini = function() {
        vscode.postMessage({ command: 'openUrl', url: 'https://gemini.google.com' });
    }

})();
