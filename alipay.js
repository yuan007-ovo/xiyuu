// ==========================================
// Alipay 专属逻辑 (alipay.js)
// ==========================================

let currentAlipayLoginId = null;

// 打开 Alipay 面板
function openAlipayPanel() {
    document.getElementById('alipayPanel').style.display = 'flex';
    
    // 检查是否已登录
    currentAlipayLoginId = ChatDB.getItem('alipay_login_account');
    
    if (currentAlipayLoginId) {
        // 已登录，隐藏登录页，显示主界面
        document.getElementById('alipayLoginPage').classList.add('hidden');
        document.getElementById('alipaySettingsPage').classList.add('hidden');
        switchAlipayTab('home');
    } else {
        // 未登录，显示登录页
        document.getElementById('alipayLoginPage').classList.remove('hidden');
        document.getElementById('alipaySettingsPage').classList.add('hidden'); // 修复：确保设置页被隐藏
        renderAlipayLoginAccounts();
    }
}

// 关闭 Alipay 面板
function closeAlipayPanel() {
    document.getElementById('alipayPanel').style.display = 'none';
}

// 渲染登录账号列表
function renderAlipayLoginAccounts() {
    const listEl = document.getElementById('alipayAccountList');
    listEl.innerHTML = '';
    
    // 获取所有在 Chat 中注册的账号 (包含 User 和 Char)
    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }

    // 只显示用户账号 (isAccount 为 true)
    let userAccounts = allEntities.filter(acc => acc.isAccount);

    if (userAccounts.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #888; font-size: 13px; margin-top: 40px;">暂无可用用户账号，请先在 Chat 中注册</div>';
        return;
    }

    userAccounts.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'alipay-account-card';
        
        let avatarHtml = '';
        if (acc.avatarUrl) {
            avatarHtml = `<div class="alipay-account-avatar" style="background-image: url('${acc.avatarUrl}');"></div>`;
        } else {
            avatarHtml = `<div class="alipay-account-avatar">${(acc.netName || acc.name || 'U').charAt(0).toUpperCase()}</div>`;
        }

        card.innerHTML = `
            ${avatarHtml}
            <div class="alipay-account-info">
                <div class="alipay-account-name">${acc.netName || acc.name || '未命名'}</div>
                <div class="alipay-account-id">账号: ${acc.account || '未设置'}</div>
            </div>
        `;
        
        card.onclick = () => {
            alipayLogin(acc.id);
        };
        
        listEl.appendChild(card);
    });
}

// 账号密码登录
function alipayLoginWithPassword() {
    const accountInput = document.getElementById('alipayLoginAccount').value.trim();
    const passwordInput = document.getElementById('alipayLoginPassword').value.trim();
    
    if (!accountInput || !passwordInput) {
        return alert('请输入账号和密码！');
    }
    
    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }
    
    // 只允许用户账号登录
    const validAccount = allEntities.find(a => a.isAccount && a.account === accountInput && a.password === passwordInput);
    
    if (validAccount) {
        document.getElementById('alipayLoginAccount').value = '';
        document.getElementById('alipayLoginPassword').value = '';
        alipayLogin(validAccount.id);
    } else {
        alert('账号或密码错误，或者该账号不是用户账号！');
    }
}

// 执行登录
function alipayLogin(accountId) {
    currentAlipayLoginId = accountId;
    ChatDB.setItem('alipay_login_account', accountId);
    
    document.getElementById('alipayLoginPage').classList.add('hidden');
    switchAlipayTab('home');
}

// 退出登录
function alipayLogout() {
    currentAlipayLoginId = null;
    ChatDB.removeItem('alipay_login_account');
    
    document.getElementById('alipaySettingsPage').classList.add('hidden');
    document.getElementById('alipayLoginPage').classList.remove('hidden');
    renderAlipayLoginAccounts();
}

// 切换底部 Tab
function switchAlipayTab(tabId) {
    document.querySelectorAll('.alipay-page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.alipay-tab-item').forEach(item => item.classList.remove('active'));
    
    document.getElementById('alipay-page-' + tabId).classList.add('active');
    
    const tabs = document.querySelectorAll('.alipay-tab-item');
    if(tabId === 'home') tabs[0].classList.add('active');
    if(tabId === 'chat') {
        tabs[1].classList.add('active');
        renderAlipayChatList(); // 渲染消息列表
    }
    if(tabId === 'me') {
        tabs[2].classList.add('active');
        renderAlipayData();
    }
}

