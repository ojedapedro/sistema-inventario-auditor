// Módulo principal de la aplicación - Coordina todos los componentes

// Estado global de la aplicación
const AppState = {
    theoreticalInventory: [],
    physicalInventory: {},
    inventoryHistory: [],
    currentInventoryInfo: {
        date: '',
        store: '',
        responsible: ''
    }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Establecer fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inventory-date').value = today;
    
    // Cargar historial desde localStorage si existe
    const savedHistory = localStorage.getItem('inventoryHistory');
    if (savedHistory) {
        AppState.inventoryHistory = JSON.parse(savedHistory);
        InventoryHistory.render();
    }
    
    // Inicializar módulos
    ExcelLoader.init();
    BarcodeScanner.init();
    PDFGenerator.init();
    InventoryInfo.init();
    
    // Actualizar estadísticas iniciales
    Statistics.update();
});

// Módulo de gestión de información del inventario
const InventoryInfo = {
    init: function() {
        document.getElementById('save-info').addEventListener('click', this.save.bind(this));
    },
    
    save: function() {
        const date = document.getElementById('inventory-date').value;
        const store = document.getElementById('store').value;
        const responsible = document.getElementById('responsible').value;
        
        if (!date || !store || !responsible) {
            alert('Por favor, complete todos los campos de información del inventario.');
            return;
        }
        
        AppState.currentInventoryInfo = { date, store, responsible };
        alert(`Información guardada:\nFecha: ${date}\nTienda: ${store}\nResponsable: ${responsible}`);
    },
    
    getCurrentInfo: function() {
        return AppState.currentInventoryInfo;
    }
};

// Módulo de estadísticas
const Statistics = {
    update: function() {
        const totalProducts = AppState.theoreticalInventory.length;
        const scannedProducts = Object.keys(AppState.physicalInventory).length;
        
        // Calcular discrepancias
        let discrepancies = 0;
        AppState.theoreticalInventory.forEach(product => {
            const scannedQty = AppState.physicalInventory[product.code] || 0;
            if (scannedQty !== product.quantity) {
                discrepancies++;
            }
        });
        
        // Actualizar elementos del DOM
        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('scanned-products').textContent = scannedProducts;
        document.getElementById('discrepancies-count').textContent = discrepancies;
        
        // Actualizar barra de progreso
        const progressPercentage = totalProducts > 0 ? Math.round((scannedProducts / totalProducts) * 100) : 0;
        const progressBar = document.getElementById('progress-bar');
        progressBar.style.width = `${progressPercentage}%`;
        document.getElementById('progress-text').textContent = `${progressPercentage}% completado`;
        document.getElementById('progress-detail').textContent = `${scannedProducts} de ${totalProducts} productos`;
    }
};

// Módulo de historial de inventarios
const InventoryHistory = {
    render: function() {
        const container = document.getElementById('inventory-history');
        container.innerHTML = '';
        
        if (AppState.inventoryHistory.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-3">No hay historial disponible</p>';
            return;
        }
        
        AppState.inventoryHistory.forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const progressPercentage = Math.round((entry.scannedProducts / entry.totalProducts) * 100);
            
            historyItem.innerHTML = `
                <h6>${entry.date} - ${entry.store}</h6>
                <p class="mb-1"><strong>Responsable:</strong> ${entry.responsible}</p>
                <p class="mb-1"><strong>Productos:</strong> ${entry.scannedProducts}/${entry.totalProducts} (${progressPercentage}%)</p>
                <p class="mb-0"><strong>Discrepancias:</strong> ${entry.discrepancies}</p>
            `;
            
            container.appendChild(historyItem);
        });
    },
    
    add: function(entry) {
        AppState.inventoryHistory.unshift(entry);
        
        // Mantener solo los últimos 5 registros
        if (AppState.inventoryHistory.length > 5) {
            AppState.inventoryHistory = AppState.inventoryHistory.slice(0, 5);
        }
        
        // Guardar en localStorage
        localStorage.setItem('inventoryHistory', JSON.stringify(AppState.inventoryHistory));
        
        // Actualizar la vista
        this.render();
    }
};

// Exportar el estado para que otros módulos puedan acceder a él
window.AppState = AppState;
window.Statistics = Statistics;
window.InventoryHistory = InventoryHistory;
window.InventoryInfo = InventoryInfo;