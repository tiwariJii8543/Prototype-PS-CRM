/**
 * Storage Module - PS-CRM
 * Handles localStorage operations for complaint data persistence
 */

// Storage Manager Class
class StorageManager {
    constructor() {
        this.complaintsKey = 'ps_crm_complaints';
        this.departmentsKey = 'ps_crm_departments';
        this.usersKey = 'ps_crm_users';
        this.escalationsKey = 'ps_crm_escalations';
        this.initializeData();
    }

    // Initialize default data
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
    }

    // Default departments
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

    // Default users
    getDefaultUsers() {
        return [
            { id: 'admin', username: 'admin', password: 'admin123', role: 'admin', name: 'System Administrator' },
            { id: 'dept_road', username: 'roads', password: 'road123', role: 'department', department: 'dept_road', name: 'Road Department Officer' },
            { id: 'dept_water', username: 'water', password: 'water123', role: 'department', department: 'dept_water', name: 'Water Department Officer' },
            { id: 'dept_electric', username: 'electric', password: 'electric123', role: 'department', department: 'dept_electric', name: 'Electricity Department Officer' },
            { id: 'dept_sanitation', username: 'sanitation', password: 'sanitation123', role: 'department', department: 'dept_sanitation', name: 'Sanitation Department Officer' }
        ];
    }

    // Complaint ID Generator
    generateComplaintId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `PSR-${timestamp.toString(36).toUpperCase()}-${random.toString().padStart(3, '0')}`;
    }

    // Get all complaints
    getAllComplaints() {
        return JSON.parse(localStorage.getItem(this.complaintsKey) || '[]');
    }

    // Get complaint by ID
    getComplaintById(complaintId) {
        const complaints = this.getAllComplaints();
        return complaints.find(c => c.complaintId === complaintId);
    }

    // Get complaints by department
    getComplaintsByDepartment(departmentId) {
        const complaints = this.getAllComplaints();
        return complaints.filter(c => c.assignedDepartment === departmentId);
    }

    // Get complaints by category
    getComplaintsByCategory(category) {
        const complaints = this.getAllComplaints();
        return complaints.filter(c => c.category === category);
    }

    // Get complaints by status
    getComplaintsByStatus(status) {
        const complaints = this.getAllComplaints();
        return complaints.filter(c => c.status === status);
    }

    // Get complaints by priority
    getComplaintsByPriority(priority) {
        const complaints = this.getAllComplaints();
        return complaints.filter(c => c.priority === priority);
    }

    // Save new complaint
    saveComplaint(complaint) {
        const complaints = this.getAllComplaints();
        complaint.id = Date.now();
        complaint.createdAt = new Date().toISOString();
        complaint.updatedAt = new Date().toISOString();
        complaint.supportCount = 0;
        complaint.supportedBy = [];
        complaint.timeline = [
            {
                action: 'Complaint Submitted',
                timestamp: complaint.createdAt,
                description: 'Complaint has been submitted and registered in the system'
            }
        ];
        complaint.responseCount = 0;
        complaint.escalationCount = 0;
        complaint.delayCount = 0;
        
        complaints.push(complaint);
        localStorage.setItem(this.complaintsKey, JSON.stringify(complaints));
        
        return complaint;
    }

    // Update complaint
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

    // Add timeline entry
    addTimelineEntry(complaintId, action, description) {
        const complaint = this.getComplaintById(complaintId);
        if (complaint) {
            const entry = {
                action: action,
                timestamp: new Date().toISOString(),
                description: description
            };
            complaint.timeline.push(entry);
            complaint.updatedAt = new Date().toISOString();
            
            const complaints = this.getAllComplaints();
            const index = complaints.findIndex(c => c.complaintId === complaintId);
            complaints[index] = complaint;
            localStorage.setItem(this.complaintsKey, JSON.stringify(complaints));
            
            return complaint;
        }
        return null;
    }

    // Support complaint
    supportComplaint(complaintId, supporterName) {
        const complaint = this.getComplaintById(complaintId);
        if (complaint) {
            if (!complaint.supportedBy) {
                complaint.supportedBy = [];
            }
            if (!complaint.supportedBy.includes(supporterName)) {
                complaint.supportedBy.push(supporterName);
                complaint.supportCount = complaint.supportedBy.length;
                
                const complaints = this.getAllComplaints();
                const index = complaints.findIndex(c => c.complaintId === complaintId);
                complaints[index] = complaint;
                localStorage.setItem(this.complaintsKey, JSON.stringify(complaints));
                
                return complaint;
            }
        }
        return null;
    }

    // Get all departments
    getAllDepartments() {
        return JSON.parse(localStorage.getItem(this.departmentsKey) || '[]');
    }

    // Get department by ID
    getDepartmentById(departmentId) {
        const departments = this.getAllDepartments();
        return departments.find(d => d.id === departmentId);
    }

    // Get all users
    getAllUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey) || '[]');
    }

    // Authenticate user
    authenticateUser(username, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.username === username && u.password === password);
        return user || null;
    }

    // Get current user
    getCurrentUser() {
        const userStr = localStorage.getItem('ps_crm_current_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Set current user
    setCurrentUser(user) {
        localStorage.setItem('ps_crm_current_user', JSON.stringify(user));
    }

    // Logout user
    logoutUser() {
        localStorage.removeItem('ps_crm_current_user');
    }

    // Get statistics
    getStatistics() {
        const complaints = this.getAllComplaints();
        return {
            total: complaints.length,
            pending: complaints.filter(c => c.status === 'Pending').length,
            verified: complaints.filter(c => c.status === 'Verified').length,
            workStarted: complaints.filter(c => c.status === 'Work Started').length,
            resolved: complaints.filter(c => c.status === 'Resolved').length,
            delayed: complaints.filter(c => c.status === 'Delayed').length,
            critical: complaints.filter(c => c.priority === 'Critical').length,
            high: complaints.filter(c => c.priority === 'High').length,
            medium: complaints.filter(c => c.priority === 'Medium').length,
            low: complaints.filter(c => c.priority === 'Low').length,
            byCategory: this.getCategoryStats(complaints),
            byDepartment: this.getDepartmentStats(complaints),
            byPriority: this.getPriorityStats(complaints)
        };
    }

    // Get category statistics
    getCategoryStats(complaints) {
        const stats = {};
        complaints.forEach(c => {
            stats[c.category] = (stats[c.category] || 0) + 1;
        });
        return stats;
    }

    // Get department statistics
    getDepartmentStats(complaints) {
        const departments = this.getAllDepartments();
        const stats = {};
        departments.forEach(d => {
            const deptComplaints = complaints.filter(c => c.assignedDepartment === d.id);
            stats[d.id] = {
                name: d.name,
                total: deptComplaints.length,
                resolved: deptComplaints.filter(c => c.status === 'Resolved').length,
                delayed: deptComplaints.filter(c => c.status === 'Delayed').length,
                pending: deptComplaints.filter(c => c.status === 'Pending').length
            };
        });
        return stats;
    }

    // Get priority statistics
    getPriorityStats(complaints) {
        return {
            Critical: complaints.filter(c => c.priority === 'Critical').length,
            High: complaints.filter(c => c.priority === 'High').length,
            Medium: complaints.filter(c => c.priority === 'Medium').length,
            Low: complaints.filter(c => c.priority === 'Low').length
        };
    }

    // Find similar complaints (for duplicate detection)
    findSimilarComplaints(category, location, radius = 500) {
        const complaints = this.getAllComplaints();
        return complaints.filter(c => {
            // Same category
            if (c.category !== category) return false;
            
            // If location provided, check proximity
            if (location && c.location) {
                const distance = this.calculateDistance(
                    location.lat, location.lng,
                    c.location.lat, c.location.lng
                );
                return distance <= radius;
            }
            
            return false;
        });
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000; // Distance in meters
    }

    toRad(deg) {
        return deg * (Math.PI/180);
    }

    // Get escalated complaints
    getEscalatedComplaints() {
        return this.getAllComplaints().filter(c => c.status === 'Delayed' || c.escalationCount > 0);
    }

    // Clear all data (for testing)
    clearAllData() {
        localStorage.removeItem(this.complaintsKey);
        localStorage.removeItem(this.escalationsKey);
        this.initializeData();
    }
}

// Priority rules
const PriorityRules = {
    'Electricity': 'Critical',
    'Road': 'High',
    'Water': 'Medium',
    'Sanitation': 'Medium',
    'Parks': 'Low',
    'Traffic': 'High',
    'Noise': 'Medium',
    'Other': 'Low'
};

// Category to Department mapping
const CategoryDepartmentMap = {
    'Road': 'dept_road',
    'Traffic': 'dept_road',
    'Water': 'dept_water',
    'Electricity': 'dept_electric',
    'Sanitation': 'dept_sanitation',
    'Garbage': 'dept_sanitation',
    'Parks': 'dept_parks',
    'Noise': 'dept_noise',
    'Other': 'dept_admin'
};

// Export for use in other modules
window.StorageManager = StorageManager;
window.PriorityRules = PriorityRules;
window.CategoryDepartmentMap = CategoryDepartmentMap;

