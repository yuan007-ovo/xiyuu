// ==========================================
// 系统浏览器 APP (SysBrowser) 逻辑
// ==========================================

const sysBrowserPanel = document.getElementById('sysBrowserAppPanel');

// 视图元素
const sysBrowserViews = {
    home: document.getElementById('sys-browser-view-home'),
    real: document.getElementById('sys-browser-view-real-web'),
    ai: document.getElementById('sys-browser-view-ai-web'),
    ao3: document.getElementById('sys-browser-view-ao3'),
    haitang: document.getElementById('sys-browser-view-haitang'),
    loading: document.getElementById('sys-browser-view-loading'),
    tabs: document.getElementById('sys-browser-view-tabs'),
    history: document.getElementById('sys-browser-view-history'),
    bookshelf: document.getElementById('sys-browser-view-bookshelf'),
    settings: document.getElementById('sys-browser-view-settings')
};

const sysBrowserAddressText = document.getElementById('sysBrowserAddressText');
const sysBrowserSearchInput = document.getElementById('sysBrowserSearchInput');
const sysBrowserRealIframe = document.getElementById('sysBrowserRealIframe');
const sysBrowserAiTitle = document.getElementById('sysBrowserAiTitle');
const sysBrowserMenuOverlay = document.getElementById('sysBrowserMenuOverlay');
const sysBrowserAccountOverlay = document.getElementById('sysBrowserAccountOverlay');

// 历史记录栈 (用于后退/前进)
let sysBrowserHistoryStack = [{ url: 'home', type: 'home' }];
let sysBrowserCurrentHistoryIndex = 0;

// 多标签页数据
let sysBrowserTabs = [
    { id: 1, title: '起始页', isHome: true, url: 'home', type: 'home' },
    { id: 2, title: '维基百科', isHome: false, url: 'https://zh.wikipedia.org', type: 'real' }
];
let sysBrowserActiveTabId = 1;

// Poipiku 模拟数据 (持久化)
let sysBrowserPoipikuData = JSON.parse(ChatDB.getItem('sys_browser_poipiku_posts') || '[]');

let sysBrowserShareContext = null;

function sharePoipikuToChar(postId) {
    sysBrowserShareContext = { type: 'poipiku_post', postId: postId };
    openUniversalShareModal();
}

function openUniversalShareModal() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) {
        sysBrowserShowToast('请先登录账号');
        return;
    }
    
    const listEl = document.getElementById('universalShareContactList');
    if (!listEl) {
        sysBrowserShowToast('未找到分享弹窗组件');
        return;
    }
    listEl.innerHTML = '';
    
    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
    let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
    let remarks = JSON.parse(ChatDB.getItem(`char_remarks_${currentLoginId}`) || '{}');
    
    const friends = contacts.map(id => allEntities.find(c => c.id === id)).filter(c => c);
    
    if (friends.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#aaa; font-size:12px;">暂无好友可分享</div>';
    } else {
        friends.forEach(f => {
            const displayName = remarks[f.id] || f.netName || f.name;
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background: #f9f9f9; border-radius: 10px; cursor: pointer;';
            item.innerHTML = `
                <div style="width: 36px; height: 36px; border-radius: 8px; background-image: url('${f.avatarUrl || ''}'); background-size: cover; background-color: #eee;"></div>
                <div style="font-size: 14px; font-weight: bold; color: #333;">${displayName}</div>
            `;
            item.onclick = () => confirmSysBrowserShare(f.id);
            listEl.appendChild(item);
        });
    }
    document.getElementById('universalShareModalOverlay').classList.add('show');
}

// 打开浏览器 APP
function openSysBrowserApp() {
    sysBrowserPanel.style.display = 'flex';
    sysBrowserUpdateNavButtons();
    
    // 初始化当前账号信息
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (currentLoginId) {
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let allEntities = [...accounts, ...chars];
        const acc = allEntities.find(a => a.id === currentLoginId);
        if (acc) {
            document.getElementById('sysBrowserCurrentName').innerText = acc.netName || acc.name || '未命名';
            const avatar = acc.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User1';
            document.getElementById('sysBrowserCurrentAvatar').style.backgroundImage = `url('${avatar}')`;
        }
    }
}

// 关闭浏览器 APP
function closeSysBrowserApp() {
    sysBrowserPanel.style.display = 'none';
}

// 切换视图
function sysBrowserSwitchView(viewName) {
    Object.values(sysBrowserViews).forEach(v => v.classList.remove('active'));
    if (sysBrowserViews[viewName]) {
        sysBrowserViews[viewName].classList.add('active');
    }
}

// 更新底部导航按钮状态
function sysBrowserUpdateNavButtons() {
    const btnBack = document.getElementById('sys-browser-btn-back');
    const btnForward = document.getElementById('sys-browser-btn-forward');
    
    if (sysBrowserCurrentHistoryIndex > 0) btnBack.classList.remove('disabled');
    else btnBack.classList.add('disabled');

    if (sysBrowserCurrentHistoryIndex < sysBrowserHistoryStack.length - 1) btnForward.classList.remove('disabled');
    else btnForward.classList.add('disabled');
}

