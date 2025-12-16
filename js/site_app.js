// --- START OF FILE js/site_app.js ---
import { RfiModule } from './site_modules/rfi_module.js';
import { MomModule } from './site_modules/mom_module.js';
import { MaterialsModule } from './site_modules/materials_module.js';
import { BulletinModule } from './site_modules/bulletin_module.js';
import { VendorModule } from './site_modules/vendor_module.js';
import { ReportingModule } from './site_modules/reporting_module.js';
import { BoqModule } from './site_modules/boq_module.js';
import { ScheduleModule,renderFloorSelector,  showNewTaskModal,saveNewTask,getProjectSchedule,setupSimulationControls,renderGanttChart } from './site_modules/schedule_module.js';
import { SubcontractorModule } from './site_modules/subcontractor_module.js';
import { ToolsModule } from './site_modules/tools_module.js';

// --- GLOBAL STATE ---
export const AppState = {
    currentJobNo: null,
    currentUserRole: null,
    accessibleProjects: [],
    currentProjectFilter: '',
    calendarDate: new Date(),
    simulationInterval : null,
    
    currentFloorFilter: 'all',
    simulationSpeed : 100, // ms per day
    specificProjectAccess : null // New global to track if a specific project is locked
};

// --- DOM ELEMENTS CACHE ---
window.DOMElements = {};
console.log('DOMElements'); 
console.log(DOMElements); 
// New Globally Accessible Helper Function for Password Verification
window.verifyAccess = async (jobNo, role, password) => {
    try {
        const project = await window.DB.getProject(jobNo);
        if (project && project.accessCredentials && project.accessCredentials[role]) {
            const creds = project.accessCredentials[role];
            if (creds.pass === password) {
                return true; // Project-specific password matches
            }
        }
        // Fallback to global password check
        return await window.DB.verifyPassword(role, password);
    } catch (e) {
        console.error("Error during access verification:", e);
        return false;
    }
};
window.getProjectSchedule = getProjectSchedule;
// --- APP CONTEXT FOR MODULES ---
const AppContext = {
    getState: () => AppState,
    onUpdate: (moduleName) => {
        const jobNo = AppState.currentJobNo;
        // Refresh specific module views
        if (moduleName === 'rfi') RfiModule.render(jobNo, DOMElements.rfiTableBody, AppState.currentUserRole);
        if (moduleName === 'mom') {
            MomModule.renderList(jobNo, DOMElements.momList);
            renderCalendar(); 
        }
        if (moduleName === 'materials') MaterialsModule.render(jobNo, DOMElements.materialTableBody);
        if (moduleName === 'bulletin') BulletinModule.render(jobNo, DOMElements.bulletinFeed);
        if (moduleName === 'boq') BoqModule.render(jobNo, getBoqElements());
        if (moduleName === 'subcontractors') SubcontractorModule.render(jobNo, DOMElements.subcontractorList);
    },
    getSchedule: async (project, siteData) => {
        // Bridge using ScheduleModule
        return ScheduleModule.render(project.jobNo);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    cacheDomElements();

    try {
        if (window.DB) {
            await window.DB.init();
            await populateHolidayCountries();
        } else {
            console.error("Database not loaded globally");
        }
        
        initializeModules();
        setupCoreEventListeners();

        // Initial View State
        if (DOMElements.loginModal) {
            DOMElements.loginModal.style.display = 'flex';
            DOMElements.mainSiteContainer.style.display = 'none';
        } else {
            // Fallback for dev if modal manually hidden
            DOMElements.mainSiteContainer.style.display = 'block';
            await renderProjectList();
            showGlobalView();
        }

    } catch (error) {
        console.error("Initialization Error:", error);
    }
});

