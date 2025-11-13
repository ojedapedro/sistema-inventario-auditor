// Módulo para el escaneo de códigos de barras

const BarcodeScanner = {
    init: function() {
        this.barcodeInput = document.getElementById('barcode-input');
        this.recentScansTable = document.getElementById('recent-scans');
        
        this.barcodeInput.addEventListener('change', () => this.handleBarcodeScan());
        this.barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleBarcodeScan();
            }
        });
        
        this.setupKeyboardShortcuts();
    },
    
    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.barcodeInput.focus();
            }
        });
    },
    
    handleBarcodeScan: function() {
        const barcode = this.barcodeInput.value.trim();
        if (!barcode) return;
        
        if (AppState.theoreticalInventory.length === 0) {
            alert('Primero debe cargar el inventario teórico.');
            this.barcodeInput.value = '';
            return;
        }
        
        const product = AppState.theoreticalInventory.find(p => p.code === barcode);
        if (!product) {
            this.showProductNotFoundWarning(barcode);
            this.barcodeInput.value = '';
            return;
        }
        
        this.registerScan(barcode);
        this.barcodeInput.value = '';
        this.updateRecentScans();
        Statistics.update();
        
        this.showScanConfirmation(product);
    },
    
    showProductNotFoundWarning: function(barcode) {
        const warning = `Producto con código "${barcode}" no encontrado en el inventario teórico.`;
        
        const existingAlert = document.getElementById('barcode-warning');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alertDiv = document.createElement('div');
        alertDiv.id = 'barcode-warning';
        alertDiv.className = 'alert alert-warning alert-dismissible fade show mt-2';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${warning}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        this.barcodeInput.parentNode.insertBefore(alertDiv, this.barcodeInput.nextSibling);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    },
    
    registerScan: function(barcode) {
        if (AppState.physicalInventory[barcode]) {
            AppState.physicalInventory[barcode]++;
        } else {
            AppState.physicalInventory[barcode] = 1;
        }
    },
    
    showScanConfirmation: function(product) {
        const scannedQty = AppState.physicalInventory[product.code];
        const status = scannedQty === product.quantity ? 'correcto' : 
                      scannedQty > product.quantity ? 'excedente' : 'faltante';
        
        const messages = {
            correcto: { class: 'success', icon: 'check', text: 'Cantidad correcta' },
            excedente: { class: 'warning', icon: 'exclamation', text: 'Exceso de cantidad' },
            faltante: { class: 'info', icon: 'info', text: 'Faltante detectado' }
        };
        
        const message = messages[status];
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${message.class} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${message.icon} me-2"></i>
                    <strong>${product.name}</strong> - ${message.text}
                    (${scannedQty}/${product.quantity})
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },
    
    createToastContainer: function() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    },
    
    updateRecentScans: function() {
        this.recentScansTable.innerHTML = '';
        
        if (Object.keys(AppState.physicalInventory).length === 0) {
            this.recentScansTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-barcode fa-2x mb-2 d-block"></i>
                        No se han escaneado productos aún
                    </td>
                </tr>
            `;
            return;
        }
        
        const recentBarcodes = Object.keys(AppState.physicalInventory)
            .sort((a, b) => AppState.physicalInventory[b] - AppState.physicalInventory[a])
            .slice(0, 10);
        
        recentBarcodes.forEach(barcode => {
            const product = AppState.theoreticalInventory.find(p => p.code === barcode);
            if (!product) return;
            
            const theoreticalQty = product.quantity;
            const scannedQty = AppState.physicalInventory[barcode];
            const difference = scannedQty - theoreticalQty;
            
            let status, badgeClass;
            if (scannedQty === theoreticalQty) {
                status = '<span class="badge bg-success">Correcto</span>';
                badgeClass = '';
            } else if (scannedQty > theoreticalQty) {
                status = `<span class="badge bg-warning">+${difference}</span>`;
                badgeClass = 'table-warning';
            } else {
                status = `<span class="badge bg-danger">${difference}</span>`;
                badgeClass = 'table-danger';
            }
            
            const row = document.createElement('tr');
            if (badgeClass) row.classList.add(badgeClass);
            
            row.innerHTML = `
                <td><code>${barcode}</code></td>
                <td>${product.name}</td>
                <td>${theoreticalQty}</td>
                <td>${scannedQty}</td>
                <td>${status}</td>
            `;
            
            this.recentScansTable.appendChild(row);
        });
    },
    
    getScanStatistics: function() {
        const totalScanned = Object.keys(AppState.physicalInventory).length;
        const totalItems = Object.values(AppState.physicalInventory).reduce((sum, qty) => sum + qty, 0);
        const discrepancies = AppState.theoreticalInventory.filter(product => {
            const scannedQty = AppState.physicalInventory[product.code] || 0;
            return scannedQty !== product.quantity;
        }).length;
        
        return {
            totalScanned,
            totalItems,
            discrepancies,
            completionPercentage: AppState.theoreticalInventory.length > 0 ? 
                Math.round((totalScanned / AppState.theoreticalInventory.length) * 100) : 0
        };
    },
    
    clearScans: function() {
        AppState.physicalInventory = {};
        this.updateRecentScans();
        Statistics.update();
    }
};