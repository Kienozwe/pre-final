// api.js

class API {

    static getAuthHeader() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }


    static async request(endpoint, options = {}) {
        try {
            // Convert /users/login → ?r=users/login
            const route = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
            const baseUrl = CONFIG.API_BASE_URL;

            // Handle existing query strings in endpoint
            const [routePath, existingQuery] = route.split('?');
            const queryPart = existingQuery ? `r=${routePath}&${existingQuery}` : `r=${routePath}`;
            const url = `${baseUrl}?${queryPart}`;

            const headers = {
                'Content-Type': 'application/json',
                ...this.getAuthHeader(),
                ...options.headers
            };

            const response = await fetch(url, { ...options, headers });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }


    static async register(username, email, password) {
        return this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    static async login(username, password) {
        return this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }


    static async adminLogin(username, password) {
        return this.request('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }


    static async getUserProfile() {
        return this.request('/users/profile');
    }


    static async getAdminProfile() {
        return this.request('/admin/profile');
    }


    static async getAdminStats() {
        return this.request('/admin/stats');
    }


    static async createIncident(incidentData) {
        return this.request('/incidents', {
            method: 'POST',
            body: JSON.stringify(incidentData)
        });
    }


    static async getIncidents(filters = {}) {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });

        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/incidents${query}`);
    }


    static async getIncident(id) {
        return this.request(`/incidents/${id}`);
    }


    static async updateIncident(id, updateData) {
        return this.request(`/incidents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }


    static async deleteIncident(id) {
        return this.request(`/incidents/${id}`, {
            method: 'DELETE'
        });
    }


    static async getMapMarkers() {
        return this.request('/incidents/map/markers');
    }
}


function showNotification(message, type = 'info') {

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.5);
        z-index: 3000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);