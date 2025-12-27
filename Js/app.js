// app.js mejorado
class LocalBridgeApp {
    constructor() {
        this.screens = {
            start: document.getElementById('start-screen'),
            host: document.getElementById('host-screen'),
            join: document.getElementById('join-screen'),
            transfer: document.getElementById('transfer-screen'),
            store: document.getElementById('store-screen')
        };
        
        this.currentScreen = 'start';
        this.peerConnections = new Map();
        this.activeRoom = null;
        this.userName = this.generateRandomName();
        this.fileTransfers = new Map();
        this.storeManager = new StoreManager();
        this.fileTransfer = new FileTransferManager();
        this.webrtcBridge = new WebRTCBridge();
        
        // Inicializar componentes
        this.initialize();
    }
    
    initialize() {
        this.bindEvents();
        this.setupNavigation();
        this.showNotification('Aplicación cargada. Listo para conectar.', 'info');
        
        // Cargar configuración guardada
        this.loadSettings();
        
        // Verificar compatibilidad
        this.checkCompatibility();
        
        // Inicializar efectos visuales
        this.initializeEffects();
    }
    
    checkCompatibility() {
        const features = {
            fileAccess: 'showFilePicker' in window,
            webrtc: 'RTCPeerConnection' in window,
            serviceWorker: 'serviceWorker' in navigator,
            notifications: 'Notification' in window
        };
        
        const missing = Object.entries(features)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
        
        if (missing.length > 0) {
            this.showNotification(
                `Tu navegador tiene limitaciones: ${missing.join(', ')}. Usa Chrome/Edge 86+ para mejor experiencia.`,
                'warning'
            );
        }
    }
    
