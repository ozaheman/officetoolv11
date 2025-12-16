//--- START OF FILE app.js ---

// Global App object to hold shared state, DOM elements, and helper functions
// This MUST be defined before any of the tab modules are loaded.
const App = {
currentProjectJobNo: null,
currentInvoiceIndex: null,
showAllInvoices: false,
DOMElements: {},
ProjectTabs: {}, // To hold all the project tab modules
formatCurrency: (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(Math.round(num || 0)),
formatDate: (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-CA') : '',
readFileAsDataURL: (file) => {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = error => reject(error);
reader.readAsDataURL(file);
});
},
setSelectOrOther: (selectEl, otherInputEl, value, otherValue) => {
if (!selectEl || !otherInputEl) return;
const optionExists = Array.from(selectEl.options).some(opt => opt.value === value);
if (optionExists && value) {
selectEl.value = value;
otherInputEl.value = '';
if (otherInputEl.parentElement) otherInputEl.parentElement.style.display = 'none';
} else {
selectEl.value = 'Other';
otherInputEl.value = value || otherValue || '';
if (otherInputEl.parentElement) otherInputEl.parentElement.style.display = 'block';
}
}
};

document.addEventListener('DOMContentLoaded', () => {
let lastScrumCheck = new Date(); // For periodic checks


// --- BULLETIN MODULE ---
const Bulletin = (() => {
    async function log(title, body) {
        const newItem = { title, body, timestamp: new Date() };
        await DB.addBulletinItem(newItem);
        await render();
    }
    async function render() {
        const items = await DB.getBulletinItems(20);
        const container = App.DOMElements['bulletin-list'];
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = '<p style="color: #888; text-align: center; padding-top: 20px;">No recent activity.</p>';
        } else {
            container.innerHTML = items.map(item => `
            <div class="bulletin-item">
                <div class="bulletin-item-header">
                    <span class="bulletin-item-title">${item.title}</span>
                    <span class="bulletin-item-time">${new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div class="bulletin-item-body">${item.body}</div>
            </div>`).join('');
        }
    }
    return { log, render };
})();
App.Bulletin = Bulletin; // Make it globally accessible

// --- DASHBOARD CALENDAR MODULE ---
const DashboardCalendar = (() => {
    let calendarDate = new Date();
    function changeMonth(offset) {
        calendarDate.setMonth(calendarDate.getMonth() + offset);
        render();
    }
    async function render() {
        const allStaff = await DB.getAllHRData();
        const eventsByDate = {};
        allStaff.forEach(staff => {
            (staff.leaves || []).forEach(leave => {
                let currentDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);
                endDate.setDate(endDate.getDate() + 1);
                while (currentDate < endDate) {
                    const dateKey = currentDate.toDateString();
                    if (!eventsByDate[dateKey]) {
                        eventsByDate[dateKey] = [];
                    }
                    eventsByDate[dateKey].push(staff.name);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
        });
        App.DOMElements['dash-cal-month-year'].textContent = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const gridBody = App.DOMElements['dash-cal-body'];
        gridBody.innerHTML = '';
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay();
        const currentDay = new Date(firstDayOfMonth);
        currentDay.setDate(currentDay.getDate() - startDayOfWeek);
        for (let i = 0; i < 42; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'dash-cal-day';
            const dayNum = document.createElement('span');
            dayNum.className = 'dash-cal-day-num';
            dayNum.textContent = currentDay.getDate();
            dayCell.appendChild(dayNum);
            if (currentDay.getMonth() !== month) dayCell.classList.add('other-month');
            if (currentDay.getTime() === today.getTime()) dayCell.classList.add('today');
            const dateKey = currentDay.toDateString();
            if (eventsByDate[dateKey]) {
                dayCell.classList.add('on-leave');
                dayCell.title = `On Leave:\n${eventsByDate[dateKey].join('\n')}`;
            }
            gridBody.appendChild(dayCell);
            currentDay.setDate(currentDay.getDate() + 1);
        }
    }
    return { render, changeMonth };
})();

// --- INITIALIZATION ---
async function main() {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
        await DB.init();
        cacheDOMElements();
        Object.values(App.ProjectTabs).forEach(module => module.init?.());
        initResizer();
        setupEventListeners();
        await renderDashboard();
        await DashboardCalendar.render();
        await Bulletin.render();
        setInterval(checkForUpdates, 5 * 60 * 1000);
    } catch (error) {
        console.error("Fatal Error initializing application:", error);
        document.body.innerHTML = `<div style='padding:40px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not initialize the database. Please try clearing your browser's cache and site data for this page and try again.</p><p><i>Error: ${error.message}</i></p></div>`;
    }
}
// MODIFICATION START: Added helper to refresh Design Studio selector
App.refreshDesignStudioSelector = async function() {
    const projects = await DB.getAllProjects();
    // Filter for projects that are typically design-focused
    const designProjects = projects.filter(p => !(p.scopeOfWorkTypes?.['Modification'] || p.scopeOfWorkTypes?.['AOR Service']));
    const selector = App.DOMElements['design-project-selector'];
    if (!selector) return;

    const currentValue = selector.value; // Save current selection
    selector.innerHTML = '<option value="">-- All Projects (Cumulative View) --</option>';
    designProjects.forEach(p => {
        const isSelected = p.jobNo === currentValue ? ' selected' : '';
        selector.innerHTML += `<option value="${p.jobNo}"${isSelected}>${p.jobNo} - ${p.projectDescription || p.clientName}</option>`;
    });
};
// MODIFICATION END
async function checkForUpdates() {
    console.log("Checking for updates...");
    const allScrumData = await DB.getAllScrumData();
    const now = new Date();
    for (const scrum of allScrumData) {
        for (const task of scrum.tasks) {
            const dueDate = new Date(task.dueDate);
            if (dueDate >= lastScrumCheck && dueDate < now && task.status !== 'Done') {
                 Bulletin.log('Task Nearing Due Date', `Task "<strong>${task.name}</strong>" for project <strong>${scrum.jobNo}</strong> is due today.`);
            }
        }
    }
    lastScrumCheck = now;
    console.log("Update check complete.");
}

// --- VIEW MANAGEMENT ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewToShow = App.DOMElements[viewId];
    if(viewToShow) viewToShow.classList.add('active');
}

function showDashboard() {
    App.currentProjectJobNo = null;
    App.currentInvoiceIndex = null;
    showView('dashboard-view');
    renderDashboard();
}
function showProjectView() {
    showView('project-view');
}

function generateScrumProgressBarHtml(scrumData) {
    if (!scrumData || !scrumData.tasks || scrumData.tasks.length === 0) {
        return '';
    }
    const totalTasks = scrumData.tasks.length;
    const completedTasksByDept = scrumData.tasks.reduce((acc, task) => {
        if (task.status === 'Done') {
            const dept = task.department || 'Default';
            if (!acc[dept]) acc[dept] = 0;
            acc[dept]++;
        }
        return acc;
    }, {});

    let segmentsHtml = '';
    let totalDone = 0;
    const departments = Object.keys(completedTasksByDept).sort(); 

    for (const dept of departments) {
        const doneCount = completedTasksByDept[dept];
        totalDone += doneCount;
        const percentage = (doneCount / totalTasks) * 100;
        const color = DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS['Default'];
        segmentsHtml += `<div class="scrum-progress-segment" style="width: ${percentage}%; background-color: ${color};" title="${dept}: ${doneCount} tasks"></div>`;
    }
    
    const overallProgress = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0;
    const overallTitle = `Overall Scrum Progress: ${totalDone}/${totalTasks} tasks completed (${overallProgress.toFixed(1)}%).`;
    return `<div class="scrum-progress-bar" title="${overallTitle}">${segmentsHtml}</div>`;
}

// --- DASHBOARD FUNCTIONS ---
async function renderDashboard() {
    const allProjects = await DB.getAllProjects();
    const allSiteData = await DB.getAllSiteData();
    const siteDataMap = new Map(allSiteData.map(data => [data.jobNo, data]));

    await updateDashboardSummary(allProjects);

    const tbody = App.DOMElements['project-list-body'];
    tbody.innerHTML = '';
    if (allProjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No projects found. Use "Import Master" to add projects.</td></tr>';
        return;
    }

    const searchTerm = App.DOMElements['search-box'].value.toLowerCase().trim();
    const searchWords = searchTerm.split(' ').filter(word => word.length > 0);

    const filteredProjects = allProjects.filter(p => {
        if (searchWords.length === 0) return true;
        const projectDataToSearch = [p.clientName, p.plotNo, p.jobNo, p.projectType, p.area, ...(p.invoices || []).map(inv => inv.no)].filter(Boolean).join(' ').toLowerCase();
        return searchWords.every(word => projectDataToSearch.includes(word));
    });

    for (const p of filteredProjects.sort((a, b) => b.jobNo.localeCompare(a.jobNo))) {
        const row = tbody.insertRow();
        row.dataset.jobNo = p.jobNo;
        const siteData = siteDataMap.get(p.jobNo) || {};
        const siteStatus = siteData.status || 'N/A';
        const progress = siteData.progress || 0;
        const officeStatusClass = (p.projectStatus || 'pending').toLowerCase().replace(/ /g, '-');
        const siteStatusClass = siteStatus.toLowerCase().replace(/ /g, '-');
        
        const scrumData = await DB.getScrumData(p.jobNo);
        const scrumProgressHtml = generateScrumProgressBarHtml(scrumData);

        const statusHtml = `<div>Office: <span class="status-${officeStatusClass}">${p.projectStatus || 'Pending'}</span></div> <div style="margin-top:4px;">Site: <span class="status-${siteStatusClass}">${siteStatus}</span></div> <div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div>${scrumProgressHtml}`;
        
        const masterFiles = await DB.getFiles(p.jobNo, 'master');
        const affectionPlanFile = masterFiles.find(f => f.subCategory === 'affection_plan');
        const docHtml = affectionPlanFile ? `<a href="#" class="file-link" data-file-id="${affectionPlanFile.id}">Affection Plan</a>` : `<span class="file-link not-available">Affection Plan</span>`;
        
        const invoicesToDisplay = App.showAllInvoices ? (p.invoices || []) : (p.invoices || []).filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
        const invoiceDetailsHtml = invoicesToDisplay.length > 0 ? invoicesToDisplay.map(inv => `<div class="invoice-row status-${(inv.status || '').toLowerCase()}"><span><b>${inv.no}</b></span><span>${inv.date}</span><span style="font-weight:bold; text-align:right;">${App.formatCurrency(parseFloat(inv.total || 0))}</span><span>(${inv.status})</span></div>`).join('') : (App.showAllInvoices ? 'No invoices' : 'No pending invoices');
        
        let actionsHtml = `<button class="edit-btn">View/Edit</button>`;
        if (p.projectStatus === 'Under Supervision') {
            actionsHtml += `<button class="bill-monthly-btn secondary-button" data-job-no="${p.jobNo}">+ Monthly Inv</button>`;
        }

        row.innerHTML = `<td>${p.jobNo}</td><td>${p.clientName}<br><small>${p.clientMobile||''}</small></td><td>${p.plotNo}<br><small><b>${p.projectType || 'N/A'}</b> / ${p.agreementDate||''}</small></td><td>${statusHtml}</td><td>${docHtml}</td><td><div class="invoice-container">${invoiceDetailsHtml}</div></td><td>${actionsHtml}</td>`;
    }
}


async function updateDashboardSummary(projects) {
    let totalPendingAmount = 0, pendingInvoiceCount = 0, totalOnHoldAmount = 0, lastPaidInvoice = null; // NEW: Built-Up Area Calc
    let totalBUA = 0;
    let supervisionBUA = 0;
    let progressBUA = 0;

    projects.forEach(p => {
        const area = parseFloat(p.builtUpArea) || 0;
        const status = p.projectStatus || '';
        
        // Sum based on logic
        if (status === 'Under Supervision') supervisionBUA += area;
        if (status === 'In Progress' || status === 'Design Stage') progressBUA += area;
        
        // You can define what counts as "Total" (active projects)
        if (status !== 'Completed' && status !== 'Cancelled') {
            totalBUA += area;
        }
    });

    document.getElementById('total-bua-display').textContent = `${totalBUA.toLocaleString()} sq.ft`;
    document.getElementById('bua-supervision').textContent = supervisionBUA.toLocaleString();
    document.getElementById('bua-progress').textContent = progressBUA.toLocaleString();
    projects.forEach(p => {
        (p.invoices || []).forEach(inv => {
            if (inv.status === 'Paid' && inv.paymentDetails) {
                 if (!lastPaidInvoice || new Date(inv.paymentDetails.date) > new Date(lastPaidInvoice.paymentDetails.date)) {
                    lastPaidInvoice = inv;
                }
            } else if (inv.status === 'Raised' || inv.status === 'Pending') {
                pendingInvoiceCount++;
                totalPendingAmount += parseFloat(inv.total || 0);
            } else if (inv.status === 'On Hold') {
                totalOnHoldAmount += parseFloat(inv.total || 0);
            }
        });
    });

    App.DOMElements['pending-invoices-count'].textContent = pendingInvoiceCount;
    App.DOMElements['pending-invoices-amount'].textContent = ` ${App.formatCurrency(totalPendingAmount)}`;
    App.DOMElements['last-paid-amount'].textContent = lastPaidInvoice ? ` ${App.formatCurrency(lastPaidInvoice.paymentDetails.amountPaid)}` : 'N/A';
    App.DOMElements['on-hold-amount'].textContent = ` ${App.formatCurrency(totalOnHoldAmount)}`;
    
    const allMasterFiles = await DB.getAllFiles('master');
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const expiringDocs = allMasterFiles.filter(file => {
        if (!file.expiryDate) return false;
        const expiry = new Date(file.expiryDate);
        return expiry >= now && expiry <= thirtyDaysFromNow;
    });
    App.DOMElements['expiring-documents-count'].textContent = expiringDocs.length;
}

async function showPendingInvoicesModal() {
    const allProjects = await DB.getAllProjects();
    const pendingInvoices = allProjects.flatMap(p => 
        (p.invoices || [])
        .filter(inv => inv.status === 'Raised' || inv.status === 'Pending')
        .map(inv => ({...inv, jobNo: p.jobNo, clientName: p.clientName, projectDescription: p.projectDescription}))
    );

    const listEl = App.DOMElements['pending-invoice-list'];
    if (pendingInvoices.length === 0) {
        listEl.innerHTML = '<p>No pending invoices found.</p>';
    } else {
        let tableHtml = `<table class="output-table"><thead><tr><th>Inv No.</th><th>Project</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>`;
        pendingInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
        tableHtml += pendingInvoices.map(inv => `<tr>
                <td>${inv.no}</td><td>${inv.projectDescription || inv.jobNo}</td><td>${inv.clientName}</td>
                <td>${App.formatDate(inv.date)}</td><td style="text-align:right;">${App.formatCurrency(inv.total)}</td>
                <td><span class="status-${inv.status.toLowerCase()}">${inv.status}</span></td>
            </tr>`).join('');
        tableHtml += '</tbody></table>';
        listEl.innerHTML = tableHtml;
    }
    App.DOMElements['pending-invoice-modal'].style.display = 'flex';
}

async function showExpiringDocumentsModal() {
    const allFiles = await DB.getAllFiles();
    const allProjects = await DB.getAllProjects();
    const projectMap = new Map(allProjects.map(p => [p.jobNo, p]));
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringDocs = allFiles.filter(file => {
        if (!file.expiryDate) return false;
        const expiry = new Date(file.expiryDate);
        return expiry >= now && expiry <= thirtyDaysFromNow;
    });

    const listEl = App.DOMElements['expiring-documents-list'];
    if (expiringDocs.length === 0) {
        listEl.innerHTML = '<p>No documents are expiring in the next 30 days.</p>';
    } else {
        let tableHtml = `<table class="output-table"><thead><tr><th>Document</th><th>Project</th><th>Job No</th><th>Expiry Date</th><th>Days Left</th></tr></thead><tbody>`;
        expiringDocs.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        tableHtml += expiringDocs.map(doc => {
            const expiry = new Date(doc.expiryDate);
            const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            const daysLeftClass = daysLeft <= 7 ? 'danger' : (daysLeft <= 15 ? 'warning' : '');
            const project = projectMap.get(doc.jobNo);
            return `<tr>
                <td>${doc.name}</td><td>${project?.projectDescription || doc.jobNo}</td><td>${doc.jobNo}</td>
                <td>${App.formatDate(doc.expiryDate)}</td><td class="${daysLeftClass}">${daysLeft}</td>
            </tr>`;
        }).join('');
        tableHtml += '</tbody></table>';
        listEl.innerHTML = tableHtml;
    }
    App.DOMElements['expiring-documents-modal'].style.display = 'flex';
}

// --- MODIFICATION START: Functions for All Projects Report Modal & Quick Billing ---
async function showAllProjectsReportModal() {
    const allProjects = await DB.getAllProjects();
    const projectListContainer = App.DOMElements['all-projects-report-project-list'];
    projectListContainer.innerHTML = '';
    allProjects
        .sort((a, b) => b.jobNo.localeCompare(a.jobNo))
        .forEach(p => {
            projectListContainer.innerHTML += `
                <label><input type="checkbox" name="reportProject" value="${p.jobNo}"> ${p.jobNo} - ${p.projectDescription || p.clientName}</label>
            `;
        });
    App.DOMElements['all-projects-report-modal'].style.display = 'flex';
}

async function generateAndShowMultiReport() {
    const previewContainer = App.DOMElements['all-projects-report-preview-container'];
    previewContainer.innerHTML = '<h3>Generating Combined Report... Please Wait</h3>';

    const selectedProjectIds = Array.from(document.querySelectorAll('input[name="reportProject"]:checked')).map(cb => cb.value);
    const selectedSections = Array.from(document.querySelectorAll('input[name="multiReportSection"]:checked')).map(cb => cb.value);

    if (selectedProjectIds.length === 0) {
        previewContainer.innerHTML = '<p>Please select at least one project.</p>';
        return;
    }

    let combinedHtml = '';
    const allStaff = await DB.getAllHRData();

    for (const jobNo of selectedProjectIds) {
        const project = await DB.getProject(jobNo);
        const siteData = await DB.getSiteData(jobNo);
        const scrumData = await DB.getScrumData(jobNo);
        const feeDistribution = App.ProjectTabs.Fees.getFeeDistribution(project);

        const reportData = { project, siteData, scrumData, allStaff, feeDistribution, selectedSections };
        
        // Generate report for one project and add it to the combined HTML
        // We remove the outer 'document-preview' wrapper to avoid nesting issues.
        let singleReportHtml = PROJECT_DOCUMENT_TEMPLATES.projectReport(reportData);
        singleReportHtml = singleReportHtml
            .replace('<div class="document-preview a4">', `<div class="report-section" style="page-break-after: always;">`)
            .replace(/<\/div>$/, '</div>'); // replace last div
        
        combinedHtml += singleReportHtml;
    }

    previewContainer.innerHTML = combinedHtml;
    App.DOMElements['download-multi-report-pdf-btn'].style.display = 'block';
}

async function handleQuickBillMonthly(jobNo) {
    if (!confirm(`This will raise a new monthly supervision invoice for project ${jobNo}. Continue?`)) {
        return;
    }
    
    const project = await DB.getProject(jobNo);
    if (!project) {
        alert("Error: Project not found.");
        return;
    }
    
    // Fee distribution calculation
    const totalConsultancyFee = (project.remunerationType === 'lumpSum') ? (project.lumpSumFee || 0) : ((project.builtUpArea || 0) * (project.constructionCostRate || 0) * ((project.consultancyFeePercentage || 0) / 100));
    const designFeeSplit = project.designFeeSplit || 60;
    const supervisionFeePortion = totalConsultancyFee * ((100 - designFeeSplit) / 100);
    const monthlySupervisionFee = supervisionFeePortion / (project.constructionDuration || 1);

    // Determine the next month to bill
    const allInvoiceItems = (project.invoices || []).flatMap(inv => inv.items || []);
    const billedRegularMonths = allInvoiceItems.filter(item => item.type === 'supervision' && (item.supervisionType === 'regular' || !item.supervisionType)).length;
    const billedExtendedMonths = allInvoiceItems.filter(item => item.type === 'supervision' && item.supervisionType === 'extended').length;

    let newItem;
    if (billedRegularMonths < project.constructionDuration) {
        const nextMonthNumber = billedRegularMonths + 1;
        newItem = {
            type: 'supervision', supervisionType: 'regular',
            description: `${nextMonthNumber}st payment on Monthly Supervision fees (Month ${nextMonthNumber} of ${project.constructionDuration})`,
            amount: monthlySupervisionFee
        };
    } else {
        const nextExtendedMonthNumber = billedExtendedMonths + 1;
        newItem = {
            type: 'supervision', supervisionType: 'extended',
            description: `Extended Supervision Fee - Month ${nextExtendedMonthNumber}`,
            amount: project.extendedSupervisionFee
        };
    }
    
    // Create and save the new invoice
    const lastInvNo = (project.invoices || []).reduce((max, inv) => {
        const num = parseInt(inv.no.split('-').pop(), 10);
        return !isNaN(num) ? Math.max(max, num) : max;
    }, 0);
    const newInvoiceNo = `UA-${project.jobNo.split('/').pop()}-${String(lastInvNo + 1).padStart(2, '0')}`;
    
    const subtotal = newItem.amount;
    const vat = subtotal * ((project.vatRate || 5) / 100);
    const total = subtotal + vat;

    const newInvoice = {
        no: newInvoiceNo,
        date: new Date().toISOString().split('T')[0],
        type: 'Tax Invoice',
        status: 'Raised',
        items: [newItem],
        subtotal, vat, total
    };
    
    if (!project.invoices) project.invoices = [];
    project.invoices.push(newInvoice);
    await DB.putProject(project);

    alert(`Invoice ${newInvoiceNo} for ${App.formatCurrency(total)} has been raised successfully.`);
    Bulletin.log('Invoice Raised', `Quick-billed invoice <strong>${newInvoiceNo}</strong> for project <strong>${jobNo}</strong>.`);
    
    await renderDashboard();
}
// --- MODIFICATION END ---

// --- DATA I/O ---
async function handleProjectFileImport(event) {
    const file = event.target.files[0]; if (!file) return;
    const xmlString = await file.text();
    const parsedProjects = loadProjectsFromXmlString(xmlString);
    if (parsedProjects?.length) {
        if (confirm(`This will import/update ${parsedProjects.length} projects. Continue?`)) {
            for (const p of parsedProjects) await DB.processProjectImport(p);
            await renderDashboard();
            alert(`Imported ${parsedProjects.length} projects.`);
            Bulletin.log('Master File Import', `Imported <strong>${parsedProjects.length}</strong> projects.`);
        }
    } else { alert('Could not parse XML file.'); }
    event.target.value = '';
}

async function handleSiteUpdateImport(event) {
    const file = event.target.files[0]; if (!file) return;
    const xmlString = await file.text();
    const parsedUpdates = loadProjectsFromXmlString(xmlString);
    if (parsedUpdates?.length) {
        if (confirm(`This will import site updates for ${parsedUpdates.length} projects. Continue?`)) {
            for (const update of parsedUpdates) await DB.processSiteUpdateImport(update);
            await renderDashboard();
            alert(`Imported site updates for ${parsedUpdates.length} projects.`);
            Bulletin.log('Site Data Import', `Imported updates for <strong>${parsedUpdates.length}</strong> projects.`);
        }
    } else { alert('Could not parse site update XML file.'); }
    event.target.value = '';
}
// Located in app.js

async function handleFileExport() {
    // --- UX Improvement: Provide feedback and prevent double-clicks ---
    const exportButton = document.getElementById('save-to-file-btn');
    if (!exportButton) return;
    
    const originalButtonText = exportButton.textContent;
    exportButton.disabled = true;
    exportButton.textContent = 'Exporting...';

    try {
        // --- Performance Improvement: Fetch all data in minimal queries ---
        const allProjects = await DB.getAllProjects();
        if (allProjects.length === 0) {
            alert("No projects to export.");
            return;
        }
        
        // Fetch ALL files in a single query
        const allFiles = await DB.getAllFiles();

        const allScrumData = await DB.getAllScrumData();
        // --- Performance Improvement: Group files in memory instead of repeated DB calls ---
        const filesByJobNo = allFiles.reduce((acc, file) => {
                if (!acc.has(file.jobNo)) acc.set(file.jobNo, []);
            acc.get(file.jobNo).push(file);
            return acc;
        }, new Map());

        const scrumByJobNo = allScrumData.reduce((acc, scrum) => {
            acc.set(scrum.jobNo, scrum.tasks);
            return acc;
        }, new Map());

        // --- Data Integrity & Bug Fix: Create clean export data without mutating originals ---
        const projectsForExport = allProjects.map(project => {
            // Create a clean copy of the project to avoid mutating the original object
            const projectData = { ...project };
            
            const projectFiles = filesByJobNo.get(project.jobNo);
            
            // BUG FIX: Attach ALL documents, not just 'master'
            if (projectFiles && projectFiles.length > 0) {
                // Map the files to the desired export format
                projectData.documents = projectFiles.map(f => ({
                    name: f.name,
                    category: f.category,
                    subCategory: f.subCategory,
                    expiryDate: f.expiryDate,
                    fileType: f.fileType,
                    dataUrl: f.dataUrl // Renamed for clarity in export
                }));
            } else {
                projectData.documents = []; // Ensure the documents property always exists
            }
            
            // This is a good place to remove any temporary or runtime properties if needed
            // delete projectData.someTemporaryKey;
 const projectScrumTasks = scrumByJobNo.get(project.jobNo);
            if (projectScrumTasks) {
                projectData.scrumTasks = projectScrumTasks;
            }
            return projectData;
        });

        // Use the robust XML handler to generate the string
        const xmlString = saveProjectsToXmlString(projectsForExport);
        
        // Standard download logic
        const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `UrbanAxis_MasterProjects_${new Date().toISOString().split('T')[0]}.xml`;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

    } catch (error) {
        console.error("Error during file export:", error);
        alert("An error occurred during export. Please check the console for details.");
    } finally {
        // --- UX Improvement: Restore the button state ---
        exportButton.disabled = false;
        exportButton.textContent = originalButtonText;
    }
}
async function handleFileExportx() {
    const projectsToExp = await DB.getAllProjects();
    if (projectsToExp.length === 0) { alert("No projects to export."); return; }
    for (const project of projectsToExp) {
        const masterFiles = await DB.getFiles(project.jobNo, 'master');
        if (masterFiles.length > 0) {
            project.masterDocuments = masterFiles.map(f => ({
                name: f.name, category: f.category, subCategory: f.subCategory,
                expiryDate: f.expiryDate, type: f.fileType, data: f.dataUrl
            }));
        }
    }
    const xmlString = saveProjectsToXmlString(projectsToExp);
    const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `UrbanAxis_MasterProjects_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// --- PROJECT EDITOR ---
async function handleEditProject(jobNo) {
    App.currentProjectJobNo = jobNo;
    App.currentInvoiceIndex = null;
    const project = await DB.getProject(jobNo);
    if (project) {
        Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(project));
        App.DOMElements['project-view-title'].textContent = `Editing Project: ${jobNo}`;
        showProjectView();
        App.ProjectTabs.Invoicing.renderInvoicingTab(project);
        App.ProjectTabs.PaymentCert.renderTab(project);
        App.ProjectTabs.Documents.renderAllGalleries(jobNo);
        App.ProjectTabs.Tools.populateTabData(project);
        refreshCurrentPreview();
    }
}

async function handleNewProject() {
    const allProjects = await DB.getAllProjects();
    const nextId = allProjects.length > 0 ? Math.max(...(allProjects.map(p => parseInt(p.jobNo.split('/').pop(), 10) || 0))) + 1 : 1;
    const jobNo = `RRC/${new Date().getFullYear()}/${String(nextId).padStart(3, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    let newProject = { 
        jobNo, agreementDate: todayStr, scope: {}, notes: {}, invoices: [], 
        remunerationType: 'percentage', vatRate: 5, designFeeSplit: 60, supervisionBillingMethod: 'monthly', 
        feeMilestones: (CONTENT.FEE_MILESTONES || []).map(m => ({ id: m.id, text: m.text, percentage: m.defaultPercentage })),
        scheduleTasks: []
    };
   
    const scrumTasks = (window.DESIGN_SCRUM_TEMPLATE || []).map(task => ({
        ...task, status: 'Up Next', assigneeId: null, dueDate: null, startDate: null,
        completedDate: null, dateAdded: todayStr, plannedDuration: task.duration
    }));
    await DB.putScrumData({ jobNo: jobNo, tasks: scrumTasks });
    
    newProject.scheduleTasks = UrbanAxisSchedule.calculateDynamicSchedule(newProject, CONTENT.VILLA_SCHEDULE_TEMPLATE, []);

    App.currentProjectJobNo = jobNo;
    App.currentInvoiceIndex = null;

    Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(newProject));
    App.ProjectTabs.Invoicing.renderInvoicingTab(newProject);
    
    App.DOMElements['project-view-title'].textContent = `Creating New Project: ${jobNo}`;
    showView('project-view');
    App.DOMElements['documents-tab'].querySelectorAll('.gallery-grid').forEach(grid => { grid.innerHTML = '<p>Please save the project before uploading documents.</p>'; });
    Bulletin.log('New Project Created', `Project <strong>${jobNo}</strong> has been created.`);
    refreshCurrentPreview();
} 

async function saveCurrentProject() {
    if (!App.currentProjectJobNo) return;
    let uiData = {};
    Object.values(App.ProjectTabs).forEach(tabModule => {
        if (tabModule.getTabData) {
            Object.assign(uiData, tabModule.getTabData());
        }
    });
    const existingProject = await DB.getProject(App.currentProjectJobNo) || {};
    
    if (uiData.projectStatus === 'Under Supervision' && !existingProject.supervisionStartDate) {
        uiData.supervisionStartDate = new Date().toISOString().split('T')[0];
        Bulletin.log('Supervision Started', `Supervision phase for project <strong>${App.currentProjectJobNo}</strong> recorded.`);
    }

    if (existingProject.projectStatus !== uiData.projectStatus) {
        Bulletin.log('Project Status Changed', `Status for project <strong>${App.currentProjectJobNo}</strong> changed to <strong>${uiData.projectStatus}</strong>.`);
    }
    const projectToSave = { ...existingProject, ...uiData, jobNo: App.currentProjectJobNo };
    await DB.putProject(projectToSave);
    
    alert(`Project ${App.currentProjectJobNo} saved successfully.`);

    // MODIFICATION: Re-populate UI with the newly saved data
    const savedProject = await DB.getProject(App.currentProjectJobNo);
    Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(savedProject));
    App.ProjectTabs.Invoicing.renderInvoicingTab(savedProject);
    
    await renderDashboard();
}


// --- PREVIEW HANDLING ---
function refreshCurrentPreview() {
    const activeTab = App.DOMElements.previewTabs?.querySelector('.tab-button.active');
    if (activeTab) updateActivePreview(activeTab.dataset.tab);
}
App.refreshCurrentPreview = refreshCurrentPreview;

async function updateActivePreview(tabId) {
    if (typeof PROJECT_DOCUMENT_TEMPLATES === 'undefined' || typeof PROJECT_LETTER_TEMPLATES === 'undefined') {
        console.error("Template objects not found."); return;
    }
    if (!App.currentProjectJobNo) return;

    const project = await DB.getProject(App.currentProjectJobNo);
    if (!project) return;
    
    let uiData = {};
    Object.values(App.ProjectTabs).forEach(tabModule => {
        if (tabModule.getTabData) Object.assign(uiData, tabModule.getTabData());
    });

    const fullData = { ...project, ...uiData, masterFiles: await DB.getFiles(App.currentProjectJobNo, 'master') };
    const feeDistribution = App.ProjectTabs.Fees.getFeeDistribution(fullData);

    const renderMap = {
        'brief-proposal': () => PROJECT_DOCUMENT_TEMPLATES.briefProposal(fullData, feeDistribution),
        'full-agreement': () => PROJECT_DOCUMENT_TEMPLATES.fullAgreement(fullData, feeDistribution),
        'assignment-order': () => PROJECT_DOCUMENT_TEMPLATES.assignmentOrder(fullData),
        'proforma': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex]),
        'tax-invoice': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex]),
        'receipt': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex]),
        'tender-package': () => PROJECT_DOCUMENT_TEMPLATES.tenderPackage(fullData),
        'vendor-list': () => PROJECT_DOCUMENT_TEMPLATES.vendorList(fullData),
        'payment-certificate': () => App.ProjectTabs.PaymentCert.renderPreview(null),
        'villa-schedule': () => App.ProjectTabs.Schedule.schrenderPreview(fullData),
        'project-letter': () => App.ProjectTabs.Letters.renderPreview(),
        'project-report': () => App.ProjectTabs.Tools.renderPreview()
    };

    const renderFunc = renderMap[tabId];
    if (renderFunc) {
        const content = await renderFunc();
        if (content !== undefined) {
            const previewEl = App.DOMElements[`${tabId}-preview`];
            if (previewEl) {
                previewEl.innerHTML = content;
            }
        }
    }
}

