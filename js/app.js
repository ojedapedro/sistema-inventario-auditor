// Módulo principal de la aplicación

const AppState = {
    theoreticalInventory: [],
    physicalInventory: {},
    inventoryHistory: [],
    currentInventoryInfo: {
        date: '',
        store: '',
        responsible: '',
        observations: '',
        auditor: ''
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Auth.init();
    
    Auth.onAuthStateChange(function(user) {
        if (user) {
            initializeApp();
        } else {
            resetApp();
        }
    });
});

function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inventory-date').value = today;
    
    const savedHistory = localStorage.getItem('inventoryHistory');
    if (savedHistory) {
        try {
            AppState.inventoryHistory = JSON.parse(savedHistory);
            InventoryHistory.render();
        } catch (e) {
            console.error('Error loading history:', e);
            AppState.inventoryHistory = [];
        }
    }
    
    ExcelLoader.init();
    BarcodeScanner.init();
    PDFGenerator.init();
    InventoryInfo.init();
    
    Statistics.update();
    
    console.log('Aplicación inicializada para usuario:', Auth.getCurrentUser().name);
}

function resetApp() {
    AppState.theoreticalInventory = [];
    AppState.physicalInventory = {};
    AppState.currentInventoryInfo = {
        date: '',
        store: '',
        responsible: '',
        observations: '',
        auditor: ''
    };
    
    Statistics.update();
    BarcodeScanner.updateRecentScans();
    ExcelLoader.updateCurrentInventoryTable();
    
    document.getElementById('generate-report').disabled = true;
    document.getElementById('load-excel').disabled = true;
    
    console.log('Aplicación reinicializada');
}

const InventoryInfo = {
    init: function() {
        document.getElementById('save-info').addEventListener('click', this.save.bind(this));
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('inventory-date').value = today;
    },
    
    save: function() {
        const date = document.getElementById('inventory-date').value;
        const store = document.getElementById('store').value.trim();
        const responsible = document.getElementById('responsible').value.trim();
        const observations = document.getElementById('observations').value.trim();
        
        if (!date || !store || !responsible) {
            alert('Por favor, complete todos los campos obligatorios (*) del inventario.');
            return;
        }
        
        AppState.currentInventoryInfo = { 
            date, 
            store, 
            responsible, 
            observations,
            auditor: Auth.getCurrentUser()?.name || 'No identificado'
        };
        
        this.showSuccessMessage();
    },
    
    showSuccessMessage: function() {
        const btn = document.getElementById('save-info');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Información Guardada';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-success');
        }, 2000);
    },
    
    getCurrentInfo: function() {
        return AppState.currentInventoryInfo;
    }
};

const Statistics = {
    update: function() {
        const totalProducts = AppState.theoreticalInventory.length;
        const scannedProducts = Object.keys(AppState.physicalInventory).length;
        
        let discrepancies = 0;
        AppState.theoreticalInventory.forEach(product => {
            const scannedQty = AppState.physicalInventory[product.code] || 0;
            if (scannedQty !== product.quantity) {
                discrepancies++;
            }
        });
        
        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('scanned-products').textContent = scannedProducts;
        document.getElementById('discrepancies-count').textContent = discrepancies;
        
        const progressPercentage = totalProducts > 0 ? Math.round((scannedProducts / totalProducts) * 100) : 0;
        const progressBar = document.getElementById('progress-bar');
        progressBar.style.width = `${progressPercentage}%`;
        document.getElementById('progress-text').textContent = `${progressPercentage}% completado`;
        document.getElementById('progress-detail').textContent = `${scannedProducts} de ${totalProducts} productos`;
    }
};

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
            const date = new Date(entry.date).toLocaleDateString('es-ES');
            
            historyItem.innerHTML = `
                <h6>${date} - ${entry.store}</h6>
                <p class="mb-1"><strong>Responsable:</strong> ${entry.responsible}</p>
                <p class="mb-1"><strong>Auditor:</strong> ${entry.auditor || 'N/A'}</p>
                <p class="mb-1"><strong>Productos:</strong> ${entry.scannedProducts}/${entry.totalProducts} (${progressPercentage}%)</p>
                <p class="mb-0"><strong>Discrepancias:</strong> ${entry.discrepancies}</p>
            `;
            
            container.appendChild(historyItem);
        });
    },
    
    add: function(entry) {
        AppState.inventoryHistory.unshift(entry);
        
        if (AppState.inventoryHistory.length > 5) {
            AppState.inventoryHistory = AppState.inventoryHistory.slice(0, 5);
        }
        
        localStorage.setItem('inventoryHistory', JSON.stringify(AppState.inventoryHistory));
        this.render();
    },
    
    clear: function() {
        AppState.inventoryHistory = [];
        localStorage.removeItem('inventoryHistory');
        this.render();
    }
};

window.AppState = AppState;
window.Statistics = Statistics;
window.InventoryHistory = InventoryHistory;
window.InventoryInfo = InventoryInfo;
window.Auth = Auth;
window.initializeApp = initializeApp;
window.resetApp = resetApp;