// 导航到指定 URL
function sysBrowserNavigateTo(url, type, isHistoryAction = false) {
    if (!isHistoryAction) {
        sysBrowserHistoryStack = sysBrowserHistoryStack.slice(0, sysBrowserCurrentHistoryIndex + 1);
        sysBrowserHistoryStack.push({ url, type });
        sysBrowserCurrentHistoryIndex++;
    }

    if (type === 'home') {
        sysBrowserSwitchView('home');
        sysBrowserAddressText.innerText = 'Search or enter website';
        sysBrowserSearchInput.value = '';
    } else if (type === 'real') {
        sysBrowserAddressText.innerText = url.replace('https://', '');
        sysBrowserRealIframe.src = url;
        sysBrowserSwitchView('real');
    } else if (type === 'ai') {
        sysBrowserAddressText.innerText = '★ wiki.worldbook.ai';
        sysBrowserSwitchView('loading');
        setTimeout(() => {
            sysBrowserAiTitle.innerText = url;
            document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-meta').innerHTML = `<span>作者: AI 引擎</span><span>刚刚发布</span>`;
            document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-img').style.display = 'flex';
            document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-content').innerHTML = `
                <p>这是一段由 AI 根据当前世界书和角色设定生成的虚拟网页内容。排版干净优雅，适合沉浸式阅读。</p>
                <p>你可以想象这里写满了关于魔法、科幻或者你们共同回忆的故事。点击右下角的分享按钮，就可以把这个“网页”发送给你的角色，触发特殊的对话剧情！</p>
            `;
            sysBrowserSwitchView('ai');
        }, 1000);
    } else if (type === 'search_list') {
        sysBrowserAddressText.innerText = 'search.browser.com';
        sysBrowserSwitchView('loading');
        setTimeout(() => {
            sysBrowserAiTitle.innerText = `搜索结果: ${url}`;
            document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-meta').innerHTML = `<span>约找到 3,420,000 个结果</span>`;
            document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-img').style.display = 'none';
            document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-content').innerHTML = `
                <div style="margin-bottom: 20px; cursor: pointer;" onclick="sysBrowserNavigateTo('${url} - 维基百科', 'ai')">
                    <h3 style="color: #1a0dab; font-size: 18px; margin-bottom: 4px; text-decoration: underline;">${url} - 维基百科，自由的百科全书</h3>
                    <p style="color: #006621; font-size: 13px; margin-bottom: 4px;">https://zh.wikipedia.org/wiki/${url}</p>
                    <p style="color: #545454; font-size: 14px;">点击查看关于 ${url} 的详细百科内容，包含历史、发展及相关设定...</p>
                </div>
                <div style="margin-bottom: 20px; cursor: pointer;" onclick="sysBrowserNavigateTo('${url} - 最新资讯', 'ai')">
                    <h3 style="color: #1a0dab; font-size: 18px; margin-bottom: 4px; text-decoration: underline;">${url} - 最新资讯与讨论</h3>
                    <p style="color: #006621; font-size: 13px; margin-bottom: 4px;">https://news.browser.com/search?q=${url}</p>
                    <p style="color: #545454; font-size: 14px;">查看网友们关于 ${url} 的最新讨论和热门帖子，了解最新动态...</p>
                </div>
            `;
            sysBrowserSwitchView('ai');
        }, 800);
    } else if (type === 'poipiku') {
        sysBrowserAddressText.innerText = 'poipiku.com';
        sysBrowserRenderPoipiku('home');
        sysBrowserSwitchView('ao3'); // 复用同一个视图容器
    } else if (type === 'haitang') {
        sysBrowserAddressText.innerText = 'haitang123.com';
        sysBrowserRenderHaitang('home');
        sysBrowserSwitchView('haitang');
    }
    
    // 新增：更新当前标签页信息
    const activeTab = sysBrowserTabs.find(t => t.id === sysBrowserActiveTabId);
    if (activeTab) {
        if (type === 'home') {
            activeTab.title = '起始页';
            activeTab.isHome = true;
            activeTab.url = 'home';
            activeTab.type = 'home';
        } else {
            activeTab.title = url;
            activeTab.isHome = false;
            activeTab.url = url;
            activeTab.type = type;
        }
    }

    sysBrowserUpdateNavButtons();
    sysBrowserAddHistoryRecord(url, type);
}

function sysBrowserGoBack() {
    if (sysBrowserCurrentHistoryIndex > 0) {
        sysBrowserCurrentHistoryIndex--;
        const state = sysBrowserHistoryStack[sysBrowserCurrentHistoryIndex];
        sysBrowserNavigateTo(state.url, state.type, true);
    }
}

function sysBrowserGoForward() {
    if (sysBrowserCurrentHistoryIndex < sysBrowserHistoryStack.length - 1) {
        sysBrowserCurrentHistoryIndex++;
        const state = sysBrowserHistoryStack[sysBrowserCurrentHistoryIndex];
        sysBrowserNavigateTo(state.url, state.type, true);
    }
}

function sysBrowserGoHome() {
    if (sysBrowserHistoryStack[sysBrowserCurrentHistoryIndex].type !== 'home') {
        sysBrowserNavigateTo('home', 'home');
    } else {
        sysBrowserSwitchView('home');
    }
}

function sysBrowserRefreshPage() {
    if (sysBrowserViews.real.classList.contains('active')) {
        sysBrowserRealIframe.src = sysBrowserRealIframe.src;
    }
}

function sysBrowserHandleSearch(e) {
    if (e.key === 'Enter') {
        const val = sysBrowserSearchInput.value.trim();
        if (!val) return;
        
        if (val.toLowerCase() === 'poipiku' || val.toLowerCase() === 'ao3') {
            sysBrowserNavigateTo('poipiku', 'poipiku');
        } else if (val.toLowerCase() === 'haitang' || val.includes('海棠')) {
            sysBrowserNavigateTo('haitang', 'haitang');
        } else if (val.startsWith('http://') || val.startsWith('https://')) {
            sysBrowserNavigateTo(val, 'real');
        } else if (val.includes('.com') || val.includes('.cn')) {
            sysBrowserNavigateTo('https://' + val, 'real');
        } else {
            sysBrowserNavigateTo(val, 'search_list');
        }
        sysBrowserSearchInput.blur();
    }
}

// --- Poipiku 渲染逻辑 (蓝白主题) ---
function sysBrowserRenderPoipiku(page) {
    const body = document.getElementById('sysBrowserAo3Body');
    body.innerHTML = '';

    if (page === 'home') {
        let html = '';
        
        if (sysBrowserPoipikuData.length === 0) {
            html += '<div style="text-align: center; color: #aaa; font-size: 13px; padding: 40px 0;">暂无动态，请点击右上角设置生成</div>';
        }

        sysBrowserPoipikuData.forEach(post => {
            // 如果有图片描述，才渲染图片框
            let imgHtml = '';
            if (post.imageDesc && post.imageDesc.trim() !== '') {
                imgHtml = `
                    <div class="poipiku-img-container" onclick="this.classList.toggle('revealed')">
                        <div class="poipiku-img-blur">
                            <div class="poipiku-show-btn">点击显示 (Click to Show)</div>
                        </div>
                        <div class="poipiku-img-real">
                            <div class="poipiku-img-desc-text">${post.imageDesc}</div>
                        </div>
                    </div>
                `;
            }

            html += `
                <div class="poipiku-card">
                    <div class="poipiku-card-header">
                        <div class="poipiku-user-info">
                            <div class="poipiku-avatar" style="background-image: url('${post.avatar}');"></div>
                            <div class="poipiku-name">${post.author}</div>
                        </div>
                        <div class="poipiku-follow-btn">☆安静的关注</div>
                    </div>
                    
                    <div class="poipiku-card-meta">
                        <div class="poipiku-category">${post.category}</div>
                        <div class="poipiku-actions" style="display: flex; align-items: center; width: 100%;">
                            <div onclick="sharePoipikuToChar(${post.id})" style="margin-left: auto; display: flex; align-items: center; gap: 4px; cursor: pointer; color: #1da1f2; font-size: 12px; font-weight: bold;">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><path d="M14 5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11V5z"/></svg> 分享
                            </div>
                        </div>
                    </div>

                    <div class="poipiku-text-content">
                        ${post.text}
                    </div>

                    <div class="poipiku-tags">
                        ${post.tags.map(t => `<span class="poipiku-tag">● #${t}</span>`).join('')}
                    </div>

                    ${imgHtml}
                </div>
            `;
        });
        body.innerHTML = html;
    } else if (page === 'setting') {
        // 渲染设置页面
        let stylePresets = JSON.parse(ChatDB.getItem('tav_presets_style') || '[]');
        let styleOptions = '<option value="">请选择预设文风 (可选)</option>';
        if (stylePresets.length === 0) {
            styleOptions = '<option value="">暂无文风预设，请先在酒馆配置</option>';
        } else {
            stylePresets.forEach(p => {
                styleOptions += `<option value="${p.content.replace(/"/g, '&quot;')}">${p.name}</option>`;
            });
        }

        // 读取持久化的设置
        let savedSettings = JSON.parse(ChatDB.getItem('poipiku_gen_settings') || '{}');

        body.innerHTML = `
            <div class="poipiku-card" style="padding: 20px;">
                <h2 style="color: #1da1f2; border-bottom: 2px solid #1da1f2; padding-bottom: 10px; margin-bottom: 20px; font-weight: 900;">AI Generation Settings</h2>
                
                <div class="poipiku-input-group">
                    <label>Characters (出场角色 - 必选)</label>
                    <div id="poipikuGenCharSelectText" onclick="openPoipikuCharSelectModal()" class="poipiku-input" style="cursor: pointer; text-align: center; background: #f9f9f9; color: #888;">未选择 (点击选择)</div>
                </div>

                <div style="display: flex; gap: 15px;">
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label>图文插画数量</label>
                        <input type="number" id="poipikuSettingImageCount" class="poipiku-input" value="${savedSettings.imageCount !== undefined ? savedSettings.imageCount : 1}" min="0" placeholder="填0则不生成">
                    </div>
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label>同人文数量</label>
                        <input type="number" id="poipikuSettingTextCount" class="poipiku-input" value="${savedSettings.textCount !== undefined ? savedSettings.textCount : 1}" min="0" placeholder="填0则不生成">
                    </div>
                </div>
                <div class="poipiku-input-group">
                    <label>同人文字数要求</label>
                    <input type="text" id="poipikuSettingTextLength" class="poipiku-input" value="${savedSettings.textLength || '500字左右'}" placeholder="例如：500字左右，或长篇大论">
                </div>

                <div class="poipiku-input-group">
                    <label>Worldbook (关联世界书)</label>
                    <div id="poipikuGenWbSelectText" onclick="openPoipikuWbSelectModal()" class="poipiku-input" style="cursor: pointer; text-align: center; background: #f9f9f9; color: #888;">未选择 (点击选择)</div>
                </div>

                <div class="poipiku-input-group">
                    <label>Writing Style (预设文风)</label>
                    <select id="poipikuSettingStyle" class="poipiku-input">
                        ${styleOptions}
                    </select>
                </div>

                <div class="poipiku-input-group">
                    <label>Prompt (画面与配文要求)</label>
                    <textarea id="poipikuSettingPrompt" class="poipiku-textarea" placeholder="例如：画一张他们在海边散步的图，配文要显得很慵懒...">${savedSettings.prompt || ''}</textarea>
                </div>

                <button id="poipikuGenBtn" class="poipiku-submit-btn" onclick="executePoipikuGenAPI()">上传 (Generate)</button>
            </div>
        `;
        
        // 恢复下拉框选中状态
        if (savedSettings.style) document.getElementById('poipikuSettingStyle').value = savedSettings.style;
        
        currentPoipikuSelectedChars = savedSettings.charIds || [];
        if (currentPoipikuSelectedChars.length > 0) {
            const charTextEl = document.getElementById('poipikuGenCharSelectText');
            charTextEl.innerText = `已选 ${currentPoipikuSelectedChars.length} 个角色`;
            charTextEl.style.color = '#111';
        }

        currentPoipikuWbEntries = savedSettings.wbEntries || [];
        if (currentPoipikuWbEntries.length > 0) {
            const textEl = document.getElementById('poipikuGenWbSelectText');
            textEl.innerText = `已选 ${currentPoipikuWbEntries.length} 个条目`;
            textEl.style.color = '#111';
        }
    }
}

// --- 菜单与 Toast ---
function sysBrowserToggleMenu() {
    sysBrowserMenuOverlay.classList.toggle('show');
}

let sysBrowserToastTimeout = null;
function sysBrowserShowToast(text, duration = 2000) {
    if(sysBrowserMenuOverlay.classList.contains('show')) sysBrowserToggleMenu();
    const toast = document.getElementById('sysBrowserToast');
    document.getElementById('sysBrowserToastText').innerText = text;
    toast.classList.add('show');
    
    if (sysBrowserToastTimeout) clearTimeout(sysBrowserToastTimeout);
    
    if (duration > 0) {
        sysBrowserToastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}

function sysBrowserShareToChar() {
    sysBrowserToggleMenu(); // 关闭菜单抽屉
    sysBrowserShareContext = { type: 'page' };
    openUniversalShareModal();
}

function closeUniversalShareModal() {
    document.getElementById('universalShareModalOverlay').classList.remove('show');
}

function confirmSysBrowserShare(targetId) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    
    let title = '网页分享';
    let desc = '点击查看详情';
    let appName = '浏览器';
    let content = '';
    let shareUrl = '';
    let shareContent = '';
    
    if (sysBrowserShareContext && sysBrowserShareContext.type === 'poipiku_post') {
        const post = sysBrowserPoipikuData.find(p => p.id === sysBrowserShareContext.postId);
        if (!post) return;
        title = `${post.author} 的 Poipiku 动态`;
        desc = post.text;
        appName = 'Poipiku';
        shareUrl = 'poipiku';
        shareContent = `作者：${post.author}\n分类：${post.category}\n配文：${post.text}\n图片描述：${post.imageDesc || '无'}`;
        content = `
            <div class="app-share-card" onclick="alert('打开 Poipiku 查看')">
                <div class="app-share-title">${title}</div>
                <div class="app-share-desc">${desc}</div>
                <div class="app-share-footer">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none"><path d="M14 5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11V5z"/></svg>
                    来自 ${appName}
                </div>
            </div>
        `;
    } else {
        const currentState = sysBrowserHistoryStack[sysBrowserCurrentHistoryIndex];
        if (currentState) {
            shareUrl = currentState.url;
            if (currentState.type === 'poipiku') {
                title = 'Poipiku 插画交流平台';
                desc = '我发现了一个有趣的同人作品主页，快来看看吧！';
                appName = 'Poipiku';
                shareContent = '分享了 Poipiku 首页';
            } else if (currentState.type === 'haitang') {
                title = '海棠文化线上文学城';
                desc = '分享了一个精彩的小说页面，快来看看吧！';
                appName = '海棠书屋';
                shareContent = '分享了海棠书屋页面';
            } else if (currentState.type === 'ai') {
                title = currentState.url;
                desc = '分享了一个百科页面';
                appName = '世界百科';
                shareContent = `分享了百科词条：${currentState.url}`;
            } else if (currentState.type === 'real') {
                title = currentState.url;
                desc = '分享了一个网页链接';
                appName = 'Safari';
                shareContent = `分享了网址：${currentState.url}`;
            }
        }
        content = `
            <div class="app-share-card" onclick="alert('打开 ${appName} 查看')">
                <div class="app-share-title">${title}</div>
                <div class="app-share-desc">${desc}</div>
                <div class="app-share-footer">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none"><path d="M14 5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11V5z"/></svg>
                    来自 ${appName}
                </div>
            </div>
        `;
    }
    
    // 构造消息并保存
    let newMsg = { role: 'user', type: 'app_share', shareTitle: title, shareDesc: desc, appName: appName, content: content, shareUrl: shareUrl, shareContent: shareContent, timestamp: Date.now() };
    
    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${targetId}`) || '[]');
    history.push(newMsg);
    ChatDB.setItem(`chat_history_${currentLoginId}_${targetId}`, JSON.stringify(history));
    
    let targetHistory = JSON.parse(ChatDB.getItem(`chat_history_${targetId}_${currentLoginId}`) || '[]');
    targetHistory.push({ ...newMsg, role: 'char' });
    ChatDB.setItem(`chat_history_${targetId}_${currentLoginId}`, JSON.stringify(targetHistory));
    
    let sessions = JSON.parse(ChatDB.getItem(`chat_sessions_${currentLoginId}`) || '[]');
    sessions = sessions.filter(id => id !== targetId);
    sessions.unshift(targetId);
    ChatDB.setItem(`chat_sessions_${currentLoginId}`, JSON.stringify(sessions));
    
    let targetSessions = JSON.parse(ChatDB.getItem(`chat_sessions_${targetId}`) || '[]');
    targetSessions = targetSessions.filter(id => id !== currentLoginId);
    targetSessions.unshift(currentLoginId);
    ChatDB.setItem(`chat_sessions_${targetId}`, JSON.stringify(targetSessions));
    
    let unreadCount = parseInt(ChatDB.getItem(`unread_${targetId}_${currentLoginId}`) || '0');
    ChatDB.setItem(`unread_${targetId}_${currentLoginId}`, (unreadCount + 1).toString());
    
    closeUniversalShareModal();
    sysBrowserShowToast('已分享给 Ta');
    
    // 刷新聊天列表
    if (typeof renderChatList === 'function') renderChatList();
    // 如果当前正在和该角色聊天，刷新聊天室
    if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId === targetId) {
        if (typeof renderChatHistory === 'function') renderChatHistory(targetId);
    }
}

// --- 多标签页逻辑 ---
function sysBrowserRenderTabs() {
    const grid = document.getElementById('sysBrowserTabsGrid');
    grid.innerHTML = '';
    sysBrowserTabs.forEach(tab => {
        const isActive = tab.id === sysBrowserActiveTabId ? 'active-tab' : '';
        const content = tab.isHome 
            ? `<svg viewBox="0 0 24 24" width="32" height="32" stroke="#ccc" stroke-width="1.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
            : `<span style="color: #aaa; font-weight: bold; font-size: 14px; text-align: center; padding: 10px; word-break: break-all;">${tab.title}</span>`;
        
        grid.innerHTML += `
            <div class="sys-browser-tab-card ${isActive}" onclick="sysBrowserSelectTab(${tab.id})">
                <div class="sys-browser-tab-card-header">
                    <span class="sys-browser-tab-card-title">${tab.title}</span>
                    <div class="sys-browser-tab-card-close" onclick="sysBrowserCloseTab(${tab.id}, event)"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                </div>
                <div class="sys-browser-tab-card-content">${content}</div>
            </div>
        `;
    });
    document.getElementById('sysBrowserTabCountDisplay').innerText = sysBrowserTabs.length;
}

