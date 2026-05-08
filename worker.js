// ==========================================
// Web Worker (worker.js) - 解决移动端后台定时器被节流/休眠的问题
// ==========================================

let timer = null;

self.addEventListener('message', (e) => {
    if (e.data.command === 'start') {
        const interval = e.data.interval || 60000; // 默认 60 秒
        if (timer) clearInterval(timer);
        
        console.log(`[Web Worker] 后台定时器已启动，间隔: ${interval}ms`);
        timer = setInterval(() => {
            // 定时向主线程发送心跳信号
            self.postMessage('tick');
        }, interval);
        
    } else if (e.data.command === 'stop') {
        if (timer) {
            clearInterval(timer);
            timer = null;
            console.log('[Web Worker] 后台定时器已停止');
        }
    }
});
