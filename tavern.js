// ==========================================
// 酒馆模式 (Tavern Mode) 专属逻辑
// ==========================================

// 拦截 openTavernMode，改为打开 Lobby
const originalOpenTavernMode = window.openTavernMode;
window.openTavernMode = function() {
    if (!currentChatRoomCharId) return alert('请先选择一个角色');
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return alert('请先登录');

    // 隐藏微信面板
    document.getElementById('wechatPanel').style.display = 'none';
    // 显示 Lobby 面板
    document.getElementById('tavernLobbyPanel').style.display = 'flex';

    tavRenderLobby();
};

function closeTavernLobby() {
    document.getElementById('tavernLobbyPanel').style.display = 'none';
    document.getElementById('wechatPanel').style.display = 'flex';
}

function tavRenderLobby() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    
    // 渲染当前聊天记录卡片
    let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    const previewEl = document.getElementById('tavCurrentChatPreview');
    const timeEl = document.getElementById('tavCurrentChatTime');
    if (history.length > 0) {
        const lastMsg = history[history.length - 1];
        previewEl.innerText = lastMsg.content.replace(/<[^>]+>/g, '');
        const date = new Date(lastMsg.timestamp);
        timeEl.innerText = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    } else {
        previewEl.innerText = '暂无内容，点击开始聊天...';
        timeEl.innerText = '';
    }

    // 渲染线下记忆总结列表
    const listEl = document.getElementById('tavOfflineMemoriesList');
    listEl.innerHTML = '';
    let memories = JSON.parse(ChatDB.getItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    
    if (memories.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#aaa; font-size:12px; padding:20px;">暂无记忆总结</div>';
        return;
    }

    memories.slice().reverse().forEach(mem => {
        const card = document.createElement('div');
        card.style.cssText = 'background: #fff; border-radius: 12px; padding: 15px; border: 1px solid #eee; display: flex; flex-direction: column; gap: 10px;';
        
        card.innerHTML = `
            <div style="font-size: 13px; color: #333; line-height: 1.5; word-break: break-all;">${mem.content}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #eee; padding-top: 10px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 12px; font-weight: bold; color: #111;">同步至线上</span>
                    <label class="ios-switch" style="transform: scale(0.7); margin: 0; transform-origin: left center;">
                        <input type="checkbox" ${mem.syncOnline ? 'checked' : ''} onchange="tavToggleMemorySync('${mem.id}', this)">
                        <span class="slider"></span>
                    </label>
                </div>
                <div style="display: flex; gap: 12px;">
                    <span style="font-size: 12px; color: #007aff; cursor: pointer; font-weight: bold;" onclick="tavEditOfflineMemory('${mem.id}')">Edit</span>
                    <span style="font-size: 12px; color: #ff3b30; cursor: pointer; font-weight: bold;" onclick="tavDeleteOfflineMemory('${mem.id}')">Delete</span>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function tavOpenSummaryModal() {
    document.getElementById('tavSummaryModalOverlay').classList.add('show');
}

async function tavExecuteSummary(type) {
    document.getElementById('tavSummaryModalOverlay').classList.remove('show');
    const currentLoginId = ChatDB.getItem('current_login_account');
    
    let summaryText = '';

    if (type === 'vector') {
        const memories = JSON.parse(ChatDB.getItem(`tav_memory_${currentChatRoomCharId}`) || '[]');
        if (memories.length === 0) return alert('向量记忆库为空！');
        summaryText = memories[memories.length - 1].text;
    } else if (type === 'ai') {
        const apiConfig = JSON.parse(ChatDB.getItem('tav_api_config') || '{}');
        const url = apiConfig.url || localStorage.getItem('apiUrl');
        const key = apiConfig.key || localStorage.getItem('apiKey');
        const model = apiConfig.model || localStorage.getItem('apiModel') || 'gpt-4-turbo';

        if (!url || !key) return alert('请先配置 API！');

        let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        if (history.length === 0) return alert('暂无聊天记录可总结！');

        const recentHistory = history.slice(-30).map(m => `${m.sender === 'me' ? 'User' : 'Char'}: ${m.content}`).join('\n');
        const prompt = `请总结以下聊天记录的核心事件和重要信息，使用第三人称陈述句，尽量简短精炼：\n\n${recentHistory}`;

        tavSetLoadingState(true);
        try {
            const response = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], temperature: 0.5 })
            });
            if (!response.ok) throw new Error('API 请求失败');
            const data = await response.json();
            summaryText = data.choices[0].message.content.trim();
        } catch (e) {
            tavSetLoadingState(false);
            return alert('总结失败: ' + e.message);
        }
        tavSetLoadingState(false);
    }

    if (summaryText) {
        let memories = JSON.parse(ChatDB.getItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        memories.push({
            id: Date.now().toString(),
            content: summaryText,
            syncOnline: false
        });
        ChatDB.setItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(memories));
        alert('记忆总结已生成并保存至大厅！');
    }
}

function tavToggleMemorySync(id, el) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    let memories = JSON.parse(ChatDB.getItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    const mem = memories.find(m => m.id === id);
    if (mem) {
        mem.syncOnline = el.checked;
        ChatDB.setItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(memories));
    }
}

function tavEditOfflineMemory(id) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    let memories = JSON.parse(ChatDB.getItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    const mem = memories.find(m => m.id === id);
    if (!mem) return;

    const modal = document.getElementById('tavEditContentModalOverlay');
    document.getElementById('tavEditContentTitle').innerText = '编辑记忆总结';
    const textarea = document.getElementById('tavEditContentTextarea');
    textarea.value = mem.content;

    const saveBtn = document.getElementById('tavEditContentSaveBtn');
    saveBtn.onclick = () => {
        mem.content = textarea.value;
        ChatDB.setItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(memories));
        modal.classList.remove('show');
        tavRenderLobby();
    };
    modal.classList.add('show');
}

function tavDeleteOfflineMemory(id) {
    if (confirm('确定删除这条记忆总结吗？')) {
        const currentLoginId = ChatDB.getItem('current_login_account');
        let memories = JSON.parse(ChatDB.getItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        memories = memories.filter(m => m.id !== id);
        ChatDB.setItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(memories));
        tavRenderLobby();
    }
}

function tavEnterChat() {
    document.getElementById('tavernLobbyPanel').style.display = 'none';
    document.getElementById('tavernModePanel').style.display = 'flex';
    
    const currentLoginId = ChatDB.getItem('current_login_account');
    
    // 同步当前聊天角色的头像和名字，并注入开场白和预设
    if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId) {
        let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
        const char = allEntities.find(c => c.id === currentChatRoomCharId);
        if (char) {
            document.getElementById('tavHeaderAvatar').style.backgroundImage = `url('${char.avatarUrl || ''}')`;
            document.getElementById('tavHeaderName').innerText = char.netName || char.name || '未命名';
            
            // 注入开场白
            let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
            if (history.length === 0 && char.firstMessage) {
                history.push({
                    id: Date.now().toString(),
                    sender: 'char',
                    content: char.firstMessage,
                    timestamp: new Date().toISOString()
                });
                ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
            }
            
            // 注入角色自带的预设 (如果有)
            if (char.systemPrompt) {
                const sysEl = document.getElementById('tavSystemPrompt');
                if (sysEl && !sysEl.value) sysEl.value = char.systemPrompt;
            }
            if (char.postHistoryInstructions) {
                const jailEl = document.getElementById('tavJailbreakPrompt');
                if (jailEl && !jailEl.value) jailEl.value = char.postHistoryInstructions;
            }
            if (char.creatorNotes) {
                const noteEl = document.getElementById('tavNotePrompt');
                if (noteEl && !noteEl.value) noteEl.value = char.creatorNotes;
            }
        }
    }

    tavRenderChat();
    renderTavRegexList();
    
    let statusBars = JSON.parse(ChatDB.getItem('tav_status_bars') || '[]');
    const hasFloating = statusBars.some(sb => sb.active && sb.pos === 'floating');
    document.getElementById('tav-floating-ball-container').style.display = hasFloating ? 'flex' : 'none';
}

function closeTavernMode() {
    document.getElementById('tavernModePanel').style.display = 'none';
    document.getElementById('tavernLobbyPanel').style.display = 'flex';
    tavRenderLobby(); // 退出时刷新大厅
}

// 存档逻辑
function tavOpenSaveMenu() {
    document.getElementById('tavSaveMenuModalOverlay').classList.add('show');
}

function tavSaveAndNew() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    
    if (history.length === 0) {
        alert('当前没有聊天记录，无需保存。');
        return;
    }

    const title = prompt('请输入存档名称：', `存档 ${new Date().toLocaleString()}`);
    if (title !== null) {
        let saves = JSON.parse(ChatDB.getItem(`tav_chat_saves_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        saves.push({
            id: Date.now().toString(),
            title: title || '未命名存档',
            timestamp: Date.now(),
            history: history
        });
        ChatDB.setItem(`tav_chat_saves_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(saves));
        
        // 清空当前
        ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, '[]');
        tavRenderChat();
        document.getElementById('tavSaveMenuModalOverlay').classList.remove('show');
        alert('保存成功，已开启新对话！');
    }
}

function tavDirectNew() {
    if (confirm('确定直接开启新对话吗？当前的聊天记录将会丢失！')) {
        const currentLoginId = ChatDB.getItem('current_login_account');
        ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, '[]');
        tavRenderChat();
        document.getElementById('tavSaveMenuModalOverlay').classList.remove('show');
    }
}

function tavOpenSavesListPanel() {
    document.getElementById('tavSaveMenuModalOverlay').classList.remove('show');
    const listEl = document.getElementById('tavModalSavesList');
    listEl.innerHTML = '';
    
    const currentLoginId = ChatDB.getItem('current_login_account');
    let saves = JSON.parse(ChatDB.getItem(`tav_chat_saves_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    
    if (saves.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#aaa; font-size:12px; padding:20px;">暂无历史存档</div>';
    } else {
        saves.slice().reverse().forEach(save => {
            const date = new Date(save.timestamp);
            const timeStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
            
            const card = document.createElement('div');
            card.style.cssText = 'background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #eee; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 16px; font-weight: bold; color: #111;">${save.title || '未命名存档'}</span>
                    <span style="font-size: 12px; color: #888;">${timeStr}</span>
                </div>
                <div style="font-size: 13px; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 5px;">
                    ${save.history.length > 0 ? save.history[save.history.length-1].content.replace(/<[^>]+>/g, '') : '空'}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 15px; border-top: 1px dashed #eee; padding-top: 12px;">
                    <span style="font-size: 14px; color: #007aff; cursor: pointer; font-weight: bold;" onclick="tavLoadSave('${save.id}')">读取</span>
                    <span style="font-size: 14px; color: #ff3b30; cursor: pointer; font-weight: bold;" onclick="tavDeleteSave('${save.id}')">删除</span>
                </div>
            `;
            listEl.appendChild(card);
        });
    }
    document.getElementById('tavSavesListPanel').style.display = 'flex';
}

function closeTavSavesListPanel() {
    document.getElementById('tavSavesListPanel').style.display = 'none';
}

function tavLoadSave(saveId) {
    if (confirm('读取存档将覆盖当前的聊天记录，是否继续？')) {
        const currentLoginId = ChatDB.getItem('current_login_account');
        let saves = JSON.parse(ChatDB.getItem(`tav_chat_saves_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        const save = saves.find(s => s.id === saveId);
        if (save) {
            ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(save.history));
            
            // 如果在 Lobby 界面，直接进入聊天
            if (document.getElementById('tavernLobbyPanel').style.display === 'flex') {
                tavEnterChat();
            } else {
                tavRenderChat();
            }
            closeTavSavesListPanel();
            alert('存档读取成功！');
        }
    }
}

function tavDeleteSave(saveId) {
    if (confirm('确定删除此存档吗？')) {
        const currentLoginId = ChatDB.getItem('current_login_account');
        let saves = JSON.parse(ChatDB.getItem(`tav_chat_saves_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        saves = saves.filter(s => s.id !== saveId);
        ChatDB.setItem(`tav_chat_saves_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(saves));
        tavOpenSavesListPanel(); // 刷新列表
        if (document.getElementById('tavernLobbyPanel').style.display === 'flex') {
            tavRenderLobby(); // 刷新大厅
        }
    }
}

// 控制右侧设置抽屉的滑入滑出
function tavToggleSettings() {
    const sidebar = document.getElementById('tavSidebarRight');
    sidebar.classList.toggle('show');
    if (sidebar.classList.contains('show')) {
        const historyLen = ChatDB.getItem('tav_chat_history_length') || '20';
        const lenInput = document.getElementById('tavChatHistoryLength');
        if (lenInput) lenInput.value = historyLen;

        const onlineLen = ChatDB.getItem('tav_online_chat_history_length') || '10';
        const onlineLenInput = document.getElementById('tavOnlineChatHistoryLength');
        if (onlineLenInput) onlineLenInput.value = onlineLen;

        tavUpdateContextTokens();
    }
}

function tavSaveChatHistoryLength() {
    const val = document.getElementById('tavChatHistoryLength').value;
    ChatDB.setItem('tav_chat_history_length', val);
    tavUpdateContextTokens();
}

function tavSaveOnlineChatHistoryLength() {
    const val = document.getElementById('tavOnlineChatHistoryLength').value;
    ChatDB.setItem('tav_online_chat_history_length', val);
    tavUpdateContextTokens();
}

function tavUpdateContextTokens() {
    let totalLength = 0;
    
    // 1. 计算提示词长度 (检查开关是否开启)
    const sysToggle = document.getElementById('tavSystemPrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (sysToggle && sysToggle.classList.contains('active')) {
        totalLength += (document.getElementById('tavSystemPrompt')?.value || '').length;
    }
    
    const jailToggle = document.getElementById('tavJailbreakPrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (jailToggle && jailToggle.classList.contains('active')) {
        totalLength += (document.getElementById('tavJailbreakPrompt')?.value || '').length;
    }
    
    const styleToggle = document.getElementById('tavStylePrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (styleToggle && styleToggle.classList.contains('active')) {
        totalLength += (document.getElementById('tavStylePrompt')?.value || '').length;
    }
    
    const noteToggle = document.getElementById('tavNotePrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (noteToggle && noteToggle.classList.contains('active')) {
        totalLength += (document.getElementById('tavNotePrompt')?.value || '').length;
    }

    // 2. 计算世界书长度
    const savedWb = JSON.parse(ChatDB.getItem('tav_worldbook_bind') || '[]');
    const wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
    savedWb.forEach(id => {
        const entry = wbData.entries.find(e => e.id === id);
        if (entry && entry.content) totalLength += entry.content.length;
    });

    // 3. 计算聊天记录与记忆库长度
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId && currentLoginId) {
        // 酒馆线下聊天记录
        const historyLen = parseInt(ChatDB.getItem('tav_chat_history_length') || '20');
        let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        const recentHistory = history.slice(-historyLen);
        recentHistory.forEach(msg => {
            if (msg.content) totalLength += msg.content.length;
        });

        // 线上微信聊天记录
        const onlineHistoryLen = parseInt(ChatDB.getItem('tav_online_chat_history_length') || '10');
        let onlineHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        const recentOnlineHistory = onlineHistory.slice(-onlineHistoryLen);
        recentOnlineHistory.forEach(msg => {
            if (msg.content) totalLength += msg.content.length;
        });

        // 微信角色记忆库
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        const account = accounts.find(a => a.id === currentLoginId);
        const personaId = account ? account.personaId : currentLoginId;
        let chatAppMemory = JSON.parse(ChatDB.getItem(`char_memory_${personaId}_${currentChatRoomCharId}`) || '{}');
        if (chatAppMemory.summary && chatAppMemory.summary.length > 0) totalLength += chatAppMemory.summary[0].content.length;
        if (chatAppMemory.core && chatAppMemory.core.length > 0) chatAppMemory.core.forEach(m => totalLength += m.content.length);
        if (chatAppMemory.note && chatAppMemory.note.length > 0) chatAppMemory.note.forEach(m => totalLength += m.content.length);
    }

    // 粗略估算 Token (中文约 1个字=1~1.5 token，英文 1个词=1.3 token，这里统一按 1.2 估算)
    const estimatedTokens = Math.round(totalLength * 1.2);
    const tokenEl = document.getElementById('tavContextTokenSize');
    if (tokenEl) {
        tokenEl.innerText = estimatedTokens + ' Tokens';
    }
}

// Tab 切换逻辑
function tavSwitchTab(tabName) {
    document.querySelectorAll('.tav-right-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tav-tab-content-container').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tav-tab-' + tabName).classList.add('active');
}

// 外观设置：背景
function tavChangeBackground(url) {
    const panel = document.getElementById('tavernModePanel');
    if(url) {
        panel.style.backgroundImage = `url('${url}')`;
        panel.style.backgroundSize = 'cover';
        panel.style.backgroundPosition = 'center';
    } else {
        panel.style.backgroundImage = 'none';
    }
}

// 外观设置：亮度
function tavChangeBrightness(val) {
    document.getElementById('tav-brightness-overlay').style.background = `rgba(0,0,0,${val / 100})`;
}

// 外观设置：字体大小
function tavChangeFontSize(val) {
    document.getElementById('tavernModePanel').style.setProperty('--tav-base-font-size', val + 'px');
}

// 外观设置：自定义字体
function tavChangeFont(url) {
    let style = document.getElementById('tav-custom-font-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'tav-custom-font-style';
        document.head.appendChild(style);
    }
    if (url) {
        style.innerHTML = `
            @font-face { font-family: 'TavCustomFont'; src: url('${url}'); }
            #tavernModePanel *, #tavSidebarRight * { font-family: 'TavCustomFont', var(--tav-font-apple) !important; }
        `;
    } else {
        style.innerHTML = '';
    }
}

// 外观设置：自定义 CSS
function tavApplyCustomCss(css) {
    let style = document.getElementById('tav-custom-css-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'tav-custom-css-style';
        document.head.appendChild(style);
    }
    style.innerHTML = `#tavernModePanel, #tavSidebarRight { ${css} }`;
}

// 状态栏：实时预览
function tavUpdateStatusPreview(textarea) {
    const previewBox = textarea.parentElement.nextElementSibling.querySelector('.tav-status-preview-box');
    if (previewBox) {
        previewBox.innerHTML = textarea.value;
    }
}

// 预设库弹窗逻辑
function tavOpenPresetModal(title) {
    document.getElementById('tavPresetModalTitle').innerText = title + ' 预设库';
    document.getElementById('tavPresetModalOverlay').classList.add('show');
}
function tavClosePresetModal() {
    document.getElementById('tavPresetModalOverlay').classList.remove('show');
}

// ================= 悬浮球拖拽逻辑 =================
const tavBallContainer = document.getElementById('tav-floating-ball-container');
let tavIsDragging = false;
let tavStartX, tavStartY, tavInitialX, tavInitialY;

if (tavBallContainer) {
    tavBallContainer.addEventListener('mousedown', tavDragStart);
    tavBallContainer.addEventListener('touchstart', tavDragStart, {passive: false});
}

function tavDragStart(e) {
    if (e.target.closest('.tav-floating-panel')) return; // 点击面板内部不触发拖拽
    tavIsDragging = false;
    const touch = e.type === 'touchstart' ? e.touches[0] : e;
    tavStartX = touch.clientX;
    tavStartY = touch.clientY;
    tavInitialX = tavBallContainer.offsetLeft;
    tavInitialY = tavBallContainer.offsetTop;

    document.addEventListener('mousemove', tavDrag);
    document.addEventListener('touchmove', tavDrag, {passive: false});
    document.addEventListener('mouseup', tavDragEnd);
    document.addEventListener('touchend', tavDragEnd);
}

function tavDrag(e) {
    const touch = e.type === 'touchmove' ? e.touches[0] : e;
    const dx = touch.clientX - tavStartX;
    const dy = touch.clientY - tavStartY;
    
    // 移动超过 5px 才算拖拽，防止误触
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        tavIsDragging = true;
    }

    if (tavIsDragging) {
        e.preventDefault();
        tavBallContainer.style.left = `${tavInitialX + dx}px`;
        tavBallContainer.style.top = `${tavInitialY + dy}px`;
        tavBallContainer.style.right = 'auto';
        tavBallContainer.style.bottom = 'auto';
    }
}

function tavDragEnd(e) {
    document.removeEventListener('mousemove', tavDrag);
    document.removeEventListener('touchmove', tavDrag);
    document.removeEventListener('mouseup', tavDragEnd);
    document.removeEventListener('touchend', tavDragEnd);
}

function tavToggleFloatingPanel() {
    if (!tavIsDragging) {
        tavBallContainer.classList.toggle('expanded');
    }
}

// ==========================================
// 预设库逻辑 (Presets)
// ==========================================
let currentTavPresetType = '';

function tavSavePreset(type) {
    let inputId = '';
    let typeName = '';
    if (type === 'system') { inputId = 'tavSystemPrompt'; typeName = '系统提示词'; }
    else if (type === 'jailbreak') { inputId = 'tavJailbreakPrompt'; typeName = '越狱提示词'; }
    else if (type === 'style') { inputId = 'tavStylePrompt'; typeName = '自定义文风'; }
    else if (type === 'note') { inputId = 'tavNotePrompt'; typeName = '作者备注'; }
    else if (type === 'css') { inputId = 'tavCustomCssInput'; typeName = '自定义 CSS'; }

    const content = document.getElementById(inputId).value.trim();
    if (!content) return alert('内容不能为空！');

    // 使用全局通用输入弹窗代替 prompt
    const modal = document.getElementById('globalPromptModalOverlay');
    const titleEl = document.getElementById('globalPromptTitle');
    const descEl = document.getElementById('globalPromptDesc');
    const inputEl = document.getElementById('globalPromptInput');
    const confirmBtn = document.getElementById('globalPromptConfirmBtn');

    titleEl.innerText = '保存预设';
    descEl.innerText = `请输入【${typeName}】预设名称`;
    inputEl.value = '';
    inputEl.placeholder = '预设名称...';

    // 克隆按钮以移除旧事件
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.onclick = () => {
        const name = inputEl.value.trim();
        if (!name) {
            alert('预设名称不能为空！');
            return;
        }
        let presets = JSON.parse(ChatDB.getItem(`tav_presets_${type}`) || '[]');
        presets.push({ id: Date.now().toString(), name: name, content: content });
        ChatDB.setItem(`tav_presets_${type}`, JSON.stringify(presets));
        alert('保存成功！');
        if (typeof closeGlobalPrompt === 'function') closeGlobalPrompt();
    };

    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            newConfirmBtn.click();
        }
    };

    modal.classList.add('show');
    setTimeout(() => inputEl.focus(), 100);
}

function tavOpenPresetModal(type, title) {
    currentTavPresetType = type;
    document.getElementById('tavPresetModalTitle').innerText = title + ' 预设库';
    
    const listEl = document.getElementById('tavPresetModalList');
    listEl.innerHTML = '';
    
    let presets = JSON.parse(ChatDB.getItem(`tav_presets_${type}`) || '[]');
    if (presets.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#888; font-size:12px; padding:20px;">暂无预设</div>';
    } else {
        presets.forEach(p => {
            const item = document.createElement('div');
            item.className = 'preset-item'; // 使用全局 preset-item 样式
            item.innerHTML = `
                <span class="preset-item-name" onclick="tavLoadPreset('${p.id}')">${p.name}</span>
                <span style="color: #ff3b30; font-size: 18px; padding: 0 5px; cursor: pointer;" onclick="tavDeletePreset('${p.id}', event)">×</span>
            `;
            listEl.appendChild(item);
        });
    }
    
    document.getElementById('tavPresetModalOverlay').classList.add('show');
}

// ==========================================
// 关联世界书逻辑 (复用角色库世界书弹窗逻辑)
// ==========================================
let selectedTavWbEntries = [];

function openTavWbSelectModal() {
    const listEl = document.getElementById('tavWbSelectList');
    listEl.innerHTML = '';
    
    // 读取全局世界书数据
    const wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { groups: [], entries: [] };
    
    // 读取当前已绑定的世界书
    const savedWb = JSON.parse(ChatDB.getItem('tav_worldbook_bind') || '[]');
    selectedTavWbEntries = [...savedWb];

    if (wbData.groups.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#aaa; font-size:12px; padding:20px;">暂无世界书数据，请先在 Worldbook 中创建</div>';
    } else {
        wbData.groups.forEach(group => {
            const groupEntries = wbData.entries.filter(e => e.group === group);
            if (groupEntries.length === 0) return;

            const groupTitle = document.createElement('div');
            groupTitle.style.cssText = 'font-size: 14px; font-weight: bold; color: #111; margin: 15px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;';
            groupTitle.innerText = group;
            listEl.appendChild(groupTitle);

            groupEntries.forEach(entry => {
                const item = document.createElement('label');
                item.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px 0; cursor: pointer;';
                
                const isChecked = selectedTavWbEntries.includes(entry.id) ? 'checked' : '';
                
                item.innerHTML = `
                    <input type="checkbox" value="${entry.id}" class="mall-wb-entry-checkbox" ${isChecked} onchange="toggleTavWbEntry('${entry.id}', this.checked)">
                    <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
                        <span style="font-size: 14px; color: #333; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.title}</span>
                        <span style="font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.keywords}</span>
                    </div>
                `;
                listEl.appendChild(item);
            });
        });
    }
    
    document.getElementById('tavWbSelectModalOverlay').classList.add('show');
}

function toggleTavWbEntry(id, isChecked) {
    if (isChecked) {
        if (!selectedTavWbEntries.includes(id)) selectedTavWbEntries.push(id);
    } else {
        selectedTavWbEntries = selectedTavWbEntries.filter(e => e !== id);
    }
}

function confirmTavWbSelect() {
    ChatDB.setItem('tav_worldbook_bind', JSON.stringify(selectedTavWbEntries));
    updateTavWbSelectText();
    document.getElementById('tavWbSelectModalOverlay').classList.remove('show');
}

function updateTavWbSelectText() {
    const savedWb = JSON.parse(ChatDB.getItem('tav_worldbook_bind') || '[]');
    const textEl = document.getElementById('tavWbSelectText');
    if (savedWb.length > 0) {
        textEl.innerHTML = `已选择 ${savedWb.length} 项 <svg viewBox="0 0 24 24" width="14" height="14" stroke="#ccc" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        textEl.style.color = '#111';
        textEl.style.fontWeight = 'bold';
    } else {
        textEl.innerHTML = `未选择 <svg viewBox="0 0 24 24" width="14" height="14" stroke="#ccc" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        textEl.style.color = '#888';
        textEl.style.fontWeight = 'normal';
    }
}

// 页面加载时更新世界书文本
window.addEventListener('ChatDBReady', () => {
    if (document.getElementById('tavWbSelectText')) {
        updateTavWbSelectText();
    }
});

function tavLoadPreset(id) {
    let presets = JSON.parse(ChatDB.getItem(`tav_presets_${currentTavPresetType}`) || '[]');
    const preset = presets.find(p => p.id === id);
    if (preset) {
        let inputId = '';
        if (currentTavPresetType === 'system') inputId = 'tavSystemPrompt';
        else if (currentTavPresetType === 'jailbreak') inputId = 'tavJailbreakPrompt';
        else if (currentTavPresetType === 'style') inputId = 'tavStylePrompt';
        else if (currentTavPresetType === 'note') inputId = 'tavNotePrompt';
        else if (currentTavPresetType === 'css') inputId = 'tavCustomCssInput';
        
        document.getElementById(inputId).value = preset.content;
        if (currentTavPresetType === 'css') tavApplyCustomCss(preset.content);
        tavClosePresetModal();
    }
}

function tavDeletePreset(id, e) {
    e.stopPropagation();
    if (confirm('确定删除此预设吗？')) {
        let presets = JSON.parse(ChatDB.getItem(`tav_presets_${currentTavPresetType}`) || '[]');
        presets = presets.filter(p => p.id !== id);
        ChatDB.setItem(`tav_presets_${currentTavPresetType}`, JSON.stringify(presets));
        // 重新渲染列表
        let title = document.getElementById('tavPresetModalTitle').innerText.replace(' 预设库', '');
        tavOpenPresetModal(currentTavPresetType, title);
    }
}

// ==========================================
// 状态栏管理逻辑 (Status Bar)
// ==========================================
function openTavAddStatusBarPanel() {
    document.getElementById('tavNewStatusName').value = '';
    document.getElementById('tavNewStatusPos').value = 'floating';
    document.getElementById('tavNewStatusRegex').value = '';
    document.getElementById('tavNewStatusHtml').value = '';
    document.getElementById('tavAddStatusBarPanel').style.display = 'flex';
}

function closeTavAddStatusBarPanel() {
    document.getElementById('tavAddStatusBarPanel').style.display = 'none';
}

function saveTavStatusBar() {
    const name = document.getElementById('tavNewStatusName').value.trim();
    const pos = document.getElementById('tavNewStatusPos').value;
    const regex = document.getElementById('tavNewStatusRegex').value.trim();
    const html = document.getElementById('tavNewStatusHtml').value.trim();

    if (!name || !regex || !html) return alert('请填写完整信息！');

    let statusBars = JSON.parse(ChatDB.getItem('tav_status_bars') || '[]');
    statusBars.push({
        id: Date.now().toString(),
        name, pos, regex, html, active: true
    });
    ChatDB.setItem('tav_status_bars', JSON.stringify(statusBars));
    
    closeTavAddStatusBarPanel();
    renderTavStatusBars();
}

function renderTavStatusBars() {
    const listEl = document.getElementById('tavStatusBarList');
    if (!listEl) return;
    listEl.innerHTML = '';

    let statusBars = JSON.parse(ChatDB.getItem('tav_status_bars') || '[]');
    if (statusBars.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#888; font-size:12px; padding:20px;">暂无自定义状态栏</div>';
        return;
    }

    statusBars.forEach(sb => {
        const posMap = {
            'floating': '全局悬浮可拖动',
            'top': '顶部悬浮',
            'bottom': '底部悬浮',
            'card_top': '卡片内部顶部',
            'card_bottom': '卡片内部底部'
        };

        const card = document.createElement('div');
        card.className = 'tav-status-item-card';
        card.innerHTML = `
            <div class="tav-status-header" onclick="this.parentElement.classList.toggle('open')">
                <div class="tav-status-header-left">
                    <div class="tav-toggle-switch ${sb.active ? 'active' : ''}" onclick="event.stopPropagation(); toggleTavStatusBar('${sb.id}', this)"></div>
                    <span class="tav-status-title">${sb.name}</span>
                </div>
                <div class="tav-status-header-right">
                    <svg class="tav-status-arrow" viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
            <div class="tav-status-body">
                <div class="tav-setting-row-col">
                    <span>插入位置</span>
                    <div style="font-size:13px; color:#888; margin-top:4px;">${posMap[sb.pos]}</div>
                </div>
                <div class="tav-setting-row-col">
                    <span>提取规则</span>
                    <div style="font-size:13px; color:#888; margin-top:4px; font-family:monospace;">${sb.regex}</div>
                </div>
                <div class="tav-setting-row-col">
                    <span>HTML 代码</span>
                    <div style="font-size:13px; color:#888; margin-top:4px; font-family:monospace; white-space:pre-wrap; word-break:break-all;">${sb.html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
                <div style="padding: 15px 0; border-top: 1px solid var(--tav-border-color); margin-top: 10px;">
                    <div class="tav-ins-btn outline" style="color: #ff3b30; border-color: #ff3b30;" onclick="deleteTavStatusBar('${sb.id}')">删除此状态栏</div>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function toggleTavStatusBar(id, el) {
    el.classList.toggle('active');
    let statusBars = JSON.parse(ChatDB.getItem('tav_status_bars') || '[]');
    const sb = statusBars.find(s => s.id === id);
    if (sb) {
        sb.active = el.classList.contains('active');
        ChatDB.setItem('tav_status_bars', JSON.stringify(statusBars));
    }
}

function deleteTavStatusBar(id) {
    if (confirm('确定删除此状态栏吗？')) {
        let statusBars = JSON.parse(ChatDB.getItem('tav_status_bars') || '[]');
        statusBars = statusBars.filter(s => s.id !== id);
        ChatDB.setItem('tav_status_bars', JSON.stringify(statusBars));
        renderTavStatusBars();
    }
}

// ==========================================
// 正则管理逻辑 (Regex)
// ==========================================
function openTavRegexModal() {
    document.getElementById('tavRegexName').value = '';
    document.getElementById('tavRegexPattern').value = '';
    document.getElementById('tavRegexReplace').value = '';
    document.getElementById('tavRegexModalOverlay').classList.add('show');
}

function closeTavRegexModal() {
    document.getElementById('tavRegexModalOverlay').classList.remove('show');
}

function saveTavRegex() {
    const name = document.getElementById('tavRegexName').value.trim();
    const pattern = document.getElementById('tavRegexPattern').value.trim();
    const replace = document.getElementById('tavRegexReplace').value.trim();

    if (!name || !pattern) return alert('规则名称和正则表达式不能为空！');

    let regexList = JSON.parse(ChatDB.getItem('tav_regex_list') || '[]');
    regexList.push({ id: Date.now().toString(), name, pattern, replace, active: true });
    ChatDB.setItem('tav_regex_list', JSON.stringify(regexList));
    
    closeTavRegexModal();
    renderTavRegexList();
}

function renderTavRegexList() {
    const listEl = document.getElementById('tavRegexList');
    if (!listEl) return;
    listEl.innerHTML = '';

    // 修复：增加初始化标志位，允许用户清空所有正则而不被重置
    let isInit = ChatDB.getItem('tav_regex_initialized');
    let regexList = JSON.parse(ChatDB.getItem('tav_regex_list') || '[]');
    
    if (!isInit) {
        // 首次加载，注入默认规则
        regexList = [
            { id: 'default1', name: '动作描写加粗斜体', pattern: '\\*(.*?)\\*', replace: "<span class='tav-action-text'>*$1*</span>", active: true },
            { id: 'default2', name: '过滤多余换行', pattern: '\\n{3,}', replace: "\\n\\n", active: true }
        ];
        ChatDB.setItem('tav_regex_list', JSON.stringify(regexList));
        ChatDB.setItem('tav_regex_initialized', 'true');
    }

    if (regexList.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#888; font-size:12px; padding:20px;">暂无正则规则</div>';
        return;
    }

    regexList.forEach(r => {
        const card = document.createElement('div');
        card.className = 'tav-status-item-card';
        card.innerHTML = `
            <div class="tav-status-header" onclick="this.parentElement.classList.toggle('open')">
                <div class="tav-status-header-left">
                    <div class="tav-toggle-switch ${r.active ? 'active' : ''}" onclick="event.stopPropagation(); toggleTavRegex('${r.id}', this)"></div>
                    <span class="tav-status-title">${r.name}</span>
                </div>
                <div class="tav-status-header-right">
                    <svg class="tav-status-arrow" viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
            <div class="tav-status-body">
                <div class="tav-setting-row-col">
                    <span>正则表达式</span>
                    <input type="text" class="tav-ins-input" value="${r.pattern}" readonly style="color: #888; background: #f9f9f9;">
                </div>
                <div class="tav-setting-row-col">
                    <span>替换内容</span>
                    <input type="text" class="tav-ins-input" value="${r.replace.replace(/</g, '&lt;').replace(/>/g, '&gt;')}" readonly style="color: #888; background: #f9f9f9;">
                </div>
                <div style="padding: 15px 0; border-top: 1px solid var(--tav-border-color); margin-top: 10px;">
                    <div class="tav-ins-btn outline" style="color: #ff3b30; border-color: #ff3b30;" onclick="deleteTavRegex('${r.id}')">DELETE</div>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });
}

// ==========================================
// API 同步逻辑 (线下独立，但可读取全局预设)
// ==========================================
function tavLoadApiConfig() {
    const savedApi = JSON.parse(ChatDB.getItem('tav_api_config') || '{}');
    
    // 如果线下没有配置，则自动同步全局设置 APP 的配置
    const globalUrl = localStorage.getItem('apiUrl') || '';
    const globalKey = localStorage.getItem('apiKey') || '';
    const globalModel = localStorage.getItem('apiModel') || 'gpt-4-turbo';
    const globalTemp = localStorage.getItem('apiTemperature') || '0.8';

    document.getElementById('tavApiUrl').value = savedApi.url || globalUrl;
    document.getElementById('tavApiKey').value = savedApi.key || globalKey;
    
    const targetModel = savedApi.model || globalModel;
    const modelSelect = document.getElementById('tavApiModel');
    if (targetModel) {
        let exists = Array.from(modelSelect.options).some(opt => opt.value === targetModel);
        if(!exists) {
            const opt = document.createElement('option');
            opt.value = targetModel; opt.text = targetModel;
            modelSelect.appendChild(opt);
        }
        modelSelect.value = targetModel;
    }
    
    const targetTemp = savedApi.temperature !== undefined ? savedApi.temperature : globalTemp;
    document.getElementById('tavApiTemp').value = targetTemp;
    document.getElementById('tavApiTempValue').innerText = targetTemp;
}

function tavSaveApiConfig() {
    const url = document.getElementById('tavApiUrl').value.trim();
    const key = document.getElementById('tavApiKey').value.trim();
    const model = document.getElementById('tavApiModel').value;
    const temp = document.getElementById('tavApiTemp').value;

    ChatDB.setItem('tav_api_config', JSON.stringify({ url, key, model, temperature: temp }));
    alert('线下 API 设置已保存！(不影响全局)');
}

// 打开全局 API 预设库
function tavOpenApiPresetPopup() {
    const listEl = document.getElementById('tavApiPresetList');
    listEl.innerHTML = '';
    
    let presets = JSON.parse(ChatDB.getItem('api_presets') || '[]');
    if (presets.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#888; font-size:12px; padding:20px;">暂无全局 API 预设</div>';
    } else {
        presets.forEach(p => {
            const item = document.createElement('div');
            item.className = 'preset-item'; // 使用全局 preset-item 样式
            item.innerHTML = `<span class="preset-item-name">${p.name}</span>`;
            item.onclick = () => {
                document.getElementById('tavApiUrl').value = p.url || '';
                document.getElementById('tavApiKey').value = p.key || '';
                
                const modelSelect = document.getElementById('tavApiModel');
                if (p.model) {
                    let exists = Array.from(modelSelect.options).some(opt => opt.value === p.model);
                    if(!exists) {
                        const opt = document.createElement('option');
                        opt.value = p.model; opt.text = p.model;
                        modelSelect.appendChild(opt);
                    }
                    modelSelect.value = p.model;
                }
                
                if (p.temperature !== undefined) {
                    document.getElementById('tavApiTemp').value = p.temperature;
                    document.getElementById('tavApiTempValue').innerText = p.temperature;
                }
                tavCloseApiPresetPopup();
            };
            listEl.appendChild(item);
        });
    }
    document.getElementById('tavApiPresetModalOverlay').classList.add('show');
}

function tavCloseApiPresetPopup() {
    document.getElementById('tavApiPresetModalOverlay').classList.remove('show');
}

// 拉取模型
window.tavFetchedModels = [];
async function tavFetchModels() {
    const urlInput = document.getElementById('tavApiUrl').value.trim().replace(/\/$/, '');
    const key = document.getElementById('tavApiKey').value.trim();
    const select = document.getElementById('tavApiModel');
    
    if (!urlInput || !key) return alert('请先填写 API URL 和 Key');

    select.innerHTML = '<option>拉取中...</option>';
    const targetUrl = `${urlInput}/models`;

    try {
        let res;
        try {
            res = await fetch(targetUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${key}` } });
        } catch (directErr) {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            res = await fetch(proxyUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${key}` } });
        }
        
        if (!res.ok) throw new Error(`HTTP 状态码错误: ${res.status}`);
        const data = await res.json();
        
        if (data.data && Array.isArray(data.data)) {
            window.tavFetchedModels = data.data.map(m => ({ id: m.id })); 
            const searchInput = document.getElementById('tavModelSearch');
            if (searchInput) searchInput.value = '';
            tavRenderModelSelect(); 
            alert(`成功拉取 ${data.data.length} 个模型！`);
        } else {
            window.tavFetchedModels = [];
            select.innerHTML = '<option>未找到模型</option>';
            alert("拉取失败：接口返回的数据格式不正确");
        }
    } catch (e) {
        window.tavFetchedModels = [];
        select.innerHTML = '<option>拉取失败</option>';
        alert('拉取失败！请检查地址、Key是否正确。\n详细错误: ' + e.message);
    }
}

