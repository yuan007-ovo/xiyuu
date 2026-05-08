// ==========================================
// DayAPP 专属逻辑 (day.js)
// ==========================================

let dayAppData = {
    user: { title: "User's Day", avatar: "", id: "" },
    char: { title: "Char's Day", avatar: "", id: "" }
};

// 1. 从数据库读取上次保存的视角、选中日期和当前月份
let currentDayView = ChatDB.getItem('day_current_view') || 'user';

let savedSelectedDate = ChatDB.getItem('day_selected_date');
let daySelectedDate = savedSelectedDate ? new Date(savedSelectedDate) : new Date();

let savedCurrentDate = ChatDB.getItem('day_current_date');
let dayCurrentDate = savedCurrentDate ? new Date(savedCurrentDate) : new Date(daySelectedDate);

// 2. 获取当前视角对应的真实 ID
function getDayTargetId() {
    if (currentDayView === 'user') {
        return ChatDB.getItem('day_last_user_id') || ChatDB.getItem('current_login_account') || 'default';
    } else {
        return ChatDB.getItem('day_last_char_id') || (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId ? currentChatRoomCharId : 'default');
    }
}

// 3. 格式化日期为 YYYY-MM-DD
function getDayDateStr(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

// 4. 打开 DayAPP
function openDayApp() {
    // 重新读取视角
    currentDayView = ChatDB.getItem('day_current_view') || 'user';

    // 初始化当前用户 (优先读取上次选中的，否则读取当前登录的)
    let savedUserId = ChatDB.getItem('day_last_user_id') || ChatDB.getItem('current_login_account');
    if (savedUserId) {
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        let acc = accounts.find(a => a.id === savedUserId);
        if (acc) {
            dayAppData.user.id = acc.id;
            dayAppData.user.title = acc.netName || 'User';
            dayAppData.user.avatar = acc.avatarUrl || '';
            document.getElementById('dayNavUserAvatar').style.backgroundImage = `url('${acc.avatarUrl || ''}')`;
        }
    }

    // 初始化当前角色 (优先读取上次选中的，否则读取当前聊天室的)
    let savedCharId = ChatDB.getItem('day_last_char_id') || (typeof currentChatRoomCharId !== 'undefined' ? currentChatRoomCharId : null);
    if (savedCharId) {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let c = chars.find(c => c.id === savedCharId);
        if (c) {
            dayAppData.char.id = c.id;
            // 【核心修改】：强制显示 Char 的真名
            dayAppData.char.title = c.name || '未知角色';
            dayAppData.char.avatar = c.avatarUrl || '';
            document.getElementById('dayNavCharAvatar').style.backgroundImage = `url('${c.avatarUrl || ''}')`;
        }
    }

    // 更新底栏高亮状态
    document.getElementById('dayNavUserAvatar').classList.toggle('active', currentDayView === 'user');
    document.getElementById('dayNavCharAvatar').classList.toggle('active', currentDayView === 'char');

    document.getElementById('dayAppPanel').style.display = 'flex';
    renderDayData(currentDayView); 
}

function closeDayApp() {
    document.getElementById('dayAppPanel').style.display = 'none';
    closeDayModal('dayAccountModal');
}

// 5. 切换视角 (User / Char)
function switchDayView(view) {
    if (currentDayView === view) return;
    currentDayView = view;
    ChatDB.setItem('day_current_view', view); // 持久化保存当前视角
    
    // 动画过渡
    const contentEl = document.getElementById('dayMainContent');
    contentEl.classList.add('fade');
    
    setTimeout(() => {
        renderDayData(view);
        contentEl.classList.remove('fade');
    }, 300);

    // 更新底栏状态
    document.getElementById('dayNavUserAvatar').classList.toggle('active', view === 'user');
    document.getElementById('dayNavCharAvatar').classList.toggle('active', view === 'char');
}

// 静态节假日数据 (MM-DD)
const staticHolidays = {
    "01-01": "元旦",
    "02-14": "情人节",
    "03-08": "妇女节",
    "04-01": "愚人节",
    "05-01": "劳动节",
    "06-01": "儿童节",
    "10-01": "国庆节",
    "12-24": "平安夜",
    "12-25": "圣诞节"
};

// 6. 渲染核心数据 (日历 + 双轨时间线)
function renderDayData(view) {
    const data = dayAppData[view];
    
    // 更新 Header
    document.getElementById('dayHeaderTitle').innerText = data.title;
    document.getElementById('dayTopAvatar').style.backgroundImage = `url('${data.avatar}')`;

    // 同步更新顶部显示的日期文字
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateText = `${months[daySelectedDate.getMonth()]} ${daySelectedDate.getDate()}, ${days[daySelectedDate.getDay()]}`;
    const headerDateEl = document.getElementById('dayHeaderDate');
    if (headerDateEl) headerDateEl.innerText = dateText;

    // 渲染日历
    renderDayCalendar();

    const targetId = getDayTargetId();
    const dateStr = getDayDateStr(daySelectedDate);
    const monthDayStr = `${String(daySelectedDate.getMonth() + 1).padStart(2, '0')}-${String(daySelectedDate.getDate()).padStart(2, '0')}`;

    // 读取纪念日 (按月日匹配，每年重复)
    let allAnnivs = JSON.parse(ChatDB.getItem(`day_annivs_${view}_${targetId}`) || '[]');
    let todayAnnivs = allAnnivs.filter(a => a.date && a.date.endsWith(monthDayStr));
    let holidayName = staticHolidays[monthDayStr];

    // 渲染纪念日与节假日
    const annivTitle = document.getElementById('dayAnnivTitle');
    const annivList = document.getElementById('dayAnnivList');
    if (annivTitle && annivList) {
        if (todayAnnivs.length > 0 || holidayName) {
            annivTitle.style.display = 'block';
            // 绘制贯穿的浅灰色竖轴线
            let html = '<div style="position: absolute; left: 9px; top: 20px; bottom: 20px; width: 2px; background: #f0f0f0; z-index: 1;"></div>';
            
            if (holidayName) {
                html += `
                    <div style="display: flex; align-items: center; position: relative; padding-left: 25px; margin-bottom: 12px; z-index: 2;">
                        <!-- 黑色小圆点 -->
                        <div style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; background: #111; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1.5px #111;"></div>
                        <!-- 节假日卡片 -->
                        <div style="flex: 1; background: #fff; padding: 12px 16px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
                            <div style="font-size: 14px; font-weight: bold; color: #111; letter-spacing: 1px;">${holidayName}</div>
                        </div>
                    </div>`;
            }
            todayAnnivs.forEach(a => {
                let yearDiff = daySelectedDate.getFullYear() - parseInt(a.date.split('-')[0]);
                let yearText = yearDiff > 0 ? `<span style="font-size: 11px; color: #aaa; font-weight: normal; margin-left: 6px;">${yearDiff} 周年</span>` : '';
                html += `
                    <div style="display: flex; align-items: center; position: relative; padding-left: 25px; margin-bottom: 12px; z-index: 2;">
                        <!-- 黑色小圆点 -->
                        <div style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; background: #111; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1.5px #111;"></div>
                        <!-- 纪念日卡片 -->
                        <div style="flex: 1; background: #fff; padding: 12px 16px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 10px rgba(0,0,0,0.02); display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-size: 14px; font-weight: bold; color: #111;">${a.name}${yearText}</div>
                            <div onclick="deleteDayAnniversary('${a.id}')" style="color: #ccc; cursor: pointer; padding: 4px; transition: color 0.2s;" onmouseover="this.style.color='#111'" onmouseout="this.style.color='#ccc'">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </div>
                        </div>
                    </div>`;
            });
            annivList.innerHTML = html;
        } else {
            annivTitle.style.display = 'none';
            annivList.innerHTML = '';
        }
    }

    // --- 核心修改：渲染双轨时间线 (替换 Emoji 为 SVG) ---
    const timelineList = document.getElementById('dayTimelineList');
    if (!timelineList) return;
    
    // 获取 User 和 Char 的 ID
    const userId = ChatDB.getItem('day_last_user_id') || ChatDB.getItem('current_login_account') || 'default';
    const charId = ChatDB.getItem('day_last_char_id') || (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId ? currentChatRoomCharId : 'default');

    // 获取双方的日程和食谱
    let userSchedules = JSON.parse(ChatDB.getItem(`day_schedule_user_${userId}`) || '[]').filter(s => s.date === dateStr);
    let userRecipes = JSON.parse(ChatDB.getItem(`day_recipe_user_${userId}`) || '[]').filter(r => r.date === dateStr);
    let charSchedules = JSON.parse(ChatDB.getItem(`day_schedule_char_${charId}`) || '[]').filter(s => s.date === dateStr);
    let charRecipes = JSON.parse(ChatDB.getItem(`day_recipe_char_${charId}`) || '[]').filter(r => r.date === dateStr);

    let timelineEvents = [];

    // 定义极简 SVG 图标
    const svgSchedule = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    const svgRecipe = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
    const svgChat = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;

    // 组装 User 事件 (左侧)
    userSchedules.forEach(s => timelineEvents.push({ time: s.timeStart, type: 'schedule', side: 'left', data: s, icon: svgSchedule }));
    userRecipes.forEach(r => {
        let time = r.type === '早餐' ? '08:00' : (r.type === '午餐' ? '12:00' : (r.type === '晚餐' ? '19:00' : '15:00'));
        timelineEvents.push({ time: time, type: 'recipe', side: 'left', data: r, icon: svgRecipe });
    });

    // 组装 Char 事件 (右侧)
    charSchedules.forEach(s => timelineEvents.push({ time: s.timeStart, type: 'schedule', side: 'right', data: s, icon: svgSchedule }));
    charRecipes.forEach(r => {
        let time = r.type === '早餐' ? '08:00' : (r.type === '午餐' ? '12:00' : (r.type === '晚餐' ? '19:00' : '15:00'));
        timelineEvents.push({ time: time, type: 'recipe', side: 'right', data: r, icon: svgRecipe });
    });

    // 聚合聊天记录 (中间节点) - 仅当选中的是今天时统计
    const todayStr = getDayDateStr(new Date());
    if (dateStr === todayStr && userId !== 'default' && charId !== 'default') {
        let chatHistory = JSON.parse(ChatDB.getItem(`chat_history_${userId}_${charId}`) || '[]');
        // 筛选今天的消息
        let todayMsgs = chatHistory.filter(m => {
            let d = new Date(m.timestamp);
            return getDayDateStr(d) === todayStr;
        });
        if (todayMsgs.length > 0) {
            timelineEvents.push({
                time: '23:59', // 放在最后
                type: 'chat',
                side: 'center',
                data: { title: '今日聊天', desc: `共发送了 ${todayMsgs.length} 条消息` },
                icon: svgChat
            });
        }
    }

    // 按时间排序
    timelineEvents.sort((a, b) => a.time.localeCompare(b.time));

    if (timelineEvents.length === 0) {
        timelineList.innerHTML = '<div style="text-align:center; color:#aaa; font-size:12px; padding:20px; background:#fff; border-radius:16px; border:1px dashed #eee;">今天还没有任何记录哦</div>';
    } else {
        timelineList.innerHTML = timelineEvents.map(ev => {
            let clickAction = '';
            if (ev.type === 'schedule') clickAction = `onclick="openDayScheduleModal('${ev.data.id}')"`;
            if (ev.type === 'recipe') clickAction = `onclick="openDayRecipeModal('${ev.data.id}')"`;

            let reviewHtml = '';
            let actionBtnHtml = '';
            
            if (ev.type === 'recipe') {
                if (ev.data.review) {
                    const reviewerName = ev.side === 'left' ? dayAppData.char.title : dayAppData.user.title;
                    reviewHtml = `
                        <div class="day-recipe-review-box" style="margin-top: 8px; padding: 8px; background: #f9f9f9; border-radius: 8px; border-left: 2px solid #111; font-size: 11px; color: #555;">
                            <div style="font-weight: bold; color: #111; margin-bottom: 2px;">${reviewerName} 的批改：</div>
                            <div>${ev.data.review}</div>
                        </div>
                    `;
                }
                
                if ((currentDayView === 'user' && ev.side === 'right') || (currentDayView === 'char' && ev.side === 'left')) {
                    actionBtnHtml = `<div class="day-recipe-action-btn" onclick="event.stopPropagation(); reviewDayRecipe('${ev.data.id}', '${ev.side}')" style="display: inline-block; margin-top: 8px; font-size: 10px; color: #007aff; background: #e5f0ff; padding: 4px 8px; border-radius: 8px;">${ev.data.review ? '修改批改' : '批改 Ta'}</div>`;
                }
            }

            return `
            <div class="day-timeline-item ${ev.side}">
                <div class="day-tl-card" ${clickAction}>
                    <div class="day-tl-icon">${ev.icon}</div>
                    <div class="day-tl-time">${ev.time}</div>
                    <div class="day-tl-title" style="${ev.data.done ? 'text-decoration: line-through; color: #aaa;' : ''}">${ev.data.title || ev.data.name}</div>
                    <div class="day-tl-desc">${ev.data.desc || (ev.data.cal ? ev.data.cal + ' kcal' : '')}</div>
                    ${reviewHtml}
                    ${actionBtnHtml}
                </div>
                <div class="day-tl-dot"></div>
            </div>
            `;
        }).join('');
    }
}

// 7. 真实的日历渲染逻辑
function renderDayCalendar() {
    const year = dayCurrentDate.getFullYear();
    const month = dayCurrentDate.getMonth();
    document.getElementById('dayCalMonthTitle').innerText = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('dayCalDaysGrid');
    grid.innerHTML = '';

    const today = new Date();
    const targetId = getDayTargetId();

    // 读取所有数据用于在日历上打点
    let annivs = JSON.parse(ChatDB.getItem(`day_annivs_${currentDayView}_${targetId}`) || '[]');
    let periods = JSON.parse(ChatDB.getItem(`day_periods_${currentDayView}_${targetId}`) || '[]');
    let schedules = JSON.parse(ChatDB.getItem(`day_schedule_${currentDayView}_${targetId}`) || '[]');
    let recipes = JSON.parse(ChatDB.getItem(`day_recipe_${currentDayView}_${targetId}`) || '[]');

    // 渲染上个月的尾巴
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        const div = document.createElement('div');
        div.className = 'day-cal-day muted';
        div.innerText = d;
        div.onclick = () => {
            daySelectedDate = new Date(year, month - 1, d);
            dayCurrentDate = new Date(year, month - 1, 1);
            ChatDB.setItem('day_selected_date', daySelectedDate.toISOString());
            ChatDB.setItem('day_current_date', dayCurrentDate.toISOString());
            renderDayData(currentDayView);
        };
        grid.appendChild(div);
    }

    // 渲染当月
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = year === today.getFullYear() && month === today.getMonth() && i === today.getDate();
        const isSelected = year === daySelectedDate.getFullYear() && month === daySelectedDate.getMonth() && i === daySelectedDate.getDate();
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const monthDayStr = `${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // 检查是否有纪念日或节假日 (按月日匹配)
        const hasAnniv = annivs.some(a => a.date && a.date.endsWith(monthDayStr)) || !!staticHolidays[monthDayStr];
        const hasPeriod = periods.includes(dateStr);
        
        // 检查是否有真实事件
        const hasEvent = schedules.some(s => s.date === dateStr) || recipes.some(r => r.date === dateStr);

        let classes = ['day-cal-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        if (hasEvent) classes.push('has-event');
        if (hasAnniv) classes.push('has-anniv');
        if (hasPeriod) classes.push('has-period');

        const div = document.createElement('div');
        div.className = classes.join(' ');
        div.innerText = i;
        
        // 点击日期交互
        div.onclick = () => {
            daySelectedDate = new Date(year, month, i);
            ChatDB.setItem('day_selected_date', daySelectedDate.toISOString()); // 持久化选中的日期
            renderDayData(currentDayView); // 重新渲染下方数据
        };
        grid.appendChild(div);
    }

    // 渲染下个月的开头
    const totalCells = firstDay + daysInMonth;
    const nextDays = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 1; i <= nextDays; i++) {
        const div = document.createElement('div');
        div.className = 'day-cal-day muted';
        div.innerText = i;
        div.onclick = () => {
            daySelectedDate = new Date(year, month + 1, i);
            dayCurrentDate = new Date(year, month + 1, 1);
            ChatDB.setItem('day_selected_date', daySelectedDate.toISOString());
            ChatDB.setItem('day_current_date', dayCurrentDate.toISOString());
            renderDayData(currentDayView);
        };
        grid.appendChild(div);
    }
}

// 8. 切换月份
function changeDayMonth(offset) {
    dayCurrentDate.setMonth(dayCurrentDate.getMonth() + offset);
    ChatDB.setItem('day_current_date', dayCurrentDate.toISOString()); // 持久化当前月份
    renderDayCalendar();
}

// ==========================================
// 弹窗控制与数据保存逻辑
// ==========================================
function openDayCenterModal() { document.getElementById('dayCenterModal').classList.add('show'); }
function closeDayModal(id) { document.getElementById(id).classList.remove('show'); }

// --- 日程 ---
function openDayScheduleModal(id = null) {
    closeDayModal('dayCenterModal');
    const delBtn = document.getElementById('daySchDelBtn');
    if (id) {
        const targetId = getDayTargetId();
        let schedules = JSON.parse(ChatDB.getItem(`day_schedule_${currentDayView}_${targetId}`) || '[]');
        const item = schedules.find(s => s.id === id);
        if (item) {
            document.getElementById('daySchId').value = id;
            document.getElementById('daySchTitle').value = item.title;
            document.getElementById('daySchStart').value = item.timeStart;
            document.getElementById('daySchEnd').value = item.timeEnd;
            document.getElementById('daySchDesc').value = item.desc;
            if (delBtn) delBtn.style.display = 'flex';
        }
    } else {
        document.getElementById('daySchId').value = '';
        document.getElementById('daySchTitle').value = '';
        document.getElementById('daySchStart').value = '09:00';
        document.getElementById('daySchEnd').value = '10:00';
        document.getElementById('daySchDesc').value = '';
        if (delBtn) delBtn.style.display = 'none';
    }
    document.getElementById('dayScheduleModal').classList.add('show');
}

function saveDaySchedule() {
    const id = document.getElementById('daySchId').value;
    const title = document.getElementById('daySchTitle').value.trim();
    const start = document.getElementById('daySchStart').value;
    const end = document.getElementById('daySchEnd').value;
    const desc = document.getElementById('daySchDesc').value.trim();

    if (!title || !start) return alert('请填写标题和开始时间！');

    const targetId = getDayTargetId();
    const dateStr = getDayDateStr(daySelectedDate);
    let schedules = JSON.parse(ChatDB.getItem(`day_schedule_${currentDayView}_${targetId}`) || '[]');
    
    if (id) {
        const idx = schedules.findIndex(s => s.id === id);
        if (idx !== -1) {
            schedules[idx].title = title;
            schedules[idx].timeStart = start;
            schedules[idx].timeEnd = end;
            schedules[idx].desc = desc;
        }
    } else {
        schedules.push({
            id: Date.now().toString(),
            date: dateStr,
            timeStart: start,
            timeEnd: end,
            title: title,
            desc: desc,
            done: false
        });
    }

    ChatDB.setItem(`day_schedule_${currentDayView}_${targetId}`, JSON.stringify(schedules));
    closeDayModal('dayScheduleModal');
    renderDayData(currentDayView);
}

function deleteDaySchedule() {
    const id = document.getElementById('daySchId').value;
    if (!id) return;
    if (confirm('确定要删除这条日程吗？')) {
        const targetId = getDayTargetId();
        let schedules = JSON.parse(ChatDB.getItem(`day_schedule_${currentDayView}_${targetId}`) || '[]');
        schedules = schedules.filter(s => s.id !== id);
        ChatDB.setItem(`day_schedule_${currentDayView}_${targetId}`, JSON.stringify(schedules));
        closeDayModal('dayScheduleModal');
        renderDayData(currentDayView);
    }
}

function toggleDayScheduleDone(id) {
    const targetId = getDayTargetId();
    let schedules = JSON.parse(ChatDB.getItem(`day_schedule_${currentDayView}_${targetId}`) || '[]');
    const idx = schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
        schedules[idx].done = !schedules[idx].done;
        ChatDB.setItem(`day_schedule_${currentDayView}_${targetId}`, JSON.stringify(schedules));
        renderDayData(currentDayView);
    }
}

// --- 食谱 ---
function openDayRecipeModal(id = null) {
    closeDayModal('dayCenterModal');
    const delBtn = document.getElementById('dayRecDelBtn');
    if (id) {
        const targetId = getDayTargetId();
        let recipes = JSON.parse(ChatDB.getItem(`day_recipe_${currentDayView}_${targetId}`) || '[]');
        const item = recipes.find(r => r.id === id);
        if (item) {
            document.getElementById('dayRecId').value = id;
            document.getElementById('dayRecType').value = item.type;
            document.getElementById('dayRecName').value = item.name;
            document.getElementById('dayRecCal').value = item.cal;
            document.getElementById('dayRecEmoji').value = item.emoji;
            if (delBtn) delBtn.style.display = 'flex';
        }
    } else {
        document.getElementById('dayRecId').value = '';
        document.getElementById('dayRecType').value = '早餐';
        document.getElementById('dayRecName').value = '';
        document.getElementById('dayRecCal').value = '';
        document.getElementById('dayRecEmoji').value = '';
        if (delBtn) delBtn.style.display = 'none';
    }
    document.getElementById('dayRecipeModal').classList.add('show');
}

function saveDayRecipe() {
    const id = document.getElementById('dayRecId').value;
    const type = document.getElementById('dayRecType').value;
    const name = document.getElementById('dayRecName').value.trim();
    const cal = document.getElementById('dayRecCal').value.trim();
    const emoji = document.getElementById('dayRecEmoji').value.trim();

    if (!name) return alert('请填写食物名称！');

    const targetId = getDayTargetId();
    const dateStr = getDayDateStr(daySelectedDate);
    let recipes = JSON.parse(ChatDB.getItem(`day_recipe_${currentDayView}_${targetId}`) || '[]');
    
    if (id) {
        const idx = recipes.findIndex(r => r.id === id);
        if (idx !== -1) {
            recipes[idx].type = type;
            recipes[idx].name = name;
            recipes[idx].cal = cal || 0;
            recipes[idx].emoji = emoji || '🍽️';
        }
    } else {
        recipes.push({
            id: Date.now().toString(),
            date: dateStr,
            type: type,
            name: name,
            cal: cal || 0,
            emoji: emoji || '🍽️'
        });
    }

    ChatDB.setItem(`day_recipe_${currentDayView}_${targetId}`, JSON.stringify(recipes));
    closeDayModal('dayRecipeModal');
    renderDayData(currentDayView);
}

function deleteDayRecipe() {
    const id = document.getElementById('dayRecId').value;
    if (!id) return;
    if (confirm('确定要删除这条食谱吗？')) {
        const targetId = getDayTargetId();
        let recipes = JSON.parse(ChatDB.getItem(`day_recipe_${currentDayView}_${targetId}`) || '[]');
        recipes = recipes.filter(r => r.id !== id);
        ChatDB.setItem(`day_recipe_${currentDayView}_${targetId}`, JSON.stringify(recipes));
        closeDayModal('dayRecipeModal');
        renderDayData(currentDayView);
    }
}

// --- 纪念日 ---
function openDayAnniversaryModal() {
    closeDayModal('dayCenterModal');
    document.getElementById('dayAnnivName').value = '';
    document.getElementById('dayAnnivDate').value = '';
    document.getElementById('dayAnniversaryModal').classList.add('show');
}

function saveDayAnniversary() {
    const name = document.getElementById('dayAnnivName').value.trim();
    const date = document.getElementById('dayAnnivDate').value;
    if (!name || !date) return alert('请填写完整信息！');

    const targetId = getDayTargetId();
    let annivs = JSON.parse(ChatDB.getItem(`day_annivs_${currentDayView}_${targetId}`) || '[]');
    // 增加唯一 ID 以便删除
    annivs.push({ id: Date.now().toString(), name, date });
    ChatDB.setItem(`day_annivs_${currentDayView}_${targetId}`, JSON.stringify(annivs));

    closeDayModal('dayAnniversaryModal');
    renderDayData(currentDayView);
    alert('纪念日设置成功！');
}

function deleteDayAnniversary(id) {
    if (confirm('确定要删除这个纪念日吗？')) {
        const targetId = getDayTargetId();
        let annivs = JSON.parse(ChatDB.getItem(`day_annivs_${currentDayView}_${targetId}`) || '[]');
        annivs = annivs.filter(a => a.id !== id);
        ChatDB.setItem(`day_annivs_${currentDayView}_${targetId}`, JSON.stringify(annivs));
        renderDayData(currentDayView);
    }
}

// --- 经期 ---
function openDayPeriodModal() {
    closeDayModal('dayCenterModal');
    
    // 动态修改标题，明确告诉用户当前在给谁记经期
    const titleEl = document.querySelector('#dayPeriodModal .day-cm-title');
    if (titleEl) {
        titleEl.innerText = currentDayView === 'user' ? '记录我的经期' : `记录 ${dayAppData.char.title} 的经期`;
    }

    document.getElementById('dayPeriodDate').value = '';
    document.getElementById('dayPeriodModal').classList.add('show');
}

function saveDayPeriod() {
    const date = document.getElementById('dayPeriodDate').value;
    if (!date) return alert('请选择日期！');

    const targetId = getDayTargetId();
    let periods = JSON.parse(ChatDB.getItem(`day_periods_${currentDayView}_${targetId}`) || '[]');
    if (!periods.includes(date)) {
        periods.push(date);
        // 自动往后推算 5 天作为经期
        const startDate = new Date(date);
        for (let i = 1; i < 5; i++) {
            const nextDate = new Date(startDate);
            nextDate.setDate(startDate.getDate() + i);
            const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
            if (!periods.includes(nextDateStr)) periods.push(nextDateStr);
        }
        ChatDB.setItem(`day_periods_${currentDayView}_${targetId}`, JSON.stringify(periods));
    }

    closeDayModal('dayPeriodModal');
    renderDayCalendar();
    alert('经期记录成功！');
}

// --- 食谱批改逻辑 ---
function reviewDayRecipe(recipeId, side) {
    const isReviewingUser = side === 'left';
    const targetType = isReviewingUser ? 'user' : 'char';
    
    const userId = ChatDB.getItem('day_last_user_id') || ChatDB.getItem('current_login_account') || 'default';
    const charId = ChatDB.getItem('day_last_char_id') || (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId ? currentChatRoomCharId : 'default');
    const targetId = isReviewingUser ? userId : charId;

    let recipes = JSON.parse(ChatDB.getItem(`day_recipe_${targetType}_${targetId}`) || '[]');
    const recipeIndex = recipes.findIndex(r => r.id === recipeId);
    
    if (recipeIndex !== -1) {
        const recipe = recipes[recipeIndex];
        openGlobalPrompt(
            '批改 Ta 的食谱', 
            `Ta 吃了：${recipe.name} (${recipe.cal}kcal)\n你想对 Ta 说点什么？`, 
            '例如：太油腻了，没收零食！', 
            (reviewText) => {
                if (reviewText && reviewText.trim() !== '') {
                    recipes[recipeIndex].review = reviewText.trim();
                    ChatDB.setItem(`day_recipe_${targetType}_${targetId}`, JSON.stringify(recipes));
                    renderDayData(currentDayView);
                    
                    // 触发 Char 感知，让 Ta 在微信里回应你的批改
                    if (typeof injectCharPerception === 'function' && targetType === 'char') {
                        injectCharPerception('review_recipe', `批改了我的食谱[${recipe.name}]，评价是：“${reviewText.trim()}”`, targetId);
                    }
                    showToast('批改成功！', 'success', 1500);
                }
            },
            recipe.review || ''
        );
    }
}

// ==========================================
// 切换账号弹窗逻辑
// ==========================================
function openDayAccountModal() { 
    const listEl = document.getElementById('dayAccountModalList');
    listEl.innerHTML = '';
    
    if (currentDayView === 'user') {
        document.getElementById('dayAccountModalTitle').innerText = '切换用户/面具';
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        if (accounts.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">暂无其他用户</div>';
        } else {
            accounts.forEach(acc => {
                const isActive = dayAppData.user.id === acc.id;
                listEl.innerHTML += `
                    <div class="day-account-item ${isActive ? 'active' : ''}" onclick="selectDayUser('${acc.id}')">
                        <div class="day-a-avatar" style="background-image: url('${acc.avatarUrl || ''}');"></div>
                        <div class="day-a-info">
                            <div class="day-a-name">${acc.netName || '未命名'}</div>
                            <div class="day-a-desc">用户账号</div>
                        </div>
                        <div class="day-a-check" style="display: ${isActive ? 'flex' : 'none'};">✓</div>
                    </div>
                `;
            });
        }
    } else {
        document.getElementById('dayAccountModalTitle').innerText = '切换角色';
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        if (chars.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">暂无角色</div>';
        } else {
            chars.forEach(c => {
                const isActive = dayAppData.char.id === c.id;
                listEl.innerHTML += `
                    <div class="day-account-item ${isActive ? 'active' : ''}" onclick="selectDayChar('${c.id}')">
                        <div class="day-a-avatar" style="background-image: url('${c.avatarUrl || ''}');"></div>
                        <div class="day-a-info">
                            <div class="day-a-name">${c.netName || c.name}</div>
                            <div class="day-a-desc">角色卡片</div>
                        </div>
                        <div class="day-a-check" style="display: ${isActive ? 'flex' : 'none'};">✓</div>
                    </div>
                `;
            });
        }
    }
    
    document.getElementById('dayAccountModal').classList.add('show'); 
}

function selectDayUser(id) {
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    let acc = accounts.find(a => a.id === id);
    if (acc) {
        dayAppData.user.id = acc.id;
        dayAppData.user.title = acc.netName || 'User';
        dayAppData.user.avatar = acc.avatarUrl || '';
        ChatDB.setItem('day_last_user_id', acc.id); // 持久化保存选中的用户
        renderDayData('user');
        document.getElementById('dayNavUserAvatar').style.backgroundImage = `url('${acc.avatarUrl || ''}')`;
    }
    closeDayModal('dayAccountModal');
}

function selectDayChar(id) {
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    let c = chars.find(c => c.id === id);
    if (c) {
        dayAppData.char.id = c.id;
        // 【核心修改】：强制使用真名
        dayAppData.char.title = c.name || '未知角色';
        dayAppData.char.avatar = c.avatarUrl || '';
        ChatDB.setItem('day_last_char_id', c.id); // 持久化保存选中的角色
        renderDayData('char');
        document.getElementById('dayNavCharAvatar').style.backgroundImage = `url('${c.avatarUrl || ''}')`;
    }
    closeDayModal('dayAccountModal');
}
// ==========================================
// AI 补全与记忆小票逻辑
// ==========================================

async function generateCharDayAPI() {
    const userId = ChatDB.getItem('day_last_user_id') || ChatDB.getItem('current_login_account');
    const charId = ChatDB.getItem('day_last_char_id') || (typeof currentChatRoomCharId !== 'undefined' ? currentChatRoomCharId : null);
    
    if (!userId || !charId) return alert('请先选择用户和角色！');

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        return alert('请先在设置中配置 API 信息！');
    }

    const dateStr = getDayDateStr(daySelectedDate);
    
    // 获取 User 今天的日程和食谱作为参考
    let userSchedules = JSON.parse(ChatDB.getItem(`day_schedule_user_${userId}`) || '[]').filter(s => s.date === dateStr);
    let userRecipes = JSON.parse(ChatDB.getItem(`day_recipe_user_${userId}`) || '[]').filter(r => r.date === dateStr);
    
    let userContext = `【User 今天的安排】\n`;
    userSchedules.forEach(s => userContext += `- ${s.timeStart}~${s.timeEnd}: ${s.title} (${s.desc})\n`);
    userRecipes.forEach(r => userContext += `- ${r.type}: ${r.name} (${r.cal}kcal)\n`);
    if (userSchedules.length === 0 && userRecipes.length === 0) userContext += "User 今天还没有记录任何安排。\n";

    // 获取角色设定
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === charId);
    const charDesc = char ? char.description : '未知角色';

    const prompt = `你现在扮演角色：${char ? char.name : 'Char'}。
【你的设定】：${charDesc}
${userContext}
请根据你的人设，以及 User 今天的安排，合理地为你自己生成今天的【日程】和【食谱】。
要求：
1. 日程要符合你的人设职业和性格。
2. 如果 User 有安排，你可以生成一些与之呼应的安排（比如 User 加班，你安排去接 Ta）。
3. 必须返回严格的 JSON 格式，不要输出任何其他废话。

JSON 格式要求：
{
  "schedules": [
    {"timeStart": "09:00", "timeEnd": "10:00", "title": "日程标题", "desc": "备注说明"}
  ],
  "recipes": [
    {"type": "早餐/午餐/晚餐/加餐", "name": "食物名称", "cal": 500, "emoji": "🍔"}
  ]
}`;

    showToast('AI 正在补全 Ta 的一天...', 'loading');

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
            
            // 保存生成的日程
            if (parsed.schedules && Array.isArray(parsed.schedules)) {
                let charSchedules = JSON.parse(ChatDB.getItem(`day_schedule_char_${charId}`) || '[]');
                parsed.schedules.forEach(s => {
                    charSchedules.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        date: dateStr,
                        timeStart: s.timeStart || '12:00',
                        timeEnd: s.timeEnd || '13:00',
                        title: s.title || '未知日程',
                        desc: s.desc || '',
                        done: false
                    });
                });
                ChatDB.setItem(`day_schedule_char_${charId}`, JSON.stringify(charSchedules));
            }

            // 保存生成的食谱
            if (parsed.recipes && Array.isArray(parsed.recipes)) {
                let charRecipes = JSON.parse(ChatDB.getItem(`day_recipe_char_${charId}`) || '[]');
                parsed.recipes.forEach(r => {
                    charRecipes.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        date: dateStr,
                        type: r.type || '午餐',
                        name: r.name || '未知食物',
                        cal: r.cal || 0,
                        emoji: r.emoji || '🍽️'
                    });
                });
                ChatDB.setItem(`day_recipe_char_${charId}`, JSON.stringify(charRecipes));
            }

            hideToast();
            alert('AI 补全成功！');
            renderDayData(currentDayView); // 重新渲染双轨时间线
        } else {
            throw new Error('API 请求失败');
        }
    } catch (e) {
        hideToast();
        alert('生成失败，请检查 API 配置或重试。\n' + e.message);
    }
}

function printDayReceipt() {
    const userId = ChatDB.getItem('day_last_user_id') || ChatDB.getItem('current_login_account') || 'default';
    const charId = ChatDB.getItem('day_last_char_id') || (typeof currentChatRoomCharId !== 'undefined' ? currentChatRoomCharId : 'default');
    const dateStr = getDayDateStr(daySelectedDate);

    // 统计数据
    let userSchedules = JSON.parse(ChatDB.getItem(`day_schedule_user_${userId}`) || '[]').filter(s => s.date === dateStr);
    let userRecipes = JSON.parse(ChatDB.getItem(`day_recipe_user_${userId}`) || '[]').filter(r => r.date === dateStr);
    let charSchedules = JSON.parse(ChatDB.getItem(`day_schedule_char_${charId}`) || '[]').filter(s => s.date === dateStr);
    
    let totalCal = userRecipes.reduce((sum, r) => sum + (parseInt(r.cal) || 0), 0);
    let userDoneTasks = userSchedules.filter(s => s.done).length;
    let charTotalTasks = charSchedules.length;

    let chatCount = 0;
    const todayStr = getDayDateStr(new Date());
    if (dateStr === todayStr && userId !== 'default' && charId !== 'default') {
        let chatHistory = JSON.parse(ChatDB.getItem(`chat_history_${userId}_${charId}`) || '[]');
        chatCount = chatHistory.filter(m => getDayDateStr(new Date(m.timestamp)) === todayStr).length;
    }

    // 使用专属的记忆小票 UI
    const receiptContent = document.getElementById('dayReceiptContent');
    if (!receiptContent) return;

    // 格式化时间
    const now = new Date();
    const printTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    receiptContent.innerHTML = `
        <div class="day-receipt-row"><span>DATE</span><div class="day-receipt-dots"></div><span>${dateStr}</span></div>
        <div class="day-receipt-row"><span>TIME</span><div class="day-receipt-dots"></div><span>${printTime}</span></div>
        <div class="day-receipt-row"><span>USER</span><div class="day-receipt-dots"></div><span>${dayAppData.user.title}</span></div>
        <div class="day-receipt-row"><span>CHAR</span><div class="day-receipt-dots"></div><span>${dayAppData.char.title}</span></div>
        
        <div style="margin: 10px 0; text-align: center; color: #aaa; font-size: 12px;">- DETAILS -</div>
        
        <div class="day-receipt-row"><span>摄入热量</span><div class="day-receipt-dots"></div><span>${totalCal} kcal</span></div>
        <div class="day-receipt-row"><span>完成日程</span><div class="day-receipt-dots"></div><span>${userDoneTasks} 项</span></div>
        <div class="day-receipt-row"><span>Ta的日程</span><div class="day-receipt-dots"></div><span>${charTotalTasks} 项</span></div>
        <div class="day-receipt-row"><span>微信互动</span><div class="day-receipt-dots"></div><span>${chatCount} 条</span></div>
        
        <div style="margin-top: 15px; font-size: 16px; text-align: right; color: #111;">SYNC RATE: <span style="font-size: 20px; font-weight: 900;">100%</span></div>
    `;
    
    document.getElementById('dayReceiptModalOverlay').classList.add('show');
}

// 关闭小票弹窗
function closeDayReceiptModal() {
    document.getElementById('dayReceiptModalOverlay').classList.remove('show');
}
