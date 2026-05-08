// ==========================================
// Service Worker (sw.js) - 处理系统级通知与后台唤醒
// ==========================================

self.addEventListener('install', (event) => {
    // 强制立即接管控制权，跳过等待
    self.skipWaiting();
    console.log('[Service Worker] 已安装并跳过等待');
});

self.addEventListener('activate', (event) => {
    // 立即接管所有打开的页面
    event.waitUntil(clients.claim());
    console.log('[Service Worker] 已激活并接管页面');
});

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // 点击后关闭通知

    // 尝试唤醒或聚焦已经打开的网页
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // 如果已经有打开的窗口，聚焦到第一个
            if (windowClients.length > 0) {
                let client = windowClients[0];
                for (let i = 0; i < windowClients.length; i++) {
                    if ('focus' in windowClients[i]) {
                        client = windowClients[i];
                        break;
                    }
                }
                return client.focus();
            } else {
                // 如果没有打开的窗口，则新开一个
                return clients.openWindow('/');
            }
        })
    );
});
