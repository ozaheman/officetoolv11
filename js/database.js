/* START OF FILE js/database.js */

/**
 * @module DB
 * A self-contained module for all IndexedDB operations.
 * Explicitly attached to window to support both module and non-module contexts.
 */
(function() { // Wrap in IIFE to avoid const redeclaration errors if loaded twice
    
    let db;
    const DB_NAME = 'UrbanAxisUnifiedDB';
    const DB_VERSION = 8; 

    const STORES = {
        PROJECTS: 'projects',
        SITE_DATA: 'siteData',
        FILES: 'files',
        HR_DATA: 'hrData',
        SETTINGS: 'settings',
        OFFICE_EXPENSES: 'officeExpenses',
        FINANCIAL_TEMPLATES: 'financialTemplates',
        HOLIDAYS: 'holidays',
        STAFF_LEAVES: 'staffLeaves',
        DESIGN_SCRUM: 'designScrum',
        BULLETIN: 'bulletin'
    };

    // ... [KEEP ALL THE INTERNAL FUNCTIONS: init, seedFinancialTemplates, makeRequest, mergeLists, mergeFiles as written in previous response] ...
    // For brevity in this fix block, I will include the critical wrapper and assignment.
    
    // (Paste the full content of database.js here, but ensure the end matches below)

    function init() {
        return new Promise((resolve, reject) => {
            console.log(`Opening database ${DB_NAME} version ${DB_VERSION}...`);
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                const createStore = (name, options, indices = []) => {
                    if (!db.objectStoreNames.contains(name)) {
                        const store = db.createObjectStore(name, options);
                        indices.forEach(index => {
                            store.createIndex(index.name, index.keyPath, { unique: index.unique });
                        });
                    }
                };

                createStore(STORES.PROJECTS, { keyPath: 'jobNo' });
                createStore(STORES.SITE_DATA, { keyPath: 'jobNo' });
                createStore(STORES.FILES, { keyPath: 'id', autoIncrement: true }, [
                    { name: 'jobNo_source', keyPath: ['jobNo', 'source'], unique: false },
                    { name: 'jobNo_subCategory', keyPath: ['jobNo', 'subCategory'], unique: false }
                ]);
                createStore(STORES.HR_DATA, { keyPath: 'id', autoIncrement: true });
                createStore(STORES.SETTINGS, { keyPath: 'id' });
                createStore(STORES.OFFICE_EXPENSES, { keyPath: 'id', autoIncrement: true });
                createStore(STORES.FINANCIAL_TEMPLATES, { keyPath: 'id' });
                createStore(STORES.HOLIDAYS, { keyPath: 'id', autoIncrement: true }, [
                    { name: 'by_country_year', keyPath: ['countryCode', 'year'], unique: false }
                ]);
                createStore(STORES.STAFF_LEAVES, { keyPath: 'id', autoIncrement: true });
                createStore(STORES.DESIGN_SCRUM, { keyPath: 'jobNo' });
                createStore(STORES.BULLETIN, { keyPath: 'id', autoIncrement: true });
            };

            request.onsuccess = async (event) => {
                db = event.target.result;
                // If Financial Data exists globally, seed it
                if (typeof window.FINANCIAL_DATA !== 'undefined') {
                    await seedFinancialTemplates();
                }
                resolve();
            };
        });
    }

    async function seedFinancialTemplates() {
        if(!db) return;
        const tx = db.transaction(STORES.FINANCIAL_TEMPLATES, 'readonly');
        const store = tx.objectStore(STORES.FINANCIAL_TEMPLATES);
        const countReq = store.count();
        const count = await new Promise(resolve => countReq.onsuccess = () => resolve(countReq.result));

        if (count === 0 && window.FINANCIAL_DATA) {
            const writeTx = db.transaction(STORES.FINANCIAL_TEMPLATES, 'readwrite');
            const writeStore = writeTx.objectStore(STORES.FINANCIAL_TEMPLATES);
            for (const key in window.FINANCIAL_DATA) {
                writeStore.put({ id: key, data: window.FINANCIAL_DATA[key] });
            }
            return new Promise(resolve => writeTx.oncomplete = resolve);
        }
    }

    function makeRequest(storeName, mode, action) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized.");
            if (!db.objectStoreNames.contains(storeName)) {
                return reject(`Object store '${storeName}' not found.`);
            }
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = action(store);
            request.onerror = (event) => reject(event.target.error);
            request.onsuccess = (event) => resolve(event.target.result);
        });
    }
     // --- HELPER: Collaborative List Merging ---
    // Merges two arrays of objects based on a unique key (e.g., 'id').
    // If incoming item exists, update it. If not, add it.
    function mergeLists(existingList = [], incomingList = [], uniqueKey = 'id') {
        const mergedMap = new Map();
        
        // 1. Add existing items to map
        existingList.forEach(item => {
            if(item && item[uniqueKey]) mergedMap.set(String(item[uniqueKey]), item);
        });

        // 2. Merge incoming items (Overwrite existing if ID matches, implies newer data from import)
        incomingList.forEach(item => {
            if(item && item[uniqueKey]) mergedMap.set(String(item[uniqueKey]), item);
        });

        return Array.from(mergedMap.values());
    }

    // --- HELPER: Merge Files ---
    // Avoids duplication by checking Name + Category + Source
    async function mergeFiles(jobNo, source, incomingFiles) {
        if (!incomingFiles || incomingFiles.length === 0) return;
        
        // Get existing files
        const existingFiles = await publicAPI.getFiles(jobNo, source);
        const transaction = db.transaction(STORES.FILES, 'readwrite');
        const store = transaction.objectStore(STORES.FILES);

        for (const file of incomingFiles) {
            // Check if this specific file already exists
            const exists = existingFiles.some(ex => 
                ex.name === file.name && 
                ex.category === file.category && 
                ex.subCategory === file.subCategory
            );

            if (!exists) {
                store.add({
                    jobNo: jobNo, 
                    source: source,
                    category: file.category || null, 
                    subCategory: file.subCategory || null, 
                    name: file.name,
                    fileType: file.type || file.fileType, 
                    dataUrl: file.data || file.dataUrl,
                    expiryDate: file.expiryDate || null,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    // --- Public API Object ---
    const publicAPI = {
        init,
        
        // --- Generic CRUD Methods ---
        get: (storeName, key) => makeRequest(storeName, 'readonly', store => store.get(key)),
        getAll: (storeName) => makeRequest(storeName, 'readonly', store => store.getAll()),
        put: (storeName, data) => makeRequest(storeName, 'readwrite', store => {
            data.lastSync = new Date().toISOString();
            return store.put(data);
        }),
        add: (storeName, data) => makeRequest(storeName, 'readwrite', store => store.add(data)),
        delete: (storeName, key) => makeRequest(storeName, 'readwrite', store => store.delete(key)),
        clear: (storeName) => makeRequest(storeName, 'readwrite', store => store.clear()),

        // --- Project Methods ---
        getProject: (jobNo) => publicAPI.get(STORES.PROJECTS, jobNo),
        getAllProjects: () => publicAPI.getAll(STORES.PROJECTS),
        putProject: (projectData) => publicAPI.put(STORES.PROJECTS, projectData),
        
        // --- Settings Methods ---
        getSetting: (id) => publicAPI.get(STORES.SETTINGS, id),
        putSetting: (data) => publicAPI.put(STORES.SETTINGS, data),
        
        verifyPassword: async (role, inputPassword) => {
            const standardizedRole = (role || '').toLowerCase().replace(/\s+/g, ''); // Standardize role
              //alert ('role1:' + role);
               // const settings = await publicAPI.get(STORES.SETTINGS, 'access_control');
              // alert ('settings :' + settings);
              
              //console.log('settings.passwords:');
              //console.log(settings['arch']);
              //alert('settings.passwords[role] :' + settings.passwords[role]);
            try {
                const settings = await publicAPI.get(STORES.SETTINGS, 'access_control');
                //alert ('role:' + role);
                     //alert ('settings.passwords[role]:' + settings.passwords[role]);
                     //alert ('settings.passwords:' + settings.passwords);
                if (settings && settings.passwords && settings.passwords[standardizedRole]) {
                    
                    return settings.passwords[standardizedRole] === inputPassword;
                }
                const defaultPass = {
                    'site': 'site_eng@12345','siteeng': 'site_eng@12345',
                    'arch': 'arch@12345', 'str': 'str@12345', 'mep': 'mep@12345',
                    'pm': 'pm@12345', 'contractor': 'contractor@12345', 'client': 'client@12345', 'admin': 'admin@12345'
                }[standardizedRole];
                return inputPassword === defaultPass || inputPassword === 'admin@12345'; 
            } catch (e) { 
            console.error("Password verification error:", e);
            const fallbackPass = {
                    'admin': 'admin@12345'
                }[standardizedRole];
                return inputPassword === fallbackPass || inputPassword === 'admin@12345';
            }
        },

       // --- Site Data Methods ---
        getSiteData: (jobNo) => publicAPI.get(STORES.SITE_DATA, jobNo),
        getAllSiteData: () => publicAPI.getAll(STORES.SITE_DATA),
        putSiteData: (data) => publicAPI.put(STORES.SITE_DATA, data),

        // --- HR & Expense Methods ---
        getAllHRData: () => publicAPI.getAll(STORES.HR_DATA),
        addHRData: (data) => publicAPI.add(STORES.HR_DATA, data),
        putHRData: (data) => publicAPI.put(STORES.HR_DATA, data),
        deleteHRData: (id) => publicAPI.delete(STORES.HR_DATA, id),
        getOfficeExpenses: () => publicAPI.getAll(STORES.OFFICE_EXPENSES),
        addOfficeExpense: (data) => publicAPI.add(STORES.OFFICE_EXPENSES, data),

        // --- Financial Template Methods ---
        getFinancialTemplate: (id) => publicAPI.get(STORES.FINANCIAL_TEMPLATES, id),
        
        // --- Scrum Methods ---
        getScrumData: (jobNo) => publicAPI.get(STORES.DESIGN_SCRUM, jobNo),
        getAllScrumData: () => publicAPI.getAll(STORES.DESIGN_SCRUM),
        putScrumData: (data) => publicAPI.put(STORES.DESIGN_SCRUM, data),

        /**
         * MODIFICATION: New data retrieval function for the Design Center.
         * Fetches Scrum data and enriches it with assignee and project info.
         * @param {string} [jobNo] - The job number of a specific project. If null, fetches data for all projects.
         * @returns {Promise<{staff: Array<Object>, scrumData: Object}>} An object containing the staff list and the processed scrum data.
         */
        getScrumBoardData: async (jobNo) => {
            // 1. Fetch all staff members and create a lookup map
            const staffList = await publicAPI.getAll(STORES.HR_DATA);
            const staffMap = new Map(staffList.map(s => [s.id, s.name]));

            const addAssigneeName = (task) => ({
                ...task,
                assigneeName: task.assigneeId ? (staffMap.get(task.assigneeId) || 'Unassigned') : 'Unassigned'
            });

            if (jobNo) {
                // 2a. Fetch scrum data for a single project
                const scrumData = await publicAPI.get(STORES.DESIGN_SCRUM, jobNo);
                if (scrumData && scrumData.tasks) {
                    scrumData.tasks = scrumData.tasks.map(addAssigneeName);
                }
                return { staff: staffList, scrumData: scrumData || { jobNo, tasks: [] } };
            } else {
                // 2b. Fetch scrum data for all projects and create a cumulative view
                const allScrumData = await publicAPI.getAll(STORES.DESIGN_SCRUM);
                const cumulativeTasks = allScrumData.flatMap(projectScrum => {
                    if (projectScrum && Array.isArray(projectScrum.tasks)) {
                        return projectScrum.tasks.map(task => ({
                            ...addAssigneeName(task),
                            jobNo: projectScrum.jobNo // Add jobNo to each task
                        }));
                    }
                    return [];
                });

                const cumulativeScrumData = {
                    jobNo: 'All Projects',
                    tasks: cumulativeTasks
                };
                
                return { staff: staffList, scrumData: cumulativeScrumData };
            }
        },
        
        
         // --- MODIFICATION: New helper function to create Scrum tasks ---
        createScrumTaskFromSiteEvent: async (jobNo, { name, department, plannedDuration = 7, status = 'To Do', relatedRfiId = null }) => {
            if (!jobNo || !name || !department) {
                console.error("Missing required data for Scrum task creation.");
                return;
            }
            let scrumData = await publicAPI.getScrumData(jobNo);
            if (!scrumData) {
                scrumData = { jobNo, tasks: [] };
            }

            const maxId = scrumData.tasks.reduce((max, task) => Math.max(max, task.id), 999);
            const today = new Date();
            //const dueDate = new Date(today.setDate(today.getDate() + plannedDuration)).toISOString().split('T')[0];
const dueDate = new Date(new Date().setDate(today.getDate() + plannedDuration)).toISOString().split('T')[0];
            const newTask = {
                id: maxId + 1,
                name: name,
                status: status,
                department: department,
                plannedDuration: plannedDuration,
                dueDate: dueDate,
                assigneeId: null,
                dateAdded: new Date().toISOString().split('T')[0],
                 relatedRfiId: relatedRfiId // Adde
            };

            scrumData.tasks.push(newTask);
            await publicAPI.putScrumData(scrumData);
            console.log(`Scrum task created for ${jobNo}: "${name}"`);
            
            // Log to bulletin for visibility
            if (window.App && window.App.Bulletin) {
                window.App.Bulletin.log('Task Auto-Generated', `New task "<strong>${name}</strong>" created for project <strong>${jobNo}</strong>.`);
            }
        },

        // --- Bulletin Methods ---
        addBulletinItem: (item) => publicAPI.add(STORES.BULLETIN, item),
        getBulletinItems: (limit = 50) => {
            return makeRequest(STORES.BULLETIN, 'readonly', store => store.getAll()).then(items => {
                return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
            });
        },
        
        // --- Holiday Methods ---
        getHolidays: (countryCode, year) => makeRequest(STORES.HOLIDAYS, 'readonly', store => store.index('by_country_year').getAll([countryCode, year])),
        addHolidays: (holidays, countryCode, year) => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORES.HOLIDAYS, 'readwrite');
                const store = transaction.objectStore(STORES.HOLIDAYS);
                holidays.forEach(h => store.add({ ...h, countryCode, year }));
                transaction.oncomplete = resolve;
                transaction.onerror = reject;
            });
        },
        getAllHolidays: () => publicAPI.getAll(STORES.HOLIDAYS),

        // --- Unified File Methods ---
        addFile: (fileData) => publicAPI.add(STORES.FILES, fileData),
        deleteFile: (id) => publicAPI.delete(STORES.FILES, id),
        getFileById: (id) => publicAPI.get(STORES.FILES, id),
        getFiles: (jobNo, source) => makeRequest(STORES.FILES, 'readonly', store => store.index('jobNo_source').getAll([jobNo, source])),
        getFilesByCategory: (jobNo, source, category) => {
            return makeRequest(STORES.FILES, 'readonly', store => store.index('jobNo_source').getAll([jobNo, source]))
                .then(files => files.filter(file => file.category === category));
        },
        getAllFiles: () => publicAPI.getAll(STORES.FILES),
        clearFilesBySource: async (jobNo, source) => {
            const files = await publicAPI.getFiles(jobNo, source);
            if (files.length === 0) return;
            const transaction = db.transaction(STORES.FILES, 'readwrite');
            const store = transaction.objectStore(STORES.FILES);
            files.forEach(file => store.delete(file.id));
            return new Promise(resolve => transaction.oncomplete = resolve);
        },

        // --- COLLABORATIVE PROCESSING HELPERS ---

        /**
         * Merges imported project data with existing data.
         * Preserves existing documents unless specifically overwritten.
         * Merges Scrum tasks.
         */
        processProjectImport: async (project) => {
            const { masterDocuments, scrumTasks, ...importedData } = project;
            
            // 1. Merge Project Details
            const existingProject = await publicAPI.getProject(importedData.jobNo);
            const mergedProject = existingProject ? { ...existingProject, ...importedData } : importedData;
            
            // Merge Invoices separately to ensure no data loss
            if (existingProject && existingProject.invoices && importedData.invoices) {
                mergedProject.invoices = mergeLists(existingProject.invoices, importedData.invoices, 'no');
            }

            await publicAPI.putProject(mergedProject);

            // 2. Merge Master Files (Non-destructive)
            if (masterDocuments?.length) {
                await mergeFiles(importedData.jobNo, 'master', masterDocuments);
            }
            
            // 3. Ensure Site Data Exists (Create if new, Keep if exists)
            const existingSiteData = await publicAPI.getSiteData(importedData.jobNo);
            if (!existingSiteData) {
                const boqTemplateReq = await publicAPI.getFinancialTemplate('boq');
                const boqTemplate = boqTemplateReq ? boqTemplateReq.data : [];
                await publicAPI.putSiteData({
                    jobNo: importedData.jobNo, status: 'Pending Start', progress: 0,
                    boq: JSON.parse(JSON.stringify(boqTemplate)),
                    mom: [], paymentCertificates: [], scheduleOverrides: []
                });
            }
       
            // 4. Merge Scrum Tasks
            let mergedScrumTasks = scrumTasks || [];
            if (!scrumTasks) {
                // If import has no tasks, but we need defaults
                const defaultScrumTasks = (typeof DESIGN_SCRUM_TEMPLATE !== 'undefined' ? DESIGN_SCRUM_TEMPLATE : []).map(task => ({
                    ...task, status: 'Up Next', assigneeId: null, dueDate: null, startDate: null,
                    completedDate: null, dateAdded: new Date().toISOString().split('T')[0]
                }));
                mergedScrumTasks = defaultScrumTasks;
            }

            const existingScrumData = await publicAPI.getScrumData(importedData.jobNo);
            if (existingScrumData && existingScrumData.tasks) {
                // Merge existing tasks with imported ones (Imported wins if IDs match)
                mergedScrumTasks = mergeLists(existingScrumData.tasks, mergedScrumTasks, 'id');
            }
            
            await publicAPI.putScrumData({ jobNo: importedData.jobNo, tasks: mergedScrumTasks });
        },

        /**
         * Merges site update data (logs, files) with existing data.
         * Allows multiple users to contribute logs to the same project.
         */
        processSiteUpdateImport: async (update) => {
            const { siteFiles, ...importedSiteData } = update;
            
            // 1. Fetch Existing Site Data
            let existingSiteData = await publicAPI.getSiteData(update.jobNo);
            
            if (!existingSiteData) {
                existingSiteData = { jobNo: update.jobNo }; // Fallback
            }

            // 2. Merge Lists (Non-destructive)
            // We use 'id' or 'ref' to detect duplicates/updates. 
            // New items from different users are appended.
            const mergedSiteData = { ...existingSiteData, ...importedSiteData };

            // Specifically merge arrays that might be contributed to by different people
            if (existingSiteData.rfiLog || importedSiteData.rfiLog) {
                mergedSiteData.rfiLog = mergeLists(existingSiteData.rfiLog || [], importedSiteData.rfiLog || [], 'id');
            }
            if (existingSiteData.materialLog || importedSiteData.materialLog) {
                mergedSiteData.materialLog = mergeLists(existingSiteData.materialLog || [], importedSiteData.materialLog || [], 'id');
            }
            if (existingSiteData.mom || importedSiteData.mom) {
                // MoM usually doesn't have ID, might use date+ref, assuming 'date' for now or index based logic elsewhere.
                // If strict merging needed, add IDs to MoM creation. For now, we append if new.
                // Simple strategy: Combine and Dedupe by Ref string
                const exMom = existingSiteData.mom || [];
                const impMom = importedSiteData.mom || [];
                // Simple concat for now, sophisticated logic requires Unique IDs on MoMs
                // mergedSiteData.mom = [...exMom, ...impMom]; // This duplicates. 
                // Better:
                mergedSiteData.mom = mergeLists(exMom, impMom, 'ref');
            }
            if (existingSiteData.statusLog || importedSiteData.statusLog) {
                 mergedSiteData.statusLog = mergeLists(existingSiteData.statusLog || [], importedSiteData.statusLog || [], 'date');
            }

            await publicAPI.putSiteData(mergedSiteData);

            // 3. Merge Site Files (Photos, Docs)
            if (siteFiles?.length) {
                await mergeFiles(update.jobNo, 'site', siteFiles);
            }
        }
    };

    // EXPOSE TO WINDOW
    window.DB = publicAPI;

})();