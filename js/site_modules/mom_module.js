// import { DB } from '../database.js';
// Note: Assuming window.DB and window.getProjectSchedule (from schedule_module) are available globally or passed via context if strictly modular.

export const MomModule = {
    // ... [renderList and renderTaskFollowUp remain unchanged] ...
    renderList: async (jobNo, containerElement) => {
        containerElement.innerHTML = '';
        if (!jobNo) return;
        
        const siteData = await DB.getSiteData(jobNo);
        if (!siteData.mom || siteData.mom.length === 0) {
            containerElement.innerHTML = '<p>No MoM recorded.</p>';
            return;
        }

        let html = '<ul class="mom-history-list">';
        const sortedMom = [...siteData.mom].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedMom.forEach((mom) => {
            const originalIndex = siteData.mom.indexOf(mom);
            html += `
                <li class="mom-list-item">
                    <span class="mom-list-info">
                        <strong>${new Date(mom.date).toLocaleDateString()} (Ref: ${mom.ref || 'N/A'}) - ${mom.progress || 0}%</strong>
                        <br>
                        <small>${(mom.summary || '').substring(0, 80)}...</small>
                    </span>
                    <button class="secondary-button small-button preview-mom-btn" data-index="${originalIndex}" data-job-no="${jobNo}">View</button>
                </li>`;
        });
        html += '</ul>';
        containerElement.innerHTML = html;
    },

    // ... [renderTaskFollowUp remains unchanged] ...
    renderTaskFollowUp: async (jobNo, containerElement) => {
        /* ... existing code ... */
        if (!jobNo || !containerElement) return;
        const siteData = await DB.getSiteData(jobNo);
        let html = '<h5 style="margin-top: 10px;">Action Item Follow-up</h5>';
        let tasksFound = false;
        (siteData.mom || []).forEach((mom, momIdx) => {
            (mom.actions || []).forEach((action) => {
                if (action.by && action.status && action.desc && action.status.toLowerCase() !== 'closed') {
                    tasksFound = true;
                    html += `
                        <div class="mom-list-item" style="background: #fff;">
                            <span class="mom-list-info">
                                <strong style="white-space: pre-wrap;">Action: ${action.desc}</strong>
                                <br><small>Due: ${action.date || 'N/A'} | Who: ${action.by} | Status: ${action.status}</small>
                            </span>
                            <button class="secondary-button small-button preview-mom-btn" data-index="${momIdx}" data-job-no="${jobNo}">View MoM</button>
                        </div>
                    `;
                }
            });
        });
        if (!tasksFound) html = '<p>No open action items found.</p>';
        containerElement.innerHTML = html;
    },

    openModal: async (index, jobNo, domElements) => {
        const isNew = index === null;
        domElements.title.textContent = isNew ? "Create New MoM" : "Edit MoM";
        domElements.editIndex.value = isNew ? '' : index;
        domElements.deleteBtn.style.display = isNew ? 'none' : 'inline-block';
        
        // Default / Reset Values
        domElements.ref.value = '';
        domElements.date.value = new Date().toISOString().split('T')[0];
        domElements.location.value = 'Site Office';
        domElements.attendeesBody.innerHTML = '';
        domElements.summary.value = '';
        domElements.actionsBody.innerHTML = '';
        domElements.nextDate.value = '';
        domElements.nextNotes.value = '(To be confirmed a day before)';
        
        // New Fields Reset
        domElements.progress.value = 0;
        domElements.lookAhead.value = ''; 
        domElements.materials.value = '';

        const siteData = await DB.getSiteData(jobNo);

        // Pre-fill Logic
        if (jobNo) {
            let mom = null;

            // Check if Copying (prefillData attached to domElements via copyToNew)
            if (domElements._prefillData) {
                mom = domElements._prefillData;
                delete domElements._prefillData;
                // Recalculate Look Ahead for new MoM even if copying
                domElements.lookAhead.value = await MomModule.generateLookAhead(jobNo);
                domElements.progress.value = siteData.progress || 0; // Use current site progress
            } 
            // Check if Editing Existing
            else if (!isNew) {
                mom = siteData.mom[index];
            } 
            // Completely New
            else {
                // Auto-generate Look Ahead
                domElements.lookAhead.value = await MomModule.generateLookAhead(jobNo);
                domElements.progress.value = siteData.progress || 0;
            }

            if(mom) {
                domElements.ref.value = mom.ref || '';
                domElements.date.value = mom.date || '';
                domElements.location.value = mom.location || '';
                
                domElements.summary.value = mom.summary || '';
                domElements.progress.value = mom.progress || 0;
                domElements.lookAhead.value = mom.lookAhead || '';
                domElements.materials.value = mom.materials || '';

                domElements.nextDate.value = mom.nextMeeting || '';
                domElements.nextNotes.value = mom.nextMeetingNotes || '';
                
                (mom.attendees || []).forEach(p => MomModule.addAttendeeRow(domElements.attendeesBody, p.name, p.position, p.company));
                (mom.actions || []).forEach(a => MomModule.addActionRow(domElements.actionsBody, a.desc, a.by, a.date, a.status));
            }
        }
        domElements.modal.style.display = 'flex';
    },

    // NEW: Helper to get tasks from schedule starting in next 14 days
    generateLookAhead: async (jobNo) => {
        try {
            const project = await DB.getProject(jobNo);
            const siteData = await DB.getSiteData(jobNo);
            
            // Assuming getProjectSchedule is available globally via site_app imports or window
            // If not, we fall back to raw list
            let tasks = [];
            if (window.getProjectSchedule) {
                tasks = await window.getProjectSchedule(project, siteData);
            } else {
                // Fallback: simplified logic if module not exposed
                return "1. Continue ongoing works.\n2. ...";
            }

            const today = new Date();
            const twoWeeks = new Date();
            twoWeeks.setDate(today.getDate() + 14);

            const upcoming = tasks.filter(t => {
                if(!t.start || !t.end) return false;
                const start = new Date(t.start);
                const end = new Date(t.end);
                // Active now OR starting in next 2 weeks
                const isActive = (today >= start && today <= end);
                const isStarting = (start >= today && start <= twoWeeks);
                return (isActive || isStarting);
            });

            if (upcoming.length === 0) return "No scheduled tasks found for next 2 weeks.";
            return upcoming.map((t, i) => `${i+1}. ${t.name} (End: ${t.end})`).join('\n');

        } catch (e) {
            console.warn("Lookahead generation failed", e);
            return "Could not load schedule data.";
        }
    },

    closeModal: (domElements) => {
        if(domElements.modal) domElements.modal.style.display = 'none';
        if(domElements.previewModal) domElements.previewModal.style.display = 'none';
    },

    saveData: async (context, domElements) => {
        const { currentJobNo } = context.getState();
        if (!currentJobNo) return;

        const siteData = await DB.getSiteData(currentJobNo);
        if (!siteData.mom) siteData.mom = [];

        const index = domElements.editIndex.value;
        
        const attendees = Array.from(domElements.attendeesBody.rows).map(row => ({
            name: row.cells[0].querySelector('input').value,
            position: row.cells[1].querySelector('input').value,
            company: row.cells[2].querySelector('input').value
        }));

        const actions = Array.from(domElements.actionsBody.rows).map(row => ({
            desc: row.cells[0].querySelector('textarea').value, // Changed to textarea
            by: row.cells[1].querySelector('input').value,
            date: row.cells[2].querySelector('input').value,
            status: row.cells[3].querySelector('input').value
        }));

        const momData = {
            ref: domElements.ref.value,
            date: domElements.date.value,
            location: domElements.location.value,
            progress: domElements.progress.value, // NEW
            lookAhead: domElements.lookAhead.value, // NEW
            materials: domElements.materials.value, // NEW
            attendees,
            summary: domElements.summary.value,
            actions,
            nextMeeting: domElements.nextDate.value,
            nextMeetingNotes: domElements.nextNotes.value
        };

        if (index === '') {
            siteData.mom.push(momData);
        } else {
            siteData.mom[parseInt(index)] = momData;
        }

        // Also update the global project progress if this is the latest MoM
        siteData.progress = domElements.progress.value;

        await DB.putSiteData(siteData);
        domElements.modal.style.display = 'none';
        if(context.onUpdate) context.onUpdate('mom');
    },

    // --- Row Management ---
    addAttendeeRow: (tbody, name='', pos='', comp='') => {
        const row = tbody.insertRow();
        row.innerHTML = `<td><input type="text" value="${name}"></td><td><input type="text" value="${pos}"></td><td><input type="text" value="${comp}"></td><td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>`;
    },

    addActionRow: (tbody, desc='', by='', date='', status='') => {
        const row = tbody.insertRow();
        // CHANGED: First cell is now a TEXTAREA
        row.innerHTML = `
            <td><textarea>${desc}</textarea></td>
            <td><input type="text" value="${by}"></td>
            <td><input type="date" value="${date}"></td>
            <td><input type="text" value="${status}"></td>
            <td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>
        `;
    },

    // --- Preview Logic ---
    renderPreview: async (jobNo, momIndex, previewElements) => {
        if (!jobNo || momIndex === null) return;
        const project = await DB.getProject(jobNo);
        const siteData = await DB.getSiteData(jobNo);
        const momData = siteData.mom[momIndex];
        
        if (!project || !momData) return;

        // Fallback generation with new fields
        let htmlContent = `
            <div style="padding:10px;">
                <h3>${project.projectDescription}</h3>
                <p><strong>Ref:</strong> ${momData.ref} | <strong>Date:</strong> ${momData.date} | <strong>Progress:</strong> ${momData.progress || 0}%</p>
                <hr>
                <h4>Attendees</h4>
                <ul>${(momData.attendees||[]).map(a => `<li>${a.name} (${a.company})</li>`).join('')}</ul>
                
                <div style="display:flex; gap:20px; margin-top:15px;">
                    <div style="flex:1;">
                        <h4>Summary / Status</h4>
                        <p style="white-space: pre-wrap;">${momData.summary || 'No summary.'}</p>
                    </div>
                    <div style="flex:1;">
                        <h4>Look Ahead</h4>
                        <p style="white-space: pre-wrap;">${momData.lookAhead || 'No look ahead provided.'}</p>
                        <h4>Required Materials</h4>
                        <p style="white-space: pre-wrap;">${momData.materials || 'None listed.'}</p>
                    </div>
                </div>

                <h4>Actions</h4>
                <table class="mom-table" style="width:100%">
                    <thead><tr><th>Desc</th><th>By</th><th>Due</th><th>Status</th></tr></thead>
                    <tbody>${(momData.actions||[]).map(a => `<tr><td style="white-space: pre-wrap;">${a.desc}</td><td>${a.by}</td><td>${a.date}</td><td>${a.status}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        `;

        previewElements.body.innerHTML = htmlContent;
        previewElements.title.textContent = `Preview: MoM Ref ${momData.ref || 'N/A'}`;
        
        previewElements.footer.innerHTML = `
            <button id="edit-this-mom-btn" class="secondary-button" data-job-no="${jobNo}" data-index="${momIndex}">Edit this MoM</button>
            <button id="copy-mom-btn" class="secondary-button" data-job-no="${jobNo}" data-index="${momIndex}" style="margin-left:10px;">Copy to New MoM</button>
            <button id="print-mom-btn" class="primary-button" data-job-no="${jobNo}" data-index="${momIndex}" style="float:right;">Print Full Form</button>
        `;
        
        previewElements.modal.style.display = 'flex';
    },

    copyToNew: async (jobNo, index, formDomElements) => {
        const siteData = await DB.getSiteData(jobNo);
        const oldMom = siteData.mom[index];
        if(!oldMom) return;

        const prefillData = {
            ...oldMom,
            ref: '', 
            date: new Date().toISOString().split('T')[0],
            // Keep attendees, Recalculate Lookahead in openModal
            actions: (oldMom.actions || []).filter(a => a.status && a.status.toLowerCase() !== 'closed')
        };
        
        formDomElements._prefillData = prefillData;
        MomModule.openModal(null, jobNo, formDomElements);
    }
};