// =========================================
// Gmail APP 专属逻辑
// ==========================================
let gmailMails = [];
let gmailCurrentFolder = 'inbox';
let gmailCurrentUser = null; // 记录当前登录的用户账号

// 长按菜单相关变量
let gmailLongPressTimer;
let gmailTargetMailId = null;

// 从本地存储加载当前账号的邮件数据
function loadGmailData() {
    if (!gmailCurrentUser) return;
    const data = ChatDB.getItem('gmail_mails_' + gmailCurrentUser.account);
    gmailMails = data ? JSON.parse(data) : [];
}

// 保存当前账号的邮件数据到本地存储
function saveGmailData() {
    if (!gmailCurrentUser) return;
    ChatDB.setItem('gmail_mails_' + gmailCurrentUser.account, JSON.stringify(gmailMails));
}

// 更新主页右上角头像
function updateGmailTopAvatar() {
    const avatarEl = document.getElementById('gmail-top-avatar');
    if (gmailCurrentUser.avatarUrl) {
        avatarEl.style.backgroundImage = `url('${gmailCurrentUser.avatarUrl}')`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = (gmailCurrentUser.netName || 'U').charAt(0).toUpperCase();
    }
}

function openGmailApp() {
    document.getElementById('gmailAppPanel').style.display = 'flex';
    
    // 检查是否有上次登录的记录
    const savedUser = ChatDB.getItem('gmail_current_user');
    if (savedUser) {
        gmailCurrentUser = JSON.parse(savedUser);
        loadGmailData();
        updateGmailTopAvatar();
        gmailShowPage('gmail-main-page');
    } else {
        gmailShowPage('gmail-login-page');
        gmailRenderAccountList();
    }
}

function closeGmailApp() {
    document.getElementById('gmailAppPanel').style.display = 'none';
}

