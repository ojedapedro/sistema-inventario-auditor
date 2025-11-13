// Módulo para cargar y procesar archivos Excel

const ExcelLoader = {
    init: function() {
        this.fileUploadArea = document.getElementById('file-upload-area');
        this.excelFileInput = document.getElementById('excel-file');
        this.fileInfo = document.getElementById('file-info');
        this.fileName = document.getElementById('file-name');
        this.removeFileButton = document.getElementById('remove-file');
        this.loadExcelButton = document.getElementById('load-excel');
        
        this.setupEventListeners();
    },
    
    setupEventListeners: function() {
        this.fileUploadArea.addEventListener('click', () => this.excelFileInput.click());
        
        this.fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileUploadArea.style.borderColor = '#3498db';
            this.fileUploadArea.style.backgroundColor = '#f8f9fa';
        });
        
        this.fileUploadArea.addEventListener('dragleave', () => {
            this.fileUploadArea.style.borderColor = '#ccc';
            this.fileUploadArea.style.backgroundColor = '';
        });
        
        this.fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileUploadArea.style.borderColor = '#ccc';
            this.fileUploadArea.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length) {
                const file = e.dataTransfer.files[0];
                if (this.isValidExcelFile(file)) {
                    this.excelFileInput.files = e.dataTransfer.files;
                    this.handleFileSelection();
                } else {
                    alert('Por favor, seleccione un archivo Excel válido (.xlsx, .xls)');
                }
            }
        });
        
        this.excelFileInput.addEventListener('change', () => this.handleFileSelection());
        this.removeFileButton.addEventListener('click', () => this.removeSelectedFile());
        this.loadExcelButton.addEventListener('click', () => this.loadExcelData());
    },
    
    isValidExcelFile: function(file) {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        const allowedExtensions = ['.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    },
    
    handleFileSelection: function() {
        if (this.excelFileInput.files.length > 0) {
            const file = this.excelFileInput.files[0];
            
            if (!this.isValidExcelFile(file)) {
                alert('Por favor, seleccione un archivo Excel válido (.xlsx, .xls)');
                this.removeSelectedFile();
                return;
            }
            
            this.fileName.textContent = file.name;
            this.fileInfo.style.display = 'block';
            this.loadExcelButton.disabled = false;
        }
    },
    
    removeSelectedFile: function() {
        this.excelFileInput.value = '';
        this.fileInfo.style.display = 'none';
        this.loadExcelButton.disabled = true;
    },
    
    loadExcelData: function() {
        const file = this.excelFileInput.files[0];
        if (!file) {
            alert('Por favor, seleccione un archivo Excel.');
            return;
        }
        
        this.showLoadingState();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                this.processInventoryData(jsonData);
                
            } catch (error) {
                console.error('Error al procesar el archivo Excel:', error);
                alert('Error al procesar el archivo Excel. Verifique que el formato sea correcto.');
                this.hideLoadingState();
            }
        };
        
        reader.onerror = () => {
            alert('Error al leer el archivo.');
            this.hideLoadingState();
        };
        
        reader.readAsArrayBuffer(file);
    },
    
    processInventoryData: function(jsonData) {
        AppState.theoreticalInventory = jsonData.map((row, index) => {
            const code = row['Código'] || row['codigo'] || row['CODIGO'] || 
                         row['Código de Barras'] || row['SKU'] || row['EAN'] || 
                         (index + 1).toString();
            
            const name = row['Producto'] || row['producto'] || row['PRODUCTO'] || 
                        row['Descripción'] || row['Nombre'] || row['Item'] || 
                        `Producto ${index + 1}`;
            
            const quantity = parseInt(row['Cantidad'] || row['cantidad'] || 
                            row['CANTIDAD'] || row['Stock'] || row['Existencia'] || 0);
            
            return {
                code: code.toString().trim(),
                name: name.toString().trim(),
                quantity: isNaN(quantity) ? 0 : quantity
            };
        }).filter(item => item.code && item.name);
        
        AppState.physicalInventory = {};
        
        BarcodeScanner.updateRecentScans();
        Statistics.update();
        this.updateCurrentInventoryTable();
        
        document.getElementById('generate-report').disabled = AppState.theoreticalInventory.length === 0;
        
        this.hideLoadingState();
        
        const successMessage = `Inventario teórico cargado correctamente con ${AppState.theoreticalInventory.length} productos.`;
        this.showSuccessMessage(successMessage);
    },
    
    showLoadingState: function() {
        this.loadExcelButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cargando...';
        this.loadExcelButton.disabled = true;
        this.fileUploadArea.classList.add('loading');
    },
    
    hideLoadingState: function() {
        this.loadExcelButton.innerHTML = '<i class="fas fa-upload me-2"></i>Cargar Inventario';
        this.loadExcelButton.disabled = false;
        this.fileUploadArea.classList.remove('loading');
    },
    
    showSuccessMessage: function(message) {
        const originalText = this.loadExcelButton.innerHTML;
        
        this.loadExcelButton.innerHTML = '<i class="fas fa-check me-2"></i>¡Cargado!';
        this.loadExcelButton.classList.remove('btn-primary');
        this.loadExcelButton.classList.add('btn-success');
        
        setTimeout(() => {
            this.loadExcelButton.innerHTML = originalText;
            this.loadExcelButton.classList.remove('btn-success');
            this.loadExcelButton.classList.add('btn-primary');
        }, 2000);
    },
    
    updateCurrentInventoryTable: function() {
        const currentInventoryTable = document.getElementById('current-inventory');
        currentInventoryTable.innerHTML = '';
        
        if (AppState.theoreticalInventory.length === 0) {
            currentInventoryTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted py-3">No hay inventario cargado</td>
                </tr>
            `;
            return;
        }
        
        const productsToShow = AppState.theoreticalInventory.slice(0, 10);
        
        productsToShow.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${product.code}</code></td>
                <td>${product.name}</td>
                <td><span class="badge bg-secondary">${product.quantity}</span></td>
            `;
            currentInventoryTable.appendChild(row);
        });
        
        if (AppState.theoreticalInventory.length > 10) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" class="text-center text-muted">
                    <small>... y ${AppState.theoreticalInventory.length - 10} productos más</small>
                </td>
            `;
            currentInventoryTable.appendChild(row);
        }
    }
};