function sysBrowserOpenTabs() {
    sysBrowserRenderTabs();
    sysBrowserSwitchView('tabs');
    sysBrowserAddressText.innerText = '标签页';
}

function sysBrowserCreateNewTab() {
    const newId = Date.now();
    sysBrowserTabs.push({ id: newId, title: '起始页', isHome: true, url: 'home', type: 'home' });
    sysBrowserActiveTabId = newId;
    sysBrowserGoHome();
    document.getElementById('sysBrowserTabCountDisplay').innerText = sysBrowserTabs.length;
}

function sysBrowserCloseTab(id, event) {
    event.stopPropagation();
    sysBrowserTabs = sysBrowserTabs.filter(t => t.id !== id);
    if (sysBrowserTabs.length === 0) {
        sysBrowserCreateNewTab();
    } else if (sysBrowserActiveTabId === id) {
        sysBrowserActiveTabId = sysBrowserTabs[sysBrowserTabs.length - 1].id;
    }
    sysBrowserRenderTabs();
}

function sysBrowserSelectTab(id) {
    sysBrowserActiveTabId = id;
    const tab = sysBrowserTabs.find(t => t.id === id);
    if (tab) {
        if (tab.isHome) {
            sysBrowserGoHome();
        } else {
            sysBrowserNavigateTo(tab.url, tab.type);
        }
    }
}

// --- 历史记录与设置 ---
function sysBrowserAddBookmark() {
    sysBrowserToggleMenu();
    const currentState = sysBrowserHistoryStack[sysBrowserCurrentHistoryIndex];
    if (!currentState || currentState.type === 'home') {
        sysBrowserShowToast('当前页面无法添加书签');
        return;
    }
    
    let bookmarks = JSON.parse(ChatDB.getItem('sys_browser_bookmarks') || '[]');
    // 检查是否已存在
    if (bookmarks.find(b => b.url === currentState.url)) {
        sysBrowserShowToast('书签已存在');
        return;
    }
    
    bookmarks.push({
        id: 'bm_' + Date.now(),
        url: currentState.url,
        type: currentState.type,
        title: currentState.url,
        displayUrl: currentState.type === 'real' ? currentState.url : (currentState.type === 'poipiku' ? 'poipiku.com' : 'wiki.worldbook.ai')
    });
    
    ChatDB.setItem('sys_browser_bookmarks', JSON.stringify(bookmarks));
    sysBrowserShowToast('已添加书签');
}

function sysBrowserOpenHistory() {
    sysBrowserToggleMenu();
    sysBrowserSwitchView('history');
    sysBrowserAddressText.innerText = '书签与历史';
    
    // 动态渲染书签
    const bookmarksList = document.getElementById('sys-browser-list-bookmarks');
    if (bookmarksList) {
        bookmarksList.innerHTML = '';
        let bookmarks = JSON.parse(ChatDB.getItem('sys_browser_bookmarks') || '[]');
        
        if (bookmarks.length === 0) {
            bookmarksList.innerHTML = '<div style="padding: 30px; text-align: center; color: #aaa; font-size: 13px;">暂无书签</div>';
        } else {
            bookmarks.forEach(bm => {
                let icon = `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
                if (bm.type === 'ai') {
                    icon = `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
                }
                
                const item = document.createElement('div');
                item.className = 'sys-browser-history-item';
                item.onclick = () => sysBrowserNavigateTo(bm.url, bm.type);
                
                item.innerHTML = `
                    <div class="sys-browser-history-icon">${icon}</div>
                    <div class="sys-browser-history-info">
                        <div class="sys-browser-history-item-title">${bm.title}</div>
                        <div class="sys-browser-history-item-url">${bm.displayUrl}</div>
                    </div>
                `;
                
                const delBtn = document.createElement('div');
                delBtn.className = 'bookmark-delete-btn';
                delBtn.style.cssText = 'padding: 10px; color: #ff3b30; cursor: pointer; font-weight: bold; font-size: 18px;';
                delBtn.innerText = '×';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    let currentBookmarks = JSON.parse(ChatDB.getItem('sys_browser_bookmarks') || '[]');
                    currentBookmarks = currentBookmarks.filter(b => b.id !== bm.id);
                    ChatDB.setItem('sys_browser_bookmarks', JSON.stringify(currentBookmarks));
                    item.remove();
                    if (currentBookmarks.length === 0) {
                        bookmarksList.innerHTML = '<div style="padding: 30px; text-align: center; color: #aaa; font-size: 13px;">暂无书签</div>';
                    }
                };
                item.appendChild(delBtn);
                bookmarksList.appendChild(item);
            });
        }
    }
}

function sysBrowserSwitchHistoryTab(tabName, element) {
    document.querySelectorAll('.sys-browser-history-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sys-browser-history-list-container').forEach(c => c.classList.remove('active'));
    
    element.classList.add('active');
    document.getElementById(`sys-browser-list-${tabName}`).classList.add('active');
}