export function cacheDomElements() {
    // FIX: Replaced the looping mechanism with explicit assignments to prevent kebab-case vs camelCase key mismatches.
    DOMElements.mainSiteContainer = document.getElementById('main-site-container');
    DOMElements.loginModal = document.getElementById('login-modal');
    DOMElements.logoutBtn = document.getElementById('logout-btn');
    DOMElements.performLoginBtn = document.getElementById('perform-login-btn');
    DOMElements.loginRoleSelect = document.getElementById('login-role');
    DOMElements.loginUsername = document.getElementById('login-username');
    DOMElements.loginPassword = document.getElementById('login-password');
    DOMElements.loginFilterKey = document.getElementById('login-filter-key');
    DOMElements.loginErrorMsg = document.getElementById('login-error');
    DOMElements.welcomeUserMsg = document.getElementById('welcome-user-msg');
    DOMElements.projectListBody = document.getElementById('project-list-body');
    DOMElements.detailsProjectName = document.getElementById('details-project-name');
    DOMElements.detailsProjectInfo = document.getElementById('details-project-info');
    DOMElements.backToGlobalBtn = document.getElementById('back-to-global-btn');
    DOMElements.controlTabsContainer = document.getElementById('control-tabs-container');
    DOMElements.siteStatusSelect = document.getElementById('site-status-select');
    DOMElements.floorSelectorContainer = document.getElementById('floor-selector-container');
    DOMElements.rfiTableBody = document.getElementById('rfi-table-body');
    DOMElements.momList = document.getElementById('mom-list');
    DOMElements.materialTableBody = document.getElementById('material-table-body');
    DOMElements.bulletinFeed = document.getElementById('bulletin-feed');
    DOMElements.subcontractorList = document.getElementById('subcontractor-list');
    DOMElements.vendorSearchResults = document.getElementById('vendor-search-results');
    DOMElements.calendarGridBody = document.getElementById('calendar-grid-body');
    DOMElements.monthYearDisplay = document.getElementById('month-year-display');
    DOMElements.holidayCountrySelect = document.getElementById('holiday-country-select'); // This will now be correctly cached.
    DOMElements.resourceCalculatorBody = document.getElementById('resource-calculator-body');
    DOMElements.resourceDayRate = document.getElementById('resource-day-rate');
    DOMElements.photoGallery = document.getElementById('photo-gallery');
    DOMElements.siteDocGallery = document.getElementById('site-doc-gallery');
    DOMElements.projectDocsGallery = document.getElementById('project-docs-gallery');
    DOMElements.tenderDocsGallery = document.getElementById('tender-docs-gallery');
    DOMElements.vendorListsGallery = document.getElementById('vendor-lists-gallery');
    DOMElements.photoUploadInput = document.getElementById('photo-upload-input');
    DOMElements.docUploadInput = document.getElementById('doc-upload-input');
    DOMElements.docNameInput = document.getElementById('doc-name-input');
    DOMElements.formModal = document.getElementById('form-modal');
    DOMElements.formModalCloseBtn = document.getElementById('form-modal-close-btn');
    DOMElements.formModalTitle = document.getElementById('form-modal-title');
    DOMElements.formModalBody = document.getElementById('form-modal-body');
    DOMElements.saveFormPdfBtn = document.getElementById('save-form-pdf-btn');
    DOMElements.newTaskModal = document.getElementById('new-task-modal');
    DOMElements.newTaskCloseBtn = document.getElementById('new-task-close-btn');
    DOMElements.saveNewTaskBtn = document.getElementById('save-new-task-btn');
    DOMElements.addCustomTaskBtn = document.getElementById('add-custom-task-btn');
    DOMElements.newTaskName = document.getElementById('new-task-name');
    DOMElements.newTaskStart = document.getElementById('new-task-start');
    DOMElements.newTaskDuration = document.getElementById('new-task-duration');
    DOMElements.newTaskFloor = document.getElementById('new-task-floor');
    DOMElements.newTaskDependency = document.getElementById('new-task-dependency');
    DOMElements.bimItemName = document.getElementById('bim-item-name');
    DOMElements.bimItemStatus = document.getElementById('bim-item-status');
    DOMElements.bimItemProgress = document.getElementById('bim-item-progress');

    // These function calls correctly populate nested element objects
    DOMElements.momModalElements = getMomModalElements();
    DOMElements.momPreviewElements = getMomPreviewElements();
    DOMElements.rfiModalElements = getRfiModalElements();
}

