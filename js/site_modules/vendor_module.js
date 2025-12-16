export const VendorModule = {
    init: (domElements) => {
        if(domElements.searchInput) {
            domElements.searchInput.addEventListener('input', (e) => VendorModule.search(e.target.value, domElements.resultsContainer));
        }
        // Listener for "Add New Vendor" button
        const addBtn = document.getElementById('add-new-vendor-btn');
        if(addBtn) addBtn.addEventListener('click', VendorModule.addNewVendor);
    },

    // Mock Database for Vendors (In real app, fetch from DB)
    vendorsDB: [
        { id: 1, item: 'Ceramic Tiles', company: 'RAK Ceramics', contact: 'John Doe', phone: '050-1234567', email: 'sales@rak.ae', office: 'Dubai', price: '45 AED/m2', website: 'rakceramics.com', category: 'Finishes' },
        { id: 2, item: 'LED Downlights', company: 'Philips Lighting', contact: 'Jane Smith', phone: '055-9876543', email: 'contact@philips.ae', office: 'Abu Dhabi', price: '25 AED/pc', website: 'lighting.philips.ae', category: 'Electrical' }
    ],

    addNewVendor: () => {
        // Simple prompt based entry for demo
        const item = prompt("Item Name:");
        const company = prompt("Company Name:");
        const contact = prompt("Contact Person:");
        const phone = prompt("Phone No:");
        const price = prompt("Price (Approx):");
        
        if(item && company) {
            VendorModule.vendorsDB.push({
                id: Date.now(),
                item, company, contact, phone, 
                email: '-', office: '-', price: price || '-', website: '-', category: 'General'
            });
            alert("Vendor added locally.");
            // Trigger refresh if search is active
            const searchInput = document.getElementById('vendor-search-input');
            if(searchInput) VendorModule.search(searchInput.value, document.getElementById('vendor-search-results'));
        }
    },

    search: (searchTerm, container) => {
        if (!searchTerm) {
            VendorModule.renderResults(VendorModule.vendorsDB, container); // Show all if empty
            return;
        }
        const term = searchTerm.toLowerCase();
        const results = VendorModule.vendorsDB.filter(v => 
            v.item.toLowerCase().includes(term) || 
            v.company.toLowerCase().includes(term) ||
            v.contact.toLowerCase().includes(term)
        );
        VendorModule.renderResults(results, container);
    },

    renderResults: (results, container) => {
        if (results.length === 0) {
            container.innerHTML = '<p>No matching vendors found.</p>';
            return;
        }
    
        let html = '<table class="output-table" style="width:100%; font-size: 0.9em; border-collapse:collapse;">';
        html += '<thead style="background:#f0f0f0;"><tr><th>Item Name</th><th>Product Details/Company</th><th>Contact Info</th><th>Office/Web</th><th>Price</th></tr></thead><tbody>';
        
        results.forEach(r => {
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><strong>${r.item}</strong><br><small>${r.category}</small></td>
                    <td>${r.company}<br><small>${r.website}</small></td>
                    <td>${r.contact}<br>${r.phone}<br><small>${r.email}</small></td>
                    <td>${r.office}</td>
                    <td>${r.price}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }
};