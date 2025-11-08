// Módulo para el escaneo de códigos de barras

const BarcodeScanner = {
    init: function() {
        this.barcodeInput = document.getElementById('barcode-input');
        this.recentScansTable = document.getElementById('recent-scans');
        
        this.barcodeInput.addEventListener('change', () => this.handleBarcodeScan());
    },
    
    handleBarcodeScan: function() {
        const barcode = this.barcodeInput.value.trim();
        if (!barcode) return;
        
        // Verificar si el código existe en el inventario teórico
        const product = AppState.theoreticalInventory.find(p => p.code === barcode);
        if (!product) {
            alert(`Producto con código ${barcode} no encontrado en el inventario teórico.`);
            this.barcodeInput.value = '';
            return;
        }
        
        // Registrar el escaneo
        if (AppState.physicalInventory[barcode]) {
            AppState.physicalInventory[barcode]++;
        } else {
            AppState.physicalInventory[barcode] = 1;
        }
        
        // Limpiar el campo de entrada para el próximo escaneo
        this.barcodeInput.value = '';
        
        // Actualizar la interfaz
        this.updateRecentScans();
        Statistics.update();
    },
    
    updateRecentScans: function() {
        this.recentScansTable.innerHTML = '';
        
        if (Object.keys(AppState.physicalInventory).length === 0) {
            this.recentScansTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">No se han escaneado productos aún</td>
                </tr>
            `;
            return;
        }
        
        // Obtener los últimos 5 productos escaneados
        const recentBarcodes = Object.keys(AppState.physicalInventory).slice(-5).reverse();
        
        recentBarcodes.forEach(barcode => {
            const product = AppState.theoreticalInventory.find(p => p.code === barcode);
            if (!product) return;
            
            const theoreticalQty = product.quantity;
            const scannedQty = AppState.physicalInventory[barcode];
            const status = theoreticalQty === scannedQty ? 
                '<span class="badge bg-success">Correcto</span>' : 
                '<span class="badge bg-danger">Discrepancia</span>';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${barcode}</td>
                <td>${product.name}</td>
                <td>${theoreticalQty}</td>
                <td>${scannedQty}</td>
                <td>${status}</td>
            `;
            
            if (theoreticalQty !== scannedQty) {
                row.classList.add('discrepancy');
            }
            
            this.recentScansTable.appendChild(row);
        });
    }
};