function sysBrowserAddHistoryRecord(url, type) {
    if (type === 'home') return;
    const list = document.getElementById('sys-browser-list-history');
    if (list.innerHTML.includes('暂无历史记录')) list.innerHTML = '';
    
    let icon = `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    let displayUrl = 'wiki.worldbook.ai';
    
    if (type === 'real') {
        icon = `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        displayUrl = url;
    } else if (type === 'poipiku') {
        icon = `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        displayUrl = 'poipiku.com';
    } else if (type === 'haitang') {
        icon = `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        displayUrl = 'haitang123.com';
    } else if (type === 'search_list') {
        icon = `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
        displayUrl = 'search.browser.com';
    }
    
    const itemId = 'hist_' + Date.now();
    const html = `
        <div class="sys-browser-history-item" id="${itemId}">
            <div class="sys-browser-history-icon" onclick="sysBrowserNavigateTo('${url}', '${type}')">${icon}</div>
            <div class="sys-browser-history-info" onclick="sysBrowserNavigateTo('${url}', '${type}')">
                <div class="sys-browser-history-item-title">${url}</div>
                <div class="sys-browser-history-item-url">${displayUrl}</div>
            </div>
            <div onclick="sysBrowserDeleteHistoryItem('${itemId}', event)" style="padding: 10px; color: #ff3b30; cursor: pointer; font-weight: bold; font-size: 18px;">×</div>
        </div>
    `;
    list.insertAdjacentHTML('afterbegin', html);
}

function sysBrowserDeleteHistoryItem(itemId, event) {
    event.stopPropagation();
    const item = document.getElementById(itemId);
    if (item) {
        item.remove();
    }
    const list = document.getElementById('sys-browser-list-history');
    if (list.children.length === 0) {
        list.innerHTML = '<div style="padding: 30px; text-align: center; color: #aaa; font-size: 13px;">暂无历史记录</div>';
    }
}

let currentSysBrowserWbEntries = JSON.parse(ChatDB.getItem('sys_browser_wb_entries') || '[]');

function sysBrowserOpenSettings() {
    sysBrowserToggleMenu();
    sysBrowserSwitchView('settings');
    sysBrowserAddressText.innerText = '设置';
    
    // 初始化世界书文本
    currentSysBrowserWbEntries = JSON.parse(ChatDB.getItem('sys_browser_wb_entries') || '[]');
    const textEl = document.getElementById('sysBrowserWbSelectText');
    if (textEl) {
        if (currentSysBrowserWbEntries.length > 0) {
            textEl.innerText = `已选 ${currentSysBrowserWbEntries.length} 个条目`;
            textEl.style.color = '#111';
        } else {
            textEl.innerText = '未选择';
            textEl.style.color = '#888';
        }
    }
}

function openSysBrowserWbSelectModal() {
    const listEl = document.getElementById('sysBrowserWbSelectList');
    listEl.innerHTML = '';
    let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { groups: [], entries: [] };
    
    if (wbData.groups.length === 0 || wbData.entries.length === 0) {
        listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #aaa; font-size: 12px;">暂无世界书数据</div>';
    } else {
        wbData.groups.forEach(group => {
            const groupEntries = wbData.entries.filter(e => e.group === group);
            if (groupEntries.length === 0) return;
            
            const groupContainer = document.createElement('div');
            groupContainer.style.borderBottom = '1px solid #f5f5f5';
            
            const groupHeader = document.createElement('div');
            groupHeader.style.display = 'flex';
            groupHeader.style.alignItems = 'center';
            groupHeader.style.justifyContent = 'space-between';
            groupHeader.style.padding = '15px 5px';
            groupHeader.style.cursor = 'pointer';
            
            const leftDiv = document.createElement('div');
            leftDiv.style.display = 'flex';
            leftDiv.style.alignItems = 'center';
            leftDiv.style.gap = '12px';
            
            const groupCb = document.createElement('input');
            groupCb.type = 'checkbox';
            groupCb.setAttribute('data-group-target', group);
            groupCb.style.width = '18px';
            groupCb.style.height = '18px';
            groupCb.style.cursor = 'pointer';
            groupCb.style.accentColor = '#111';
            
            const allSelected = groupEntries.every(e => currentSysBrowserWbEntries.includes(e.id));
            groupCb.checked = allSelected;
            
            groupCb.onclick = (e) => e.stopPropagation();
            groupCb.onchange = (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll(`.sys-browser-wb-entry-checkbox[data-group-name="${group}"]`).forEach(cb => {
                    cb.checked = isChecked;
                    if (isChecked && !currentSysBrowserWbEntries.includes(cb.value)) {
                        currentSysBrowserWbEntries.push(cb.value);
                    } else if (!isChecked) {
                        currentSysBrowserWbEntries = currentSysBrowserWbEntries.filter(id => id !== cb.value);
                    }
                });
            };
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = group;
            titleSpan.style.fontSize = '15px';
            titleSpan.style.color = '#333';
            titleSpan.style.fontWeight = '500';
            
            leftDiv.appendChild(groupCb);
            leftDiv.appendChild(titleSpan);
            
            const arrowSvg = document.createElement('div');
            arrowSvg.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#aaa" style="transition: transform 0.2s;"><path d="M7 10l5 5 5-5z"/></svg>`;
            const arrowIcon = arrowSvg.firstChild;
            
            groupHeader.appendChild(leftDiv);
            groupHeader.appendChild(arrowSvg);
            
            const entriesContainer = document.createElement('div');
            entriesContainer.style.display = 'none';
            entriesContainer.style.paddingBottom = '10px';
            
            groupHeader.onclick = () => {
                const isHidden = entriesContainer.style.display === 'none';
                entriesContainer.style.display = isHidden ? 'block' : 'none';
                arrowIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            };
            
            groupEntries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.style.display = 'flex';
                entryDiv.style.alignItems = 'center';
                entryDiv.style.gap = '12px';
                entryDiv.style.padding = '12px 5px 12px 35px';
                
                const entryCb = document.createElement('input');
                entryCb.type = 'checkbox';
                entryCb.className = `sys-browser-wb-entry-checkbox`;
                entryCb.setAttribute('data-group-name', group);
                entryCb.value = entry.id;
                entryCb.checked = currentSysBrowserWbEntries.includes(entry.id);
                entryCb.style.width = '16px';
                entryCb.style.height = '16px';
                entryCb.style.cursor = 'pointer';
                entryCb.style.accentColor = '#111';
                
                entryCb.onchange = (e) => {
                    if (e.target.checked) {
                        if (!currentSysBrowserWbEntries.includes(entry.id)) currentSysBrowserWbEntries.push(entry.id);
                    } else {
                        currentSysBrowserWbEntries = currentSysBrowserWbEntries.filter(id => id !== entry.id);
                    }
                    const allCbs = Array.from(document.querySelectorAll(`.sys-browser-wb-entry-checkbox[data-group-name="${group}"]`));
                    const allChecked = allCbs.every(cb => cb.checked);
                    document.querySelector(`input[data-group-target="${group}"]`).checked = allChecked;
                };
                
                const entryTitle = document.createElement('span');
                entryTitle.innerText = entry.title || '未命名';
                entryTitle.style.fontSize = '14px';
                entryTitle.style.color = '#666';
                
                entryDiv.appendChild(entryCb);
                entryDiv.appendChild(entryTitle);
                entriesContainer.appendChild(entryDiv);
            });
            
            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(entriesContainer);
            listEl.appendChild(groupContainer);
        });
    }
    document.getElementById('sysBrowserWbSelectModalOverlay').classList.add('show');
}

function confirmSysBrowserWbSelect() {
    ChatDB.setItem('sys_browser_wb_entries', JSON.stringify(currentSysBrowserWbEntries));
    const textEl = document.getElementById('sysBrowserWbSelectText');
    if (currentSysBrowserWbEntries.length > 0) {
        textEl.innerText = `已选 ${currentSysBrowserWbEntries.length} 个条目`;
        textEl.style.color = '#111';
    } else {
        textEl.innerText = '未选择';
        textEl.style.color = '#888';
    }
    document.getElementById('sysBrowserWbSelectModalOverlay').classList.remove('show');
}

function handleSysBrowserTopRightClick() {
    const currentState = sysBrowserHistoryStack[sysBrowserCurrentHistoryIndex];
    if (!currentState) return;
    
    if (currentState.type === 'real') {
        sysBrowserRefreshPage();
    } else if (currentState.type === 'ai' || currentState.type === 'search_list') {
        openSysBrowserGenModal();
    } else if (currentState.type === 'poipiku' || currentState.type === 'haitang') {
        sysBrowserShowToast('此页面请在设置中生成');
    }
}

function openSysBrowserGenModal() {
    document.getElementById('sysBrowserGenModalOverlay').classList.add('show');
}

function closeSysBrowserGenModal() {
    document.getElementById('sysBrowserGenModalOverlay').classList.remove('show');
}

function confirmSysBrowserGen() {
    const type = document.getElementById('sysBrowserGenType').value;
    const count = parseInt(document.getElementById('sysBrowserGenCount').value) || 3;
    closeSysBrowserGenModal();
    
    const currentState = sysBrowserHistoryStack[sysBrowserCurrentHistoryIndex];
    if (currentState) {
        generateSysBrowserWebpageAPI(currentState.url, type, count);
    }
}

async function generateSysBrowserWebpageAPI(keyword, type, count) {
    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        return alert('请先在设置中配置 API 信息！');
    }

    let wbContext = '';
    if (currentSysBrowserWbEntries.length > 0) {
        let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
        let entries = wbData.entries.filter(e => currentSysBrowserWbEntries.includes(e.id));
        wbContext = entries.map(e => e.content).join('\n');
    }

    let prompt = `你是一个网页内容生成引擎。用户在浏览器中搜索或访问了关键词：【${keyword}】。
请根据以下世界书背景设定，生成符合该关键词的网页内容。
${wbContext ? `【世界观背景】：\n${wbContext}\n` : ''}`;

    if (type === 'search') {
        prompt += `
请生成 ${count} 条【搜索结果列表】。
必须严格返回一个合法的 JSON 数组，格式如下：
[
  {
    "title": "搜索结果的标题",
    "url": "伪造的网址(如: www.example.com/xxx)",
    "snippet": "搜索结果的摘要描述，吸引人点击"
  }
]
注意：只返回 JSON 数组，不要包含任何 markdown 标记。`;
    } else if (type === 'zhihu') {
        prompt += `
请生成一篇【知乎问答论坛】风格的网页。包含一个问题和 ${count} 个回答。
必须严格返回一个合法的 JSON 对象，格式如下：
{
  "title": "关于该关键词的知乎提问标题",
  "desc": "问题的详细描述补充",
  "answers": [
    {
      "author": "随机生成的网友昵称",
      "upvotes": "赞同数(如: 1.2万)",
      "content": "回答的正文内容，使用 HTML 标签如 <p>, <strong> 进行排版，内容要符合知乎网友的语气（如：谢邀、人在美国、利益相关等）"
    }
  ]
}
注意：只返回 JSON 对象，不要包含任何 markdown 标记。`;
    } else {
        prompt += `
请生成 ${count} 篇【百科词条或新闻报道】风格的网页正文。
必须严格返回一个合法的 JSON 数组，格式如下：
[
  {
    "title": "文章标题",
    "content": "文章的正文内容，使用 HTML 标签如 <h3>, <p>, <ul>, <li>, <strong> 等进行排版"
  }
]
注意：只返回 JSON 数组，不要包含任何 markdown 标记。`;
    }

    sysBrowserSwitchView('loading');
    sysBrowserShowToast('正在生成网页内容...', 0); // 传入 0 表示不自动隐藏

    try {
        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            })
        });

        if (response.ok) {
            const data = await response.json();
            let replyRaw = data.choices[0].message.content.trim();
            replyRaw = replyRaw.replace(/^```json/i, '').replace(/^```html/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            
            const contentContainer = document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-content');
            const metaContainer = document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-meta');
            const imgContainer = document.querySelector('#sys-browser-view-ai-web .sys-browser-ai-article-img');
            
            if (type === 'search') {
                const parsed = JSON.parse(replyRaw);
                let listArray = Array.isArray(parsed) ? parsed : [parsed];
                sysBrowserAiTitle.innerText = `搜索结果: ${keyword}`;
                metaContainer.innerHTML = `<span>约找到 3,420,000 个结果</span>`;
                imgContainer.style.display = 'none';
                
                let html = '';
                listArray.forEach(item => {
                    html += `
                        <div style="margin-bottom: 20px; cursor: pointer;" onclick="sysBrowserNavigateTo('${item.title}', 'ai')">
                            <h3 style="color: #1a0dab; font-size: 18px; margin-bottom: 4px; text-decoration: underline;">${item.title}</h3>
                            <p style="color: #006621; font-size: 13px; margin-bottom: 4px;">https://${item.url}</p>
                            <p style="color: #545454; font-size: 14px;">${item.snippet}</p>
                        </div>
                    `;
                });
                contentContainer.innerHTML = html;
                
            } else if (type === 'zhihu') {
                const parsed = JSON.parse(replyRaw);
                sysBrowserAiTitle.innerText = parsed.title || keyword;
                metaContainer.innerHTML = `<span style="color: #0066ff; font-weight: bold;">知乎 Zhihu</span><span>问题描述</span>`;
                imgContainer.style.display = 'none';
                
                let html = `<div style="font-size: 14px; color: #555; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">${parsed.desc || ''}</div>`;
                
                if (parsed.answers && Array.isArray(parsed.answers)) {
                    parsed.answers.forEach(ans => {
                        html += `
                            <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <div style="width: 32px; height: 32px; border-radius: 4px; background: #eee; display: flex; justify-content: center; align-items: center; font-size: 12px; color: #888;">${ans.author.charAt(0)}</div>
                                    <div style="font-size: 14px; font-weight: bold; color: #444;">${ans.author}</div>
                                </div>
                                <div style="font-size: 12px; color: #888; margin-bottom: 10px;">▲ ${ans.upvotes} 人赞同了该回答</div>
                                <div style="font-size: 15px; color: #333; line-height: 1.6; word-break: break-all;">
                                    ${ans.content}
                                </div>
                            </div>
                        `;
                    });
                }
                contentContainer.innerHTML = html;
                
            } else {
                // Wiki 模式
                const parsed = JSON.parse(replyRaw);
                let listArray = Array.isArray(parsed) ? parsed : [parsed];
                sysBrowserAiTitle.innerText = keyword;
                metaContainer.innerHTML = `<span>作者: AI 引擎</span><span>刚刚发布</span>`;
                imgContainer.style.display = 'none';
                
                let html = '';
                listArray.forEach(item => {
                    html += `
                        <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                            <h2 style="font-size: 20px; font-weight: bold; color: #111; margin-bottom: 15px;">${item.title}</h2>
                            <div style="font-size: 15px; color: #333; line-height: 1.8;">${item.content}</div>
                        </div>
                    `;
                });
                contentContainer.innerHTML = html;
            }
            
            sysBrowserSwitchView('ai');
            sysBrowserShowToast('网页生成成功！');
        } else {
            sysBrowserShowToast('生成失败，请检查 API。');
            sysBrowserSwitchView('ai');
        }
    } catch (e) {
        console.error(e);
        sysBrowserShowToast('生成出错：' + e.message);
        sysBrowserSwitchView('ai');
    }
}