// 渲染消息列表
function renderAlipayChatList() {
    const listEl = document.getElementById('alipayChatSessionList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!currentAlipayLoginId) {
        listEl.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 40px;">请先登录</div>';
        return;
    }

    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentAlipayLoginId}`) || '[]');
    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }

    // 核心：只显示好友，不显示群聊
    const friends = contacts.map(id => allEntities.find(c => c.id === id)).filter(c => c && !c.isGroup);

    if (friends.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:20px 0;">暂无好友</div>';
        return;
    }

    friends.forEach(char => {
        // 核心：使用独立的 alipay_chat_history_ 保证记录不互通
        let history = JSON.parse(ChatDB.getItem(`alipay_chat_history_${currentAlipayLoginId}_${char.id}`) || '[]');
        let lastMsgText = '点击进入聊天...';
        let lastMsgTime = '';
        
        if (history.length > 0) {
            const lastMsg = history[history.length - 1];
            const safeContent = lastMsg.content || '';
            if (lastMsg.type === 'image') lastMsgText = '[图片]';
            else if (lastMsg.type === 'voice') lastMsgText = '[语音]';
            else if (lastMsg.type === 'transfer') lastMsgText = '[转账]';
            else lastMsgText = safeContent.replace(/<[^>]+>/g, '');
            
            const date = new Date(lastMsg.timestamp);
            const now = new Date();
            lastMsgTime = date.toDateString() === now.toDateString() 
                ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                : `${date.getMonth() + 1}/${date.getDate()}`;
        }

        const item = document.createElement('div');
        item.className = 'alipay-msg-item';
        item.style.cursor = 'pointer';
        item.onclick = () => openAlipayChatRoom(char.id);

        let avatarHtml = char.avatarUrl 
            ? `<div class="alipay-msg-avatar" style="background-image: url('${char.avatarUrl}'); background-size: cover; background-position: center;"></div>`
            : `<div class="alipay-msg-avatar"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`;

        item.innerHTML = `
            ${avatarHtml}
            <div class="alipay-msg-info">
                <div class="alipay-msg-name">${char.netName || char.name}</div>
                <div class="alipay-msg-preview">${lastMsgText}</div>
            </div>
            <div class="alipay-msg-time">${lastMsgTime}</div>
        `;
        listEl.appendChild(item);
    });
}

let currentAlipayChatCharId = null;

function openAlipayChatRoom(charId) {
    currentAlipayChatCharId = charId;
    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }
    const char = allEntities.find(c => c.id === charId);
    if (char) {
        document.getElementById('alipayChatRoomTitle').innerText = char.netName || char.name;
    }
    document.getElementById('alipayChatInput').value = '';
    document.getElementById('alipayChatRoomPage').classList.add('show');
    renderAlipayChatHistory();
}

function closeAlipayChatRoom() {
    document.getElementById('alipayChatRoomPage').classList.remove('show');
    currentAlipayChatCharId = null;
}

function renderAlipayChatHistory() {
    const historyEl = document.getElementById('alipayChatHistory');
    historyEl.innerHTML = '';
    if (!currentAlipayLoginId || !currentAlipayChatCharId) return;

    let history = JSON.parse(ChatDB.getItem(`alipay_chat_history_${currentAlipayLoginId}_${currentAlipayChatCharId}`) || '[]');
    
    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }
    const me = allEntities.find(a => a.id === currentAlipayLoginId);
    const char = allEntities.find(c => c.id === currentAlipayChatCharId);

    const meAvatar = me ? me.avatarUrl : '';
    const charAvatar = char ? char.avatarUrl : '';

    history.forEach(msg => {
        if (msg.type === 'hidden_system') return;

        const isMe = msg.role === 'user';
        const avatarUrl = isMe ? meAvatar : charAvatar;
        const avatarHtml = avatarUrl 
            ? `<div class="ali-avatar" style="background-image: url('${avatarUrl}');"></div>`
            : `<div class="ali-avatar"></div>`;

        let bubbleHtml = '';
        let safeContent = msg.content || '';

        if (msg.type === 'transfer') {
            const isReceived = msg.status === 'received';
            const isRejected = msg.status === 'rejected' || msg.status === 'refunded';
            
            let descText = msg.note || '转账';
            if (isReceived) descText = '已收款';
            else if (isRejected) descText = '已退还';

            bubbleHtml = `
                <div class="ali-transfer-card ${isReceived ? 'received' : ''}">
                    <div class="ali-transfer-top">
                        <div class="ali-transfer-icon">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div class="ali-transfer-info">
                            <div class="ali-transfer-amount">¥${msg.amount}</div>
                            <div class="ali-transfer-desc">${descText}</div>
                        </div>
                    </div>
                    <div class="ali-transfer-bottom">支付宝转账</div>
                </div>
            `;
        } else if (msg.type === 'image' || safeContent.includes('<img') || safeContent.includes('chat-desc-img-120')) {
            bubbleHtml = `<div class="ali-bubble" style="background: transparent; padding: 0;">[图片/表情包]</div>`;
        } else if (msg.type === 'voice') {
            bubbleHtml = `<div class="ali-bubble">[语音]</div>`;
        } else if (msg.type === 'system') {
            bubbleHtml = `<div style="width: 100%; text-align: center; font-size: 12px; color: #aaa; margin: 10px 0;">${safeContent}</div>`;
            const row = document.createElement('div');
            row.innerHTML = bubbleHtml;
            historyEl.appendChild(row);
            return;
        } else {
            bubbleHtml = `<div class="ali-bubble">${safeContent.replace(/<[^>]+>/g, '')}</div>`;
        }

        const row = document.createElement('div');
        row.className = `ali-msg-row ${isMe ? 'me' : 'other'}`;
        row.innerHTML = `
            ${avatarHtml}
            ${bubbleHtml}
        `;
        historyEl.appendChild(row);
    });

    setTimeout(() => {
        historyEl.scrollTop = historyEl.scrollHeight;
    }, 50);
}

function sendAlipayChatMessage() {
    const inputEl = document.getElementById('alipayChatInput');
    const content = inputEl.value.trim();
    if (!content || !currentAlipayLoginId || !currentAlipayChatCharId) return;

    let newMsg = { role: 'user', type: 'text', content: content, timestamp: Date.now() };
    
    let history = JSON.parse(ChatDB.getItem(`alipay_chat_history_${currentAlipayLoginId}_${currentAlipayChatCharId}`) || '[]');
    history.push(newMsg);
    ChatDB.setItem(`alipay_chat_history_${currentAlipayLoginId}_${currentAlipayChatCharId}`, JSON.stringify(history));

    let targetHistory = JSON.parse(ChatDB.getItem(`alipay_chat_history_${currentAlipayChatCharId}_${currentAlipayLoginId}`) || '[]');
    targetHistory.push({ ...newMsg, role: 'char' });
    ChatDB.setItem(`alipay_chat_history_${currentAlipayChatCharId}_${currentAlipayLoginId}`, JSON.stringify(targetHistory));

    // 触发 Char 感知系统 (大模型会知道你通过支付宝发了消息)
    if (typeof injectCharPerception === 'function') {
        injectCharPerception('alipay_msg', content, currentAlipayChatCharId);
    }

    inputEl.value = '';
    renderAlipayChatHistory();
    renderAlipayChatList();
}

function openAlipayTransferModal() {
    document.getElementById('alipayTransferAmount').value = '';
    document.getElementById('alipayTransferNote').value = '';
    document.getElementById('alipayTransferModalOverlay').classList.add('show');
}

function closeAlipayTransferModal() {
    document.getElementById('alipayTransferModalOverlay').classList.remove('show');
}

function confirmAlipayTransfer() {
    const amount = document.getElementById('alipayTransferAmount').value;
    const note = document.getElementById('alipayTransferNote').value.trim() || '转账';
    
    if (!amount || parseFloat(amount) <= 0) {
        return alert('请输入正确的转账金额！');
    }

    const transferAmount = parseFloat(amount);
    let myBalance = parseFloat(ChatDB.getItem(`alipay_balance_${currentAlipayLoginId}`) || '0');
    
    if (myBalance < transferAmount) {
        return alert('支付宝余额不足！');
    }

    // 扣款
    myBalance -= transferAmount;
    ChatDB.setItem(`alipay_balance_${currentAlipayLoginId}`, myBalance.toFixed(2));
    
    // 对方加款
    let targetBalance = parseFloat(ChatDB.getItem(`alipay_balance_${currentAlipayChatCharId}`) || '0');
    targetBalance += transferAmount;
    ChatDB.setItem(`alipay_balance_${currentAlipayChatCharId}`, targetBalance.toFixed(2));

    // 账单记录
    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }
    const targetChar = allEntities.find(c => c.id === currentAlipayChatCharId);
    const targetName = targetChar ? (targetChar.netName || targetChar.name) : '对方';
    const me = allEntities.find(a => a.id === currentAlipayLoginId);
    const myName = me ? (me.netName || me.name) : '对方';

    addAlipayRecord(currentAlipayLoginId, 'out', `转账给 ${targetName}`, transferAmount);
    addAlipayRecord(currentAlipayChatCharId, 'in', `收到 ${myName} 的转账`, transferAmount);

    // 插入聊天记录 (直接到账)
    let newMsg = {
        role: 'user',
        type: 'transfer',
        amount: transferAmount.toFixed(2),
        note: note,
        status: 'received', // 直接到账
        content: '[支付宝转账]',
        timestamp: Date.now()
    };

    let history = JSON.parse(ChatDB.getItem(`alipay_chat_history_${currentAlipayLoginId}_${currentAlipayChatCharId}`) || '[]');
    history.push(newMsg);
    ChatDB.setItem(`alipay_chat_history_${currentAlipayLoginId}_${currentAlipayChatCharId}`, JSON.stringify(history));

    let targetHistory = JSON.parse(ChatDB.getItem(`alipay_chat_history_${currentAlipayChatCharId}_${currentAlipayLoginId}`) || '[]');
    targetHistory.push({ ...newMsg, role: 'char' });
    ChatDB.setItem(`alipay_chat_history_${currentAlipayChatCharId}_${currentAlipayLoginId}`, JSON.stringify(targetHistory));

    // 触发 Char 感知系统 (大模型会知道你通过支付宝转了账)
    if (typeof injectCharPerception === 'function') {
        injectCharPerception('alipay_transfer', transferAmount.toFixed(2), currentAlipayChatCharId);
    }

    closeAlipayTransferModal();
    renderAlipayChatHistory();
    renderAlipayChatList();
    alert('转账成功，已直接到账！');
}

// 渲染我的页面数据
function renderAlipayData() {
    if (!currentAlipayLoginId) return;

    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }
    
    const me = allEntities.find(a => a.id === currentAlipayLoginId);
    if (me) {
        document.getElementById('alipayProfileName').innerText = me.netName || me.name || '未命名';
        document.getElementById('alipayProfileAccount').innerText = '账号: ' + (me.account || '--');
        const avatarEl = document.getElementById('alipayProfileAvatar');
        avatarEl.style.backgroundImage = me.avatarUrl ? `url('${me.avatarUrl}')` : '';
    }

    let balance = parseFloat(ChatDB.getItem(`alipay_balance_${currentAlipayLoginId}`) || '0');
    document.getElementById('alipayBalanceText').innerText = balance.toFixed(2);

    const listEl = document.getElementById('alipayHistoryList');
    listEl.innerHTML = '';
    let history = JSON.parse(ChatDB.getItem(`alipay_history_${currentAlipayLoginId}`) || '[]');
    
    if (history.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#888; font-size:12px; padding:20px 0;">暂无账单记录</div>';
    } else {
        history.slice().reverse().forEach(record => {
            const item = document.createElement('div');
            item.className = 'alipay-bill-item';
            const date = new Date(record.timestamp);
            const timeStr = `${date.getMonth()+1}月${date.getDate()}日 ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
            
            item.innerHTML = `
                <div class="alipay-bill-info">
                    <div class="alipay-bill-name">${record.title}</div>
                    <div class="alipay-bill-time">${timeStr}</div>
                </div>
                <div class="alipay-bill-amount ${record.type === 'out' ? 'minus' : 'plus'}">${record.type === 'out' ? '-' : '+'}${parseFloat(record.amount).toFixed(2)}</div>
            `;
            listEl.appendChild(item);
        });
    }
}