function gmailShowPage(pageId) {
    document.querySelectorAll('.gmail-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'gmail-main-page') {
        gmailRenderMailList();
    } else if (pageId === 'gmail-compose-page') {
        // 自动填充发件人账号并补上 @gmail.com
        const fromInput = document.getElementById('gmail-compose-from');
        if (gmailCurrentUser && gmailCurrentUser.account) {
            fromInput.value = gmailCurrentUser.account + '@gmail.com';
        } else {
            fromInput.value = 'user@gmail.com';
        }
        
        document.getElementById('gmail-compose-to').value = '';
        document.getElementById('gmail-compose-subject').value = '';
        document.getElementById('gmail-compose-body').value = '';
        
        // 隐藏下拉框
        const dropdown = document.getElementById('gmail-char-dropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
}

// 渲染快捷登录账号列表 (只读取真实用户账号)
function gmailRenderAccountList() {
    const listEl = document.getElementById('gmailAccountList');
    listEl.innerHTML = '';
    
    // 从 ChatDB 获取用户账号 (排除角色)
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    
    if (accounts.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#5f6368; font-size:14px; padding:20px;">暂无用户账号，请先在 Chat 中注册</div>';
        return;
    }

    accounts.forEach(acc => {
        const item = document.createElement('div');
        item.className = 'gmail-account-card';
        item.onclick = () => gmailQuickLogin(acc);
        
        const avatarHtml = acc.avatarUrl 
            ? `<div class="gmail-account-avatar" style="background-image: url('${acc.avatarUrl}')"></div>`
            : `<div class="gmail-account-avatar">${(acc.netName || 'U').charAt(0).toUpperCase()}</div>`;

        item.innerHTML = `
            ${avatarHtml}
            <div class="gmail-account-info">
                <div class="gmail-account-name">${acc.netName || '未命名'}</div>
                <div class="gmail-account-id">${acc.account}</div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// 执行快捷登录
function gmailQuickLogin(acc) {
    gmailCurrentUser = acc;
    ChatDB.setItem('gmail_current_user', JSON.stringify(acc)); // 记录登录状态
    loadGmailData();
    updateGmailTopAvatar();
    gmailShowPage('gmail-main-page');
}

// 退出登录
function gmailLogout() {
    gmailCurrentUser = null;
    ChatDB.removeItem('gmail_current_user'); // 清除登录状态
    gmailMails = []; // 清空内存中的邮件
    gmailShowPage('gmail-login-page');
    gmailRenderAccountList();
}

// 打开账号管理页面
function gmailOpenAccountPage() {
    if (gmailCurrentUser) {
        const avatarEl = document.getElementById('gmail-page-current-avatar');
        if (gmailCurrentUser.avatarUrl) {
            avatarEl.style.backgroundImage = `url('${gmailCurrentUser.avatarUrl}')`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.innerText = '';
        } else {
            avatarEl.style.backgroundImage = 'none';
            avatarEl.innerText = (gmailCurrentUser.netName || 'U').charAt(0).toUpperCase();
        }
        document.getElementById('gmail-page-current-name').innerText = gmailCurrentUser.netName || '未命名';
        document.getElementById('gmail-page-current-id').innerText = gmailCurrentUser.account;
    }
    
    gmailRenderAccountPageList();
    gmailShowPage('gmail-account-page');
}

// 渲染账号管理页面里的切换列表
function gmailRenderAccountPageList() {
    const listEl = document.getElementById('gmail-page-account-list');
    listEl.innerHTML = '';
    
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    
    // 过滤掉当前正在登录的账号
    const otherAccounts = accounts.filter(acc => !gmailCurrentUser || acc.id !== gmailCurrentUser.id);
    
    if (otherAccounts.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#5f6368; font-size:13px; padding:20px; background: #f8f9fa; border-radius: 12px;">暂无其他账号</div>';
        return;
    }

    otherAccounts.forEach(acc => {
        const item = document.createElement('div');
        item.className = 'gmail-page-account-item';
        item.onclick = () => {
            gmailQuickLogin(acc);
        };
        
        const avatarHtml = acc.avatarUrl 
            ? `<div class="gmail-page-account-avatar" style="background-image: url('${acc.avatarUrl}')"></div>`
            : `<div class="gmail-page-account-avatar">${(acc.netName || 'U').charAt(0).toUpperCase()}</div>`;

        item.innerHTML = `
            ${avatarHtml}
            <div style="flex: 1; overflow: hidden;">
                <div style="font-size: 16px; font-weight: bold; color: #202124; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${acc.netName || '未命名'}</div>
                <div style="font-size: 13px; color: #5f6368; font-family: monospace;">${acc.account}</div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

function gmailToggleDrawer(show) {
    const overlay = document.getElementById('gmail-drawer-overlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

function gmailSwitchFolder(folder) {
    gmailCurrentFolder = folder;
    document.getElementById('gmail-nav-inbox').classList.remove('active');
    document.getElementById('gmail-nav-sent').classList.remove('active');
    document.getElementById('gmail-nav-drafts').classList.remove('active');
    document.getElementById('gmail-nav-' + folder).classList.add('active');
    
    let title = '收件箱';
    if (folder === 'sent') title = '已发送';
    if (folder === 'drafts') title = '草稿箱';
    document.getElementById('gmail-current-folder-title').innerText = title;
    
    gmailToggleDrawer(false);
    gmailRenderMailList();
}

// 长按事件处理
function handleGmailTouchStart(e, id) {
    gmailTargetMailId = id;
    gmailLongPressTimer = setTimeout(() => {
        openGmailMailMenu(id);
    }, 500); // 500ms 触发长按
}

function handleGmailTouchEnd() {
    clearTimeout(gmailLongPressTimer);
}

function openGmailMailMenu(id) {
    const mail = gmailMails.find(m => m.id === id);
    if(!mail) return;
    document.getElementById('gmailMenuStarText').innerText = mail.starred ? '取消星标' : '标为星标';
    document.getElementById('gmailMailMenuOverlay').classList.add('show');
}

function closeGmailMailMenu() {
    document.getElementById('gmailMailMenuOverlay').classList.remove('show');
    gmailTargetMailId = null;
}

function gmailToggleStar() {
    if(!gmailTargetMailId) return;
    const mail = gmailMails.find(m => m.id === gmailTargetMailId);
    if(mail) {
        mail.starred = !mail.starred;
        saveGmailData();
        gmailRenderMailList();
    }
    closeGmailMailMenu();
}

function gmailDeleteMail() {
    if(!gmailTargetMailId) return;
    gmailMails = gmailMails.filter(m => m.id !== gmailTargetMailId);
    saveGmailData();
    gmailRenderMailList();
    closeGmailMailMenu();
}

function gmailRenderMailList() {
    const listEl = document.getElementById('gmail-mail-list');
    listEl.innerHTML = '';
    
    const filteredMails = gmailMails.filter(m => m.type === gmailCurrentFolder).sort((a, b) => b.id - a.id);

    if (filteredMails.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: #5f6368; font-size: 14px;">没有邮件。</div>`;
        return;
    }

    filteredMails.forEach(mail => {
        const item = document.createElement('div');
        item.className = `gmail-mail-item ${mail.read ? 'read' : 'unread'}`;
        
        // 绑定点击和长按事件
        item.onmousedown = (e) => handleGmailTouchStart(e, mail.id);
        item.onmouseup = handleGmailTouchEnd;
        item.onmouseleave = handleGmailTouchEnd;
        item.ontouchstart = (e) => handleGmailTouchStart(e, mail.id);
        item.ontouchend = handleGmailTouchEnd;
        item.ontouchcancel = handleGmailTouchEnd;
        
        // 点击打开详情 (如果是草稿则打开编辑)
        item.onclick = () => {
            // 如果长按菜单已经弹出，则不触发点击
            if (document.getElementById('gmailMailMenuOverlay').classList.contains('show')) return;
            gmailOpenMailDetail(mail.id);
        };

        const snippet = mail.body.replace(/\n/g, ' ').substring(0, 40);
        const initial = mail.senderName.charAt(0).toUpperCase();
        
        let avatarUrl = '';
        if (mail.senderEmail) {
            const account = mail.senderEmail.split('@')[0];
            let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
            let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
            let allUsers = chars.concat(accounts);
            let user = allUsers.find(u => u.account === account);
            if (user && user.avatarUrl) {
                avatarUrl = user.avatarUrl;
            }
        }

        const avatarHtml = avatarUrl 
            ? `<div class="gmail-mail-avatar" style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center; color: transparent;"></div>`
            : `<div class="gmail-mail-avatar" style="background: ${mail.color || '#1a73e8'}">${initial}</div>`;
        
        const starSvg = mail.starred 
            ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="#FBBC05" style="flex-shrink:0; margin-left:8px;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
            : ``;

        item.innerHTML = `
            ${avatarHtml}
            <div class="gmail-mail-content">
                <div class="gmail-mail-header-row">
                    <div class="gmail-mail-sender">${mail.senderName}</div>
                    <div style="display:flex; align-items:center;">
                        <div class="gmail-mail-time">${mail.time}</div>
                        ${starSvg}
                    </div>
                </div>
                <div class="gmail-mail-subject">${mail.subject}</div>
                <div class="gmail-mail-snippet">${snippet}</div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

function gmailOpenMailDetail(id) {
    const mail = gmailMails.find(m => m.id === id);
    if (!mail) return;

    if (mail.type === 'drafts') {
        // 如果是草稿，打开写信页并填充内容
        gmailShowPage('gmail-compose-page');
        document.getElementById('gmail-compose-to').value = mail.to || '';
        document.getElementById('gmail-compose-subject').value = mail.subject === '(无主题)' ? '' : mail.subject;
        document.getElementById('gmail-compose-body').value = mail.body;
        // 删除原草稿
        gmailMails = gmailMails.filter(m => m.id !== id);
        saveGmailData();
        return;
    }

    if (!mail.read) {
        mail.read = true;
        saveGmailData();
    }

    let avatarUrl = '';
    if (mail.senderEmail) {
        const account = mail.senderEmail.split('@')[0];
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        let allUsers = chars.concat(accounts);
        let user = allUsers.find(u => u.account === account);
        if (user && user.avatarUrl) {
            avatarUrl = user.avatarUrl;
        }
    }

    const avatarEl = document.getElementById('gmail-detail-avatar');
    if (avatarUrl) {
        avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = mail.senderName.charAt(0).toUpperCase();
        avatarEl.style.background = mail.color || '#1a73e8';
    }

    document.getElementById('gmail-detail-subject').innerText = mail.subject;
    document.getElementById('gmail-detail-sender-name').innerText = mail.senderName;
    document.getElementById('gmail-detail-sender-email').innerText = `<${mail.senderEmail}>`;
    document.getElementById('gmail-detail-time').innerText = mail.time;
    document.getElementById('gmail-detail-body').innerText = mail.body;

    gmailShowPage('gmail-detail-page');
}

function gmailShowToast(msg) {
    const toast = document.getElementById('gmail-toast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function gmailGetCurrentTimeStr() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
}

// 存草稿
function gmailSaveDraft() {
    const to = document.getElementById('gmail-compose-to').value;
    const subject = document.getElementById('gmail-compose-subject').value || '(无主题)';
    const body = document.getElementById('gmail-compose-body').value;

    if (!to && !body && subject === '(无主题)') {
        gmailShowPage('gmail-main-page');
        return; // 全空不保存
    }

    gmailMails.push({
        id: Date.now(),
        senderName: '草稿',
        senderEmail: gmailCurrentUser.account + '@gmail.com',
        subject: subject,
        body: body,
        time: gmailGetCurrentTimeStr(),
        read: true,
        type: 'drafts',
        to: to,
        color: '#5f6368'
    });

    saveGmailData();
    gmailShowPage('gmail-main-page');
    gmailShowToast('已存入草稿箱');
}

function gmailSendEmail() {
    const to = document.getElementById('gmail-compose-to').value;
    const subject = document.getElementById('gmail-compose-subject').value || '(无主题)';
    const body = document.getElementById('gmail-compose-body').value;

    if (!body) {
        alert('请输入邮件正文');
        return;
    }

    gmailMails.push({
        id: Date.now(),
        senderName: '我',
        senderEmail: gmailCurrentUser.account + '@gmail.com',
        subject: subject,
        body: body,
        time: gmailGetCurrentTimeStr(),
        read: true,
        type: 'sent',
        to: to,
        color: '#1a73e8'
    });

    saveGmailData();
    gmailShowPage('gmail-main-page');
    gmailShowToast('已发送');

    // 模拟回复
    if (to.includes('@gmail.com')) {
        setTimeout(() => {
            const replySubject = subject.startsWith('Re:') ? subject : 'Re: ' + subject;
            // 提取收件人名字 (去掉 @gmail.com)
            const charName = to.split('@')[0];
            
            gmailMails.push({
                id: Date.now() + 1,
                senderName: charName,
                senderEmail: to,
                subject: replySubject,
                body: `收到你的邮件啦！\n\n关于你说的：“${body.substring(0, 15)}...”\n\n我觉得很有意思，期待后续交流！`,
                time: gmailGetCurrentTimeStr(),
                read: false,
                type: 'inbox',
                color: '#ea4335'
            });
            
            saveGmailData();
            if (gmailCurrentFolder === 'inbox' && document.getElementById('gmail-main-page').classList.contains('active')) {
                gmailRenderMailList();
                gmailShowToast('收到新邮件');
            }
        }, 2500);
    }
}

// 切换收件人下拉框
function gmailToggleCharDropdown(event, isInput = false) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('gmail-char-dropdown');
    const inputVal = document.getElementById('gmail-compose-to').value.toLowerCase();
    
    // 从本地存储获取角色列表
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    
    // 如果是输入触发，则进行过滤
    if (isInput && inputVal) {
        chars = chars.filter(c => 
            (c.name && c.name.toLowerCase().includes(inputVal)) || 
            (c.account && c.account.toLowerCase().includes(inputVal))
        );
    }

    dropdown.innerHTML = '';
    if (chars.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #888; font-size: 12px; text-align: center;">无匹配角色</div>';
    } else {
        chars.forEach(c => {
            const item = document.createElement('div');
            item.className = 'gmail-autocomplete-item';
            const avatarStyle = c.avatarUrl ? `background-image: url('${c.avatarUrl}'); background-size: cover; background-position: center;` : '';
            item.innerHTML = `
                <div class="gmail-autocomplete-avatar" style="${avatarStyle}">${c.avatarUrl ? '' : (c.name || 'U').charAt(0).toUpperCase()}</div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: bold;">${c.name || '未命名'}</span>
                    <span style="font-size: 11px; color: #888;">${c.account}@gmail.com</span>
                </div>
            `;
            item.onclick = (e) => {
                e.stopPropagation();
                // 选中后自动填充账号并补上 @gmail.com
                document.getElementById('gmail-compose-to').value = c.account + '@gmail.com';
                dropdown.classList.remove('show');
            };
            dropdown.appendChild(item);
        });
    }
    dropdown.classList.add('show');
}

// 点击页面其他地方关闭下拉框
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('gmail-char-dropdown');
    if (dropdown && dropdown.classList.contains('show') && e.target.id !== 'gmail-compose-to') {
        dropdown.classList.remove('show');
    }
});