function sysBrowserClearData() {
    sysBrowserShowToast('浏览数据已清除');
    document.getElementById('sys-browser-list-history').innerHTML = '<div style="padding: 30px; text-align: center; color: #aaa; font-size: 13px;">暂无历史记录</div>';
    sysBrowserHistoryStack = [{ url: 'home', type: 'home' }];
    sysBrowserCurrentHistoryIndex = 0;
    sysBrowserUpdateNavButtons();
}

// --- 账号切换逻辑 ---
function sysBrowserOpenAccountModal() {
    const listEl = document.getElementById('sysBrowserAccountList');
    listEl.innerHTML = '';
    
    const currentLoginId = ChatDB.getItem('current_login_account');
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    // 只显示用户账号，不显示 char 账号
    let allEntities = [...accounts];
    
    allEntities.forEach(acc => {
        const isCurrent = acc.id === currentLoginId;
        const name = acc.netName || acc.name || '未命名';
        const avatar = acc.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User1';
        
        const item = document.createElement('div');
        item.className = `sys-browser-account-item ${isCurrent ? 'active' : ''}`;
        item.onclick = () => sysBrowserSwitchAccount(acc.id, name, avatar);
        item.innerHTML = `
            <div class="sys-browser-account-item-avatar" style="background-image: url('${avatar}');"></div>
            <div class="sys-browser-account-item-name">${name}</div>
        `;
        listEl.appendChild(item);
    });
    
    document.getElementById('sysBrowserAccountOverlay').classList.add('show');
}

function sysBrowserCloseAccountModal() {
    document.getElementById('sysBrowserAccountOverlay').classList.remove('show');
}

function sysBrowserSwitchAccount(id, name, avatar) {
    ChatDB.setItem('current_login_account', id);
    
    document.getElementById('sysBrowserCurrentName').innerText = name;
    document.getElementById('sysBrowserCurrentAvatar').style.backgroundImage = `url('${avatar}')`;
    
    sysBrowserCloseAccountModal();
    sysBrowserShowToast(`已切换至 ${name}`);
    
    // 同步刷新全局 UI
    if (typeof renderMePage === 'function') renderMePage();
    if (typeof renderChatList === 'function') renderChatList();
    if (typeof renderContactList === 'function') renderContactList();
    if (typeof renderMoments === 'function') renderMoments();
}

// 初始化
sysBrowserUpdateNavButtons();

// ==========================================
// Poipiku AI 生成逻辑
// ==========================================
let currentPoipikuWbEntries = [];
let currentPoipikuSelectedChars = [];

function openPoipikuCharSelectModal() {
    const listEl = document.getElementById('poipikuCharSelectList');
    listEl.innerHTML = '';
    
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    
    const groups = [
        { name: '角色 (Chars)', items: chars.map(c => ({ id: c.id, name: c.name || c.netName || '未命名' })) },
        { name: '用户面具 (User Personas)', items: personas.map(p => ({ id: p.id, name: p.realName || '未命名', isPersona: true })) }
    ];
    
    groups.forEach(group => {
        if (group.items.length === 0) return;
        
        const groupContainer = document.createElement('div');
        groupContainer.style.borderBottom = '1px solid #f5f5f5';
        
        const groupHeader = document.createElement('div');
        groupHeader.style.display = 'flex';
        groupHeader.style.alignItems = 'center';
        groupHeader.style.justifyContent = 'space-between';
        groupHeader.style.padding = '15px 5px';
        groupHeader.style.cursor = 'pointer';
        
        const titleSpan = document.createElement('span');
        titleSpan.innerText = group.name;
        titleSpan.style.fontSize = '15px';
        titleSpan.style.color = '#333';
        titleSpan.style.fontWeight = '500';
        
        const arrowSvg = document.createElement('div');
        arrowSvg.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#aaa" style="transition: transform 0.2s;"><path d="M7 10l5 5 5-5z"/></svg>`;
        const arrowIcon = arrowSvg.firstChild;
        
        groupHeader.appendChild(titleSpan);
        groupHeader.appendChild(arrowSvg);
        
        const entriesContainer = document.createElement('div');
        entriesContainer.style.display = 'none';
        entriesContainer.style.paddingBottom = '10px';
        
        groupHeader.onclick = () => {
            const isHidden = entriesContainer.style.display === 'none';
            entriesContainer.style.display = isHidden ? 'block' : 'none';
            arrowIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        };
        
        group.items.forEach(item => {
            const entryDiv = document.createElement('div');
            entryDiv.style.display = 'flex';
            entryDiv.style.alignItems = 'center';
            entryDiv.style.gap = '12px';
            entryDiv.style.padding = '12px 5px 12px 15px';
            
            const entryCb = document.createElement('input');
            entryCb.type = 'checkbox';
            entryCb.value = item.isPersona ? `persona_${item.id}` : `char_${item.id}`;
            entryCb.checked = currentPoipikuSelectedChars.includes(entryCb.value);
            entryCb.style.width = '16px';
            entryCb.style.height = '16px';
            entryCb.style.cursor = 'pointer';
            entryCb.style.accentColor = '#1da1f2';
            
            entryCb.onchange = (e) => {
                if (e.target.checked) {
                    if (!currentPoipikuSelectedChars.includes(entryCb.value)) currentPoipikuSelectedChars.push(entryCb.value);
                } else {
                    currentPoipikuSelectedChars = currentPoipikuSelectedChars.filter(id => id !== entryCb.value);
                }
            };
            
            const entryTitle = document.createElement('span');
            entryTitle.innerText = item.name;
            entryTitle.style.fontSize = '14px';
            entryTitle.style.color = '#666';
            
            entryDiv.appendChild(entryCb);
            entryDiv.appendChild(entryTitle);
            entriesContainer.appendChild(entryDiv);
        });
        
        groupContainer.appendChild(groupHeader);
        groupContainer.appendChild(entriesContainer);
        listEl.appendChild(groupContainer);
    });
    
    document.getElementById('poipikuCharSelectModalOverlay').classList.add('show');
}

function confirmPoipikuCharSelect() {
    const textEl = document.getElementById('poipikuGenCharSelectText');
    if (currentPoipikuSelectedChars.length > 0) {
        textEl.innerText = `已选 ${currentPoipikuSelectedChars.length} 个角色`;
        textEl.style.color = '#111';
    } else {
        textEl.innerText = '未选择 (点击选择)';
        textEl.style.color = '#888';
    }
    document.getElementById('poipikuCharSelectModalOverlay').classList.remove('show');
}

function openPoipikuWbSelectModal() {
    const listEl = document.getElementById('poipikuWbSelectList');
    listEl.innerHTML = '';
    let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { groups: [], entries: [] };
    
    if (wbData.groups.length === 0 || wbData.entries.length === 0) {
        listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #aaa; font-size: 12px;">暂无世界书数据</div>';
    } else {
        wbData.groups.forEach(group => {
            const groupEntries = wbData.entries.filter(e => e.group === group);
            if (groupEntries.length === 0) return;
            
            const groupContainer = document.createElement('div');
            groupContainer.style.borderBottom = '1px solid #f5f5f5';
            
            const groupHeader = document.createElement('div');
            groupHeader.style.display = 'flex';
            groupHeader.style.alignItems = 'center';
            groupHeader.style.justifyContent = 'space-between';
            groupHeader.style.padding = '15px 5px';
            groupHeader.style.cursor = 'pointer';
            
            const leftDiv = document.createElement('div');
            leftDiv.style.display = 'flex';
            leftDiv.style.alignItems = 'center';
            leftDiv.style.gap = '12px';
            
            const groupCb = document.createElement('input');
            groupCb.type = 'checkbox';
            groupCb.setAttribute('data-group-target', group);
            groupCb.style.width = '18px';
            groupCb.style.height = '18px';
            groupCb.style.cursor = 'pointer';
            groupCb.style.accentColor = '#ff4b72';
            
            const allSelected = groupEntries.every(e => currentPoipikuWbEntries.includes(e.id));
            groupCb.checked = allSelected;
            
            groupCb.onclick = (e) => e.stopPropagation();
            groupCb.onchange = (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll(`.poipiku-wb-entry-checkbox[data-group-name="${group}"]`).forEach(cb => {
                    cb.checked = isChecked;
                    if (isChecked && !currentPoipikuWbEntries.includes(cb.value)) {
                        currentPoipikuWbEntries.push(cb.value);
                    } else if (!isChecked) {
                        currentPoipikuWbEntries = currentPoipikuWbEntries.filter(id => id !== cb.value);
                    }
                });
            };
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = group;
            titleSpan.style.fontSize = '15px';
            titleSpan.style.color = '#333';
            titleSpan.style.fontWeight = '500';
            
            leftDiv.appendChild(groupCb);
            leftDiv.appendChild(titleSpan);
            
            const arrowSvg = document.createElement('div');
            arrowSvg.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#aaa" style="transition: transform 0.2s;"><path d="M7 10l5 5 5-5z"/></svg>`;
            const arrowIcon = arrowSvg.firstChild;
            
            groupHeader.appendChild(leftDiv);
            groupHeader.appendChild(arrowSvg);
            
            const entriesContainer = document.createElement('div');
            entriesContainer.style.display = 'none';
            entriesContainer.style.paddingBottom = '10px';
            
            groupHeader.onclick = () => {
                const isHidden = entriesContainer.style.display === 'none';
                entriesContainer.style.display = isHidden ? 'block' : 'none';
                arrowIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            };
            
            groupEntries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.style.display = 'flex';
                entryDiv.style.alignItems = 'center';
                entryDiv.style.gap = '12px';
                entryDiv.style.padding = '12px 5px 12px 35px';
                
                const entryCb = document.createElement('input');
                entryCb.type = 'checkbox';
                entryCb.className = `poipiku-wb-entry-checkbox`;
                entryCb.setAttribute('data-group-name', group);
                entryCb.value = entry.id;
                entryCb.checked = currentPoipikuWbEntries.includes(entry.id);
                entryCb.style.width = '16px';
                entryCb.style.height = '16px';
                entryCb.style.cursor = 'pointer';
                entryCb.style.accentColor = '#ff4b72';
                
                entryCb.onchange = (e) => {
                    if (e.target.checked) {
                        if (!currentPoipikuWbEntries.includes(entry.id)) currentPoipikuWbEntries.push(entry.id);
                    } else {
                        currentPoipikuWbEntries = currentPoipikuWbEntries.filter(id => id !== entry.id);
                    }
                    const allCbs = Array.from(document.querySelectorAll(`.poipiku-wb-entry-checkbox[data-group-name="${group}"]`));
                    const allChecked = allCbs.every(cb => cb.checked);
                    document.querySelector(`input[data-group-target="${group}"]`).checked = allChecked;
                };
                
                const entryTitle = document.createElement('span');
                entryTitle.innerText = entry.title || '未命名';
                entryTitle.style.fontSize = '14px';
                entryTitle.style.color = '#666';
                
                entryDiv.appendChild(entryCb);
                entryDiv.appendChild(entryTitle);
                entriesContainer.appendChild(entryDiv);
            });
            
            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(entriesContainer);
            listEl.appendChild(groupContainer);
        });
    }
    document.getElementById('poipikuWbSelectModalOverlay').classList.add('show');
}