// 添加账单记录
function addAlipayRecord(accountId, type, title, amount) {
    let history = JSON.parse(ChatDB.getItem(`alipay_history_${accountId}`) || '[]');
    history.push({
        id: Date.now().toString(),
        type: type, // 'out', 'in'
        title: title,
        amount: parseFloat(amount).toFixed(2),
        timestamp: Date.now()
    });
    ChatDB.setItem(`alipay_history_${accountId}`, JSON.stringify(history));
}

// 玩游戏赚钱
function alipayPlayGame(rewardAmount) {
    if (!currentAlipayLoginId) return alert('请先登录！');
    
    let balance = parseFloat(ChatDB.getItem(`alipay_balance_${currentAlipayLoginId}`) || '0');
    balance += rewardAmount;
    ChatDB.setItem(`alipay_balance_${currentAlipayLoginId}`, balance.toFixed(2));
    
    addAlipayRecord(currentAlipayLoginId, 'in', '互动游戏奖励', rewardAmount);
    alert(`恭喜！完成任务获得 ${rewardAmount} 元奖励，已存入支付宝余额。`);
    
    if (document.getElementById('alipay-page-me').classList.contains('active')) {
        renderAlipayData();
    }
}

// 清空账单记录
function clearAlipayHistory() {
    if (!currentAlipayLoginId) return;
    if (confirm('确定要清空支付宝账单记录吗？（余额不会清空）')) {
        ChatDB.setItem(`alipay_history_${currentAlipayLoginId}`, '[]');
        renderAlipayData();
    }
}

// --- 设置页面逻辑 ---
function openAlipaySettings() {
    document.getElementById('alipaySettingsPage').classList.remove('hidden');
    renderAlipaySwitchAccounts();
}

function closeAlipaySettings() {
    document.getElementById('alipaySettingsPage').classList.add('hidden');
}

