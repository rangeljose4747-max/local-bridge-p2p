// Gestor de conexiones WebRTC P2P

class WebRTCBridge {
    constructor(config) {
        this.config = config || {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.peerConnection = null;
        this.dataChannel = null;
        this.room = null;
        this.isHost = false;
        this.connectedPeers = new Map();
        this.messageHandlers = new Map();
        
        // Tipos de mensajes soportados
        this.messageTypes = {
            FILE_CHUNK: 'file_chunk',
            FILE_METADATA: 'file_metadata',
            CHAT_MESSAGE: 'chat_message',
            STORE_PRODUCT: 'store_product',
            PERMISSION_REQUEST: 'permission_request',
            SYSTEM: 'system'
        };
    }
    
    // Crear nueva conexión como host
    async createConnection(roomCode) {
        this.room = roomCode;
        this.isHost = true;
        
        try {
            // Crear conexión peer-to-peer
            this.peerConnection = new RTCPeerConnection(this.config);
            
            // Crear canal de datos
            this.dataChannel = this.peerConnection.createDataChannel('local-bridge');
            this.setupDataChannel(this.dataChannel);
            
            // Configurar event handlers
            this.setupConnectionEvents();
            
            // Crear oferta
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // La oferta debe ser compartida con el peer (vía código QR/enlace)
            const offerData = {
                type: 'offer',
                sdp: offer.sdp,
                room: this.room,
                timestamp: Date.now()
            };
            
            return {
                success: true,
                offer: btoa(JSON.stringify(offerData)),
                room: this.room
            };
            
        } catch (error) {
            console.error('Error creando conexión:', error);
            throw error;
        }
    }
    
    // Unirse a conexión como guest
    async joinConnection(roomCode, offerBase64) {
        this.room = roomCode;
        this.isHost = false;
        
        try {
            // Decodificar oferta
            const offerData = JSON.parse(atob(offerBase64));
            
            if (offerData.type !== 'offer') {
                throw new Error('Datos de oferta inválidos');
            }
            
            // Crear conexión
            this.peerConnection = new RTCPeerConnection(this.config);
            
            // Configurar event handlers
            this.setupConnectionEvents();
            
            // Esperar canal de datos
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel(this.dataChannel);
                this.onDataChannelOpen();
            };
            
            // Establecer oferta remota
            const remoteDesc = new RTCSessionDescription({
                type: 'offer',
                sdp: offerData.sdp
            });
            
            await this.peerConnection.setRemoteDescription(remoteDesc);
            
            // Crear respuesta
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // La respuesta debe ser compartida con el host
            const answerData = {
                type: 'answer',
                sdp: answer.sdp,
                room: this.room,
                timestamp: Date.now()
            };
            
            return {
                success: true,
                answer: btoa(JSON.stringify(answerData)),
                room: this.room
            };
            
        } catch (error) {
            console.error('Error uniéndose a conexión:', error);
            throw error;
        }
    }
    
    // Procesar respuesta del guest
    async processAnswer(answerBase64) {
        try {
            const answerData = JSON.parse(atob(answerBase64));
            
            if (answerData.type !== 'answer') {
                throw new Error('Datos de respuesta inválidos');
            }
            
            const remoteDesc = new RTCSessionDescription({
                type: 'answer',
                sdp: answerData.sdp
            });
            
            await this.peerConnection.setRemoteDescription(remoteDesc);
            return { success: true };
            
        } catch (error) {
            console.error('Error procesando respuesta:', error);
            throw error;
        }
    }
    