function tavRenderModelSelect(filterText = '') {
    const select = document.getElementById('tavApiModel');
    select.innerHTML = '';
    const filtered = window.tavFetchedModels.filter(m => m.id.toLowerCase().includes(filterText.toLowerCase()));
    if (filtered.length === 0) {
        select.innerHTML = '<option value="">未找到匹配的模型</option>';
        return;
    }
    filtered.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id; opt.textContent = m.id;
        select.appendChild(opt);
    });
}

// 拦截 tavToggleSettings，在打开设置时读取最新的 API 配置
const originalTavToggleSettings = window.tavToggleSettings;
window.tavToggleSettings = function() {
    if (originalTavToggleSettings) originalTavToggleSettings();
    tavLoadApiConfig();
};

function toggleTavRegex(id, el) {
    el.classList.toggle('active');
    let regexList = JSON.parse(ChatDB.getItem('tav_regex_list') || '[]');
    const r = regexList.find(x => x.id === id);
    if (r) {
        r.active = el.classList.contains('active');
        ChatDB.setItem('tav_regex_list', JSON.stringify(regexList));
    }
}

function deleteTavRegex(id) {
    if (confirm('确定删除此正则规则吗？')) {
        let regexList = JSON.parse(ChatDB.getItem('tav_regex_list') || '[]');
        regexList = regexList.filter(x => x.id !== id);
        ChatDB.setItem('tav_regex_list', JSON.stringify(regexList));
        renderTavRegexList();
    }
}

