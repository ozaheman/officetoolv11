// --- START OF FILE js/contractor_app.js ---
import { DB } from './database.js';
import { RfiModule } from './site_modules/rfi_module.js';
import { MomModule } from './site_modules/mom_module.js';
import { MaterialsModule } from './site_modules/materials_module.js';
import { BulletinModule } from './site_modules/bulletin_module.js';
import { ReportingModule } from './site_modules/reporting_module.js';

// --- STATE ---
const AppState = {
    currentJobNo: null,
    currentUserRole: 'contractor', // Default context
    calendarDate: new Date()
};

// --- CONTEXT ---
const AppContext = {
    getState: () => AppState,
    onUpdate: (moduleName) => {
        if (moduleName === 'rfi') RfiModule.render(AppState.currentJobNo, document.getElementById('rfi-table-body'), AppState.currentUserRole);
        if (moduleName === 'mom') MomModule.renderList(AppState.currentJobNo, document.getElementById('mom-list'));
        if (moduleName === 'materials') MaterialsModule.render(AppState.currentJobNo, document.getElementById('material-table-body'));
        if (moduleName === 'bulletin') BulletinModule.render(AppState.currentJobNo, document.getElementById('bulletin-feed'));
    },
    getSchedule: async (project, siteData) => {
        return window.UrbanAxisSchedule.calculateDynamicSchedule(project, window.VILLA_SCHEDULE_TEMPLATE, siteData.scheduleOverrides);
    }
};

let DOMElements = {};

document.addEventListener('DOMContentLoaded', async () => {
    DOMElements = {
        // ... (Same mapping as site_app.js, tailored to contractor.html IDs)
        projectListBody: document.getElementById('project-list-body'),
        rfiTableBody: document.getElementById('rfi-table-body'),
        // ...
    };

    await DB.init();
    
    // Initialize Modules
    RfiModule.init({ newRfiBtn: document.getElementById('new-rfi-btn') }, AppContext);
    MaterialsModule.init({ newBtn: document.getElementById('new-material-submittal-btn') }, AppContext);
    BulletinModule.init({ /* ... */ }, AppContext); // Contractor might only view bulletins, check HTML permissions
    
    // Core Events
    document.getElementById('project-list-body').addEventListener('click', handleProjectSelect);
    // ... (Login/Logout logic same as site_app.js)
    
    // Render Project List
    renderProjectList();
});

async function handleProjectSelect(e) {
    const row = e.target.closest('tr');
    if (!row) return;
    
    AppState.currentJobNo = row.dataset.jobNo;
    
    // Trigger Renders
    RfiModule.render(AppState.currentJobNo, document.getElementById('rfi-table-body'), AppState.currentUserRole);
    MomModule.renderList(AppState.currentJobNo, document.getElementById('mom-list'));
    MaterialsModule.render(AppState.currentJobNo, document.getElementById('material-table-body'));
    BulletinModule.render(AppState.currentJobNo, document.getElementById('bulletin-feed'));
    
    // Toggle View to Project Details
    document.querySelector('.site-project-details').style.display = 'block';
    // ...
}

async function renderProjectList() {
    const tbody = document.getElementById('project-list-body');
    const allProjects = await DB.getAllProjects();
    // Filter for contractor specific logic if needed
    // ... rendering logic
}

// ... (Helper functions for Calendar, BOQ, etc., reused/adapted from site_app.js)