// --- START OF FILE js/site_app.js ---

let currentUserRole = null;
let currentProjectFilter = '';
let accessibleProjects = [];   // List of JobNos the user is allowed to access
let currentJobNo = null;
let calendarDate = new Date();
// 1. Add these variables at the top
let simulationInterval = null;
let simulationSpeed = 100; // ms per day
// let UrbanAxisSchedule = null;
let specificProjectAccess = null; // New global to track if a specific project is locked
let currentFloorFilter = 'all'; // New state for floor filtering
// Hardcoded defaults for fallback if DB is empty (should match Tools tab defaults)



// --- TEMPLATES ---
    const SITE_FORM_TEMPLATES = {
        printableMinutesOfMeeting: (momData, projectData) => {
            const attendeesHtml = (momData.attendees || []).map((p, i) => `<tr><td>${i + 1}</td><td>${p.name || ''} (${p.position || ''})</td><td>${p.company || ''}</td></tr>`).join('');
            const actionsHtml = (momData.actions || []).map((a, i) => `<tr><td>${i + 1}</td><td>${a.desc || ''}</td><td>${a.by || ''}</td><td>${a.date || ''}</td><td>${a.status || ''}</td></tr>`).join('');
            const nextMeetingDate = momData.nextMeeting ? new Date(momData.nextMeeting).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) : 'To be confirmed';
            return `<div class="doc-header"><div class="logo">a</div><div class="company-name"><div class="arabic-name">شاولا للهندسة المعمارية والاستشارية</div><h1>Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS</h1></div></div><h2 style="text-align:center;">MINUTES OF MEETING</h2><table class="output-table" style="margin-bottom: 20px;"><tr><th style="width:25%;">Meeting Date:</th><td>${new Date(momData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td><th style="width:25%;">MoM Ref:</th><td>${momData.ref || 'N/A'}</td></tr><tr><th>Location:</th><td>${momData.location || 'N/A'}</td><th>Project:</th><td>${projectData.projectDescription || 'N/A'}</td></tr><tr><th>Client:</th><td colspan="3">${projectData.clientName || 'N/A'}</td></tr></table><h4>Attendees:</h4><table class="output-table"><thead><tr><th style="width:5%;"></th><th style="width:50%;">Name (Position)</th><th>Company</th></tr></thead><tbody>${attendeesHtml}</tbody></table><br><p><strong>The meeting was scheduled by Consultant for monitoring weekly activities & co-ordination between all Civil Works</strong></p><br><div style="text-align:center; padding: 10px; border: 1px solid #ccc; margin-bottom: 20px;"><strong>Next Weekly Progress Meeting will be on ${nextMeetingDate}</strong><br><small>${momData.nextMeetingNotes || '(To be confirmed a day before)'}</small></div><table class="output-table"><thead><tr><th style="width:5%;">S.No.</th><th style="width:40%;">Description / Notes</th><th>Action By</th><th>Target Date</th><th>Remarks / Status</th></tr></thead><tbody>${actionsHtml}</tbody></table><div class="preview-footer" style="position: absolute; bottom: 20px;">Prepared By:</div>`;
        },
        previewMinutesOfMeeting: (momData, projectData) => {
            const nextMeetingDate = momData.nextMeeting ? new Date(momData.nextMeeting).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) : 'To be confirmed';
            return `<style>.preview-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-bottom: 15px; } .preview-table th, .preview-table td { border: 1px solid #ddd; padding: 5px; text-align: left; } .preview-table th { background: #f7f7f7; width: 25%; }</style><h3>Project Details</h3><table class="preview-table"><tr><th>Meeting Date:</th><td>${new Date(momData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr><tr><th>MoM Ref:</th><td>${momData.ref || 'N/A'}</td></tr><tr><th>Location:</th><td>${momData.location || 'N/A'}</td></tr><tr><th>Project:</th><td>${projectData.projectDescription || 'N/A'}</td></tr></table><h4>Attendees:</h4><table class="preview-table"><thead><tr><th>Name (Position)</th><th>Company</th></tr></thead><tbody>${(momData.attendees || []).map(p => `<tr><td>${p.name || ''} (${p.position || ''})</td><td>${p.company || ''}</td></tr>`).join('')}</tbody></table><h4>Action Items:</h4><table class="preview-table"><thead><tr><th>Description</th><th>Action By</th><th>Target</th><th>Status</th></tr></thead><tbody>${(momData.actions || []).map(a => `<tr><td>${a.desc || ''}</td><td>${a.by || ''}</td><td>${a.date || ''}</td><td>${a.status || ''}</td></tr>`).join('')}</tbody></table><p><strong>Next Meeting:</strong> ${nextMeetingDate} <small>${momData.nextMeetingNotes || ''}</small></p>`;
        }
    };
    // --- DOM CACHE ---
    document.addEventListener('DOMContentLoaded', async () => {
    const DOMElements = {
        // ... (Existing Elements)
        mainSiteContainer: document.getElementById('main-site-container'), // NEW
        loginModal: document.getElementById('login-modal'), // Ensure this is cached
         logoutBtn: document.getElementById('logout-btn'), // NEW
        loadDataBtn: document.getElementById('load-data-btn'),
        saveDataBtn: document.getElementById('save-data-btn'),
        importLeaveBtn: document.getElementById('import-leave-btn'),
        projectFileInput: document.getElementById('project-file-input'),
        leaveFileInput: document.getElementById('leave-file-input'),
        projectListBody: document.getElementById('project-list-body'),
        detailsView: document.getElementById('project-details-view'),
        detailsProjectName: document.getElementById('details-project-name'),
        detailsProjectInfo: document.getElementById('details-project-info'),
        backToGlobalBtn: document.getElementById('back-to-global-btn'),
        controlTabsContainer: document.getElementById('control-tabs-container'),
        siteStatusSelect: document.getElementById('site-status-select'),
        photoUploadInput: document.getElementById('photo-upload-input'),
        photoGallery: document.getElementById('photo-gallery'),
        docUploadInput: document.getElementById('doc-upload-input'),
        siteDocGallery: document.getElementById('site-doc-gallery'),
        projectDocsGallery: document.getElementById('project-docs-gallery'),
        tenderDocsGallery: document.getElementById('tender-docs-gallery'),
        vendorListsGallery: document.getElementById('vendor-lists-gallery'),
        docNameInput: document.getElementById('doc-name-input'),
        formModal: document.getElementById('form-modal'),
        formModalCloseBtn: document.getElementById('form-modal-close-btn'),
        formModalTitle: document.getElementById('form-modal-title'),
        formModalBody: document.getElementById('form-modal-body'),
        formModalFooter: document.getElementById('form-modal-footer'),
        formsTab: document.getElementById('forms-tab'),
        saveFormPdfBtn: document.getElementById('save-form-pdf-btn'),
        boqTableBody: document.getElementById('boq-table-body'),
        boqTotalValue: document.getElementById('boq-total-value'),
        boqWorkDoneValue: document.getElementById('boq-work-done-value'),
        boqProgressBar: document.getElementById('boq-progress-bar'),
        boqProgressPercentage: document.getElementById('boq-progress-percentage'),
        generatePaymentCertBtn: document.getElementById('generate-payment-cert-btn'),
        addBoqItemBtn: document.getElementById('add-boq-item-btn'),
        newMomBtn: document.getElementById('new-mom-btn'),
        momList: document.getElementById('mom-list'),
        momModal: document.getElementById('mom-modal'),
        momModalCloseBtn: document.getElementById('mom-modal-close-btn'),
        momModalTitle: document.getElementById('mom-modal-title'),
        momEditIndex: document.getElementById('mom-edit-index'),
        momRef: document.getElementById('mom-ref'),
        momDate: document.getElementById('mom-date'),
        momLocation: document.getElementById('mom-location'),
        momAttendeesTbody: document.getElementById('mom-attendees-tbody'),
        addAttendeeBtn: document.getElementById('add-attendee-btn'),
        momStatusSummary: document.getElementById('mom-status-summary'),
        momActionsTbody: document.getElementById('mom-actions-tbody'),
        addActionBtn: document.getElementById('add-action-btn'),
        momNextMeeting: document.getElementById('mom-next-meeting'),
        momNextMeetingNotes: document.getElementById('mom-next-meeting-notes'),
        saveMomDataBtn: document.getElementById('save-mom-data-btn'),
        deleteMomBtn: document.getElementById('delete-mom-btn'),
        calendarGridBody: document.getElementById('calendar-grid-body'),
        monthYearDisplay: document.getElementById('month-year-display'),
        prevMonthBtn: document.getElementById('prev-month-btn'),
        nextMonthBtn: document.getElementById('next-month-btn'),
        resourceCalculatorBody: document.getElementById('resource-calculator-body'),
        resourceDayRate: document.getElementById('resource-day-rate'),
        generateProjectReportBtn: document.getElementById('generate-project-report-btn'),
        holidayCountrySelect: document.getElementById('holiday-country-select'),
        loadHolidaysBtn: document.getElementById('load-holidays-btn'),
        vendorSearchInput: document.getElementById('vendor-search-input'),
        vendorSearchResults: document.getElementById('vendor-search-results'),
        momPreviewModal: document.getElementById('mom-preview-modal'),
        momPreviewModalCloseBtn: document.getElementById('mom-preview-modal-close-btn'),
        momPreviewModalTitle: document.getElementById('mom-preview-modal-title'),
        momPreviewModalBody: document.getElementById('mom-preview-modal-body'),
        momPreviewModalFooter: document.getElementById('mom-preview-modal-footer'),
        
        // --- NEW ELEMENTS FOR RFI/MATERIALS ---
        //loginModal: document.getElementById('login-modal'),
        newMaterialSubmittalBtn: document.getElementById('new-material-submittal-btn'),
        materialApprovalList: document.getElementById('material-approval-list'),
        addSubcontractorBtn: document.getElementById('add-subcontractor-btn'),
        subcontractorList: document.getElementById('subcontractor-list'),
        longLeadTableBody: document.getElementById('long-lead-table-body'),
        newRfiBtn: document.getElementById('new-rfi-btn'),
        rfiLogList: document.getElementById('rfi-log-list'),
        nocTracker: document.getElementById('noc-tracker'),
        bulletinSubject: document.getElementById('bulletin-subject'),
        bulletinDetails: document.getElementById('bulletin-details'),
        bulletinAssignedTo: document.getElementById('bulletin-assigned-to'),
         postBulletinBtn: document.getElementById('post-bulletin-btn'),
        bulletinFeed: document.getElementById('bulletin-feed'),
        performLoginBtn: document.getElementById('perform-login-btn'),
        loginRoleSelect: document.getElementById('login-role'),
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        loginFilterKey: document.getElementById('login-filter-key'),
        loginErrorMsg: document.getElementById('login-error'),
         downloadProjectZipBtn: document.getElementById('download-project-zip-btn'),

        // OVERLAY GANTT ELEMENTS
        addOverlayTaskBtn: document.getElementById('add-overlay-task-btn'),
        forceRenderScheduleBtn: document.getElementById('force-render-schedule-btn'), // MODIFICATION
        overlayTaskModal: document.getElementById('overlay-task-modal'),
        overlayTaskModalCloseBtn: document.getElementById('overlay-task-modal-close-btn'),
        overlayTaskModalTitle: document.getElementById('overlay-task-modal-title'),
        overlayTaskEditId: document.getElementById('overlay-task-edit-id'),
        overlayTaskName: document.getElementById('overlay-task-name'),
        overlayTaskType: document.getElementById('overlay-task-type'),
        overlayTaskStart: document.getElementById('overlay-task-start'),
        overlayTaskDuration: document.getElementById('overlay-task-duration'),
        overlayTaskResponsible: document.getElementById('overlay-task-responsible'),
        overlayTaskVendor: document.getElementById('overlay-task-vendor'),
        overlayTaskLabor: document.getElementById('overlay-task-labor'),
        overlayTaskMaterials: document.getElementById('overlay-task-materials'),
        overlayTaskDependencies: document.getElementById('overlay-task-dependencies'),
        overlayTaskReason: document.getElementById('overlay-task-reason'),
        overlayTaskIsCritical: document.getElementById('overlay-task-is-critical'),
        welcomeUserMsg: document.getElementById('welcome-user-msg'), // NEW
        
        rfiTableBody: document.getElementById('rfi-table-body'),
        createRfiBtn: document.getElementById('create-rfi-btn'),
        materialTableBody: document.getElementById('material-table-body'),
        createMaterialBtn: document.getElementById('create-material-btn'),
   
// New Task Modal
        newTaskModal: document.getElementById('new-task-modal'),
        newTaskCloseBtn: document.getElementById('new-task-close-btn'),
        saveNewTaskBtn: document.getElementById('save-new-task-btn'),
        addCustomTaskBtn: document.getElementById('add-custom-task-btn'),
          saveOverlayTaskBtn: document.getElementById('save-overlay-task-btn'),
        deleteOverlayTaskBtn: document.getElementById('delete-overlay-task-btn'),
        floorSelectorContainer: document.getElementById('floor-selector-container')
         };
        
    

    

    // --- INITIALIZATION ---
    try {
        await DB.init();
        setupEventListeners();
        populateHolidayCountries();
        
        // Show Login Modal Initially
        if(DOMElements.loginModal) {
            DOMElements.loginModal.style.display = 'flex';
            // Ensure main container is hidden
            DOMElements.mainSiteContainer.style.display = 'none';
            DOMElements.logoutBtn.style.display = 'none'; // Hide Logout initially
        } else {
            // Fallback for dev if modal removed
            DOMElements.mainSiteContainer.style.display = 'block';
            await renderProjectList();
            showGlobalView();
            } 
    } catch (error) {
            console.error("Fatal Error initializing Site App:", error);
            document.body.innerHTML = `<div style='padding:20px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not initialize the database. Please clear your cache and try again.</p><p><i>Error: ${error.message}</i></p></div>`;
        }
   

    // --- CORE EVENT LISTENERS ---
    function setupEventListeners() {
        // Login Logic
        DOMElements.performLoginBtn?.addEventListener('click', async () => {
            const role = DOMElements.loginRoleSelect.value;
          const inputUser = DOMElements.loginUsername.value.trim();
            const inputPass = DOMElements.loginPassword.value.trim();
               const filterKey = DOMElements.loginFilterKey.value.toLowerCase().trim();

            const settings = await DB.getSetting('access_control');
            let storedUser, storedPass;

            // We will collect ALL valid projects for this user
            let validProjects = [];
            let isGlobalLogin = false;
             let loginSuccessful = false;
             let specificProjectAccess = null; // Store jobNo if a specific project credential matched

            // 1. CHECK PROJECT SPECIFIC CREDENTIALS
            const allProjects = await DB.getAllProjects();
            
            for (const proj of allProjects) {
                if (proj.accessCredentials && proj.accessCredentials[role]) {
                    const creds = proj.accessCredentials[role];
                    if (creds.user === inputUser && creds.pass === inputPass) {
                        loginSuccessful = true;
                         validProjects.push(proj.jobNo);
                    }
                }
            }

 // 2. CHECK GLOBAL CREDENTIALS (If no project specific match)
            if (validProjects.length === 0) {
                // const settings = await DB.getSetting('access_control');
                let storedUser, storedPass;

                if (settings && settings.credentials && settings.credentials[role]) {
                    storedUser = settings.credentials[role].user;
                    storedPass = settings.credentials[role].pass;
                } else {
                    storedUser = DEFAULT_CREDENTIALS[role].user;
                    storedPass = DEFAULT_CREDENTIALS[role].pass;
                }

                if (inputUser === storedUser && inputPass === storedPass) {
                     loginSuccessful = true;
                    isGlobalLogin = true;
                }
            }

            if (validProjects.length > 0 || isGlobalLogin) {
                currentUserRole = role;
                
                // If specific project access, force filter to that project ID
                if (isGlobalLogin) {
                    // Global user: Access defined by role filter (e.g. Contractor sees all 'contractor' name matches)
                    currentProjectFilter = filterKey;
                    accessibleProjects = []; // Empty means all/filtered by search
                } else {
                    // Project-specific user: Access strictly limited to the matched projects
                    accessibleProjects = validProjects;
                    currentProjectFilter = ''; // We rely on accessibleProjects list
                }
                if (DOMElements.welcomeUserMsg) {
                    const roleName = DOMElements.loginRoleSelect.options[DOMElements.loginRoleSelect.selectedIndex].text;
                    DOMElements.welcomeUserMsg.textContent = `Welcome, ${roleName} `;
                    DOMElements.welcomeUserMsg.style.display = 'inline-block';
                }

                // Successful Login
                DOMElements.loginModal.style.display = 'none';
                DOMElements.mainSiteContainer.style.display = 'block'; // Show Main Content
                DOMElements.logoutBtn.style.display = 'inline-block'; // Show Logout
                
                 
                await renderProjectList();

                // Auto-load logic:
                // If exactly one project is accessible (via specific creds), load it.
                // Otherwise, show the list (Global View).
                if (accessibleProjects.length === 1) {
                     await autoLoadProject(accessibleProjects[0]);
                } else {
                    showGlobalView();
                }
            } else {
                DOMElements.loginErrorMsg.style.display = 'block';
                DOMElements.loginErrorMsg.textContent = "Invalid username or password.";
            }
        });
        // Logout Logic
        DOMElements.logoutBtn?.addEventListener('click', () => {
            // 1. Reset State
            currentUserRole = null;
            currentProjectFilter = '';
            specificProjectAccess = null;
            currentJobNo = null;

            // 2. Clear Inputs (Optional for security)
            DOMElements.loginUsername.value = '';
            DOMElements.loginPassword.value = '';
            DOMElements.loginFilterKey.value = '';
            DOMElements.loginErrorMsg.style.display = 'none';

            // 3. Toggle UI
            DOMElements.mainSiteContainer.style.display = 'none';
            DOMElements.loginModal.style.display = 'flex';
            DOMElements.logoutBtn.style.display = 'none';
            DOMElements.welcomeUserMsg.style.display = 'none';
        });

        // Data IO
        DOMElements.loadDataBtn.addEventListener('click', () => DOMElements.projectFileInput.click());
        DOMElements.importLeaveBtn.addEventListener('click', () => DOMElements.leaveFileInput.click());
        DOMElements.projectFileInput.addEventListener('change', handleProjectFileImport);
        DOMElements.leaveFileInput.addEventListener('change', handleLeaveImport);
        DOMElements.saveDataBtn.addEventListener('click', saveSiteDataToXml);

        // Project Selection & Navigation
        DOMElements.projectListBody.addEventListener('click', handleProjectSelect);
         DOMElements.siteStatusSelect.addEventListener('change', updateStatus);
        DOMElements.backToGlobalBtn.addEventListener('click', showGlobalView);
        DOMElements.controlTabsContainer.addEventListener('click', handleTabClick);
 // New Task Modal
        DOMElements.addCustomTaskBtn.addEventListener('click', showNewTaskModal);
        DOMElements.newTaskCloseBtn.addEventListener('click', () => DOMElements.newTaskModal.style.display = 'none');
        DOMElements.saveNewTaskBtn.addEventListener('click', saveNewTask);

        // Floor Selector Delegation
        DOMElements.floorSelectorContainer.addEventListener('click', (e) => {
            if(e.target.classList.contains('floor-btn')) {
                document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFloorFilter = e.target.dataset.floor;
                renderGanttChart(); // Re-render with filter
            }
        });
        // Site Status & Files
        DOMElements.siteStatusSelect.addEventListener('change', updateStatus);
        DOMElements.photoUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'photo'));
        DOMElements.docUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'document'));
        DOMElements.controlTabsContainer.addEventListener('click', handleTabClick);
        // Forms & Modals
        DOMElements.formsTab.addEventListener('click', handleFormButtonClick);
        DOMElements.generatePaymentCertBtn.addEventListener('click', handleGeneratePaymentCertificate);
         if (DOMElements.generateProjectReportBtn) {
            DOMElements.generateProjectReportBtn.addEventListener('click', handleGenerateProjectReport);
        }

        if (DOMElements.vendorSearchInput) {
            DOMElements.vendorSearchInput.addEventListener('input', handleVendorSearch);
        }
        DOMElements.saveFormPdfBtn.addEventListener('click', handleSaveFormAsPdf);
        DOMElements.formModalCloseBtn.addEventListener('click', () => DOMElements.formModal.style.display = 'none');
        
        // BOQ
        const boqTab = document.getElementById('boq-tab');
        boqTab.addEventListener('blur', handleBoqChange, true);
        boqTab.addEventListener('click', (e) => { 
        handleBoqChange(e);
            if (e.target.matches('#add-boq-item-btn')) handleAddBoqItem(); 
            else if (e.target.matches('.delete-boq-item-btn')) {
                // Delete logic embedded in handleBoqChange or separate here? 
                // handleBoqChange handles edits, delete click handled inside it in original code structure
                // Let's rely on handleBoqChange being triggered by blur or we can add explicit delete handler
            }else handleBoqChange(e);
        });
         DOMElements.momList.addEventListener('click', handleEventClick);
         DOMElements.calendarGridBody.addEventListener('click', handleEventClick);
          DOMElements.formModal.addEventListener('click', handleEventClick);
        boqTab.addEventListener('click', handleBoqChange); // For delete button clicks
        DOMElements.generatePaymentCertBtn.addEventListener('click', handleGeneratePaymentCertificate);

        // MoM
         DOMElements.momPreviewModal.addEventListener('click', handleEventClick);

        DOMElements.newMomBtn.addEventListener('click', () => openMomModal(null));
        DOMElements.momModalCloseBtn.addEventListener('click', () => DOMElements.momModal.style.display = 'none');
        DOMElements.momPreviewModalCloseBtn.addEventListener('click', () => DOMElements.momPreviewModal.style.display = 'none');
        DOMElements.saveMomDataBtn.addEventListener('click', saveMomData);
        DOMElements.deleteMomBtn.addEventListener('click', deleteMomData);
        DOMElements.addAttendeeBtn.addEventListener('click', () => addAttendeeRow());
        DOMElements.addActionBtn.addEventListener('click', () => addActionRow());
        DOMElements.momList.addEventListener('click', handleEventClick); // For viewing MoM from list

        // RFI & Materials Creation
        DOMElements.createRfiBtn?.addEventListener('click', handleCreateRfi);
        DOMElements.createMaterialBtn?.addEventListener('click', handleCreateMaterial);

        // Calendar & Tools
        DOMElements.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        DOMElements.nextMonthBtn.addEventListener('click', () => changeMonth(1));
        DOMElements.resourceDayRate.addEventListener('input', updateResourceTotals);
        DOMElements.resourceCalculatorBody.addEventListener('input', e => { if (e.target.matches('.man-days-input')) { updateResourceTotals(); } });
        
        DOMElements.loadHolidaysBtn.addEventListener('click', handleLoadHolidays);
        
       
        // NEW LISTENERS
        if (DOMElements.newMaterialSubmittalBtn) DOMElements.newMaterialSubmittalBtn.addEventListener('click', () => openMaterialModal(null));
        if (DOMElements.addSubcontractorBtn) DOMElements.addSubcontractorBtn.addEventListener('click', () => openSubcontractorModal(null));
        if (DOMElements.newRfiBtn) DOMElements.newRfiBtn.addEventListener('click', () => openRfiModal(null));
        if (DOMElements.postBulletinBtn) DOMElements.postBulletinBtn.addEventListener('click', handlePostBulletin);
        if (DOMElements.downloadProjectZipBtn) DOMElements.downloadProjectZipBtn.addEventListener('click', handleDownloadProjectFilesZip);
        
        // OVERLAY GANTT LISTENERS
        //DOMElements.addOverlayTaskBtn.addEventListener('click', () => openOverlayTaskModal(null));
        //DOMElements.forceRenderScheduleBtn.addEventListener('click', () => renderGanttChart(true)); // MODIFICATION
        //DOMElements.overlayTaskModalCloseBtn.addEventListener('click', () => DOMElements.overlayTaskModal.style.display = 'none');
        //DOMElements.saveOverlayTaskBtn.addEventListener('click', saveOverlayTask);
        DOMElements.generateProjectReportBtn?.addEventListener('click', handleGenerateProjectReport);
        DOMElements.vendorSearchInput?.addEventListener('input', handleVendorSearch);
        //DOMElements.deleteOverlayTaskBtn.addEventListener('click', deleteOverlayTask);

        // Global Event Delegation for Dynamic Elements (e.g., Approval Buttons)
         document.getElementById('mom-modal').addEventListener('click', (e) => { if(e.target.id === 'save-mom-data-btn') saveMomData(); });
        document.body.addEventListener('click', handleGlobalClicks);
    }
    function readFileAsDataURL(file) { return new Promise((resolve, reject) => 
    { 
    const reader = new FileReader(); 
    reader.onload = () => resolve(reader.result); 
    reader.onerror = (error) => reject(error); reader.readAsDataURL(file); 
    }); 
    }
    
    function getProjectColor(jobNo) { const colors = ['#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9']; let hash = 0; for (let i = 0; i < jobNo.length; i++) { hash = jobNo.charCodeAt(i) + ((hash << 5) - hash); } return colors[Math.abs(hash % colors.length)]; }

    // --- HELPER FUNCTIONS ---
    async function autoLoadProject(jobNo) {
        // Find the row in the rendered list (should be there due to filtering)
        const rows = Array.from(DOMElements.projectListBody.querySelectorAll('tr'));
        const targetRow = rows.find(r => r.dataset.jobNo === jobNo);
        
        if (targetRow) {
            // Trigger the selection logic manually passing the row element context
            // We mock the event object structure required by handleProjectSelect
            // await handleProjectSelect({ target: targetRow.cells[0] }); 
             await handleProjectSelect({ target: targetRow.cells[0], closest: () => targetRow }); 
        } else {
            // If render timing is off, fallback to direct load logic
            console.warn("Row not found in DOM, loading data directly.");
            currentJobNo = jobNo;
            const project = await DB.getProject(jobNo);
            if(project) {
                 // Initialize site data if missing (reuse logic from handleProjectSelect)
                let siteData = await DB.getSiteData(jobNo);
                if (!siteData) {
                    const boqTemplate = (window.FINANCIAL_DATA && window.FINANCIAL_DATA.boq) ? JSON.parse(JSON.stringify(FINANCIAL_DATA.boq)) : [];
                    siteData = { 
                        jobNo: jobNo, status: 'Pending Start', progress: 0, 
                        boq: boqTemplate, mom: [], paymentCertificates: [], statusLog: [], 
                        scheduleOverrides: [], rfiLog: [], materialLog: [] 
                    };
                    await DB.putSiteData(siteData);
                }
                
                // Manually update UI
                DOMElements.detailsProjectName.textContent = project.projectDescription;
                DOMElements.detailsProjectInfo.textContent = `Job: ${project.jobNo} | Plot: ${project.plotNo} | Client: ${project.clientName}`;
                DOMElements.backToGlobalBtn.style.display = 'block';
                DOMElements.siteStatusSelect.value = siteData.status;
                
                await renderFileGallery(DOMElements.photoGallery, 'site', 'photo', true);
                await renderFileGallery(DOMElements.siteDocGallery, 'site', 'document', true);
                await renderMasterDocsByCategory(['client_details', 'noc_copies', 'letters', 'other_uploads'], DOMElements.projectDocsGallery);
                await renderMasterDocsByCategory(['tender_documents'], DOMElements.tenderDocsGallery);
                await renderMasterDocsByCategory(['vendor_lists'], DOMElements.vendorListsGallery);
                
                await renderBoq();
                await renderMomList();
                await renderGanttChart();
                await renderRfiLog();
                await renderMaterialList();
                
                calendarDate = new Date();
                await renderCalendar();
                await renderResourceCalculator();
                
                toggleTabsForView(true);
            }
        }
    }
  
    

    // --- GLOBAL VIEW & NAVIGATION ---
    function showGlobalView() {
        currentJobNo = null;
        DOMElements.detailsProjectName.textContent = "All Projects Calendar";
        DOMElements.detailsProjectInfo.textContent = "Showing a combined view of all project events.";
        DOMElements.backToGlobalBtn.style.display = 'none';
        document.querySelectorAll('#project-list-body tr').forEach(r => r.classList.remove('selected'));
        toggleTabsForView(false);
        renderCalendar();
          renderMomTaskFollowup(); // Show follow-up list globally
    }

    function toggleTabsForView(isProjectView) {
        const tabsToToggle = ['status', 'project-docs', 'tender-docs', 'vendor-lists', 'site-docs', 'boq','subcontractors', 'long-lead','project-uploads', 'bulletin',         'schedule', 'tools', 'forms', 'rfi', 'materials'];
        DOMElements.controlTabsContainer.querySelectorAll('.tab-button').forEach(btn => {
            if (tabsToToggle.includes(btn.dataset.tab)) {
                btn.style.display = isProjectView ? 'inline-block' : 'none';
            }
        });
        if (isProjectView) {
            DOMElements.controlTabsContainer.querySelector('[data-tab="status"]').click();
        } else {
            DOMElements.controlTabsContainer.querySelector('[data-tab="calendar"]').click();
        }
    }
