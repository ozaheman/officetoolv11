// --- START OF FILE rfi_module.js ---

export const RfiModule = {
    // A temporary store for new file attachments before saving
    tempFiles: [],
    DOMElements: {},
    init: (domElements, context) => {
        RfiModule.DOMElements = domElements; // Store the passed-in elements
        
        if (RfiModule.DOMElements.newRfiBtn) {
            RfiModule.DOMElements.newRfiBtn.addEventListener('click', () => RfiModule.openModal(null, context, 'new'));
        }
        
        const container = document.getElementById('rfi-log-list');
        if(container) {
             container.addEventListener('click', (e) => {
                const approvalBtn = e.target.closest('.approval-action-btn');
                const logHeader = e.target.closest('.log-header');

                if (approvalBtn) {
                    RfiModule.handleApprovalClick(approvalBtn, context);
                } else if (logHeader) {
                    const rfiId = logHeader.dataset.rfiId;
                    if (rfiId) {
                        RfiModule.openModal(rfiId, context, 'view');
                    }
                }
             });
        }

        if (RfiModule.DOMElements.modal) {
            RfiModule.DOMElements.closeBtn?.addEventListener('click', () => RfiModule.DOMElements.modal.style.display = 'none');
            RfiModule.DOMElements.saveBtn?.addEventListener('click', () => RfiModule.saveRfi(context));
            RfiModule.DOMElements.fileAttach?.addEventListener('change', RfiModule.handleFileSelection);
        }
    },

    render: async (jobNo, tbody, role) => {
        const container = document.getElementById('rfi-log-list');
        if (!jobNo || !container) return;
        container.innerHTML = '';
        
        const siteData = await window.DB.getSiteData(jobNo);
        const rfis = siteData.rfiLog || [];

        if (rfis.length === 0) {
            container.innerHTML = '<p>No RFIs logged.</p>';
            return;
        }

        for (const rfi of rfis.sort((a, b) => (a.date < b.date) ? 1 : -1)) {
            let headerColor = '#ffc107'; // Yellow for Submitted/Pending
            if(rfi.status === 'Approved') headerColor = '#28a745';
            else if(rfi.status === 'Rejected' || rfi.status === 'Not Approved') headerColor = '#dc3545';
            else if(rfi.status === 'Closed') headerColor = '#6c757d';

            const div = document.createElement('div');
            div.className = 'detailed-log-item';
            
            // New dropdown-style approval buttons
            // FIX: Standardize role keys to lowercase for logic, but keep display text.
            const genApprovalControls = (displayRole, logicalRole, approverData, allApprovers) => {
                if (!allApprovers.includes(displayRole)) return ''; // Check against the original display role
                
                if (approverData) {
                    let btnClass = 'btn-pending';
                    if(approverData.status === 'Approved') btnClass = 'btn-approved';
                    else if(approverData.status === 'Approved as Noted') btnClass = 'btn-approved-noted';
                    else if(approverData.status === 'Revise & Resubmit') btnClass = 'btn-revise';
                    else if(approverData.status === 'Rejected') btnClass = 'btn-rejected';
                    return `<button class="secondary-button small-button ${btnClass}" disabled title="${approverData.comment || 'No comment'}">${approverData.status} by ${approverData.user}</button>`;
                } else {
                    return `
                        <div class="dropdown">
                            <button class="secondary-button small-button btn-pending">Review (${displayRole})</button>
                            <div class="dropdown-content">
                                <a href="#" class="approval-action-btn" data-id="${rfi.id}" data-role="${logicalRole}" data-status="Approved">Approve</a>
                                <a href="#" class="approval-action-btn" data-id="${rfi.id}" data-role="${logicalRole}" data-status="Approved as Noted">Approve as Noted</a>
                                <a href="#" class="approval-action-btn" data-id="${rfi.id}" data-role="${logicalRole}" data-status="Revise & Resubmit">Revise & Resubmit</a>
                                <a href="#" class="approval-action-btn" data-id="${rfi.id}" data-role="${logicalRole}" data-status="Rejected">Reject</a>
                            </div>
                        </div>`;
                }
            };

            const apps = rfi.approvals || {};
            const requiredApps = rfi.requiredApprovals || [];

            let attachmentsHtml = 'No attachments.';
            if (rfi.attachments && rfi.attachments.length > 0) {
                const fileLinks = await Promise.all(rfi.attachments.map(async (att) => {
                    const file = await window.DB.getFileById(att.id);
                    if (file) {
                        return `<li><a href="${file.dataUrl}" target="_blank" download="${file.name}">${file.name}</a></li>`;
                    }
                    return `<li>${att.name} (file not found)</li>`;
                }));
                attachmentsHtml = `<ul>${fileLinks.join('')}</ul>`;
            }

            div.innerHTML = `
                <div class="log-header" style="border-left: 5px solid ${headerColor}; cursor:pointer;" data-rfi-id="${rfi.id}">
                    <span>${rfi.refNo} : ${rfi.subject}</span>
                    <span>Status: ${rfi.status} | Raised: ${rfi.date}</span>
                </div>
                <div class="log-body">
                    <p><strong>Response:</strong> ${rfi.response || '<i>Awaiting response...</i>'}</p>
                    <div style="margin-bottom:10px;">
                        <strong>Attachments:</strong> ${attachmentsHtml}
                    </div>
                    <hr>
                    <strong>Approvals:</strong>
                    <div class="approval-grid">
                        ${genApprovalControls('Arch','arch', apps.Arch, requiredApps)}
                        ${genApprovalControls('STR','str', apps.str, requiredApps)}
                        ${genApprovalControls('MEP', 'mep',apps.mep, requiredApps)}
                        ${genApprovalControls('Site Eng', 'site',apps.site, requiredApps)}
                    </div>
                </div>
            `;
            container.appendChild(div);
        }
    },

    handleApprovalClick: async (btn, context) => {
        const id = btn.dataset.id;
        const role = btn.dataset.role;
        const selectedStatus = btn.dataset.status;
        const { currentJobNo, currentUserRole } = context.getState();

        const password = prompt(`Enter Password for ${role.toUpperCase()} to confirm status '${selectedStatus}':`);
        if (!password) return;
        
        // Using a new, more robust verification function
        const isAuthenticated = await window.verifyAccess(currentJobNo, role, password);
        if (!isAuthenticated) {
            return alert("Invalid Password. Action canceled.");
        }

        const comment = prompt("Add a comment (optional):");
        const siteData = await window.DB.getSiteData(currentJobNo);
        const item = siteData.rfiLog.find(r => r.id === id);
        
        if(item) {
            if(!item.approvals) item.approvals = {};
            // FIX: Use the lowercase role as the key
            item.approvals[role] = { user: currentUserRole, date: new Date().toISOString(), status: selectedStatus, comment: comment || '' };
            // Check against the original display roles stored in requiredApprovals
            const requiredDisplayRoles = item.requiredApprovals || [];
            const roleMap = { arch: 'Arch', str: 'STR', mep: 'MEP', site: 'Site Eng' };
            
            const approvedCount = requiredDisplayRoles.filter(displayRole => {
                const logicalRole = Object.keys(roleMap).find(key => roleMap[key] === displayRole);
                return item.approvals[logicalRole]?.status.startsWith('Approved');
            }).length;

            const rejected = requiredDisplayRoles.some(displayRole => {
                const logicalRole = Object.keys(roleMap).find(key => roleMap[key] === displayRole);
                return item.approvals[logicalRole]?.status === 'Rejected';
            });
            
            if (rejected) { item.status = 'Rejected'; }
            else if (approvedCount === requiredDisplayRoles.length) { item.status = 'Approved'; }
            else { item.status = 'Response Pending'; }
            
            item.response = Object.entries(item.approvals).map(([key, val]) => `${roleMap[key] || key} (${val.status}): ${val.comment || 'No comment.'}`).join('<br>');
            await window.DB.putSiteData(siteData);
            context.onUpdate('rfi');
        }
    },
    
    openModal: async (rfiId = null, context, mode = 'new') => {
        const { currentJobNo } = context.getState();
        if (!currentJobNo) return alert("Please select a project first.");

        RfiModule.tempFiles = [];
        const D = RfiModule.DOMElements;
        
        // Reset and configure modal based on mode
        D.subject.readOnly = (mode === 'view');
        D.description.readOnly = (mode === 'view');
        D.responseComments.readOnly = (mode !== 'view'); // Editable in view/reply mode
        D.fileAttach.style.display = (mode === 'new' || mode === 'edit') ? 'block' : 'none';
        D.saveBtn.style.display = (mode === 'view') ? 'none' : 'block';
        D.saveBtn.textContent = (mode === 'new') ? 'Save RFI' : 'Submit Response';
        
        D.editId.value = rfiId || '';
        D.newAttachmentsList.innerHTML = '';

        if (mode === 'view' && rfiId) {
            const siteData = await window.DB.getSiteData(currentJobNo);
            const rfi = siteData.rfiLog.find(r => r.id === rfiId);
            if (!rfi) return;
            
            D.title.textContent = `View RFI: ${rfi.refNo}`;
            D.refNo.value = rfi.refNo;
            D.subject.value = rfi.subject;
            D.description.value = rfi.description;
            D.responseComments.value = rfi.response || '';
            D.approversGroup.querySelectorAll('input').forEach(cb => {
                cb.checked = (rfi.requiredApprovals || []).includes(cb.value);
                cb.disabled = true;
            });
            
            let attachmentsHtml = 'No attachments.';
            if (rfi.attachments && rfi.attachments.length > 0) {
                const fileLinks = await Promise.all(rfi.attachments.map(async (att) => {
                    const file = await window.DB.getFileById(att.id);
                    return file ? `<li><a href="${file.dataUrl}" target="_blank" download="${file.name}">${file.name}</a></li>` : `<li>${att.name} (file not found)</li>`;
                }));
                attachmentsHtml = `<ul>${fileLinks.join('')}</ul>`;
            }
            D.newAttachmentsList.innerHTML = attachmentsHtml;

        } else { // New or Edit Mode
            D.title.textContent = "Raise New Request for Information (RFI)";
            D.subject.value = '';
            D.description.value = '';
            D.responseComments.value = '';
            D.approversGroup.querySelectorAll('input').forEach(cb => { cb.checked = false; cb.disabled = false; });
            const siteData = await window.DB.getSiteData(currentJobNo);
            const refNo = `RFI-${String((siteData.rfiLog || []).length + 1).padStart(3, '0')}`;
            D.refNo.value = refNo;
        }

        const masterFiles = await window.DB.getFiles(currentJobNo, 'master');
        D.docLinkSelect.innerHTML = masterFiles.map(f => `<option value="${f.id}">${f.name}</option>`).join('');

        D.modal.style.display = 'flex';
    },

    handleFileSelection: (event) => {
        const D = RfiModule.DOMElements;
        RfiModule.tempFiles.push(...Array.from(event.target.files));
        D.newAttachmentsList.innerHTML = RfiModule.tempFiles.map(f => `<li>${f.name}</li>`).join('');
    },

    saveRfi: async (context) => {
        const { currentJobNo, currentUserRole } = context.getState();
        const D = RfiModule.DOMElements;
        
        if(D.editId.value) { // This is an update/reply, not a new RFI
            const siteData = await window.DB.getSiteData(currentJobNo);
            const rfi = siteData.rfiLog.find(r => r.id === D.editId.value);
            if(rfi) {
                rfi.response = D.responseComments.value;
                await window.DB.putSiteData(siteData);
                alert("RFI Response Updated.");
                D.modal.style.display = 'none';
                context.onUpdate('rfi');
            }
            return;
        }

        const subject = D.subject.value;
        if (!subject) return alert("Subject is required.");

        const siteData = await window.DB.getSiteData(currentJobNo);
        if (!siteData.rfiLog) siteData.rfiLog = [];
        
        const attachments = [];
        for (const file of RfiModule.tempFiles) {
            const dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            const fileRecord = { jobNo: currentJobNo, source: 'site', type: 'rfi_attachment', name: file.name, fileType: file.type, dataUrl: dataUrl, timestamp: new Date().toISOString() };
            const newFileId = await window.DB.addFile(fileRecord);
            attachments.push({ id: newFileId, name: file.name });
        }
        const selectedDocs = Array.from(D.docLinkSelect.selectedOptions);
        for (const opt of selectedDocs) {
            attachments.push({ id: parseInt(opt.value), name: opt.textContent });
        }

        const requiredApprovals = Array.from(D.approversGroup.querySelectorAll('input:checked')).map(cb => cb.value);
        if (requiredApprovals.length === 0) { return alert("At least one approving department must be selected."); }

        const newRfi = {
            id: `RFI-${Date.now()}`, refNo: D.refNo.value, subject: subject, description: D.description.value,
            raisedBy: currentUserRole, date: new Date().toISOString().split('T')[0], status: 'Submitted',
            attachments: attachments, requiredApprovals: requiredApprovals, approvals: {}, response: ''
        };

        siteData.rfiLog.push(newRfi);
        await window.DB.putSiteData(siteData);
        
        const deptMap = { 'Arch': 'Architectural', 'STR': 'Structural', 'MEP': 'MEP', 'Site Eng': 'Site' };

        for (const approvalRole of requiredApprovals) {
            await window.DB.createScrumTaskFromSiteEvent(currentJobNo, {
                name: `${deptMap[approvalRole] || approvalRole} Review for RFI: ${newRfi.refNo}`,
                department: deptMap[approvalRole] || 'Manager',
                plannedDuration: 5,
                status: 'To Do',
                relatedRfiId: newRfi.id // Link Scrum task to RFI
            });
        }

        alert(`RFI ${newRfi.refNo} raised. ${requiredApprovals.length} review task(s) created in the Design Center.`);
        D.modal.style.display = 'none';
        context.onUpdate('rfi');
    }
};