// --- DESIGN STUDIO ---
async function showDesignStudio() {
    window.location.href = 'design+center.html';
}

// --- UI SETUP & EVENT LISTENERS ---
function populateControlTabs() {
    Object.values(App.ProjectTabs).forEach(module => module.init?.());
}

function handleTabSwitch(event) {
    
    // alert ('event');
    // alert (event);
    // alert (event.target.matches('.tab-button'));
     // alert (event.target);
    if (!event.target.matches('.tab-button')) return;
    const button = event.target;
    const tabsContainer = button.parentElement;
    tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const isControlTab = tabsContainer.classList.contains('control-tabs');
    const contentSelector = isControlTab ? '.tab-content' : '.preview-tab-content';
    const parentContainer = button.closest('.controls') || button.closest('.preview-area');
    parentContainer.querySelectorAll(contentSelector).forEach(panel => panel.classList.remove('active'));
    const panelIdToShow = isControlTab ? `${button.dataset.tab}-tab` : `${button.dataset.tab}-preview`;
    document.getElementById(panelIdToShow)?.classList.add('active');
    if (tabsContainer.classList.contains('preview-tabs')) {
        // alert('preview tab');
        updateActivePreview(button.dataset.tab);
    }
}

async function handleGeneratePdf() {
    if (!App.currentProjectJobNo) return;
    const activePreviewTab = App.DOMElements.previewTabs.querySelector('.tab-button.active');
    if (!activePreviewTab) { alert('Could not determine active preview tab.'); return; }
    const previewId = activePreviewTab.dataset.tab + "-preview";
    
    const project = await DB.getProject(App.currentProjectJobNo);
    const previewElement = document.getElementById(previewId);
    
    // Watermark logic
    let watermarkText = null;
    const activeTabKey = activePreviewTab.dataset.tab;
    if (['tax-invoice', 'proforma', 'receipt'].includes(activeTabKey)) {
        watermarkText = previewElement ? previewElement.dataset.invoiceNo : null;
    } else if (activeTabKey === 'payment-certificate') {
        const certNoEl = document.getElementById('payment-cert-no');
        watermarkText = certNoEl ? `Cert No: ${certNoEl.value}` : null;
    }

    const fileName = `${project.jobNo.replace(/\//g, '-')}_${activeTabKey}`;
    
    PDFGenerator.generate({
        previewId,
        projectJobNo: App.currentProjectJobNo,
        pageSize: App.DOMElements['page-size-selector'].value,
        fileName,
        watermarkData: watermarkText // Use watermarkData property
    });
}

