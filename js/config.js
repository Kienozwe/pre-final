const CONFIG = {
    API_BASE_URL: 'https://ics-dev.io/hazard/api/index.php',
    MAP_DEFAULT_CENTER: [8.3601, 124.8685],
    MAP_DEFAULT_ZOOM: 17,
    STATUS_COLORS: {
        'Pending': '#fbbf24',
        'Verified': '#3b82f6',
        'In Progress': '#6366f1',
        'Resolved': '#10b981',
        'False Report': '#ef4444'
    },
    PRIORITY_COLORS: {
        'Low': '#94a3b8',
        'Medium': '#fbbf24',
        'High': '#fb923c',
        'Critical': '#ef4444'
    },
    STORAGE_KEYS: {
        TOKEN: 'incident_token',
        USER: 'incident_user',
        IS_ADMIN: 'incident_is_admin'
    }
}