// Módulo para el escaneo de códigos de barras con funciones de edición

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
        this.setupEventDelegation();
    },
    
    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.barcodeInput.focus();
            }
            
            // Escape para cancelar edición
            if (e.key === 'Escape') {
                this.cancelEdit();
            }
        });
    },
    
    setupEventDelegation: function() {
        // Usar delegación de eventos para los botones dinámicos
        this.recentScansTable.addEventListener('click', (e) => {
            const target = e.target;
            
            // Botón editar
            if (target.closest('.edit-scan')) {
                const button = target.closest('.edit-scan');
                const barcode = button.dataset.barcode;
                this.startEditScan(barcode);
            }
            
            // Botón eliminar
            if (target.closest('.delete-scan')) {
                const button = target.closest('.delete-scan');
                const barcode = button.dataset.barcode;
                this.deleteScan(barcode);
            }
            
            // Botón guardar edición
            if (target.closest('.save-edit')) {
                const button = target.closest('.save-edit');
                const barcode = button.dataset.barcode;
                this.saveEdit(barcode);
            }
            
            // Botón cancelar edición
            if (target.closest('.cancel-edit')) {
                this.cancelEdit();
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
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-barcode fa-2x mb-2 d-block"></i>
                        No se han escaneado productos aún
                    </td>
                </tr>
            `;
            return;
        }
        
        // MOSTRAR HASTA 1000 REGISTROS - MODIFICACIÓN SOLICITADA
        const recentBarcodes = Object.keys(AppState.physicalInventory)
            .sort((a, b) => AppState.physicalInventory[b] - AppState.physicalInventory[a])
            .slice(0, 1000);
        
        recentBarcodes.forEach(barcode => {
            const product = AppState.theoreticalInventory.find(p => p.code === barcode);
            if (!product) return;
            
            const theoreticalQty = product.quantity;
            const scannedQty = AppState.physicalInventory[barcode];
            const difference = scannedQty - theoreticalQty;
            
            let status, badgeClass, statusText;
            if (scannedQty === theoreticalQty) {
                statusText = 'Correcto';
                status = '<span class="badge bg-success">Correcto</span>';
                badgeClass = '';
            } else if (scannedQty > theoreticalQty) {
                statusText = `+${difference}`;
                status = `<span class="badge bg-warning">+${difference}</span>`;
                badgeClass = 'table-warning';
            } else {
                statusText = `${difference}`;
                status = `<span class="badge bg-danger">${difference}</span>`;
                badgeClass = 'table-danger';
            }
            
            const row = document.createElement('tr');
            if (badgeClass) row.classList.add(badgeClass);
            row.dataset.barcode = barcode;
            
            row.innerHTML = `
                <td><code>${barcode}</code></td>
                <td>${product.name}</td>
                <td>${theoreticalQty}</td>
                <td class="scanned-quantity">${scannedQty}</td>
                <td class="status-cell">${status}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-scan" data-barcode="${barcode}" title="Editar cantidad">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-scan" data-barcode="${barcode}" title="Eliminar escaneo">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            this.recentScansTable.appendChild(row);
        });

        // Agregar mensaje si hay muchos registros
        if (Object.keys(AppState.physicalInventory).length > 1000) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center text-muted">
                    <small>Mostrando 1000 de ${Object.keys(AppState.physicalInventory).length} productos escaneados</small>
                </td>
            `;
            this.recentScansTable.appendChild(row);
        }
    },
    
    startEditScan: function(barcode) {
        // Cancelar cualquier edición en curso
        this.cancelEdit();
        
        const row = this.recentScansTable.querySelector(`tr[data-barcode="${barcode}"]`);
        if (!row) return;
        
        const product = AppState.theoreticalInventory.find(p => p.code === barcode);
        const currentQty = AppState.physicalInventory[barcode];
        
        if (!product) return;
        
        // Cambiar la fila al modo edición
        row.classList.add('editing');
        row.innerHTML = `
            <td><code>${barcode}</code></td>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>
                <div class="input-group input-group-sm">
                    <input type="number" 
                           class="form-control edit-quantity" 
                           value="${currentQty}" 
                           min="0" 
                           max="9999"
                           style="width: 80px;">
                </div>
            </td>
            <td>
                <span class="badge bg-secondary">Editando...</span>
            </td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-success save-edit" data-barcode="${barcode}" title="Guardar cambios">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-secondary cancel-edit" title="Cancelar edición">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        // Enfocar el campo de entrada
        const input = row.querySelector('.edit-quantity');
        input.focus();
        input.select();
        
        // Guardar referencia a la edición actual
        this.currentEdit = {
            barcode: barcode,
            originalQty: currentQty,
            row: row
        };
    },
    
    saveEdit: function(barcode) {
        if (!this.currentEdit || this.currentEdit.barcode !== barcode) {
            return;
        }
        
        const row = this.currentEdit.row;
        const input = row.querySelector('.edit-quantity');
        const newQty = parseInt(input.value);
        
        if (isNaN(newQty) || newQty < 0) {
            this.showErrorMessage('Por favor ingrese una cantidad válida (número positivo)');
            input.focus();
            return;
        }
        
        // Actualizar la cantidad en el inventario físico
        if (newQty === 0) {
            // Si la cantidad es 0, eliminar el producto
            delete AppState.physicalInventory[barcode];
            this.showSuccessMessage('Producto eliminado del inventario físico');
        } else {
            AppState.physicalInventory[barcode] = newQty;
            const change = newQty - this.currentEdit.originalQty;
            const changeText = change > 0 ? `+${change}` : change.toString();
            this.showSuccessMessage(`Cantidad actualizada: ${changeText}`);
        }
        
        // Finalizar edición
        this.currentEdit = null;
        
        // Actualizar la interfaz
        this.updateRecentScans();
        Statistics.update();
    },
    
    cancelEdit: function() {
        if (this.currentEdit) {
            this.currentEdit.row.classList.remove('editing');
            this.currentEdit = null;
            this.updateRecentScans();
        }
    },
    
    deleteScan: function(barcode) {
        const product = AppState.theoreticalInventory.find(p => p.code === barcode);
        if (!product) return;
        
        const currentQty = AppState.physicalInventory[barcode];
        
        // Mostrar confirmación
        const modal = this.createDeleteModal(product, barcode, currentQty);
        document.body.appendChild(modal);
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Limpiar después de cerrar
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    },
    
    createDeleteModal: function(product, barcode, currentQty) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Confirmar Eliminación
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>¿Está seguro de que desea eliminar el siguiente producto del inventario físico?</p>
                        <div class="alert alert-warning">
                            <strong>${product.name}</strong><br>
                            <small>Código: <code>${barcode}</code></small><br>
                            <small>Cantidad actual: <strong>${currentQty}</strong></small>
                        </div>
                        <p class="text-muted">Esta acción no se puede deshacer.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="confirm-delete">
                            <i class="fas fa-trash me-2"></i>Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Configurar evento de confirmación
        modal.querySelector('#confirm-delete').addEventListener('click', () => {
            delete AppState.physicalInventory[barcode];
            this.updateRecentScans();
            Statistics.update();
            this.showSuccessMessage('Producto eliminado correctamente');
            bootstrap.Modal.getInstance(modal).hide();
        });
        
        return modal;
    },
    
    showSuccessMessage: function(message) {
        this.showToast(message, 'success');
    },
    
    showErrorMessage: function(message) {
        this.showToast(message, 'danger');
    },
    
    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const container = this.getToastContainer();
        container.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 4000
        });
        
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },
    
    getToastContainer: function() {
        let container = document.getElementById('barcode-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'barcode-toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
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
        // Mostrar confirmación antes de limpiar todo
        if (Object.keys(AppState.physicalInventory).length === 0) return;
        
        const confirmClear = confirm(`¿Está seguro de que desea eliminar todos los ${Object.keys(AppState.physicalInventory).length} productos escaneados?`);
        
        if (confirmClear) {
            AppState.physicalInventory = {};
            this.updateRecentScans();
            Statistics.update();
            this.showSuccessMessage('Todos los productos escaneados han sido eliminados');
        }
    },
    
    // Método para buscar producto por código
    findProductByBarcode: function(barcode) {
        return AppState.theoreticalInventory.find(p => p.code === barcode);
    },
    
    // Método para obtener resumen de escaneos
    getScanSummary: function() {
        const stats = this.getScanStatistics();
        const products = Object.keys(AppState.physicalInventory).map(barcode => {
            const product = this.findProductByBarcode(barcode);
            return {
                barcode: barcode,
                name: product ? product.name : 'Desconocido',
                theoretical: product ? product.quantity : 0,
                physical: AppState.physicalInventory[barcode],
                difference: product ? AppState.physicalInventory[barcode] - product.quantity : 0
            };
        });
        
        return {
            statistics: stats,
            products: products
        };
    }
};