function getBoqElements() {
    return {
        tableBody: document.getElementById('boq-table-body'),
        totalValueDisplay: document.getElementById('boq-total-value'),
        workDoneDisplay: document.getElementById('boq-work-done-value'),
        progressDisplay: document.getElementById('boq-progress-percentage'),
        progressBar: document.getElementById('boq-progress-bar'),
        addBtn: document.getElementById('add-boq-item-btn'),
        certBtn: document.getElementById('generate-payment-cert-btn')
    };
}
function getRfiModalElements() {
    return {
        modal: document.getElementById('rfi-modal'),
        closeBtn: document.getElementById('rfi-modal-close-btn'),
        title: document.getElementById('rfi-modal-title'),
        editId: document.getElementById('rfi-edit-id'),
        refNo: document.getElementById('rfi-ref-no'),
        subject: document.getElementById('rfi-subject'),
        description: document.getElementById('rfi-description'),
        fileAttach: document.getElementById('rfi-file-attach'),
        newAttachmentsList: document.getElementById('rfi-new-attachments-list'),
        docLinkSelect: document.getElementById('rfi-doc-link-select'),
        approversGroup: document.getElementById('rfi-approvers-group'),
        responseComments: document.getElementById('rfi-response-comments'),
        saveBtn: document.getElementById('save-rfi-btn'),
    }
}
function getMomModalElements() {
    return {
        title: document.getElementById('mom-modal-title'),
        modal: document.getElementById('mom-modal'),
        editIndex: document.getElementById('mom-edit-index'),
        deleteBtn: document.getElementById('delete-mom-btn'),
        ref: document.getElementById('mom-ref'),
        date: document.getElementById('mom-date'),
        location: document.getElementById('mom-location'),
          // NEW FIELDS
        progress: document.getElementById('mom-progress'),
        lookAhead: document.getElementById('mom-lookahead'),
        materials: document.getElementById('mom-materials'),
        summary: document.getElementById('mom-status-summary'),
        nextDate: document.getElementById('mom-next-meeting'),
        nextNotes: document.getElementById('mom-next-meeting-notes'),
        attendeesBody: document.getElementById('mom-attendees-tbody'),
        actionsBody: document.getElementById('mom-actions-tbody'),
        momModal: document.getElementById('mom-modal'),
         momList: document.getElementById('mom-list'),
          momDate: document.getElementById('mom-date'),
          closeBtn: document.getElementById('mom-modal-close-btn'),
           addAttendeeBtn: document.getElementById('add-attendee-btn'),
           addActionBtn: document.getElementById('add-action-btn'),
           // MODIFIED: Ensure closeBtn is captured here
        
         saveMomDataBtn: document.getElementById('save-mom-data-btn'),
        actionsBody: document.getElementById('mom-actions-tbody')
    };
  
}
// --- Helper: Get MOM Preview Elements ---
function getMomPreviewElements() {
    return {
        modal: document.getElementById('mom-preview-modal'),
        title: document.getElementById('mom-preview-modal-title'),
        body: document.getElementById('mom-preview-modal-body'),
        footer: document.getElementById('mom-preview-modal-footer'),
        closeBtn: document.getElementById('mom-preview-modal-close-btn')
    };
}
function initializeModules() {
    // FIX: Correctly initialize RfiModule with all its required DOM elements.
    const rfiModalElements = getRfiModalElements();
    rfiModalElements.newRfiBtn = document.getElementById('new-rfi-btn'); // Add the trigger button
    RfiModule.init(rfiModalElements, AppContext);

    MaterialsModule.init({ newBtn: document.getElementById('new-material-submittal-btn') }, AppContext);
    BulletinModule.init({ 
        postBtn: document.getElementById('post-bulletin-btn'), 
        subjectInput: document.getElementById('bulletin-subject'), 
        detailsInput: document.getElementById('bulletin-details'), 
        assignedToInput: document.getElementById('bulletin-assigned-to') 
    }, AppContext);
    VendorModule.init({ searchInput: document.getElementById('vendor-search-input'), resultsContainer: document.getElementById('vendor-search-results') });
    ReportingModule.init({ generateBtn: document.getElementById('generate-project-report-btn') }, AppContext);
    
    // New Modules
    BoqModule.init(getBoqElements(), AppContext);
    SubcontractorModule.init({ addBtn: document.getElementById('add-subcontractor-btn') }, AppContext);
    ToolsModule.init({ 
        rateInput: document.getElementById('resource-day-rate'), 
        tableBody: document.getElementById('resource-calculator-body') 
    });
    
    // MoM Modal Binding
      const momElements = getMomModalElements();
    const momPreviewElements = getMomPreviewElements();
    const newMomBtn = document.getElementById('new-mom-btn');
    if(newMomBtn) newMomBtn.addEventListener('click', () => {
        MomModule.openModal(null, AppState.currentJobNo, getMomModalElements());
    });
    // 2. Add Row Listeners (Attendees & Actions)
    if(momElements.addAttendeeBtn) {
        momElements.addAttendeeBtn.addEventListener('click', () => {
            MomModule.addAttendeeRow(momElements.attendeesBody);
        });
    }
     if(momElements.addActionBtn) {
        momElements.addActionBtn.addEventListener('click', () => {
            MomModule.addActionRow(momElements.actionsBody);
        });
    }
      // 3. Save MoM
    const saveMomBtn = document.getElementById('save-mom-data-btn');
    
    // NEW: Proper Close Button Logic
    // const momElements = getMomModalElements();
    if(momElements.closeBtn) {
        momElements.closeBtn.addEventListener('click', () => {
            MomModule.closeModal(momElements);
        });
    }
    if(saveMomBtn) saveMomBtn.addEventListener('click', () => {
        MomModule.saveData(AppContext, momElements);
    });
     // 4. Close Buttons (Form & Preview)
    if(momElements.closeBtn) 
{
        momElements.closeBtn.addEventListener('click', () => MomModule.closeModal(momElements));
    }
    if(momPreviewElements.closeBtn) {
        momPreviewElements.closeBtn.addEventListener('click', () => {
            momPreviewElements.modal.style.display = 'none';
        });
    }
    
    if(DOMElements.addCustomTaskBtn) DOMElements.addCustomTaskBtn.addEventListener('click', showNewTaskModal);
    if(DOMElements.saveNewTaskBtn) DOMElements.saveNewTaskBtn.addEventListener('click', saveNewTask);
    if(DOMElements.newTaskCloseBtn && DOMElements.newTaskModal) DOMElements.newTaskCloseBtn.addEventListener('click', () => DOMElements.newTaskModal.style.display = 'none');

  // 2. Floor Selector Listener
    const floorContainer = document.getElementById('floor-selector-container');
    if (floorContainer) {
        // alert('hhhhh');
        // Remove old listeners to be safe (optional, but good practice if re-init happens)
        const newContainer = floorContainer.cloneNode(true);
        floorContainer.parentNode.replaceChild(newContainer, floorContainer);
        DOMElements.floorSelectorContainer = newContainer; // Update reference

        newContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('floor-btn')) {
                // UI Update
                const buttons = newContainer.querySelectorAll('.floor-btn');
                buttons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Logic Update
                AppState.currentFloorFilter = e.target.dataset.floor;
                
                // Re-render Schedule
                if(AppState.currentJobNo) {
                    ScheduleModule.render(AppState.currentJobNo); 
                }
            }
        });
    }
}

function setupCoreEventListeners() {
    DOMElements.performLoginBtn?.addEventListener('click', handleLogin);
    DOMElements.logoutBtn?.addEventListener('click', handleLogout);
    DOMElements.projectListBody.addEventListener('click', handleProjectSelect);
    DOMElements.backToGlobalBtn.addEventListener('click', showGlobalView);
    DOMElements.controlTabsContainer.addEventListener('click', handleTabClick);
    
    const saveBtn = document.getElementById('save-data-btn');
    if(saveBtn) saveBtn.addEventListener('click', () => alert('Save XML functionality placeholder.'));
    
    if(DOMElements.siteStatusSelect) DOMElements.siteStatusSelect.addEventListener('change', updateStatus);
    if(DOMElements.photoUploadInput) DOMElements.photoUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'photo'));
    if(DOMElements.docUploadInput) DOMElements.docUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'document'));
    
    document.getElementById('prev-month-btn')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn')?.addEventListener('click', () => changeMonth(1));
    document.getElementById('load-holidays-btn')?.addEventListener('click', handleLoadHolidays);
    
    if(DOMElements.formModalCloseBtn) DOMElements.formModalCloseBtn.addEventListener('click', () => DOMElements.formModal.style.display = 'none');
    const formsTab = document.getElementById('forms-tab');
    if(formsTab) formsTab.addEventListener('click', handleFormButtonClick);
    
    document.body.addEventListener('click', handleGlobalClicks);
}



