/* START OF FILE js/gantt_chart.js */

/**
 * @module UrbanAxisSchedule
 * Renders a dynamic Gantt chart with:
 * 1. Sticky Left Task Column (Editable via DblClick).
 * 2. Critical Path Calculation (Robust Cycle Detection).
 * 3. Dependency Arrows.
 * 4. Transparent Overlay Bars.
 * 5. Optimized for PDF Export (html2canvas compatible).
 */

window.UrbanAxisSchedule = (() => {

    // --- MODULE STATE ---
    let dragState = null;
    let currentScheduleData = [];
    let currentUpdateCallback = null;
    let activeContainerId = 'villa-schedule-preview1';

    // --- CONFIGURATION ---
    const CONFIG = {
        headerHeight: 65,
        rowHeight: 32,
        barHeight: 16,
        barOpacity: 0.5,
        progressOpacity: 0.6,
        taskListWidth: 260,
        currentZoom: 'month',
        zoomLevels: {
            day: { dayWidth: 20 },
            week: { dayWidth: 5 },
            month: { dayWidth: 2 },
            year: { dayWidth: 1 }
        },
        // Colors
        barColor: '#4363d8',
        criticalColor: '#ff4d4d',
        progressBarColor: '#3cb44b',
        gridLineColor: '#e0e0e0',
        dividerLineColor: '#b0b0b0',
        dependencyColor: '#999',
        criticalDependencyColor: '#ff0000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        headerFontSize: '11px',
        taskFontSize: '12px',
        handleWidth: 10,
    };

    // --- HELPERS ---
    const createSvgElement = (tag, attributes = {}) => {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        
        // Explicitly set namespace for html2canvas compatibility
        if (tag === 'svg') {
            el.setAttribute('xmlns', "http://www.w3.org/2000/svg");
        }

        for (const key in attributes) {
            el.setAttribute(key, attributes[key]);
        }
        return el;
    };

    const parseLocal = (dateStr) => {
        if (!dateStr) return new Date();
        if (dateStr.includes('T')) return new Date(dateStr);
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return new Date(dateStr);
    };

    const formatDateLocal = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // --- CPM LOGIC (Critical Path Method) ---
    const identifyCriticalPath = (schedule) => {
        const map = new Map();
        let projectEndDate = 0;

        // 1. Build Node Map (Sanitize Data)
        schedule.forEach(t => {
            const start = parseLocal(t.start).getTime();
            const end = parseLocal(t.end).getTime();
            if (end > projectEndDate) projectEndDate = end;
            
            // Remove self-dependencies
            let cleanDeps = t.dependencies || [];
            if (Array.isArray(cleanDeps)) {
                cleanDeps = cleanDeps.filter(dId => dId !== t.id);
            } else {
                cleanDeps = [];
            }

            map.set(t.id, {
                id: t.id,
                duration: end - start,
                start: start,
                end: end,
                predecessors: cleanDeps,
                successors: [],
                ls: null, 
                lf: null,
                isCritical: false
            });
        });

        // 2. Map Successors
        map.forEach(node => {
            node.predecessors.forEach(depId => {
                const pred = map.get(depId);
                if (pred) {
                    if (!pred.successors.includes(node.id)) {
                        pred.successors.push(node.id);
                    }
                }
            });
        });

        // 3. Backward Pass with Cycle Detection
        const visiting = new Set(); 

        const getLateStart = (taskId) => {
            const node = map.get(taskId);
            if (!node) return 0;
            
            if (node.ls !== null) return node.ls;

            // CYCLE DETECTION
            if (visiting.has(taskId)) {
                console.warn(`Circular dependency detected at Task ${taskId}.`);
                return projectEndDate; 
            }

            visiting.add(taskId); 

            let lateFinish;
            if (node.successors.length === 0) {
                lateFinish = projectEndDate;
            } else {
                const successorLateStarts = node.successors.map(sId => getLateStart(sId));
                lateFinish = Math.min(...successorLateStarts);
            }

            visiting.delete(taskId); 

            node.lf = lateFinish;
            node.ls = lateFinish - node.duration;
            return node.ls;
        };

        map.forEach(node => getLateStart(node.id));

        // 4. Identify Critical Path
        const oneDayMs = 86400000;
        const criticalSet = new Set();

        map.forEach(node => {
            if (node.ls !== null && node.start !== null) {
                const float = node.ls - node.start;
                if (float < oneDayMs) {
                    node.isCritical = true;
                    criticalSet.add(node.id);
                }
            }
        });

        return criticalSet;
    };

    const calculateDynamicSchedule = (projectData, scheduleTemplate, savedTasks) => {
        const dateStr = (projectData && projectData.agreementDate) ? projectData.agreementDate : new Date().toISOString().split('T')[0];
        const projectStartDate = parseLocal(dateStr);
        const constructionMonths = (projectData && parseFloat(projectData.constructionDuration)) || 14;

        if (!scheduleTemplate || !Array.isArray(scheduleTemplate)) return [];

        const templateTotalDays = Math.max(...scheduleTemplate.map(t => t.startOffset + t.duration)) || 500;
        const scaleFactor = (constructionMonths * 30.4) / templateTotalDays;

        const validSavedTasks = Array.isArray(savedTasks) ? savedTasks : [];
        const savedTaskMap = new Map(validSavedTasks.map(t => [t.id, t]));

        return scheduleTemplate.map(taskTemplate => {
            if (savedTaskMap.has(taskTemplate.id)) {
                const saved = savedTaskMap.get(taskTemplate.id);
                const start = parseLocal(saved.start);
                const end = parseLocal(saved.end);
                const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return { ...taskTemplate, ...saved, duration };
            }
            
            const newStartOffset = Math.round(taskTemplate.startOffset * scaleFactor);
            const newDuration = Math.max(1, Math.round(taskTemplate.duration * scaleFactor));
            
            const startDate = new Date(projectStartDate);
            startDate.setDate(startDate.getDate() + newStartOffset);
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + newDuration - 1);
            
            return {
                ...taskTemplate,
                start: formatDateLocal(startDate),
                end: formatDateLocal(endDate),
                duration: newDuration
            };
        });
    };

    // --- DRAWING FUNCTIONS ---

    const drawHeader = (svg, ganttStartDate, totalDays) => {
        const zoom = CONFIG.zoomLevels[CONFIG.currentZoom];
        const dayWidth = zoom.dayWidth;
        const width = totalDays * dayWidth;
        const height = CONFIG.headerHeight;
        
        const headerGroup = createSvgElement('g', { class: 'header-labels' });
        headerGroup.appendChild(createSvgElement('rect', { x: 0, y: 0, width: width, height: height, fill: '#f8f9fa' }));

        let lastYear = -1; 
        let lastMonth = -1;
        
        for (let i = 0; i <= totalDays; i++) {
            const date = new Date(ganttStartDate); 
            date.setDate(date.getDate() + i);
            const xPos = i * dayWidth;
            
            // Year
            if (date.getFullYear() !== lastYear) {
                lastYear = date.getFullYear();
                headerGroup.appendChild(createSvgElement('line', { x1: xPos, x2: xPos, y1: 0, y2: height / 3, stroke: '#ccc' }));
                const yearText = createSvgElement('text', { x: xPos + 5, y: 15, 'font-size': '12px', 'font-weight': 'bold', fill: '#333' });
                yearText.textContent = date.getFullYear();
                headerGroup.appendChild(yearText);
            }
            
            // Month
            if (date.getMonth() !== lastMonth) {
                lastMonth = date.getMonth();
                const yTop = height / 3;
                headerGroup.appendChild(createSvgElement('line', { x1: xPos, x2: xPos, y1: yTop, y2: (yTop * 2), stroke: '#ccc' }));
                if (dayWidth > 0.5) {
                    const monthText = createSvgElement('text', { x: xPos + 5, y: yTop + 14, 'font-size': '11px', fill: '#555' });
                    monthText.textContent = date.toLocaleString('default', { month: 'short' });
                    headerGroup.appendChild(monthText);
                }
            }

            // Days
            const yTop = (height / 3) * 2;
            if (CONFIG.currentZoom === 'week' && date.getDay() === 1 && i !== 0) {
                headerGroup.appendChild(createSvgElement('line', { x1: xPos, x2: xPos, y1: yTop, y2: height, stroke: '#ddd' }));
                const dayText = createSvgElement('text', { x: xPos + 3, y: height - 5, 'font-size': '10px', fill: '#777' });
                dayText.textContent = date.getDate(); 
                headerGroup.appendChild(dayText);
            } else if (CONFIG.currentZoom === 'day') {
                headerGroup.appendChild(createSvgElement('line', { x1: xPos, x2: xPos, y1: yTop, y2: height, stroke: '#eee' }));
                const dayText = createSvgElement('text', { x: xPos + 2, y: height - 5, 'font-size': '9px', fill: '#777' });
                dayText.textContent = date.getDate(); 
                headerGroup.appendChild(dayText);
            }
        }
        
        headerGroup.appendChild(createSvgElement('line', { x1: 0, x2: width, y1: height/3, y2: height/3, stroke: '#ddd' }));
        headerGroup.appendChild(createSvgElement('line', { x1: 0, x2: width, y1: (height/3)*2, y2: (height/3)*2, stroke: '#ddd' }));
        headerGroup.appendChild(createSvgElement('line', { x1: 0, x2: width, y1: height, y2: height, stroke: '#999' }));
        svg.appendChild(headerGroup);
    };

    const drawGrid = (svg, ganttStartDate, totalDays, chartHeight) => {
        const zoom = CONFIG.zoomLevels[CONFIG.currentZoom];
        const dayWidth = zoom.dayWidth;
        const gridGroup = createSvgElement('g', { class: 'grid-lines' });
        
        for (let i = 0; i <= totalDays; i++) {
            const date = new Date(ganttStartDate); 
            date.setDate(date.getDate() + i);
            const xPos = i * dayWidth;
            let isLine = false; 
            let color = CONFIG.gridLineColor;
            
            if (date.getDate() === 1) { isLine = true; color = CONFIG.dividerLineColor; }
            else if ((CONFIG.currentZoom === 'week' || CONFIG.currentZoom === 'month') && date.getDay() === 1) { isLine = true; }
            else if (CONFIG.currentZoom === 'day') { isLine = true; }
            
            if (isLine) {
                gridGroup.appendChild(createSvgElement('line', {
                    x1: xPos, x2: xPos, y1: 0, y2: chartHeight, stroke: color, 'stroke-width': 1,
                    'stroke-dasharray': (color === CONFIG.dividerLineColor) ? '0' : '4,2'
                }));
            }
        }
        svg.appendChild(gridGroup);
    };

    const drawTimelineBars = (svg, schedule, ganttStartDate, totalDays, onUpdate) => {
        const zoom = CONFIG.zoomLevels[CONFIG.currentZoom];
        const dayWidth = zoom.dayWidth;
        const tasksGroup = createSvgElement('g', { 'font-family': CONFIG.fontFamily });
        const arrowGroup = createSvgElement('g', { class: 'dependency-arrows' });
        
        const defs = createSvgElement('defs');
        const marker = createSvgElement('marker', {
            id: 'arrowhead', markerWidth: '10', markerHeight: '7',
            refX: '9', refY: '3.5', orient: 'auto'
        });
        marker.appendChild(createSvgElement('polygon', { points: '0 0, 10 3.5, 0 7', fill: CONFIG.dependencyColor }));
        defs.appendChild(marker);

        const criticalMarker = createSvgElement('marker', {
            id: 'arrowhead-critical', markerWidth: '10', markerHeight: '7',
            refX: '9', refY: '3.5', orient: 'auto'
        });
        criticalMarker.appendChild(createSvgElement('polygon', { points: '0 0, 10 3.5, 0 7', fill: CONFIG.criticalDependencyColor }));
        defs.appendChild(criticalMarker);
        svg.appendChild(defs);

        const criticalSet = identifyCriticalPath(schedule);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const taskCoords = {};
        
        // 1. Calculate Geometry
        schedule.forEach((task, index) => {
            const y = index * CONFIG.rowHeight;
            const taskStartDate = parseLocal(task.start);
            if (isNaN(taskStartDate.getTime())) return;
            
            const startOffsetDays = (taskStartDate - ganttStartDate) / (1000 * 60 * 60 * 24);
            const barX = Math.max(0, startOffsetDays * dayWidth);
            const barWidth = Math.max(dayWidth, task.duration * dayWidth);
            const barCenterY = y + (CONFIG.rowHeight / 2);

            taskCoords[task.id] = {
                x: barX, y: barCenterY, width: barWidth, endX: barX + barWidth,
                isCritical: criticalSet.has(task.id)
            };
        });

        // 2. Draw Dependencies
        const dependenciesToDraw = [];
        schedule.forEach(task => {
            if (task.dependencies && Array.isArray(task.dependencies)) {
                task.dependencies.forEach(depId => {
                    const targetInfo = taskCoords[task.id];
                    const sourceInfo = taskCoords[depId];
                    if (targetInfo && sourceInfo) {
                        const isLinkCritical = targetInfo.isCritical && sourceInfo.isCritical;
                        dependenciesToDraw.push({ source: sourceInfo, target: targetInfo, isCritical: isLinkCritical });
                    }
                });
            }
        });
        dependenciesToDraw.sort((a, b) => a.isCritical === b.isCritical ? 0 : a.isCritical ? 1 : -1);

        dependenciesToDraw.forEach(link => {
            const startX = link.source.endX;
            const startY = link.source.y;
            const endX = link.target.x;
            const endY = link.target.y;
            
            const cx1 = startX + 15;
            const cy1 = startY;
            const cx2 = endX - 15;
            const cy2 = endY;
            const d = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
            
            const path = createSvgElement('path', {
                d: d,
                stroke: link.isCritical ? CONFIG.criticalDependencyColor : CONFIG.dependencyColor,
                'stroke-width': link.isCritical ? '2' : '1.5',
                fill: 'none',
                'marker-end': link.isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'
            });
            arrowGroup.appendChild(path);
        });

        // 3. Draw Tasks
        schedule.forEach((task, index) => {
            const y = index * CONFIG.rowHeight;
            const taskStartDate = parseLocal(task.start);
            if (isNaN(taskStartDate.getTime())) return;
            
            const coords = taskCoords[task.id];
            if (!coords) return;
            
            const barX = coords.x;
            const barWidth = coords.width;
            const isCritical = coords.isCritical;

            // Row Background
            const rowBg = createSvgElement('rect', { x: 0, y: y, width: totalDays * dayWidth, height: CONFIG.rowHeight, fill: index % 2 === 0 ? '#fff' : '#fafafa' });
            const rowLine = createSvgElement('line', { x1: 0, x2: totalDays * dayWidth, y1: y + CONFIG.rowHeight, y2: y + CONFIG.rowHeight, stroke: '#f0f0f0' });
            tasksGroup.appendChild(rowBg); 
            tasksGroup.appendChild(rowLine);

            // Task Bar
            const barGroup = createSvgElement('g', { class: 'gantt-task-bar', 'data-task-id': task.id });
            const barY = y + (CONFIG.rowHeight - CONFIG.barHeight)/2;
            const fillColor = isCritical ? CONFIG.criticalColor : CONFIG.barColor;

            const bar = createSvgElement('rect', { 
                x: barX, y: barY, width: barWidth, height: CONFIG.barHeight, 
                fill: fillColor, 'fill-opacity': CONFIG.barOpacity, 
                rx: 3, ry: 3, class: 'gantt-bar-main', style: 'cursor: move;' 
            });
            
            // Progress Bar
            let progress = 0;
            const taskEndDate = parseLocal(task.end);
            if (today > taskEndDate) progress = 100;
            else if (today >= taskStartDate) { 
                const elapsed = (today - taskStartDate) / (1000 * 60 * 60 * 24) + 1; 
                progress = Math.min(100, (elapsed / task.duration) * 100); 
            }
            
            const progressBar = createSvgElement('rect', { 
                x: barX, y: barY, 
                width: Math.max(0, barWidth * (progress / 100)), 
                height: CONFIG.barHeight, 
                fill: CONFIG.progressBarColor, 'fill-opacity': CONFIG.progressOpacity,
                rx: 3, ry: 3, 'pointer-events': 'none' 
            });

            // Handles & Interactions
            if (barWidth > 15) {
                const handleStart = createSvgElement('rect', { x: barX, y: barY, width: CONFIG.handleWidth, height: CONFIG.barHeight, fill: 'transparent', style: 'cursor: ew-resize;' });
                const handleEnd = createSvgElement('rect', { x: barX + barWidth - CONFIG.handleWidth, y: barY, width: CONFIG.handleWidth, height: CONFIG.barHeight, fill: 'transparent', style: 'cursor: ew-resize;' });
                
                handleStart.addEventListener('mousedown', (e) => startDrag(e, 'resize-start', barGroup, bar, dayWidth, ganttStartDate, task));
                handleEnd.addEventListener('mousedown', (e) => startDrag(e, 'resize-end', barGroup, bar, dayWidth, ganttStartDate, task));
                
                handleStart.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const newStartStr = prompt("Enter Start Date (YYYY-MM-DD):", task.start);
                    if (newStartStr && typeof onUpdate === 'function') {
                        onUpdate({ id: task.id, start: newStartStr, end: task.end });
                    }
                });

                handleEnd.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const newEndStr = prompt("Enter End Date (YYYY-MM-DD):", task.end);
                    if (newEndStr && typeof onUpdate === 'function') {
                        onUpdate({ id: task.id, start: task.start, end: newEndStr });
                    }
                });

                barGroup.append(handleStart, handleEnd);
            }
            
            bar.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const newDurationStr = prompt(`Enter Duration for "${task.name}" (Days):`, task.duration);
                const newDuration = parseInt(newDurationStr);
                if (!isNaN(newDuration) && newDuration > 0) {
                     const start = parseLocal(task.start);
                     const newEnd = new Date(start);
                     newEnd.setDate(newEnd.getDate() + newDuration - 1);
                     if (typeof onUpdate === 'function') {
                        onUpdate({ id: task.id, start: task.start, end: formatDateLocal(newEnd) });
                    }
                }
            });

            bar.addEventListener('mousedown', (e) => startDrag(e, 'move', barGroup, bar, dayWidth, ganttStartDate, task));

            const title = createSvgElement('title'); 
            title.textContent = `${task.name}\nStart: ${task.start}\nEnd: ${task.end}\nDuration: ${task.duration} days${isCritical ? '\n[CRITICAL PATH]' : ''}`;
            barGroup.append(bar, progressBar, title); 
            tasksGroup.append(barGroup);
        });

        svg.appendChild(arrowGroup);
        svg.appendChild(tasksGroup);
    };

    // --- INTERACTION LOGIC ---
    const startDrag = (e, type, group, bar, dayWidth, startDate, task) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        
        dragState = { 
            type, task, group, bar, dayWidth, startDate, 
            startX: e.clientX, 
            initialX: parseFloat(bar.getAttribute('x')), 
            initialWidth: parseFloat(bar.getAttribute('width')) 
        };
        
        group.classList.add('dragging');
        document.body.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!dragState) return;
        requestAnimationFrame(() => {
            if (!dragState) return;
            const dx = e.clientX - dragState.startX;
            
            if (dragState.type === 'move') {
                const newX = dragState.initialX + dx;
                if (newX >= 0) { 
                    dragState.bar.setAttribute('x', newX); 
                    dragState.group.setAttribute('transform', `translate(${dx}, 0)`); 
                }
            } else if (dragState.type === 'resize-end') {
                const newWidth = Math.max(dragState.dayWidth, dragState.initialWidth + dx); 
                dragState.bar.setAttribute('width', newWidth);
            }
        });
    };

    const handleMouseUp = (e) => {
        if (!dragState) return;
        
        dragState.group.classList.remove('dragging'); 
        dragState.group.removeAttribute('transform');
        
        if (typeof currentUpdateCallback === 'function') {
            if (dragState.type === 'move') {
                const dx = e.clientX - dragState.startX;
                const finalDaysOffset = Math.round((dragState.initialX + dx) / dragState.dayWidth);
                const newStart = new Date(dragState.startDate); 
                newStart.setDate(newStart.getDate() + finalDaysOffset);
                const newEnd = new Date(newStart); 
                newEnd.setDate(newEnd.getDate() + parseInt(dragState.task.duration) - 1);
                
                currentUpdateCallback({ id: dragState.task.id, start: formatDateLocal(newStart), end: formatDateLocal(newEnd) });
            } else if (dragState.type === 'resize-end') {
                const currentWidth = parseFloat(dragState.bar.getAttribute('width'));
                const daysDuration = Math.round(currentWidth / dragState.dayWidth);
                const start = parseLocal(dragState.task.start); 
                const newEnd = new Date(start); 
                newEnd.setDate(newEnd.getDate() + daysDuration - 1);
                
                currentUpdateCallback({ id: dragState.task.id, start: dragState.task.start, end: formatDateLocal(newEnd) });
            }
        }
        
        document.body.removeEventListener('mousemove', handleMouseMove); 
        document.body.removeEventListener('mouseup', handleMouseUp); 
        dragState = null;
    };

    // --- MAIN RENDER ---
    const render = (scheduleData, onUpdate, containerId = 'villa-schedule-preview1') => {
        if (!Array.isArray(scheduleData)) {
            console.warn("Gantt Chart: scheduleData is not an array. Render aborted.", scheduleData);
            return;
        }

        currentScheduleData = scheduleData;
        currentUpdateCallback = onUpdate;
        activeContainerId = containerId;
        
        const rootContainer = document.getElementById(containerId);
        if (!rootContainer) {
            console.error(`Gantt Chart: Container #${containerId} not found.`);
            return;
        }
        
        rootContainer.innerHTML = '';
        rootContainer.style.display = 'flex';
        rootContainer.style.flexDirection = 'column';
        rootContainer.style.height = '100%';
        rootContainer.style.overflowX = 'hidden'; 
        rootContainer.style.overflowY = 'hidden';
        
        // 1. Zoom Controls
        const controlsDiv = document.createElement('div');
        controlsDiv.style.padding = '8px 10px'; 
        controlsDiv.style.borderBottom = '1px solid #ccc'; 
        controlsDiv.style.background = '#f5f5f5'; 
        controlsDiv.style.flexShrink = '0';
        
        ['Day', 'Week', 'Month', 'Year'].forEach(level => {
            const btn = document.createElement('button'); 
            btn.textContent = level; 
            btn.className = `zoom-btn ${CONFIG.currentZoom === level.toLowerCase() ? 'active' : ''}`;
            btn.style.marginRight = '5px'; 
            btn.style.padding = '4px 10px'; 
            btn.style.border = '1px solid #ccc'; 
            btn.style.borderRadius = '4px'; 
            btn.style.cursor = 'pointer';
            
            if(CONFIG.currentZoom === level.toLowerCase()) { 
                btn.style.background = '#4363d8'; 
                btn.style.color = 'white'; 
            } else { 
                btn.style.background = '#eee'; 
                btn.style.color = '#333'; 
            }
            
            btn.onclick = () => { 
                CONFIG.currentZoom = level.toLowerCase(); 
                render(currentScheduleData, currentUpdateCallback, activeContainerId); 
            };
            controlsDiv.appendChild(btn);
        });
        rootContainer.appendChild(controlsDiv);
        
        // 2. Main Content Wrapper
        const contentArea = document.createElement('div'); 
        contentArea.style.display = 'flex'; 
        contentArea.style.flex = '1'; 
        contentArea.style.overflow = 'hidden'; 
        contentArea.style.position = 'relative';
        rootContainer.appendChild(contentArea);

        // LEFT COLUMN (Tasks)
        const taskListDiv = document.createElement('div'); 
        taskListDiv.style.width = `${CONFIG.taskListWidth}px`; 
        taskListDiv.style.flexShrink = '0'; 
        taskListDiv.style.borderRight = '1px solid #ccc'; 
        taskListDiv.style.background = '#fff'; 
        taskListDiv.style.display = 'flex'; 
        taskListDiv.style.flexDirection = 'column';
        taskListDiv.style.zIndex = '2';
        
        const leftHeader = document.createElement('div'); 
        leftHeader.style.height = `${CONFIG.headerHeight}px`; 
        leftHeader.style.borderBottom = '1px solid #999'; 
        leftHeader.style.background = '#f8f9fa'; 
        leftHeader.style.display = 'flex'; 
        leftHeader.style.alignItems = 'center'; 
        leftHeader.style.paddingLeft = '10px'; 
        leftHeader.style.fontWeight = 'bold'; 
        leftHeader.style.fontSize = '12px'; 
        leftHeader.textContent = 'Task Name';
        
        const leftContent = document.createElement('div'); 
        leftContent.style.flex = '1'; 
        leftContent.style.overflow = 'hidden'; 
        
        const validTasks = scheduleData.filter(t => !isNaN(parseLocal(t.start).getTime()));
        
        validTasks.forEach((task, index) => {
            const rowDiv = document.createElement('div'); 
            rowDiv.style.height = `${CONFIG.rowHeight}px`; 
            rowDiv.style.borderBottom = '1px solid #f0f0f0'; 
            rowDiv.style.padding = '0 10px'; 
            rowDiv.style.display = 'flex'; 
            rowDiv.style.alignItems = 'center'; 
            rowDiv.style.fontSize = CONFIG.taskFontSize; 
            rowDiv.style.backgroundColor = index % 2 === 0 ? '#fff' : '#fafafa'; 
            rowDiv.style.whiteSpace = 'nowrap'; 
            rowDiv.style.overflow = 'hidden'; 
            rowDiv.style.textOverflow = 'ellipsis';
            rowDiv.style.cursor = 'pointer'; 
            rowDiv.title = `Double-click to edit ${task.name}`; 
            rowDiv.textContent = `${task.id}. ${task.name}`;
            
            // Double-click to Edit Start/Duration from Left Column
            rowDiv.addEventListener('dblclick', () => {
                const newStartStr = prompt(`Edit Start Date for "${task.name}" (YYYY-MM-DD):`, task.start);
                if (!newStartStr) return;
                
                const newDurationStr = prompt(`Edit Duration for "${task.name}" (Days):`, task.duration);
                if (!newDurationStr) return;
                
                const newDuration = parseInt(newDurationStr);
                
                if (!isNaN(newDuration) && newDuration > 0) {
                     const start = parseLocal(newStartStr);
                     if (isNaN(start.getTime())) {
                         alert("Invalid Date"); return;
                     }
                     const newEnd = new Date(start);
                     newEnd.setDate(newEnd.getDate() + newDuration - 1);
                     
                     if (typeof onUpdate === 'function') {
                        onUpdate({ id: task.id, start: formatDateLocal(start), end: formatDateLocal(newEnd) });
                    }
                } else {
                    alert("Invalid Duration");
                }
            });

            leftContent.appendChild(rowDiv);
        });
        
        taskListDiv.appendChild(leftHeader);
        taskListDiv.appendChild(leftContent);
        contentArea.appendChild(taskListDiv);

        if (validTasks.length === 0) { 
            contentArea.appendChild(document.createTextNode('No valid schedule data')); 
            return; 
        }

        // Timeline Setup
        const taskStarts = validTasks.map(t => parseLocal(t.start)); 
        const taskEnds = validTasks.map(t => parseLocal(t.end));
        const minStart = new Date(Math.min.apply(null, taskStarts)); 
        const maxEnd = new Date(Math.max.apply(null, taskEnds));
        
        const threeYearsLater = new Date(minStart); 
        threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
        
        const ganttStartDate = new Date(minStart); 
        ganttStartDate.setDate(ganttStartDate.getDate() - 7);
        
        let ganttEndDate = new Date(Math.max(maxEnd.getTime(), threeYearsLater.getTime())); 
        ganttEndDate.setDate(ganttEndDate.getDate() + 30);

        const totalDays = Math.ceil((ganttEndDate - ganttStartDate) / (1000 * 60 * 60 * 24));
        const dayWidth = CONFIG.zoomLevels[CONFIG.currentZoom].dayWidth;
        const chartWidth = Math.ceil(totalDays * dayWidth); 
        const bodyHeight = validTasks.length * CONFIG.rowHeight;

        // RIGHT CONTAINER (Timeline)
        const timelineContainer = document.createElement('div'); 
        timelineContainer.style.flex = '1'; 
        timelineContainer.style.display = 'flex'; 
        timelineContainer.style.flexDirection = 'column'; 
        timelineContainer.style.overflow = 'hidden';
        contentArea.appendChild(timelineContainer);

        const headerScrollArea = document.createElement('div'); 
        headerScrollArea.style.height = `${CONFIG.headerHeight}px`; 
        headerScrollArea.style.overflow = 'hidden'; 
        headerScrollArea.style.backgroundColor = '#f8f9fa';
        timelineContainer.appendChild(headerScrollArea);
        
        const headerSvg = createSvgElement('svg', { width: chartWidth, height: CONFIG.headerHeight, style: 'display:block;' });
        drawHeader(headerSvg, ganttStartDate, totalDays); 
        headerScrollArea.appendChild(headerSvg);

        const bodyScrollArea = document.createElement('div'); 
        bodyScrollArea.style.flex = '1'; 
        bodyScrollArea.style.overflow = 'auto'; 
        timelineContainer.appendChild(bodyScrollArea);
        
        const bodySvg = createSvgElement('svg', { width: chartWidth, height: bodyHeight, style: 'display:block;' });
        // NOTE: Internal <style> tag removed for html2canvas compatibility
        
        drawGrid(bodySvg, ganttStartDate, totalDays, bodyHeight);
        drawTimelineBars(bodySvg, validTasks, ganttStartDate, totalDays, onUpdate);
        bodyScrollArea.appendChild(bodySvg);

        // Sync Scrolling
        bodyScrollArea.addEventListener('scroll', () => { 
            headerScrollArea.scrollLeft = bodyScrollArea.scrollLeft; 
            leftContent.scrollTop = bodyScrollArea.scrollTop; 
        });
    };

    return { render, calculateDynamicSchedule };
})();