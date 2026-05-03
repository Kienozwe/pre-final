// app.js
window.mainMap = null;


document.addEventListener('DOMContentLoaded', () => {
    
    window.mainMap = new IncidentMap('map').init();
    
    
    loadCurrentSection();
    
   
    setupNavigation();
    
    
    setupFilters();
    
   
    window.addEventListener('hashchange', loadCurrentSection);
});


function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            window.location.hash = href;
            
           
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            loadCurrentSection();
        });
    });
}


function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const refreshBtn = document.getElementById('refreshMap');
    
    const applyFilters = () => {
        const filters = {};
        
        if (statusFilter.value) {
            filters.status = statusFilter.value;
        }
        
        if (priorityFilter.value) {
            filters.priority = priorityFilter.value;
        }
        
        if (window.mainMap) {
            window.mainMap.loadIncidents(filters);
        }
    };
    
    statusFilter?.addEventListener('change', applyFilters);
    priorityFilter?.addEventListener('change', applyFilters);
    refreshBtn?.addEventListener('click', applyFilters);
}


window.loadCurrentSection = function() {
    const hash = window.location.hash || '#home';
    const sections = document.querySelectorAll('.section');
    
    sections.forEach(section => section.classList.remove('active'));
    
    let activeSection = null;
    
    switch(hash) {
        case '#home':
            activeSection = document.getElementById('mapSection');
            if (window.mainMap) {
                window.mainMap.loadIncidents();
             
                setTimeout(() => window.mainMap.map.invalidateSize(), 100);
            }
            break;
            
        case '#reports':
            activeSection = document.getElementById('reportsSection');
            if (window.loadIncidentsTable) {
                window.loadIncidentsTable();
            }
            break;
            
        case '#submit':
            activeSection = document.getElementById('submitSection');
            break;
            
        case '#admin':
            if (!Auth.isAdmin()) {
                showNotification('Admin access required', 'error');
                window.location.hash = '#home';
                return;
            }
            activeSection = document.getElementById('adminSection');
            if (window.loadAdminStats) {
                window.loadAdminStats();
            }
            if (window.loadAdminTable) {
                window.loadAdminTable();
            }
            break;
            
        default:
            window.location.hash = '#home';
            return;
    }
    
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
 
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash) {
            link.classList.add('active');
        }
    });
};


function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusClass(status) {
    const statusMap = {
        'Pending': 'status-pending',
        'Verified': 'status-verified',
        'In Progress': 'status-in-progress',
        'Resolved': 'status-resolved',
        'False Report': 'status-false'
    };
    return statusMap[status] || 'status-pending';
}

function getPriorityClass(priority) {
    const priorityMap = {
        'Low': 'priority-low',
        'Medium': 'priority-medium',
        'High': 'priority-high',
        'Critical': 'priority-critical'
    };
    return priorityMap[priority] || 'priority-medium';
}

window.formatDate = formatDate;
window.getStatusClass = getStatusClass;
window.getPriorityClass = getPriorityClass;