// ==========================================
// 沙威玛传奇 游戏逻辑
// ==========================================
const swmFoodData = {
    'bread': { svg: '<ellipse cx="12" cy="12" rx="8" ry="10"></ellipse>', fill: '#f0c880', stroke: '#d4a352' },
    'meat': { svg: '<path d="M4 10c4-4 12-4 16 0M4 14c4-4 12-4 16 0M4 18c4-4 12-4 16 0"></path>', fill: '#8a3a18', stroke: '#5c220b' },
    'fries': { svg: '<rect x="6" y="6" width="3" height="12" rx="1"></rect><rect x="10.5" y="4" width="3" height="14" rx="1"></rect><rect x="15" y="8" width="3" height="10" rx="1"></rect>', fill: '#ffb300', stroke: '#d48806' },
    'garlic': { svg: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>', fill: '#fff9e6', stroke: '#d4a352' },
    'pickle': { svg: '<rect x="7" y="4" width="10" height="16" rx="5"></rect><line x1="10" y1="8" x2="14" y2="8"></line><line x1="10" y1="12" x2="14" y2="12"></line>', fill: '#2d6a30', stroke: '#1b401d' },
    'tomato': { svg: '<circle cx="12" cy="13" r="8"></circle><path d="M12 5v3M9 6l3 2M15 6l-3 2" stroke="#2d6a30" stroke-width="2"></path>', fill: '#e53935', stroke: '#b71c1c' },
    'syrup': { svg: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>', fill: '#880e4f', stroke: '#4a0024' },
    'cola': { svg: '<path d="M6 5h12l-1 17H7L6 5z"></path><line x1="12" y1="5" x2="15" y2="1" stroke="#111" stroke-width="2"></line>', fill: '#3e2723', stroke: '#111' }
};

const swmAvatars = ['🧔', '👱‍♀️', '👴', '👦', '👩‍🦰', '👮‍♂️', '👨‍🍳', '👩‍⚕️'];

let swmGameState = {
    day: 1,
    coins: 0,
    meatInTray: 0,
    friesState: 'empty', // empty, frying, cooked, burnt
    friesInTray: 0,
    drinkState: 'empty', // empty, pouring, ready
    plate: [],
    plateStatus: 'empty', // empty, bread, rolled, packaged
    upgrades: { autoCut: false, syrup: false, priceBonus: 0 }
};

let swmCustomers = [
    { active: false, order: { sandwich: [], drink: false }, patience: 100, timer: null },
    { active: false, order: { sandwich: [], drink: false }, patience: 100, timer: null }
];

let swmAutoCutInterval = null;

function openShawarmaGame() {
    if (!currentAlipayLoginId) return alert('请先登录支付宝！');
    document.getElementById('shawarmaPanel').classList.add('show');
    swmInit();
}

function closeShawarmaGame() {
    document.getElementById('shawarmaPanel').classList.remove('show');
    clearInterval(swmAutoCutInterval);
    swmCustomers.forEach(c => clearInterval(c.timer));
}

function swmInit() {
    swmGameState = {
        day: 1, coins: 0, meatInTray: 0, friesState: 'empty', friesInTray: 0, drinkState: 'empty',
        plate: [], plateStatus: 'empty', upgrades: { autoCut: false, syrup: false, priceBonus: 0 }
    };
    swmCustomers.forEach(c => { c.active = false; clearInterval(c.timer); });
    document.getElementById('swmCustomer0').classList.remove('active');
    document.getElementById('swmCustomer1').classList.remove('active');
    swmTrashFood();
    swmResetFryerUI();
    document.getElementById('swmDrinkFill').style.height = '0%';
    
    swmUpdateUI();
    swmSpawnCustomer(0);
    setTimeout(() => swmSpawnCustomer(1), 3000);
    
    clearInterval(swmAutoCutInterval);
    swmAutoCutInterval = setInterval(() => {
        if(swmGameState.upgrades.autoCut && swmGameState.meatInTray < 5) {
            swmCutMeat(true);
        }
    }, 2000);
}

function swmUpdateUI() {
    document.getElementById('swmCoinText').innerText = swmGameState.coins;
    document.getElementById('swmDayDisplay').innerText = `DAY ${swmGameState.day}`;
    
    const meatTray = document.getElementById('swmMeatTray');
    meatTray.innerHTML = '';
    for(let i=0; i<swmGameState.meatInTray; i++) {
        meatTray.innerHTML += '<div class="swm-meat-piece"></div>';
    }

    const friesTray = document.getElementById('swmFriesTray');
    friesTray.innerHTML = '';
    for(let i=0; i<swmGameState.friesInTray; i++) {
        friesTray.innerHTML += '<div class="swm-fries-piece"></div>';
    }
}

function swmSpawnCustomer(index) {
    const c = swmCustomers[index];
    c.active = true;
    c.patience = 100;
    
    c.order.sandwich = ['bread', 'meat'];
    const possibleExtras = ['garlic', 'pickle', 'tomato'];
    if(swmGameState.upgrades.syrup) possibleExtras.push('syrup');
    
    const maxIng = Math.min(4, 1 + Math.floor(swmGameState.day / 2));
    const extraCount = Math.floor(Math.random() * maxIng) + 1;
    for(let i=0; i<extraCount; i++) {
        c.order.sandwich.push(possibleExtras[Math.floor(Math.random() * possibleExtras.length)]);
    }
    
    c.order.drink = Math.random() < 0.3;

    const bubble = document.getElementById(`swmReqBubble${index}`);
    bubble.innerHTML = '';
    
    const counts = {};
    c.order.sandwich.forEach(i => counts[i] = (counts[i] || 0) + 1);
    let sandwichHtml = `<div style="border:1px solid #ccc; border-radius:8px; padding:2px 4px; display:flex; gap:2px;">`;
    for (const [key, count] of Object.entries(counts)) {
        const food = swmFoodData[key];
        sandwichHtml += `<div class="swm-req-icon"><svg viewBox="0 0 24 24" fill="${food.fill}" stroke="${food.stroke}" stroke-width="1.5">${food.svg}</svg></div>`;
    }
    sandwichHtml += `</div>`;
    bubble.innerHTML += sandwichHtml;

    if(c.order.drink) {
        bubble.innerHTML += `<div class="swm-req-icon"><svg viewBox="0 0 24 24" fill="${swmFoodData['cola'].fill}" stroke="${swmFoodData['cola'].stroke}" stroke-width="1.5">${swmFoodData['cola'].svg}</svg></div>`;
    }

    document.getElementById(`swmAvatar${index}`).innerText = swmAvatars[Math.floor(Math.random() * swmAvatars.length)];
    document.getElementById(`swmCustomer${index}`).classList.add('active');

    clearInterval(c.timer);
    c.timer = setInterval(() => {
        c.patience -= (1 + swmGameState.day * 0.2);
        swmUpdatePatienceBar(index);
        if(c.patience <= 0) {
            clearInterval(c.timer);
            document.getElementById(`swmCustomer${index}`).classList.remove('active');
            swmShowToast("顾客等太久走啦！");
            setTimeout(() => swmSpawnCustomer(index), 2000);
        }
    }, 1000);
}

function swmUpdatePatienceBar(index) {
    const bar = document.getElementById(`swmPatience${index}`);
    const p = swmCustomers[index].patience;
    bar.style.width = Math.max(0, p) + '%';
    bar.className = 'swm-patience-fill';
    if(p < 30) bar.classList.add('low');
    else if(p < 60) bar.classList.add('medium');
}

let swmManualCutClicks = 0;
function swmCutMeat(isAuto = false) {
    if(swmGameState.meatInTray >= 5) return;
    
    const spit = document.getElementById('swmMeatSpit');
    spit.style.transform = 'scaleX(0.9)';
    setTimeout(() => spit.style.transform = 'scaleX(1)', 100);

    if(isAuto) {
        swmGameState.meatInTray++;
        swmUpdateUI();
    } else {
        swmManualCutClicks++;
        if(swmManualCutClicks >= 3) {
            swmManualCutClicks = 0;
            swmGameState.meatInTray++;
            swmUpdateUI();
        }
    }
}

function swmTakeMeat() {
    if(swmGameState.meatInTray > 0) {
        if(swmAddIngredientToBoard('meat')) {
            swmGameState.meatInTray--;
            swmUpdateUI();
        }
    }
}

let swmFryTimer;
function swmHandleFryer() {
    if(swmGameState.friesState === 'empty') {
        swmGameState.friesState = 'frying';
        const pot = document.getElementById('swmFryerPot');
        const text = document.getElementById('swmFryerText');
        pot.classList.add('frying');
        text.innerText = '炸制中';

        swmFryTimer = setTimeout(() => {
            swmGameState.friesState = 'cooked';
            pot.classList.remove('frying');
            document.getElementById('swmFryerOil').style.background = '#ffb300';
            text.innerText = '熟了!';
            
            swmFryTimer = setTimeout(() => {
                if(swmGameState.friesState === 'cooked') {
                    swmGameState.friesState = 'burnt';
                    document.getElementById('swmFryerOil').style.background = '#333333';
                    text.innerText = '糊了!';
                }
            }, 5000);
        }, 3000);
    } else if(swmGameState.friesState === 'cooked') {
        clearTimeout(swmFryTimer);
        swmGameState.friesState = 'empty';
        swmGameState.friesInTray = Math.min(5, swmGameState.friesInTray + 3);
        swmResetFryerUI();
        swmUpdateUI();
    } else if(swmGameState.friesState === 'burnt') {
        swmGameState.friesState = 'empty';
        swmResetFryerUI();
        swmShowToast("糊掉的薯条被扔了");
    }
}

function swmResetFryerUI() {
    const pot = document.getElementById('swmFryerPot');
    pot.classList.remove('frying');
    document.getElementById('swmFryerOil').style.height = '0%';
    document.getElementById('swmFryerOil').style.background = 'rgba(255, 193, 7, 0.6)';
    document.getElementById('swmFryerText').innerText = '下锅';
}

function swmTakeFries() {
    if(swmGameState.friesInTray > 0) {
        if(swmAddIngredientToBoard('fries')) {
            swmGameState.friesInTray--;
            swmUpdateUI();
        }
    }
}

function swmHandleDrink() {
    const fill = document.getElementById('swmDrinkFill');
    if(swmGameState.drinkState === 'empty') {
        swmGameState.drinkState = 'pouring';
        fill.style.height = '100%';
        setTimeout(() => {
            swmGameState.drinkState = 'ready';
        }, 2000);
    } else if(swmGameState.drinkState === 'ready') {
        let served = false;
        for(let i=0; i<2; i++) {
            const c = swmCustomers[i];
            if(c.active && c.order.drink) {
                c.order.drink = false;
                served = true;
                swmShowFloatingText('+5', `swmCustomer${i}`);
                swmGameState.coins += 5;
                swmUpdateUI();
                
                const bubble = document.getElementById(`swmReqBubble${i}`);
                if(bubble.lastChild.innerHTML.includes('M6 5h12')) {
                    bubble.removeChild(bubble.lastChild);
                }
                
                swmCheckOrderComplete(i);
                break;
            }
        }
        
        if(served) {
            swmGameState.drinkState = 'empty';
            fill.style.transition = 'none';
            fill.style.height = '0%';
            setTimeout(() => fill.style.transition = 'height 2s linear', 50);
        } else {
            swmShowToast("没有顾客需要饮料！");
        }
    }
}

function swmAddIngredient(item) {
    swmAddIngredientToBoard(item);
}

function swmAddIngredientToBoard(item) {
    if(swmGameState.plateStatus === 'rolled' || swmGameState.plateStatus === 'packaged') {
        swmShowToast("已经卷起来了！");
        return false;
    }
    
    const base = document.getElementById('swmWrapBase');
    
    if(item === 'bread') {
        if(swmGameState.plateStatus !== 'empty') {
            swmShowToast("砧板上已经有东西了！");
            return false;
        }
        swmGameState.plateStatus = 'bread';
        base.classList.add('has-bread');
        document.getElementById('swmBoardHint').style.display = 'none';
        swmGameState.plate.push('bread');
        return true;
    }

    if(swmGameState.plateStatus !== 'bread') {
        swmShowToast("请先放一张饼皮！");
        return false;
    }

    if(swmGameState.plate.length >= 8) {
        swmShowToast("放不下啦！");
        return false;
    }

    swmGameState.plate.push(item);
    const food = swmFoodData[item];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "swm-added-item");
    svg.setAttribute("fill", food.fill);
    svg.setAttribute("stroke", food.stroke);
    svg.setAttribute("stroke-width", "1.5");
    svg.innerHTML = food.svg;
    base.appendChild(svg);
    return true;
}

function swmRollWrap() {
    if(swmGameState.plateStatus !== 'bread') return swmShowToast("无法操作！");
    if(!swmGameState.plate.includes('meat')) return swmShowToast("必须加烤肉！");
    
    swmGameState.plateStatus = 'rolled';
    const base = document.getElementById('swmWrapBase');
    base.innerHTML = '<div style="font-weight:900; color:#fff; font-size:16px;">沙威玛</div>';
    base.className = 'swm-wrap-base rolled';
}

function swmPackageWrap() {
    if(swmGameState.plateStatus !== 'rolled') return swmShowToast("请先卷起来！");
    
    swmGameState.plateStatus = 'packaged';
    const base = document.getElementById('swmWrapBase');
    base.innerHTML = '<div style="font-weight:900; color:#111; font-size:16px; background:#fff; padding:2px 8px; border-radius:8px;">已包装</div>';
    base.className = 'swm-wrap-base packaged';
}

function swmTrashFood() {
    swmGameState.plate = [];
    swmGameState.plateStatus = 'empty';
    const base = document.getElementById('swmWrapBase');
    base.className = 'swm-wrap-base';
    base.innerHTML = '<span class="swm-board-hint" id="swmBoardHint">放饼皮</span>';
}

function swmServeCustomer(index) {
    if(swmGameState.plateStatus !== 'packaged') {
        return swmShowToast("请先完成沙威玛的包装！");
    }

    const c = swmCustomers[index];
    if(!c.active) return;

    const sortedOrder = [...c.order.sandwich].sort().join(',');
    const sortedPlate = [...swmGameState.plate].sort().join(',');

    if(sortedOrder === sortedPlate) {
        c.order.sandwich = []; 
        
        let reward = swmGameState.plate.length * 5 + swmGameState.upgrades.priceBonus;
        swmGameState.coins += reward;
        swmShowFloatingText(`+${reward}`, `swmCustomer${index}`);
        
        swmTrashFood(); 
        swmCheckOrderComplete(index);
    } else {
        swmShowToast("配方不对哦！");
    }
}

function swmCheckOrderComplete(index) {
    const c = swmCustomers[index];
    if(c.order.sandwich.length === 0 && !c.order.drink) {
        clearInterval(c.timer);
        
        const patienceBonus = Math.floor(c.patience / 10);
        let totalReward = patienceBonus;
        if(patienceBonus > 0) {
            swmGameState.coins += patienceBonus;
            setTimeout(() => swmShowFloatingText(`+${patienceBonus} 小费`, `swmCustomer${index}`), 500);
        }
        
        // 核心：将赚到的钱同步到支付宝余额
        let alipayBalance = parseFloat(ChatDB.getItem(`alipay_balance_${currentAlipayLoginId}`) || '0');
        // 假设这单总共赚了 (沙威玛钱 + 饮料钱 + 小费)，为了简化，我们直接给支付宝加 10 元作为完成一单的奖励
        alipayBalance += 10;
        ChatDB.setItem(`alipay_balance_${currentAlipayLoginId}`, alipayBalance.toFixed(2));
        addAlipayRecord(currentAlipayLoginId, 'in', '沙威玛传奇营业收入', 10);
        if (document.getElementById('alipay-page-me').classList.contains('active')) {
            renderAlipayData();
        }
        
        swmUpdateUI();
        document.getElementById(`swmCustomer${index}`).classList.remove('active');
        
        if(swmGameState.coins >= swmGameState.day * 100) {
            swmGameState.day++;
            swmShowLevelUp();
        }
        
        setTimeout(() => swmSpawnCustomer(index), 1500);
    }
}

function swmOpenShop() { document.getElementById('swmShopModal').classList.add('show'); }
function swmCloseShop() { document.getElementById('swmShopModal').classList.remove('show'); }

function swmBuyUpgrade(type, price) {
    if(swmGameState.coins >= price) {
        swmGameState.coins -= price;
        swmGameState.upgrades[type] = true;
        if(type === 'price') swmGameState.upgrades.priceBonus = 5;
        
        swmUpdateUI();
        
        const btn = document.getElementById(`swm-upg-${type}`);
        btn.innerText = '已购买';
        btn.classList.add('sold');
        
        if(type === 'syrup') {
            const grid = document.getElementById('swmIngredientsGrid');
            grid.innerHTML += `
                <div class="swm-ing-box" style="border-color: #880e4f;" onclick="swmAddIngredient('syrup')">
                    <svg viewBox="0 0 24 24" fill="#880e4f" stroke="#4a0024" stroke-width="1.5"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>
                    <span class="swm-ing-name">石榴糖浆</span>
                </div>
            `;
        }
    } else {
        swmShowToast("金币不足！");
    }
}

function swmShowFloatingText(text, targetId) {
    const target = document.getElementById(targetId);
    const rect = target.getBoundingClientRect();
    
    const floatEl = document.createElement('div');
    floatEl.className = 'swm-floating-text';
    floatEl.innerText = text;
    floatEl.style.left = (rect.left + rect.width / 2 - 15) + 'px';
    floatEl.style.top = (rect.top + 20) + 'px';
    
    document.body.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 1000);
}