function confirmPoipikuWbSelect() {
    const textEl = document.getElementById('poipikuGenWbSelectText');
    if (currentPoipikuWbEntries.length > 0) {
        textEl.innerText = `已选 ${currentPoipikuWbEntries.length} 个条目`;
        textEl.style.color = '#111';
    } else {
        textEl.innerText = '未选择 (点击选择)';
        textEl.style.color = '#888';
    }
    document.getElementById('poipikuWbSelectModalOverlay').classList.remove('show');
}

async function executePoipikuGenAPI() {
    const imageCount = parseInt(document.getElementById('poipikuSettingImageCount').value) || 0;
    const textCount = parseInt(document.getElementById('poipikuSettingTextCount').value) || 0;
    const textLength = document.getElementById('poipikuSettingTextLength').value.trim() || '适中';
    const style = document.getElementById('poipikuSettingStyle').value;
    const customPrompt = document.getElementById('poipikuSettingPrompt').value.trim();

    if (currentPoipikuSelectedChars.length === 0) return alert('请至少选择一个出场角色！');
    if (imageCount <= 0 && textCount <= 0) return alert('请至少生成1篇内容！');

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        return alert('请先在设置中配置 API 信息！');
    }

    // 保存设置
    const settingsToSave = {
        charIds: currentPoipikuSelectedChars, imageCount, textCount, textLength, style, prompt: customPrompt, wbEntries: currentPoipikuWbEntries
    };
    ChatDB.setItem('poipiku_gen_settings', JSON.stringify(settingsToSave));

    const btn = document.getElementById('poipikuGenBtn');
    const originalBtnText = btn.innerText;
    btn.innerText = '正在生成中...';
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    
    let charactersContext = '';
    currentPoipikuSelectedChars.forEach((selectedId, index) => {
        if (selectedId.startsWith('persona_')) {
            const pId = selectedId.replace('persona_', '');
            const p = personas.find(x => x.id === pId);
            if (p) {
                charactersContext += `【出场角色 ${index + 1}】：${p.realName || '未命名'}\n设定：${p.persona || '普通用户'}\n\n`;
            }
        } else if (selectedId.startsWith('char_')) {
            const cId = selectedId.replace('char_', '');
            const c = chars.find(x => x.id === cId);
            if (c) {
                charactersContext += `【出场角色 ${index + 1}】：${c.name || '未命名'}\n设定：${c.description || '无'}\n\n`;
            }
        }
    });

    let wbContext = '';
    if (currentPoipikuWbEntries.length > 0) {
        let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
        let entries = wbData.entries.filter(e => currentPoipikuWbEntries.includes(e.id));
        wbContext = entries.map(e => e.content).join('\n');
    }

    const totalCount = imageCount + textCount;

    let prompt = `你是一个在 Poipiku 上发布作品的创作者。
请根据以下设定，生成 ${totalCount} 篇 Poipiku 动态。其中包含 ${imageCount} 篇图文插画动态，和 ${textCount} 篇同人文动态。

${charactersContext}
${wbContext ? `【世界观背景】：\n${wbContext}\n` : ''}
${style ? `【文风要求】：${style}\n` : ''}
${customPrompt ? `【画面与配文要求】：${customPrompt}\n` : ''}
【同人文字数要求】：${textLength}

请严格返回一个合法的 JSON 数组，包含 ${totalCount} 个对象。
对于图文插画动态，格式如下：
  {
    "author": "随机生成一个路人画师的网名（绝对不能是主角的名字）",
    "category": "请你根据内容随机生成一个简短的分类词（如：涂鸦、R18、剧透、日常等）",
    "imageDesc": "详细描述你画的图片画面内容（因为无法直接生成图片，请用文字详细描述画面）",
    "text": "你发布这张图时配的文字（可以带点画师的吐槽、碎碎念）",
    "tags": ["标签1", "标签2"]
  }
对于同人文动态，格式如下：
  {
    "author": "随机生成一个路人写手的网名（绝对不能是主角的名字）",
    "category": "请你根据内容随机生成一个简短的分类词（如：短打、段子、同人、R18等）",
    "imageDesc": "", 
    "text": "这里写同人文/短打的正文内容，字数尽量符合要求，使用 HTML 标签如 <p> 进行段落排版",
    "tags": ["标签1", "标签2"]
  }
注意：只返回 JSON 数组，不要包含任何 markdown 标记（如 \`\`\`json）。`;

    sysBrowserShowToast(`正在创作 ${totalCount} 篇动态，请稍候...`, 0); // 传入 0 表示不自动隐藏

    try {
        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            })
        });

        if (response.ok) {
            const data = await response.json();
            let replyRaw = data.choices[0].message.content.trim();
            replyRaw = replyRaw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            
            const parsed = JSON.parse(replyRaw);
            let worksArray = Array.isArray(parsed) ? parsed : [parsed];
            
            const npcAvatars = [
                'https://i.postimg.cc/8cVtnWVq/IMG-20260509-054541.jpg',
                'https://i.postimg.cc/qB8m6m8F/IMG-20260509-054512.jpg',
                'https://i.postimg.cc/8khyfyh0/IMG-20260509-054523.jpg',
                'https://i.postimg.cc/44z8H8zL/IMG-20260509-054532.jpg',
                'https://i.postimg.cc/FFjPkPjD/IMG-20260509-054551.jpg',
                'https://i.postimg.cc/DfqC4Cqx/IMG-20260509-054600.jpg',
                'https://i.postimg.cc/2j4HLH47/IMG-20260509-054609.jpg',
                'https://i.postimg.cc/gcvMLMvK/IMG-20260509-054628.jpg',
                'https://i.postimg.cc/66dH4HdL/IMG-20260509-054640.jpg',
                'https://i.postimg.cc/44z8H8zv/IMG-20260509-054649.jpg'
            ];

            // 倒序插入，保证第一篇在最上面
            worksArray.reverse().forEach((workData, index) => {
                const finalCategory = workData.category || "涂鸦";
                const randomAvatar = npcAvatars[Math.floor(Math.random() * npcAvatars.length)];
                const newPost = {
                    id: Date.now() + index,
                    author: workData.author || "Anonymous",
                    avatar: randomAvatar,
                    time: "刚刚",
                    category: finalCategory,
                    imageDesc: workData.imageDesc || "",
                    text: workData.text || "无配文",
                    tags: workData.tags || ["Poipiku"],
                    reactions: { 
                        heart: Math.floor(Math.random() * 500) + 10, 
                        star: Math.floor(Math.random() * 100) + 5, 
                        smile: Math.floor(Math.random() * 50) + 1 
                    }
                };
                sysBrowserPoipikuData.unshift(newPost);
            });

            ChatDB.setItem('sys_browser_poipiku_posts', JSON.stringify(sysBrowserPoipikuData));
            sysBrowserRenderPoipiku('home');
            sysBrowserShowToast(`成功生成 ${worksArray.length} 篇动态！`);
        } else {
            sysBrowserShowToast('生成失败，请检查 API。');
        }
    } catch (e) {
        console.error(e);
        sysBrowserShowToast('生成出错：' + e.message);
    } finally {
        btn.innerText = originalBtnText;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    }
}

// ==========================================
// 海棠书屋 (Haitang) 逻辑
// ==========================================
let sysBrowserHaitangData = [];

