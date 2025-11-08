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
                this.excelFileInput.files = e.dataTransfer.files;
                this.handleFileSelection();
            }
        });
        
        this.excelFileInput.addEventListener('change', () => this.handleFileSelection());
        this.removeFileButton.addEventListener('click', () => this.removeSelectedFile());
        this.loadExcelButton.addEventListener('click', () => this.loadExcelData());
    },
    
    handleFileSelection: function() {
        if (this.excelFileInput.files.length > 0) {
            const file = this.excelFileInput.files[0];
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
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Obtener la primera hoja
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convertir a JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // Procesar los datos
                AppState.theoreticalInventory = jsonData.map(row => {
                    // Buscar las columnas por nombres comunes
                    const code = row['Código'] || row['codigo'] || row['CODIGO'] || row['Código de Barras'] || row['SKU'] || '';
                    const name = row['Producto'] || row['producto'] || row['PRODUCTO'] || row['Descripción'] || row['Nombre'] || '';
                    const quantity = row['Cantidad'] || row['cantidad'] || row['CANTIDAD'] || row['Stock'] || row['Existencia'] || 0;
                    
                    return {
                        code: code.toString(),
                        name: name.toString(),
                        quantity: parseInt(quantity) || 0
                    };
                }).filter(item => item.code && item.name); // Filtrar elementos vacíos
                
                // Reiniciar inventario físico
                AppState.physicalInventory = {};
                
                // Actualizar interfaz
                BarcodeScanner.updateRecentScans();
                Statistics.update();
                this.updateCurrentInventoryTable();
                
                // Habilitar el botón de generar informe
                document.getElementById('generate-report').disabled = AppState.theoreticalInventory.length === 0;
                
                alert(`Inventario teórico cargado correctamente con ${AppState.theoreticalInventory.length} productos.`);
            } catch (error) {
                console.error('Error al procesar el archivo Excel:', error);
                alert('Error al procesar el archivo Excel. Verifique que el formato sea correcto.');
            }
        };
        
        reader.onerror = function() {
            alert('Error al leer el archivo.');
        };
        
        reader.readAsArrayBuffer(file);
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
        
        // Mostrar los primeros 10 productos
        const productsToShow = AppState.theoreticalInventory.slice(0, 10);
        
        productsToShow.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
            `;
            currentInventoryTable.appendChild(row);
        });
        
        // Si hay más de 10 productos, mostrar un mensaje
        if (AppState.theoreticalInventory.length > 10) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" class="text-center text-muted">
                    ... y ${AppState.theoreticalInventory.length - 10} productos más
                </td>
            `;
            currentInventoryTable.appendChild(row);
        }
    }
};