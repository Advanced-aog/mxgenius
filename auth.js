// MXGenius Frontend Auth Module
// Handles authentication state, token management, and protected routes

const Auth = {
    // State
    _user: null,
    _token: null,
    _listeners: [],
    
    // Initialize - call this on app load
    init() {
        // Try to restore session from localStorage
        const stored = localStorage.getItem('mx_auth');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this._user = data.user;
                this._token = data.token;
                
                // Check if session is still valid
                if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
                    this.logout();
                    return false;
                }
                
                // Verify with server
                this.refreshSession();
                return true;
            } catch (e) {
                this.logout();
                return false;
            }
        }
        return false;
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        return !!this._token && !!this._user;
    },
    
    // Get current user
    getUser() {
        return this._user;
    },
    
    // Get current token
    getToken() {
        return this._token;
    },
    
    // Get organization
    getOrg() {
        return this._user?.org;
    },
    
    // Check user role
    hasRole(...roles) {
        return this._user && roles.includes(this._user.role);
    },
    
    // Login
    async login(email, password, remember = false) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, remember })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        this._user = data.user;
        this._token = data.token;
        
        // Store session
        localStorage.setItem('mx_auth', JSON.stringify({
            user: data.user,
            token: data.token,
            expiresAt: data.expiresAt
        }));
        
        // Notify listeners
        this._notifyListeners();
        
        return data;
    },
    
    // Logout
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            // Ignore errors on logout
        }
        
        this._user = null;
        this._token = null;
        localStorage.removeItem('mx_auth');
        
        // Notify listeners
        this._notifyListeners();
        
        // Redirect to login
        window.location.href = '/login.html';
    },
    
    // Refresh session from server
    async refreshSession() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include',
                headers: this._getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    this._user = data.user;
                    // Update localStorage
                    const stored = localStorage.getItem('mx_auth');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        parsed.user = data.user;
                        localStorage.setItem('mx_auth', JSON.stringify(parsed));
                    }
                }
            } else {
                this.logout();
            }
        } catch (e) {
            // Silently fail - will retry on next action
        }
    },
    
    // Get auth headers for API requests
    _getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this._token) {
            headers['Authorization'] = `Bearer ${this._token}`;
        }
        return headers;
    },
    
    // Make authenticated API request
    async api(endpoint, options = {}) {
        const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
        
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...this._getAuthHeaders(),
                ...(options.headers || {})
            }
        });
        
        // Handle 401 - redirect to login
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    },
    
    // Subscribe to auth state changes
    onAuthChange(callback) {
        this._listeners.push(callback);
        // Return unsubscribe function
        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    },
    
    // Notify all listeners
    _notifyListeners() {
        this._listeners.forEach(cb => {
            try {
                cb(this.isAuthenticated(), this._user);
            } catch (e) {
                console.error('Auth listener error:', e);
            }
        });
    },
    
    // Middleware: Protect a page (redirect to login if not authenticated)
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    },
    
    // Middleware: Require specific roles
    requireRole(...roles) {
        if (!this.requireAuth()) return false;
        if (!this.hasRole(...roles)) {
            window.location.href = '/?error=unauthorized';
            return false;
        }
        return true;
    },
    
    // Create API key (admin only)
    async createApiKey(name, permissions = []) {
        return this.api('/api/auth/api-keys', {
            method: 'POST',
            body: JSON.stringify({ name, permissions })
        });
    },
    
    // List API keys (admin only)
    async listApiKeys() {
        return this.api('/api/auth/api-keys');
    },
    
    // Revoke API key (admin only)
    async revokeApiKey(id) {
        return this.api(`/api/auth/api-keys/${id}`, { method: 'DELETE' });
    },
    
    // Change password
    async changePassword(currentPassword, newPassword) {
        return this.api('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