function sysBrowserRenderHaitang(page, bookId = null, chapterIndex = 0) {
    const body = document.getElementById('sysBrowserHaitangBody');
    const header = document.querySelector('#sys-browser-view-haitang .ht-header');
    const searchBar = document.querySelector('#sys-browser-view-haitang .ht-search-bar');
    const notice = document.querySelector('#sys-browser-view-haitang .ht-notice');
    
    // 退出沉浸式阅读
    const container = document.getElementById('sys-browser-view-haitang');
    const topBar = document.querySelector('.sys-browser-top-bar');
    const bottomBar = document.querySelector('.sys-browser-bottom-bar');
    container.classList.remove('immersive-reading');
    if(topBar) topBar.style.display = 'flex';
    if(bottomBar) bottomBar.style.display = 'flex';
    
    // 沉浸式控制：在详情页和阅读页隐藏海棠的顶栏、搜索栏和公告
    if (page === 'home') {
        if(header) header.style.display = 'flex';
        if(searchBar) searchBar.style.display = 'flex';
        if(notice) notice.style.display = 'block';
    } else if (page === 'setting') {
        if(header) header.style.display = 'flex';
        if(searchBar) searchBar.style.display = 'none';
        if(notice) notice.style.display = 'none';
    } else {
        if(header) header.style.display = 'none';
        if(searchBar) searchBar.style.display = 'none';
        if(notice) notice.style.display = 'none';
    }

    body.innerHTML = '';

    if (page === 'home') {
        let listHtml = '';
        sysBrowserHaitangData.forEach(book => {
            listHtml += `
                <div class="ht-book-item" onclick="sysBrowserRenderHaitang('detail', ${book.id})">
                    <div class="ht-book-left">
                        <span class="ht-book-tag">${book.tag}</span>
                        <span class="ht-book-name">${book.title}</span>
                    </div>
                    <div class="ht-book-author">${book.author}</div>
                </div>
            `;
        });

        body.innerHTML = `
            <div class="ht-section">
                <div class="ht-section-title">
                    <span>★ 最新更新</span>
                    <span class="ht-section-more">更多>></span>
                </div>
                <div class="ht-book-list">
                    ${listHtml}
                </div>
            </div>
            <div class="ht-footer">
                海棠文化线上文学城 版权所有<br>
                Copyright © 2026 Haitang Culture. All Rights Reserved.<br>
                本站所有内容均为网友自由发表，不代表本站立场。
            </div>
        `;
    } else if (page === 'detail') {
        const book = sysBrowserHaitangData.find(b => b.id === bookId);
        if (!book) return;
        
        let chaptersHtml = '';
        let latestChapter = '暂无章节';
        if (book.chapters && book.chapters.length > 0) {
            latestChapter = book.chapters[book.chapters.length - 1].title;
            // 倒序排列章节，符合截图排版
            let reversedChapters = [...book.chapters].reverse();
            reversedChapters.forEach((chap, idx) => {
                let realIdx = book.chapters.length - 1 - idx;
                chaptersHtml += `<div class="ht-chapter-item" onclick="sysBrowserRenderHaitang('chapter', ${book.id}, ${realIdx})">${chap.title}</div>`;
            });
        } else {
            chaptersHtml = `<div class="ht-chapter-item" onclick="sysBrowserRenderHaitang('chapter', ${book.id}, -1)">正文内容</div>`;
        }

        body.innerHTML = `
            <div class="ht-read-header">
                <span onclick="sysBrowserRenderHaitang('home')" style="cursor: pointer;">＜ 返回首页</span>
                <span>书籍详情</span>
                <span style="width: 60px;"></span>
            </div>
            <div class="ht-detail-container">
                <div class="ht-detail-title">${book.title}</div>
                <div class="ht-detail-tags">
                    <span class="ht-detail-tag">${book.author}</span>
                    <span class="ht-detail-tag">连载中</span>
                    <span class="ht-detail-tag">${book.tag}</span>
                </div>
                <div class="ht-detail-info-block">
                    <div class="ht-detail-cover">封面</div>
                    <div class="ht-detail-desc-text">${book.desc || '暂无简介'}</div>
                </div>
                <div class="ht-detail-meta">
                    <div>最新章节：<span style="color: #0055aa;">${latestChapter}</span></div>
                    <div>更新时间：刚刚</div>
                </div>
                <div class="ht-detail-actions">
                    <div class="ht-detail-btn" onclick="sysBrowserRenderHaitang('chapter', ${book.id}, 0)">开始阅读</div>
                    <div class="ht-detail-btn" onclick="sysBrowserAddBookToShelf(${book.id})">加入书架</div>
                    <div class="ht-detail-btn outline" onclick="openHaitangUrgeModal(${book.id})">催更</div>
                </div>
            </div>
            <div class="ht-detail-chapter-section">
                <div class="ht-chapter-section-title">${book.title} 最新章节</div>
                <div class="ht-chapter-list">
                    ${chaptersHtml}
                </div>
            </div>
        `;
    } else if (page === 'chapter') {
        const book = sysBrowserHaitangData.find(b => b.id === bookId);
        if (!book) return;
        
        let chapterTitle = book.title;
        let chapterContent = book.content; 
        
        if (chapterIndex >= 0 && book.chapters && book.chapters[chapterIndex]) {
            chapterTitle = book.chapters[chapterIndex].title;
            chapterContent = book.chapters[chapterIndex].content;
        }

        let prevBtn = chapterIndex > 0 ? `<button onclick="sysBrowserRenderHaitang('chapter', ${book.id}, ${chapterIndex - 1})" style="background: #8b1a1a; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-size: 14px; cursor: pointer;">上一章</button>` : `<button style="background: #ccc; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-size: 14px; cursor: not-allowed;">上一章</button>`;
        let nextBtn = chapterIndex < book.chapters.length - 1 ? `<button onclick="sysBrowserRenderHaitang('chapter', ${book.id}, ${chapterIndex + 1})" style="background: #8b1a1a; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-size: 14px; cursor: pointer;">下一章</button>` : `<button style="background: #ccc; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-size: 14px; cursor: not-allowed;">下一章</button>`;

        body.innerHTML = `
            <div class="ht-read-header">
                <span onclick="sysBrowserRenderHaitang('detail', ${book.id})" style="cursor: pointer;">＜ 返回目录</span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${chapterTitle}</span>
                <span style="width: 60px;"></span>
            </div>
            <div class="ht-article-content" onclick="toggleHaitangImmersive()">
                <h2 style="color: #8b1a1a; font-size: 18px; margin-bottom: 20px; text-align: center;">${chapterTitle}</h2>
                ${chapterContent}
            </div>
            <div class="ht-read-footer" style="text-align: center; padding: 20px; display: flex; justify-content: center; gap: 15px; align-items: center; flex-wrap: wrap;">
                ${prevBtn}
                <button onclick="toggleHaitangImmersive()" style="background: #f0d0d5; color: #8b1a1a; border: 1px solid #8b1a1a; padding: 8px 20px; border-radius: 4px; font-size: 14px; cursor: pointer;">沉浸式阅读</button>
                ${nextBtn}
            </div>
        `;
    } else if (page === 'setting') {
        // 读取已保存的设置
        let savedSettings = JSON.parse(ChatDB.getItem('haitang_gen_settings') || '{}');

        let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
        let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
        let char1Options = '<option value="">请选择角色</option>';
        let char2Options = '<option value="">请选择角色</option>';
        
        allEntities.forEach(e => {
            if (e.isNPC || e.isGroup) return;
            let realName = e.name || e.netName || '未命名';
            if (e.isAccount) {
                const persona = personas.find(p => p.id === e.personaId);
                if (persona && persona.realName) {
                    realName = persona.realName;
                }
            }
            const type = e.isAccount ? '用户' : '角色';
            char1Options += `<option value="${e.id}" ${savedSettings.char1Id === e.id ? 'selected' : ''}>${realName} (${type})</option>`;
            char2Options += `<option value="${e.id}" ${savedSettings.char2Id === e.id ? 'selected' : ''}>${realName} (${type})</option>`;
        });

        let stylePresets = JSON.parse(ChatDB.getItem('tav_presets_style') || '[]');
        let styleOptions = '<option value="">请选择预设文风 (可选)</option>';
        if (stylePresets.length === 0) {
            styleOptions = '<option value="">暂无文风预设，请先在酒馆配置</option>';
        } else {
            stylePresets.forEach(p => {
                styleOptions += `<option value="${p.content.replace(/"/g, '&quot;')}" ${savedSettings.style === p.content ? 'selected' : ''}>${p.name}</option>`;
            });
        }

        body.innerHTML = `
            <div style="padding: 20px;">
                <h2 style="color: #8b1a1a; border-bottom: 2px solid #8b1a1a; padding-bottom: 10px; margin-bottom: 20px; font-size: 16px;">海棠书屋 - AI 产粮设置</h2>
                
                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">主角 A (必选)</label>
                    <select id="htSettingChar1" class="poipiku-input" style="border-color: #e5a5ab;">${char1Options}</select>
                </div>
                
                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">主角 B (可选)</label>
                    <select id="htSettingChar2" class="poipiku-input" style="border-color: #e5a5ab;">${char2Options}</select>
                </div>

                <div style="display: flex; gap: 15px;">
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label style="color: #8b1a1a;">生成书籍数量</label>
                        <input type="number" id="htSettingCount" class="poipiku-input" value="${savedSettings.postCount !== undefined ? savedSettings.postCount : 1}" min="1" style="border-color: #e5a5ab;">
                    </div>
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label style="color: #8b1a1a;">分类标签</label>
                        <select id="htSettingCategory" class="poipiku-input" style="border-color: #e5a5ab;">
                            <option value="[言情]">[言情]</option>
                            <option value="[同人]">[同人]</option>
                            <option value="[原创]">[原创]</option>
                            <option value="[耽美]">[耽美]</option>
                            <option value="[百合]">[百合]</option>
                        </select>
                    </div>
                </div>

                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">每章字数要求</label>
                    <input type="text" id="htSettingLength" class="poipiku-input" value="${savedSettings.textLength || '800字左右'}" placeholder="例如：800字左右" style="border-color: #e5a5ab;">
                </div>

                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">关联世界书</label>
                    <div id="poipikuGenWbSelectText" onclick="openPoipikuWbSelectModal()" class="poipiku-input" style="cursor: pointer; text-align: center; background: #fff; color: #888; border-color: #e5a5ab;">未选择 (点击选择)</div>
                </div>

                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">预设文风</label>
                    <select id="htSettingStyle" class="poipiku-input" style="border-color: #e5a5ab;">
                        ${styleOptions}
                    </select>
                </div>

                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">剧情大纲/XP要求</label>
                    <textarea id="htSettingPrompt" class="poipiku-textarea" placeholder="例如：写一段他们久别重逢的剧情，张力拉满..." style="border-color: #e5a5ab;">${savedSettings.prompt || ''}</textarea>
                </div>

                <button onclick="executeHaitangGenAPI()" style="width: 100%; background: #8b1a1a; color: #fff; border: none; padding: 14px; border-radius: 4px; font-size: 15px; font-weight: bold; cursor: pointer; margin-top: 10px;">开始生成 (Generate)</button>
            </div>
        `;
        
        // 恢复分类标签
        if (savedSettings.category) {
            document.getElementById('htSettingCategory').value = savedSettings.category;
        }
        
        // 恢复世界书选择
        currentPoipikuWbEntries = savedSettings.wbEntries || [];
        if (currentPoipikuWbEntries.length > 0) {
            const textEl = document.getElementById('poipikuGenWbSelectText');
            if(textEl) {
                textEl.innerText = `已选 ${currentPoipikuWbEntries.length} 个条目`;
                textEl.style.color = '#111';
            }
        }
    }
}