function swmShowLevelUp() {
    const overlay = document.getElementById('swmLevelUpOverlay');
    document.getElementById('swmLevelUpTitle').innerText = `DAY ${swmGameState.day}`;
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 2000);
}

let swmToastTimer;
function swmShowToast(msg) {
    const toast = document.getElementById('swmToastMsg');
    toast.innerText = msg;
    toast.classList.add('show');
    clearTimeout(swmToastTimer);
    swmToastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
}

// 渲染快捷切换账号列表
function renderAlipaySwitchAccounts() {

    const listEl = document.getElementById('alipaySwitchAccountList');
    listEl.innerHTML = '';
    
    let allEntities = [];
    if (typeof getAllEntities === 'function') {
        allEntities = getAllEntities();
    } else {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        allEntities = chars.concat(accounts);
    }

    // 过滤掉当前正在登录的账号，并且只显示用户账号
    const otherAccounts = allEntities.filter(acc => acc.isAccount && acc.id !== currentAlipayLoginId);

    if (otherAccounts.length === 0) {
        listEl.innerHTML = '<div style="padding: 16px 20px; font-size: 14px; color: #888; text-align: center;">暂无其他账号可切换</div>';
        return;
    }

    otherAccounts.forEach(acc => {
        const item = document.createElement('div');
        item.className = 'alipay-settings-item';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background-color: #eee; background-image: url('${acc.avatarUrl || ''}'); background-size: cover; background-position: center;"></div>
                <span>${acc.netName || acc.name || '未命名'}</span>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ccc" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        
        item.onclick = () => {
            alipayLogin(acc.id);
            closeAlipaySettings();
            alert(`已切换至账号: ${acc.netName || acc.name}`);
        };
        
        listEl.appendChild(item);
    });
}