    setupConnectionEvents() {
        if (!this.peerConnection) return;
        
        // ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Nuevo candidato ICE:', event.candidate);
                // Enviar candidato al peer (en implementación real)
            }
        };
        
        // Estado de conexión
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Estado de conexión:', state);
            
            this.emit('connection-state', { state });
            
            if (state === 'connected') {
                this.onConnectionSuccess();
            } else if (state === 'failed' || state === 'disconnected') {
                this.onConnectionFailed();
            }
        };
        
        // ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('Estado ICE:', this.peerConnection.iceConnectionState);
        };
    }
    
    setupDataChannel(channel) {
        channel.onopen = () => this.onDataChannelOpen();
        channel.onclose = () => this.onDataChannelClose();
        channel.onmessage = (event) => this.handleMessage(event.data);
        channel.onerror = (error) => this.onDataChannelError(error);
    }
    
    onDataChannelOpen() {
        console.log('Canal de datos abierto');
        this.emit('channel-open', {});
        
        // Enviar mensaje de presentación
        this.sendSystemMessage('connected', {
            peerId: this.generatePeerId(),
            userName: window.app?.userName || 'Usuario',
            capabilities: ['file-transfer', 'chat', 'store']
        });
    }
    
    onDataChannelClose() {
        console.log('Canal de datos cerrado');
        this.emit('channel-close', {});
    }
    
    onDataChannelError(error) {
        console.error('Error en canal de datos:', error);
        this.emit('channel-error', { error });
    }
    
    onConnectionSuccess() {
        console.log('✅ Conexión P2P establecida');
        this.emit('connection-success', {
            peerId: this.generatePeerId(),
            isHost: this.isHost,
            room: this.room
        });
    }
    
    onConnectionFailed() {
        console.error('❌ Conexión P2P fallida');
        this.emit('connection-failed', {
            reason: 'connection-lost'
        });
    }
    
    // Manejo de mensajes
    handleMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            
            console.log('Mensaje recibido:', message.type);
            
            // Ejecutar handlers específicos para este tipo de mensaje
            const handlers = this.messageHandlers.get(message.type) || [];
            handlers.forEach(handler => handler(message.data));
            
            // Emitir evento general
            this.emit('message', message);
            
            // Procesar según tipo
            switch (message.type) {
                case this.messageTypes.CHAT_MESSAGE:
                    this.handleChatMessage(message.data);
                    break;
                    
                case this.messageTypes.FILE_METADATA:
                    this.handleFileMetadata(message.data);
                    break;
                    
                case this.messageTypes.SYSTEM:
                    this.handleSystemMessage(message.data);
                    break;
            }
            
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    }
    
    handleChatMessage(data) {
        // Notificar a la app principal
        this.emit('chat-message', data);
    }
    
    handleFileMetadata(data) {
        // Preparar recepción de archivo
        this.emit('file-incoming', data);
    }
    
    handleSystemMessage(data) {
        console.log('Mensaje de sistema:', data);
    }
    
    // Envío de mensajes
    sendMessage(type, data) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.warn('Canal de datos no disponible');
            return false;
        }
        
        try {
            const message = {
                type: type,
                data: data,
                timestamp: Date.now(),
                messageId: this.generateMessageId()
            };
            
            this.dataChannel.send(JSON.stringify(message));
            return true;
            
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            return false;
        }
    }
    
    sendChatMessage(text) {
        return this.sendMessage(this.messageTypes.CHAT_MESSAGE, {
            text: text,
            sender: window.app?.userName || 'Usuario',
            timestamp: Date.now()
        });
    }
    
    sendFileMetadata(metadata) {
        return this.sendMessage(this.messageTypes.FILE_METADATA, metadata);
    }
    
    sendFileChunk(chunkData) {
        return this.sendMessage(this.messageTypes.FILE_CHUNK, chunkData);
    }
    
    sendSystemMessage(action, data) {
        return this.sendMessage(this.messageTypes.SYSTEM, {
            action: action,
            ...data
        });
    }
    
    // Transferencia de archivos
    async sendFile(file) {
        if (!file) return false;
        
        try {
            // Enviar metadata primero
            const metadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                chunks: Math.ceil(file.size / (64 * 1024)), // 64KB chunks
                fileId: this.generateFileId()
            };
            
            if (!this.sendFileMetadata(metadata)) {
                throw new Error('Error enviando metadata');
            }
            
            // Leer y enviar archivo en chunks
            const chunkSize = 64 * 1024; // 64KB
            const reader = file.stream().getReader();
            let chunkIndex = 0;
            let bytesSent = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = {
                    fileId: metadata.fileId,
                    chunkIndex: chunkIndex,
                    data: Array.from(new Uint8Array(value)),
                    totalChunks: metadata.chunks
                };
                
                if (!this.sendFileChunk(chunk)) {
                    throw new Error(`Error enviando chunk ${chunkIndex}`);
                }
                
                chunkIndex++;
                bytesSent += value.byteLength;
                
                // Emitir progreso
                this.emit('file-progress', {
                    fileId: metadata.fileId,
                    bytesSent: bytesSent,
                    totalBytes: file.size,
                    percentage: Math.round((bytesSent / file.size) * 100)
                });
            }
            
            console.log(`✅ Archivo enviado: ${file.name}`);
            return true;
            
        } catch (error) {
            console.error('Error enviando archivo:', error);
            return false;
        }
    }
    
    // Event system
    on(event, handler) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, []);
        }
        this.messageHandlers.get(event).push(handler);
    }
    
    emit(event, data) {
        const handlers = this.messageHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));
    }
    
    // Utilidades
    generatePeerId() {
        return 'peer_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Cerrar conexión
    close() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        this.peerConnection = null;
        this.dataChannel = null;
        this.connectedPeers.clear();
        
        console.log('Conexión cerrada');
    }
}

// Hacer disponible globalmente
window.WebRTCBridge = WebRTCBridge;
