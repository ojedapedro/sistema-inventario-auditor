// Módulo de autenticación de usuarios

const Auth = {
    currentUser: null,
    users: [],
    authStateChangeCallback: null,

    init: function() {
        this.loadUsers();
        this.setupEventListeners();
        this.showLoginModal();
    },

    loadUsers: function() {
        const savedUsers = localStorage.getItem('inventoryUsers');
        if (savedUsers) {
            this.users = JSON.parse(savedUsers);
        } else {
            this.users = [
                {
                    id: 1,
                    email: 'auditor@empresa.com',
                    password: '123456',
                    name: 'Auditor Principal',
                    role: 'auditor',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    email: 'admin@empresa.com',
                    password: 'admin123',
                    name: 'Administrador',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                },
                {   id: 3,
                    email: 'analistadedatosnova@gmail.com',
                    password: 'Gene.2302',
                    name: 'Pedro Ojeda',
                    role: 'usuario',
                    createdAt: new Date().toISOString()
                },
            ];
            this.saveUsers();
        }
    },

    saveUsers: function() {
        localStorage.setItem('inventoryUsers', JSON.stringify(this.users));
    },

    setupEventListeners: function() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
    },

    showLoginModal: function() {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'), {
            backdrop: 'static',
            keyboard: false
        });
        loginModal.show();
        
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').classList.add('d-none');
    },

    hideLoginModal: function() {
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
    },

    handleLogin: function() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');

        if (!this.validateEmail(email)) {
            errorElement.textContent = 'Por favor, ingrese un email válido.';
            errorElement.classList.remove('d-none');
            return;
        }

        const user = this.authenticate(email, password);
        
        if (user) {
            this.currentUser = user;
            this.hideLoginModal();
            this.updateUI();
            this.showMainContent();
            this.logAccess('login');
            
            if (this.authStateChangeCallback) {
                this.authStateChangeCallback(user);
            }
        } else {
            errorElement.textContent = 'Credenciales incorrectas. Intente nuevamente.';
            errorElement.classList.remove('d-none');
        }
    },

    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    authenticate: function(email, password) {
        return this.users.find(user => 
            user.email.toLowerCase() === email.toLowerCase() && 
            user.password === password
        );
    },

    handleLogout: function() {
        this.logAccess('logout');
        this.currentUser = null;
        this.showLoginModal();
        this.hideMainContent();
        
        if (this.authStateChangeCallback) {
            this.authStateChangeCallback(null);
        }
    },

    updateUI: function() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
        }
    },

    showMainContent: function() {
        document.getElementById('mainContent').style.display = 'block';
    },

    hideMainContent: function() {
        document.getElementById('mainContent').style.display = 'none';
    },

    logAccess: function(action) {
        const accessLog = {
            userId: this.currentUser?.id,
            email: this.currentUser?.email,
            action: action,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        let logs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
        logs.push(accessLog);
        
        if (logs.length > 100) {
            logs = logs.slice(-100);
        }
        
        localStorage.setItem('accessLogs', JSON.stringify(logs));
    },

    registerUser: function(userData) {
        if (this.users.find(u => u.email === userData.email)) {
            throw new Error('El usuario ya existe');
        }

        const newUser = {
            id: Date.now(),
            ...userData,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        return newUser;
    },

    changePassword: function(userId, newPassword) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.password = newPassword;
            user.updatedAt = new Date().toISOString();
            this.saveUsers();
            return true;
        }
        return false;
    },

    getCurrentUser: function() {
        return this.currentUser;
    },

    isAuthenticated: function() {
        return this.currentUser !== null;
    },

    onAuthStateChange: function(callback) {
        this.authStateChangeCallback = callback;
    },

    // Método para obtener logs de acceso (útil para administradores)
    getAccessLogs: function() {
        return JSON.parse(localStorage.getItem('accessLogs') || '[]');
    },

    // Método para limpiar logs antiguos
    cleanupOldLogs: function(days = 30) {
        const logs = this.getAccessLogs();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const filteredLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);
        localStorage.setItem('accessLogs', JSON.stringify(filteredLogs));
        
        return filteredLogs.length;
    }
};
