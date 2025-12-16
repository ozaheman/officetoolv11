//--- START OF FILE letters.js ---

App.ProjectTabs.Letters = (() => {


function init() {
    const container = document.getElementById('project-letters-tab');
    
    if (!container) return;
    let authorityOptions = Object.keys(CONTENT.AUTHORITY_DETAILS).map(key => `<option value="${key}">${key}</option>`).join('');
    container.innerHTML = `
        <h3>Generate Project Letter</h3>
        <div class="input-group">
            <label for="project-letter-type">Letter Type</label>
            <select id="project-letter-type"><option value="">-- Select --</option><option value="scopeOfWork">Scope of Work Letter</option><option value="consultantAppointment">Consultant Appointment Letter</option></select>
        </div>
        <div class="input-group">
            <label for="project-letter-authority">To Authority</label>
            <select id="project-letter-authority"><option value="">-- Select --</option>${authorityOptions}</select>
        </div>
        <div id="project-letter-dynamic-fields"></div>
        <button id="generate-project-letter-btn" class="primary-button" style="width:100%; margin-top:15px;">Generate Preview</button>
    `;
    // Cache DOMElements correctly within the App object
    App.DOMElements.projectLetterType = document.getElementById('project-letter-type');
    App.DOMElements.projectLetterAuthority = document.getElementById('project-letter-authority');
    App.DOMElements.projectLetterDynamicFields = document.getElementById('project-letter-dynamic-fields');
    App.DOMElements.generateProjectLetterBtn = document.getElementById('generate-project-letter-btn');
    
    setupEventListeners();
}

function setupEventListeners() {
    App.DOMElements.projectLetterType?.addEventListener('change', updateProjectLetterUI);
    
    // MODIFICATION: Correctly attach listener to the generate button
    App.DOMElements.generateProjectLetterBtn?.addEventListener('click', () => {
        if (!App.currentProjectJobNo) {
            // alert('letter-aaa2');
            alert("Please load a project first.");
            return;
        }
        // Switch to the letter preview tab and refresh it
        const letterPreviewTabButton = App.DOMElements.previewTabs?.querySelector('[data-tab="project-letter"]');
        if (letterPreviewTabButton) {
            letterPreviewTabButton.click(); // This will trigger the preview update via the main tab handler
        } else {
            // Fallback if the tab system isn't ready
            App.refreshCurrentPreview();
        }
    });
}

function updateProjectLetterUI() {
    const letterType = App.DOMElements.projectLetterType.value;
    const dynamicFieldsContainer = App.DOMElements.projectLetterDynamicFields;
    if (letterType === 'scopeOfWork') {
        dynamicFieldsContainer.innerHTML = `<div class="input-group"><label for="letter-scope-items">Scope of Work Items (one per line)</label><textarea id="letter-scope-items" rows="5" placeholder="1. Extension of ground floors\n2. Extension of first floor"></textarea></div>`;
    } else {
        dynamicFieldsContainer.innerHTML = '';
    }
}

async function renderPreview() {
    // MODIFICATION: Get project data directly from DB within this function to ensure it's current
    if (!App.currentProjectJobNo) return '<p style="text-align:center;">No project loaded.</p>';
    const projectData = await DB.getProject(App.currentProjectJobNo);

    const letterType = App.DOMElements.projectLetterType.value;
    const authorityKey = App.DOMElements.projectLetterAuthority.value;

    if (!letterType || !authorityKey) {
        return '<p style="text-align:center;">Please select a letter type and an authority.</p>';
    }

    let details = { authority: authorityKey };
    if (letterType === 'scopeOfWork') {
        // alert('letter scope of work');
        const scopeItemsTextarea = document.getElementById('letter-scope-items');
        details.scopeItems = scopeItemsTextarea ? scopeItemsTextarea.value.split('\n').filter(line => line.trim() !== '') : [];
    }
    
    const templateFunction = PROJECT_LETTER_TEMPLATES[letterType];
    // alert(templateFunction);
    
    ////added
    if (templateFunction) {
            App.DOMElements['project-letter-preview'].innerHTML = templateFunction({ projectData, details });
        } else {
            App.DOMElements['project-letter-preview'].innerHTML = '<p style="text-align:center;">Template not found.</p>';
        }
        
        //added end
    // The template function now receives the full project data and the specific details for this letter
    return templateFunction ? templateFunction({ projectData, details }) : '<p style="text-align:center;">Template not found.</p>';
}

return { init, renderPreview };

})();