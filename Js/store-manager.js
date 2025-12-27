// Sistema de Tienda Virtual Local
// store-manager.js

class StoreManager {
    constructor() {
        this.storeActive = false;
        this.storeName = 'Mi Tienda Local';
        this.products = [];
        this.cart = [];
        this.currency = 'USD';
        this.exchangeRate = 1;
        this.storeFolderHandle = null;
        this.storeSettings = {
            taxRate: 0,
            shippingCost: 0,
            acceptReturns: true,
            contactEmail: '',
            description: ''
        };
        
        this.initialize();
    }
    
    initialize() {
        // Cargar configuración guardada
        this.loadSettings();
        
        // Event listeners para moneda
        this.setupCurrencyListeners();
        
        console.log('StoreManager inicializado');
    }
    
    setupCurrencyListeners() {
        // Actualizar precios cuando cambia la tasa
        document.addEventListener('exchangeRateUpdated', (e) => {
            this.exchangeRate = e.detail.rate;
            this.updateAllPrices();
        });
    }
    
    // Configurar tienda
    async setupStore(storeData) {
        try {
            this.storeName = storeData.name || 'Mi Tienda Local';
            this.currency = storeData.currency || 'USD';
            this.exchangeRate = storeData.exchangeRate || 1;
            this.storeSettings = { ...this.storeSettings, ...storeData.settings };
            
            // Seleccionar carpeta de productos
            if (storeData.folderHandle) {
                this.storeFolderHandle = storeData.folderHandle;
                await this.scanProductsFromFolder();
            }
            
            this.storeActive = true;
            this.saveSettings();
            
            this.emit('store-activated', {
                name: this.storeName,
                currency: this.currency,
                productCount: this.products.length
            });
            
            return true;
            
        } catch (error) {
            console.error('Error configurando tienda:', error);
            this.emit('store-error', { error: error.message });
            return false;
        }
    }
    