// ==========================================
// 聊天流渲染逻辑 (Chat Stream)
// ==========================================
function tavRenderChat() {
    const streamEl = document.getElementById('tavStoryStream');
    if (!streamEl) return;
    streamEl.innerHTML = '';

    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentChatRoomCharId || !currentLoginId) {
        streamEl.innerHTML = '<div style="text-align:center; color:#ccc; font-size:12px; margin-top:40px;">暂无聊天记录</div>';
        return;
    }

    // 核心修改：使用 tav_chat_history_ 实现线下隔离
    let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    if (history.length === 0) {
        streamEl.innerHTML = '<div style="text-align:center; color:#ccc; font-size:12px; margin-top:40px;">暂无聊天记录</div>';
        return;
    }

    let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
    const char = allEntities.find(c => c.id === currentChatRoomCharId);
    const charAvatar = char ? (char.avatarUrl || '') : '';
    const charName = char ? (char.netName || char.name || 'Char') : 'Char';
    
    const me = allEntities.find(a => a.id === currentLoginId);
    const userAvatar = me ? (me.avatarUrl || '') : '';
    const userName = me ? (me.netName || 'You') : 'You';

    // 获取激活的正则规则
    let regexList = JSON.parse(ChatDB.getItem('tav_regex_list') || '[]').filter(r => r.active);

    history.forEach(msg => {
        const isMe = msg.sender === 'me';
        let content = msg.content || '';

        // 应用正则替换
        regexList.forEach(r => {
            try {
                const regex = new RegExp(r.pattern, 'g');
                content = content.replace(regex, r.replace);
            } catch (e) { console.error('Regex error:', e); }
        });

        // 转换换行为 <br>
        content = content.replace(/\n/g, '<br>');

        const card = document.createElement('div');
        card.className = `tav-chat-card ${isMe ? 'user' : 'char'}`;
        
        // 动态生成菜单 HTML
        const menuHtml = `
            <div class="tav-msg-menu-container ${isMe ? 'user' : 'char'}">
                <div class="tav-msg-menu-btn" onclick="tavToggleMsgMenu(this, event)">
                    <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                </div>
                <div class="tav-msg-menu">
                    <div class="tav-msg-menu-item" onclick="tavEditMsg('${msg.id}')">编辑</div>
                    <div class="tav-msg-menu-item" onclick="tavEditMsgStatus('${msg.id}')">编辑状态栏</div>
                    <div class="tav-msg-menu-item danger" onclick="tavDeleteMsg('${msg.id}')">删除</div>
                </div>
            </div>
        `;

        card.innerHTML = `
            <div class="tav-chat-card-header">
                <div class="tav-chat-card-avatar" style="background-image: url('${isMe ? userAvatar : charAvatar}');"></div>
                <div class="tav-chat-card-name">${isMe ? userName : charName}</div>
            </div>
            <div class="tav-chat-card-content">${content}</div>
            ${menuHtml}
        `;
        streamEl.appendChild(card);
    });

    // 滚动到底部
    setTimeout(() => {
        streamEl.scrollTop = streamEl.scrollHeight;
    }, 100);
}

