//import { DB } from '../database.js';

export const BulletinModule = {
    init: (domElements, context) => {
        if(domElements.postBtn) {
            domElements.postBtn.addEventListener('click', () => BulletinModule.handlePost(domElements, context));
        }
    },

    render: async (jobNo, containerElement) => {
        if(!jobNo || !containerElement) return;
        
        containerElement.innerHTML = '<p>Loading bulletins...</p>';
        const bulletins = await DB.getBulletinItems(); 
        
        const projectBulletins = bulletins.filter(b => b.jobNo === jobNo);
        
        if(projectBulletins.length === 0) {
            containerElement.innerHTML = '<p>No bulletins posted for this project.</p>';
            return;
        }

        let html = '<ul style="list-style:none; padding:0;">';
        projectBulletins.forEach(b => {
             html += `
                <li style="border-bottom: 1px solid #eee; padding: 8px 0;">
                    <strong>${b.subject}</strong> <small>(From: ${b.author || 'System'} on ${new Date(b.timestamp).toLocaleDateString()})</small>
                    <br>${b.details}
                    ${b.assignedTo ? `<br><span style="background:#fff3cd; padding:2px 5px; border-radius:3px; font-size:0.8em;">To: ${b.assignedTo}</span>` : ''}
                </li>`;
        });
        html += '</ul>';
        containerElement.innerHTML = html;
    },

    handlePost: async (domElements, context) => {
        const { currentJobNo, currentUserRole } = context.getState();
        if (!currentJobNo) return alert("Select project.");

        const subject = domElements.subjectInput.value.trim();
        const details = domElements.detailsInput.value.trim();
        const assignedTo = domElements.assignedToInput.value.trim();
        
        if (!subject || !details) { alert("Subject and Details are required."); return; }

        await DB.addBulletinItem({
            jobNo: currentJobNo,
            timestamp: new Date().toISOString(),
            author: currentUserRole || 'Staff', 
            subject: subject,
            details: details,
            assignedTo: assignedTo || 'Project Team',
        });

        // Clear inputs
        domElements.subjectInput.value = '';
        domElements.detailsInput.value = '';
        domElements.assignedToInput.value = '';

        if(context.onUpdate) context.onUpdate('bulletin');
        alert('Bulletin posted.');
    }
};