    // Escanear productos desde carpeta
    async scanProductsFromFolder() {
        if (!this.storeFolderHandle) return;
        
        try {
            this.products = [];
            
            // Obtener archivos de la carpeta
            for await (const entry of this.storeFolderHandle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    const product = await this.createProductFromFile(file, entry);
                    this.products.push(product);
                }
            }
            
            this.emit('products-loaded', this.products);
            return this.products;
            
        } catch (error) {
            console.error('Error escaneando productos:', error);
            this.emit('scan-error', { error: error.message });
            return [];
        }
    }
    
    // Crear producto desde archivo
    async createProductFromFile(file, fileHandle) {
        const productId = 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Generar vista previa si es imagen
        let preview = null;
        if (file.type.startsWith('image/')) {
            preview = await this.generateImagePreview(file);
        }
        
        // Extraer metadatos del archivo
        const fileInfo = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            handle: fileHandle
        };
        
        const product = {
            id: productId,
            fileInfo: fileInfo,
            name: this.formatProductName(file.name),
            description: '',
            price: 0,
            currency: this.currency,
            category: 'general',
            condition: 'new',
            quantity: 1,
            preview: preview,
            tags: [],
            customFields: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        return product;
    }
    
    // Generar vista previa de imagen
    generateImagePreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Formatear nombre de producto
    formatProductName(filename) {
        // Remover extensión
        let name = filename.replace(/\.[^/.]+$/, "");
        
        // Reemplazar guiones bajos y guiones con espacios
        name = name.replace(/[_-]/g, ' ');
        
        // Capitalizar primera letra de cada palabra
        name = name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        return name;
    }
    
    // Actualizar producto
    updateProduct(productId, updates) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) return false;
        
        this.products[index] = {
            ...this.products[index],
            ...updates,
            updatedAt: Date.now()
        };
        
        this.emit('product-updated', this.products[index]);
        this.saveSettings();
        
        return true;
    }
    
    // Eliminar producto
    removeProduct(productId) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) return false;
        
        const removed = this.products.splice(index, 1)[0];
        this.emit('product-removed', removed);
        this.saveSettings();
        
        return true;
    }
    
    // Carrito de compras
    addToCart(productId, quantity = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return false;
        
        // Verificar stock
        if (product.quantity < quantity) {
            this.emit('cart-error', { 
                message: 'Stock insuficiente',
                product: product.name 
            });
            return false;
        }
        
        // Buscar si ya está en el carrito
        const existingItem = this.cart.find(item => item.product.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                product: product,
                quantity: quantity,
                addedAt: Date.now()
            });
        }
        
        // Actualizar stock
        product.quantity -= quantity;
        
        this.emit('cart-updated', this.cart);
        this.saveSettings();
        
        return true;
    }
    
    removeFromCart(productId) {
        const index = this.cart.findIndex(item => item.product.id === productId);
        if (index === -1) return false;
        
        // Restaurar stock
        const removedItem = this.cart[index];
        const product = this.products.find(p => p.id === productId);
        if (product) {
            product.quantity += removedItem.quantity;
        }
        
        this.cart.splice(index, 1);
        this.emit('cart-updated', this.cart);
        this.saveSettings();
        
        return true;
    }
    
    updateCartQuantity(productId, quantity) {
        const item = this.cart.find(item => item.product.id === productId);
        if (!item) return false;
        
        const oldQuantity = item.quantity;
        const difference = quantity - oldQuantity;
        
        // Verificar stock
        if (difference > 0 && item.product.quantity < difference) {
            this.emit('cart-error', { 
                message: 'Stock insuficiente',
                product: item.product.name 
            });
            return false;
        }
        
        // Actualizar cantidades
        item.quantity = quantity;
        item.product.quantity -= difference;
        
        this.emit('cart-updated', this.cart);
        this.saveSettings();
        
        return true;
    }
    
    clearCart() {
        // Restaurar todo el stock
        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.product.id);
            if (product) {
                product.quantity += item.quantity;
            }
        });
        
        this.cart = [];
        this.emit('cart-updated', this.cart);
        this.saveSettings();
    }
    
    // Calcular totales
    calculateSubtotal() {
        return this.cart.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);
    }
    
    calculateTotal() {
        const subtotal = this.calculateSubtotal();
        const tax = subtotal * (this.storeSettings.taxRate / 100);
        const shipping = this.storeSettings.shippingCost;
        
        return subtotal + tax + shipping;
    }
    
    // Convertir moneda
    convertPrice(price, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return price;
        
        if (fromCurrency === 'USD' && toCurrency === 'VES') {
            return price * this.exchangeRate;
        } else if (fromCurrency === 'VES' && toCurrency === 'USD') {
            return price / this.exchangeRate;
        }
        
        return price;
    }
    
    // Actualizar todos los precios
    updateAllPrices() {
        if (this.currency === 'dual') {
            this.products.forEach(product => {
                product.priceVES = product.priceUSD * this.exchangeRate;
            });
        }
        
        this.emit('prices-updated', { exchangeRate: this.exchangeRate });
    }
    
    // Generar orden
    createOrder(customerInfo, paymentMethod = '') {
        if (this.cart.length === 0) return null;
        
        const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const order = {
            id: orderId,
            date: new Date().toISOString(),
            items: this.cart.map(item => ({
                productId: item.product.id,
                name: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                currency: item.product.currency
            })),
            subtotal: this.calculateSubtotal(),
            tax: this.calculateSubtotal() * (this.storeSettings.taxRate / 100),
            shipping: this.storeSettings.shippingCost,
            total: this.calculateTotal(),
            currency: this.currency,
            customer: customerInfo,
            paymentMethod: paymentMethod,
            status: 'pending',
            notes: ''
        };
        
        this.emit('order-created', order);
        
        // Limpiar carrito después de crear orden
        this.clearCart();
        
        return order;
    }
    
    // Exportar productos
    exportProducts(format = 'json') {
        const data = {
            store: this.storeName,
            currency: this.currency,
            exchangeRate: this.exchangeRate,
            products: this.products,
            exportedAt: new Date().toISOString()
        };
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(data.products);
        }
        
        return null;
    }
    
    convertToCSV(products) {
        const headers = ['Nombre', 'Descripción', 'Precio', 'Moneda', 'Categoría', 'Cantidad'];
        const rows = products.map(p => [
            `"${p.name}"`,
            `"${p.description}"`,
            p.price,
            p.currency,
            `"${p.category}"`,
            p.quantity
        ]);
        
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
    
    // Importar productos
    importProducts(data) {
        try {
            const parsed = JSON.parse(data);
            
            if (parsed.products && Array.isArray(parsed.products)) {
                this.products = parsed.products.map(p => ({
                    ...p,
                    id: p.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                }));
                
                this.emit('products-loaded', this.products);
                this.saveSettings();
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error importando productos:', error);
            return false;
        }
    }
    
    // Sistema de permisos para compradores
    grantAccessToCustomer(customerId, productIds, permissions = ['view', 'download']) {
        const access = {
            customerId: customerId,
            productIds: Array.isArray(productIds) ? productIds : [productIds],
            permissions: permissions,
            grantedAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 días por defecto
        };
        
        this.emit('access-granted', access);
        return access;
    }
    
    revokeAccess(customerId, productId = null) {
        this.emit('access-revoked', { customerId, productId });
        return true;
    }
    
    // Persistencia
    saveSettings() {
        const settings = {
            storeName: this.storeName,
            currency: this.currency,
            exchangeRate: this.exchangeRate,
            storeSettings: this.storeSettings,
            products: this.products,
            cart: this.cart,
            storeActive: this.storeActive,
            savedAt: Date.now()
        };
        
        try {
            localStorage.setItem('localBridgeStore', JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error guardando configuración:', error);
            return false;
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('localBridgeStore');
            if (!saved) return false;
            
            const settings = JSON.parse(saved);
            
            this.storeName = settings.storeName || this.storeName;
            this.currency = settings.currency || this.currency;
            this.exchangeRate = settings.exchangeRate || this.exchangeRate;
            this.storeSettings = { ...this.storeSettings, ...settings.storeSettings };
            this.products = settings.products || [];
            this.cart = settings.cart || [];
            this.storeActive = settings.storeActive || false;
            
            this.emit('store-loaded', settings);
            return true;
            
        } catch (error) {
            console.error('Error cargando configuración:', error);
            return false;
        }
    }
    
    clearSettings() {
        localStorage.removeItem('localBridgeStore');
        this.products = [];
        this.cart = [];
        this.storeActive = false;
        
        this.emit('store-cleared');
    }
    
    // Sistema de eventos
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
        
        // También emitir evento global
        const customEvent = new CustomEvent(`store-${event}`, { detail: data });
        document.dispatchEvent(customEvent);
    }
    
    // Utilidades
    getStats() {
        return {
            storeName: this.storeName,
            productCount: this.products.length,
            cartItems: this.cart.length,
            totalValue: this.calculateTotal(),
            currency: this.currency,
            storeActive: this.storeActive
        };
    }
    
    searchProducts(query) {
        const searchTerm = query.toLowerCase();
        return this.products.filter(product => {
            return (
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm) ||
                product.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    filterByCategory(category) {
        return this.products.filter(product => 
            product.category.toLowerCase() === category.toLowerCase()
        );
    }
    
    sortProducts(by = 'name', order = 'asc') {
        return [...this.products].sort((a, b) => {
            let valueA = a[by];
            let valueB = b[by];
            
            if (by === 'price') {
                valueA = a.price;
                valueB = b.price;
            } else if (by === 'date') {
                valueA = a.createdAt;
                valueB = b.createdAt;
            }
            
            if (order === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
    }
}

// Inicializar globalmente
window.storeManager = new StoreManager();

// Conectar con la aplicación principal
if (window.app) {
    window.app.storeManager = window.storeManager;
}

// Eventos globales para la interfaz
document.addEventListener('DOMContentLoaded', () => {
    // Actualizar interfaz cuando cargan productos
    storeManager.on('products-loaded', (products) => {
        if (window.app && window.app.updateProductsGrid) {
            window.app.updateProductsGrid(products);
        }
    });
    
    // Actualizar carrito
    storeManager.on('cart-updated', (cart) => {
        if (window.app && window.app.updateCart) {
            window.app.updateCart(cart);
        }
    });
    
    // Notificaciones de tienda
    storeManager.on('store-activated', (data) => {
        console.log('Tienda activada:', data);
        if (window.app && window.app.showNotification) {
            window.app.showNotification(`Tienda "${data.name}" activada con ${data.productCount} productos`, 'success');
        }
    });
    
    // Cargar configuración al iniciar
    setTimeout(() => {
        storeManager.loadSettings();
    }, 1000);
});
