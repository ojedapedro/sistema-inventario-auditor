// Módulo para generar informes PDF - Versión Mejorada
const PDFGenerator = {
    // Configuración de estilos
    styles: {
        primaryColor: [44, 62, 80],
        secondaryColor: [52, 152, 219],
        successColor: [39, 174, 96],
        warningColor: [243, 156, 18],
        dangerColor: [231, 76, 60],
        lightColor: [236, 240, 241],
        darkColor: [52, 73, 94]
    },

    // Configuración del documento
    config: {
        margin: 20,
        pageWidth: 210, // A4 width in mm
        pageHeight: 297, // A4 height in mm
        contentWidth: 170,
        lineHeight: 5,
        logo: {
            width: 40,
            height: 20,
            position: { x: 20, y: 15 }
        }
    },

    // Estado actual del PDF
    currentDoc: null,
    currentY: 0,

    init: function() {
        document.getElementById('generate-report').addEventListener('click', () => this.generatePDFReport());
        console.log('PDF Generator inicializado correctamente');
    },

    generatePDFReport: function() {
        // Validaciones previas
        if (!this.validatePrerequisites()) {
            return;
        }

        this.showGeneratingState();
        
        // Pequeño delay para permitir que la UI se actualice
        setTimeout(() => {
            try {
                this.createPDFDocument();
                this.hideGeneratingState();
                this.showSuccessMessage();
            } catch (error) {
                console.error('Error generando PDF:', error);
                this.hideGeneratingState();
                this.showErrorMessage('Error al generar el PDF: ' + error.message);
            }
        }, 500);
    },

    validatePrerequisites: function() {
        if (!Auth.isAuthenticated()) {
            alert('Debe iniciar sesión para generar informes.');
            return false;
        }

        if (AppState.theoreticalInventory.length === 0) {
            alert('Primero debe cargar el inventario teórico.');
            return false;
        }

        const inventoryInfo = InventoryInfo.getCurrentInfo();
        if (!inventoryInfo.date || !inventoryInfo.store || !inventoryInfo.responsible) {
            alert('Complete la información del inventario (fecha, tienda y responsable) antes de generar el informe.');
            return false;
        }

        if (typeof jspdf === 'undefined') {
            alert('Error: La librería PDF no está cargada correctamente.');
            return false;
        }

        return true;
    },

    createPDFDocument: function() {
        const { jsPDF } = window.jspdf;
        this.currentDoc = new jsPDF();
        this.currentY = this.config.margin;

        // Configurar propiedades del documento
        this.setDocumentProperties();

        // Generar contenido en orden
        this.generateHeader();
        this.generateInventoryInfo();
        this.generateObservations();
        this.generateSummary();
        this.generateFullInventoryTable(); // MODIFICACIÓN: Mostrar inventario completo
        this.generateFooter();

        // Guardar el documento
        this.saveDocument();
        
        // Registrar en historial
        this.recordInHistory();
    },

    setDocumentProperties: function() {
        const inventoryInfo = InventoryInfo.getCurrentInfo();
        this.currentDoc.setProperties({
            title: `Informe de Inventario - ${inventoryInfo.store} - ${inventoryInfo.date}`,
            subject: 'Auditoría de Inventario',
            author: inventoryInfo.auditor || 'Sistema de Inventario',
            creator: 'Sistema de Control de Inventario',
            keywords: 'inventario, auditoría, discrepancias, informe'
        });
    },

    generateHeader: function() {
        const logoLoaded = this.addLogo();
        
        // Título principal
        this.currentDoc.setFontSize(20);
        this.currentDoc.setFont('helvetica', 'bold');
        this.currentDoc.setTextColor(...this.styles.primaryColor);
        
        const titleX = logoLoaded ? 70 : this.config.margin;
        this.currentDoc.text('INFORME DE AUDITORÍA DE INVENTARIO', titleX, 30);
        
        // Línea decorativa
        this.currentDoc.setDrawColor(...this.styles.secondaryColor);
        this.currentDoc.setLineWidth(0.5);
        this.currentDoc.line(this.config.margin, 35, 190, 35);
        
        this.currentY = 45;
    },

    addLogo: function() {
        try {
            const logoUrl = 'assets/images/logo.png';
            const img = new Image();
            
            // Intentar cargar el logo de forma síncrona con timeout
            let loaded = false;
            img.onload = () => {
                loaded = true;
                try {
                    this.currentDoc.addImage(
                        img, 
                        'PNG', 
                        this.config.logo.position.x, 
                        this.config.logo.position.y, 
                        this.config.logo.width, 
                        this.config.logo.height
                    );
                } catch (e) {
                    console.warn('No se pudo agregar el logo al PDF:', e);
                }
            };
            
            img.onerror = () => {
                loaded = false;
            };
            
            img.src = logoUrl;
            
            // Esperar un momento para ver si la imagen carga
            // En un entorno real, esto debería manejarse con promesas
            return loaded;
        } catch (error) {
            console.warn('Error cargando logo:', error);
            return false;
        }
    },

    generateInventoryInfo: function() {
        const inventoryInfo = InventoryInfo.getCurrentInfo();
        
        this.currentDoc.setFontSize(11);
        this.currentDoc.setFont('helvetica', 'normal');
        this.currentDoc.setTextColor(...this.styles.darkColor);

        // Crear tabla de información
        const infoData = [
            ['Fecha del Inventario:', inventoryInfo.date || 'No especificada'],
            ['Tienda:', inventoryInfo.store || 'No especificada'],
            ['Responsable:', inventoryInfo.responsible || 'No especificada'],
            ['Auditor:', inventoryInfo.auditor || 'No identificado'],
            ['Fecha de Generación:', new Date().toLocaleDateString('es-ES')],
            ['Hora de Generación:', new Date().toLocaleTimeString('es-ES')]
        ];

        infoData.forEach(([label, value], index) => {
            const yPos = this.currentY + (index * 6);
            this.currentDoc.setFont('helvetica', 'bold');
            this.currentDoc.text(label, this.config.margin, yPos);
            this.currentDoc.setFont('helvetica', 'normal');
            this.currentDoc.text(value, this.config.margin + 45, yPos);
        });

        this.currentY += (infoData.length * 6) + 10;
    },

    generateObservations: function() {
        const observations = InventoryInfo.getCurrentInfo().observations;
        
        if (observations && observations.trim() !== '' && observations !== 'No hay observaciones') {
            this.checkPageBreak(20);
            
            this.currentDoc.setFontSize(12);
            this.currentDoc.setFont('helvetica', 'bold');
            this.currentDoc.setTextColor(...this.styles.primaryColor);
            this.currentDoc.text('OBSERVACIONES:', this.config.margin, this.currentY);
            
            this.currentY += 5;
            
            this.currentDoc.setFontSize(10);
            this.currentDoc.setFont('helvetica', 'normal');
            this.currentDoc.setTextColor(...this.styles.darkColor);
            
            const observationsLines = this.currentDoc.splitTextToSize(observations, this.config.contentWidth);
            this.currentDoc.text(observationsLines, this.config.margin, this.currentY);
            
            this.currentY += (observationsLines.length * 4) + 10;
            
            // Línea separadora
            this.currentDoc.setDrawColor(200, 200, 200);
            this.currentDoc.setLineWidth(0.2);
            this.currentDoc.line(this.config.margin, this.currentY - 5, 190, this.currentY - 5);
        }
    },

    generateSummary: function() {
        this.checkPageBreak(40);
        
        // Título de la sección
        this.currentDoc.setFontSize(16);
        this.currentDoc.setFont('helvetica', 'bold');
        this.currentDoc.setTextColor(...this.styles.primaryColor);
        this.currentDoc.text('RESUMEN EJECUTIVO', this.config.margin, this.currentY);
        
        this.currentY += 8;
        
        // Estadísticas
        const stats = this.calculateStatistics();
        
        this.currentDoc.setFontSize(11);
        this.currentDoc.setFont('helvetica', 'normal');
        
        const summaryData = [
            { label: 'Total de Productos en Inventario:', value: stats.totalProducts, color: this.styles.primaryColor },
            { label: 'Productos Escaneados:', value: stats.scannedProducts, color: this.styles.secondaryColor },
            { label: 'Progreso de Escaneo:', value: `${stats.progressPercentage}%`, color: this.styles.secondaryColor },
            { label: 'Coincidencias Perfectas:', value: `${stats.matchPercentage}%`, color: this.styles.successColor },
            { label: 'Discrepancias Encontradas:', value: stats.discrepancies, color: stats.discrepancies > 0 ? this.styles.dangerColor : this.styles.successColor }
        ];

        summaryData.forEach((item, index) => {
            const yPos = this.currentY + (index * 6);
            
            this.currentDoc.setFont('helvetica', 'bold');
            this.currentDoc.setTextColor(...this.styles.darkColor);
            this.currentDoc.text(item.label, this.config.margin, yPos);
            
            this.currentDoc.setFont('helvetica', 'bold');
            this.currentDoc.setTextColor(...item.color);
            this.currentDoc.text(item.value.toString(), this.config.margin + 60, yPos);
        });

        this.currentY += (summaryData.length * 6) + 15;
    },

    calculateStatistics: function() {
        const totalProducts = AppState.theoreticalInventory.length;
        const scannedProducts = Object.keys(AppState.physicalInventory).length;
        const progressPercentage = totalProducts > 0 ? Math.round((scannedProducts / totalProducts) * 100) : 0;

        let discrepancies = 0;
        AppState.theoreticalInventory.forEach(product => {
            const scannedQty = AppState.physicalInventory[product.code] || 0;
            if (scannedQty !== product.quantity) {
                discrepancies++;
            }
        });

        const matchPercentage = totalProducts > 0 ? Math.round(((totalProducts - discrepancies) / totalProducts) * 100) : 0;

        return {
            totalProducts,
            scannedProducts,
            progressPercentage,
            discrepancies,
            matchPercentage
        };
    },

    // MODIFICACIÓN: Mostrar inventario completo en lugar de solo discrepancias
    generateFullInventoryTable: function() {
        const fullInventory = this.getFullInventoryData();
        
        this.checkPageBreak(30);
        
        // Título de la tabla
        this.currentDoc.setFontSize(14);
        this.currentDoc.setFont('helvetica', 'bold');
        this.currentDoc.setTextColor(...this.styles.primaryColor);
        this.currentDoc.text('INVENTARIO COMPLETO - TODOS LOS PRODUCTOS', this.config.margin, this.currentY);
        
        this.currentY += 8;

        // Generar tabla usando autoTable si está disponible
        if (typeof this.currentDoc.autoTable !== 'undefined') {
            this.generateFullAutoTable(fullInventory);
        } else {
            this.generateFullManualTable(fullInventory);
        }
    },

    getFullInventoryData: function() {
        const fullInventory = [];
        
        // Incluir todos los productos del inventario teórico
        AppState.theoreticalInventory.forEach(product => {
            const scannedQty = AppState.physicalInventory[product.code] || 0;
            const difference = scannedQty - product.quantity;
            
            fullInventory.push({
                code: product.code,
                name: product.name,
                theoretical: product.quantity,
                physical: scannedQty,
                difference: difference,
                status: difference > 0 ? 'EXCEDENTE' : difference < 0 ? 'FALTANTE' : 'CORRECTO',
                hasDiscrepancy: difference !== 0
            });
        });

        return fullInventory;
    },

    generateFullAutoTable: function(fullInventory) {
        const tableData = fullInventory.map(item => [
            item.code,
            item.name,
            item.theoretical.toString(),
            item.physical.toString(),
            item.difference.toString(),
            item.status
        ]);

        try {
            this.currentDoc.autoTable({
                startY: this.currentY,
                head: [['CÓDIGO', 'PRODUCTO', 'TEÓRICO', 'FÍSICO', 'DIFERENCIA', 'ESTADO']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: this.styles.primaryColor,
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1
                },
                columnStyles: {
                    0: { cellWidth: 22, fontStyle: 'bold' },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 18, halign: 'center' },
                    3: { cellWidth: 18, halign: 'center' },
                    4: { 
                        cellWidth: 20, 
                        halign: 'center',
                        fontStyle: 'bold'
                    },
                    5: { 
                        cellWidth: 22, 
                        halign: 'center',
                        fontStyle: 'bold'
                    }
                },
                // MODIFICACIÓN: Resaltar incidencias con colores
                didDrawCell: (data) => {
                    if (data.section === 'body') {
                        const rowIndex = data.row.index;
                        const item = fullInventory[rowIndex];
                        
                        if (item.hasDiscrepancy) {
                            // ROJO para faltantes, AMARILLO para excedentes
                            if (item.difference < 0) {
                                // FALTANTE - ROJO
                                this.currentDoc.setFillColor(255, 200, 200);
                            } else {
                                // EXCEDENTE - AMARILLO
                                this.currentDoc.setFillColor(255, 255, 200);
                            }
                            
                            this.currentDoc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        }
                    }
                },
                margin: { top: 10, bottom: 10 }
            });

            this.currentY = this.currentDoc.lastAutoTable.finalY + 10;
            
            // Agregar leyenda de colores
            this.addColorLegend();
            
        } catch (error) {
            console.error('Error con autoTable, usando tabla manual:', error);
            this.generateFullManualTable(fullInventory);
        }
    },

    generateFullManualTable: function(fullInventory) {
        // Encabezados de la tabla
        this.currentDoc.setFontSize(9);
        this.currentDoc.setFont('helvetica', 'bold');
        this.currentDoc.setTextColor(255, 255, 255);
        this.currentDoc.setFillColor(...this.styles.primaryColor);
        
        // Dibujar fila de encabezados
        this.currentDoc.rect(this.config.margin, this.currentY, 170, 6, 'F');
        this.currentDoc.text('CÓDIGO', this.config.margin + 2, this.currentY + 4);
        this.currentDoc.text('PRODUCTO', this.config.margin + 25, this.currentY + 4);
        this.currentDoc.text('TEÓRICO', this.config.margin + 95, this.currentY + 4);
        this.currentDoc.text('FÍSICO', this.config.margin + 115, this.currentY + 4);
        this.currentDoc.text('DIFERENCIA', this.config.margin + 135, this.currentY + 4);
        this.currentDoc.text('ESTADO', this.config.margin + 155, this.currentY + 4);

        this.currentY += 8;

        // Datos de la tabla
        this.currentDoc.setFontSize(8);
        this.currentDoc.setFont('helvetica', 'normal');
        
        fullInventory.forEach((item, index) => {
            this.checkPageBreak(8);
            
            // MODIFICACIÓN: Resaltar incidencias con colores
            if (item.hasDiscrepancy) {
                if (item.difference < 0) {
                    // FALTANTE - ROJO
                    this.currentDoc.setFillColor(255, 200, 200);
                } else {
                    // EXCEDENTE - AMARILLO
                    this.currentDoc.setFillColor(255, 255, 200);
                }
                this.currentDoc.rect(this.config.margin, this.currentY - 2, 170, 6, 'F');
            }
            
            this.currentDoc.setTextColor(0, 0, 0);
            this.currentDoc.text(item.code, this.config.margin + 2, this.currentY);
            
            // Acortar nombre del producto si es muy largo
            const productName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
            this.currentDoc.text(productName, this.config.margin + 25, this.currentY);
            
            this.currentDoc.text(item.theoretical.toString(), this.config.margin + 95, this.currentY);
            this.currentDoc.text(item.physical.toString(), this.config.margin + 115, this.currentY);
            
            // Diferencia con color
            if (item.difference > 0) {
                this.currentDoc.setTextColor(...this.styles.warningColor);
                this.currentDoc.text('+' + item.difference.toString(), this.config.margin + 135, this.currentY);
            } else if (item.difference < 0) {
                this.currentDoc.setTextColor(...this.styles.dangerColor);
                this.currentDoc.text(item.difference.toString(), this.config.margin + 135, this.currentY);
            } else {
                this.currentDoc.setTextColor(...this.styles.successColor);
                this.currentDoc.text(item.difference.toString(), this.config.margin + 135, this.currentY);
            }
            
            // Estado
            this.currentDoc.setTextColor(0, 0, 0);
            this.currentDoc.text(item.status, this.config.margin + 155, this.currentY);
            
            this.currentY += 6;
        });

        this.currentY += 5;
        
        // Agregar leyenda de colores
        this.addColorLegend();
    },

    addColorLegend: function() {
        this.checkPageBreak(20);
        
        this.currentDoc.setFontSize(8);
        this.currentDoc.setFont('helvetica', 'bold');
        this.currentDoc.setTextColor(...this.styles.darkColor);
        this.currentDoc.text('LEYENDA:', this.config.margin, this.currentY);
        
        this.currentY += 5;
        
        // Rojo para faltantes
        this.currentDoc.setFillColor(255, 200, 200);
        this.currentDoc.rect(this.config.margin, this.currentY - 1, 5, 5, 'F');
        this.currentDoc.setTextColor(0, 0, 0);
        this.currentDoc.setFont('helvetica', 'normal');
        this.currentDoc.text('Faltantes (cantidad física menor que teórica)', this.config.margin + 8, this.currentY + 2);
        
        this.currentY += 6;
        
        // Amarillo para excedentes
        this.currentDoc.setFillColor(255, 255, 200);
        this.currentDoc.rect(this.config.margin, this.currentY - 1, 5, 5, 'F');
        this.currentDoc.text('Excedentes (cantidad física mayor que teórica)', this.config.margin + 8, this.currentY + 2);
    },

    generateFooter: function() {
        this.checkPageBreak(20);
        
        // Línea separadora
        this.currentDoc.setDrawColor(200, 200, 200);
        this.currentDoc.setLineWidth(0.2);
        this.currentDoc.line(this.config.margin, this.currentY, 190, this.currentY);
        this.currentY += 5;
        
        // Texto del footer
        this.currentDoc.setFontSize(8);
        this.currentDoc.setFont('helvetica', 'italic');
        this.currentDoc.setTextColor(150, 150, 150);
        this.currentDoc.text('Documento generado automáticamente por el Sistema de Control de Inventario', this.config.margin, this.currentY);
        this.currentY += 4;
        this.currentDoc.text('https://github.com/tu-usuario/inventory-control-system', this.config.margin, this.currentY);
    },

    checkPageBreak: function(requiredHeight) {
        if (this.currentY + requiredHeight > this.config.pageHeight - this.config.margin) {
            this.currentDoc.addPage();
            this.currentY = this.config.margin;
            return true;
        }
        return false;
    },

    saveDocument: function() {
        const inventoryInfo = InventoryInfo.getCurrentInfo();
        const safeStoreName = inventoryInfo.store.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '_');
        const safeDate = inventoryInfo.date.replace(/-/g, '');
        const fileName = `Informe_Inventario_${safeStoreName}_${safeDate}.pdf`;
        
        this.currentDoc.save(fileName);
    },

    recordInHistory: function() {
        const inventoryInfo = InventoryInfo.getCurrentInfo();
        const stats = this.calculateStatistics();
        
        InventoryHistory.add({
            date: inventoryInfo.date,
            store: inventoryInfo.store,
            responsible: inventoryInfo.responsible,
            auditor: inventoryInfo.auditor,
            observations: inventoryInfo.observations,
            totalProducts: stats.totalProducts,
            scannedProducts: stats.scannedProducts,
            discrepancies: stats.discrepancies,
            matchPercentage: stats.matchPercentage,
            timestamp: new Date().toISOString()
        });
    },

    showGeneratingState: function() {
        const btn = document.getElementById('generate-report');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generando PDF...';
        btn.disabled = true;
        btn.classList.add('loading');
    },

    hideGeneratingState: function() {
        const btn = document.getElementById('generate-report');
        btn.innerHTML = '<i class="fas fa-download me-2"></i>Generar y Descargar PDF';
        btn.disabled = false;
        btn.classList.remove('loading');
    },

    showSuccessMessage: function() {
        this.showToast('¡PDF generado correctamente!', 'success');
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
            delay: 5000
        });
        
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },

    getToastContainer: function() {
        let container = document.getElementById('pdf-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'pdf-toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    },

    // Método de utilidad para debug
    debug: function() {
        console.log('=== DEBUG PDF GENERATOR ===');
        console.log('Dependencias cargadas:', {
            jsPDF: typeof jspdf !== 'undefined',
            autoTable: typeof window.jspdf?.jsPDF?.autoTable !== 'undefined'
        });
        console.log('Estado de la aplicación:', {
            autenticado: Auth.isAuthenticated(),
            inventarioTeorico: AppState.theoreticalInventory.length,
            inventarioFisico: Object.keys(AppState.physicalInventory).length,
            informacion: InventoryInfo.getCurrentInfo()
        });
        console.log('======================');
    }
};

// Exponer para debugging
window.PDFGenerator = PDFGenerator;