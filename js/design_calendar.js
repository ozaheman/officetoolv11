//--- START OF FILE design_calendar.js ---

/**
 * @module DesignCalendar
 * Renders a full monthly calendar view and an agenda view of all design tasks across projects.
 */
const DesignCalendar = (() => {
    let currentDate = new Date();

    function changeMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
    }

    // --- NEW HELPER FUNCTIONS for leave indicators ---
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    function getStaffColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            // Adjusting the formula to generate darker, more saturated colors
            const adjustedValue = 50 + (value % 156); 
            color += ('00' + adjustedValue.toString(16)).substr(-2);
        }
        return color;
    }
    // --- END HELPER FUNCTIONS ---
    
    function renderAgenda(scrumTasks, staffList) {
        const container = document.getElementById('design-agenda-container');
        if (!container) return;

        const activeTasks = scrumTasks.filter(task => task.status !== 'Done' && task.dueDate);
        const today = new Date(); 
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); 
        tomorrow.setDate(today.getDate() + 1);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(today.getDate() + 2);
        const sevenDaysFromNow = new Date(today); 
        sevenDaysFromNow.setDate(today.getDate() + 7);

        activeTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const tasks = {
            overdue: activeTasks.filter(t => new Date(t.dueDate) < today),
            today: activeTasks.filter(t => new Date(t.dueDate).getTime() === today.getTime()),
            tomorrow: activeTasks.filter(t => new Date(t.dueDate).getTime() === tomorrow.getTime()),
            dayAfter: activeTasks.filter(t => new Date(t.dueDate).getTime() === dayAfterTomorrow.getTime()),
            thisWeek: activeTasks.filter(t => {
                const dueDate = new Date(t.dueDate);
                return dueDate > dayAfterTomorrow && dueDate <= sevenDaysFromNow;
            })
        };

        const renderTaskGroup = (taskList, title, emptyMessage) => {
            let groupHtml = `<h3 class="agenda-header">${title}</h3>`;
            if (taskList.length === 0) {
                groupHtml += `<p class="agenda-empty">${emptyMessage}</p>`;
            } else {
                groupHtml += taskList.map(task => {
                    const assignee = task.assigneeName || 'Unassigned'; 
                    return `
                        <div class="agenda-item" data-task-id="${task.id}" data-job-no="${task.jobNo}">
                            <div class="agenda-item-main">
                                <span class="agenda-task-name">${task.name}</span>
                                <span class="agenda-project-id">${task.jobNo}</span>
                            </div>
                            <div class="agenda-item-details">
                                <span class="agenda-assignee">${assignee}</span>
                                <span class="agenda-due-date">${task.dueDate}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            return groupHtml;
        };

        container.innerHTML = `
            ${renderTaskGroup(tasks.overdue, '🔴 Overdue', 'No overdue tasks.')}
            ${renderTaskGroup(tasks.today, '🗓️ Today', 'No tasks due today.')}
            ${renderTaskGroup(tasks.tomorrow, '▶️ Tomorrow', 'No tasks due tomorrow.')}
            ${renderTaskGroup(tasks.dayAfter, '⏩ Day After Tomorrow', 'No tasks due the day after tomorrow.')}
            ${renderTaskGroup(tasks.thisWeek, '📅 Later This Week', 'No other tasks due this week.')}
        `;

        container.querySelectorAll('.agenda-item').forEach(item => {
            item.addEventListener('click', () => {
                if(typeof showTaskModal === 'function') {
                    showTaskModal(item.dataset.taskId, item.dataset.jobNo);
                }
            });
        });
    }
    
    async function render(scrumTasks, staffList, allProjects) {
        const container = document.getElementById('design-calendar-container');
        if (!container) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const leavesByDate = new Map();
        staffList.forEach(staff => {
            (staff.leaves || []).forEach(leave => {
                let d = new Date(leave.startDate + 'T00:00:00');
                const endDate = new Date(leave.endDate + 'T00:00:00');
                while(d <= endDate) {
                    const dateKey = d.toISOString().split('T')[0];
                    if (!leavesByDate.has(dateKey)) leavesByDate.set(dateKey, []);
                    leavesByDate.get(dateKey).push(staff.name);
                    d.setDate(d.getDate() + 1);
                }
            });
        });

        const holidays = await DB.getHolidays('AE', year);
        const holidaysByDate = new Map(holidays.map(h => [h.date, h.name]));

        container.innerHTML = `
            <div class="calendar-header">
                <button id="cal-prev-btn" class="secondary-button">&lt;</button>
                <h3 id="cal-month-year">${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <div>
                    <button id="cal-refresh-holidays-btn" class="secondary-button small-btn" title="Refresh public holiday data for ${year}">Refresh Holidays</button>
                    <button id="cal-next-btn" class="secondary-button">&gt;</button>
                </div>
            </div>
            <div id="cal-grid-wrapper">
                <div class="calendar-grid-header">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div class="calendar-grid" id="cal-grid-body"></div>
            </div>
        `;
        const gridBody = document.getElementById('cal-grid-body');

        const firstDayOfMonth = new Date(year, month, 1);
        const startDayGrid = new Date(firstDayOfMonth);
        startDayGrid.setDate(startDayGrid.getDate() - firstDayOfMonth.getDay());
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const endDayGrid = new Date(lastDayOfMonth);
        endDayGrid.setDate(endDayGrid.getDate() + (6 - lastDayOfMonth.getDay()));

        let dayCells = [];
        let currentDayIter = new Date(startDayGrid);

        // MODIFICATION: Create Day Cells with new leave indicator logic
        while(currentDayIter <= endDayGrid) {
            const dateKey = currentDayIter.toISOString().split('T')[0];
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            let tooltipParts = [];
            if (currentDayIter.getMonth() !== month) dayCell.classList.add('other-month');

            const dayOfWeek = currentDayIter.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) dayCell.classList.add('is-weekend');

            if(holidaysByDate.has(dateKey)) {
                dayCell.classList.add('is-holiday');
                tooltipParts.push(`Holiday: ${holidaysByDate.get(dateKey)}`);
            }
            
            let leaveHtml = '';
            if(leavesByDate.has(dateKey)) {
                const staffOnLeave = leavesByDate.get(dateKey);
                tooltipParts.push(`On Leave: ${staffOnLeave.join(', ')}`);
                leaveHtml = staffOnLeave.map(staffName => `
                    <div class="leave-indicator" style="background-color: ${getStaffColor(staffName)};" title="${staffName} on leave">
                        ${getInitials(staffName)}
                    </div>
                `).join('');
            }
            
            if(tooltipParts.length > 0) dayCell.title = tooltipParts.join('\n');

            dayCell.innerHTML = `
                <div class="day-header">
                    <div class="day-leaves">${leaveHtml}</div>
                    <span class="day-number">${currentDayIter.getDate()}</span>
                </div>
                <div class="day-events"></div>`;
            gridBody.appendChild(dayCell);
            dayCells.push({ date: new Date(currentDayIter), element: dayCell });
            currentDayIter.setDate(currentDayIter.getDate() + 1);
        }

        // 4. Process and Render Task Bars with new flexbox layout
        const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
        
        const tasksToRender = scrumTasks.map(task => {
            if (!task.dueDate) return null;
            const dueDate = new Date(task.dueDate + 'T00:00:00');
            const duration = task.plannedDuration || 1;
            const startDate = addDays(dueDate, -(duration - 1));
            if (startDate <= endDayGrid && dueDate >= startDayGrid) {
                return { ...task, startDate, dueDate };
            }
            return null;
        }).filter(Boolean).sort((a, b) => a.startDate - b.startDate);

        tasksToRender.forEach(task => {
            let placed = false;
            let level = 0;
            while(!placed) {
                let canPlaceHere = true;
                for(let i = 0; i < dayCells.length; i++) {
                    const day = dayCells[i];
                    if (task.startDate <= day.date && task.dueDate >= day.date) {
                        if (day.element.querySelector('.day-events').children[level]) {
                            canPlaceHere = false;
                            break;
                        }
                    }
                }
                if (canPlaceHere) {
                    dayCells.forEach((day, i) => {
                        if (task.startDate <= day.date && task.dueDate >= day.date) {
                             const eventsContainer = day.element.querySelector('.day-events');
                             while(eventsContainer.children.length < level) {
                                 eventsContainer.appendChild(document.createElement('div')).style.height = '22px';
                             }
                             const color = DEPARTMENT_COLORS[task.department] || '#777';
                             const eventBar = document.createElement('div');
                             eventBar.className = 'event-bar';
                             eventBar.style.backgroundColor = color;
                             eventBar.title = `${task.name} (${task.jobNo})\nDue: ${task.dueDate}`;
                             eventBar.onclick = () => showTaskModal(task.id, task.jobNo);
                             
                             const isInProgress = task.status === 'In Progress';
                             if (isInProgress) eventBar.classList.add('in-progress');

                             let jobNoHtml = '';
                             let labelText = task.name;
                             let statusHtml = '';

                             if (day.date.getTime() === task.startDate.getTime() || day.date.getDay() === 0 || i === 0) {
                                 jobNoHtml = `<span class="event-bar-jobno">${task.jobNo}:</span>`;
                                 if (isInProgress) {
                                    const timeDiff = task.dueDate.getTime() - today.getTime();
                                    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));
                                    if (dayDiff < 0) statusHtml = `<span class="event-bar-status">[Overdue]</span>`;
                                    else if (dayDiff === 0) statusHtml = `<span class="event-bar-status">[Due Today]</span>`;
                                    else statusHtml = `<span class="event-bar-status">[${dayDiff}d left]</span>`;
                                 }
                             }
                             eventBar.innerHTML = `${jobNoHtml}<span class="event-bar-label">${labelText}</span>${statusHtml}`;
                             eventsContainer.appendChild(eventBar);
                        }
                    });
                    placed = true;
                } else {
                    level++;
                }
            }
        });

        // 5. Attach Event Listeners
        const activeViewBtn = document.querySelector('#design-view .tabs .tab-button.active');
        const refreshEvent = new CustomEvent('designViewChange', { detail: { target: activeViewBtn } });

        document.getElementById('cal-prev-btn').onclick = () => {
            changeMonth(-1);
            document.dispatchEvent(refreshEvent);
        };
        document.getElementById('cal-next-btn').onclick = () => {
            changeMonth(1);
            document.dispatchEvent(refreshEvent);
        };
        document.getElementById('cal-refresh-holidays-btn').onclick = async () => {
            await handleRefreshHolidays(year, true);
            document.dispatchEvent(refreshEvent);
        };
    }

    async function handleRefreshHolidays(year, force = false) {
        if(force) {
            const oldHolidays = await DB.getHolidays('AE', year);
            for(const holiday of oldHolidays) {
                await DB.delete('holidays', holiday.id);
            }
        }
        try {
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/AE`);
            if (!response.ok) throw new Error(`API failed with status ${response.status}`);
            const data = await response.json();
            const holidays = data.map(h => ({ name: h.name, date: h.date }));
            await DB.addHolidays(holidays, 'AE', year);
            console.log(`Fetched and cached ${holidays.length} holidays for ${year}.`);
            alert(`Successfully refreshed holiday data for ${year}.`);
            return holidays;
        } catch(error) {
            console.error("Could not fetch public holidays:", error);
            alert("Could not fetch public holidays from the internet. Please check your connection. Using local data if available.");
            return [];
        }
    }

    return { 
        render,
        renderAgenda,
        changeMonth 
    };

})();