// --- HANDLERS ---
// New Task Modal
// --- NEW TASK MODAL HANDLERS ---
     async function showNewTaskModalyy() {
        if(!AppState.currentJobNo) return alert("Select a project first.");
        
        // Populate Dependency Dropdown
        const dependencySelect = document.getElementById('new-task-dependency');
        dependencySelect.innerHTML = '<option value="">-- No Dependency --</option>';
        
        const project = await window.DB.getProject(!AppState.currentJobNo);
        const siteData = await window.DB.getSiteData(!AppState.currentJobNo);
        const currentTasks = await getProjectSchedule(project, siteData); // Get full list including custom
        
        currentTasks.forEach(t => {
            dependencySelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
        
        DOMElements.newTaskModal.style.display = 'flex';
    }


async function handleLogin() {
    const role = DOMElements.loginRoleSelect.value;
    const inputUser = DOMElements.loginUsername.value.trim();
    const inputPass = DOMElements.loginPassword.value.trim();
    
    AppState.accessibleProjects = [];
    AppState.currentProjectFilter = '';
    let loginSuccessful = false;

    try {
        const allProjects = await window.DB.getAllProjects();
        const validProjects = [];

        // Project Specific
        for (const proj of allProjects) {
            if (proj.accessCredentials && proj.accessCredentials[role]) {
                const creds = proj.accessCredentials[role];
                if (creds.user === inputUser && creds.pass === inputPass) {
                    validProjects.push(proj.jobNo);
                }
            }
        }

        if (validProjects.length > 0) {
            loginSuccessful = true;
            AppState.accessibleProjects = validProjects;
            AppState.currentUserRole = role;
        } else {
            // Global Check
            const isGlobalValid = await window.DB.verifyPassword(role, inputPass);
            const defaultUser = (window.DEFAULT_CREDENTIALS && window.DEFAULT_CREDENTIALS[role]) ? window.DEFAULT_CREDENTIALS[role].user : null;
            const isUserMatch = (defaultUser === inputUser) || (inputUser === 'admin');

            if (isGlobalValid && isUserMatch) {
                loginSuccessful = true;
                AppState.currentUserRole = role;
                AppState.accessibleProjects = []; 
                if (DOMElements.loginFilterKey && DOMElements.loginFilterKey.value) {
                    AppState.currentProjectFilter = DOMElements.loginFilterKey.value.toLowerCase().trim();
                }
            }
        }

        if (loginSuccessful) {
            DOMElements.loginModal.style.display = 'none';
            DOMElements.mainSiteContainer.style.display = 'block';
            
            if (DOMElements.welcomeUserMsg) {
                const roleName = DOMElements.loginRoleSelect.options[DOMElements.loginRoleSelect.selectedIndex].text;
                DOMElements.welcomeUserMsg.textContent = `Welcome, ${roleName}`;
                DOMElements.welcomeUserMsg.style.display = 'inline';
            }
            DOMElements.logoutBtn.style.display = 'inline-block';

            await renderProjectList();

            if (AppState.accessibleProjects.length === 1) {
                await autoLoadProject(AppState.accessibleProjects[0]);
            } else {
                showGlobalView();
            }
        } else {
            DOMElements.loginErrorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Login Error:", error);
    }
}
async function updateDashboardStats(jobNo) {
    if (!jobNo) return;
    const project = await window.DB.getProject(jobNo);
    const siteData = await window.DB.getSiteData(jobNo);
    
    // 1. Pending RFIs
    const pendingRfi = (siteData.rfiLog || []).filter(r => r.status !== 'Approved' && r.status !== 'Closed').length;
    document.getElementById('stat-rfi-pending').textContent = pendingRfi;

    // 2. Pending Materials
    const pendingMat = (siteData.materialLog || []).filter(m => m.status === 'Submitted' || m.status === 'Revise & Resubmit').length;
    document.getElementById('stat-mat-pending').textContent = pendingMat;

    // 3. Work Progress (from siteData or calculated from schedule)
    document.getElementById('stat-work-progress').textContent = (siteData.progress || 0) + '%';

    // 4. Tasks Completed (Schedule Logic)
    // Assuming you have a way to fetch current tasks, or count from siteData.statusLog
    const tasks = await getProjectSchedule(project, siteData);
    const completedTasks = tasks.filter(t => new Date(t.end) < new Date()).length;
    document.getElementById('stat-tasks-comp').textContent = completedTasks;

    // 5. Bulletins
    const bulletins = await window.DB.getBulletinItems();
    const projBulletins = bulletins.filter(b => b.jobNo === jobNo).length;
    document.getElementById('stat-bulletins').textContent = projBulletins;

    // 6. Project Age
    const startStr = project.agreementDate || siteData.startDate || new Date().toISOString();
    const startDate = new Date(startStr);
    const diffTime = Math.abs(new Date() - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    document.getElementById('stat-days-active').textContent = diffDays + ' Days';
}
function handleLogout() { location.reload(); }

async function handleProjectSelect(e) {
    const row = e.target.tagName === 'TR' ? e.target : e.target.closest('tr');
    if (!row || !row.dataset.jobNo) return;

    Array.from(DOMElements.projectListBody.children).forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    AppState.currentJobNo = row.dataset.jobNo;
    const project = await window.DB.getProject(AppState.currentJobNo);
    
    let siteData = await window.DB.getSiteData(AppState.currentJobNo);
    if (!siteData) {
        const boqTemplate = (window.FINANCIAL_DATA && window.FINANCIAL_DATA.boq) ? JSON.parse(JSON.stringify(window.FINANCIAL_DATA.boq)) : [];
        siteData = { jobNo: AppState.currentJobNo, status: 'Pending Start', boq: boqTemplate, mom: [], rfiLog: [], materialLog: [] };
        await window.DB.putSiteData(siteData);
    }

    DOMElements.detailsProjectName.textContent = project.projectDescription;
    DOMElements.detailsProjectInfo.textContent = `Job: ${project.jobNo} | ${project.clientName}`;
    DOMElements.backToGlobalBtn.style.display = 'block';
    DOMElements.siteStatusSelect.value = siteData.status || 'Pending Start';

    // --- RENDER MODULES ---
    RfiModule.render(AppState.currentJobNo, DOMElements.rfiTableBody, AppState.currentUserRole);
    MomModule.renderList(AppState.currentJobNo, DOMElements.momList);
    await renderGanttChart();
    MaterialsModule.render(AppState.currentJobNo, DOMElements.materialTableBody);
    BulletinModule.render(AppState.currentJobNo, DOMElements.bulletinFeed);
    BoqModule.render(AppState.currentJobNo, getBoqElements());
    SubcontractorModule.render(AppState.currentJobNo, DOMElements.subcontractorList);

    // --- RENDER CORE ---
    await renderFileGallery(DOMElements.photoGallery, 'site', 'photo', true);
    await renderFileGallery(DOMElements.siteDocGallery, 'site', 'document', true);
    await renderMasterDocsByCategory(['client_details', 'noc_copies', 'letters', 'other_uploads'], DOMElements.projectDocsGallery);
    await renderMasterDocsByCategory(['tender_documents'], DOMElements.tenderDocsGallery);
    await renderMasterDocsByCategory(['vendor_lists'], DOMElements.vendorListsGallery);
    
    // Schedule
    const schedule = await ScheduleModule.render(AppState.currentJobNo);
    renderCalendar();
    renderFloorSelector(); // Ensure floor buttons appear
    ToolsModule.renderResourceCalculator(AppState.currentJobNo, { tableBody: document.getElementById('resource-calculator-body') }, schedule);
     updateDashboardStats(AppState.currentJobNo);
     renderFloorSelector();
    toggleTabsForView(true);
}

async function autoLoadProject(jobNo) {
    const rows = Array.from(DOMElements.projectListBody.querySelectorAll('tr'));
    const targetRow = rows.find(r => r.dataset.jobNo === jobNo);
    
    if (targetRow) {
        await handleProjectSelect({ target: targetRow }); 
    } else {
        // Direct load fallback
        AppState.currentJobNo = jobNo;
        const project = await window.DB.getProject(jobNo);
        if(project) {
            let siteData = await window.DB.getSiteData(jobNo);
            if (!siteData) {
                const boqTemplate = (window.FINANCIAL_DATA && window.FINANCIAL_DATA.boq) ? JSON.parse(JSON.stringify(window.FINANCIAL_DATA.boq)) : [];
                siteData = { jobNo: jobNo, status: 'Pending Start', boq: boqTemplate };
                await window.DB.putSiteData(siteData);
            }
            DOMElements.detailsProjectName.textContent = project.projectDescription;
            DOMElements.backToGlobalBtn.style.display = 'block';
            
            // Render all modules manually since UI row click didn't happen
            RfiModule.render(jobNo, DOMElements.rfiTableBody, AppState.currentUserRole);
            MomModule.renderList(jobNo, DOMElements.momList);
            BoqModule.render(jobNo, getBoqElements());
            MaterialsModule.render(jobNo, DOMElements.materialTableBody);
            BulletinModule.render(jobNo, DOMElements.bulletinFeed);
            SubcontractorModule.render(jobNo, DOMElements.subcontractorList);
            
            const schedule = await ScheduleModule.render(jobNo);
            renderFloorSelector();
            ToolsModule.renderResourceCalculator(jobNo, { tableBody: document.getElementById('resource-calculator-body') }, schedule);
            
            
            toggleTabsForView(true);
        }
    }
}

async function renderProjectList() {
    DOMElements.projectListBody.innerHTML = '';
    const allProjects = await window.DB.getAllProjects();
    const allSiteData = await window.DB.getAllSiteData();
    const siteDataMap = allSiteData.reduce((acc, u) => ({ ...acc, [u.jobNo]: u }), {});

    const filteredProjects = allProjects.filter(p => {
        if (AppState.accessibleProjects.length > 0) return AppState.accessibleProjects.includes(p.jobNo);
        if (AppState.currentProjectFilter) return (p.clientName + p.projectDescription).toLowerCase().includes(AppState.currentProjectFilter);
        return true;
    });

    if(filteredProjects.length === 0) DOMElements.projectListBody.innerHTML = '<tr><td colspan="4">No projects found.</td></tr>';

    filteredProjects.forEach(p => {
        let siteData = siteDataMap[p.jobNo] || { status: 'Pending Start', progress: 0 };
        const row = DOMElements.projectListBody.insertRow();
        row.dataset.jobNo = p.jobNo;
        row.innerHTML = `<td>${p.jobNo}</td><td>${p.projectDescription}<br><small>${p.clientName}</small></td><td>${p.plotNo}</td><td>${siteData.status} (${siteData.progress}%)</td>`;
    });
}

function showGlobalView() {
    AppState.currentJobNo = null;
    DOMElements.detailsProjectName.textContent = "All Projects Calendar";
    DOMElements.backToGlobalBtn.style.display = 'none';
    renderCalendar();
    MomModule.renderTaskFollowUp(null, DOMElements.momList);
    toggleTabsForView(false);
}

function toggleTabsForView(isProjectView) {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(btn => {
        if (!isProjectView && btn.dataset.tab !== 'calendar') btn.style.display = 'none';
        else btn.style.display = 'inline-block';
    });
    if (isProjectView) document.querySelector('[data-tab="status"]').click();
    else document.querySelector('[data-tab="calendar"]').click();
}

function handleTabClick(e) {
    if (e.target.matches('.tab-button')) {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${e.target.dataset.tab}-tab`).classList.add('active');
        
        if(e.target.dataset.tab === 'calendar') renderCalendar();
        if(e.target.dataset.tab === 'schedule') ScheduleModule.render(AppState.currentJobNo);
    }
}

async function handleGlobalClicks(e) {
    const target = e.target;
    
     // 1. Open Preview (from List or Calendar)
    if(target.classList.contains('preview-mom-btn') || target.classList.contains('mom')) {
        // For calendar events, class might be 'event-dot mom'
        const index = target.dataset.index || target.dataset.momIndex;
        const jobNo = target.dataset.jobNo || AppState.currentJobNo;
        
        if (index !== undefined && jobNo) {
            MomModule.renderPreview(jobNo, parseInt(index), getMomPreviewElements());
        }
    }

    // 2. Handle Buttons INSIDE Preview Modal Footer
    if (target.id === 'edit-this-mom-btn') {
        const index = parseInt(target.dataset.index);
        const jobNo = target.dataset.jobNo;
        document.getElementById('mom-preview-modal').style.display = 'none';
        MomModule.openModal(index, jobNo, getMomModalElements());
    }

    if (target.id === 'copy-mom-btn') {
        const index = parseInt(target.dataset.index);
        const jobNo = target.dataset.jobNo;
        document.getElementById('mom-preview-modal').style.display = 'none';
        MomModule.copyToNew(jobNo, index, getMomModalElements());
    }

    if (target.id === 'print-mom-btn') {
        const index = parseInt(target.dataset.index);
        const jobNo = target.dataset.jobNo;
        
        // Load data into the Printable Form Modal
        const project = await window.DB.getProject(jobNo);
        const siteData = await window.DB.getSiteData(jobNo);
        const momData = siteData.mom[index];

        if (window.SITE_FORM_TEMPLATES && window.SITE_FORM_TEMPLATES.printableMinutesOfMeeting) {
            const html = window.SITE_FORM_TEMPLATES.printableMinutesOfMeeting(momData, project);
            DOMElements.formModalBody.innerHTML = html;
            DOMElements.formModalTitle.textContent = `Printable: MoM Ref ${momData.ref}`;
            DOMElements.formModal.style.display = 'flex';
        } else {
            alert("Print template not found.");
        }
    }
    if (e.target.classList.contains('action-approve-btn')) {
        const { type, id, role } = e.target.dataset;
        const password = prompt(`Enter Password for ${role}:`);
        if (await window.DB.verifyPassword(role, password)) {
            const siteData = await window.DB.getSiteData(AppState.currentJobNo);
            const listName = type === 'rfi' ? 'rfiLog' : 'materialLog';
            const item = siteData[listName].find(i => i.id === id);
            if (item) {
                if (!item.approvals) item.approvals = {};
                item.approvals[role] = { user: AppState.currentUserRole, date: new Date().toISOString() };
                await window.DB.putSiteData(siteData);
                alert("Approved!");
                AppContext.onUpdate(type);
            }
        } else {
            alert("Invalid Password");
        }
    }
    // MoM Preview
    if(e.target.classList.contains('preview-mom-btn')) {
        const index = e.target.dataset.index;
        const jobNo = e.target.dataset.jobNo;
        MomModule.openModal(index, jobNo, getMomModalElements());
    }
    // File Deletion
    if(e.target.classList.contains('thumbnail-delete-btn')) {
        e.stopPropagation();
        const id = parseInt(e.target.dataset.id);
        const type = e.target.dataset.type;
        if(confirm("Delete this file?")) {
            await window.DB.deleteFile(id);
            if(type === 'photo') renderFileGallery(DOMElements.photoGallery, 'site', 'photo', true);
            else renderFileGallery(DOMElements.siteDocGallery, 'site', 'document', true);
        }
    }
}

async function handleFileUpload(event, type) {
    if (!AppState.currentJobNo) return;
    for (const file of event.target.files) {
        const reader = new FileReader();
        reader.onload = async () => {
            await window.DB.addFile({
                jobNo: AppState.currentJobNo,
                source: 'site',
                type: type,
                name: (type === 'document' && DOMElements.docNameInput?.value) ? `${DOMElements.docNameInput.value} (${file.name})` : file.name,
                fileType: file.type,
                dataUrl: reader.result,
                timestamp: new Date().toISOString(),
                uploadStatus: DOMElements.siteStatusSelect.value
            });
            if(type === 'photo') renderFileGallery(DOMElements.photoGallery, 'site', 'photo', true);
            else renderFileGallery(DOMElements.siteDocGallery, 'site', 'document', true);
        };
        reader.readAsDataURL(file);
    }
}
// --- FIX PHOTO GALLERY RENDER ---
async function renderFileGallery(galleryEl, source, type, isDeletable) {
    galleryEl.innerHTML = '';
    if (!AppState.currentJobNo) return;
    let files = (await window.DB.getFiles(AppState.currentJobNo, source)).filter(f => !type || f.type === type);
    
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'thumbnail-container';
        
        let content;
        if (type === 'photo' && file.dataUrl) {
            // FIX: Use IMG tag for photos
            content = `<img src="${file.dataUrl}" class="thumbnail" alt="${file.name}">`;
        } else {
            content = `<div class="thumbnail file-icon">${file.name}</div>`;
        }

        div.innerHTML = `${content}
            <div class="caption" style="font-size:0.8em; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
            ${isDeletable ? `<div class="thumbnail-delete-btn" data-id="${file.id}" data-type="${type}">x</div>` : ''}`;
        galleryEl.appendChild(div);
    });
}
async function renderFileGalleryx(galleryEl, source, type, isDeletable) {
    galleryEl.innerHTML = '';
    if (!AppState.currentJobNo) return;
    let files = (await window.DB.getFiles(AppState.currentJobNo, source)).filter(f => !type || f.type === type);
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'thumbnail-container';
        div.innerHTML = `<div class="thumbnail file-icon">${file.name}</div>${isDeletable ? `<div class="thumbnail-delete-btn" data-id="${file.id}" data-type="${type}">x</div>` : ''}`;
        galleryEl.appendChild(div);
    });
}

async function renderMasterDocsByCategory(cats, gallery) {
    gallery.innerHTML = '';
    if(!AppState.currentJobNo) return;
    const files = (await window.DB.getFiles(AppState.currentJobNo, 'master')).filter(f => cats.includes(f.category));
    files.forEach(f => {
         const div = document.createElement('div');
         div.className = 'thumbnail-container read-only';
         div.innerHTML = `<div class="thumbnail file-icon">${f.name}</div>`;
         gallery.appendChild(div);
    });
}

async function updateStatus() {
    if (!AppState.currentJobNo) return;
    let siteData = await window.DB.getSiteData(AppState.currentJobNo);
    siteData.status = DOMElements.siteStatusSelect.value;
    await window.DB.putSiteData(siteData);
    renderProjectList();
}
async function handleFormButtonClick(e) {
    if(!e.target.matches('.form-btn')) return;
    if(!AppState.currentJobNo) return alert("Select a project");
    
    const formType = e.target.dataset.form;
    const project = await window.DB.getProject(AppState.currentJobNo);
    const siteData = await window.DB.getSiteData(AppState.currentJobNo);
    
    // Set Modal Title
    DOMElements.formModalTitle.textContent = e.target.innerText;
    
    try {
        // Fetch Form Template
        const response = await fetch(`forms/${formType}.html`);
        if(!response.ok) throw new Error("Form template not found");
        let htmlContent = await response.text();

        // --- DYNAMIC DATA INJECTION ---
        
        // 1. Consultant Logo (Top Left usually)
        // Check if LOGO_svgBASE64 exists (from logo_base64.js), otherwise fallback
        const logoSrc = (typeof LOGO_svgBASE64 !== 'undefined') ? LOGO_svgBASE64 : '';
        const logoHtml = logoSrc ? `<img src="${logoSrc}" style="max-height:60px; max-width:200px; margin-bottom:10px;">` : '';

        // Inject Logo at the start of .form-container if not already present
        // Or specific placeholder like [Consultant Logo]
        if (htmlContent.includes('<div class="form-container">')) {
             htmlContent = htmlContent.replace('<div class="form-container">', `<div class="form-container"><div style="text-align:left;">${logoHtml}</div>`);
        }

        // 2. Project Details Replacement
        htmlContent = htmlContent
            .replace(/\[Project Name\]/g, project.projectDescription || 'N/A')
            .replace(/\[Project Description\]/g, project.projectDescription || 'N/A') // Alias
            .replace(/\[Plot No\]/g, project.plotNo || 'N/A')
            .replace(/\[Client Name\]/g, project.clientName || 'N/A')
            .replace(/\[Contractor Name\]/g, siteData.contractorName || 'Main Contractor')
            .replace(/\[Consultant Name\]/g, 'Chawla Architectural & Consulting Engineers');

        // Render
        DOMElements.formModalBody.innerHTML = htmlContent;
        DOMElements.formModal.style.display = 'flex';

    } catch (error) {
        console.error("Error loading form:", error);
        DOMElements.formModalBody.innerHTML = `<p style="color:red">Error loading form template: ${error.message}</p>`;
        DOMElements.formModal.style.display = 'flex';
    }
}
async function handleFormButtonClickxx(e) {
    if(!e.target.matches('.form-btn')) return;
    if(!AppState.currentJobNo) return alert("Select a project");
    const formType = e.target.dataset.form;
    const project = await window.DB.getProject(AppState.currentJobNo);
    DOMElements.formModalTitle.textContent = e.target.innerText;
    DOMElements.formModalBody.innerHTML = `<h3>${project.projectDescription}</h3><p>Template for ${formType} loaded here...</p>`;
    DOMElements.formModal.style.display = 'flex';
}
//currentJobNo
// --- CALENDAR LOGIC ---
    async function renderCalendar() {
        DOMElements.monthYearDisplay.textContent = AppState.calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
		
        const grid = DOMElements.calendarGridBody;
        grid.innerHTML = '';
        const allEvents = {};

        const addEvent = (date, type, text, color = null, momIndex = null, jobNo = null) => {
            const dateKey = new Date(date).toDateString();
            if (!allEvents[dateKey]) allEvents[dateKey] = [];
            if (!allEvents[dateKey].some(e => e.type === type && e.text === text && e.jobNo === jobNo)) {
                allEvents[dateKey].push({ type, text, color, momIndex, jobNo });
            }
        };
        
        const allHolidays = await window.DB.getAllHolidays();
        allHolidays.forEach(holiday => addEvent(holiday.date, 'holiday', holiday.name));
        const allStaffLeaves = await DB.getAll('staffLeaves');
        allStaffLeaves.forEach(leave => {
            let currentDate = new Date(leave.startDate + 'T00:00:00'); // Ensure correct date parsing
            const endDate = new Date(leave.endDate + 'T00:00:00');
            // Loop through each day of the leave period
            while (currentDate <= endDate) {
                addEvent(currentDate, 'leave', `On Leave: ${leave.staffName}`);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        if (AppState.currentJobNo) {
            const project = await window.DB.getProject(AppState.currentJobNo);
            const siteData = await window.DB.getSiteData(AppState.currentJobNo);
            (siteData.statusLog || []).forEach(log => addEvent(log.date, 'status', `Status: ${log.status}`));
            (siteData.mom || []).forEach((mom, index) => addEvent(mom.date, 'mom', `MoM: Ref ${mom.ref || 'N/A'}`, null, index, AppState.currentJobNo));
            if (project.projectType === 'Villa') {
                const dynamicSchedule = await getProjectSchedule(project, siteData);
                dynamicSchedule.forEach(task => {
                    for (let d = new Date(task.start + 'T00:00:00'); d <= new Date(task.end + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
                        addEvent(d, 'gantt-task', task.name);
                    }
                });
            }
        } else {
            const allProjects = await DB.getAllProjects();
            const allSiteData = await DB.getAllSiteData();
            for (const project of allProjects) {
                 const siteData = allSiteData.find(d => d.jobNo === project.jobNo) || {};
                const color = getProjectColor(project.jobNo);
                (siteData.statusLog || []).forEach(log => addEvent(log.date, 'status', `${project.jobNo}: ${log.status}`, color));
                (siteData.mom || []).forEach((mom, index) => addEvent(mom.date, 'mom', `${project.jobNo}: MoM ${mom.ref || 'N/A'}`, color, index, project.jobNo));
                if (project.projectType === 'Villa') {
                    const dynamicSchedule = await getProjectSchedule(project, siteData);
                    dynamicSchedule.forEach(task => {
                         for (let d = new Date(task.start + 'T00:00:00'); d <= new Date(task.end + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
                            addEvent(d, 'gantt-task', `${project.jobNo}: ${task.name}`, color);
                        }
                    });
                }
            }
        }

        const year = AppState.calendarDate.getFullYear(), month = AppState.calendarDate.getMonth();
        const startDayOfWeek = new Date(year, month, 1).getDay();
        const currentDay = new Date(year, month, 1 - startDayOfWeek);
        for (let i = 0; i < 42; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            const dayKey = currentDay.toDateString();
            if (currentDay.getMonth() !== month) dayCell.classList.add('other-month');
            dayCell.innerHTML = `<div class="day-number">${currentDay.getDate()}</div><div class="day-events"></div>`;
            const eventsContainer = dayCell.querySelector('.day-events');
            if (allEvents[dayKey]) {
                allEvents[dayKey].sort((a,b) => a.type === 'holiday' ? -1 : 1).forEach(event => {
                    const eventEl = document.createElement('span');
                    eventEl.className = `${event.type.includes('gantt') ? 'event-bar' : 'event-dot'} ${event.type}`;
                    eventEl.textContent = event.text;
                    eventEl.title = event.text;
                    if (event.color) eventEl.style.backgroundColor = event.color;
                    if (event.type === 'mom' && event.momIndex !== null) {
                        eventEl.dataset.momIndex = event.momIndex;
                        eventEl.dataset.jobNo = event.jobNo;
                        eventEl.classList.add('clickable-event');
                    }
                    eventsContainer.appendChild(eventEl);
                });
            }
            grid.appendChild(dayCell);
            currentDay.setDate(currentDay.getDate() + 1);
        }
    }
async function renderCalendarxxx() {
    DOMElements.monthYearDisplay.textContent = AppState.calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const grid = DOMElements.calendarGridBody;
    grid.innerHTML = '';
    
    const year = AppState.calendarDate.getFullYear();
    const month = AppState.calendarDate.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for(let i=0; i<startDay; i++) grid.appendChild(document.createElement('div')); 

    for(let i=1; i<=daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.innerHTML = `<div class="day-number">${i}</div>`;
        grid.appendChild(dayCell);
    }
}

function changeMonth(offset) {
    AppState.calendarDate.setMonth(AppState.calendarDate.getMonth() + offset);
    renderCalendar();
}

 async function handleLoadHolidays() {
      alert ('countryCode0');
        const countryCode = DOMElements.holidayCountrySelect.value;
        alert ('countryCode');
        alert (countryCode);
        const startYear = new Date().getFullYear();
        const yearsToFetch = Array.from({ length: 10 }, (_, i) => startYear + i);
        
        alert(`Loading holidays for ${countryCode} for the next 10 years. This may take a moment...`);
        
        try {
            const existingHolidays = await DB.getAllHolidays();
            for (const year of yearsToFetch) {
                const alreadyExists = existingHolidays.some(h => h.countryCode === countryCode && h.year === year);
                if (alreadyExists) {
                    console.log(`Holidays for ${countryCode}/${year} already in DB. Skipping.`);
                    continue;
                }
                
                const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
                if (response.ok) {
                    const holidays = await response.json();
                    if (holidays && holidays.length > 0) {
                        await window.DB.addHolidays(holidays, countryCode, year);
                    }
                } else {
                    console.warn(`Could not fetch holidays for ${year}: ${response.statusText}`);
                }
            }
            alert("Holidays loaded successfully!");
            await renderCalendar();
        } catch (error) {
            console.error("Error loading holidays:", error);
            alert("An error occurred while loading holidays. Please check the console.");
        }
    }
// --- HOLIDAY LOGIC ---
    async function populateHolidayCountries() {
        try {
            const response = await fetch('https://date.nager.at/api/v3/AvailableCountries');
            if (!response.ok) throw new Error('Failed to fetch countries');
            const countries = await response.json();
            const select = DOMElements.holidayCountrySelect;
            select.innerHTML = countries.map(c => `<option value="${c.countryCode}">${c.name}</option>`).join('');
            select.value = 'AE';
        } catch (error) {
            console.error('Could not load holiday countries:', error);
            DOMElements.holidayCountrySelect.innerHTML = '<option value="AE">United Arab Emirates</option><option value="US">United States</option>';
        }
    }