function initResizer() {
    const resizer = App.DOMElements.resizer; 
    if(!resizer) return;
    const container = resizer.parentElement; 
    const leftPanel = container.querySelector('.controls');
    let isResizing = false, startX, startWidth;
    resizer.addEventListener('mousedown', (e) => { e.preventDefault(); isResizing = true; startX = e.clientX; startWidth = leftPanel.offsetWidth; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResize); });
    function handleMouseMove(e) { if (!isResizing) return; const newWidth = startWidth + (e.clientX - startX); if (newWidth > 300 && newWidth < (container.offsetWidth - 300)) leftPanel.style.width = newWidth + 'px'; }
    function stopResize() { isResizing = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResize); }
}

function setupEventListeners() {
    App.DOMElements['design-studio-btn']?.addEventListener('click', showDesignStudio);
    App.DOMElements['back-to-dashboard-btn']?.addEventListener('click', showDashboard);
    App.DOMElements['load-from-file-btn']?.addEventListener('click', () => App.DOMElements['xml-file-input']?.click());
    App.DOMElements['xml-file-input']?.addEventListener('change', handleProjectFileImport);
    App.DOMElements['load-site-update-btn']?.addEventListener('click', () => App.DOMElements['site-update-file-input']?.click());
    App.DOMElements['site-update-file-input']?.addEventListener('change', handleSiteUpdateImport);
    App.DOMElements['save-to-file-btn']?.addEventListener('click', handleFileExport);
    App.DOMElements['new-project-btn']?.addEventListener('click', handleNewProject);
    App.DOMElements['save-project-btn']?.addEventListener('click', saveCurrentProject);
    App.DOMElements.controlTabs?.addEventListener('click', handleTabSwitch);
    App.DOMElements.previewTabs?.addEventListener('click', handleTabSwitch);
    App.DOMElements['generate-pdf-btn']?.addEventListener('click', handleGeneratePdf);
    App.DOMElements['search-box']?.addEventListener('input', renderDashboard);
    App.DOMElements['toggle-invoices-btn']?.addEventListener('click', () => {
        App.showAllInvoices = !App.showAllInvoices;
        App.DOMElements['toggle-invoices-btn'].textContent = App.showAllInvoices ? 'Show Pending Invoices' : 'Show All Invoices';
        renderDashboard();
    });
    
    
    App.DOMElements['project-list-body']?.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        if (!row?.dataset?.jobNo && !e.target.matches('.bill-monthly-btn')) return;
        
        if (e.target.matches('.edit-btn')) handleEditProject(row.dataset.jobNo);
        else if (e.target.matches('.file-link:not(.not-available)')) {
            e.preventDefault();
            const fileId = parseInt(e.target.dataset.fileId, 10);
            const file = await DB.getFileById(fileId);
            if (file) App.ProjectTabs.Documents.showFilePreviewModal(file);
        } else if (e.target.matches('.bill-monthly-btn')) {
            e.preventDefault();
            const jobNo = e.target.dataset.jobNo;
            handleQuickBillMonthly(jobNo);
        }
    });
    App.DOMElements['dash-cal-prev-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(-1));
    App.DOMElements['dash-cal-next-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(1));
    App.DOMElements['pending-invoices-summary']?.addEventListener('click', showPendingInvoicesModal);
    App.DOMElements['expiring-documents-summary']?.addEventListener('click', showExpiringDocumentsModal);
    App.DOMElements['pending-modal-close-btn']?.addEventListener('click', () => App.DOMElements['pending-invoice-modal'].style.display = 'none');
    App.DOMElements['expiring-modal-close-btn']?.addEventListener('click', () => App.DOMElements['expiring-documents-modal'].style.display = 'none');
    App.DOMElements['site-files-modal-close-btn']?.addEventListener('click', () => App.DOMElements['site-files-modal'].style.display = 'none');
    
    const filePreviewModal = App.DOMElements['file-preview-modal'];
    filePreviewModal?.addEventListener('click', (e) => {
        if (e.target === filePreviewModal) {
            filePreviewModal.style.display = 'none';
        }
    });
    App.DOMElements['file-modal-close']?.addEventListener('click', () => filePreviewModal.style.display = 'none');
    
    App.DOMElements['payment-modal-close-btn']?.addEventListener('click', () => App.DOMElements['record-payment-modal'].style.display = 'none');
    
    // Listeners for All Projects Report Modal
    App.DOMElements['generate-all-projects-report-btn']?.addEventListener('click', showAllProjectsReportModal);
    App.DOMElements['all-projects-report-modal-close-btn']?.addEventListener('click', () => App.DOMElements['all-projects-report-modal'].style.display = 'none');
    App.DOMElements['all-projects-report-select-all-btn']?.addEventListener('click', () => {
        App.DOMElements['all-projects-report-project-list'].querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    });
    App.DOMElements['generate-multi-report-btn']?.addEventListener('click', generateAndShowMultiReport);
    App.DOMElements['download-multi-report-pdf-btn']?.addEventListener('click', () => {
        PDFGenerator.generate({
            previewId: 'all-projects-report-preview-container',
            projectJobNo: 'All_Projects_Report',
            pageSize: 'A4_portrait',
            fileName: 'All_Projects_Status_Report'
        });
    });
}

function cacheDOMElements() {
    const ids = [
        'app-container', 'dashboard-view', 'project-view', 'resizer',
        'design-studio-btn',
        'vendor-master-search', 'vendor-search-results-body', 'project-vendor-list-body',            
        'new-project-btn', 'search-box', 'project-list-body', 'load-from-file-btn', 'save-to-file-btn', 'xml-file-input', 'load-site-update-btn', 'site-update-file-input', 'toggle-invoices-btn',
        'pending-invoices-summary', 'pending-invoices-count', 'pending-invoices-amount', 'last-paid-amount', 'on-hold-amount', 'expiring-documents-summary', 'expiring-documents-count',
        'back-to-dashboard-btn', 'save-project-btn', 'project-view-title', 'page-size-selector', 'generate-pdf-btn',
        'main-tab', 'scope-tab', 'fees-tab', 'invoicing-tab', 'swimming-pool-tab', // MODIFICATION: Add new tab ID
        'documents-tab', 'tender-tab', 'vendors-tab', 'payment-cert-tab', 'schedule-tab', 'tools-tab', 'project-letters-tab',
        'brief-proposal-preview', 'full-agreement-preview', 'assignment-order-preview', 'tax-invoice-preview', 'tender-package-preview', 'vendor-list-preview', 'payment-certificate-preview', 'villa-schedule-preview', 'project-letter-preview', 
        'proforma-preview', 'receipt-preview',
        'project-letter-type', 'project-letter-authority', 'project-letter-dynamic-fields', 'generate-project-letter-btn',
        'jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area',
        'authority', 'otherAuthority', 'otherAuthorityContainer', 'projectType', 'builtUpArea', 'scope-selection-container', 'vatRate', 'lump-sum-group', 'lumpSumFee', 'percentage-group', 'constructionCostRate',
        'total-construction-cost-display', 'consultancyFeePercentage', 'designFeeSplit', 'supervisionFeeSplitDisplay', 'financial-summary-container', 'fee-milestone-group',
        'designDuration', 'constructionDuration', 'extendedSupervisionFee', 'notes-group', 'invoice-history-body', 'newInvoiceNo', 'milestone-billing-body',
        'supervision-billing-monthly-container', 
        'current-invoice-items-body', 'raise-invoice-btn',
        'payment-cert-no', 'generate-new-cert-btn', 'cert-history-body', 
        'pending-invoice-modal', 'pending-modal-close-btn', 'pending-invoice-list', 'expiring-documents-modal', 'expiring-modal-close-btn', 'expiring-documents-list',
        'site-files-modal', 'site-files-modal-close-btn', 'site-files-modal-title', 'site-photos-gallery', 'site-docs-gallery',
        'file-preview-modal', 'file-modal-close', 'file-preview-container',
        'bulletin-list', 'dash-cal-prev-btn', 'dash-cal-next-btn', 'dash-cal-month-year', 'dash-cal-body',
        'record-payment-modal', 'payment-modal-close-btn', 'payment-modal-inv-no', 'payment-modal-jobno', 'payment-modal-inv-index',
        'payment-method', 'payment-amount', 'payment-date', 'cheque-details-group', 'payment-cheque-no', 'payment-cheque-date',
        'payment-cheque-bank', 'save-payment-btn',
        'project-report-preview', 'toggle-report-options-btn', 'report-options-container', 'generate-report-preview-btn',
        'generate-all-projects-report-btn', 'all-projects-report-modal', 'all-projects-report-modal-close-btn', 'all-projects-report-project-list',
        'all-projects-report-select-all-btn', 'generate-multi-report-btn', 'all-projects-report-preview-container', 'download-multi-report-pdf-btn'
    ];
    ids.forEach(id => { 
        const el = document.getElementById(id);
        if (el) App.DOMElements[id] = el;
    });
    App.DOMElements.controlTabs = App.DOMElements['project-view']?.querySelector('.control-tabs');
    App.DOMElements.previewTabs = App.DOMElements['project-view']?.querySelector('.preview-tabs');
    
    
}

main();

});