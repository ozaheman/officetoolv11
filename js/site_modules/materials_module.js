// --- START OF FILE materials_module.js ---

export const MaterialsModule = {
    init: (domElements, context) => {
        const newMaterialBtn = document.getElementById('new-material-submittal-btn');
        if (newMaterialBtn) {
            newMaterialBtn.addEventListener('click', () => MaterialsModule.handleCreate(context));
        }
        
        const container = document.getElementById('material-approval-list');
        if (container) {
             container.addEventListener('click', (e) => {
                const approvalBtn = e.target.closest('.approval-action-btn');
                if (approvalBtn) {
                    MaterialsModule.handleApprovalClick(approvalBtn, context);
                }
             });
        }
    },

    render: async (jobNo) => {
        const targetContainer = document.getElementById('material-approval-list'); 
        if (!jobNo || !targetContainer) return;
        
        targetContainer.innerHTML = '';
        
        const siteData = await window.DB.getSiteData(jobNo);
        const mats = siteData.materialLog || [];

        if (mats.length === 0) {
            targetContainer.innerHTML = '<p>No material submittals tracked.</p>';
            return;
        }

        mats.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(mat => {
            let headerColor = '#ffc107'; // Yellow
            if(mat.status === 'Approved') headerColor = '#28a745'; // Green
            else if(mat.status === 'Rejected' || mat.status === 'Not Approved') headerColor = '#dc3545'; // Red
            else if(mat.status === 'Revise & Resubmit') headerColor = '#007bff'; // Blue
            else if(mat.status === 'Closed') headerColor = '#6c757d'; // Grey

            const div = document.createElement('div');
            div.className = 'detailed-log-item';
            
            const genApprovalControls = (role, existingData, allRequired) => {
                if (!allRequired.includes(role)) return '';
                if (existingData) {
                     let btnClass = 'btn-pending';
                    if(existingData.status === 'Approved') btnClass = 'btn-approved';
                    else if(existingData.status === 'Approved as Noted') btnClass = 'btn-approved-noted';
                    else if(existingData.status === 'Revise & Resubmit') btnClass = 'btn-revise';
                    else if(existingData.status === 'Rejected' || existingData.status === 'Not Approved') btnClass = 'btn-rejected';
                    return `<button class="secondary-button small-button ${btnClass}" disabled>${existingData.status} by ${existingData.user}</button>`;
                } else {
                     return `
                        <div class="dropdown">
                            <button class="secondary-button small-button btn-pending">Review (${role})</button>
                            <div class="dropdown-content">
                                <a href="#" class="approval-action-btn" data-id="${mat.id}" data-role="${role}" data-type="material" data-status="Approved">Approve</a>
                                <a href="#" class="approval-action-btn" data-id="${mat.id}" data-role="${role}" data-type="material" data-status="Approved as Noted">Approve as Noted</a>
                                <a href="#" class="approval-action-btn" data-id="${mat.id}" data-role="${role}" data-type="material" data-status="Revise & Resubmit">Revise & Resubmit</a>
                                <a href="#" class="approval-action-btn" data-id="${mat.id}" data-role="${role}" data-type="material" data-status="Rejected">Reject</a>
                            </div>
                        </div>`;
                }
            };

            const apps = mat.approvals || {};
            const requiredApps = mat.requiredApprovals || ['Arch', 'Site Eng'];

            div.innerHTML = `
                <div class="log-header" style="border-left: 5px solid ${headerColor}">
                    <span>${mat.ref} : ${mat.item}</span>
                    <span>Status: ${mat.status} | Submitted: ${mat.date || ''}</span>
                </div>
                <div class="log-body">
                    <div style="margin-bottom:10px;"><strong>Supplier/Manufacturer:</strong> ${mat.supplier}</div><hr>
                    <strong>Approvals:</strong>
                    <div class="approval-grid">
                        ${genApprovalControls('Arch', apps.Arch, requiredApps)}
                        ${genApprovalControls('STR', apps.STR, requiredApps)}
                        ${genApprovalControls('MEP', apps.MEP, requiredApps)}
                        ${genApprovalControls('Site Eng', apps['Site Eng'], requiredApps)}
                    </div>
                </div>
            `;
            targetContainer.appendChild(div);
        });
    },

    handleApprovalClick: async (btn, context) => {
        const id = btn.dataset.id;
        const role = btn.dataset.role;
        const selectedStatus = btn.dataset.status;
        const { currentJobNo, currentUserRole } = context.getState();
        
        const password = prompt(`Enter Password for ${role} to confirm status '${selectedStatus}':`);
        if (!password) return;

        const isAuthenticated = await window.verifyAccess(currentJobNo, role, password);
        if (!isAuthenticated) {
            return alert("Invalid Password. Action canceled.");
        }

        const comment = prompt("Add a comment (optional):");
        const siteData = await window.DB.getSiteData(currentJobNo);
        const item = siteData.materialLog.find(m => m.id === id);
        
        if(item) {
            if(!item.approvals) item.approvals = {};
            item.approvals[role] = { user: currentUserRole, date: new Date().toISOString(), status: selectedStatus, comment: comment || '' };

            const required = item.requiredApprovals || [];
            const approvedCount = required.filter(r => item.approvals[r]?.status.startsWith('Approved')).length;
            const rejected = required.some(r => item.approvals[r]?.status === 'Rejected');
            
            if (rejected) { item.status = 'Rejected'; }
            else if (approvedCount === required.length) { item.status = 'Approved'; }
            else { item.status = 'Response Pending'; }

            await window.DB.putSiteData(siteData);
            MaterialsModule.render(currentJobNo); // Use its own render method
        }
    },
    
    handleCreate: async (context) => {
        const { currentJobNo } = context.getState();
        if (!currentJobNo) return alert("Please select a project first.");
        
        const item = prompt("Enter Material/Item Name:");
        if (!item) return;
        const supplier = prompt("Enter Supplier/Manufacturer Name:");
        
        const siteData = await window.DB.getSiteData(currentJobNo);
        if (!siteData.materialLog) siteData.materialLog = [];
        
        const newId = `MAT-${Date.now()}`;
        const newRef = `MS-${String(siteData.materialLog.length + 1).padStart(3, '0')}`;
        
        siteData.materialLog.push({
            id: newId, ref: newRef, item: item, supplier: supplier || 'N/A',
            date: new Date().toISOString().split('T')[0], status: 'Submitted',
            requiredApprovals: ['Arch', 'Site Eng'], approvals: {}
        });
        
        await window.DB.putSiteData(siteData);

        await window.DB.createScrumTaskFromSiteEvent(currentJobNo, {
            name: `Review Material: ${newRef} - ${item}`, department: 'Architectural',
            plannedDuration: 7, status: 'To Do'
        });

        alert(`Material Submittal ${newRef} has been logged and a review task has been created in the Design Center.`);
        MaterialsModule.render(currentJobNo);
    }
};