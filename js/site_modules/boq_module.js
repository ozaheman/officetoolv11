export const BoqModule = {
    init: (domElements, context) => {
        // Event listener for adding items
        if(domElements.addBtn) {
            domElements.addBtn.addEventListener('click', () => BoqModule.handleAddItem(context));
        }
        // Event listener for generating payment certificate
        if(domElements.certBtn) {
            domElements.certBtn.addEventListener('click', () => BoqModule.handleGenerateCertificate(context, domElements));
        }
        // Delegation for table edits/deletes
        if(domElements.tableBody) {
            domElements.tableBody.addEventListener('blur', (e) => BoqModule.handleEdit(e, context), true);
            domElements.tableBody.addEventListener('click', (e) => BoqModule.handleClick(e, context));
        }
    },

    render: async (jobNo, domElements) => {
        if (!jobNo || !domElements.tableBody) return;
        domElements.tableBody.innerHTML = '';
        
        // Use window.DB if not using strict ES imports for DB
        const siteData = await window.DB.getSiteData(jobNo);
        const boq = siteData.boq || [];

        boq.forEach((item, index) => {
            const amount = (item.qty || 0) * (item.rate || 0);
            const totalDonePerc = (item.prev_perc || 0) + (item.curr_perc || 0);
            const workDoneValue = amount * (totalDonePerc / 100);
            
            const row = domElements.tableBody.insertRow();
            row.dataset.index = index;
            row.innerHTML = `
                <td contenteditable="true" data-field="id">${item.id || ''}</td>
                <td contenteditable="true" data-field="description">${item.description}</td>
                <td contenteditable="true" data-field="unit">${item.unit}</td>
                <td contenteditable="true" data-field="qty" class="editable-cell">${item.qty || 0}</td>
                <td contenteditable="true" data-field="rate" class="editable-cell">${(item.rate || 0).toFixed(2)}</td>
                <td class="boq-amount" contenteditable="false">${amount.toFixed(2)}</td>
                <td contenteditable="false">${item.prev_perc || 0}%</td>
                <td contenteditable="true" data-field="curr_perc" class="editable-cell">${item.curr_perc || 0}</td>
                <td class="boq-total-perc" contenteditable="false">${totalDonePerc.toFixed(0)}%</td>
                <td class="boq-work-done-value" contenteditable="false">${workDoneValue.toFixed(2)}</td>
                <td><button class="delete-boq-item-btn small-button danger-button">✕</button></td>
            `;
        });
        await BoqModule.updateTotals(jobNo, domElements);
    },

    updateTotals: async (jobNo, domElements) => {
        const siteData = await window.DB.getSiteData(jobNo);
        if (!siteData || !siteData.boq) return;
        
        const boq = siteData.boq;
        const totalValue = boq.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);
        const totalWorkDoneValue = boq.reduce((sum, item) => {
            const amount = (item.qty || 0) * (item.rate || 0);
            const totalPerc = (item.prev_perc || 0) + (item.curr_perc || 0);
            return sum + (amount * (totalPerc / 100));
        }, 0);
        
        const overallProgress = totalValue > 0 ? Math.round((totalWorkDoneValue / totalValue) * 100) : 0;

        if(domElements.totalValueDisplay) domElements.totalValueDisplay.textContent = `${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`;
        if(domElements.workDoneDisplay) domElements.workDoneDisplay.textContent = `${totalWorkDoneValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`;
        if(domElements.progressDisplay) domElements.progressDisplay.textContent = `${overallProgress}%`;
        if(domElements.progressBar) {
            domElements.progressBar.style.width = `${overallProgress}%`;
            domElements.progressBar.textContent = `${overallProgress}%`;
        }

        // Save progress to main site object if changed
        if (siteData.progress !== overallProgress) {
            siteData.progress = overallProgress;
            await window.DB.putSiteData(siteData);
        }
    },

    handleAddItem: async (context) => {
        const { currentJobNo } = context.getState();
        if(!currentJobNo) return;
        
        const siteData = await window.DB.getSiteData(currentJobNo);
        siteData.boq.push({ id: "V.O.", description: "New Item", unit: "", qty: 0, rate: 0, prev_perc: 0, curr_perc: 0 });
        await window.DB.putSiteData(siteData);
        if(context.onUpdate) context.onUpdate('boq');
    },

    handleClick: async (e, context) => {
        if (e.target.matches('.delete-boq-item-btn')) {
            const { currentJobNo } = context.getState();
            const index = parseInt(e.target.closest('tr').dataset.index);
            const siteData = await window.DB.getSiteData(currentJobNo);
            
            if (confirm(`Delete item: ${siteData.boq[index].description}?`)) {
                siteData.boq.splice(index, 1);
                await window.DB.putSiteData(siteData);
                if(context.onUpdate) context.onUpdate('boq');
            }
        }
    },

    handleEdit: async (e, context) => {
        const target = e.target;
        if (!target.hasAttribute('contenteditable')) return;
        
        const { currentJobNo } = context.getState();
        const row = target.closest('tr');
        const index = parseInt(row.dataset.index);
        const field = target.dataset.field;
        let value = target.textContent;

        const siteData = await window.DB.getSiteData(currentJobNo);
        const item = siteData.boq[index];

        if (['qty', 'rate', 'curr_perc'].includes(field)) {
            let numValue = parseFloat(value) || 0;
            if (field === 'curr_perc') {
                const prevPerc = item.prev_perc || 0;
                if (numValue < 0) numValue = 0;
                if (numValue > (100 - prevPerc)) numValue = 100 - prevPerc;
                target.textContent = numValue; // Correct UI immediately
            }
            item[field] = numValue;
        } else {
            item[field] = value;
        }

        await window.DB.putSiteData(siteData);
        // We call render or just update totals to keep UI responsive without full re-render
        // For simplicity, re-render logic via context or specific update
        if(context.onUpdate) context.onUpdate('boq'); 
    },

    handleGenerateCertificate: async (context, domElements) => {
        const { currentJobNo } = context.getState();
        if(!currentJobNo) return;
        alert("Payment Certificate generation logic would go here (using PDFGenerator).");
    }
};