    initializeEffects() {
        // Efecto de neón en títulos
        document.querySelectorAll('h1, h2, h3').forEach(title => {
            title.style.textShadow = '0 0 10px rgba(157, 78, 221, 0.8)';
        });
        
        // Efecto hover en botones
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.boxShadow = '0 0 15px rgba(157, 78, 221, 0.6)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.boxShadow = '';
            });
        });
        
        // Animación de entrada
        document.body.style.opacity = '0';
        setTimeout(() => {
            document.body.style.transition = 'opacity 1s ease';
            document.body.style.opacity = '1';
        }, 100);
    }
    
    bindEvents() {
        // Navegación entre pantallas
        document.getElementById('btn-host').addEventListener('click', () => this.showScreen('host'));
        document.getElementById('btn-join').addEventListener('click', () => this.showScreen('join'));
        document.getElementById('btn-store').addEventListener('click', () => this.showScreen('store'));
        
        // Botones de navegación
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => this.showScreen('start'));
        });
        
        // Crear sala
        document.getElementById('btn-refresh-code').addEventListener('click', () => this.generateRoomCode());
        document.getElementById('btn-copy-code').addEventListener('click', () => this.copyRoomCode());
        document.getElementById('btn-share-link').addEventListener('click', () => this.shareRoomLink());
        
        // Unirse a sala
        document.getElementById('btn-connect').addEventListener('click', () => this.joinRoom());
        document.getElementById('btn-start-qr').addEventListener('click', () => this.startQRScanner());
        
        // Archivos
        document.getElementById('btn-select-files').addEventListener('click', () => this.selectFiles());
        document.getElementById('btn-select-folder').addEventListener('click', () => this.selectFolder());
        document.getElementById('btn-clear-files').addEventListener('click', () => this.clearFiles());
        document.getElementById('btn-send-files').addEventListener('click', () => this.sendFiles());
        
        // Chat
        document.getElementById('btn-chat').addEventListener('click', () => this.toggleChat());
        document.getElementById('btn-send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('btn-minimize-chat').addEventListener('click', () => this.minimizeChat());
        document.getElementById('btn-close-chat').addEventListener('click', () => this.closeChat());
        
        // Configuración
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-security').addEventListener('click', () => this.showSecurity());
        
        // Eventos de WebRTC
        this.webrtcBridge.on('connection-success', (data) => this.onConnectionSuccess(data));
        this.webrtcBridge.on('connection-failed', (data) => this.onConnectionFailed(data));
        this.webrtcBridge.on('chat-message', (data) => this.onChatMessage(data));
        this.webrtcBridge.on('file-incoming', (data) => this.onFileIncoming(data));
        this.webrtcBridge.on('file-progress', (data) => this.onFileProgress(data));
        this.webrtcBridge.on('file-received', (data) => this.onFileReceived(data));
        
        // Eventos de transferencia de archivos
        this.fileTransfer.on('transfer-progress', (data) => this.onTransferProgress(data));
        this.fileTransfer.on('transfer-complete', (data) => this.onTransferComplete(data));
        this.fileTransfer.on('file-received', (data) => this.onFileReceived(data));
        
        // Eventos de tienda
        this.storeManager.on('store-activated', (data) => this.onStoreActivated(data));
        this.storeManager.on('products-loaded', (products) => this.updateProductsGrid(products));
        this.storeManager.on('cart-updated', (cart) => this.updateCart(cart));
        
        // Drag and drop
        this.setupDragAndDrop();
        
        // Resize observer para chat
        this.setupResizeObserver();
    }
    
    setupNavigation() {
        // Ocultar todas las pantallas excepto la actual
        Object.keys(this.screens).forEach(screenName => {
            if (screenName !== this.currentScreen) {
                this.screens[screenName].classList.remove('active');
            }
        });
        
        // Mostrar pantalla actual
        this.screens[this.currentScreen].classList.add('active');
    }
    
    showScreen(screenName) {
        if (!this.screens[screenName]) return;
        
        // Ocultar pantalla actual
        this.screens[this.currentScreen].classList.remove('active');
        
        // Mostrar nueva pantalla
        this.currentScreen = screenName;
        this.screens[this.currentScreen].classList.add('active');
        
        // Actualizar UI según pantalla
        this.updateUIForScreen(screenName);
    }
    
    updateUIForScreen(screenName) {
        switch (screenName) {
            case 'host':
                this.generateRoomCode();
                break;
            case 'join':
                // Limpiar campo de código
                document.getElementById('room-input').value = '';
                break;
            case 'transfer':
                // Actualizar lista de archivos
                this.updateFileList();
                break;
            case 'store':
                // Actualizar productos
                this.updateProductsGrid(this.storeManager.products);
                break;
        }
    }
    
    generateRoomCode() {
        const code = this.generateRandomCode();
        document.getElementById('room-code').textContent = code;
        
        // Generar código QR
        const qrContainer = document.getElementById('qrcode-container');
        qrContainer.innerHTML = '';
        
        new QRCode(qrContainer, {
            text: code,
            width: 200,
            height: 200,
            colorDark: '#9d4edd',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        this.currentRoomCode = code;
        return code;
    }
    
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            if (i > 0 && i % 4 === 0) code += '-';
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    copyRoomCode() {
        const code = document.getElementById('room-code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification('Código copiado al portapapeles', 'success');
        }).catch(() => {
            this.showNotification('Error al copiar el código', 'error');
        });
    }
    
    shareRoomLink() {
        const code = document.getElementById('room-code').textContent;
        const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Únete a mi sala Local Bridge P2P',
                text: `Únete a mi sala usando el código: ${code}`,
                url: url
            });
        } else {
            // Fallback: copiar al portapapeles
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('Enlace copiado al portapapeles', 'success');
            });
        }
    }
    
    async joinRoom() {
        const roomCode = document.getElementById('room-input').value.trim();
        if (!roomCode) {
            this.showNotification('Por favor ingresa un código de sala', 'warning');
            return;
        }
        
        try {
            // Crear conexión WebRTC
            const result = await this.webrtcBridge.joinConnection(roomCode, '');
            
            if (result.success) {
                this.activeRoom = roomCode;
                this.showScreen('transfer');
                this.showNotification('Conexión establecida', 'success');
            } else {
                this.showNotification('Error al conectar', 'error');
            }
        } catch (error) {
            console.error('Error uniéndose a sala:', error);
            this.showNotification('Error al conectar: ' + error.message, 'error');
        }
    }
    
    async startQRScanner() {
        try {
            const video = document.getElementById('qr-video');
            const qrPlaceholder = document.getElementById('qr-placeholder');
            
            // Solicitar permisos de cámara
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            video.srcObject = stream;
            video.classList.remove('hidden');
            qrPlaceholder.classList.add('hidden');
            
            // Iniciar escaneo (simulado)
            this.showNotification('Escaneando código QR...', 'info');
            
            // En una implementación real, aquí iría la lógica de escaneo QR
            setTimeout(() => {
                video.classList.add('hidden');
                qrPlaceholder.classList.remove('hidden');
                stream.getTracks().forEach(track => track.stop());
                this.showNotification('Código QR escaneado', 'success');
            }, 3000);
            
        } catch (error) {
            console.error('Error accediendo a la cámara:', error);
            this.showNotification('Error al acceder a la cámara', 'error');
        }
    }
    
    selectFiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '*/*';
        
        input.addEventListener('change', (e) => {
            this.addFilesToQueue(e.target.files);
        });
        
        input.click();
    }
    
    selectFolder() {
        if (!window.showDirectoryPicker) {
            this.showNotification('Tu navegador no soporta selección de carpetas', 'warning');
            return;
        }
        
        window.showDirectoryPicker().then(dir => {
            this.scanDirectoryForFiles(dir);
        }).catch(err => {
            console.error('Error seleccionando carpeta:', err);
            this.showNotification('Error al seleccionar carpeta', 'error');
        });
    }
    
    async scanDirectoryForFiles(dir) {
        const files = [];
        
        async function scanDirectory(directory) {
            for await (const entry of directory.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    files.push(file);
                } else if (entry.kind === 'directory') {
                    await scanDirectory(entry);
                }
            }
        }
        
        await scanDirectory(dir);
        this.addFilesToQueue(files);
    }
    
    addFilesToQueue(files) {
        const fileList = document.getElementById('local-files');
        
        // Si es la primera vez, limpiar el estado vacío
        if (fileList.querySelector('.empty-state')) {
            fileList.innerHTML = '';
        }
        
        Array.from(files).forEach(file => {
            const fileElement = this.createFileElement(file);
            fileList.appendChild(fileElement);
        });
        
        this.updateTransferStats();
    }
    
    createFileElement(file) {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.dataset.fileName = file.name;
        fileElement.dataset.fileSize = file.size;
        
        const icon = this.getFileIcon(file.type);
        
        fileElement.innerHTML = `
            <div class="file-info">
                <i class="${icon}"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
            <div class="file-status">Listo</div>
        `;
        
        return fileElement;
    }
    
    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fas fa-image';
        if (fileType.startsWith('video/')) return 'fas fa-video';
        if (fileType.startsWith('audio/')) return 'fas fa-music';
        if (fileType.includes('pdf')) return 'fas fa-file-pdf';
        if (fileType.includes('zip') || fileType.includes('rar')) return 'fas fa-file-archive';
        if (fileType.includes('doc') || fileType.includes('docx')) return 'fas fa-file-word';
        if (fileType.includes('xls') || fileType.includes('xlsx')) return 'fas fa-file-excel';
        return 'fas fa-file';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    clearFiles() {
        const fileList = document.getElementById('local-files');
        fileList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Arrastra archivos o haz clic en "Agregar Archivos"</p>
            </div>
        `;
        this.updateTransferStats();
    }
    
    updateTransferStats() {
        const fileList = document.getElementById('local-files');
        const fileItems = fileList.querySelectorAll('.file-item');
        
        let totalSize = 0;
        fileItems.forEach(item => {
            const size = parseInt(item.dataset.fileSize) || 0;
            totalSize += size;
        });
        
        document.getElementById('file-count').textContent = `${fileItems.length} archivos`;
        document.getElementById('total-size').textContent = this.formatFileSize(totalSize);
        
        // Habilitar botón de enviar si hay archivos
        const sendButton = document.getElementById('btn-send-files');
        sendButton.disabled = fileItems.length === 0;
    }
    
    async sendFiles() {
        const fileList = document.getElementById('local-files');
        const fileItems = fileList.querySelectorAll('.file-item');
        
        if (fileItems.length === 0) return;
        
        // Recopilar archivos
        const files = [];
        fileItems.forEach(item => {
            const fileName = item.dataset.fileName;
            // En una implementación real, aquí se obtendrían los objetos File
            // Por ahora, simulamos
            files.push({
                name: fileName,
                size: parseInt(item.dataset.fileSize) || 0,
                type: this.getFileType(fileName)
            });
        });
        
        try {
            // Enviar archivos via WebRTC
            await this.webrtcBridge.sendFiles(files);
            this.showNotification('Archivos enviados', 'success');
        } catch (error) {
            console.error('Error enviando archivos:', error);
            this.showNotification('Error al enviar archivos: ' + error.message, 'error');
        }
    }
    
    getFileType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    
    toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.classList.toggle('hidden');
        
        if (!chatWindow.classList.contains('hidden')) {
            // Enfocar input de chat
            document.getElementById('chat-input').focus();
        }
    }
    
    minimizeChat() {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.classList.add('hidden');
    }
    
    closeChat() {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.classList.add('hidden');
    }
    
    sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Enviar mensaje via WebRTC
        this.webrtcBridge.sendChatMessage(message);
        
        // Añadir mensaje al chat local
        this.addChatMessage(message, 'sent');
        
        // Limpiar input
        input.value = '';
    }
    
    addChatMessage(message, type) {
        const chatMessages = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-time">${time}</div>
        `;
        
        chatMessages.appendChild(messageElement);
        
        // Scroll al final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    onChatMessage(data) {
        // Añadir mensaje recibido al chat
        this.addChatMessage(data.text, 'received');
    }
    
    showSettings() {
        this.showNotification('Configuración - En desarrollo', 'info');
    }
    
    showSecurity() {
        this.showNotification('Seguridad - En desarrollo', 'info');
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Autoeliminar después de 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.4s ease forwards';
            setTimeout(() => {
                container.removeChild(notification);
            }, 400);
        }, 5000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('local-files');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--neon-cyan)';
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            
            const files = e.dataTransfer.files;
            this.addFilesToQueue(files);
        });
    }
    
    setupResizeObserver() {
        const chatWindow = document.getElementById('chat-window');
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const height = entry.contentRect.height;
                // Ajustar altura del área de mensajes
                const messagesArea = chatWindow.querySelector('.chat-messages');
                if (messagesArea) {
                    messagesArea.style.height = `${height - 150}px`;
                }
            }
        });
        
        observer.observe(chatWindow);
    }
    
    updateFileList() {
        // Actualizar lista de archivos para la pantalla de transferencia
        const fileList = document.getElementById('local-files');
        fileList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Arrastra archivos o haz clic en "Agregar Archivos"</p>
            </div>
        `;
        
        // Habilitar botones según conexión
        const chatButton = document.getElementById('btn-chat');
        const filesButton = document.getElementById('btn-files');
        
        if (this.webrtcBridge && this.webrtcBridge.dataChannel && this.webrtcBridge.dataChannel.readyState === 'open') {
            chatButton.disabled = false;
            filesButton.disabled = false;
        } else {
            chatButton.disabled = true;
            filesButton.disabled = true;
        }
    }
    
    updateProductsGrid(products) {
        // Actualizar grid de productos en la tienda
        const storeScreen = document.getElementById('store-screen');
        if (!storeScreen) return;
        
        const productsGrid = storeScreen.querySelector('.products-grid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = '';
        
        if (products.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>No hay productos disponibles</p>
                </div>
            `;
            return;
        }
        
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            productCard.innerHTML = `
                <div class="product-image">
                    ${product.preview ? `<img src="${product.preview}" alt="${product.name}">` : '<i class="fas fa-file"></i>'}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-price">$${product.price} ${product.currency}</p>
                    <button class="btn-add-cart" data-product-id="${product.id}">
                        <i class="fas fa-cart-plus"></i> Agregar al carrito
                    </button>
                </div>
            `;
            
            productsGrid.appendChild(productCard);
        });
    }
    
    updateCart(cart) {
        // Actualizar carrito en la interfaz
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
        }
    }
    
    onConnectionSuccess(data) {
        console.log('Conexión establecida:', data);
        this.showNotification('Conexión P2P establecida', 'success');
        
        // Actualizar estado de conexión
        const connectionState = document.getElementById('connection-state');
        if (connectionState) {
            connectionState.className = 'state-connected';
            connectionState.innerHTML = `
                <div class="status-indicator"></div>
                <span>CONEXIÓN ESTABLECIDA</span>
            `;
        }
        
        // Habilitar botones
        document.getElementById('btn-chat').disabled = false;
        document.getElementById('btn-files').disabled = false;
    }
    
    onConnectionFailed(data) {
        console.error('Conexión fallida:', data);
        this.showNotification('Conexión fallida: ' + data.reason, 'error');
        
        // Actualizar estado de conexión
        const connectionState = document.getElementById('connection-state');
        if (connectionState) {
            connectionState.className = 'state-disconnected';
            connectionState.innerHTML = `
                <div class="status-indicator"></div>
                <span>CONEXIÓN FALLIDA</span>
            `;
        }
    }
    
    onFileIncoming(data) {
        console.log('Archivo entrante:', data);
        this.showNotification(`Recibiendo: ${data.name}`, 'info');
        
        // Preparar recepción
        this.fileTransfer.receiveFile(data);
    }
    
    onFileProgress(data) {
        console.log('Progreso de archivo:', data);
        
        // Actualizar barra de progreso
        const progressContainer = document.getElementById('transfer-progress');
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            
            const progressFill = document.getElementById('progress-fill');
            const progressPercent = document.getElementById('progress-percent');
            
            if (progressFill && progressPercent) {
                progressFill.style.width = `${data.percentage}%`;
                progressPercent.textContent = `${data.percentage}%`;
            }
        }
    }
    
    onFileReceived(data) {
        console.log('Archivo recibido:', data);
        this.showNotification(`Archivo recibido: ${data.name}`, 'success');
        
        // Ocultar barra de progreso
        const progressContainer = document.getElementById('transfer-progress');
        if (progressContainer) {
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 2000);
        }
    }
    
    onTransferProgress(data) {
        console.log('Progreso de transferencia:', data);
    }
    
    onTransferComplete(data) {
        console.log('Transferencia completada:', data);
        this.showNotification('Transferencia completada', 'success');
    }
    
    onStoreActivated(data) {
        console.log('Tienda activada:', data);
    }
    
    generateRandomName() {
        const adjectives = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
        const nouns = ['Bridge', 'Link', 'Node', 'Hub', 'Portal', 'Gateway', 'Path', 'Route'];
        
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${adjective}${noun}${Math.floor(Math.random() * 1000)}`;
    }
    
    loadSettings() {
        // Cargar configuración guardada
        try {
            const saved = localStorage.getItem('localBridgeSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.userName = settings.userName || this.userName;
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
    }
}

// Inicializar aplicación cuando DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LocalBridgeApp();
});