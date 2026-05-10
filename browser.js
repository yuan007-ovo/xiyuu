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

// Poipiku 模拟数据
const sysBrowserPoipikuData = [
    {
        id: 1,
        author: "AI_Creator",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AI",
        time: "刚刚",
        category: "R18G / 剧透",
        imageDesc: "一张充满赛博朋克风格的城市夜景图，霓虹灯闪烁，两个身影在雨中并肩而立。",
        text: "随便摸了一张，感觉氛围还不错。大家随便看看~",
        tags: ["赛博朋克", "摸鱼", "夜景"],
        reactions: { heart: 128, star: 45, smile: 32 }
    },
    {
        id: 2,
        author: "Anonymous",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anon",
        time: "2小时前",
        category: "涂鸦 / WIP",
        imageDesc: "一张未完成的线稿，画着一个正在喝咖啡的慵懒角色。",
        text: "线稿阶段，不知道什么时候能上完色_(:з」∠)_",
        tags: ["WIP", "线稿", "日常"],
        reactions: { heart: 56, star: 12, smile: 8 }
    }
];


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
                        <div class="poipiku-actions">
                            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="#999"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
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
        let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
        let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
        let charOptions = '<option value="">请选择角色</option>';
        
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
            charOptions += `<option value="${e.id}">${realName} (${type})</option>`;
        });

        let stylePresets = JSON.parse(ChatDB.getItem('tav_presets_style') || '[]');
        let styleOptions = '<option value="">请选择预设文风 (可选)</option>';
        if (stylePresets.length === 0) {
            styleOptions = '<option value="">暂无文风预设，请先在酒馆配置</option>';
        } else {
            stylePresets.forEach(p => {
                styleOptions += `<option value="${p.content.replace(/"/g, '&quot;')}">${p.name}</option>`;
            });
        }

        body.innerHTML = `
            <div class="poipiku-card" style="padding: 20px;">
                <h2 style="color: #1da1f2; border-bottom: 2px solid #1da1f2; padding-bottom: 10px; margin-bottom: 20px; font-weight: 900;">AI Generation Settings</h2>
                
                <div class="poipiku-input-group">
                    <label>Character A (主角 A - 必选)</label>
                    <select id="poipikuSettingChar1" class="poipiku-input">${charOptions}</select>
                </div>
                
                <div class="poipiku-input-group">
                    <label>Character B (主角 B - 可选)</label>
                    <select id="poipikuSettingChar2" class="poipiku-input">${charOptions}</select>
                </div>

                <div style="display: flex; gap: 15px;">
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label>图文插画数量</label>
                        <input type="number" id="poipikuSettingImageCount" class="poipiku-input" value="1" min="0" placeholder="填0则不生成">
                    </div>
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label>同人文数量</label>
                        <input type="number" id="poipikuSettingTextCount" class="poipiku-input" value="1" min="0" placeholder="填0则不生成">
                    </div>
                </div>
                <div class="poipiku-input-group">
                    <label>同人文字数要求</label>
                    <input type="text" id="poipikuSettingTextLength" class="poipiku-input" value="500字左右" placeholder="例如：500字左右，或长篇大论">
                </div>

                <div class="poipiku-input-group">
                    <label>Category (分类标签)</label>
                    <select id="poipikuSettingCategory" class="poipiku-input">
                        <option value="random">随机生成 (Random)</option>
                        <option value="过去的">过去的</option>
                        <option value="涂鸦">涂鸦</option>
                        <option value="R18">R18</option>
                        <option value="剧透">剧透</option>
                        <option value="短打">短打</option>
                    </select>
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
                    <textarea id="poipikuSettingPrompt" class="poipiku-textarea" placeholder="例如：画一张他们在海边散步的图，配文要显得很慵懒..."></textarea>
                </div>

                <button class="poipiku-submit-btn" onclick="executePoipikuGenAPI()">上传 (Generate)</button>
            </div>
        `;
        currentPoipikuWbEntries = [];
    }
}