// ==========================================
// 聊天交互逻辑 (发送、AI、菜单、记忆库)
// ==========================================

// 控制 UI 加载状态
function tavSetLoadingState(isLoading) {
    const headerName = document.getElementById('tavHeaderName');
    const sendBtn = document.querySelector('.tav-send-btn');
    if (isLoading) {
        headerName.classList.add('loading');
        sendBtn.classList.add('loading');
    } else {
        headerName.classList.remove('loading');
        sendBtn.classList.remove('loading');
    }
}

// 发送消息 (仅发送，不触发 AI)
function tavSendMsg() {
    const inputEl = document.getElementById('tavChatInput');
    const content = inputEl.value.trim();
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!content || !currentChatRoomCharId || !currentLoginId) return;

    // 核心修改：使用 tav_chat_history_ 实现线下隔离，且不再双向同步给微信
    let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    history.push({
        id: Date.now().toString(),
        sender: 'me',
        content: content,
        timestamp: new Date().toISOString()
    });
    ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
    
    inputEl.value = '';
    inputEl.style.height = '20px'; // 恢复默认高度
    tavRenderChat();
    tavUpdateContextTokens();
}

// 触发 AI 回复 (核心 Fetch 逻辑)
async function tavTriggerAI(isRegenerate = false, isContinue = false) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentChatRoomCharId || !currentLoginId) return alert('请先选择一个角色进行聊天');
    
    const apiConfig = JSON.parse(ChatDB.getItem('tav_api_config') || '{}');
    const url = apiConfig.url || localStorage.getItem('apiUrl');
    const key = apiConfig.key || localStorage.getItem('apiKey');
    const model = apiConfig.model || localStorage.getItem('apiModel') || 'gpt-4-turbo';
    const temp = apiConfig.temperature !== undefined ? apiConfig.temperature : (localStorage.getItem('apiTemperature') || 0.8);

    if (!url || !key) return alert('请先在设置中配置 API URL 和 Key');

    tavSetLoadingState(true);

    // 核心修改：使用 tav_chat_history_
    let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');

    if (isRegenerate && history.length > 0 && history[history.length-1].sender === 'char') {
        history.pop(); // 移除最后一条 AI 消息
    }

    let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
    const char = allEntities.find(c => c.id === currentChatRoomCharId);
    const charName = char ? (char.netName || char.name) : 'Char';
    
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === currentLoginId);
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    const persona = personas.find(p => p.id === (account ? account.personaId : null));
    const userName = account ? (account.netName || 'User') : 'User';

    // 构建 Messages 数组
    let messages = [];
    let sysPrompt = "";

    // 1. 读取系统提示词 (检查开关是否开启)
    const sysToggle = document.getElementById('tavSystemPrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (sysToggle && sysToggle.classList.contains('active')) {
        sysPrompt += document.getElementById('tavSystemPrompt')?.value || '';
    }
    
    // 2. 注入角色设定
    if (char) {
        sysPrompt += `\n\n【角色设定】\n${char.description || ''}`;
        if (char.scenario) {
            sysPrompt += `\n\n【当前场景】\n${char.scenario}`;
        }
    }

    // 3. 注入用户设定 (面具)
    if (persona && persona.persona) {
        sysPrompt += `\n\n【用户设定】\n${persona.persona}`;
    }

    // 4. 注入世界书 (仅读取设置中心绑定的世界书 tav_worldbook_bind)
    const savedWb = JSON.parse(ChatDB.getItem('tav_worldbook_bind') || '[]');
    const wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
    let activeWbs = [];
    savedWb.forEach(id => {
        const entry = wbData.entries.find(e => e.id === id);
        if (entry && entry.content) activeWbs.push(entry.content);
    });
    if (activeWbs.length > 0) {
        sysPrompt += `\n\n【世界书/背景设定】\n${activeWbs.join('\n')}`;
    }

    // 5. 注入向量记忆库
    const isVectorEnabled = document.getElementById('tavVectorToggle')?.classList.contains('active');
    if (isVectorEnabled) {
        const memories = JSON.parse(ChatDB.getItem(`tav_memory_${currentChatRoomCharId}`) || '[]');
        if (memories.length > 0) {
            sysPrompt += '\n\n【核心记忆库】\n' + memories.map(m => m.text).join('\n');
        }
        sysPrompt += '\n\n【重要指令】请在回复的正文和状态栏之后，总结这一轮对话的核心内容（包括动作、剧情推进、重要信息），并使用 <summary>总结内容</summary> 标签包裹在回复的最末尾。';
    }

    // 6. 注入 Chat APP 角色记忆库
    const currentPersonaId = persona ? persona.id : currentLoginId;
    let chatAppMemory = JSON.parse(ChatDB.getItem(`char_memory_${currentPersonaId}_${currentChatRoomCharId}`) || '{}');
    
    if (chatAppMemory.summary && chatAppMemory.summary.length > 0) {
        sysPrompt += `\n\n【前情提要/故事总结】\n${chatAppMemory.summary[0].content}`;
    }
    if (chatAppMemory.core && chatAppMemory.core.length > 0) {
        sysPrompt += `\n\n【核心记忆】\n${chatAppMemory.core.map(m => m.content).join('\n')}`;
    }
    if (chatAppMemory.note && chatAppMemory.note.length > 0) {
        sysPrompt += `\n\n【作者备注 (全局)】\n${chatAppMemory.note.map(m => m.content).join('\n')}`;
    }

    // 7. 注入线上微信聊天记录
    const onlineHistoryLen = parseInt(ChatDB.getItem('tav_online_chat_history_length') || '10');
    if (onlineHistoryLen > 0) {
        let onlineHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        let recentOnlineHistory = onlineHistory.slice(-onlineHistoryLen);
        if (recentOnlineHistory.length > 0) {
            sysPrompt += `\n\n【线上聊天记录回顾】\n以下是你和 ${userName} 在线上聊天软件中的近期聊天记录，作为背景参考：\n`;
            recentOnlineHistory.forEach(msg => {
                let senderName = msg.role === 'user' ? userName : charName;
                let content = msg.content.replace(/<[^>]+>/g, ''); // 简单过滤HTML
                sysPrompt += `${senderName}: ${content}\n`;
            });
        }
    }

    // 新增：注入线下记忆总结 (线下模式读取所有线下记忆)
    let tavMemories = JSON.parse(ChatDB.getItem(`tav_offline_memories_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    if (tavMemories.length > 0) {
        sysPrompt += `\n\n【线下记忆总结】\n以下是之前发生的剧情总结，请务必结合这些记忆进行回复：\n`;
        tavMemories.forEach(mem => {
            sysPrompt += `- ${mem.content}\n`;
        });
    }

    // 8. 注入状态栏格式要求
    let statusBars = JSON.parse(ChatDB.getItem('tav_status_bars') || '[]');
    let activeStatusBars = statusBars.filter(sb => sb.active);
    if (activeStatusBars.length > 0) {
        sysPrompt += `\n\n【状态栏输出要求】\n请在回复的正文末尾，严格按照以下格式输出当前的状态数据，以便系统正则提取：\n`;
        activeStatusBars.forEach(sb => {
            sysPrompt += `- ${sb.name} (必须符合正则提取规则: ${sb.regex})\n`;
        });
    }

    // 9. 注入越狱、文风、作者备注 (检查开关是否开启)
    const jailToggle = document.getElementById('tavJailbreakPrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (jailToggle && jailToggle.classList.contains('active')) {
        const jailbreak = document.getElementById('tavJailbreakPrompt')?.value || '';
        if (jailbreak) sysPrompt += `\n\n【系统指令】\n${jailbreak}`;
    }

    const styleToggle = document.getElementById('tavStylePrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (styleToggle && styleToggle.classList.contains('active')) {
        const style = document.getElementById('tavStylePrompt')?.value || '';
        if (style) sysPrompt += `\n\n【文风要求】\n${style}`;
    }

    const noteToggle = document.getElementById('tavNotePrompt')?.closest('.tav-status-item-card')?.querySelector('.tav-toggle-switch');
    if (noteToggle && noteToggle.classList.contains('active')) {
        const note = document.getElementById('tavNotePrompt')?.value || '';
        if (note) sysPrompt += `\n\n【作者备注】\n${note}`;
    }

    messages.push({ role: 'system', content: sysPrompt });

    // 10. 拼接酒馆线下历史记录
    const historyLen = parseInt(ChatDB.getItem('tav_chat_history_length') || '20');
    const recentHistory = history.slice(-historyLen);
    recentHistory.forEach(msg => {
        messages.push({ role: msg.sender === 'me' ? 'user' : 'assistant', content: msg.content });
    });

    // 11. 继续生成指令
    if (isContinue && history.length > 0 && history[history.length-1].sender === 'char') {
        messages.push({ role: 'user', content: '请继续你上一条未完成的回复，直接输出接下来的内容，不要重复已经说过的话。' });
    }

    try {
        const response = await fetch(url + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: parseFloat(temp)
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let replyText = data.choices[0].message.content;

        // 提取并保存记忆总结
        if (isVectorEnabled) {
            const summaryMatch = replyText.match(/<summary>([\s\S]*?)<\/summary>/);
            if (summaryMatch) {
                const summaryText = summaryMatch[1].trim();
                let memories = JSON.parse(ChatDB.getItem(`tav_memory_${currentChatRoomCharId}`) || '[]');
                memories.push({ id: Date.now().toString(), text: summaryText });
                ChatDB.setItem(`tav_memory_${currentChatRoomCharId}`, JSON.stringify(memories));
                // 从展示文本中移除 summary 标签
                replyText = replyText.replace(/<summary>[\s\S]*?<\/summary>/, '').trim();
            }
        }

        // 保存消息 (核心修改：使用 tav_chat_history_)
        if (isContinue && history.length > 0 && history[history.length-1].sender === 'char') {
            history[history.length-1].content += replyText;
        } else {
            history.push({
                id: Date.now().toString(),
                sender: 'char',
                content: replyText,
                timestamp: new Date().toISOString()
            });
        }

        ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
        tavRenderChat();
        tavUpdateContextTokens();

    } catch (error) {
        alert('API 请求失败: ' + error.message);
    } finally {
        tavSetLoadingState(false);
    }
}

// 重新生成弹窗
function tavPromptRegenerate() {
    const modal = document.getElementById('tavConfirmModalOverlay');
    document.getElementById('tavConfirmTitle').innerText = '重新生成';
    document.getElementById('tavConfirmDesc').innerText = '是否确认删除最后一条 AI 回复并重新生成？';
    const btn = document.getElementById('tavConfirmBtn');
    btn.onclick = () => {
        modal.classList.remove('show');
        tavTriggerAI(true, false);
    };
    modal.classList.add('show');
}

// 继续生成弹窗
function tavPromptContinue() {
    const modal = document.getElementById('tavConfirmModalOverlay');
    document.getElementById('tavConfirmTitle').innerText = '继续生成';
    document.getElementById('tavConfirmDesc').innerText = '是否确认让 AI 继续生成未完成的回复？';
    const btn = document.getElementById('tavConfirmBtn');
    btn.onclick = () => {
        modal.classList.remove('show');
        tavTriggerAI(false, true);
    };
    modal.classList.add('show');
}

// 切换消息菜单显示
function tavToggleMsgMenu(btnEl, event) {
    event.stopPropagation();
    document.querySelectorAll('.tav-msg-menu.show').forEach(menu => {
        if (menu !== btnEl.nextElementSibling) menu.classList.remove('show');
    });
    const menu = btnEl.nextElementSibling;
    menu.classList.toggle('show');
}

// 点击全局空白处关闭菜单
document.addEventListener('click', () => {
    document.querySelectorAll('.tav-msg-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
});

// 编辑消息/状态栏逻辑
function tavEditMsg(id, isStatus = false) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentChatRoomCharId || !currentLoginId) return;
    
    // 核心修改：使用 tav_chat_history_
    let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    const msg = history.find(m => m.id === id);
    if (!msg) return;

    const modal = document.getElementById('tavEditContentModalOverlay');
    document.getElementById('tavEditContentTitle').innerText = isStatus ? '编辑状态栏 (HTML)' : '编辑消息';
    const textarea = document.getElementById('tavEditContentTextarea');
    textarea.value = msg.content;

    const saveBtn = document.getElementById('tavEditContentSaveBtn');
    saveBtn.onclick = () => {
        msg.content = textarea.value;
        ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
        modal.classList.remove('show');
        tavRenderChat();
        tavUpdateContextTokens();
    };
    modal.classList.add('show');
}

function tavEditMsgStatus(id) {
    tavEditMsg(id, true);
}

function tavDeleteMsg(id) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentChatRoomCharId || !currentLoginId) return;
    
    if (confirm('确定删除这条消息吗？')) {
        // 核心修改：使用 tav_chat_history_
        let history = JSON.parse(ChatDB.getItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        history = history.filter(msg => msg.id !== id);
        ChatDB.setItem(`tav_chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
        tavRenderChat();
        tavUpdateContextTokens();
    }
}

