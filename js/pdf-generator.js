// Módulo para generar informes PDF

const PDFGenerator = {
    init: function() {
        document.getElementById('generate-report').addEventListener('click', () => this.generatePDFReport());
    },

    generatePDFReport: function() {
        if (AppState.theoreticalInventory.length === 0) {
            alert('Primero debe cargar el inventario teórico.');
            return;
        }

        // Crear un nuevo documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Información del inventario
        const inventoryInfo = InventoryInfo.getCurrentInfo();
        const date = inventoryInfo.date || 'No especificada';
        const store = inventoryInfo.store || 'No especificada';
        const responsible = inventoryInfo.responsible || 'No especificada';

        // Intentar cargar y agregar el logo
        this.addLogoToPDF(doc, date, store, responsible);
    },

    addLogoToPDF: function(doc, date, store, responsible) {
        const logoUrl = 'assets/images/logo.png';
        
        // Crear una imagen para el logo
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = logoUrl;

        // Timeout para evitar que se quede bloqueado si la imagen no carga
        const logoTimeout = setTimeout(() => {
            console.warn("Timeout al cargar el logo, generando PDF sin logo");
            this.generatePDFContent(doc, date, store, responsible, null);
        }, 3000);

        img.onload = () => {
            clearTimeout(logoTimeout);
            this.generatePDFContent(doc, date, store, responsible, img);
        };

        img.onerror = () => {
            clearTimeout(logoTimeout);
            console.error("Error al cargar el logo, generando PDF sin logo");
            this.generatePDFContent(doc, date, store, responsible, null);
        };
    },

    generatePDFContent: function(doc, date, store, responsible, logoImg) {
        // Agregar logo si está disponible
        if (logoImg) {
            try {
                doc.addImage(logoImg, 'PNG', 20, 15, 40, 20);
                // Título del informe
                doc.setFontSize(20);
                doc.setTextColor(0, 0, 0);
                doc.text('Informe de Incidencias de Inventario', 70, 30);
            } catch (e) {
                console.error("Error al agregar logo al PDF:", e);
                // Continuar sin logo
                doc.setFontSize(20);
                doc.setTextColor(0, 0, 0);
                doc.text('Informe de Incidencias de Inventario', 20, 30);
            }
        } else {
            // Título sin logo
            doc.setFontSize(20);
            doc.setTextColor(0, 0, 0);
            doc.text('Informe de Incidencias de Inventario', 20, 30);
        }

        // Información del inventario
        doc.setFontSize(12);
        let startY = logoImg ? 50 : 40;
        
        doc.text(`Fecha del Inventario: ${date}`, 20, startY);
        doc.text(`Tienda: ${store}`, 20, startY + 10);
        doc.text(`Responsable: ${responsible}`, 20, startY + 20);

        // Resumen
        doc.setFontSize(16);
        doc.text('Resumen del Inventario', 20, startY + 40);

        doc.setFontSize(12);
        const totalProducts = AppState.theoreticalInventory.length;
        const scannedProducts = Object.keys(AppState.physicalInventory).length;
        const progressPercentage = totalProducts > 0 ? Math.round((scannedProducts / totalProducts) * 100) : 0;

        // Calcular discrepancias
        let discrepancies = 0;
        const discrepancyData = [];

        AppState.theoreticalInventory.forEach(product => {
            const scannedQty = AppState.physicalInventory[product.code] || 0;
            if (scannedQty !== product.quantity) {
                discrepancies++;
                discrepancyData.push([
                    product.code,
                    product.name,
                    product.quantity.toString(),
                    scannedQty.toString(),
                    (scannedQty - product.quantity).toString()
                ]);
            }
        });

        doc.text(`Productos en inventario teórico: ${totalProducts}`, 20, startY + 55);
        doc.text(`Productos escaneados: ${scannedProducts}`, 20, startY + 65);
        doc.text(`Progreso: ${progressPercentage}%`, 20, startY + 75);
        doc.text(`Discrepancias encontradas: ${discrepancies}`, 20, startY + 85);

        // Tabla de discrepancias
        if (discrepancyData.length > 0) {
            doc.setFontSize(16);
            doc.text('Detalle de Discrepancias', 20, startY + 105);

            try {
                doc.autoTable({
                    startY: startY + 110,
                    head: [['Código', 'Producto', 'Teórico', 'Físico', 'Diferencia']],
                    body: discrepancyData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [44, 62, 80],
                        textColor: 255,
                        fontStyle: 'bold'
                    },
                    styles: { 
                        fontSize: 10, 
                        cellPadding: 3,
                        overflow: 'linebreak'
                    },
                    columnStyles: {
                        0: { cellWidth: 25 },
                        1: { cellWidth: 60 },
                        2: { cellWidth: 20 },
                        3: { cellWidth: 20 },
                        4: { cellWidth: 25 }
                    },
                    margin: { top: 10 }
                });
            } catch (e) {
                console.error("Error al generar tabla:", e);
                // Generar tabla manualmente si autoTable falla
                this.generateManualTable(doc, discrepancyData, startY + 110);
            }
        } else {
            doc.setFontSize(14);
            doc.text('No se encontraron discrepancias en el inventario.', 20, startY + 105);
        }

        // Guardar el PDF
        try {
            doc.save(`Informe_Inventario_${date.replace(/-/g, '') || 'sin_fecha'}.pdf`);
        } catch (e) {
            console.error("Error al guardar PDF:", e);
            alert('Error al generar el PDF. Por favor, intente nuevamente.');
            return;
        }

        // Guardar en el historial
        InventoryHistory.add({
            date,
            store,
            responsible,
            totalProducts,
            scannedProducts,
            discrepancies,
            timestamp: new Date().toISOString()
        });
    },

    generateManualTable: function(doc, data, startY) {
        // Implementación simple de tabla manual si autoTable falla
        doc.setFontSize(10);
        let y = startY;
        
        // Encabezados
        doc.setFillColor(44, 62, 80);
        doc.setTextColor(255, 255, 255);
        doc.rect(20, y, 170, 8, 'F');
        doc.text('Código', 22, y + 6);
        doc.text('Producto', 50, y + 6);
        doc.text('Teórico', 120, y + 6);
        doc.text('Físico', 140, y + 6);
        doc.text('Diferencia', 160, y + 6);
        
        y += 10;
        doc.setTextColor(0, 0, 0);
        
        // Datos
        data.forEach(row => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            
            doc.text(row[0], 22, y);
            doc.text(row[1].substring(0, 30), 50, y); // Limitar longitud
            doc.text(row[2], 120, y);
            doc.text(row[3], 140, y);
            doc.text(row[4], 160, y);
            y += 6;
        });
    }
};