// --- DATA HANDLING & CORE LOGIC ---
    async function handleProjectFileImport(event) { const file = event.target.files[0]; if (!file) return; const xmlString = await file.text(); const parsedProjects = loadProjectsFromXmlString(xmlString); if (parsedProjects && Array.isArray(parsedProjects)) { if (confirm(`This will import/update ${parsedProjects.length} projects. Continue?`)) { for (const project of parsedProjects) { await DB.processProjectImport(project); } await renderProjectList(); alert(`Loaded ${parsedProjects.length} projects.`); } } else { alert('Could not parse project file.'); } event.target.value = ''; }
    
    async function saveSiteDataToXml() { const allSiteData = await DB.getAllSiteData(); if (allSiteData.length === 0) { alert("No site data to save."); return; } const dataToExport = []; for (const siteData of allSiteData) { const siteFiles = await DB.getFiles(siteData.jobNo, 'site'); const filesBase64 = siteFiles.map(f => ({ name: f.name, type: f.type, fileType: f.fileType, data: f.dataUrl })); dataToExport.push({ ...siteData, siteFiles: filesBase64 }); } const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<site_updates>\n${dataToExport.map(d => `  <update>${objectToXml(d)}</update>\n`).join('')}</site_updates>`; const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `SiteUpdates_${new Date().toISOString().split('T')[0]}.xml`; a.click(); URL.revokeObjectURL(a.href); alert("Site update file has been saved."); }
    async function updateStatus() { if (!currentJobNo) return; let siteData = await DB.getSiteData(currentJobNo); siteData.status = DOMElements.siteStatusSelect.value; await DB.putSiteData(siteData); renderProjectList(); }
       // async function handleFileUpload(event, type) { 
        // if (!currentJobNo) return; 
        // for (const file of event.target.files) { 
            // const dataUrl = await readFileAsDataURL(file); 
            // await DB.addFile({ jobNo: currentJobNo, source: 'site', type, name: file.name, fileType: file.type, dataUrl, timestamp: new Date().toISOString() }); 
        // } 
        // renderFileGallery(type === 'photo' ? DOMElements.photoGallery : DOMElements.siteDocGallery, 'site', type, true); 
    // }
     async function handleFileUpload(event, type) { if (!currentJobNo) return; for (const file of event.target.files) { const dataUrl = await readFileAsDataURL(file); const fileObject = { jobNo: currentJobNo, source: 'site', type: type, name: (type === 'document' && DOMElements.docNameInput.value) ? `${DOMElements.docNameInput.value} (${file.name})` : file.name, fileType: file.type, dataUrl, timestamp: new Date().toISOString() }; if (type === 'photo') { fileObject.uploadStatus = DOMElements.siteStatusSelect.value; } await DB.addFile(fileObject); } const galleryEl = type === 'photo' ? DOMElements.photoGallery : DOMElements.siteDocGallery; await renderFileGallery(galleryEl, 'site', type, true); if (type === 'document') DOMElements.docNameInput.value = ''; event.target.value = ''; }
       // async function deleteFilexx(id, type, gallery) { await DB.deleteFile(id); renderFileGallery(gallery, 'site', type, true); }
        async function deleteFile(id, type, galleryEl) { if (!currentJobNo) return; if (confirm(`Are you sure you want to delete this ${type}?`)) { await DB.deleteFile(id); await renderFileGallery(galleryEl, 'site', type, true); } }
    function handleTabClick(e) { 
        if (e.target.matches('.tab-button')) { 
            DOMElements.controlTabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active')); 
            e.target.classList.add('active'); 
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active')); 
            document.getElementById(`${e.target.dataset.tab}-tab`).classList.add('active'); 
        } 
    }

    // --- PROJECT RENDERING & SELECTION ---
    async function renderProjectList() {
        const tbody = DOMElements.projectListBody;
        const allProjects = await DB.getAllProjects();
        const allSiteData = await DB.getAllSiteData();
        const siteDataMap = allSiteData.reduce((acc, u) => ({ ...acc, [u.jobNo]: u }), {});
        
        tbody.innerHTML = '';
        
        const filteredProjects = allProjects.filter(p => {
            // 1. Check Project-Specific Credentials (strict filter)
            if (accessibleProjects.length > 0) {
                // If logged in with project-specific creds, ONLY show those projects
                return accessibleProjects.includes(p.jobNo);
            }

            // 2. Global Role Logic
            if (currentUserRole === 'contractor') {
                if (currentProjectFilter && (!p.contractor || !p.contractor.toLowerCase().includes(currentProjectFilter))) {
                     return false;
                }
            } else if (currentUserRole === 'client') {
                 if (currentProjectFilter && !p.clientName.toLowerCase().includes(currentProjectFilter)) {
                     return false;
                 }
            } else {
                 // Admin/Engineers: optional filter key
                 if (currentProjectFilter) {
                     const searchStr = (p.clientName + ' ' + (p.contractor||'') + ' ' + p.projectDescription).toLowerCase();
                     if (!searchStr.includes(currentProjectFilter)) return false;
                 }
            }
            return true;
        });
        if(filteredProjects.length === 0) {
             tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No projects match your login filter.</td></tr>';
             return;
        }

        filteredProjects.forEach(p => {
            let siteData = siteDataMap[p.jobNo] || { status: 'Pending Start', progress: 0 };
            const progress = siteData.progress || 0;
            const statusText = siteData.status || 'Pending Start';
            const statusClass = statusText.toLowerCase().replace(/ /g, '-');
            const row = tbody.insertRow();
            row.dataset.jobNo = p.jobNo;
            row.innerHTML = `<td>${p.jobNo}</td><td>${p.projectDescription}<br><small>${p.clientName}</small></td><td>${p.plotNo}</td><td><span class="status-${statusClass}">${statusText}</span><div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div></td>`;
        });
       
    }

    async function handleProjectSelect(event) {
       // const row = event.target.closest('tr');
       //const row = event.target ? event.target.closest('tr') : event.closest();
        const row = event.target.tagName === 'TR' ? event.target : event.target.closest('tr');
        if (!row || !row.dataset.jobNo) return;
        
        document.querySelectorAll('#project-list-body tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        
        currentJobNo = row.dataset.jobNo;
        const project = await DB.getProject(currentJobNo);
        let siteData = await DB.getSiteData(currentJobNo);
        // let UrbanAxisSchedule = null;
        // Init site data if missing
        if (!siteData) {
            const boqTemplate = (window.FINANCIAL_DATA && window.FINANCIAL_DATA.boq) ? JSON.parse(JSON.stringify(FINANCIAL_DATA.boq)) : [];
            siteData = { 
                jobNo: currentJobNo, status: 'Pending Start', progress: 0, 
                boq: boqTemplate, mom: [], paymentCertificates: [], statusLog: [], 
                scheduleOverrides: [], rfiLog: [], materialLog: [] 
            };
            await DB.putSiteData(siteData);
        }

        // Update UI Info
        DOMElements.detailsProjectName.textContent = project.projectDescription;
        DOMElements.detailsProjectInfo.textContent = `Job: ${project.jobNo} | Plot: ${project.plotNo} | Client: ${project.clientName}`;
        DOMElements.backToGlobalBtn.style.display = 'block';
        DOMElements.siteStatusSelect.value = siteData.status;
        
        // Render All Modules
        await renderFileGallery(DOMElements.photoGallery, 'site', 'photo', true);
        await renderFileGallery(DOMElements.siteDocGallery, 'site', 'document', true);
        await renderMasterDocsByCategory(['client_details', 'noc_copies', 'letters', 'other_uploads'], DOMElements.projectDocsGallery);
        await renderMasterDocsByCategory(['tender_documents'], DOMElements.tenderDocsGallery);
        await renderMasterDocsByCategory(['vendor_lists'], DOMElements.vendorListsGallery);
        
        await renderBoq();
        await renderMomList();
        await renderGanttChart();
        calendarDate = new Date();
        await renderCalendar();
        await renderResourceCalculator(); 
        // --- RENDER NEW TAB CONTENT ---
        await renderMaterialList();
        await renderSubcontractorList();
        await renderLongLeadItems();
        await renderRfiLog();
        await renderNocTracker();
        await renderBulletinFeed();
        await renderMomTaskFollowup(); // New:
         renderFloorSelector();
        
        
        
        
        
        toggleTabsForView(true);
        // window.currentScheduleData = await getProjectSchedule(project, siteData);
    }
 // --- DYNAMIC FLOOR SELECTOR ---
    function renderFloorSelector() {
        const floors = [
            {id: 'all', label: 'All Levels'},
            {id: 'sub', label: 'Substructure'},
            {id: 'gf', label: 'Ground Floor'},
            {id: '1', label: 'First Floor'},
            {id: 'roof', label: 'Roof'},
            {id: 'ext', label: 'External'}
        ];
        
        // Add logic to detect max floors if project has data, e.g. 11 floors
        // For now static list, but scalable
        
        let html = '';
        floors.forEach(f => {
            const active = currentFloorFilter === f.id ? 'active' : '';
            html += `<button class="floor-btn ${active}" data-floor="${f.id}">${f.label}</button>`;
        });
        DOMElements.floorSelectorContainer.innerHTML = html;
    }
     // --- NEW TASK MODAL HANDLERS ---
     async function showNewTaskModal() {
        if(!currentJobNo) return alert("Select a project first.");
        
        // Populate Dependency Dropdown
        const dependencySelect = document.getElementById('new-task-dependency');
        dependencySelect.innerHTML = '<option value="">-- No Dependency --</option>';
        
        const project = await DB.getProject(currentJobNo);
        const siteData = await DB.getSiteData(currentJobNo);
        const currentTasks = await getProjectSchedule(project, siteData); // Get full list including custom
        
        currentTasks.forEach(t => {
            dependencySelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
        
        DOMElements.newTaskModal.style.display = 'flex';
    }

    async function saveNewTask() {
        const name = document.getElementById('new-task-name').value;
        const dur = parseInt(document.getElementById('new-task-duration').value) || 5;
        const floor = document.getElementById('new-task-floor').value;
        const dep = document.getElementById('new-task-dependency').value;
        
        if(!name) return alert("Task Name is required");

        const siteData = await DB.getSiteData(currentJobNo);
        if(!siteData.customTasks) siteData.customTasks = [];
        
        // Generate ID
        const newId = 10000 + siteData.customTasks.length + 1; // Ensure no collision with template IDs
        
        const newTask = {
            id: newId,
            name: name,
            duration: dur,
            floor: floor,
            dependencies: dep ? [parseInt(dep)] : [],
            startOffset: 0 // Will be calculated dynamically
        };
        
        siteData.customTasks.push(newTask);
        await DB.putSiteData(siteData);
        
        DOMElements.newTaskModal.style.display = 'none';
        await renderGanttChart(); // Refresh view
    }
      // --- GANTT & BIM ---
      async function getProjectSchedule(projectData, siteData) {
        const dateStr = projectData.agreementDate || new Date().toISOString().split('T')[0];
        const projectStartDate = new Date(dateStr);
        
        // Combine Template with Custom Tasks
        let allTemplates = [...VILLA_SCHEDULE_TEMPLATE, ...(siteData.customTasks || [])];
        console.log('allTemplates:');
        console.log(allTemplates);
        // Calculate schedule
        // Note: Custom tasks need dynamic calculation if they depend on others. 
        // The `calculateDynamicSchedule` function in gantt_chart.js handles scaling linear offset.
        // For true dependency resolution (CPM), we'd need a graph traversal. 
        // For this version, we assume linear offsets or basic scaling.
        
        return UrbanAxisSchedule.calculateDynamicSchedule(projectData, allTemplates, siteData.scheduleOverrides);
    }
      async function getProjectSchedulex(projectData, siteData) {
        // Safe date handling: Default to TODAY if agreementDate is missing
        let dateStr = projectData.agreementDate;
        if(!dateStr || isNaN(new Date(dateStr).getTime())) {
            dateStr = new Date().toISOString().split('T')[0];
        }
        const projectStartDate = new Date(dateStr);
        
        const constructionMonths = parseFloat(projectData.constructionDuration) || 14;
        const templateTotalDays = Math.max(...VILLA_SCHEDULE_TEMPLATE.map(t => t.startOffset + t.duration)) || 577;
        const scaleFactor = (constructionMonths * 30.4) / templateTotalDays;

        let schedule = VILLA_SCHEDULE_TEMPLATE.map(task => {
            const newStartOffset = Math.round(task.startOffset * scaleFactor);
            const newDuration = Math.max(1, Math.round(task.duration * scaleFactor));
            const startDate = new Date(projectStartDate);
            startDate.setDate(startDate.getDate() + newStartOffset);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + newDuration - 1);
            return { 
                ...task, 
                start: startDate.toISOString().split('T')[0], 
                end: endDate.toISOString().split('T')[0], 
                duration: newDuration 
            };
        });

        const overrides = siteData.scheduleOverrides || [];
        alert('dddddddd1');
        alert(overrides);
        if (overrides.length > 0) {
            schedule.forEach(task => {
                const override = overrides.find(o => o.id === task.id);
                if (override) {
                    task.start = override.start;
                    task.end = override.end;
                    const newStart = new Date(override.start + 'T00:00:00');
                    const newEnd = new Date(override.end + 'T00:00:00');
                    task.duration = Math.round((newEnd - newStart) / (1000 * 60 * 60 * 24)) + 1;
                }
            });
        }
        return schedule;
    }
    
    async function renderMomList() {
        DOMElements.momList.innerHTML = '';
        if (!currentJobNo) return;
        let siteData = await DB.getSiteData(currentJobNo);
        if (!siteData.mom || siteData.mom.length === 0) {
            DOMElements.momList.innerHTML = '<p>No MoM recorded.</p>';
        } else {
            let html = '<ul class="mom-history-list">';
            siteData.mom.sort((a, b) => new Date(b.date) - new Date(a.date));
            siteData.mom.forEach((mom, index) => {
                html += `
                    <li class="mom-list-item">
                        <span class="mom-list-info">
                            <strong>${new Date(mom.date).toLocaleDateString()} (Ref: ${mom.ref || 'N/A'})</strong>
                            <br>
                            <small>${(mom.summary || '').substring(0, 80)}...</small>
                        </span>
                        <button class="secondary-button small-button preview-mom-btn" data-index="${index}">View</button>
                    </li>`;
            });
            html += '</ul>';
            DOMElements.momList.innerHTML = html;
        }
    }
      async function renderGanttChart() {
        //if (!currentJobNo || !window.UrbanAxisSchedule) return;
        
        const project = await DB.getProject(currentJobNo);
        const siteData = await DB.getSiteData(currentJobNo);
        
        // 1. Get Full Schedule (Template + Custom)
        let finalSchedule = await getProjectSchedule(project, siteData);

        // 2. Apply Floor Filter
        if(currentFloorFilter !== 'all') {
            finalSchedule = finalSchedule.filter(t => t.floor === currentFloorFilter || (t.floor === undefined && currentFloorFilter === 'sub')); 
        }

        // 3. Set Global Data for BIM
        // Note: BIM Viewer handles filtering visually or we pass filtered data. 
        // Passing filtered data to BIM might hide other parts completely. 
        // Better to update global data fully, and let BIM viewer handle visibility state if advanced, 
        // or just pass full data to BIM and use filter only for Gantt Chart UI.
        window.currentScheduleData = await getProjectSchedule(project, siteData); // Full list for BIM context

        // 4. Render Gantt
        UrbanAxisSchedule.render(finalSchedule, handleGanttUpdate);
        
        // 5. Initialize BIM Viewer
        //if (window.BIMViewer) 
        //{
            BIMViewer.init('bim-viewer-container', project.projectType || 'Villa');
            // Filter BIM view? For now we show full model, but Gantt focuses on specific floor.
            // Could add BIMViewer.setFilter(currentFloorFilter);
            setupSimulationControls(window.currentScheduleData);
        //}
    }
    async function renderGanttChartxxx() {
     alert('kkkkkkkk1');
        // if (!currentJobNo || !window.UrbanAxisSchedule) return;
        
        const project = await DB.getProject(currentJobNo);
        const siteData = await DB.getSiteData(currentJobNo);
        // alert('kkkkkkkk2');
        // 1. Get Project Dates (Fallback to today if missing)
        const dateStr = project.agreementDate || new Date().toISOString().split('T')[0];
        const projectDataSafe = { ...project, agreementDate: dateStr };
// alert('aaaaaaaaa1');
        // 2. Calculate Schedule
        const finalSchedule = UrbanAxisSchedule.calculateDynamicSchedule(projectDataSafe, VILLA_SCHEDULE_TEMPLATE, siteData.scheduleOverrides);
        // alert('aaaaaaaaa2');
        // 3. Set Global Data for BIM
        window.currentScheduleData = finalSchedule; 
// alert('aaaaaaaaa3');
        // 4. Render Gantt
        UrbanAxisSchedule.render(finalSchedule, handleGanttUpdate);
        // alert('aaaaaaaaa4');
        
        alert(window.BIMViewer);
        // 5. Initialize BIM Viewer
        // if (window.BIMViewer) {
            // alert('aaaaaaaaa5');
            BIMViewer.init('bim-viewer-container', project.projectType || 'Villa');
            setupSimulationControls(finalSchedule);
        // alert('aaaaaaaaa6');
        // }
    }
    async function handleGanttUpdate(update) {
        // alert('bbbbbbb1');
        if (!currentJobNo) return;
        try {
            const siteData = await DB.getSiteData(currentJobNo);
            siteData.scheduleOverrides = siteData.scheduleOverrides || [];
            
            let override = siteData.scheduleOverrides.find(o => o.id === update.id);
            if (override) {
                override.start = update.start;
                override.end = update.end;
            } else {
                siteData.scheduleOverrides.push({ id: update.id, start: update.start, end: update.end });
            }
            
            await DB.putSiteData(siteData);
            
            await renderGanttChart();
            await renderCalendar();
        } catch (error) {
            console.error("Failed to update schedule override:", error);
            alert("Error saving schedule changes.");
        }
    }
    // --- APPROVAL WORKFLOWS (RFI & Materials) ---
    function getApprovalButton(type, id, role, status) {
        if (status === 'Approved') return `<span class="badge success" style="background:#28a745; color:white; padding:2px 5px; border-radius:3px; font-size:0.8em;">Approved by ${role.toUpperCase()}</span>`;
        return `<button class="secondary-button small-button" data-action="approve" data-type="${type}" data-id="${id}" data-role="${role}">Sign as ${role.toUpperCase()}</button>`;
    }

    async function handleGlobalClicks(e) {
        if(e.target.dataset.action === 'approve') {
            const { type, id, role } = e.target.dataset;
            await processApproval(type, id, role);
        }
    }

    async function processApproval(type, id, role) {
        const password = prompt(`Enter Password for ${role.toUpperCase()} Approval:`);
        if (!password) return;

        // Use the centralized verifyPassword helper from database.js
        // Note: verifyPassword now checks against the 'passwords' sub-object in settings or defaults
        const isValid = await DB.verifyPassword(role, password);
        
        if (isValid) {
            const siteData = await DB.getSiteData(currentJobNo);
            const list = type === 'rfi' ? siteData.rfiLog : siteData.materialLog;
            const item = list.find(i => i.id === id);
            
            if (item) {
                if (!item.approvals) item.approvals = {};
                item.approvals[role] = { date: new Date().toISOString(), user: currentUserRole || role };
                
                // Optional: Check if all required approvals are done to update main status
                
                await DB.putSiteData(siteData);
                alert("Approved Successfully!");
                if(type === 'rfi') renderRfiLog();
                else renderMaterialList();
            }
        } else {
            alert("Incorrect Password.");
        }
    }

    async function handleCreateRfi() {
        if(!currentJobNo) return;
        const subject = prompt("Enter RFI Subject:");
        if(!subject) return;
        
        const siteData = await DB.getSiteData(currentJobNo);
        if(!siteData.rfiLog) siteData.rfiLog = [];
        
        siteData.rfiLog.push({
            id: Date.now().toString(),
            refNo: `RFI-${String(siteData.rfiLog.length + 1).padStart(3, '0')}`,
            subject: subject,
            raisedBy: currentUserRole || 'Site Eng',
            date: new Date().toISOString().split('T')[0],
            status: 'Open',
            approvals: {}
        });
        
        await DB.putSiteData(siteData);
        renderRfiLog();
    }
 
    async function renderRfiLog() {
        if(!currentJobNo) return;
        const tbody = DOMElements.rfiTableBody;
        tbody.innerHTML = '';
        const siteData = await DB.getSiteData(currentJobNo);
        const rfis = siteData.rfiLog || [];

        rfis.forEach(rfi => {
            const row = tbody.insertRow();
            const apps = rfi.approvals || {};
            
            // Define who needs to approve based on project roles (simplified hardcoded roles here)
            const approvalButtons = `
                ${getApprovalButton('rfi', rfi.id, 'site', apps.site ? 'Approved' : 'Pending')}
                ${getApprovalButton('rfi', rfi.id, 'arch', apps.arch ? 'Approved' : 'Pending')}
                ${getApprovalButton('rfi', rfi.id, 'str', apps.str ? 'Approved' : 'Pending')}
                ${getApprovalButton('rfi', rfi.id, 'mep', apps.mep ? 'Approved' : 'Pending')}
            `;

            row.innerHTML = `
                <td>${rfi.refNo}</td>
                <td>${rfi.subject}</td>
                <td>${rfi.raisedBy}</td>
                <td>${rfi.date}</td>
                <td>${rfi.status}</td>
                <td><div style="display:flex; gap:5px; flex-wrap:wrap;">${approvalButtons}</div></td>
                <td><button class="small-button">View</button></td>
            `;
        });
    }

    async function handleCreateMaterial() {
        if(!currentJobNo) return;
        const item = prompt("Enter Material / Item Name:");
        if(!item) return;
        const supplier = prompt("Enter Supplier Name:");
        
        const siteData = await DB.getSiteData(currentJobNo);
        if(!siteData.materialLog) siteData.materialLog = [];
        
        siteData.materialLog.push({
            id: Date.now().toString(),
            ref: `MAT-${String(siteData.materialLog.length + 1).padStart(3, '0')}`,
            item: item,
            supplier: supplier || 'TBD',
            status: 'Submitted',
            approvals: {}
        });
        
        await DB.putSiteData(siteData);
        renderMaterialList();
    }

    async function renderMaterialList() {
        if(!currentJobNo) return;
        const tbody = DOMElements.materialTableBody;
        tbody.innerHTML = '';
        const siteData = await DB.getSiteData(currentJobNo);
        const mats = siteData.materialLog || [];

        mats.forEach(mat => {
            const row = tbody.insertRow();
            const apps = mat.approvals || {};
            
            const approvalButtons = `
                ${getApprovalButton('mat', mat.id, 'arch', apps.arch ? 'Approved' : 'Pending')}
                ${getApprovalButton('mat', mat.id, 'str', apps.str ? 'Approved' : 'Pending')}
                ${getApprovalButton('mat', mat.id, 'mep', apps.mep ? 'Approved' : 'Pending')}
            `;

            row.innerHTML = `
                <td>${mat.ref}</td>
                <td>${mat.item}</td>
                <td>${mat.supplier}</td>
                <td>${mat.status}</td>
                <td><div style="display:flex; gap:5px; flex-wrap:wrap;">${approvalButtons}</div></td>
                <td><button class="small-button">View</button></td>
            `;
        });
    }

    // --- PROJECT HEADER INJECTION ---
    async function injectProjectHeader(containerId, project) {
        const container = document.getElementById(containerId);
        if(!container) return;
        
        const files = await DB.getFiles(project.jobNo, 'master');
        const imgFile = files.find(f => f.fileType.startsWith('image/')) || { dataUrl: 'data:image/svg+xml;base64,...' }; // Placeholder base64

        const headerHtml = `
            <div class="project-header-banner" style="display:flex; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px; align-items:center;">
                <div style="width:80px; height:80px; margin-right:15px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; border:1px solid #ddd;">
                    ${imgFile.dataUrl.length > 50 ? `<img src="${imgFile.dataUrl}" style="max-width:100%; max-height:100%;">` : 'No Img'}
                </div>
                <div>
                    <h2 style="margin:0;">${project.projectDescription}</h2>
                    <p style="margin:5px 0;"><strong>Client:</strong> ${project.clientName} | <strong>Plot:</strong> ${project.plotNo} | <strong>Area:</strong> ${project.area || ''}</p>
                </div>
            </div>
        `;
        
        // We inject this into the modal body when a form is opened
        return headerHtml;
    }

    // --- FORM HANDLING ---
    async function handleFormButtonClick(e) {
        if(!currentJobNo) { alert("Please select a project first."); return; } 
        if (!e.target.matches('.form-btn')) return; 
        
        const formType = e.target.dataset.form; 
        const formTitle = e.target.textContent;
        
        if (formType === 'mom') {
            openMomModal(null);
            return;
        }

        try { 
            const response = await fetch(`forms/${formType}.html`); 
            if (!response.ok) throw new Error(`Form template not found: ${formType}`); 
            let html = await response.text(); 
            
            const project = await DB.getProject(currentJobNo); 
            DOMElements.formModalTitle.textContent = formTitle; 
            
            // Standard replacements
            html = html.replace(/{{PROJECT_NAME}}/g, project.projectDescription || 'N/A')
                       .replace(/{{CLIENT_NAME}}/g, project.clientName || 'N/A')
                       .replace(/{{PLOT_NO}}/g, project.plotNo || 'N/A')
                       .replace(/{{DATE}}/g, new Date().toLocaleDateString('en-GB'));
            
            // Inject visual header
            const headerHtml = await injectProjectHeader(null, project); 
            DOMElements.formModalBody.innerHTML = headerHtml + html; 
            DOMElements.formModal.style.display = 'flex'; 
        } catch(error) { 
            console.error(error); 
            alert("Error loading form template.");
        } 
    }

    async function handleSaveFormAsPdf() { 
        if (!currentJobNo || !PDFGenerator) { alert("PDF generation failed."); return; } 
        await PDFGenerator.generate({ previewId: 'form-modal-body', projectJobNo: currentJobNo }); 
    }

    // --- BOQ & PAYMENT CERT ---
    async function renderBoq() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); const boq = siteData.boq || []; const tbody = DOMElements.boqTableBody; tbody.innerHTML = ''; boq.forEach((item, index) => { const amount = (item.qty || 0) * (item.rate || 0); const totalDonePerc = (item.prev_perc || 0) + (item.curr_perc || 0); const workDoneValue = amount * (totalDonePerc / 100); const row = tbody.insertRow(); row.dataset.index = index; row.innerHTML = ` <td contenteditable="true" data-field="id">${item.id || ''}</td> <td contenteditable="true" data-field="description">${item.description}</td> <td contenteditable="true" data-field="unit">${item.unit}</td> <td contenteditable="true" data-field="qty" class="editable-cell">${item.qty || 0}</td> <td contenteditable="true" data-field="rate" class="editable-cell">${(item.rate || 0).toFixed(2)}</td> <td class="boq-amount" contenteditable="false">${amount.toFixed(2)}</td> <td contenteditable="false">${item.prev_perc || 0}%</td> <td contenteditable="true" data-field="curr_perc" class="editable-cell">${item.curr_perc || 0}</td> <td class="boq-total-perc" contenteditable="false">${totalDonePerc.toFixed(0)}%</td> <td class="boq-work-done-value" contenteditable="false">${workDoneValue.toFixed(2)}</td> <td><button class="delete-boq-item-btn small-button danger-button">✕</button></td> `; }); await updateBoqTotals(); } 
    async function handleBoqChange(e) { const target = e.target; const row = target.closest('tr'); if (!row) return; const index = parseInt(row.dataset.index); const siteData = await DB.getSiteData(currentJobNo); const item = siteData.boq[index]; if (!item) return; if (target.matches('.delete-boq-item-btn')) { if (confirm(`Delete item: ${item.description}?`)) { siteData.boq.splice(index, 1); await DB.putSiteData(siteData); await renderBoq(); } return; } if (target.hasAttribute('contenteditable')) { const field = target.dataset.field; let value = target.textContent; if (['qty', 'rate', 'curr_perc'].includes(field)) { let numValue = parseFloat(value) || 0; if (field === 'curr_perc') { const prevPerc = item.prev_perc || 0; if (numValue < 0) numValue = 0; if (numValue > (100 - prevPerc)) numValue = 100 - prevPerc; target.textContent = numValue; } item[field] = numValue; } else { item[field] = value; } const amount = (item.qty || 0) * (item.rate || 0); const totalDonePerc = (item.prev_perc || 0) + (item.curr_perc || 0); const workDoneValue = amount * (totalDonePerc / 100); item.amount = amount; row.querySelector('.boq-amount').textContent = amount.toFixed(2); row.querySelector('.boq-total-perc').textContent = `${totalDonePerc.toFixed(0)}%`; row.querySelector('.boq-work-done-value').textContent = workDoneValue.toFixed(2); await DB.putSiteData(siteData); await updateBoqTotals(); } }
    
    async function handleAddBoqItem() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); siteData.boq.push({ id: "V.O.", description: "New Variation Item", unit: "", qty: 0, rate: 0, amount: 0, prev_perc: 0, curr_perc: 0 }); await DB.putSiteData(siteData); await renderBoq(); }
    
    async function updateBoqTotals() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); if (!siteData || !siteData.boq) return; const boq = siteData.boq; const totalValue = boq.reduce((sum, item) => sum + (item.amount || 0), 0); const totalWorkDoneValue = boq.reduce((sum, item) => { const totalPerc = (item.prev_perc || 0) + (item.curr_perc || 0); return sum + ((item.amount || 0) * (totalPerc / 100)); }, 0); const overallProgress = totalValue > 0 ? Math.round((totalWorkDoneValue / totalValue) * 100) : 0; DOMElements.boqTotalValue.textContent = `${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`; DOMElements.boqWorkDoneValue.textContent = `${totalWorkDoneValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`; DOMElements.boqProgressPercentage.textContent = `${overallProgress}%`; DOMElements.boqProgressBar.style.width = `${overallProgress}%`; DOMElements.boqProgressBar.textContent = `${overallProgress}%`; if (siteData.progress !== overallProgress) { siteData.progress = overallProgress; await DB.putSiteData(siteData); await renderProjectList(); } }

    async function handleGeneratePaymentCertificate() {
        if (!currentJobNo) return;
        try {
            // Simplified generation logic reusing BOQ data
            const siteData = await DB.getSiteData(currentJobNo);
            const totalValue = siteData.boq.reduce((sum, item) => sum + (item.amount || 0), 0);
            const workDoneValue = siteData.boq.reduce((sum, item) => sum + ((item.amount || 0) * (((item.prev_perc||0) + (item.curr_perc||0))/100)), 0);
            
            // Just displaying alert for now, similar logic to app.js can generate HTML
            alert(`Generating Payment Certificate...\nTotal Contract: ${totalValue}\nWork Done: ${workDoneValue}`);
        } catch (error) { console.error(error); }
    }

    // --- MOM & CALENDAR & GANTT & FILES ---
    // (Reusing standard implementations from previous logic for brevity, they remain largely the same)
    
   
     
    
    
    async function renderFileGallery(galleryEl, source, type, isDeletable) {
        galleryEl.innerHTML = '';
        if (!currentJobNo) return;
        let files = (await DB.getFiles(currentJobNo, source)).filter(f => !type || f.type === type);
        files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'thumbnail-container';
            div.innerHTML = `<div class="thumbnail file-icon">${file.name}</div>${isDeletable ? '<div class="thumbnail-delete-btn">x</div>' : ''}`;
            if(isDeletable) div.querySelector('.thumbnail-delete-btn').onclick = () => deleteFile(file.id, type, galleryEl);
            galleryEl.appendChild(div);
        });
    }
    async function renderMasterDocsByCategory(cats, gallery) {
        // Fetch from master source
        gallery.innerHTML = '';
        if(!currentJobNo) return;
        const files = (await DB.getFiles(currentJobNo, 'master')).filter(f => cats.includes(f.category));
        files.forEach(f => {
             const div = document.createElement('div');
             div.className = 'thumbnail-container read-only';
             div.innerHTML = `<div class="thumbnail file-icon">${f.name}</div>`;
             gallery.appendChild(div);
        });
    }
// --- CALENDAR LOGIC ---
    async function renderCalendar() {
        DOMElements.monthYearDisplay.textContent = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
		
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
        
        const allHolidays = await DB.getAllHolidays();
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
        if (currentJobNo) {
            const project = await DB.getProject(currentJobNo);
            const siteData = await DB.getSiteData(currentJobNo);
            (siteData.statusLog || []).forEach(log => addEvent(log.date, 'status', `Status: ${log.status}`));
            (siteData.mom || []).forEach((mom, index) => addEvent(mom.date, 'mom', `MoM: Ref ${mom.ref || 'N/A'}`, null, index, currentJobNo));
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

        const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
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
   
    // 3. Modify renderGanttChart to also Init BIM
async function renderGanttChartxx() {
    if (!currentJobNo || !window.UrbanAxisSchedule) return;
    const project = await DB.getProject(currentJobNo);
    const siteData = await DB.getSiteData(currentJobNo);
    const finalSchedule = await getProjectSchedule(project, siteData);
    window.currentScheduleData = finalSchedule; // Expose for BIM

    UrbanAxisSchedule.render(finalSchedule, handleGanttUpdate);
    
    // Initialize BIM Viewer with Project Type
    BIMViewer.init('bim-viewer-container', project.projectType || 'Villa');
    
    // Setup Simulation Controls
    setupSimulationControls(finalSchedule);
}

    function setupSimulationControls(schedule) {
        
        const playBtn = document.getElementById('play-simulation-btn');
        const slider = document.getElementById('simulation-slider');
        const dateDisplay = document.getElementById('simulation-date-display');
        
           if(!schedule || schedule.length === 0) return;
// alert('fffff1');
        // Calculate Min and Max dates from schedule
        // Ensure valid dates only
        console.log('schedule:');
        console.log(schedule);
        const validTasks = schedule.filter(t => !isNaN(new Date(t.start).getTime()));
        if (validTasks.length === 0) return;
// alert('validTasks');
// alert(validTasks);
        const startTimes = validTasks.map(t => new Date(t.start).getTime());
        const endTimes = validTasks.map(t => new Date(t.end).getTime());
        
        
        //const startTimes = schedule.map(t => new Date(t.start).getTime());
        //const endTimes = schedule.map(t => new Date(t.end).getTime());
        const minTime = Math.min(...startTimes);
        const maxTime = Math.max(...endTimes);
        
        // Total duration in days + buffer
        const totalDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24)) + 5; 

        slider.min = 0;
        slider.max = totalDays;
        slider.value = 0;
 // alert('window.BIMViewer');
// alert(window.BIMViewer);
 // alert('window.BIMViewer');
// alert(window.BIMViewer);
        const updateViz = () => {
            const currentDays = parseInt(slider.value);
            const currentDate = new Date(minTime + (currentDays * 24 * 60 * 60 * 1000));
            dateDisplay.textContent = currentDate.toDateString();
           
            //if(window.BIMViewer) {
                BIMViewer.updateSimulation(currentDate);
            //}
        };

        slider.oninput = updateViz;

        playBtn.onclick = () => {
            if (simulationInterval) {
                clearInterval(simulationInterval);
                simulationInterval = null;
                playBtn.textContent = "▶ Play Simulation";
            } else {
                playBtn.textContent = "⏸ Pause";
                simulationInterval = setInterval(() => {
                    let val = parseInt(slider.value);
                    if (val >= slider.max) {
                        clearInterval(simulationInterval);
                        simulationInterval = null;
                        playBtn.textContent = "▶ Play Simulation";
                    } else {
                        slider.value = val + 1;
                        updateViz();
                    }
                }, 50); 
            }
        };
        
        // Initial call to set state
        updateViz();
    }
    
    function setupSimulationControlsx(schedule) {
        alert('ccccccccc1');
        const playBtn = document.getElementById('play-simulation-btn');
        const slider = document.getElementById('simulation-slider');
        const dateDisplay = document.getElementById('simulation-date-display');
        
        if(!schedule.length) return;

        // Determine Date Range
        const dates = schedule.map(t => new Date(t.start).getTime()).concat(schedule.map(t => new Date(t.end).getTime()));
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        //const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
const totalDays = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));
        slider.min = 0;
        slider.max = totalDays;
        slider.value = 0;

        const updateViz = () => {
            const currentDays = parseInt(slider.value);
            const currentDate = new Date(minDate + (currentDays * 24 * 60 * 60 * 1000));
            dateDisplay.textContent = currentDate.toLocaleDateString();
            if(window.BIMViewer) BIMViewer.updateSimulation(currentDate);
        };

        slider.oninput = updateViz;

        playBtn.onclick = () => {
            if (simulationInterval) {
                clearInterval(simulationInterval);
                simulationInterval = null;
                playBtn.textContent = "▶ Play Simulation";
            } else {
                playBtn.textContent = "⏸ Pause";
                simulationInterval = setInterval(() => {
                    let val = parseInt(slider.value);
                    if (val >= slider.max) {
                        clearInterval(simulationInterval);
                        simulationInterval = null;
                        playBtn.textContent = "▶ Play Simulation";
                    } else {
                        slider.value = val + 1;
                        updateViz();
                    }
                }, 100); 
            }
        };
        
        updateViz();
    }
// 4. Add the Simulation Control Logic
function setupSimulationControlsxx(schedule) {
    const playBtn = document.getElementById('play-simulation-btn');
    const slider = document.getElementById('simulation-slider');
    const dateDisplay = document.getElementById('simulation-date-display');
    
    if(!schedule.length) return;

    // Determine Date Range
    const dates = schedule.map(t => new Date(t.start).getTime()).concat(schedule.map(t => new Date(t.end).getTime()));
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

    slider.min = 0;
    slider.max = totalDays;
    slider.value = 0;

    const updateViz = () => {
        const currentDays = parseInt(slider.value);
        const currentDate = new Date(minDate + (currentDays * 24 * 60 * 60 * 1000));
        dateDisplay.textContent = currentDate.toLocaleDateString();
        
        // Call BIM Viewer Update
        BIMViewer.updateSimulation(currentDate);
    };

    // Slider Event
    slider.oninput = updateViz;

    // Play Button Event
    playBtn.onclick = () => {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            playBtn.textContent = "▶ Play Simulation";
        } else {
            playBtn.textContent = "⏸ Pause";
            simulationInterval = setInterval(() => {
                let val = parseInt(slider.value);
                if (val >= slider.max) {
                    clearInterval(simulationInterval);
                    simulationInterval = null;
                    playBtn.textContent = "▶ Play Simulation";
                } else {
                    slider.value = val + 1;
                    updateViz();
                }
            }, 100); // Speed of animation
        }
    };
    
    // Init state
    updateViz();
}
      async function renderGanttChartxxxx() {
        if (!currentJobNo || !window.UrbanAxisSchedule) return;
        const project = await DB.getProject(currentJobNo);
        const siteData = await DB.getSiteData(currentJobNo);
        const finalSchedule = await getProjectSchedule(project, siteData);
        UrbanAxisSchedule.render(project, finalSchedule, handleGanttUpdate);
    }

   

    
    
    function changeMonth(offset) { calendarDate.setMonth(calendarDate.getMonth() + offset); renderCalendar(); }
    
    async function handleLoadHolidays() {
        const countryCode = DOMElements.holidayCountrySelect.value;
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
                        await DB.addHolidays(holidays, countryCode, year);
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
   async function handleLeaveImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const text = await file.text();
        try {
            const leaveData = JSON.parse(text);
            if (!Array.isArray(leaveData)) throw new Error("Invalid JSON format. Expected an array.");

            if (confirm(`This will import ${leaveData.length} leave records, replacing any existing ones. Continue?`)) {
                await DB.clear('staffLeaves'); 
                const transaction = db.transaction('staffLeaves', 'readwrite');
                const store = transaction.objectStore('staffLeaves');
                leaveData.forEach(record => store.add(record));
                await new Promise((resolve, reject) => {
                    transaction.oncomplete = resolve;
                    transaction.onerror = reject;
                });

                alert("Staff leave data imported successfully.");
                await renderCalendar();
            }
        } catch (error) {
            alert("Failed to import leave data. Please ensure the file is a valid JSON export from the HR app.");
            console.error("Leave import error:", error);
        }
        event.target.value = '';
    }

    // --- MOM Management (Simplified) ---
    async function renderMomListxx() {
        DOMElements.momList.innerHTML = '';
        if(!currentJobNo) return;
        const siteData = await DB.getSiteData(currentJobNo);
        (siteData.mom || []).forEach((mom, idx) => {
            const div = document.createElement('div');
            div.className = 'mom-list-item';
            div.innerHTML = `<span>${mom.date} - ${mom.ref}</span> <button onclick="openMomPreview(${idx})">View</button>`;
            DOMElements.momList.appendChild(div);
        });
    }
    
    window.openMomPreview = (idx) => { /* ... preview modal logic ... */ };
    // --- MoM LOGIC ---
    function openMomModal(momIndex = null) { const isNew = momIndex === null; DOMElements.momModalTitle.textContent = isNew ? "Create New MoM" : "Edit MoM"; DOMElements.momEditIndex.value = isNew ? '' : momIndex; DOMElements.deleteMomBtn.style.display = isNew ? 'none' : 'inline-block'; DOMElements.momRef.value = ''; DOMElements.momDate.value = new Date().toISOString().split('T')[0]; DOMElements.momLocation.value = 'Site Office'; DOMElements.momAttendeesTbody.innerHTML = ''; DOMElements.momStatusSummary.value = ''; DOMElements.momActionsTbody.innerHTML = ''; DOMElements.momNextMeeting.value = ''; DOMElements.momNextMeetingNotes.value = '(To be confirmed a day before)'; if (!isNew) { DB.getSiteData(currentJobNo).then(siteData => { const mom = siteData.mom[momIndex]; DOMElements.momRef.value = mom.ref || ''; DOMElements.momDate.value = mom.date || ''; DOMElements.momLocation.value = mom.location || ''; DOMElements.momStatusSummary.value = mom.summary || ''; DOMElements.momNextMeeting.value = mom.nextMeeting || ''; DOMElements.momNextMeetingNotes.value = mom.nextMeetingNotes || ''; (mom.attendees || []).forEach(p => addAttendeeRow(p.name, p.position, p.company)); (mom.actions || []).forEach(a => addActionRow(a.desc, a.by, a.date, a.status)); }); } DOMElements.momModal.style.display = 'flex'; }
    async function renderMomPreview(jobNo, momIndex) {
        if (jobNo === null || momIndex === null) return;
        const project = await DB.getProject(jobNo);
        const siteData = await DB.getSiteData(jobNo);
        const momData = siteData.mom[momIndex];
        if (!project || !momData) return;
        
        const html = SITE_FORM_TEMPLATES.previewMinutesOfMeeting(momData, project);
        DOMElements.momPreviewModalBody.innerHTML = html;
        DOMElements.momPreviewModalTitle.textContent = `Preview: MoM Ref ${momData.ref || 'N/A'}`;
        
        DOMElements.momPreviewModalFooter.innerHTML = `
            <button id="edit-this-mom-btn" class="secondary-button" data-job-no="${jobNo}" data-index="${momIndex}">Edit this MoM</button>
            <button id="copy-mom-btn" class="secondary-button" data-job-no="${jobNo}" data-index="${momIndex}" style="margin-left:10px;">Copy to New MoM</button>
            <button id="print-mom-btn" class="primary-button" data-job-no="${jobNo}" data-index="${momIndex}" style="float:right;">Print Full Form</button>
        `;
        DOMElements.momPreviewModal.style.display = 'flex';
    }
    
    async function saveMomData() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); siteData.mom = siteData.mom || []; const momIndex = DOMElements.momEditIndex.value; const attendees = Array.from(DOMElements.momAttendeesTbody.rows).map(row => ({ name: row.cells[0].querySelector('input').value, position: row.cells[1].querySelector('input').value, company: row.cells[2].querySelector('input').value })); const actions = Array.from(DOMElements.momActionsTbody.rows).map(row => ({ desc: row.cells[0].querySelector('input').value, by: row.cells[1].querySelector('input').value, date: row.cells[2].querySelector('input').value, status: row.cells[3].querySelector('input').value })); const momData = { ref: DOMElements.momRef.value, date: DOMElements.momDate.value, location: DOMElements.momLocation.value, attendees, summary: DOMElements.momStatusSummary.value, actions, nextMeeting: DOMElements.momNextMeeting.value, nextMeetingNotes: DOMElements.momNextMeetingNotes.value }; if (momIndex === '') { siteData.mom.push(momData); } else { siteData.mom[parseInt(momIndex)] = momData; } await DB.putSiteData(siteData); DOMElements.momModal.style.display = 'none'; await renderMomList(); await renderCalendar(); }
    async function deleteMomData() { if (!confirm("Are you sure you want to delete this MoM?")) return; const momIndex = parseInt(DOMElements.momEditIndex.value); if (!isNaN(momIndex)) { const siteData = await DB.getSiteData(currentJobNo); siteData.mom.splice(momIndex, 1); await DB.putSiteData(siteData); DOMElements.momModal.style.display = 'none'; await renderMomList(); await renderCalendar(); } }
   function addAttendeeRow(name = '', position = '', company = '') { const row = DOMElements.momAttendeesTbody.insertRow(); row.innerHTML = `<td><input type="text" value="${name}"></td><td><input type="text" value="${position}"></td><td><input type="text" value="${company}"></td><td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>`; }
    function addActionRow(desc = '', by = '', date = '', status = '') { const row = DOMElements.momActionsTbody.insertRow(); row.innerHTML = `<td><input type="text" value="${desc}"></td><td><input type="text" value="${by}"></td><td><input type="date" value="${date}"></td><td><input type="text" value="${status}"></td><td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>`; }
       async function handleEventClick(e) {
        let target = e.target;

        // --- Buttons inside the main printable form modal ---
        if (target.matches('#save-form-pdf-btn')) { handleSaveFormAsPdf(); return; }

        // --- Buttons inside the dedicated MoM PREVIEW modal ---
        if (target.closest('#mom-preview-modal-footer')) {
            const button = target.closest('button');
            if (!button) return;

            const jobNo = button.dataset.jobNo;
            const momIndex = parseInt(button.dataset.index, 10);

            if (button.id === 'edit-this-mom-btn') {
                DOMElements.momPreviewModal.style.display = 'none';
                if (momIndex !== null && jobNo) {
                    currentJobNo = jobNo; // Ensure context is correct
                    openMomModal(momIndex);
                }
            } else if (button.id === 'copy-mom-btn') {
                handleCopyMom(button);
            } else if (button.id === 'print-mom-btn') {
                const project = await DB.getProject(jobNo);
                const siteData = await DB.getSiteData(jobNo);
                const momData = siteData.mom[momIndex];
                const html = SITE_FORM_TEMPLATES.printableMinutesOfMeeting(momData, project);
                DOMElements.formModalBody.innerHTML = html;
                DOMElements.formModalTitle.textContent = `Printable: MoM Ref ${momData.ref || 'N/A'}`;
                DOMElements.formModal.style.display = 'flex';
            }
            return;
        }

        // --- Clicks on the MoM list or Calendar to OPEN the preview modal ---
        if (target.matches('.preview-mom-btn, .event-dot.mom')) {
            e.preventDefault();
            const momIndex = target.dataset.index || target.dataset.momIndex;
            const jobNoForMom = target.dataset.jobNo || currentJobNo;
            
            if (jobNoForMom !== null && momIndex !== null) {
                const index = parseInt(momIndex, 10);
                if (!isNaN(index)) {
                    renderMomPreview(jobNoForMom, index);
                }
            }
        }
    }
    async function handlePostBulletin() {
        if (!currentJobNo) { alert("Select a project before posting a bulletin."); return; }
        const subject = DOMElements.bulletinSubject.value.trim();
        const details = DOMElements.bulletinDetails.value.trim();
        const assignedTo = DOMElements.bulletinAssignedTo.value.trim();
        
        if (!subject || !details) { alert("Subject and Details are required."); return; }

        await DB.addBulletinItem({
            jobNo: currentJobNo,
            timestamp: new Date().toISOString(),
            author: 'Site Engineer', 
            subject: subject,
            details: details,
            assignedTo: assignedTo || 'Project Team',
        });

        DOMElements.bulletinSubject.value = '';
        DOMElements.bulletinDetails.value = '';
        DOMElements.bulletinAssignedTo.value = '';
        await renderBulletinFeed();
        alert('Bulletin posted successfully.');
    }
async function handleCopyMom(button) {
        const jobNo = button.dataset.jobNo;
        const momIndex = parseInt(button.dataset.index, 10);

        if (jobNo && !isNaN(momIndex)) {
            const siteData = await DB.getSiteData(jobNo);
            const momToCopy = siteData.mom[momIndex];
            if (!momToCopy) {
                alert('Could not find MoM to copy.');
                return;
            }

            DOMElements.momPreviewModal.style.display = 'none';
            openMomModal(null); // Open editor for a new MoM

            setTimeout(() => {
                DOMElements.momRef.value = ''; 
                DOMElements.momDate.value = new Date().toISOString().split('T')[0]; 
                DOMElements.momLocation.value = momToCopy.location || 'Site Office';
                DOMElements.momStatusSummary.value = momToCopy.summary || '';
                DOMElements.momNextMeeting.value = ''; 
                DOMElements.momNextMeetingNotes.value = momToCopy.nextMeetingNotes || '(To be confirmed a day before)';

                DOMElements.momAttendeesTbody.innerHTML = '';
                (momToCopy.attendees || []).forEach(p => addAttendeeRow(p.name, p.position, p.company));
                
                DOMElements.momActionsTbody.innerHTML = '';
                (momToCopy.actions || []).forEach(a => addActionRow(a.desc, a.by, a.date, a.status));
                
                alert('MoM has been copied. Please review, update, and save as a new meeting.');
            }, 100);
        }
    }
    // --- TOOLS ---
     function updateResourceTotals() {
        const dayRate = parseFloat(DOMElements.resourceDayRate.value) || 0;
        let totalManDays = 0;
        let totalCost = 0;
        DOMElements.resourceCalculatorBody.querySelectorAll('tr:not(.resource-total-row)').forEach(row => {
            const manDays = parseFloat(row.querySelector('.man-days-input').value) || 0;
            const taskCost = manDays * dayRate;
            row.querySelector('.task-cost').textContent = taskCost.toFixed(2);
            totalManDays += manDays;
            totalCost += taskCost;
        });
        document.getElementById('total-man-days').textContent = totalManDays;
        document.getElementById('total-resource-cost').textContent = totalCost.toFixed(2);
    }
    async function renderResourceCalculator() {
        const tbody = DOMElements.resourceCalculatorBody;
        tbody.innerHTML = '';
        if (!currentJobNo) return;
        const project = await DB.getProject(currentJobNo);
        const siteData = await DB.getSiteData(currentJobNo);
        const schedule = await getProjectSchedule(project, siteData);
        
        schedule.forEach(task => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${task.name}</td>
                <td style="text-align: right;">${task.duration}</td>
                <td><input type="number" class="man-days-input" value="0"></td>
                <td class="task-cost" style="text-align: right;">0.00</td>`;
        });
        tbody.innerHTML += `<tr class="resource-total-row"><td colspan="2">Total Estimated Labor Cost</td><td id="total-man-days" style="text-align: right;">0</td><td id="total-resource-cost" style="text-align: right;">0.00</td></tr>`;
        updateResourceTotals();
    }
      async function handleGenerateProjectReport() {
        if (!currentJobNo) { alert("Please select a project to generate a report."); return; }
        try {
            const project = await DB.getProject(currentJobNo);
            const siteData = await DB.getSiteData(currentJobNo);
            if (project.projectType !== 'Villa') { alert("Project reports with critical path analysis are currently only available for 'Villa' type projects."); return; }
            const dynamicSchedule = await getProjectSchedule(project, siteData);
            const analyzedSchedule = calculateCriticalPath(dynamicSchedule);
            const reportHtml = await generateReportHtml(project, siteData, analyzedSchedule);
            await PDFGenerator.generate({ tempContent: reportHtml, projectJobNo: currentJobNo, fileName: `${project.jobNo}_Project_Status_Report_${new Date().toISOString().split('T')[0]}` });
        } catch (error) {
            console.error("Error generating project report:", error);
            alert("An error occurred while generating the report. Please check the console for details.");
        }
    }
    async function generateReportHtml(project, siteData, analyzedSchedule) {
        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        const prevWorkDoneValue = (siteData.boq || []).reduce((sum, item) => {
            const itemAmount = (item.qty || 0) * (item.rate || 0);
            return sum + (itemAmount * ((item.prev_perc || 0) / 100));
        }, 0);

        const nextTwoWeeksTasks = analyzedSchedule.filter(task => {
            const taskStart = new Date(task.start);
            const taskEnd = new Date(task.end);
            return (taskEnd >= today && taskStart <= twoWeeksFromNow);
        }).sort((a,b) => new Date(a.start) - new Date(b.start));

        const criticalTasksList = analyzedSchedule.filter(t => t.isCritical).map(t => `<li>${t.name} (Duration: ${t.duration} days)</li>`).join('');

        const nextTasksHtml = nextTwoWeeksTasks.length > 0 ? nextTwoWeeksTasks.map(task => `
            <tr style="${task.isCritical ? 'background-color: #ffdddd;' : ''}">
                <td>${task.name}</td>
                <td>${task.start}</td>
                <td>${task.end}</td>
                <td>${task.isCritical ? '<strong>Yes</strong>' : 'No'}</td>
            </tr>
        `).join('') : '<tr><td colspan="4">No tasks scheduled in the next 14 days.</td></tr>';

        return `
            <div class="document-preview a4" style="font-family: sans-serif; font-size: 10pt;">
                <style>
                    .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; } .report-table th, .report-table td { border: 1px solid #ccc; padding: 6px; text-align: left; } .report-table th { background-color: #f2f2f2; } h1, h2, h3 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; } .report-header { text-align: center; margin-bottom: 30px; } .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;} .info-grid p { margin: 0; padding: 5px; border: 1px solid #eee; }
                </style>
                <div class="report-header"> <h1>Project Status Report</h1> <p>Report Date: ${today.toLocaleDateString('en-GB')}</p> </div>
                <h3>Project Information</h3>
                <div class="info-grid"> <p><strong>Project:</strong> ${project.projectDescription || 'N/A'}</p> <p><strong>Job No:</strong> ${project.jobNo || 'N/A'}</p> <p><strong>Client:</strong> ${project.clientName || 'N/A'}</p> <p><strong>Plot No:</strong> ${project.plotNo || 'N/A'}</p> </div>
                <h2>1. Work Done Summary</h2>
                <p><strong>Total Value of Previously Certified Work:</strong> ${prevWorkDoneValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED</p>
                <p><strong>Total Value of Work Done to Date:</strong> ${DOMElements.boqWorkDoneValue.textContent}</p>
                <p><strong>Current Overall Progress:</strong> ${siteData.progress || 0}%</p>
                <h2>2. Current Site Status</h2>
                <p>The current reported status of the site is: <strong>${siteData.status || 'Not specified'}</strong>.</p>
                ${(siteData.mom && siteData.mom.length > 0) ? `<p><strong>Latest MoM Summary:</strong> ${(siteData.mom.sort((a,b) => new Date(b.date) - new Date(a.date))[0].summary || 'N/A')}</p>` : ''}
                <h2>3. Planned Work (Next 14 Days)</h2>
                <p>The following tasks are planned to be active within the next 14 days. <span style="background-color: #ffdddd; padding: 2px 4px; border: 1px solid #f00;">Highlighted tasks</span> are on the critical path.</p>
                <table class="report-table"> <thead><tr><th>Task Name</th><th>Start Date</th><th>End Date</th><th>On Critical Path?</th></tr></thead> <tbody>${nextTasksHtml}</tbody> </table>
                <h2>4. Critical Path Analysis</h2>
                <p>The critical path represents the sequence of tasks that determines the total project duration. Any delay in a critical task will directly impact the project completion date. The analysis is based on the current dynamic schedule.</p>
                <p><strong>Identified Critical Tasks for Project Completion:</strong></p>
                <ul style="column-count: 2;">${criticalTasksList}</ul>
            </div>
        `;
    }
    function calculateCriticalPath(schedule) {
        const tasks = JSON.parse(JSON.stringify(schedule));
        const taskMap = new Map(tasks.map(task => [task.id, task]));

        tasks.forEach(task => {
            task.es = 0; task.ef = 0; task.ls = Infinity; task.lf = Infinity;
            task.successors = [];
            task.dependencies = task.dependencies || [];
        });

        tasks.forEach(task => {
            task.dependencies.forEach(depId => {
                const predecessor = taskMap.get(depId);
                if (predecessor) { predecessor.successors.push(task.id); }
            });
        });

        let changed = true;
        while(changed) {
            changed = false;
            tasks.forEach(task => {
                const maxEF = task.dependencies.reduce((max, depId) => Math.max(max, taskMap.get(depId)?.ef || 0), 0);
                const newES = maxEF;
                const newEF = newES + task.duration;
                if (task.es !== newES || task.ef !== newEF) {
                    task.es = newES; task.ef = newEF;
                    changed = true;
                }
            });
        }

        const projectDuration = Math.max(...tasks.map(t => t.ef));
        tasks.forEach(task => {
            if (task.successors.length === 0) {
                task.lf = projectDuration;
                task.ls = task.lf - task.duration;
            }
        });
        
        changed = true;
        while(changed) {
            changed = false;
            for(let i = tasks.length - 1; i >= 0; i--) {
                const task = tasks[i];
                const minLS = task.successors.reduce((min, succId) => Math.min(min, taskMap.get(succId)?.ls || projectDuration), projectDuration);
                const newLF = minLS;
                const newLS = newLF - task.duration;
                if (task.lf !== newLF || task.ls !== newLS) {
                    task.lf = newLF; task.ls = newLS;
                    changed = true;
                }
            }
        }

        tasks.forEach(task => {
            task.slack = task.ls - task.es;
            task.isCritical = task.slack <= 1; 
        });

        return tasks;
    }
    function renderVendorSearchResults(results) {
        const container = DOMElements.vendorSearchResults;
        if (results.length === 0) {
            container.innerHTML = '<p>No matching items found.</p>';
            return;
        }
    
        let html = '<table class="output-table" style="font-size: 0.9em;"><thead><tr><th>Category</th><th>Item</th><th>Approved Manufacturers / Suppliers</th></tr></thead><tbody>';
        results.forEach(result => {
            const manufacturersList = result.manufacturers.map(m => `<li>${m}</li>`).join('');
            html += `
                <tr>
                    <td>${result.category}</td>
                    <td>${result.item}</td>
                    <td><ul style="margin:0; padding-left: 15px;">${manufacturersList}</ul></td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

       function handleVendorSearch() {
        const searchTerm = DOMElements.vendorSearchInput.value.toLowerCase().trim();
        if (searchTerm.length < 3) {
            DOMElements.vendorSearchResults.innerHTML = '<p style="color:#888;">Please enter at least 3 characters.</p>';
            return;
        }
    
        const results = [];
        for (const category in VENDOR_LIST) {
            VENDOR_LIST[category].forEach(entry => {
                const itemMatch = entry.item.toLowerCase().includes(searchTerm);
                const manufacturerMatch = entry.manufacturers.some(m => m.toLowerCase().includes(searchTerm));
                if (itemMatch || manufacturerMatch) {
                    results.push({ ...entry, category });
                }
            });
        }
        renderVendorSearchResults(results);
    }
    
    // 1. Material List
    async function renderMaterialList() {
        DOMElements.materialApprovalList.innerHTML = '<p>Material list rendering placeholder. (Add Material Submittal Modal/List here)</p>';
        if (!currentJobNo) return;
        
    }
    
    function openMaterialModal(materialId) { /* Logic to open modal for new/edit material */ alert('Material Submittal Modal Placeholder'); }
    
    // 2. Subcontractors
    async function renderSubcontractorList() {
        DOMElements.subcontractorList.innerHTML = '<p>Subcontractor list rendering placeholder. (Add Subcontractor Modal/List here)</p>';
        if (!currentJobNo) return;
    }
    function openSubcontractorModal(subId) { /* Logic to open modal for new/edit sub */ alert('Subcontractor Modal Placeholder'); }

    // 3. Long Lead Items
    async function renderLongLeadItems() {
        DOMElements.longLeadTableBody.innerHTML = '<tr><td colspan="10">Long lead item tracking coming soon. (Implement detailed table rendering)</td></tr>';
        if (!currentJobNo) return;
    }
    
    // 4. MoM Task Follow-up (Links MoM actions to a centralized list)
    async function renderMomTaskFollowup() {
        const followUpDiv = document.getElementById('mom-list');
        if (!currentJobNo) {
             followUpDiv.innerHTML = '<p>No MoM recorded.</p>'; // Fallback if project is not selected
             return;
        }
        
        const siteData = await DB.getSiteData(currentJobNo);
        let html = '<h5 style="margin-top: 10px;">Action Item Follow-up (for this Project)</h5>';
        let tasksFound = false;
        
        (siteData.mom || []).forEach(mom => {
            (mom.actions || []).forEach((action, actionIndex) => {
                if (action.by && action.status && action.desc) {
                    tasksFound = true;
                    html += `
                        <div class="mom-list-item" style="background: #fff;">
                            <span class="mom-list-info">
                                <strong>Action: ${action.desc}</strong>
                                <br><small>Due: ${action.date || 'N/A'} | Status: ${action.status} | MoM Ref: ${mom.ref || 'N/A'}</small>
                            </span>
                            <button class="secondary-button small-button preview-mom-btn" data-index="${siteData.mom.indexOf(mom)}" data-job-no="${currentJobNo}">View MoM</button>
                        </div>
                    `;
                }
            });
        });
        
        if (!tasksFound) {
            followUpDiv.innerHTML = '<p>No open or tracked action items found in MoMs for this project.</p>';
        } else {
            followUpDiv.innerHTML = html;
        }
    }

    // 5. RFI Tracking
    async function renderRfiLog() {
        DOMElements.rfiLogList.innerHTML = '<p>RFI log rendering placeholder. (List RFI No., Status, Approvers)</p>';
        if (!currentJobNo) return;
    }
    function openRfiModal(rfiId) { /* Logic to open modal for RFI data entry/tracking */ alert('RFI Tracking Modal Placeholder'); }

    // 6. Project Uploads / NOC Tracking
    async function renderNocTracker() {
        DOMElements.nocTracker.innerHTML = '<table class="mom-table"><thead><tr><th>NOC Type</th><th>Required By</th><th>Status</th><th>Date Submitted</th><th>Date Approved</th></tr></thead><tbody><tr><td colspan="5">NOC tracking table placeholder.</td></tr></tbody></table>';
        if (!currentJobNo) return;
    }

    // 7. Bulletin/Task Assignment
    async function renderBulletinFeed() {
        DOMElements.bulletinFeed.innerHTML = '<p>Loading bulletins...</p>';
        if (!currentJobNo) return;
        // NOTE: DB.getBulletinItems needs to be modified in database.js to filter by jobNo
        const bulletins = await DB.getBulletinItems(); 
        
        let html = '<ul style="list-style:none; padding:0;">';
        bulletins.filter(b => b.jobNo === currentJobNo).forEach(b => {
             html += `
                <li style="border-bottom: 1px solid #eee; padding: 8px 0;">
                    <strong>${b.subject}</strong> (From: ${b.author || 'System'})
                    <br><small>${b.details.substring(0, 100)}...</small>
                    ${b.assignedTo ? `<span style="float:right; background:#fff3cd; padding:2px 5px; border-radius:3px;">To: ${b.assignedTo}</span>` : ''}
                </li>`;
        });
        html += '</ul>';
        DOMElements.bulletinFeed.innerHTML = html || '<p>No bulletins posted for this project.</p>';
    }
    

    // 8. Tools Enhancement (Zip Download)
    async function handleDownloadProjectFilesZip() {
        if (!currentJobNo) { alert("Please select a project first."); return; }
        
        alert("Project file zipping functionality is planned but not yet implemented. (Requires server-side processing or advanced client-side zip library).");
        // Implementation placeholder for zipping site and master files related to currentJobNo
    }

});