// ==========================================
// 记忆库管理逻辑
// ==========================================
function tavOpenMemoryBank() {
    const isVectorEnabled = document.getElementById('tavVectorToggle')?.classList.contains('active');
    if (!isVectorEnabled) return alert('请先在右侧设置中开启【向量记忆库】插件！');
    if (!currentChatRoomCharId) return alert('请先选择一个角色');

    tavRenderMemoryBank();
    document.getElementById('tavMemoryBankPanel').style.display = 'flex';
}

function closeTavMemoryBankPanel() {
    document.getElementById('tavMemoryBankPanel').style.display = 'none';
}

function tavRenderMemoryBank() {
    const listEl = document.getElementById('tavMemoryBankList');
    listEl.innerHTML = '';
    let memories = JSON.parse(ChatDB.getItem(`tav_memory_${currentChatRoomCharId}`) || '[]');

    if (memories.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:40px 0;">暂无记忆总结，开启插件后每轮对话将自动生成。</div>';
        return;
    }

    memories.forEach(m => {
        const card = document.createElement('div');
        card.style.cssText = 'background: #fff; border-radius: 16px; padding: 15px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px;';
        card.innerHTML = `
            <div style="font-size: 14px; color: #333; line-height: 1.6; word-break: break-all;">${m.text}</div>
            <div style="display: flex; justify-content: flex-end; gap: 15px; border-top: 1px solid #f5f5f5; padding-top: 12px; margin-top: 4px;">
                <span style="font-size: 13px; color: #111; cursor: pointer; font-weight: bold;" onclick="tavEditMemory('${m.id}')">Edit</span>
                <span style="font-size: 13px; color: #ff3b30; cursor: pointer; font-weight: bold;" onclick="tavDeleteMemory('${m.id}')">Delete</span>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function tavEditMemory(id) {
    let memories = JSON.parse(ChatDB.getItem(`tav_memory_${currentChatRoomCharId}`) || '[]');
    const mem = memories.find(m => m.id === id);
    if (!mem) return;

    const modal = document.getElementById('tavEditContentModalOverlay');
    document.getElementById('tavEditContentTitle').innerText = '编辑记忆';
    const textarea = document.getElementById('tavEditContentTextarea');
    textarea.value = mem.text;

    const saveBtn = document.getElementById('tavEditContentSaveBtn');
    saveBtn.onclick = () => {
        mem.text = textarea.value;
        ChatDB.setItem(`tav_memory_${currentChatRoomCharId}`, JSON.stringify(memories));
        modal.classList.remove('show');
        tavRenderMemoryBank();
    };
    modal.classList.add('show');
}

function tavDeleteMemory(id) {
    if (confirm('确定删除这条记忆吗？')) {
        let memories = JSON.parse(ChatDB.getItem(`tav_memory_${currentChatRoomCharId}`) || '[]');
        memories = memories.filter(m => m.id !== id);
        ChatDB.setItem(`tav_memory_${currentChatRoomCharId}`, JSON.stringify(memories));
        tavRenderMemoryBank();
    }
}

// 页面加载时渲染状态栏列表
window.addEventListener('ChatDBReady', () => {
    if (document.getElementById('tavStatusBarList')) {
        renderTavStatusBars();
        renderTavRegexList();
    }
});
