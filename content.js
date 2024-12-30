// 配置常量
const CONFIG = {
    SELECTORS: {
        ARTICLE: [
            'article',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.article',
            '.post-body',
            '.content',
            'main article',
            '[itemprop="articleBody"]'
        ],
        TITLE: [
            'h1',
            'article h1',
            '.article-title',
            '.post-title',
            '.mod-head h1'
        ],
        REMOVE: [
            '.ad', '.ads', '.advertisement',
            '.social-share', '.share-buttons',
            '.related-posts', '.recommended',
            '.comments', '#comments',
            'script', 'style', 'iframe',
            '.sidebar', '.nav', '.navigation',
            '.header', '.footer',
            '.author-info', '.meta',
            '.breadcrumb'
        ]
    },
    IMAGE: {
        MAX_WIDTH: 1200,
        MAX_HEIGHT: 800,
        QUALITY: 0.8,
        CACHE_DURATION: 30 * 60 * 1000, // 30分钟缓存
        VALID_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },
    FILE: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_EXTENSIONS: ['.md', '.markdown']
    },
    UI: {
        LOADING_TIMEOUT: 30000, // 30秒超时
        NOTIFICATION_DURATION: 3000
    }
};

// 工具类
class Utils {
    static sanitizeHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content;
    }

    static async compressImage(base64String) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // 等比例缩放
                if (width > CONFIG.IMAGE.MAX_WIDTH) {
                    height = (CONFIG.IMAGE.MAX_WIDTH * height) / width;
                    width = CONFIG.IMAGE.MAX_WIDTH;
                }
                if (height > CONFIG.IMAGE.MAX_HEIGHT) {
                    width = (CONFIG.IMAGE.MAX_HEIGHT * width) / height;
                    height = CONFIG.IMAGE.MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', CONFIG.IMAGE.QUALITY));
            };
            img.onerror = reject;
            img.src = base64String;
        });
    }

    static validateImageUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    static sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .toLowerCase();
    }

    static debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

// 图片缓存管理器
class ImageCache {
    constructor() {
        this.cache = new Map();
    }

    set(url, data) {
        this.cache.set(url, {
            data,
            timestamp: Date.now()
        });
    }

    get(url) {
        const cached = this.cache.get(url);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > CONFIG.IMAGE.CACHE_DURATION) {
            this.cache.delete(url);
            return null;
        }

        return cached.data;
    }

    clear() {
        this.cache.clear();
    }
}

// UI管理器
class UIManager {
    static showLoading(message) {
        const loading = document.createElement('div');
        loading.className = 'article-sprite-loading';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        document.body.appendChild(loading);
    }

    static hideLoading() {
        const loading = document.querySelector('.article-sprite-loading');
        if (loading) loading.remove();
    }

    static showNotification(message, type = 'info') {
        console.log('Showing notification:', message, type);
        const notification = document.createElement('div');
        notification.className = `article-sprite-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), CONFIG.UI.NOTIFICATION_DURATION);
    }

    static showConfirmDialog(message) {
        console.log('Showing confirm dialog:', message);
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'article-sprite-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <p>${message}</p>
                    <div class="dialog-buttons">
                        <button class="confirm">确认</button>
                        <button class="cancel">取消</button>
                    </div>
                </div>
            `;

            const handleClick = (result) => {
                console.log('Dialog result:', result);
                dialog.remove();
                resolve(result);
            };

            dialog.querySelector('.confirm').onclick = () => handleClick(true);
            dialog.querySelector('.cancel').onclick = () => handleClick(false);
            
            // 添加到body
            document.body.appendChild(dialog);
            
            // 确保对话框可见
            dialog.style.display = 'flex';
            dialog.style.position = 'fixed';
            dialog.style.top = '0';
            dialog.style.left = '0';
            dialog.style.right = '0';
            dialog.style.bottom = '0';
            dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            dialog.style.zIndex = '10000';
            dialog.style.justifyContent = 'center';
            dialog.style.alignItems = 'center';
            
            const content = dialog.querySelector('.dialog-content');
            if (content) {
                content.style.backgroundColor = 'white';
                content.style.padding = '20px';
                content.style.borderRadius = '8px';
                content.style.minWidth = '300px';
            }

            const buttons = dialog.querySelector('.dialog-buttons');
            if (buttons) {
                buttons.style.marginTop = '20px';
                buttons.style.display = 'flex';
                buttons.style.justifyContent = 'flex-end';
                buttons.style.gap = '10px';
            }

            const allButtons = dialog.querySelectorAll('button');
            allButtons.forEach(button => {
                button.style.padding = '8px 16px';
                button.style.border = 'none';
                button.style.borderRadius = '4px';
                button.style.cursor = 'pointer';
            });

            const confirmButton = dialog.querySelector('.confirm');
            if (confirmButton) {
                confirmButton.style.backgroundColor = '#4CAF50';
                confirmButton.style.color = 'white';
            }

            const cancelButton = dialog.querySelector('.cancel');
            if (cancelButton) {
                cancelButton.style.backgroundColor = '#f44336';
                cancelButton.style.color = 'white';
            }
        });
    }
}

