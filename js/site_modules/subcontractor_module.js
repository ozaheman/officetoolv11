export const SubcontractorModule = {
    init: (domElements, context) => {
        if(domElements.addBtn) {
            domElements.addBtn.addEventListener('click', () => SubcontractorModule.handleAdd(context));
        }
    },

    render: async (jobNo, container) => {
        if(!jobNo || !container) return;
        
        const siteData = await window.DB.getSiteData(jobNo);
        const subs = siteData.subcontractors || [];
        
        if(subs.length === 0) {
            container.innerHTML = '<p>No subcontractors added yet.</p>';
            return;
        }

        let html = '<table class="mom-table"><thead><tr><th>Trade</th><th>Company</th><th>Contact</th><th>Phone</th><th>Status</th></tr></thead><tbody>';
        subs.forEach(sub => {
            html += `<tr>
                <td>${sub.trade}</td>
                <td>${sub.company}</td>
                <td>${sub.contact}</td>
                <td>${sub.phone}</td>
                <td><span class="badge success">Approved</span></td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    handleAdd: async (context) => {
        const { currentJobNo } = context.getState();
        if(!currentJobNo) return;

        const trade = prompt("Subcontractor Trade (e.g., MEP, Joinery):");
        if(!trade) return;
        const company = prompt("Company Name:");

        const siteData = await window.DB.getSiteData(currentJobNo);
        if(!siteData.subcontractors) siteData.subcontractors = [];
        
        siteData.subcontractors.push({
            id: Date.now(),
            trade,
            company,
            contact: 'TBD',
            phone: 'TBD',
            status: 'Approved'
        });

        await window.DB.putSiteData(siteData);
        if(context.onUpdate) context.onUpdate('subcontractors');
    }
};