// --- 菜单与 Toast ---
function sysBrowserToggleMenu() {
    sysBrowserMenuOverlay.classList.toggle('show');
}

function sysBrowserShowToast(text) {
    if(sysBrowserMenuOverlay.classList.contains('show')) sysBrowserToggleMenu();
    const toast = document.getElementById('sysBrowserToast');
    document.getElementById('sysBrowserToastText').innerText = text;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function sysBrowserShareToChar() {
    sysBrowserShowToast('已分享给 Ta');
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

function sysBrowserOpenSettings() {
    sysBrowserToggleMenu();
    sysBrowserSwitchView('settings');
    sysBrowserAddressText.innerText = '设置';
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
    const char1Id = document.getElementById('poipikuSettingChar1').value;
    const char2Id = document.getElementById('poipikuSettingChar2').value;
    const imageCount = parseInt(document.getElementById('poipikuSettingImageCount').value) || 0;
    const textCount = parseInt(document.getElementById('poipikuSettingTextCount').value) || 0;
    const textLength = document.getElementById('poipikuSettingTextLength').value.trim() || '适中';
    const category = document.getElementById('poipikuSettingCategory').value;
    const style = document.getElementById('poipikuSettingStyle').value;
    const customPrompt = document.getElementById('poipikuSettingPrompt').value.trim();

    if (!char1Id) return alert('请至少选择主角 A！');
    if (imageCount <= 0 && textCount <= 0) return alert('请至少生成1篇内容！');

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        return alert('请先在设置中配置 API 信息！');
    }

    let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    
    const char1 = allEntities.find(e => e.id === char1Id);
    const char2 = char2Id ? allEntities.find(e => e.id === char2Id) : null;

    // 获取真名和设定
    let char1RealName = char1.name || char1.netName || '未命名';
    let char1Desc = char1.description || '无';
    if (char1.isAccount) {
        const p = personas.find(p => p.id === char1.personaId);
        if (p) {
            char1RealName = p.realName || char1RealName;
            char1Desc = p.persona || '普通用户';
        }
    }

    let char2RealName = '';
    let char2Desc = '';
    if (char2) {
        char2RealName = char2.name || char2.netName || '未命名';
        char2Desc = char2.description || '无';
        if (char2.isAccount) {
            const p = personas.find(p => p.id === char2.personaId);
            if (p) {
                char2RealName = p.realName || char2RealName;
                char2Desc = p.persona || '普通用户';
            }
        }
    }

    let wbContext = '';
    if (currentPoipikuWbEntries.length > 0) {
        let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
        let entries = wbData.entries.filter(e => currentPoipikuWbEntries.includes(e.id));
        wbContext = entries.map(e => e.content).join('\n');
    }

    const totalCount = imageCount + textCount;

    let prompt = `你是一个在 Poipiku 上发布作品的创作者。
请根据以下设定，生成 ${totalCount} 篇 Poipiku 动态。其中包含 ${imageCount} 篇图文插画动态，和 ${textCount} 篇同人文动态。

【主角 A】：${char1RealName}
设定：${char1Desc}

${char2 ? `【主角 B】：${char2RealName}\n设定：${char2Desc}\n` : ''}
${wbContext ? `【世界观背景】：\n${wbContext}\n` : ''}
${style ? `【文风要求】：${style}\n` : ''}
${customPrompt ? `【画面与配文要求】：${customPrompt}\n` : ''}
【同人文字数要求】：${textLength}

请严格返回一个合法的 JSON 数组，包含 ${totalCount} 个对象。
对于图文插画动态，格式如下：
  {
    "category": "如果分类是'random'，请你根据内容随机生成一个简短的分类词（如：涂鸦、R18、剧透、日常等），否则使用设定的分类",
    "imageDesc": "详细描述你画的图片画面内容（因为无法直接生成图片，请用文字详细描述画面）",
    "text": "你发布这张图时配的文字（可以带点画师的吐槽、碎碎念）",
    "tags": ["标签1", "标签2"]
  }
对于同人文动态，格式如下：
  {
    "category": "如果分类是'random'，请你根据内容随机生成一个简短的分类词（如：短打、段子、同人、R18等），否则使用设定的分类",
    "imageDesc": "", 
    "text": "这里写同人文/短打的正文内容，字数尽量符合要求，使用 HTML 标签如 <p> 进行段落排版",
    "tags": ["标签1", "标签2"]
  }

注意：只返回 JSON 数组，不要包含任何 markdown 标记（如 \`\`\`json）。`;

    sysBrowserShowToast(`AI 正在创作 ${totalCount} 篇动态，请稍候...`);

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
            
            // 倒序插入，保证第一篇在最上面
            worksArray.reverse().forEach((workData, index) => {
                const finalCategory = (category === 'random' || !category) ? (workData.category || "涂鸦") : category;
                const newPost = {
                    id: Date.now() + index,
                    author: char1RealName,
                    avatar: char1.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + char1RealName,
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

            sysBrowserRenderPoipiku('home');
            sysBrowserShowToast(`成功生成 ${worksArray.length} 篇动态！`);
        } else {
            sysBrowserShowToast('生成失败，请检查 API。');
        }
    } catch (e) {
        console.error(e);
        sysBrowserShowToast('生成出错：' + e.message);
    }
}

// ==========================================
// 海棠书屋 (Haitang) 逻辑
// ==========================================
let sysBrowserHaitangData = [
    {
        id: 1,
        title: "《穿成反派的娇软小师弟》",
        author: "匿名写手",
        tag: "[耽美]",
        desc: "他睁开眼，发现自己躺在一张古色古香的雕花大床上。脑海中涌入的记忆告诉他，他穿书了，穿成了一本修真文里前期欺辱反派，后期被反派千刀万剐的炮灰小师弟...",
        chapters: [
            {
                title: "第一章 穿越",
                content: "<p>他睁开眼，发现自己躺在一张古色古香的雕花大床上。脑海中涌入的记忆告诉他，他穿书了，穿成了一本修真文里前期欺辱反派，后期被反派千刀万剐的炮灰小师弟。</p><p>看着推门进来的那个眼神阴郁的玄衣少年，他咽了口唾沫，决定从今天开始抱紧反派大腿。</p>"
            },
            {
                title: "第二章 讨好",
                content: "<p>“师兄，你渴不渴？我给你倒水。”他小心翼翼地凑过去。</p><p>反派冷冷地看着他，眼中闪过一丝杀意：“滚。”</p>"
            }
        ]
    },
    {
        id: 2,
        title: "《赛博朋克之绝对控制》",
        author: "AI_001",
        tag: "[同人]",
        desc: "霓虹灯闪烁的夜之城，雨水冲刷着冰冷的机械义体。他咬紧牙关，没有说话，只是死死盯着眼前这个掌控着整个城市命脉的男人...",
        chapters: [
            {
                title: "第一章 夜之城",
                content: "<p>霓虹灯闪烁的夜之城，雨水冲刷着冰冷的机械义体。</p><p>“你以为你能逃出我的手心？”男人低沉的声音在耳边响起，带着金属合成的电流音。</p><p>他咬紧牙关，没有说话，只是死死盯着眼前这个掌控着整个城市命脉的男人。</p>"
            }
        ]
    }
];

function sysBrowserRenderHaitang(page, bookId = null, chapterIndex = 0) {
    const body = document.getElementById('sysBrowserHaitangBody');
    const header = document.querySelector('#sys-browser-view-haitang .ht-header');
    const searchBar = document.querySelector('#sys-browser-view-haitang .ht-search-bar');
    const notice = document.querySelector('#sys-browser-view-haitang .ht-notice');
    
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

        body.innerHTML = `
            <div class="ht-read-header">
                <span onclick="sysBrowserRenderHaitang('detail', ${book.id})" style="cursor: pointer;">＜ 返回目录</span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${chapterTitle}</span>
                <span style="width: 60px;"></span>
            </div>
            <div class="ht-article-content">
                <h2 style="color: #8b1a1a; font-size: 18px; margin-bottom: 20px; text-align: center;">${chapterTitle}</h2>
                ${chapterContent}
            </div>
            <div style="text-align: center; padding: 20px; display: flex; justify-content: center; gap: 15px;">
                <button onclick="sysBrowserRenderHaitang('detail', ${book.id})" style="background: #8b1a1a; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-size: 14px; cursor: pointer;">返回目录</button>
            </div>
        `;
    } else if (page === 'setting') {
        let allEntities = typeof getAllEntities === 'function' ? getAllEntities() : [];
        let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
        let charOptions = '<option value="">请选择角色</option>';
        
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
            charOptions += `<option value="${e.id}">${realName} (${type})</option>`;
        });

        let stylePresets = JSON.parse(ChatDB.getItem('tav_presets_style') || '[]');
        let styleOptions = '<option value="">请选择预设文风 (可选)</option>';
        if (stylePresets.length === 0) {
            styleOptions = '<option value="">暂无文风预设，请先在酒馆配置</option>';
        } else {
            stylePresets.forEach(p => {
                styleOptions += `<option value="${p.content.replace(/"/g, '&quot;')}">${p.name}</option>`;
            });
        }

        body.innerHTML = `
            <div style="padding: 20px;">
                <h2 style="color: #8b1a1a; border-bottom: 2px solid #8b1a1a; padding-bottom: 10px; margin-bottom: 20px; font-size: 16px;">海棠书屋 - AI 产粮设置</h2>
                
                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">主角 A (必选)</label>
                    <select id="htSettingChar1" class="poipiku-input" style="border-color: #e5a5ab;">${charOptions}</select>
                </div>
                
                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">主角 B (可选)</label>
                    <select id="htSettingChar2" class="poipiku-input" style="border-color: #e5a5ab;">${charOptions}</select>
                </div>

                <div style="display: flex; gap: 15px;">
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label style="color: #8b1a1a;">生成书籍数量</label>
                        <input type="number" id="htSettingCount" class="poipiku-input" value="1" min="1" style="border-color: #e5a5ab;">
                    </div>
                    <div class="poipiku-input-group" style="flex: 1;">
                        <label style="color: #8b1a1a;">分类标签</label>
                        <select id="htSettingCategory" class="poipiku-input" style="border-color: #e5a5ab;">
                            <option value="[耽美]">[耽美]</option>
                            <option value="[同人]">[同人]</option>
                            <option value="[原创]">[原创]</option>
                            <option value="[言情]">[言情]</option>
                            <option value="[百合]">[百合]</option>
                        </select>
                    </div>
                </div>

                <div class="poipiku-input-group">
                    <label style="color: #8b1a1a;">每章字数要求</label>
                    <input type="text" id="htSettingLength" class="poipiku-input" value="800字左右" placeholder="例如：800字左右" style="border-color: #e5a5ab;">
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
                    <textarea id="htSettingPrompt" class="poipiku-textarea" placeholder="例如：写一段他们久别重逢的剧情，张力拉满..." style="border-color: #e5a5ab;"></textarea>
                </div>

                <button onclick="executeHaitangGenAPI()" style="width: 100%; background: #8b1a1a; color: #fff; border: none; padding: 14px; border-radius: 4px; font-size: 15px; font-weight: bold; cursor: pointer; margin-top: 10px;">开始生成 (Generate)</button>
            </div>
        `;
        currentPoipikuWbEntries = []; // 复用世界书选择变量
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

    sysBrowserShowToast(`AI 正在码字中，请稍候...`);

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
                    chapters: workData.chapters || []
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
    sysBrowserShowToast('作者正在爆肝码字中，请稍候...');

    // 构建前文摘要 (取最后一章)
    let previousContext = '';
    if (book.chapters && book.chapters.length > 0) {
        const lastChapter = book.chapters[book.chapters.length - 1];
        previousContext = `【上一章内容回顾】：\n${lastChapter.content}\n\n`;
    }

    let prompt = `你是一个在海棠书屋连载小说的作者。
现在读者对你的小说《${book.title}》发起了催更。
请根据读者的要求，续写下一章的正文。

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
