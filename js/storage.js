/**
 * Storage Module - PS-CRM
 * Combines localStorage fallback and API mode for backend MySQL.
 */

class StorageManager {
    constructor() {
        this.complaintsKey = 'ps_crm_complaints';
        this.departmentsKey = 'ps_crm_departments';
        this.usersKey = 'ps_crm_users';
        this.escalationsKey = 'ps_crm_escalations';

        this.apiBase = this.resolveApiBase();
        this.apiMode = true; // backend-first mode now works with the upgraded API
        this.jwtToken = null;

        this.initializeData();
    }

    resolveApiBase() {
        const configuredApiBase = window.PSCRM_CONFIG?.apiBase || window.PSCRM_API_BASE;
        if (configuredApiBase) {
            return configuredApiBase.replace(/\/$/, '');
        }

        const protocol = window.location?.protocol || '';
        const hostname = window.location?.hostname || '';
        const origin = window.location?.origin || '';

        if (protocol === 'file:') {
            return 'http://localhost:5000/api';
        }

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5000/api';
        }

        return `${origin}/api`;
    }

    setApiMode(enabled) {
        this.apiMode = enabled;
    }

    getCurrentLanguage() {
        return localStorage.getItem('ps_crm_language') || 'en';
    }

    setCurrentLanguage(language) {
        localStorage.setItem('ps_crm_language', language);
    }

    setToken(token) {
        this.jwtToken = token;
        if (token) localStorage.setItem('ps_crm_jwt_token', token);
        else localStorage.removeItem('ps_crm_jwt_token');
    }

    loadToken() {
        const token = localStorage.getItem('ps_crm_jwt_token');
        if (token) this.jwtToken = token;
        return this.jwtToken;
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.apiBase}${endpoint}`;
        const headers = { 'Content-Type': 'application/json' };
        this.loadToken();
        if (this.jwtToken) headers.Authorization = `Bearer ${this.jwtToken}`;

        let response;
        try {
            response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });
        } catch (error) {
            throw new Error('Backend server is not running. Start server/server.js and try again.');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `API request failed (${response.status})`);
        }

        return response.status === 204 ? null : response.json();
    }

    async uploadFileAsync(file) {
        if (!this.apiMode) {
            throw new Error('File uploads require backend mode.');
        }

        this.loadToken();
        if (!this.jwtToken) {
            throw new Error('Please log in before uploading files.');
        }

        const formData = new FormData();
        formData.append('file', file);

        let response;
        try {
            response = await fetch(`${this.apiBase}/uploads`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.jwtToken}`
                },
                body: formData
            });
        } catch (error) {
            throw new Error('Backend server is not running. Start server/server.js and try again.');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Upload failed (${response.status})`);
        }

        return response.json();
    }

    initializeData() {
        if (!localStorage.getItem(this.complaintsKey)) {
            localStorage.setItem(this.complaintsKey, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.departmentsKey)) {
            const defaultDepartments = this.getDefaultDepartments();
            localStorage.setItem(this.departmentsKey, JSON.stringify(defaultDepartments));
        }
        if (!localStorage.getItem(this.usersKey)) {
            const defaultUsers = this.getDefaultUsers();
            localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
        }
        if (!localStorage.getItem(this.escalationsKey)) {
            localStorage.setItem(this.escalationsKey, JSON.stringify([]));
        }
        this.loadToken();
    }

    getDefaultSla(priority) {
        const rules = {
            Critical: { firstResponseHours: 4, resolutionHours: 24 },
            High: { firstResponseHours: 8, resolutionHours: 48 },
            Medium: { firstResponseHours: 12, resolutionHours: 72 },
            Low: { firstResponseHours: 24, resolutionHours: 120 }
        };
        return rules[priority] || rules.Low;
    }

    createSla(priority, createdAt = new Date().toISOString(), overrides = {}) {
        const base = this.getDefaultSla(priority);
        const created = new Date(createdAt);
        return {
            firstResponseHours: base.firstResponseHours,
            resolutionHours: base.resolutionHours,
            responseDeadline: overrides.responseDeadline || new Date(created.getTime() + base.firstResponseHours * 60 * 60 * 1000).toISOString(),
            resolutionDeadline: overrides.resolutionDeadline || new Date(created.getTime() + base.resolutionHours * 60 * 60 * 1000).toISOString(),
            breached: Boolean(overrides.breached),
            lastEscalatedAt: overrides.lastEscalatedAt || null
        };
    }

    createVerification(overrides = {}) {
        return {
            status: overrides.status || 'pending',
            decision: overrides.decision || null,
            remarks: overrides.remarks || '',
            verifiedAt: overrides.verifiedAt || null,
            verifiedBy: overrides.verifiedBy || null
        };
    }

    classifyComplaint(category, description = '') {
        const text = `${category} ${description}`.toLowerCase();
        const classifiers = [
            { category: 'Electricity', priority: 'Critical', keywords: ['electric', 'power', 'street light', 'transformer'] },
            { category: 'Water', priority: 'High', keywords: ['water', 'leak', 'pipe', 'sewage'] },
            { category: 'Road', priority: 'High', keywords: ['road', 'pothole', 'traffic', 'accident'] },
            { category: 'Sanitation', priority: 'Medium', keywords: ['garbage', 'sanitation', 'waste', 'drain'] },
            { category: 'Noise', priority: 'Medium', keywords: ['noise', 'loud', 'speaker'] },
            { category: 'Parks', priority: 'Low', keywords: ['park', 'tree', 'playground'] }
        ];

        for (const classifier of classifiers) {
            if (classifier.keywords.some(keyword => text.includes(keyword))) {
                return {
                    aiCategory: classifier.category,
                    aiPriority: classifier.priority
                };
            }
        }

        return {
            aiCategory: category || 'Other',
            aiPriority: null
        };
    }

    getDefaultDepartments() {
        return [
            { id: 'dept_road', name: 'Roads & Infrastructure', categories: ['Road', 'Traffic'], head: 'Mr. Sharma' },
            { id: 'dept_water', name: 'Water Supply', categories: ['Water'], head: 'Mrs. Patel' },
            { id: 'dept_electric', name: 'Electricity', categories: ['Electricity'], head: 'Mr. Kumar' },
            { id: 'dept_sanitation', name: 'Sanitation', categories: ['Sanitation', 'Garbage'], head: 'Ms. Singh' },
            { id: 'dept_parks', name: 'Parks & Recreation', categories: ['Parks'], head: 'Mr. Gupta' },
            { id: 'dept_noise', name: 'Noise Control', categories: ['Noise'], head: 'Mrs. Reddy' },
            { id: 'dept_admin', name: 'General Administration', categories: ['Other'], head: 'Admin Head' }
        ];
    }

    getDefaultUsers() {
        return [
            { id: 'admin', username: 'admin', password: 'admin123', role: 'admin', name: 'System Administrator' },
            { id: 'dept_road', username: 'roads', password: 'road123', role: 'department', department: 'dept_road', name: 'Road Department Officer' },
            { id: 'dept_water', username: 'water', password: 'water123', role: 'department', department: 'dept_water', name: 'Water Department Officer' },
            { id: 'dept_electric', username: 'electric', password: 'electric123', role: 'department', department: 'dept_electric', name: 'Electricity Department Officer' },
            { id: 'dept_sanitation', username: 'sanitation', password: 'sanitation123', role: 'department', department: 'dept_sanitation', name: 'Sanitation Department Officer' }
        ];
    }

    generateComplaintId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `PSR-${timestamp.toString(36).toUpperCase()}-${random.toString().padStart(3, '0')}`;
    }

    async getAllComplaintsAsync() {
        if (this.apiMode) {
            if (this.jwtToken || this.loadToken()) {
                return await this.apiRequest('/complaints', 'GET');
            }
            return await this.apiRequest('/public/complaints', 'GET');
        }
        return this.getAllComplaints();
    }

    async getBlockchainLogAsync() {
        if (this.apiMode) {
            return await this.apiRequest('/blockchain', 'GET');
        }
        return this.getLocalBlockchainLog();
    }

    async getPublicAuditTrailAsync(complaintId) {
        if (this.apiMode) {
            return await this.apiRequest(`/public/audit/${complaintId}`, 'GET');
        }
        return this.getLocalBlockchainLog().filter(block => block.complaintId === complaintId);
    }

    async addBlockchainEntryAsync(block) {
        if (this.apiMode) {
            return await this.apiRequest('/blockchain', 'POST', block);
        }
        return this.addLocalBlockchainEntry(block);
    }

    getLocalBlockchainLog() {
        return JSON.parse(localStorage.getItem('ps_crm_blockchain') || '[]');
    }

    addLocalBlockchainEntry(block) {
        const chain = this.getLocalBlockchainLog();
        chain.push(block);
        localStorage.setItem('ps_crm_blockchain', JSON.stringify(chain));
        return block;
    }

    getAllComplaints() {
        return JSON.parse(localStorage.getItem(this.complaintsKey) || '[]');
    }

    getComplaintById(complaintId) {
        const complaints = this.getAllComplaints();
        return complaints.find(c => c.complaintId === complaintId);
    }

    async getComplaintByIdAsync(complaintId) {
        if (this.apiMode) {
            if (this.jwtToken || this.loadToken()) {
                return await this.apiRequest(`/complaints/${complaintId}`, 'GET');
            }
            return await this.apiRequest(`/public/complaints/${complaintId}`, 'GET');
        }
        return this.getComplaintById(complaintId);
    }

    getDepartmentById(departmentId) {
        const departments = this.getAllDepartments();
        return departments.find(d => d.id === departmentId);
    }

    async getDepartmentByIdAsync(departmentId) {
        if (this.apiMode) {
            const hasToken = this.jwtToken || this.loadToken();
            if (!hasToken) {
                return this.getDepartmentById(departmentId);
            }
            const depts = await this.getAllDepartmentsAsync();
            return depts.find(d => d.id === departmentId);
        }
        return this.getDepartmentById(departmentId);
    }

    async saveComplaintAsync(complaint) {
        if (this.apiMode) {
            return await this.apiRequest('/complaints', 'POST', complaint);
        }
        return this.saveComplaint(complaint);
    }

    saveComplaint(complaint) {
        const complaints = this.getAllComplaints();
        const createdAt = new Date().toISOString();
        const ai = this.classifyComplaint(complaint.category, complaint.description);
        complaint.id = Date.now();
        complaint.createdAt = createdAt;
        complaint.updatedAt = createdAt;
        complaint.title = complaint.title || complaint.category;
        complaint.aiCategory = ai.aiCategory || complaint.category;
        complaint.aiPriority = ai.aiPriority || complaint.priority;
        complaint.status = complaint.status || 'Assigned';
        complaint.supportCount = complaint.supportCount || 0;
        complaint.supportedBy = complaint.supportedBy || [];
        complaint.proofs = complaint.proofs || (complaint.evidence ? [{
            id: `proof-${Date.now()}`,
            type: 'citizen_evidence',
            url: complaint.evidence,
            mimeType: 'image/jpeg',
            uploadedAt: createdAt,
            uploadedBy: { id: complaint.submittedBy || 'citizen', name: complaint.fullName, role: 'citizen' }
        }] : []);
        complaint.verification = complaint.verification || this.createVerification();
        complaint.timeline = complaint.timeline || [
            {
                action: 'Complaint Submitted',
                status: 'Submitted',
                timestamp: createdAt,
                description: 'Complaint has been submitted and registered in the system',
                actor: { id: complaint.submittedBy || 'citizen', name: complaint.fullName, role: 'citizen' }
            },
            {
                action: 'AI Classification',
                status: 'Assigned',
                timestamp: createdAt,
                description: `Complaint categorized as ${complaint.aiCategory} with ${complaint.priority} priority and routed automatically.`,
                actor: { id: 'system', name: 'PS-CRM AI Router', role: 'system' }
            }
        ];
        complaint.responseCount = complaint.responseCount || 0;
        complaint.escalationCount = complaint.escalationCount || 0;
        complaint.delayCount = complaint.delayCount || 0;
        complaint.response = complaint.response || '';
        complaint.closedAt = complaint.closedAt || null;
        complaint.sla = complaint.sla || this.createSla(complaint.priority, createdAt);

        complaints.push(complaint);
        localStorage.setItem(this.complaintsKey, JSON.stringify(complaints));
        return complaint;
    }

    async updateComplaintAsync(complaintId, updates) {
        if (this.apiMode) {
            return await this.apiRequest(`/complaints/${complaintId}/status`, 'PATCH', updates);
        }
        return this.updateComplaint(complaintId, updates);
    }

    updateComplaint(complaintId, updates) {
        const complaints = this.getAllComplaints();
        const index = complaints.findIndex(c => c.complaintId === complaintId);

        if (index !== -1) {
            complaints[index] = {
                ...complaints[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(this.complaintsKey, JSON.stringify(complaints));
            return complaints[index];
        }
        return null;
    }

    async getComplaintsByDepartmentAsync(departmentId) {
        const complaints = await this.getAllComplaintsAsync();
        return complaints.filter(c => c.assignedDepartment === departmentId);
    }

    async getAllDepartmentsAsync() {
        if (this.apiMode) {
            const hasToken = this.jwtToken || this.loadToken();
            if (!hasToken) {
                return this.getAllDepartments();
            }
            return await this.apiRequest('/departments', 'GET');
        }
        return this.getAllDepartments();
    }

    getAllDepartments() {
        return JSON.parse(localStorage.getItem(this.departmentsKey) || '[]');
    }

    async authenticateUserAsync(username, password) {
        if (this.apiMode) {
            const result = await this.apiRequest('/auth/login', 'POST', { username, password });
            this.setToken(result.token);
            return result.user;
        }
        return this.authenticateUser(username, password);
    }

    authenticateUser(username, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.username === username && u.password === password);
        return user || null;
    }

    async registerUserAsync(user) {
        if (this.apiMode) {
            const result = await this.apiRequest('/auth/signup', 'POST', user);
            this.setToken(result.token);
            return result.user;
        }
        return this.registerUser(user);
    }

    async verifyComplaintAsync(complaintId, decision, remarks) {
        if (this.apiMode) {
            return await this.apiRequest(`/complaints/${complaintId}/verify`, 'POST', { decision, remarks });
        }
        return this.verifyComplaint(complaintId, decision, remarks);
    }

    async escalateComplaintAsync(complaintId, reason) {
        if (this.apiMode) {
            return await this.apiRequest(`/admin/complaints/${complaintId}/escalate`, 'POST', { reason });
        }
        return this.escalateComplaintRecord(complaintId, reason);
    }

    async supportComplaintAsync(complaintId) {
        if (this.apiMode) {
            return await this.apiRequest(`/complaints/${complaintId}/support`, 'POST', {});
        }
        return this.supportComplaint(complaintId, `support-${Date.now()}`);
    }

    async getPublicStatsAsync() {
        if (this.apiMode) {
            return await this.apiRequest('/public/stats', 'GET');
        }
        return this.getStatistics();
    }

    async getPublicComplaintsAsync() {
        if (this.apiMode) {
            return await this.apiRequest('/public/complaints', 'GET');
        }
        return this.getAllComplaints();
    }

    async getStatisticsAsync() {
        if (this.apiMode) {
            const hasToken = this.jwtToken || this.loadToken();
            if (hasToken) {
                const complaints = await this.getAllComplaintsAsync();
                return this.buildStatisticsFromComplaints(complaints);
            }
            return await this.getPublicStatsAsync();
        }
        return this.getStatistics();
    }

    registerUser(user) {
        const users = this.getAllUsers();
        const newUser = {
            id: `citizen_${Date.now()}`,
            role: 'citizen',
            preferredLanguage: user.preferredLanguage || 'en',
            ...user
        };
        users.push(newUser);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        return newUser;
    }

    getAllUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey) || '[]');
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('ps_crm_current_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    setCurrentUser(user) {
        localStorage.setItem('ps_crm_current_user', JSON.stringify(user));
    }

    logoutUser() {
        localStorage.removeItem('ps_crm_current_user');
        this.setToken(null);
    }

    addTimelineEntry(complaintId, action, description, status = null, actor = null) {
        const complaint = this.getComplaintById(complaintId);
        if (!complaint) return null;

        const timeline = complaint.timeline || [];
        timeline.push({
            action,
            description,
            status: status || complaint.status,
            timestamp: new Date().toISOString(),
            actor: actor || this.getCurrentUser() || { id: 'system', name: 'System', role: 'system' }
        });

        return this.updateComplaint(complaintId, { timeline });
    }

    supportComplaint(complaintId, supporterName) {
        const complaint = this.getComplaintById(complaintId);
        if (!complaint) return null;

        const supportedBy = complaint.supportedBy || [];
        if (!supportedBy.includes(supporterName)) {
            supportedBy.push(supporterName);
        }

        return this.updateComplaint(complaintId, {
            supportCount: supportedBy.length,
            supportedBy
        });
    }

    findSimilarComplaints(category, location, radiusMeters = 1000) {
        const complaints = this.getAllComplaints();
        return complaints.filter(complaint => {
            if (complaint.category !== category) return false;
            if (!complaint.location || !location) return false;
            const distance = this.calculateDistance(
                Number(complaint.location.lat) || 0,
                Number(complaint.location.lng) || 0,
                Number(location.lat) || 0,
                Number(location.lng) || 0
            );
            return distance <= radiusMeters && complaint.status !== 'Closed';
        });
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const toRadians = degrees => (degrees * Math.PI) / 180;
        const earthRadius = 6371000;
        const dLat = toRadians(lat2 - lat1);
        const dLng = toRadians(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    canTransitionStatus(currentStatus, nextStatus) {
        const transitions = {
            Submitted: ['Assigned', 'Escalated'],
            Assigned: ['In Progress', 'Escalated'],
            'In Progress': ['Awaiting Citizen Verification', 'Escalated'],
            'Awaiting Citizen Verification': ['Closed', 'Reopened', 'Escalated'],
            Reopened: ['In Progress', 'Escalated'],
            Escalated: ['In Progress', 'Awaiting Citizen Verification', 'Closed'],
            Closed: []
        };

        return currentStatus === nextStatus || (transitions[currentStatus] || []).includes(nextStatus);
    }

    updateComplaintWorkflow(complaintId, updates = {}, actor = null) {
        const complaint = this.getComplaintById(complaintId);
        if (!complaint) throw new Error('Complaint not found');

        const nextStatus = updates.status || complaint.status;
        if (!this.canTransitionStatus(complaint.status, nextStatus)) {
            throw new Error(`Cannot move complaint from ${complaint.status} to ${nextStatus}`);
        }

        const proofs = [...(complaint.proofs || [])];
        if (updates.proof && updates.proof.url) {
            proofs.push({
                id: updates.proof.id || `proof-${Date.now()}`,
                type: updates.proof.type || 'resolution',
                url: updates.proof.url,
                mimeType: updates.proof.mimeType || 'image/jpeg',
                uploadedAt: new Date().toISOString(),
                uploadedBy: actor || this.getCurrentUser()
            });
        }

        if (nextStatus === 'Awaiting Citizen Verification' && proofs.length === 0) {
            throw new Error('Proof is required before requesting citizen verification');
        }

        const responseText = updates.response !== undefined ? updates.response : complaint.response;
        const resolutionDeadline = updates.estimatedDays
            ? new Date(Date.now() + Number(updates.estimatedDays) * 24 * 60 * 60 * 1000).toISOString()
            : complaint.sla?.resolutionDeadline;

        const merged = this.updateComplaint(complaintId, {
            ...updates,
            status: nextStatus,
            response: responseText,
            responseCount: (complaint.responseCount || 0) + (updates.response ? 1 : 0),
            proofs,
            sla: {
                ...(complaint.sla || this.createSla(complaint.priority, complaint.createdAt)),
                resolutionDeadline
            }
        });

        this.addTimelineEntry(
            complaintId,
            updates.timelineAction || 'Workflow Updated',
            updates.timelineDescription || `Complaint status updated to ${nextStatus}.`,
            nextStatus,
            actor
        );

        return this.getComplaintById(complaintId);
    }

    verifyComplaint(complaintId, decision, remarks, actor = null) {
        const complaint = this.getComplaintById(complaintId);
        if (!complaint) throw new Error('Complaint not found');
        if (!['accepted', 'rejected'].includes(decision)) throw new Error('Invalid verification decision');
        if (!['Awaiting Citizen Verification', 'Escalated'].includes(complaint.status)) {
            throw new Error('Complaint is not awaiting verification');
        }

        const nextStatus = decision === 'accepted' ? 'Closed' : 'Reopened';
        const verification = this.createVerification({
            status: decision,
            decision,
            remarks,
            verifiedAt: new Date().toISOString(),
            verifiedBy: actor || this.getCurrentUser()
        });

        this.updateComplaint(complaintId, {
            status: nextStatus,
            verification,
            closedAt: nextStatus === 'Closed' ? new Date().toISOString() : null
        });
        this.addTimelineEntry(
            complaintId,
            decision === 'accepted' ? 'Resolution Accepted' : 'Resolution Rejected',
            remarks || (decision === 'accepted' ? 'Citizen accepted the resolution.' : 'Citizen rejected the resolution and reopened the complaint.'),
            nextStatus,
            actor
        );

        return this.getComplaintById(complaintId);
    }

    escalateComplaintRecord(complaintId, reason = 'Complaint escalated to senior authority', actor = null) {
        const complaint = this.getComplaintById(complaintId);
        if (!complaint) throw new Error('Complaint not found');

        this.updateComplaint(complaintId, {
            status: 'Escalated',
            escalationCount: (complaint.escalationCount || 0) + 1,
            delayCount: (complaint.delayCount || 0) + 1,
            sla: {
                ...(complaint.sla || this.createSla(complaint.priority, complaint.createdAt)),
                breached: true,
                lastEscalatedAt: new Date().toISOString()
            }
        });
        this.addTimelineEntry(complaintId, 'Complaint Escalated', reason, 'Escalated', actor);
        return this.getComplaintById(complaintId);
    }

    getStatistics() {
        const complaints = this.getAllComplaints();
        return this.buildStatisticsFromComplaints(complaints);
    }

    buildStatisticsFromComplaints(complaints) {
        const departments = this.getAllDepartments();
        const departmentMap = new Map(departments.map(dept => [dept.id, dept]));
        const stats = {
            total: complaints.length,
            pending: 0,
            resolved: 0,
            delayed: 0,
            critical: 0,
            verified: 0,
            workStarted: 0,
            assigned: 0,
            awaitingVerification: 0,
            reopened: 0,
            closed: 0,
            byCategory: {},
            byDepartment: {},
            priority: {}
        };

        complaints.forEach(complaint => {
            stats.byCategory[complaint.category] = (stats.byCategory[complaint.category] || 0) + 1;
            stats.priority[complaint.priority] = (stats.priority[complaint.priority] || 0) + 1;
            if (complaint.priority === 'Critical') stats.critical += 1;

            const deptId = complaint.assignedDepartment || 'unassigned';
            if (!stats.byDepartment[deptId]) {
                stats.byDepartment[deptId] = {
                    id: deptId,
                    name: departmentMap.get(deptId)?.name || deptId,
                    total: 0,
                    resolved: 0,
                    pending: 0,
                    delayed: 0
                };
            }
            stats.byDepartment[deptId].total += 1;

            switch (complaint.status) {
                case 'Assigned':
                    stats.pending += 1;
                    stats.assigned += 1;
                    stats.byDepartment[deptId].pending += 1;
                    break;
                case 'In Progress':
                    stats.workStarted += 1;
                    stats.byDepartment[deptId].pending += 1;
                    break;
                case 'Awaiting Citizen Verification':
                    stats.awaitingVerification += 1;
                    stats.resolved += 1;
                    break;
                case 'Escalated':
                    stats.delayed += 1;
                    stats.byDepartment[deptId].delayed += 1;
                    break;
                case 'Reopened':
                    stats.reopened += 1;
                    stats.pending += 1;
                    stats.byDepartment[deptId].pending += 1;
                    break;
                case 'Closed':
                    stats.closed += 1;
                    stats.resolved += 1;
                    stats.byDepartment[deptId].resolved += 1;
                    break;
                default:
                    break;
            }
        });

        return stats;
    }

    // Notification methods
    async sendComplaintSubmittedNotification(complaintId, departmentId) {
        if (this.apiMode) {
            try {
                await this.apiRequest('/notify/complaint-submitted', 'POST', { complaintId, departmentId });
            } catch (err) {
                console.warn('Failed to send complaint notification:', err);
            }
        }
    }

    async sendStatusChangedNotification(complaintId, newStatus, userEmail) {
        if (this.apiMode) {
            try {
                await this.apiRequest('/notify/status-changed', 'POST', { complaintId, newStatus, userEmail });
            } catch (err) {
                console.warn('Failed to send status notification:', err);
            }
        }
    }

    async sendEscalationNotification(complaintId, reason, adminEmail) {
        if (this.apiMode) {
            try {
                await this.apiRequest('/notify/escalation', 'POST', { complaintId, reason, adminEmail });
            } catch (err) {
                console.warn('Failed to send escalation notification:', err);
            }
        }
    }

    async sendDeadlineWarningNotification(complaintId, daysLeft, departmentEmail) {
        if (this.apiMode) {
            try {
                await this.apiRequest('/notify/deadline-warning', 'POST', { complaintId, daysLeft, departmentEmail });
            } catch (err) {
                console.warn('Failed to send deadline warning:', err);
            }
        }
    }

    async sendDepartmentResponseNotification(complaintId, response, userEmail) {
        if (this.apiMode) {
            try {
                await this.apiRequest('/notify/department-response', 'POST', { complaintId, response, userEmail });
            } catch (err) {
                console.warn('Failed to send response notification:', err);
            }
        }
    }
}

window.StorageManager = StorageManager;