// ==========================================
// 每日签到逻辑
// ==========================================
function openAlipayCheckin() {
    if (!currentAlipayLoginId) return alert('请先登录支付宝！');
    document.getElementById('alipay-page-checkin').classList.add('active');
    renderAlipayCheckin();
}

function closeAlipayCheckin() {
    document.getElementById('alipay-page-checkin').classList.remove('active');
}

function renderAlipayCheckin() {
    const data = JSON.parse(ChatDB.getItem(`alipay_checkin_data_${currentAlipayLoginId}`) || '{"lastCheckinDate":"","streak":0,"history":[]}');
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

    // 检查断签：如果最后签到日期既不是今天也不是昨天，且连续签到大于0，则断签重置
    if (data.lastCheckinDate !== todayStr && data.lastCheckinDate !== yesterdayStr && data.streak > 0) {
        data.streak = 0;
        ChatDB.setItem(`alipay_checkin_data_${currentAlipayLoginId}`, JSON.stringify(data));
    }

    document.getElementById('aliCheckinStreak').innerText = data.streak;
    // 进度条按 7 天一个周期计算
    const progress = Math.min(100, ((data.streak % 7) / 7) * 100);
    document.getElementById('aliCheckinProgress').style.width = `${progress === 0 && data.streak > 0 ? 100 : progress}%`;

    const btn = document.getElementById('aliCheckinBtn');
    if (data.lastCheckinDate === todayStr) {
        btn.innerText = '今日已签到';
        btn.style.background = '#ccc';
        btn.style.boxShadow = 'none';
        btn.style.pointerEvents = 'none';
    } else {
        btn.innerText = '立即签到';
        btn.style.background = 'var(--ali-text-main)';
        btn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
        btn.style.pointerEvents = 'auto';
    }

    // 渲染日历
    document.getElementById('aliCalendarMonth').innerText = `${now.getFullYear()}年${now.getMonth()+1}月`;
    const grid = document.getElementById('aliCalendarGrid');
    grid.innerHTML = '';

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // 填充空白天数
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="ali-cal-day empty"></div>`;
    }

    // 填充实际天数
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        let className = 'ali-cal-day';
        if (data.history.includes(dateStr)) {
            className += ' signed';
        } else if (dateStr === todayStr) {
            className += ' today';
        } else if (i > now.getDate()) {
            className += ' future';
        }
        grid.innerHTML += `<div class="${className}">${i}</div>`;
    }
}

function doAlipayCheckin() {
    if (!currentAlipayLoginId) return;
    let data = JSON.parse(ChatDB.getItem(`alipay_checkin_data_${currentAlipayLoginId}`) || '{"lastCheckinDate":"","streak":0,"history":[]}');
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    
    if (data.lastCheckinDate === todayStr) return;

    data.lastCheckinDate = todayStr;
    data.streak += 1;
    if (!data.history.includes(todayStr)) {
        data.history.push(todayStr);
    }
    
    ChatDB.setItem(`alipay_checkin_data_${currentAlipayLoginId}`, JSON.stringify(data));

    // 发放奖励
    let reward = 2; // 基础奖励 2 元
    let msg = `签到成功！获得 ${reward} 元奖励。`;
    
    if (data.streak % 7 === 0) {
        reward += 10; // 连续7天额外奖励 10 元
        msg = `连续签到 ${data.streak} 天！获得大礼包 ${reward} 元！`;
    }

    let balance = parseFloat(ChatDB.getItem(`alipay_balance_${currentAlipayLoginId}`) || '0');
    balance += reward;
    ChatDB.setItem(`alipay_balance_${currentAlipayLoginId}`, balance.toFixed(2));
    addAlipayRecord(currentAlipayLoginId, 'in', '每日签到奖励', reward);

    alert(msg);
    renderAlipayCheckin();
    
    // 如果我的页面是激活的，刷新余额
    if (document.getElementById('alipay-page-me').classList.contains('active')) {
        renderAlipayData();
    }
}

// ==========================================
// 俄罗斯方块 游戏逻辑
// ==========================================
let tetrisCanvas, tetrisCtx, tetrisNextCanvas, tetrisNextCtx;
let tetrisArena, tetrisPlayer;
let tetrisDropCounter = 0;
let tetrisDropInterval = 1000;
let tetrisLastTime = 0;
let tetrisIsGameOver = false;
let tetrisAnimationId;

const TETRIS_SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
    [[2,0,0], [2,2,2], [0,0,0]], // J
    [[0,0,3], [3,3,3], [0,0,0]], // L
    [[4,4], [4,4]], // O
    [[0,5,5], [5,5,0], [0,0,0]], // S
    [[0,6,0], [6,6,6], [0,0,0]], // T
    [[7,7,0], [0,7,7], [0,0,0]]  // Z
];

const TETRIS_COLORS = [
    null,
    '#00f0ff', // I - Neon Blue
    '#0055ff', // J - Deep Blue
    '#ff9500', // L - Orange
    '#ffe600', // O - Yellow
    '#39ff14', // S - Neon Green
    '#b026ff', // T - Purple
    '#ff007f'  // Z - Neon Pink
];

function openTetrisGame() {
    if (!currentAlipayLoginId) return alert('请先登录支付宝！');
    document.getElementById('tetrisPanel').classList.add('show');
    tetrisInit();
}

function closeTetrisGame() {
    document.getElementById('tetrisPanel').classList.remove('show');
    cancelAnimationFrame(tetrisAnimationId);
}

function tetrisInit() {
    if (!tetrisCanvas) {
        tetrisCanvas = document.getElementById('tetrisCanvas');
        tetrisCtx = tetrisCanvas.getContext('2d');
        tetrisNextCanvas = document.getElementById('tetrisNextCanvas');
        tetrisNextCtx = tetrisNextCanvas.getContext('2d');
        
        tetrisCtx.scale(20, 20);
        tetrisNextCtx.scale(15, 15);
        
        tetrisBindControls();
    }
    
    tetrisArena = tetrisCreateMatrix(10, 20);
    tetrisPlayer = {
        pos: {x: 0, y: 0},
        matrix: null,
        nextMatrix: null,
        score: 0,
        level: 1,
        lines: 0,
        reward: '0.00'
    };
    
    tetrisResetGame();
}

function tetrisCreateMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function tetrisDrawMatrix(matrix, offset, ctx = tetrisCtx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = TETRIS_COLORS[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x + offset.x, y + offset.y, 1, 0.2);
                ctx.fillRect(x + offset.x, y + offset.y, 0.2, 1);
                
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(x + offset.x, y + offset.y + 0.8, 1, 0.2);
                ctx.fillRect(x + offset.x + 0.8, y + offset.y, 0.2, 1);
            }
        });
    });
}

function tetrisCollide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function tetrisMerge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function tetrisArenaSweep() {
    let rowCount = 0;
    outer: for (let y = tetrisArena.length - 1; y >= 0; --y) {
        for (let x = 0; x < tetrisArena[y].length; ++x) {
            if (tetrisArena[y][x] === 0) {
                continue outer;
            }
        }
        const row = tetrisArena.splice(y, 1)[0].fill(0);
        tetrisArena.unshift(row);
        ++y;
        rowCount++;
    }
    
    if (rowCount > 0) {
        const baseScores = [0, 100, 300, 500, 800];
        tetrisPlayer.score += baseScores[rowCount] * tetrisPlayer.level;
        tetrisPlayer.lines += rowCount;
        
        if (tetrisPlayer.lines >= tetrisPlayer.level * 10) {
            tetrisPlayer.level++;
            tetrisDropInterval = Math.max(100, 1000 - (tetrisPlayer.level - 1) * 100);
            tetrisShowToast(`LEVEL UP!<br>SPEED INCREASED`);
        }
        
        // 核心修改：降低赚钱门槛，100分 = 1元 (消除1行得100分)
        tetrisPlayer.reward = (tetrisPlayer.score / 100).toFixed(2);
        tetrisUpdateScore();
    }
}

function tetrisCreatePiece() {
    const pieces = 'IJLOSTZ';
    const type = pieces[Math.floor(Math.random() * pieces.length)];
    const index = pieces.indexOf(type) + 1;
    return JSON.parse(JSON.stringify(TETRIS_SHAPES[index]));
}

function tetrisPlayerReset() {
    if (!tetrisPlayer.nextMatrix) {
        tetrisPlayer.nextMatrix = tetrisCreatePiece();
    }
    tetrisPlayer.matrix = tetrisPlayer.nextMatrix;
    tetrisPlayer.nextMatrix = tetrisCreatePiece();
    
    tetrisPlayer.pos.y = 0;
    tetrisPlayer.pos.x = Math.floor(tetrisArena[0].length / 2) - Math.floor(tetrisPlayer.matrix[0].length / 2);
    
    if (tetrisCollide(tetrisArena, tetrisPlayer)) {
        tetrisIsGameOver = true;
        document.getElementById('tetrisGameOverScreen').classList.add('show');
        
        let reward = parseFloat(tetrisPlayer.reward);
        if(reward > 0) {
            if (!currentAlipayLoginId) {
                tetrisShowToast(`GAME OVER<br>未登录，无法获得奖励`);
            } else {
                tetrisShowToast(`GAME OVER<br>EARNED ¥${tetrisPlayer.reward}`);
                
                // 核心修改：将奖励真实打入支付宝余额，并生成账单
                let balance = parseFloat(ChatDB.getItem(`alipay_balance_${currentAlipayLoginId}`) || '0');
                balance += reward;
                ChatDB.setItem(`alipay_balance_${currentAlipayLoginId}`, balance.toFixed(2));
                addAlipayRecord(currentAlipayLoginId, 'in', '俄罗斯方块奖励', reward);
                
                // 如果当前停留在支付宝“我的”页面，实时刷新余额显示
                if (document.getElementById('alipay-page-me').classList.contains('active')) {
                    renderAlipayData();
                }
            }
        }
    }
    tetrisDrawNext();
}

function tetrisPlayerDrop() {
    tetrisPlayer.pos.y++;
    if (tetrisCollide(tetrisArena, tetrisPlayer)) {
        tetrisPlayer.pos.y--;
        tetrisMerge(tetrisArena, tetrisPlayer);
        tetrisPlayerReset();
        tetrisArenaSweep();
    }
    tetrisDropCounter = 0;
}

function tetrisPlayerMove(offset) {
    tetrisPlayer.pos.x += offset;
    if (tetrisCollide(tetrisArena, tetrisPlayer)) {
        tetrisPlayer.pos.x -= offset;
    }
}

function tetrisPlayerRotate() {
    const pos = tetrisPlayer.pos.x;
    let offset = 1;
    tetrisRotate(tetrisPlayer.matrix);
    while (tetrisCollide(tetrisArena, tetrisPlayer)) {
        tetrisPlayer.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > tetrisPlayer.matrix[0].length) {
            tetrisRotate(tetrisPlayer.matrix, -1);
            tetrisPlayer.pos.x = pos;
            return;
        }
    }
}

function tetrisRotate(matrix, dir = 1) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function tetrisPlayerHardDrop() {
    while (!tetrisCollide(tetrisArena, tetrisPlayer)) {
        tetrisPlayer.pos.y++;
    }
    tetrisPlayer.pos.y--;
    tetrisMerge(tetrisArena, tetrisPlayer);
    tetrisPlayerReset();
    tetrisArenaSweep();
    tetrisDropCounter = 0;
}

function tetrisDraw() {
    tetrisCtx.fillStyle = '#000';
    tetrisCtx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

    tetrisDrawMatrix(tetrisArena, {x: 0, y: 0});
    tetrisDrawMatrix(tetrisPlayer.matrix, tetrisPlayer.pos);
}

function tetrisDrawNext() {
    tetrisNextCtx.fillStyle = '#000';
    tetrisNextCtx.fillRect(0, 0, tetrisNextCanvas.width, tetrisNextCanvas.height);
    
    const offset = {
        x: 2 - tetrisPlayer.nextMatrix[0].length / 2,
        y: 2 - tetrisPlayer.nextMatrix.length / 2
    };
    tetrisDrawMatrix(tetrisPlayer.nextMatrix, offset, tetrisNextCtx);
}

function tetrisUpdateScore() {
    document.getElementById('tetrisScoreVal').innerText = tetrisPlayer.score;
    document.getElementById('tetrisLevelVal').innerText = tetrisPlayer.level;
    document.getElementById('tetrisLinesVal').innerText = tetrisPlayer.lines;
    document.getElementById('tetrisRewardVal').innerText = `¥${tetrisPlayer.reward}`;
}

function tetrisUpdate(time = 0) {
    if (tetrisIsGameOver) return;
    
    const deltaTime = time - tetrisLastTime;
    tetrisLastTime = time;
    tetrisDropCounter += deltaTime;
    
    if (tetrisDropCounter > tetrisDropInterval) {
        tetrisPlayerDrop();
    }
    
    tetrisDraw();
    tetrisAnimationId = requestAnimationFrame(tetrisUpdate);
}

function tetrisResetGame() {
    tetrisArena.forEach(row => row.fill(0));
    tetrisPlayer.score = 0;
    tetrisPlayer.level = 1;
    tetrisPlayer.lines = 0;
    tetrisPlayer.reward = '0.00';
    tetrisDropInterval = 1000;
    tetrisUpdateScore();
    tetrisIsGameOver = false;
    document.getElementById('tetrisGameOverScreen').classList.remove('show');
    tetrisPlayerReset();
    tetrisUpdate();
}

let tetrisToastTimer;
function tetrisShowToast(msg) {
    const toast = document.getElementById('tetrisToastMsg');
    toast.innerHTML = msg;
    toast.classList.add('show');
    clearTimeout(tetrisToastTimer);
    tetrisToastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

function tetrisBindControls() {
    function bindBtn(id, action, continuous = false) {
        const btn = document.getElementById(id);
        if (!btn) return;
        let interval = null;
        
        const startAction = (e) => {
            e.preventDefault();
            if (tetrisIsGameOver) return;
            
            // 核心修复：防止多点触控或鼠标/触摸同时触发导致产生多个无法清除的定时器
            if (interval !== null) {
                clearInterval(interval);
                interval = null;
            }
            
            if (action) action();
            
            if (continuous && action) {
                interval = setInterval(action, 80); // 稍微调快一点连续移动的速度，手感更好
            }
        };
        
        const stopAction = (e) => {
            e.preventDefault();
            if (interval !== null) {
                clearInterval(interval);
                interval = null;
            }
        };

        btn.addEventListener('touchstart', startAction, {passive: false});
        btn.addEventListener('touchend', stopAction);
        btn.addEventListener('touchcancel', stopAction); // 增加 touchcancel 防止手指滑出屏幕导致未触发 touchend
        btn.addEventListener('mousedown', startAction);
        btn.addEventListener('mouseup', stopAction);
        btn.addEventListener('mouseleave', stopAction);
    }

    bindBtn('tetrisBtnLeft', () => tetrisPlayerMove(-1), true);
    bindBtn('tetrisBtnRight', () => tetrisPlayerMove(1), true);
    bindBtn('tetrisBtnDown', () => tetrisPlayerDrop(), true);
    bindBtn('tetrisBtnUp', null, false); // 上键仅占位，不绑定任何动作
    bindBtn('tetrisBtnRotate', () => tetrisPlayerRotate(), false); // A键旋转
    bindBtn('tetrisBtnDrop', () => tetrisPlayerHardDrop(), false); // B键直接下落
}
