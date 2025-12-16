/* START OF FILE js/site_modules/schedule_module.js */
import { AppState, cacheDomElements } from '/js/site_app.js';

// let DOMElements = {};
export const ScheduleModule = {
    init: (context) => {
        // Any specific init logic if needed
    },

    render: async (jobNo, containerId = 'villa-schedule-preview1') => {
        // Safety Check: Ensure Gantt Chart library is loaded
        if (!window.UrbanAxisSchedule) {
            console.warn("Schedule Module: UrbanAxisSchedule library not loaded. Skipping render.");
            return null;
        }
        console.log('schedule module1');
		console.log(window.UrbanAxisSchedule);
        // alert('ok1');
        // alert('window.UrbanAxisSchedule');
        // alert(window.UrbanAxisSchedule);
        if (!jobNo) return null;
        // alert('ok2');
        // alert('jobNo');
        // alert(jobNo);
        const container = document.getElementById(containerId);
        if (!container) {
             console.warn(`Schedule Module: Container '${containerId}' not found.`);
             return null;
        }

        const project = await window.DB.getProject(jobNo);
        const siteData = await window.DB.getSiteData(jobNo);
          // FIX: Ensure scheduleOverrides is an array
        if (!Array.isArray(siteData.scheduleOverrides)) {
            siteData.scheduleOverrides = [];
        }
        
        
        
        // 3. Get Full Schedule (Template + Custom Tasks)
        let fullSchedule = await getProjectSchedule(project, siteData);

        // --- FILTERING LOGIC START ---
        let filteredSchedule = fullSchedule;
        
        // Only filter if not 'all'. 
        // Note: Tasks from the default template might not have a 'floor' property set.
        // Those will disappear when a specific floor is selected, which is expected behavior.
        if (AppState.currentFloorFilter && AppState.currentFloorFilter !== 'all')
 {
     alert(AppState.currentFloorFilter);
            filteredSchedule = fullSchedule.filter(t => t.floor === AppState.currentFloorFilter);
        }
        // --- FILTERING LOGIC END ---

        // 4. Clear Container & Render
        container.innerHTML = '';
        
        // Check visibility to prevent SVG errors
        if (container.offsetParent === null) return;

        window.UrbanAxisSchedule.render(filteredSchedule, async (update) => {
            await ScheduleModule.handleUpdate(jobNo, update);
        }, containerId);
        
        // alert('ok3');
        // alert('project');
        // alert(project);
         console.log('siteData 2:');
		console.log(siteData);
        // Use global template or empty if not defined
        const template = window.VILLA_SCHEDULE_TEMPLATE || [];
        //calculateDynamicSchedule
        // Calculate dynamic dates
        const schedule = window.UrbanAxisSchedule.calculateDynamicSchedule(project, template, siteData.scheduleOverrides);
        // alert('ok1');
		  console.log('schedule calculateDynamicSchedule:');
          console.log(schedule);
        // 4. Prepare Container (Clear previous SVGs)
       // console.log('container.innerHTML :');
          // console.log(container.innerHTML );
          if (schedule && schedule.length > 0) {
              
            container.innerHTML = ''; 
        }
        
        // 5. Ensure Container Visibility for SVG Calculations
        // If the tab logic failed, we force a check here
        if (container.offsetParent === null) {
            console.warn("Schedule Container is hidden (display:none). SVG cannot calculate width.");
            // Optional: You could force the tab open here, but better to handle in handleTabClick
            return;
        }
         console.log('window.UrbanAxisSchedule.render(schedule, async (update):');
          console.log(schedule);
        // render Chart
        if (schedule && schedule.length > 0){
            // alert('sfffff6');
        window.UrbanAxisSchedule.render(schedule, async (update) => {
            // Handle Task Update (Drag/Drop)
              
            console.log(update);
            await ScheduleModule.handleUpdate(jobNo, update);
        }, containerId); // Pass dynamic container ID
        
        
// alert('ok2');
        // Initialize Simulation Controls
		console.log('schedule module2');
		console.log(schedule);
        ScheduleModule.setupSimulation(schedule);
        // alert('ok3');
        // Initialize BIM Viewer if container exists
        
        const bimContainer = document.getElementById('bim-viewer-container');
        if (bimContainer && window.BIMViewer) {
             if(typeof window.BIMViewer.init === 'function') {
                 window.BIMViewer.init('bim-viewer-container', project.projectType || 'Villa');
             }
        }
        }
        return schedule;
    },

    handleUpdate: async (jobNo, update) => {
        const siteData = await window.DB.getSiteData(jobNo);   // FIX: Ensure it is an array before using array methods
        if (!Array.isArray(siteData.scheduleOverrides)) {
            siteData.scheduleOverrides = [];
        }
        
        const existing = siteData.scheduleOverrides.find(o => o.id === update.id);
        if(existing) {
            existing.start = update.start;
            existing.end = update.end;
        } else {
            siteData.scheduleOverrides.push(update);
        }
        
        await window.DB.putSiteData(siteData);
        // Trigger re-render
        // alert ('jobNo');
        // alert (jobNo);
        ScheduleModule.render(jobNo);
    },

    setupSimulation: (schedule) => {
        const playBtn = document.getElementById('play-simulation-btn');
        const slider = document.getElementById('simulation-slider');
        const dateDisplay = document.getElementById('simulation-date-display');
        
        if(!schedule || schedule.length === 0 || !playBtn || !slider || !dateDisplay) return;
console.log(schedule);
        const validTasks = schedule.filter(t => !isNaN(new Date(t.start).getTime()));
        if(validTasks.length === 0) return;

        const startTimes = validTasks.map(t => new Date(t.start).getTime());
        const endTimes = validTasks.map(t => new Date(t.end).getTime());
        const minTime = Math.min(...startTimes);
        const maxTime = Math.max(...endTimes);
        const totalDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24)) + 5; 

        slider.min = 0;
        slider.max = totalDays;
        slider.value = 0;

        const updateViz = () => {
            const currentDays = parseInt(slider.value);
            const currentDate = new Date(minTime + (currentDays * 24 * 60 * 60 * 1000));
            dateDisplay.textContent = currentDate.toDateString();
            if(window.BIMViewer && typeof window.BIMViewer.updateSimulation === 'function') {
                window.BIMViewer.updateSimulation(currentDate);
            }
        };

        slider.oninput = updateViz;
        
        if (playBtn._simulationInterval) clearInterval(playBtn._simulationInterval);
        
        const newPlayBtn = playBtn.cloneNode(true);
        playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
        
        newPlayBtn.onclick = () => {
            if (newPlayBtn._simulationInterval) {
                clearInterval(newPlayBtn._simulationInterval);
                newPlayBtn._simulationInterval = null;
                newPlayBtn.textContent = "▶ Play";
            } else {
                newPlayBtn.textContent = "⏸ Pause";
                newPlayBtn._simulationInterval = setInterval(() => {
                    let val = parseInt(slider.value);
                    if (val >= slider.max) {
                        clearInterval(newPlayBtn._simulationInterval);
                        newPlayBtn._simulationInterval = null;
                        newPlayBtn.textContent = "▶ Play";
                    } else {
                        slider.value = val + 1;
                        updateViz();
                    }
                }, 100); 
            }
        };
        updateViz();
    }
};

