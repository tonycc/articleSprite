// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "extractArticle",
    title: "提取文章内容",
    contexts: ["page"]
  });
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "extractArticle") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // 触发content.js中的方法
        window.dispatchEvent(new CustomEvent('articleSprite-extract'));
      }
    });
  }
});

// 将Blob转换为base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 处理消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadMarkdown') {
    chrome.downloads.download({
      url: message.url,
      filename: message.fileName,
      saveAs: true
    });
  }
  else if (message.action === 'fetchImage') {
    // 立即发送响应，避免端口关闭错误
    sendResponse({ status: 'fetching' });
    
    // 获取图片
    (async () => {
      try {
        const response = await fetch(message.url, {
          mode: 'cors',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const base64Data = await blobToBase64(blob);
        
        // 发送结果回content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'imageData',
          url: message.url,
          success: true,
          data: base64Data
        });
      } catch (error) {
        console.error('Error fetching image:', error);
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'imageData',
          url: message.url,
          success: false,
          error: error.message
        });
      }
    })();
  }
  
  // 返回true表示我们会异步发送响应
  return true;
});
