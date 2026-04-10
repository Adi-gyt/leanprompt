(function() {
    const vscode = acquireVsCodeApi();

    let _debounceTimer  = null;
    let _chatCount      = 0;
    let _promptNumber   = 0;
    let _currentModel   = 'sonnet';
    let _lastError      = '';
    let _lastCode       = '';

    var errorPatterns = [
            /error:/i, /syntax error/i, /undefined/i, /undeclared/i,
            /fatal:/i, /exception/i, /traceback/i, /cannot find/i,
            /no such/i, /expected/i, /unexpected/i, /failed/i
    ];
        

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
            tokenEl.textContent   = '~' + msg.tokenCount + ' tokens';
            tokenEl.style.display = 'inline-block';

            var summaryBar = document.getElementById(summaryBarId);
            if (msg.summary && msg.summary !== 'N/A') {
                document.getElementById(summaryTxtId).textContent = msg.summary;
                summaryBar.classList.add('visible');
            } else {
                summaryBar.classList.remove('visible');
            }

            if (msg.truncated) { showNotification('File truncated at logical boundary', 'warning'); }
            updateTokenMeter();
        }
    });

    function populateFromSession(data) {
        if (!data) { return; }
        _chatCount    = data.chatCount    || 0;
        _promptNumber = data.promptNumber || 0;
        updateChatCounter();
    }

    // ─── Chat counter ────────────────────────────────────────────────────────

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

    // ─── Model toggle ────────────────────────────────────────────────────────

    window.cycleModel = function() {
        var badge = document.getElementById('modelBadge');
        if (_currentModel === 'sonnet') {
            _currentModel   = 'opus';
            badge.className = 'model-badge opus';
            badge.innerHTML = '<span>Opus</span><span style="font-size:9px;color:#6b21a8;">higher quality</span>';
            showNotification('Opus is slower and more expensive per message', 'warning');
        } else {
            _currentModel   = 'sonnet';
            badge.className = 'model-badge';
            badge.innerHTML = '<span>Sonnet</span><span style="font-size:9px;color:#166534;">recommended</span>';
            showNotification('Sonnet — fast and efficient', 'success');
        }
    };

    // ─── Prompt hints ────────────────────────────────────────────────────────

    var PROMPT_HINTS = {
        error:        'Won\'t compile or crashes. Paste the error message below.',
        wrongoutput:  'Runs but gives wrong result. Paste your actual vs expected output.',
        works:        'Code is working. Gets a quick confirm + one improvement tip.',
        concept:      'You explain it, AI flags gaps only. Best way to actually learn.',
        quiz:         'One question at a time. Tests your understanding.',
        continuation: 'Already mid-chat. Skips re-sending context — saves tokens.',
        handoff:      'Chat getting long? Generate a summary to paste into a fresh chat.'
    };

    window.updatePromptHint = function() {
        var type = document.querySelector('#promptType .mode-btn.active').dataset.value;
        var hintEl  = document.getElementById('promptHint');
        hintEl.textContent = PROMPT_HINTS[type] || '';

        // show browser buttons only for handoff
        var browserButtons = document.getElementById('browserButtons');
        browserButtons.style.display = (type === 'handoff') ? 'flex' : 'none';
    };

    window.selectMode = function(btn) {
        document.querySelectorAll('.mode-btn').forEach(function(b) {
            b.classList.remove('active');
        });
        btn.classList.add('active');
        window.updatePromptHint();
    };

    // ─── Code extraction ─────────────────────────────────────────────────────

    window.extractCode = function(slot) {
        vscode.postMessage({ command: 'extractCode', slot: slot });
    };

    window.clearSlot = function(slot) {
        var areaId       = slot === 1 ? 'codeArea1'       : 'codeArea2';
        var nameId       = slot === 1 ? 'file1Name'        : 'file2Name';
        var sizeId       = slot === 1 ? 'file1Size'        : 'file2Size';
        var tokenId      = slot === 1 ? 'file1Tokens'      : 'file2Tokens';
        var summaryBarId = slot === 1 ? 'file1SummaryBar'  : 'file2SummaryBar';
        var summaryTxtId = slot === 1 ? 'file1SummaryText' : 'file2SummaryText';

        document.getElementById(areaId).value        = '';
        document.getElementById(nameId).textContent  = 'No file loaded';
        document.getElementById(sizeId).textContent  = '';
        document.getElementById(tokenId).textContent = '';
        document.getElementById(tokenId).style.display = 'none';
        document.getElementById(summaryTxtId).textContent = '';
        document.getElementById(summaryBarId).classList.remove('visible');
        updateTokenMeter();
    };

    window.clearError = function() {
        document.getElementById('copilotSummary').value = '';
        document.getElementById('errorCompressed').style.display = 'none';
        document.getElementById('errorCompressed').textContent = '';
        updateTokenMeter();
    };

    window.clearThoughts = function() {
        document.getElementById('thoughtsInput').value = '';
        updateTokenMeter();
    };

    // ─── Error compression ───────────────────────────────────────────────────

    function compressErrors(raw) {
        if (!raw || raw.trim().length === 0) {
            document.getElementById('errorCompressed').style.display = 'none';
            return '';
        }
        var lines = raw.split('\n');
        var firstError = null;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            for (var j = 0; j < errorPatterns.length; j++) {
                if (errorPatterns[j].test(line)) { firstError = line; }
            }
        }    
        var box = document.getElementById('errorCompressed');
        if (firstError) {
            var compressed     = firstError.trim().substring(0, 200);
            box.textContent    = 'First error: ' + compressed;
            box.style.display  = 'block';
            return compressed;
        }
        box.style.display = 'none';
        return raw.trim().split('\n').slice(0, 3).join(' | ');
    }

    // ─── Code section builder ────────────────────────────────────────────────

    function buildCodeSection(c1, c2, fname1, fname2, summary1, summary2) {
        // if both files together are too large, trim each to 4KB
        if (c1 && c2 && (c1.length + c2.length) > 8000) {
            if (c1.length > 4000) { c1 = c1.substring(0, 4000) + '\n// ... [trimmed]'; }
            if (c2.length > 4000) { c2 = c2.substring(0, 4000) + '\n// ... [trimmed]'; }
        }
        var section = '';
        if (c1 && c1.trim()) {
            section += fname1 && fname1 !== 'No file loaded' ? 'FILE: ' + fname1 + '\n' : '';
            if (summary1 && summary1 !== 'N/A') { section += '\nSummary: ' + summary1; }
            section += '\n' + c1;
        }
        if (c2 && c2.trim()) {
            if (section) { section += '\n\n---\n\n'; }
            section += fname2 && fname2 !== 'No file loaded' ? 'FILE: ' + fname2 + '\n' : '';
            if (summary2 && summary2 !== 'N/A') { section += '\nSummary: ' + summary2; }
            section += '\n' + c2;
        }
        return section;
    }

    // ─── Token meter (live update on textarea input) ──────────────────────────

    function estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    function updateTokenMeter() {
        // estimate tokens from current inputs (not just generated prompt)
        var code1   = document.getElementById('codeArea1').value;
        var code2   = document.getElementById('codeArea2').value;
        var diag    = document.getElementById('copilotSummary').value;
        var thoughts = document.getElementById('thoughtsInput').value;
        var total = estimateTokens(code1.trim() + code2.trim() + diag.trim() + thoughts.trim());

        var meter   = document.getElementById('tokenMeterBar');
        var tip     = document.getElementById('tokenMeterTip');
        var countEl = document.getElementById('tokenMeterCount');
        var pct     = Math.min((total / 3000) * 100, 100);

        countEl.textContent = total.toLocaleString();
        meter.style.width   = pct + '%';
        meter.className     = 'token-meter-bar';
        tip.className       = 'token-meter-tip';

        var handoffTrigger = document.getElementById('handoffTrigger');
        if (total > 3000) {
            meter.classList.add('danger');
            tip.classList.add('danger');
            tip.textContent            = 'Large prompt — trim your code before sending.';
            handoffTrigger.style.display = 'block';
        } else if (total > 2000) {
            meter.classList.add('warn');
            tip.classList.add('warn');
            tip.textContent              = 'Getting long — consider removing File 2 or trimming code.';
            handoffTrigger.style.display = 'none';
        } else if (total > 1000) {
            tip.textContent              = 'Reasonable size — good to go.';
            handoffTrigger.style.display = 'none';
        } else {
            tip.textContent              = 'Compact — very efficient.';
            handoffTrigger.style.display = 'none';
        }
    }

    // attach live meter updates to all input areas
    ['codeArea1', 'codeArea2'].forEach(function(id) {
        var slot = id === 'codeArea1' ? 1 : 2;
        var tokenId = slot === 1 ? 'file1Tokens' : 'file2Tokens';
        document.getElementById(id).addEventListener('input', function() {
            var tokens = estimateTokens(this.value.trim());
            var tokenEl = document.getElementById(tokenId);
            if (this.value.trim()) {
                tokenEl.textContent   = '~' + tokens + ' tokens';
                tokenEl.style.display = 'inline-block';
            } else {
                tokenEl.style.display = 'none';
            }
        });
    });

    ['codeArea1', 'codeArea2', 'copilotSummary', 'thoughtsInput'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                clearTimeout(_debounceTimer);
                _debounceTimer = setTimeout(function() {
                    updateTokenMeter();
                    }, 200);    
            });
        }
    });

    // ─── Prompt generator ────────────────────────────────────────────────────

    window.generatePrompt = function() {
        var type = document.querySelector('#promptType .mode-btn.active').dataset.value;
        var code1    = document.getElementById('codeArea1').value;
        var code2    = document.getElementById('codeArea2').value;
        var rawDiag  = document.getElementById('copilotSummary').value.trim();
        var fname1   = document.getElementById('file1Name').textContent;
        var fname2   = document.getElementById('file2Name').textContent;
        var summary1 = document.getElementById('file1SummaryText').textContent.trim();
        var summary2 = document.getElementById('file2SummaryText').textContent.trim();
        var thoughts = document.getElementById('thoughtsInput').value.trim();
        var isFirst  = (_promptNumber === 0);
        var rawTokens = estimateTokens(
            code1.trim() +
            code2.trim() +
            rawDiag.trim() +
            thoughts.trim()
        );

        // thoughts nudge
        var nudge = document.getElementById('thoughtsNudge');
        nudge.classList.toggle('show', !thoughts);

        var diag        = compressErrors(rawDiag) || rawDiag;
        var currentCode = code1 + code2;

        // follow-up = not first prompt AND error/code is the SAME as last time
        // (meaning they're still stuck on the same problem)
        var isFollowUp = !isFirst && (
            (diag && diag === _lastError) ||
            (currentCode.trim() && currentCode === _lastCode)
        );

        var banner = document.getElementById('followupBanner');
        banner.classList.toggle('show', isFollowUp && type !== 'continuation' && type !== 'handoff');

        var codeSection = buildCodeSection(code1, code2, fname1, fname2, summary1, summary2);
        var hasCode     = codeSection.trim().length > 0;

        var modelPrefix = (_currentModel === 'opus') ? '[Model: Opus]\n\n' : '';
        var prompt      = modelPrefix;

        // ── follow-up shortcut (same error/code, debugging flow) ──
        if (isFollowUp && (type === 'error' || type === 'wrongoutput')) {
            prompt += 'Applied the fix. Still getting:\n';
            if (diag)     { prompt += diag + '\n\n'; }
            else          { prompt += 'Output still wrong.\n\n'; }
            if (thoughts) { prompt += 'My thinking: ' + thoughts + '\n\n'; }
            if (hasCode)  { prompt += 'Updated code:\n' + codeSection + '\n\n'; }
            prompt += 'What went wrong? Minimal correction only.';

        } else if (type === 'works') {
            prompt += 'My code runs correctly.\n';
            if (thoughts) { prompt += 'Context: ' + thoughts + '\n'; }
            prompt += '\nIn 2-3 sentences:\n';
            prompt += '1. Confirm it is correct and why\n';
            prompt += '2. One improvement or thing to watch out for\n';
            prompt += 'Keep it brief.';
            if (hasCode)  { prompt += '\n\n---\n' + codeSection; }

        } else if (type === 'wrongoutput') {
            prompt += 'My code runs but gives wrong output.\n';
            if (diag)     { prompt += 'What I got: ' + diag + '\n'; }
            else          { prompt += 'What I got: [paste your actual output here]\n'; }
            if (thoughts) { prompt += '\nMy thinking: ' + thoughts + '\n'; }
            prompt += '\nExplain simply:\n';
            prompt += '- What is wrong in my logic\n';
            prompt += '- Why it causes this output\n';
            prompt += '- Minimal fix only, do not rewrite\n';
            if (hasCode)  { prompt += '\n---\n' + codeSection; }

        } else if (type === 'error') {
            if (diag)     { prompt += 'Error: ' + diag + '\n'; }
            else          { prompt += 'Error: [paste your error message here]\n'; }
            if (thoughts) { prompt += '\nMy thinking: ' + thoughts + '\n'; }
            prompt += '\nExplain:\n';
            prompt += '- What this error means in plain English\n';
            prompt += '- Where in my code it is\n';
            prompt += '- Minimal fix only\n';
            prompt += 'Do not rewrite the whole file.\n';
            if (hasCode)  { prompt += '\n---\n' + codeSection; }

        } else if (type === 'concept') {
            if (thoughts) {
                prompt += 'Here is my understanding — flag gaps only, be brief:\n\n' + thoughts;
            } else {
                prompt += 'Here is my understanding — flag gaps only, be brief:\n\n[type your explanation here]';
            }
            if (hasCode)  { prompt += '\n\n---\n' + codeSection; }

        } else if (type === 'quiz') {
            if (isFirst) {
                prompt += 'Ask me ONE short question to test my understanding.\n';
                prompt += 'Wait for my answer before asking another.';
                if (hasCode) { prompt += '\n\n---\nContext:\n' + codeSection; }
            } else {
                prompt += 'Next question please.';
            }

        } else if (type === 'continuation') {
            prompt += '[CONTINUATION — context already set earlier in this chat]\n';
            if (diag)     { prompt += 'Updated output/error: ' + diag + '\n'; }
            if (thoughts) { prompt += thoughts + '\n'; }
            if (hasCode)  { prompt += '\n' + codeSection + '\n'; }
            prompt += '\nSame goal. Continue from where we left off.';

        } else if (type === 'handoff') {
            prompt += 'We are reaching the limit of this chat.\n\n';
            prompt += 'Summarize our conversation into a minimal handoff I can paste into a fresh chat.\n\n';
            prompt += 'Include:\n';
            prompt += '- What we are building or debugging\n';
            prompt += '- The current problem or error\n';
            prompt += '- What we already tried\n';
            prompt += '- What the next step is\n\n';
            prompt += 'Keep it under 200 words. Plain text only, no headers.';
        }

        _lastError = diag;
        _lastCode  = currentCode;

        if (type !== 'continuation' && type !== 'handoff') {
            _promptNumber++;
            vscode.postMessage({ command: 'update', data: { promptNumber: _promptNumber } });
        }

        // update meter with actual generated prompt size
        var promptTokens = estimateTokens(prompt);
        var meter        = document.getElementById('tokenMeterBar');
        var tip          = document.getElementById('tokenMeterTip');
        var countEl      = document.getElementById('tokenMeterCount');
        var pct          = Math.min((promptTokens / 3000) * 100, 100);
        countEl.textContent = promptTokens.toLocaleString();
        meter.style.width   = pct + '%';
        meter.className     = 'token-meter-bar';
        tip.className       = 'token-meter-tip';

        var handoffTrigger = document.getElementById('handoffTrigger');
        if (promptTokens > 3000) {
            meter.classList.add('danger');
            tip.classList.add('danger');
            tip.textContent              = 'Large prompt — trim your code before sending.';
            handoffTrigger.style.display = 'block';
        } else if (promptTokens > 2000) {
            meter.classList.add('warn');
            tip.classList.add('warn');
            tip.textContent              = 'Getting long — consider removing File 2 or trimming code.';
            handoffTrigger.style.display = 'none';
        } else if (promptTokens > 1000) {
            tip.textContent              = 'Reasonable size — good to go.';
            handoffTrigger.style.display = 'none';
        } else {
            tip.textContent              = 'Compact — very efficient.';
            handoffTrigger.style.display = 'none';
        }

        // savings indicator
        var savingsEl = document.getElementById('tokenSavings');
        if (rawTokens > 0 && promptTokens < rawTokens * 0.9) {
            var saved = Math.round((1 - promptTokens / rawTokens) * 100);
            savingsEl.textContent = '· saved ' + saved + '% vs raw input';
            savingsEl.style.display = 'inline';
        } else {
            savingsEl.style.display = 'none';
        }    

        document.getElementById('promptOutput').textContent = prompt;
        showNotification(isFirst ? 'Prompt generated' : 'Follow-up prompt generated', 'success');
    };

    // ─── Copy ────────────────────────────────────────────────────────────────

    window.copyPrompt = function() {
        var text = document.getElementById('promptOutput').textContent;
        if (!text || text.indexOf('Prompt will appear here') !== -1) {
            showNotification('Generate a prompt first', 'error');
            return;
        }
        vscode.postMessage({ command: 'copyPrompt', text: text });
        incrementChatCount();
    };

    // ─── Handoff trigger ─────────────────────────────────────────────────────

    window.triggerHandoff = function() {

        var prompt  = 'We are reaching the limit of this chat.\n\n';
        prompt += 'Summarize our conversation into a minimal handoff I can paste into a fresh chat.\n\n';
        prompt += 'Include:\n';
        prompt += '- What we are building or debugging\n';
        prompt += '- The current problem or error\n';
        prompt += '- What we already tried\n';
        prompt += '- What the next step is\n\n';
        prompt += 'Keep it under 200 words. Plain text only, no headers.';

        document.getElementById('promptOutput').textContent = prompt;

        setTimeout(function() {
            window.copyPrompt();
            _chatCount    = 0;
            _promptNumber = 0;
            updateChatCounter();
            vscode.postMessage({ command: 'update', data: { chatCount: 0, promptNumber: 0 } });
            updateTokenMeter();
        }, 100);
    };

    // ─── Open browser links ──────────────────────────────────────────────────

    window.openClaude   = function() { vscode.postMessage({ command: 'openUrl', url: 'https://claude.ai/new' }); };
    window.openChatGPT  = function() { vscode.postMessage({ command: 'openUrl', url: 'https://chat.openai.com' }); };
    window.openGemini   = function() { vscode.postMessage({ command: 'openUrl', url: 'https://gemini.google.com' }); };

    // ─── Notifications ───────────────────────────────────────────────────────

    function showNotification(message, type) {
        type = type || 'success';
        var notif     = document.getElementById('notification');
        notif.textContent = message;
        notif.className   = 'notification show ' + type;
        setTimeout(function() { notif.classList.remove('show'); }, 3000);
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    window.updatePromptHint();
    updateTokenMeter();

})();
