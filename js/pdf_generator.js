/* START OF FILE js/pdf_generator.js */

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
}

/**
 * @module PDFGenerator
 * Accessible globally via window.PDFGenerator
 */
window.PDFGenerator = (() => {

    /**
     * The primary PDF generation function.
     */
    const generate = async ({ previewId, projectJobNo, pageSize = 'a4_portrait', fileName: customFileName, watermarkData }) => {
        if (!previewId) {
            console.error("PDF Generation Error: 'previewId' is missing.");
            alert("Could not generate PDF: No content source was specified.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const sourceElement = document.getElementById(previewId);
        
        let logoElementToHide = null;
        let footerElementToHide = null;

        if (!sourceElement) {
            console.error(`PDF generation error: Source element with ID '${previewId}' could not be found.`);
            alert(`Could not find content to generate PDF. Check console for details.`);
            return;
        }

        alert('Generating PDF... This may take a moment.');
        
        try {
            // Hide existing visual headers/footers in the HTML to replace with clean PDF ones
            logoElementToHide = sourceElement.querySelector('.preview-header-image');
            footerElementToHide = sourceElement.querySelector('.preview-footer');
            if (logoElementToHide) logoElementToHide.style.display = 'none';
            if (footerElementToHide) footerElementToHide.style.display = 'none';

            // Parse page size
            const [format, orientation] = pageSize.toLowerCase().split('_');
            
            // Create jsPDF instance
            const doc = new jsPDF({ 
                orientation: orientation === 'landscape' ? 'l' : 'p', 
                unit: 'mm', 
                format: format 
            });

            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
            const TOP_MARGIN = 20;
            const BOTTOM_MARGIN = 20;
            const SIDE_MARGIN = 10;
            
            // Determine content width for scaling
            const CONTENT_WIDTH = PAGE_WIDTH - (SIDE_MARGIN * 2);

            // Watermark setup
            const watermarkGState = new doc.GState({ opacity: 0.08 });
            const textWatermarkGState = new doc.GState({ opacity: 0.05 });
            const normalGState = new doc.GState({ opacity: 1.0 });

            // Ensure constants exist (loaded from constants.js/logo_base64.js)
            const wmImg = (typeof WM_BASE64 !== 'undefined') ? WM_BASE64 : '';
            const logoImg = (typeof LOGO_BASE64 !== 'undefined') ? LOGO_BASE64 : '';

            const addHeaderFooterWatermark = () => {
                const pageCount = doc.internal.getNumberOfPages();
                
                let watermarkTexts = [];
                if (typeof watermarkData === 'string' && watermarkData) {
                    watermarkTexts = [watermarkData];
                } else if (Array.isArray(watermarkData) && watermarkData.length > 0) {
                    watermarkTexts = watermarkData;
                }

                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);

                    // 1. Image Watermark (Center Logo)
                    if (wmImg) {
                        doc.setGState(watermarkGState);
                        const wmScale = format === 'a3' ? 0.5 : 1; 
                        const watermarkImgWidth = (PAGE_WIDTH - 40) * wmScale;
                        const watermarkImgHeight = watermarkImgWidth * 1; // Square aspect
                        doc.addImage(wmImg, 'PNG', (PAGE_WIDTH - watermarkImgWidth)/2, (PAGE_HEIGHT - watermarkImgHeight) / 2, watermarkImgWidth, watermarkImgHeight);
                        doc.setGState(normalGState);
                    }
                    
                    // 2. Text Grid Watermark (Optional)
                    if (watermarkTexts.length > 0) {
                        doc.saveGraphicsState();
                        doc.setGState(textWatermarkGState);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(format === 'a3' ? 42 : 32);
                        doc.setTextColor(150, 150, 150);
                        let textIndex = 0;
                        for (let y = 20; y < PAGE_HEIGHT; y += 80) {
                            for (let x = 20; x < PAGE_WIDTH; x += 120) {
                                const currentWatermark = watermarkTexts[textIndex % watermarkTexts.length];
                                doc.text(currentWatermark, x, y, { angle: -45, align: 'center' });
                                textIndex++;
                            }
                        }
                        doc.restoreGraphicsState();
                    }

                    // 3. Header Logo
                    if (logoImg) {
                        const headerImgWidth = PAGE_WIDTH - (SIDE_MARGIN * 2);
                        // Maintain aspect ratio of logo bar (approx 15.72 height for 183 width)
                        const headerImgHeight = headerImgWidth * (15.72 / 183.17); 
                        doc.addImage(logoImg, 'PNG', SIDE_MARGIN, 8, headerImgWidth, headerImgHeight);
                    }
                    
                    // 4. Page Number
                    doc.setFontSize(9);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - SIDE_MARGIN - 10, PAGE_HEIGHT - 10);
                    doc.setTextColor(0, 0, 0);

                    // 5. Footer Line & Text
                    doc.setLineWidth(0.2);
                    doc.line(SIDE_MARGIN, PAGE_HEIGHT - BOTTOM_MARGIN, PAGE_WIDTH - SIDE_MARGIN, PAGE_HEIGHT - BOTTOM_MARGIN);
                    doc.setFontSize(8);
                    const footerText1 = "E-mail: Info@urban-Axis@com";
                    const footerText2 = "Website: www.urban-axis.com";
                    doc.text(footerText1, PAGE_WIDTH / 2, PAGE_HEIGHT - 15, { align: 'center' });
                    doc.text(footerText2, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' });
                }
            };

            const originalOverflow = sourceElement.style.overflow;
            const originalWidth = sourceElement.style.width;
            
            sourceElement.style.overflow = 'visible';
            sourceElement.style.width = 'fit-content'; 

            await doc.html(sourceElement, {
                callback: function (doc) {
                    sourceElement.style.overflow = originalOverflow;
                    sourceElement.style.width = originalWidth;

                    addHeaderFooterWatermark();
                    const fileName = customFileName ? `${customFileName}.pdf` : `${(projectJobNo || 'document').replace(/[\\/]/g, '-')}_${previewId || 'preview'}.pdf`;
                    doc.save(fileName);
                },
                margin: [TOP_MARGIN + 15, SIDE_MARGIN, BOTTOM_MARGIN, SIDE_MARGIN], 
                autoPaging: 'text', 
                width: CONTENT_WIDTH,
                windowWidth: sourceElement.scrollWidth 
            });

        } catch (e) {
            console.error("PDF Generation Failed:", e);
            alert("Error generating PDF. Please try again.");
        } finally {
            if (logoElementToHide) logoElementToHide.style.display = 'block';
            if (footerElementToHide) footerElementToHide.style.display = 'block';
        }
    };

    /**
     * Renders the first page of a PDF from a dataUrl onto a canvas element.
     */
    const renderPdfThumbnail = (canvas, dataUrl) => {
        try {
            const base64Data = atob(dataUrl.substring(dataUrl.indexOf(',') + 1));
            pdfjsLib.getDocument({ data: base64Data }).promise.then(pdf => pdf.getPage(1))
            .then(page => {
                const desiredWidth = canvas.clientWidth;
                const viewport = page.getViewport({ scale: 1 });
                const scale = desiredWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale: scale });

                const context = canvas.getContext('2d');
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                page.render({ canvasContext: context, viewport: scaledViewport });
            }).catch(err => { 
                console.error('Error rendering PDF thumbnail:', err);
                const fallbackIcon = document.createElement('div');
                fallbackIcon.className = 'file-icon';
                fallbackIcon.textContent = 'PDF';
                canvas.parentNode.replaceChild(fallbackIcon, canvas);
            });
        } catch(e) {
             console.error('Error decoding base64 data for PDF thumbnail:', e);
        }
    };

    return {
        generate,
        renderPdfThumbnail
    };

})();