async function executeHaitangGenAPI() {
    const char1Id = document.getElementById('htSettingChar1').value;
    const char2Id = document.getElementById('htSettingChar2').value;
    const postCount = parseInt(document.getElementById('htSettingCount').value) || 1;
    const category = document.getElementById('htSettingCategory').value;
    const textLength = document.getElementById('htSettingLength').value.trim() || '适中';
    const style = document.getElementById('htSettingStyle').value;
    const customPrompt = document.getElementById('htSettingPrompt').value.trim();

    if (!char1Id) return alert('请至少选择主角 A！');

    // 保存设置到本地数据库
    const settingsToSave = {
        char1Id, char2Id, postCount, category, textLength, style, prompt: customPrompt, wbEntries: currentPoipikuWbEntries
    };
    ChatDB.setItem('haitang_gen_settings', JSON.stringify(settingsToSave));

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        return alert('请先在设置中配置 API 信息！');
    }

    let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    
    const char1 = allEntities.find(e => e.id === char1Id);
    const char2 = char2Id ? allEntities.find(e => e.id === char2Id) : null;

    let char1RealName = char1.name || char1.netName || '未命名';
    let char1Desc = char1.description || '无';
    if (char1.isAccount) {
        const p = personas.find(p => p.id === char1.personaId);
        if (p) { char1RealName = p.realName || char1RealName; char1Desc = p.persona || '普通用户'; }
    }

    let char2RealName = '';
    let char2Desc = '';
    if (char2) {
        char2RealName = char2.name || char2.netName || '未命名';
        char2Desc = char2.description || '无';
        if (char2.isAccount) {
            const p = personas.find(p => p.id === char2.personaId);
            if (p) { char2RealName = p.realName || char2RealName; char2Desc = p.persona || '普通用户'; }
        }
    }

    let wbContext = '';
    if (currentPoipikuWbEntries.length > 0) {
        let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
        let entries = wbData.entries.filter(e => currentPoipikuWbEntries.includes(e.id));
        wbContext = entries.map(e => e.content).join('\n');
    }

    let prompt = `你是一个在海棠书屋（海棠文化线上文学城）上连载小说的作者。
请根据以下设定，生成 ${postCount} 本小说。每本小说需要包含简介和 2 个章节的正文。小说正文内容需要直白露骨，色情。

【主角 A】：${char1RealName}
设定：${char1Desc}

${char2 ? `【主角 B】：${char2RealName}\n设定：${char2Desc}\n` : ''}
${wbContext ? `【世界观背景】：\n${wbContext}\n` : ''}
${style ? `【文风要求】：${style}\n` : ''}
${customPrompt ? `【剧情大纲/XP要求】：${customPrompt}\n` : ''}
【每章字数要求】：${textLength}

请严格返回一个合法的 JSON 数组，包含 ${postCount} 个对象，格式如下：
[
  {
    "title": "《这里写小说的书名》",
    "author": "这里写作者笔名（可以是你自己编的）",
    "tag": "${category}",
    "desc": "这里写小说的文案简介，吸引读者阅读",
    "chapters": [
        {
            "title": "第一章 章节名",
            "content": "这里写第一章的正文内容，使用 HTML 标签如 <p> 进行段落排版"
        },
        {
            "title": "第二章 章节名",
            "content": "这里写第二章的正文内容，使用 HTML 标签如 <p> 进行段落排版"
        }
    ]
  }
]
注意：只返回 JSON 数组，不要包含任何 markdown 标记（如 \`\`\`json）。`;

    sysBrowserShowToast(`正在码字中，请稍候...`, 0); // 传入 0 表示不自动隐藏

    try {
        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            })
        });

        if (response.ok) {
            const data = await response.json();
            let replyRaw = data.choices[0].message.content.trim();
            replyRaw = replyRaw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            
            const parsed = JSON.parse(replyRaw);
            let worksArray = Array.isArray(parsed) ? parsed : [parsed];
            
            worksArray.reverse().forEach((workData, index) => {
                const newPost = {
                    id: Date.now() + index,
                    title: workData.title || "《未命名》",
                    author: workData.author || "匿名写手",
                    tag: workData.tag || category,
                    desc: workData.desc || "暂无简介",
                    chapters: workData.chapters || [],
                    char1Id: char1Id,
                    char2Id: char2Id
                };
                sysBrowserHaitangData.unshift(newPost);
            });

            sysBrowserRenderHaitang('home');
            sysBrowserShowToast(`成功生成 ${worksArray.length} 本小说！`);
        } else {
            sysBrowserShowToast('生成失败，请检查 API。');
        }
    } catch (e) {
        console.error(e);
        sysBrowserShowToast('生成出错：' + e.message);
    }
}

// ==========================================
// 书架逻辑 (Bookshelf)
// ==========================================
function sysBrowserAddBookToShelf(bookId) {
    const book = sysBrowserHaitangData.find(b => b.id === bookId);
    if (!book) return;
    
    let shelf = JSON.parse(ChatDB.getItem('sys_browser_bookshelf') || '[]');
    if (shelf.find(b => b.id === bookId)) {
        sysBrowserShowToast('已在书架中');
        return;
    }
    
    shelf.push({ id: book.id, title: book.title, author: book.author });
    ChatDB.setItem('sys_browser_bookshelf', JSON.stringify(shelf));
    sysBrowserShowToast('已加入书架');
}

function sysBrowserOpenBookshelf() {
    sysBrowserToggleMenu();
    sysBrowserSwitchView('bookshelf');
    sysBrowserAddressText.innerText = '我的书架';
    
    const grid = document.getElementById('sysBrowserBookshelfGrid');
    grid.innerHTML = '';
    let shelf = JSON.parse(ChatDB.getItem('sys_browser_bookshelf') || '[]');
    
    if (shelf.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #aaa; font-size: 13px;">书架空空如也</div>';
        return;
    }
    
    shelf.forEach(book => {
        const item = document.createElement('div');
        item.className = 'sys-browser-bookshelf-item';
        item.onclick = () => {
            sysBrowserNavigateTo('haitang', 'haitang');
            setTimeout(() => sysBrowserRenderHaitang('detail', book.id), 100);
        };
        
        item.innerHTML = `
            <div class="sys-browser-bookshelf-cover">${book.title.replace(/《|》/g, '')}</div>
            <div class="sys-browser-bookshelf-title">${book.title}</div>
        `;
        
        const delBtn = document.createElement('div');
        delBtn.className = 'sys-browser-bookshelf-delete';
        delBtn.innerText = '×';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            shelf = shelf.filter(b => b.id !== book.id);
            ChatDB.setItem('sys_browser_bookshelf', JSON.stringify(shelf));
            item.remove();
            if (shelf.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #aaa; font-size: 13px;">书架空空如也</div>';
            }
        };
        item.appendChild(delBtn);
        grid.appendChild(item);
    });
}

// ==========================================
// 海棠书屋 催更逻辑
// ==========================================
function openHaitangUrgeModal(bookId) {
    document.getElementById('htUrgeBookId').value = bookId;
    document.getElementById('htUrgePlotInput').value = '';
    document.getElementById('haitangUrgeModalOverlay').classList.add('show');
}

function closeHaitangUrgeModal() {
    document.getElementById('haitangUrgeModalOverlay').classList.remove('show');
}

async function confirmHaitangUrge() {
    const bookId = parseInt(document.getElementById('htUrgeBookId').value);
    const plot = document.getElementById('htUrgePlotInput').value.trim();
    const length = document.getElementById('htUrgeLengthInput').value.trim() || '适中';
    
    const book = sysBrowserHaitangData.find(b => b.id === bookId);
    if (!book) return;

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        return alert('请先在设置中配置 API 信息！');
    }

    closeHaitangUrgeModal();
    sysBrowserShowToast('作者正在爆肝码字中，请稍候...', 0); // 传入 0 表示不自动隐藏

    // 构建前文摘要 (取最后一章)
    let previousContext = '';
    if (book.chapters && book.chapters.length > 0) {
        const lastChapter = book.chapters[book.chapters.length - 1];
        previousContext = `【上一章内容回顾】：\n${lastChapter.content}\n\n`;
    }

    // 构建角色人设上下文
    let charactersContext = '';
    let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');

    if (book.char1Id) {
        const char1 = allEntities.find(e => e.id === book.char1Id);
        if (char1) {
            let char1RealName = char1.name || char1.netName || '未命名';
            let char1Desc = char1.description || '无';
            if (char1.isAccount) {
                const p = personas.find(p => p.id === char1.personaId);
                if (p) { char1RealName = p.realName || char1RealName; char1Desc = p.persona || '普通用户'; }
            }
            charactersContext += `【主角 A】：${char1RealName}\n设定：${char1Desc}\n\n`;
        }
    }

    if (book.char2Id) {
        const char2 = allEntities.find(e => e.id === book.char2Id);
        if (char2) {
            let char2RealName = char2.name || char2.netName || '未命名';
            let char2Desc = char2.description || '无';
            if (char2.isAccount) {
                const p = personas.find(p => p.id === char2.personaId);
                if (p) { char2RealName = p.realName || char2RealName; char2Desc = p.persona || '普通用户'; }
            }
            charactersContext += `【主角 B】：${char2RealName}\n设定：${char2Desc}\n\n`;
        }
    }

    // 构建海棠设置绑定的世界书上下文 (从本地存储读取)
    let wbContext = '';
    let savedSettings = JSON.parse(ChatDB.getItem('haitang_gen_settings') || '{}');
    let savedWbEntries = savedSettings.wbEntries || [];
    if (savedWbEntries.length > 0) {
        let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
        let entries = wbData.entries.filter(e => savedWbEntries.includes(e.id));
        wbContext = entries.map(e => e.content).join('\n');
    }

    let prompt = `你是一个在海棠书屋连载小说的作者。
现在读者对你的小说《${book.title}》发起了催更。
请根据读者的要求，续写下一章的正文。

${charactersContext}
${wbContext ? `【世界观背景】：\n${wbContext}\n` : ''}
${previousContext}
【读者要求的下一章剧情走向】：${plot ? plot : '顺着上一章的剧情自然发展'}
【字数要求】：${length}

请严格返回一个合法的 JSON 对象，格式如下：
{
    "title": "第X章 章节名",
    "content": "这里写新章节的正文内容，使用 HTML 标签如 <p> 进行段落排版"
}
注意：只返回 JSON 对象，不要包含任何 markdown 标记（如 \`\`\`json）。`;

    try {
        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            })
        });

        if (response.ok) {
            const data = await response.json();
            let replyRaw = data.choices[0].message.content.trim();
            replyRaw = replyRaw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            
            const parsed = JSON.parse(replyRaw);
            
            if (!book.chapters) book.chapters = [];
            book.chapters.push({
                title: parsed.title || `新章节`,
                content: parsed.content || "<p>无内容</p>"
            });

            sysBrowserRenderHaitang('detail', book.id);
            sysBrowserShowToast('催更成功！新章节已更新！');
        } else {
            sysBrowserShowToast('催更失败，请检查 API。');
        }
    } catch (e) {
        console.error(e);
        sysBrowserShowToast('催更出错：' + e.message);
    }
}

window.toggleHaitangImmersive = function() {
    const container = document.getElementById('sys-browser-view-haitang');
    const topBar = document.querySelector('.sys-browser-top-bar');
    const bottomBar = document.querySelector('.sys-browser-bottom-bar');
    
    if (container.classList.contains('immersive-reading')) {
        container.classList.remove('immersive-reading');
        if(topBar) topBar.style.display = 'flex';
        if(bottomBar) bottomBar.style.display = 'flex';
    } else {
        container.classList.add('immersive-reading');
        if(topBar) topBar.style.display = 'none';
        if(bottomBar) bottomBar.style.display = 'none';
    }
};
