export const ToolsModule = {
    init: (domElements) => {
        if(domElements.rateInput && domElements.tableBody) {
            domElements.rateInput.addEventListener('input', () => ToolsModule.calculateTotals(domElements));
            domElements.tableBody.addEventListener('input', (e) => {
                if(e.target.matches('.man-days-input')) ToolsModule.calculateTotals(domElements);
            });
        }
    },

    renderResourceCalculator: async (jobNo, domElements, schedule) => {
        if (!jobNo || !domElements.tableBody) return;
        domElements.tableBody.innerHTML = '';
        
        // We rely on the schedule passed in (calculated in ScheduleModule)
        if (!schedule || schedule.length === 0) return;

        schedule.forEach(task => {
            const row = domElements.tableBody.insertRow();
            row.innerHTML = `
                <td>${task.name}</td>
                <td style="text-align: right;">${task.duration}</td>
                <td><input type="number" class="man-days-input" value="0" min="0"></td>
                <td class="task-cost" style="text-align: right;">0.00</td>`;
        });
        
        // Add total row
        domElements.tableBody.innerHTML += `<tr class="resource-total-row"><td colspan="2">Total Estimated Labor Cost</td><td id="total-man-days" style="text-align: right;">0</td><td id="total-resource-cost" style="text-align: right;">0.00</td></tr>`;
    },

    calculateTotals: (domElements) => {
        const dayRate = parseFloat(domElements.rateInput.value) || 0;
        let totalManDays = 0;
        let totalCost = 0;
        
        domElements.tableBody.querySelectorAll('tr:not(.resource-total-row)').forEach(row => {
            const manDays = parseFloat(row.querySelector('.man-days-input').value) || 0;
            const taskCost = manDays * dayRate;
            row.querySelector('.task-cost').textContent = taskCost.toFixed(2);
            totalManDays += manDays;
            totalCost += taskCost;
        });

        // Update totals
        const totalDaysEl = domElements.tableBody.querySelector('#total-man-days');
        const totalCostEl = domElements.tableBody.querySelector('#total-resource-cost');
        if(totalDaysEl) totalDaysEl.textContent = totalManDays;
        if(totalCostEl) totalCostEl.textContent = totalCost.toFixed(2);
    }
};