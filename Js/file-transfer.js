// Sistema de transferencia de archivos P2P

class FileTransferManager {
    constructor() {
        this.transfers = new Map();
        this.receivedFiles = new Map();
        this.currentTransfer = null;
        this.downloadLink = document.createElement('a');
        this.downloadLink.style.display = 'none';
        document.body.appendChild(this.downloadLink);
    }
    
    // Iniciar envío de archivos
    async sendFiles(files) {
        if (!files || files.length === 0) return;
        
        const transferId = 'transfer_' + Date.now();
        this.currentTransfer = {
            id: transferId,
            files: Array.from(files),
            totalFiles: files.length,
            sentFiles: 0,
            startTime: Date.now()
        };
        
        this.transfers.set(transferId, this.currentTransfer);
        
        // Enviar cada archivo
        for (const file of files) {
            await this.sendSingleFile(file);
            this.currentTransfer.sentFiles++;
            
            // Actualizar progreso
            this.emit('transfer-progress', {
                transferId: transferId,
                file: file.name,
                current: this.currentTransfer.sentFiles,
                total: this.currentTransfer.totalFiles,
                percentage: Math.round((this.currentTransfer.sentFiles / this.currentTransfer.totalFiles) * 100)
            });
        }
        
        // Transferencia completada
        this.currentTransfer.endTime = Date.now();
        this.currentTransfer.duration = this.currentTransfer.endTime - this.currentTransfer.startTime;
        
        this.emit('transfer-complete', {
            transferId: transferId,
            ...this.currentTransfer
        });
        
        this.transfers.delete(transferId);
        this.currentTransfer = null;
    }
    
    async sendSingleFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const fileData = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: event.target.result,
                    lastModified: file.lastModified
                };
                
                // Enviar via WebRTC
                if (window.webrtcBridge) {
                    window.webrtcBridge.sendFile(fileData)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error('WebRTC bridge no disponible'));
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Recibir archivo
    receiveFile(metadata) {
        const fileId = metadata.fileId || ('file_' + Date.now());
        
        const fileInfo = {
            id: fileId,
            name: metadata.name,
            size: metadata.size,
            type: metadata.type,
            chunks: metadata.chunks || 0,
            receivedChunks: 0,
            data: new Array(metadata.chunks || 1),
            startTime: Date.now()
        };
        
        this.receivedFiles.set(fileId, fileInfo);
        
        this.emit('file-receiving', {
            fileId: fileId,
            name: metadata.name,
            size: metadata.size
        });
        
        return fileId;
    }
    
    receiveChunk(fileId, chunkData) {
        const fileInfo = this.receivedFiles.get(fileId);
        if (!fileInfo) {
            console.error('Archivo no encontrado:', fileId);
            return;
        }
        
        // Almacenar chunk
        fileInfo.data[chunkData.chunkIndex] = new Uint8Array(chunkData.data);
        fileInfo.receivedChunks++;
        
        // Calcular progreso
        const progress = Math.round((fileInfo.receivedChunks / fileInfo.chunks) * 100);
        
        this.emit('file-progress', {
            fileId: fileId,
            name: fileInfo.name,
            receivedChunks: fileInfo.receivedChunks,
            totalChunks: fileInfo.chunks,
            percentage: progress,
            bytesReceived: (fileInfo.receivedChunks * 64 * 1024) // Aproximado
        });
        
        // Verificar si se recibieron todos los chunks
        if (fileInfo.receivedChunks === fileInfo.chunks) {
            this.completeFile(fileId);
        }
    }
    
    completeFile(fileId) {
        const fileInfo = this.receivedFiles.get(fileId);
        if (!fileInfo) return;
        
        // Combinar todos los chunks
        const totalBytes = fileInfo.data.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalBytes);
        
        let offset = 0;
        for (const chunk of fileInfo.data) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }
        
        // Crear blob
        const blob = new Blob([combined], { type: fileInfo.type });
        const url = URL.createObjectURL(blob);
        
        // Actualizar info
        fileInfo.endTime = Date.now();
        fileInfo.duration = fileInfo.endTime - fileInfo.startTime;
        fileInfo.blob = blob;
        fileInfo.url = url;
        fileInfo.completed = true;
        
        // Emitir evento
        this.emit('file-received', {
            fileId: fileId,
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.type,
            duration: fileInfo.duration,
            url: url
        });
        
        // Mostrar notificación
        this.showDownloadNotification(fileInfo);
    }
    
    showDownloadNotification(fileInfo) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(
                `Archivo recibido: ${fileInfo.name} (${this.formatFileSize(fileInfo.size)})`,
                'success'
            );
        }
        
        // Crear elemento de descarga automática
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = `Descargar ${fileInfo.name}`;
        downloadBtn.onclick = () => this.downloadFile(fileInfo);
        
        // Agregar a la lista de archivos recibidos
        const receivedList = document.getElementById('received-files');
        if (receivedList && receivedList.querySelector('.empty-message')) {
            receivedList.innerHTML = '';
        }
        
        if (receivedList) {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item received';
            fileElement.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-download"></i>
                    <div>
                        <div class="file-name">${fileInfo.name}</div>
                        <div class="file-size">${this.formatFileSize(fileInfo.size)}</div>
                    </div>
                </div>
                <button class="btn-download" data-file-id="${fileInfo.id}">
                    <i class="fas fa-download"></i>
                </button>
            `;
            
            fileElement.querySelector('.btn-download').addEventListener('click', () => {
                this.downloadFile(fileInfo);
            });
            
            receivedList.appendChild(fileElement);
        }
    }
    
    downloadFile(fileInfo) {
        if (!fileInfo || !fileInfo.url) return;
        
        this.downloadLink.href = fileInfo.url;
        this.downloadLink.download = fileInfo.name;
        this.downloadLink.click();
        
        // Emitir evento
        this.emit('file-downloaded', {
            fileId: fileInfo.id,
            name: fileInfo.name
        });
    }
    
    // Permisos
    requestPermission(permissionType, peerId) {
        const permission = {
            type: permissionType,
            peerId: peerId,
            requestedAt: Date.now(),
            granted: false
        };
        
        this.emit('permission-requested', permission);
        return permission;
    }
    
    grantPermission(permissionId, options = {}) {
        this.emit('permission-granted', {
            permissionId: permissionId,
            options: options,
            grantedAt: Date.now()
        });
        
        return true;
    }
    
    // Event system
    handlers = new Map();
    
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);
    }
    
    emit(event, data) {
        const handlers = this.handlers.get(event) || [];
        handlers.forEach(handler => handler(data));
    }
    
    // Utilidades
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getTransferStats() {
        const stats = {
            totalTransfers: this.transfers.size,
            completedTransfers: Array.from(this.transfers.values())
                .filter(t => t.completed).length,
            receivedFiles: this.receivedFiles.size
        };
        
        return stats;
    }
    
    clearCompleted() {
        // Limpiar archivos recibidos antiguos
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        for (const [fileId, fileInfo] of this.receivedFiles.entries()) {
            if (fileInfo.completed && now - fileInfo.endTime > oneHour) {
                if (fileInfo.url) {
                    URL.revokeObjectURL(fileInfo.url);
                }
                this.receivedFiles.delete(fileId);
            }
        }
    }
}

// Inicializar globalmente
window.fileTransfer = new FileTransferManager();