// --- UI: Floor Selector ---
export function renderFloorSelector() {
     const container = document.getElementById('floor-selector-container');
    if (!container) return;
    // cacheDomElements();
    const floors = [
        {id: 'all', label: 'All Levels'},
        {id: 'sub', label: 'Substructure'},
        {id: 'gf', label: 'Ground Floor'},
        {id: '1', label: 'First Floor'},
        {id: 'roof', label: 'Roof'},
        {id: 'ext', label: 'External'}
    ];
    let html = '';
    floors.forEach(f => {
        const active = AppState.currentFloorFilter === f.id ? 'active' : '';
        html += `<button class="floor-btn ${active}" data-floor="${f.id}">${f.label}</button>`;
    });
    if(DOMElements.floorSelectorContainer){
// alert('ggggggg');        
DOMElements.floorSelectorContainer.innerHTML = html;
    }
}

export async function showNewTaskModal() {
    if(!AppState.currentJobNo) return alert("Select a project first.");
    // alert('fffff1');
    // FIX: Check if Schedule Library is loaded before using it
    if (!window.UrbanAxisSchedule) {
        // alert('fffff2');
        console.error("Gantt Chart library not loaded.");
        return alert("Schedule module not fully loaded. Please try again later.");
    }
    // alert('fffff3');

    if (DOMElements.newTaskDependency) {
         // alert('fffff4');
        DOMElements.newTaskDependency.innerHTML = '<option value="">-- No Dependency --</option>';
        const project = await window.DB.getProject(AppState.currentJobNo);
        const siteData = await window.DB.getSiteData(AppState.currentJobNo);
         // FIX: Ensure array here too
        if (!Array.isArray(siteData.scheduleOverrides)) siteData.scheduleOverrides = [];
        const template = window.VILLA_SCHEDULE_TEMPLATE || [];
        const currentTasks = window.UrbanAxisSchedule.calculateDynamicSchedule(project, template, siteData.scheduleOverrides);
        
        currentTasks.forEach(t => {
            DOMElements.newTaskDependency.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
    }
     // alert('fffff5');
    if(DOMElements.newTaskModal) DOMElements.newTaskModal.style.display = 'flex';
}

export async function saveNewTask() {
    const name = DOMElements.newTaskName.value;
    const dur = parseInt(DOMElements.newTaskDuration.value) || 5;
    const floor = DOMElements.newTaskFloor.value;
    const dep = DOMElements.newTaskDependency.value;
    
    if(!name) return alert("Task Name is required");

    const siteData = await window.DB.getSiteData(AppState.currentJobNo);
    // alert('siteData');
     // alert(siteData);
    if(!siteData.customTasks) siteData.customTasks = [];
    
    const newId = 10000 + siteData.customTasks.length + 1; 
    const newTask = {
        id: newId,
        name: name,
        duration: dur,
        floor: floor,
        dependencies: dep ? [parseInt(dep)] : [],
        startOffset: 0 
    };
    
    siteData.customTasks.push(newTask);
    await window.DB.putSiteData(siteData);
    
    if(DOMElements.newTaskModal) DOMElements.newTaskModal.style.display = 'none';
    ScheduleModule.render(AppState.currentJobNo);
}

// --- GANTT & BIM ---
   export    async function getProjectSchedule(projectData, siteData) {
       
      
        const dateStr = projectData.agreementDate || new Date().toISOString().split('T')[0];
        const projectStartDate = new Date(dateStr);
         // alert('getProjectSchedule1:');
       // alert(getProjectSchedule);
        // Combine Template with Custom Tasks
        let allTemplates = [...VILLA_SCHEDULE_TEMPLATE, ...(siteData.customTasks || [])];
        console.log('allTemplates:');
        console.log(allTemplates);
          // FIX: Ensure array for calculation
    const overrides = Array.isArray(siteData.scheduleOverrides) ? siteData.scheduleOverrides : [];
        //Calculate schedule
        // Note: Custom tasks need dynamic calculation if they depend on others. 
        // The `calculateDynamicSchedule` function in gantt_chart.js handles scaling linear offset.
        // For true dependency resolution (CPM), we'd need a graph traversal. 
        // For this version, we assume linear offsets or basic scaling.      
        return window.UrbanAxisSchedule.calculateDynamicSchedule(projectData, allTemplates, overrides);
    }
    
   export  function setupSimulationControls(schedule) {     
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
            if (AppState.simulationInterval) {
                clearInterval(AppState.simulationInterval);
                AppState.simulationInterval = null;
                playBtn.textContent = "▶ Play Simulation";
            } else {
                playBtn.textContent = "⏸ Pause";
                AppState.simulationInterval = setInterval(() => {
                    let val = parseInt(slider.value);
                    if (val >= slider.max) {
                        clearInterval(AppState.simulationInterval);
                        AppState.simulationInterval = null;
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
    
    export async function handleGanttUpdate(update,currentJobNo) {
        // alert('bbbbbbb1');
         if (!currentJobNo) return;
        try {
            const siteData = await window.DB.getSiteData();
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
  
export async function renderGanttChart() {
        if (!AppState.currentJobNo || !window.UrbanAxisSchedule) return;
        // alert('fffr1');
        const project = await window.DB.getProject(AppState.currentJobNo);
        const siteData = await window.DB.getSiteData(AppState.currentJobNo);
        
        // 1. Get Full Schedule (Template + Custom)
        let finalSchedule = await getProjectSchedule(project, siteData);
console.log('finalSchedule');
console.log(finalSchedule);
        // 2. Apply Floor Filter
        if(AppState.currentFloorFilter !== 'all') {
            finalSchedule = finalSchedule.filter(t => t.floor === AppState.currentFloorFilter || (t.floor === undefined && AppState.currentFloorFilter === 'sub')); 
        }

        // 3. Set Global Data for BIM
        // Note: BIM Viewer handles filtering visually or we pass filtered data. 
        // Passing filtered data to BIM might hide other parts completely. 
        // Better to update global data fully, and let BIM viewer handle visibility state if advanced, 
        // or just pass full data to BIM and use filter only for Gantt Chart UI.
        window.currentScheduleData = await getProjectSchedule(project, siteData); // Full list for BIM context

        // 4. Render Gantt
        console.log('finalSchedule');
console.log(finalSchedule);
        window.UrbanAxisSchedule.render(finalSchedule, handleGanttUpdate());
        
        // 5. Initialize BIM Viewer
        //if (window.BIMViewer) 
        //{
            BIMViewer.init('bim-viewer-container', project.projectType || 'Villa');
            // Filter BIM view? For now we show full model, but Gantt focuses on specific floor.
            // Could add BIMViewer.setFilter(AppState.currentFloorFilter);
            setupSimulationControls(window.currentScheduleData);
        //}
    }