// 文章提取器
class ArticleExtractor {
    constructor() {
        this.article = null;
        this.overlay = null;
        this.isActive = false;
        this.extractedContent = null;
        this.imageCache = new ImageCache();
        this.imagePromises = new Map();
        this.pendingImages = 0;

        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'imageData') {
                this.handleImageResponse(message);
            }
        });
    }

    async imageToBase64(url) {
        try {
            console.log('Converting image to base64:', url);
            const response = await fetch(url, {
                mode: 'no-cors',  // 添加 no-cors 模式
                credentials: 'omit'
            });
            // 如果是 no-cors 模式，直接使用原始 URL
            if (response.type === 'opaque') {
                console.log('Using original URL for image:', url);
                return url;
            }
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log('Image converted to base64, length:', reader.result.length);
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    console.error('Error reading image:', reader.error);
                    resolve(url); // 出错时使用原始 URL
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting image to base64:', error);
            return url; // 出错时使用原始 URL
        }
    }

    async extractArticle() {
        console.log('Extracting article');
        
        // 尝试不同的选择器来获取标题
        const titleSelectors = [
            '.mod-head h1',
            'h1',
            'article h1',
            '.article-title',
            '.post-title'            
        ];

        let title = null;
        for (const selector of titleSelectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement) {
                title = titleElement.textContent.trim();
                break;
            }
        }

        if (!title) {
            console.log('No title found');
            title = document.title || '未命名文章';
        }
        console.log('Found title:', title);

        // 尝试获取文章内容
        const contentSelectors = [
            '.content',
            'article',
            '.article',
            '.post-content',
            '.entry-content',
            '.article-content',
            'main'
        ];

        let content = null;
        let contentLength = 0;
        for (const selector of contentSelectors) {
            console.log('Trying selector:', selector);
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent.trim();
                const length = text.length;
                console.log(`Content length: ${length}`);
                if (length > contentLength) {
                    content = element;
                    contentLength = length;
                }
            }
        }

        if (!content) {
            throw new Error('无法找到文章内容');
        }

        // 深度克隆内容元素以避免修改原始DOM
        content = content.cloneNode(true);
        console.log('Processing article element');

        // 移除不需要的元素
        const removeSelectors = [
            '.ad', '.ads', '.advertisement',
            '.social-share', '.share-buttons',
            '.related-posts', '.recommended',
            '.comments', '#comments',
            'script', 'style', 'iframe',
            '.sidebar', '.nav', '.navigation',
            '.header', '.footer',
            '.author-info', '.meta',
            '.breadcrumb'
        ];

        for (const selector of removeSelectors) {
            console.log('Removing elements with selector:', selector);
            const elements = content.querySelectorAll(selector);
            elements.forEach(el => el.remove());
            console.log(`Removing ${elements.length} elements with selector: ${selector}`);
        }

        // 处理图片
        const images = content.getElementsByTagName('img');
        console.log('Processing', images.length, 'images');
        for (const img of Array.from(images)) {
            if (!img.src) {
                img.remove();
                continue;
            }
            console.log('Processing image:', img.src);
        }

        // 获取HTML内容
        const html = content.innerHTML;

        this.extractedContent = {
            title,
            content,
            html
        };

        console.log('Article extracted:', {
            title,
            contentLength: html.length,
            hasContent: !!content
        });

        return this.extractedContent;
    }

    async convertToMarkdown() {
        console.log('convertToMarkdown started');
        if (!this.extractedContent) {
            console.log('No content to convert');
            throw new Error('没有可转换的内容');
        }

        try {
            console.log('Starting markdown conversion');
            const { title, content } = this.extractedContent;
            console.log('Content info:', {
                title,
                contentType: content instanceof Element ? 'Element' : typeof content
            });
            
            let markdown = `# ${title}\n\n`;
            
            const processNode = async (node, context = { inParagraph: false, inList: false }) => {
                if (!node) return '';
                
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (!text) return '';
                    
                    // 检查父元素
                    const parentNode = node.parentElement;
                    if (!parentNode) return text;

                    // 如果在列表或段落中，不添加额外换行
                    if (context.inList || context.inParagraph) {
                        return text;
                    }

                    // 对于块级文本，添加适当的换行
                    return `${text}\n`;
                }

                if (node.nodeType !== Node.ELEMENT_NODE) return '';

                const tagName = node.tagName.toLowerCase();
                
                // 获取计算样式
                const style = window.getComputedStyle(node);
                const display = style.display;
                const isBlock = display === 'block' || display === 'flex' || display === 'grid';

                switch (tagName) {
                    case 'br':
                        return '\n';
                    case 'img':
                        if (node.src) {
                            const imageUrl = await this.imageToBase64(node.src);
                            return `\n![image](${imageUrl})\n`;
                        }
                        return '';
                    case 'p':
                        const pContent = await Promise.all(
                            Array.from(node.childNodes).map(child => 
                                processNode(child, { ...context, inParagraph: true })
                            )
                        );
                        return `\n${pContent.join(' ').trim()}\n`;
                    case 'div':
                        // 如果div只包含文本节点
                        if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent.trim();
                            return text ? `\n${text}\n` : '';
                        }

                        const divContent = await Promise.all(
                            Array.from(node.childNodes).map(child => 
                                processNode(child, { ...context, inParagraph: false })
                            )
                        );
                        return divContent.join('').trim();
                    case 'ul':
                    case 'ol':
                        const listItems = await Promise.all(
                            Array.from(node.children).map(async (item, index) => {
                                if (item.tagName.toLowerCase() !== 'li') return '';
                                const itemContent = await Promise.all(
                                    Array.from(item.childNodes).map(child => 
                                        processNode(child, { ...context, inList: true })
                                    )
                                );
                                const prefix = tagName === 'ul' ? '* ' : `${index + 1}. `;
                                return `${prefix}${itemContent.join(' ').trim()}`;
                            })
                        );
                        return `\n${listItems.join('\n')}\n`;
                    case 'blockquote':
                        const quoteContent = await Promise.all(
                            Array.from(node.childNodes).map(child => 
                                processNode(child, { ...context, inParagraph: true })
                            )
                        );
                        const quote = quoteContent.join(' ').trim();
                        return quote ? `\n> ${quote}\n` : '';
                    default:
                        if (tagName.match(/^h[1-6]$/)) {
                            const level = tagName.charAt(1);
                            const headerContent = await Promise.all(
                                Array.from(node.childNodes).map(child => 
                                    processNode(child, { ...context, inParagraph: true })
                                )
                            );
                            const headerText = headerContent.join(' ').trim();
                            return headerText ? `\n${'#'.repeat(parseInt(level))} ${headerText}\n` : '';
                        }

                        // 处理其他块级元素
                        if (isBlock) {
                            const blockContent = await Promise.all(
                                Array.from(node.childNodes).map(child => 
                                    processNode(child, { ...context, inParagraph: false })
                                )
                            );
                            return `\n${blockContent.join('').trim()}\n`;
                        }

                        // 处理内联元素
                        const inlineContent = await Promise.all(
                            Array.from(node.childNodes).map(child => 
                                processNode(child, context)
                            )
                        );
                        return inlineContent.join('').trim();
                }
            };

            // 处理所有内容节点
            const parts = await Promise.all(Array.from(content.childNodes).map(node => processNode(node)));
            
            // 合并内容并清理格式
            markdown += parts
                .join('')
                .replace(/\n{3,}/g, '\n\n')  // 将多个连续换行替换为两个
                .replace(/^\s+|\s+$/g, '')   // 移除开头和结尾的空白
                .split('\n')                 // 分割成行
                .map(line => line.trim())    // 修剪每行
                .join('\n');                 // 重新组合

            console.log('Markdown conversion completed, length:', markdown.length);
            
            if (markdown.length <= title.length + 4) {
                throw new Error('转换后的内容为空');
            }

            return markdown;
        } catch (error) {
            console.error('Error in convertToMarkdown:', error);
            throw error;
        }
    }

    async saveAsMarkdown() {
        console.log('saveAsMarkdown started');
        if (!this.extractedContent) {
            console.log('No extracted content found');
            throw new Error('没有可保存的内容');
        }

        try {
            console.log('Starting markdown generation');
            UIManager.showLoading('正在生成Markdown...');
            
            const markdown = await this.convertToMarkdown();
            if (!markdown) {
                throw new Error('生成的Markdown内容为空');
            }
            console.log('Markdown generated, length:', markdown.length);

            const fileName = Utils.sanitizeFilename(
                (this.extractedContent.title || 'article_' + new Date().toISOString()) + '.md'
            );
            console.log('Generated filename:', fileName);

            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            if (blob.size > CONFIG.FILE.MAX_SIZE) {
                throw new Error('文件大小超过限制');
            }
            console.log('Blob created, size:', blob.size);

            const url = URL.createObjectURL(blob);
            console.log('URL created:', url);

            console.log('Sending message to background script');
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('下载超时'));
                }, 30000); // 30秒超时

                chrome.runtime.sendMessage({
                    action: 'downloadMarkdown',
                    url: url,
                    fileName: fileName
                }, response => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('Download message response:', response);
                        resolve(response);
                    }
                });

                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    console.log('URL revoked');
                }, 1000);
            });
        } catch (error) {
            console.error('Error in saveAsMarkdown:', error);
            throw error;
        } finally {
            UIManager.hideLoading();
        }
    }

    async handleSave() {
        console.log('Save handler called');
        try {
            await this.saveAsMarkdown();
        } catch (error) {
            console.error('Error in save handler:', error);
            UIManager.showNotification('保存操作失败: ' + error.message, 'error');
        }
    }

    handleClose() {
        console.log('Close handler called');
        this.hideOverlay();
    }

    createOverlay() {
        try {
            const overlay = document.createElement('div');
            overlay.className = 'article-sprite-overlay';

            const header = document.createElement('div');
            header.className = 'article-sprite-header';

            // 创建一个空的 div 作为左侧占位
            const leftSpace = document.createElement('div');
            header.appendChild(leftSpace);

            // 创建一个空的 div 作为中间占位
            const middleSpace = document.createElement('div');
            header.appendChild(middleSpace);

            const closeButton = document.createElement('button');
            closeButton.className = 'article-sprite-close';
            closeButton.textContent = '×';
            closeButton.onclick = () => this.hideOverlay();
            header.appendChild(closeButton);

            const container = document.createElement('div');
            container.className = 'article-sprite-container';

            const content = document.createElement('div');
            content.className = 'article-sprite-content';

            const progress = document.createElement('div');
            progress.className = 'article-sprite-progress';
            progress.style.display = 'none';
            
            const progressText = document.createElement('span');
            progressText.textContent = '处理中...';
            progress.appendChild(progressText);

            const spinner = document.createElement('div');
            spinner.className = 'article-sprite-spinner';
            progress.appendChild(spinner);

            const actions = document.createElement('div');
            actions.className = 'article-sprite-actions';

            const saveButton = document.createElement('button');
            saveButton.className = 'article-sprite-button';
            saveButton.textContent = '保存为 Markdown';
            saveButton.onclick = () => this.handleSave();
            actions.appendChild(saveButton);

            container.appendChild(content);
            container.appendChild(progress);
            container.appendChild(actions);
            
            overlay.appendChild(header);
            overlay.appendChild(container);

            document.body.appendChild(overlay);
            this.overlay = overlay;
            return overlay;
        } catch (error) {
            console.error('Error creating overlay:', error);
            throw error;
        }
    }

    showOverlay() {
        try {
            if (!this.overlay) {
                this.createOverlay();
            }

            // 先提取内容
            if (!this.extractedContent) {
                this.extractArticle();
            }

            const content = this.overlay.querySelector('.article-sprite-content');
            
            if (content && this.extractedContent) {
                // 清空并更新内容
                content.innerHTML = '';
                if (this.extractedContent.content) {
                    // 创建标题元素
                    if (this.extractedContent.title) {
                        const titleElement = document.createElement('h2');
                        titleElement.textContent = this.extractedContent.title;
                        content.appendChild(titleElement);
                    }

                    // 创建一个新的包装器来存放内容
                    const contentWrapper = document.createElement('div');
                    contentWrapper.className = 'article-content-wrapper';
                    
                    // 克隆内容节点以避免修改原始DOM
                    const contentClone = this.extractedContent.content.cloneNode(true);
                    contentWrapper.appendChild(contentClone);
                    
                    content.appendChild(contentWrapper);
                }
            }

            // 显示遮罩层
            this.overlay.style.display = 'flex';
            // 禁止背景滚动
            document.body.style.overflow = 'hidden';
        } catch (error) {
            console.error('Error showing overlay:', error);
            UIManager.showNotification('显示预览失败: ' + error.message, 'error');
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
            // 恢复背景滚动
            document.body.style.overflow = '';
        }
    }

    updateProgress(show = true) {
        const progress = this.overlay?.querySelector('.article-sprite-progress');
        if (progress) {
            progress.style.display = show ? 'flex' : 'none';
        }
    }

    handleImageResponse(message) {
        const resolver = this.imagePromises.get(message.url);
        if (resolver) {
            if (message.success) {
                resolver.resolve(message.data);
            } else {
                resolver.reject(new Error(message.error));
            }
            this.imagePromises.delete(message.url);
        }
    }
}

// 创建提取器实例
const extractor = new ArticleExtractor();

// 使用防抖处理事件监听
window.addEventListener('articleSprite-extract', Utils.debounce(() => {
    if (!extractor.isActive) {
        extractor.showOverlay();
    } else {
        extractor.hideOverlay();
    }
}, 300));
