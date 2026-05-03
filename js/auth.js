// auth.js
class Auth {
    static isLoggedIn() {
        return !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    }
    
    static isAdmin() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.IS_ADMIN) === 'true';
    }
    
    static getCurrentUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return userData ? JSON.parse(userData) : null;
    }
    
    static saveAuth(token, user, isAdmin = false) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.IS_ADMIN, isAdmin.toString());
    }
    
    static logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.IS_ADMIN);
    }
    
    static updateUI() {
        const navAuth = document.getElementById('navAuth');
        const navUser = document.getElementById('navUser');
        const userName = document.getElementById('userName');
        const navLinks = document.getElementById('navLinks');
        
        if (this.isLoggedIn()) {
            navAuth.classList.add('hidden');
            navUser.classList.remove('hidden');
            
            const user = this.getCurrentUser();
            userName.textContent = user.username || user.email;
            
            if (this.isAdmin()) {
                let adminLink = document.querySelector('[href="#admin"]');
                if (!adminLink) {
                    adminLink = document.createElement('a');
                    adminLink.href = '#admin';
                    adminLink.className = 'nav-link';
                    adminLink.textContent = 'Admin';
                    navLinks.appendChild(adminLink);
                }
            }
        } else {
            navAuth.classList.remove('hidden');
            navUser.classList.add('hidden');
            
            const adminLink = document.querySelector('[href="#admin"]');
            if (adminLink) adminLink.remove();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Auth.updateUI();
    
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    
    loginBtn?.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
    });
    
    closeLoginModal?.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });
    
    loginModal?.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        }
    });
    
    const loginForm = document.getElementById('loginForm');
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const isAdmin = document.getElementById('loginAsAdmin').checked;
        
        try {
            let response;
            if (isAdmin) {
                response = await API.adminLogin(username, password);
                Auth.saveAuth(response.token, response.admin, true);
            } else {
                response = await API.login(username, password);
                Auth.saveAuth(response.token, response.user, false);
            }
            
            showNotification('Login successful!', 'success');
            loginModal.classList.add('hidden');
            loginForm.reset();
            Auth.updateUI();
            
            if (window.loadCurrentSection) {
                window.loadCurrentSection();
            }
        } catch (error) {
            showNotification(error.message || 'Login failed', 'error');
        }
    });
    
    const registerBtn = document.getElementById('registerBtn');
    const registerModal = document.getElementById('registerModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    
    registerBtn?.addEventListener('click', () => {
        registerModal.classList.remove('hidden');
    });
    
    closeRegisterModal?.addEventListener('click', () => {
        registerModal.classList.add('hidden');
    });
    
    registerModal?.addEventListener('click', (e) => {
        if (e.target === registerModal) {
            registerModal.classList.add('hidden');
        }
    });
    
    const registerForm = document.getElementById('registerForm');
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await API.register(username, email, password);
            Auth.saveAuth(response.token, response.user, false);
            
            showNotification('Registration successful!', 'success');
            registerModal.classList.add('hidden');
            registerForm.reset();
            Auth.updateUI();
        } catch (error) {
            showNotification(error.message || 'Registration failed', 'error');
        }
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', () => {
        Auth.logout();
        showNotification('Logged out successfully', 'info');
        Auth.updateUI();
        
        window.location.hash = '#home';
        if (window.loadCurrentSection) {
            window.loadCurrentSection();
        }
    });
});
