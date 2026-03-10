/**
 * Main Application - PS-CRM
 * Handles all application logic and UI interactions
 */

// Global variables
let blockchain;
let storage;
let currentUser = null;
let map = null;
let currentSection = 'home';

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing PS-CRM Application...');
    
    // Initialize modules
    blockchain = new Blockchain();
    storage = new StorageManager();
    
    // Check for logged in user
    currentUser = storage.getCurrentUser();
    
    // Initialize UI
    initializeNavigation();
    initializeEventListeners();
    initializeDemoData();
    
    // Show home section
    showSection('home');
    
    console.log('PS-CRM Application initialized successfully');
});

// Initialize navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
        
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Refresh section data
        refreshSection(sectionId);
    }
}

// Refresh section data
function refreshSection(sectionId) {
    switch(sectionId) {
        case 'home':
            updateHomeStats();
            break;
        case 'citizen-portal':
            resetComplaintForm();
            break;
        case 'tracking':
            // Tracking section is ready
            break;
        case 'department-dashboard':
            loadDepartmentComplaints();
            break;
        case 'admin-dashboard':
            loadAdminDashboard();
            break;
        case 'map-view':
            initMap();
            break;
        case 'public-portal':
            loadPublicPortal();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'blockchain-log':
            loadBlockchainLog();
            break;
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Complaint form submission
    const complaintForm = document.getElementById('complaint-form');
    if (complaintForm) {
        complaintForm.addEventListener('submit', handleComplaintSubmit);
    }
    
    // Get location button
    const getLocationBtn = document.getElementById('get-location-btn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Camera capture
    const cameraBtn = document.getElementById('camera-capture-btn');
    if (cameraBtn) {
        cameraBtn.addEventListener('click', openCamera);
    }
    
    const closeCameraBtn = document.getElementById('close-camera-btn');
    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', closeCamera);
    }
    
    const capturePhotoBtn = document.getElementById('capture-photo-btn');
    if (capturePhotoBtn) {
        capturePhotoBtn.addEventListener('click', capturePhoto);
    }
    
    // File upload
    const evidenceInput = document.getElementById('evidence-upload');
    if (evidenceInput) {
        evidenceInput.addEventListener('change', handleFileUpload);
    }
    
    // Track complaint
    const trackBtn = document.getElementById('track-complaint-btn');
    if (trackBtn) {
        trackBtn.addEventListener('click', trackComplaint);
    }
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Department response form
    const responseForm = document.getElementById('department-response-form');
    if (responseForm) {
        responseForm.addEventListener('submit', handleDepartmentResponse);
    }
    
    // Admin filters - add event listeners to all filter dropdowns
    const filterDepartment = document.getElementById('filter-department');
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');
    const filterPriority = document.getElementById('filter-priority');
    
    if (filterDepartment) filterDepartment.addEventListener('change', applyAdminFilters);
    if (filterCategory) filterCategory.addEventListener('change', applyAdminFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyAdminFilters);
    if (filterPriority) filterPriority.addEventListener('change', applyAdminFilters);
    
    // Similar complaint support buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('support-existing-btn')) {
            supportExistingComplaint(e.target.dataset.complaintId);
        }
        if (e.target.classList.contains('submit-anyway-btn')) {
            submitAnyway();
        }
    });
    
    // Auto-check escalation on load
    setTimeout(checkAndEscalateComplaints, 2000);
}

// Initialize demo data
function initializeDemoData() {
    const complaints = storage.getAllComplaints();
    if (complaints.length === 0) {
        // Add sample complaints for demo
        const sampleComplaints = [
            {
                complaintId: storage.generateComplaintId(),
                fullName: 'Rajesh Kumar',
                mobile: '9876543210',
                location: { address: 'MG Road, City Center', lat: 28.6139, lng: 77.2090 },
                category: 'Road',
                description: 'Large pothole on main road causing accidents',
                priority: 'High',
                status: 'Pending',
                assignedDepartment: 'dept_road',
                evidence: null
            },
            {
                complaintId: storage.generateComplaintId(),
                fullName: 'Priya Sharma',
                mobile: '9876543211',
                location: { address: 'Sector 15, Residential Area', lat: 28.6275, lng: 77.2197 },
                category: 'Electricity',
                description: 'Broken street light - dangerous at night',
                priority: 'Critical',
                status: 'Verified',
                assignedDepartment: 'dept_electric',
                evidence: null
            },
            {
                complaintId: storage.generateComplaintId(),
                fullName: 'Amit Patel',
                mobile: '9876543212',
                location: { address: 'Park Avenue, Block B', lat: 28.5921, lng: 77.2295 },
                category: 'Sanitation',
                description: 'Garbage not collected for 5 days',
                priority: 'Medium',
                status: 'Resolved',
                assignedDepartment: 'dept_sanitation',
                evidence: null
            }
        ];
        
        sampleComplaints.forEach(complaint => {
            storage.saveComplaint(complaint);
            blockchain.logAction(complaint.complaintId, 'COMPLAINT_SUBMITTED', {
                category: complaint.category,
                priority: complaint.priority
            });
        });
        
        console.log('Sample complaints created for demo');
    }
}

// ==================== CITIZEN PORTAL ====================

// Reset complaint form
function resetComplaintForm() {
    const form = document.getElementById('complaint-form');
    if (form) form.reset();
    
    document.getElementById('location-display').textContent = '';
    document.getElementById('evidence-preview').innerHTML = '';
    document.getElementById('similar-complaints').innerHTML = '';
    document.getElementById('duplicate-warning').style.display = 'none';
    
    // Reset hidden fields
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    document.getElementById('captured-image').value = '';
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        const btn = document.getElementById('get-location-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Getting location...';
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                document.getElementById('latitude').value = lat;
                document.getElementById('longitude').value = lng;
                
                // Reverse geocode (simplified)
                document.getElementById('location-display').textContent = 
                    `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
                
                document.getElementById('address').value = 
                    `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                
                btn.disabled = false;
                btn.innerHTML = '📍 Use My Location';
                
                // Check for similar complaints
                checkSimilarComplaints();
            },
            (error) => {
                alert('Error getting location: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = '📍 Use My Location';
            }
        );
    } else {
        alert('Geolocation is not supported by this browser');
    }
}

// Check for similar complaints
function checkSimilarComplaints() {
    const category = document.getElementById('category').value;
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    
    if (!category || isNaN(lat) || isNaN(lng)) return;
    
    const similarComplaints = storage.findSimilarComplaints(category, { lat, lng }, 1000);
    
    if (similarComplaints.length > 0) {
        const warningDiv = document.getElementById('duplicate-warning');
        const similarDiv = document.getElementById('similar-complaints');
        
        warningDiv.style.display = 'block';
        warningDiv.className = 'alert alert-warning';
        warningDiv.innerHTML = `⚠️ Found ${similarComplaints.length} similar complaint(s) in this area!`;
        
        similarDiv.innerHTML = similarComplaints.map(c => `
            <div class="similar-complaint-card">
                <div class="similar-complaint-info">
                    <strong>${c.complaintId}</strong> - ${c.category}
                    <br>Status: <span class="badge badge-${getStatusClass(c.status)}">${c.status}</span>
                    <br>Supports: ${c.supportCount || 0}
                </div>
                <div class="similar-complaint-actions">
                    <button class="support-existing-btn btn btn-sm btn-success" 
                            data-complaint-id="${c.complaintId}">
                        👍 Support
                    </button>
                    <button class="submit-anyway-btn btn btn-sm btn-outline" 
                            data-complaint-id="${c.complaintId}">
                        Submit Anyway
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        document.getElementById('duplicate-warning').style.display = 'none';
        document.getElementById('similar-complaints').innerHTML = '';
    }
}

// Support existing complaint
function supportExistingComplaint(complaintId) {
    const supporterName = 'Citizen_' + Math.floor(Math.random() * 10000);
    storage.supportComplaint(complaintId, supporterName);
    
    blockchain.logAction(complaintId, 'COMPLAINT_SUPPORTED', {
        supporter: supporterName
    });
    
    alert('You have supported this complaint! Thank you for your participation.');
    checkSimilarComplaints();
}

// Submit anyway
function submitAnyway() {
    document.getElementById('duplicate-warning').style.display = 'none';
    document.getElementById('similar-complaints').innerHTML = '';
}

// Open camera
function openCamera() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const cameraModal = document.getElementById('camera-modal');
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            video.srcObject = stream;
            video.style.display = 'block';
            cameraModal.style.display = 'flex';
        })
        .catch(err => {
            alert('Error accessing camera: ' + err.message);
        });
}

// Close camera
function closeCamera() {
    const video = document.getElementById('camera-video');
    const cameraModal = document.getElementById('camera-modal');
    
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    
    video.style.display = 'none';
    cameraModal.style.display = 'none';
}

// Capture photo
function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const preview = document.getElementById('evidence-preview');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    document.getElementById('captured-image').value = imageData;
    
    preview.innerHTML = `
        <div class="evidence-item">
            <img src="${imageData}" alt="Captured Evidence" style="max-width: 200px;">
            <span class="badge badge-success">Camera Capture</span>
        </div>
    `;
    
    closeCamera();
}

// Handle file upload
function handleFileUpload(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('evidence-preview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            preview.innerHTML = `
                <div class="evidence-item">
                    <img src="${event.target.result}" alt="Uploaded Evidence" style="max-width: 200px;">
                    <span class="badge badge-info">Uploaded</span>
                </div>
            `;
            document.getElementById('captured-image').value = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Handle complaint submission
async function handleComplaintSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    
    try {
        // Get form values
        const fullName = document.getElementById('fullname').value;
        const mobile = document.getElementById('mobile').value;
        const address = document.getElementById('address').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        
        // Get location
        const lat = parseFloat(document.getElementById('latitude').value) || 0;
        const lng = parseFloat(document.getElementById('longitude').value) || 0;
        
        // Get evidence
        const evidence = document.getElementById('captured-image').value;
        
        // Determine priority
        const priority = PriorityRules[category] || 'Low';
        
        // Assign department
        const department = CategoryDepartmentMap[category] || 'dept_admin';
        
        // Create complaint object
        const complaint = {
            complaintId: storage.generateComplaintId(),
            fullName: fullName,
            mobile: mobile,
            location: {
                address: address,
                lat: lat,
                lng: lng
            },
            category: category,
            description: description,
            priority: priority,
            status: 'Pending',
            assignedDepartment: department,
            evidence: evidence,
            submittedBy: 'citizen'
        };
        
        // Save complaint
        const savedComplaint = storage.saveComplaint(complaint);
        
        // Log in blockchain
        await blockchain.logAction(complaint.complaintId, 'COMPLAINT_SUBMITTED', {
            category: category,
            priority: priority,
            department: department
        });
        
        // Show success
        alert(`Complaint submitted successfully!\n\nYour Complaint ID: ${complaint.complaintId}\n\nPlease save this ID to track your complaint.`);
        
        // Reset form
        resetComplaintForm();
        
        // Show tracking info
        document.getElementById('tracking-id').value = complaint.complaintId;
        trackComplaint();
        
    } catch (error) {
        console.error('Error submitting complaint:', error);
        alert('Error submitting complaint. Please try again.');
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Complaint';
}

// ==================== COMPLAINT TRACKING ====================

// Track complaint
function trackComplaint() {
    const complaintId = document.getElementById('tracking-id').value.trim();
    
    if (!complaintId) {
        alert('Please enter a Complaint ID');
        return;
    }
    
    const complaint = storage.getComplaintById(complaintId);
    
    if (!complaint) {
        alert('Complaint not found. Please check the Complaint ID.');
        return;
    }
    
    // Get department name
    const dept = storage.getDepartmentById(complaint.assignedDepartment);
    const deptName = dept ? dept.name : 'Unknown';
    
    // Display complaint details
    const detailsDiv = document.getElementById('tracking-details');
    detailsDiv.innerHTML = `
        <div class="complaint-detail-card">
            <div class="detail-header">
                <h3>${complaint.complaintId}</h3>
                <span class="badge badge-${getPriorityClass(complaint.priority)}">${complaint.priority}</span>
                <span class="badge badge-${getStatusClass(complaint.status)}">${complaint.status}</span>
            </div>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Citizen Name:</label>
                    <span>${complaint.fullName}</span>
                </div>
                <div class="detail-item">
                    <label>Mobile:</label>
                    <span>${complaint.mobile}</span>
                </div>
                <div class="detail-item">
                    <label>Category:</label>
                    <span>${complaint.category}</span>
                </div>
                <div class="detail-item">
                    <label>Department:</label>
                    <span>${deptName}</span>
                </div>
                <div class="detail-item">
                    <label>Location:</label>
                    <span>${complaint.location.address}</span>
                </div>
                <div class="detail-item">
                    <label>Description:</label>
                    <span>${complaint.description}</span>
                </div>
                <div class="detail-item">
                    <label>Support Count:</label>
                    <span>👍 ${complaint.supportCount || 0}</span>
                </div>
                <div class="detail-item">
                    <label>Created:</label>
                    <span>${new Date(complaint.createdAt).toLocaleString()}</span>
                </div>
            </div>
            
            ${complaint.evidence ? `
                <div class="detail-evidence">
                    <label>Evidence:</label>
                    <img src="${complaint.evidence}" alt="Evidence" style="max-width: 300px; margin-top: 10px;">
                </div>
            ` : ''}
            
            <div class="detail-timeline">
                <h4>Timeline</h4>
                <div class="timeline">
                    ${complaint.timeline.map(entry => `
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <strong>${entry.action}</strong>
                                <p>${entry.description}</p>
                                <small>${new Date(entry.timestamp).toLocaleString()}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="detail-blockchain">
                <h4>Blockchain Record</h4>
                <div class="blockchain-info">
                    <p><strong>Block Index:</strong> ${blockchain.getChainLength() - 1}</p>
                    <p><strong>Transaction Hash:</strong> <code>${complaint.complaintId.substring(0, 8)}...</code></p>
                    <p class="text-success">✓ Verified on Blockchain</p>
                </div>
            </div>
        </div>
    `;
    
    detailsDiv.style.display = 'block';
}

// ==================== LOGIN / AUTH ====================

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const user = storage.authenticateUser(username, password);
    
    if (user) {
        storage.setCurrentUser(user);
        currentUser = user;
        
        // Hide login modal
        document.getElementById('login-modal').style.display = 'none';
        
        // Show appropriate dashboard
        if (user.role === 'admin') {
            showSection('admin-dashboard');
        } else if (user.role === 'department') {
            showSection('department-dashboard');
        }
        
        updateUserDisplay();
    } else {
        alert('Invalid credentials. Please try again.');
    }
}

// Handle logout
function handleLogout() {
    storage.logoutUser();
    currentUser = null;
    
    document.getElementById('user-display').innerHTML = '';
    showSection('home');
}

// Update user display
function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('user-display').innerHTML = `
            <span class="user-info">
                <i class="fas fa-user"></i> ${currentUser.name}
                <button class="btn btn-sm btn-outline" onclick="handleLogout()">Logout</button>
            </span>
        `;
        
        // Show/hide nav items based on role
        if (currentUser.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        } else if (currentUser.role === 'department') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    }
}

// ==================== DEPARTMENT DASHBOARD ====================

// Load department complaints
function loadDepartmentComplaints() {
    if (!currentUser || currentUser.role !== 'department') {
        document.getElementById('department-login-prompt').style.display = 'block';
        document.getElementById('department-complaints-list').style.display = 'none';
        return;
    }
    
    document.getElementById('department-login-prompt').style.display = 'none';
    document.getElementById('department-complaints-list').style.display = 'block';
    
    const complaints = storage.getComplaintsByDepartment(currentUser.department);
    const dept = storage.getDepartmentById(currentUser.department);
    
    document.getElementById('department-title').textContent = dept ? dept.name : 'Department Dashboard';
    
    if (complaints.length === 0) {
        document.getElementById('department-complaints-table').innerHTML = 
            '<tr><td colspan="7" class="text-center">No complaints assigned to your department.</td></tr>';
        return;
    }
    
    document.getElementById('department-complaints-table').innerHTML = complaints.map(c => `
        <tr>
            <td><code>${c.complaintId}</code></td>
            <td><span class="badge badge-${getPriorityClass(c.priority)}">${c.priority}</span></td>
            <td>${c.category}</td>
            <td>${c.location.address}</td>
            <td><span class="badge badge-${getStatusClass(c.status)}">${c.status}</span></td>
            <td>${c.resolutionDeadline ? new Date(c.resolutionDeadline).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewComplaint('${c.complaintId}')">View</button>
            </td>
        </tr>
    `).join('');
}

// View complaint (department)
function viewComplaint(complaintId) {
    const complaint = storage.getComplaintById(complaintId);
    if (!complaint) return;
    
    document.getElementById('response-complaint-id').textContent = complaint.complaintId;
    document.getElementById('response-category').textContent = complaint.category;
    document.getElementById('response-priority').textContent = complaint.priority;
    document.getElementById('response-description').textContent = complaint.description;
    document.getElementById('response-location').textContent = complaint.location.address;
    
    if (complaint.evidence) {
        document.getElementById('response-evidence').innerHTML = 
            `<img src="${complaint.evidence}" alt="Evidence" style="max-width: 200px;">`;
    } else {
        document.getElementById('response-evidence').innerHTML = 'No evidence uploaded';
    }
    
    // Show response modal
    document.getElementById('response-modal').style.display = 'flex';
}

// Handle department response
async function handleDepartmentResponse(e) {
    e.preventDefault();
    
    const complaintId = document.getElementById('response-complaint-id').textContent;
    const response = document.getElementById('inspection-response').value;
    const estimatedTime = document.getElementById('estimated-time').value;
    const status = document.getElementById('response-status').value;
    
    // Calculate deadline (3 days for now, can be adjusted)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + parseInt(estimatedTime || 3));
    
    // Update complaint
    const updates = {
        status: status,
        response: response,
        resolutionDeadline: deadline.toISOString(),
        responseCount: (storage.getComplaintById(complaintId).responseCount || 0) + 1
    };
    
    storage.updateComplaint(complaintId, updates);
    
    // Add timeline entry
    storage.addTimelineEntry(complaintId, 'Department Response', 
        `Response: ${response}. Status updated to: ${status}. Deadline: ${deadline.toLocaleDateString()}`);
    
    // Log in blockchain
    await blockchain.logAction(complaintId, 'COMPLAINT_RESPONDED', {
        response: response,
        status: status,
        deadline: deadline.toISOString()
    });
    
    // Close modal
    document.getElementById('response-modal').style.display = 'none';
    
    // Refresh table
    loadDepartmentComplaints();
    
    alert('Response submitted successfully!');
}

// ==================== ADMIN DASHBOARD ====================

// Load admin dashboard
function loadAdminDashboard() {
    const stats = storage.getStatistics();
    
    // Update stat cards
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-resolved').textContent = stats.resolved;
    document.getElementById('stat-delayed').textContent = stats.delayed;
    document.getElementById('stat-critical').textContent = stats.critical;
    
    // Load all complaints in table
    applyAdminFilters();
}

// Apply admin filters
function applyAdminFilters() {
    const deptFilter = document.getElementById('filter-department').value;
    const categoryFilter = document.getElementById('filter-category').value;
    const statusFilter = document.getElementById('filter-status').value;
    const priorityFilter = document.getElementById('filter-priority').value;
    
    let complaints = storage.getAllComplaints();
    
    // Apply filters
    if (deptFilter) {
        complaints = complaints.filter(c => c.assignedDepartment === deptFilter);
    }
    if (categoryFilter) {
        complaints = complaints.filter(c => c.category === categoryFilter);
    }
    if (statusFilter) {
        complaints = complaints.filter(c => c.status === statusFilter);
    }
    if (priorityFilter) {
        complaints = complaints.filter(c => c.priority === priorityFilter);
    }
    
    // Render table
    const tbody = document.getElementById('admin-complaints-table');
    if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No complaints found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = complaints.map(c => {
        const dept = storage.getDepartmentById(c.assignedDepartment);
        return `
            <tr>
                <td><code>${c.complaintId}</code></td>
                <td>${c.fullName}</td>
                <td>${c.category}</td>
                <td><span class="badge badge-${getPriorityClass(c.priority)}">${c.priority}</span></td>
                <td><span class="badge badge-${getStatusClass(c.status)}">${c.status}</span></td>
                <td>${dept ? dept.name : 'N/A'}</td>
                <td>${c.supportCount || 0}</td>
                <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewAdminComplaint('${c.complaintId}')">View</button>
                    <button class="btn btn-sm btn-warning" onclick="escalateComplaint('${c.complaintId}')">Escalate</button>
                </td>
            </tr>
        `;
    }).join('');
}

// View admin complaint
function viewAdminComplaint(complaintId) {
    const complaint = storage.getComplaintById(complaintId);
    if (!complaint) return;
    
    const dept = storage.getDepartmentById(complaint.assignedDepartment);
    
    document.getElementById('admin-view-id').textContent = complaint.complaintId;
    document.getElementById('admin-view-name').textContent = complaint.fullName;
    document.getElementById('admin-view-mobile').textContent = complaint.mobile;
    document.getElementById('admin-view-category').textContent = complaint.category;
    document.getElementById('admin-view-priority').textContent = complaint.priority;
    document.getElementById('admin-view-status').textContent = complaint.status;
    document.getElementById('admin-view-department').textContent = dept ? dept.name : 'N/A';
    document.getElementById('admin-view-location').textContent = complaint.location.address;
    document.getElementById('admin-view-description').textContent = complaint.description;
    document.getElementById('admin-view-supports').textContent = complaint.supportCount || 0;
    document.getElementById('admin-view-response').textContent = complaint.response || 'No response yet';
    
    document.getElementById('admin-view-modal').style.display = 'flex';
}

// Escalate complaint
async function escalateComplaint(complaintId) {
    const complaint = storage.getComplaintById(complaintId);
    if (!complaint) return;
    
    const updates = {
        escalationCount: (complaint.escalationCount || 0) + 1,
        status: 'Delayed'
    };
    
    storage.updateComplaint(complaintId, updates);
    storage.addTimelineEntry(complaintId, 'Escalated', 'Complaint escalated to Senior Authority');
    
    await blockchain.logAction(complaintId, 'ESCALATED', {
        escalationCount: updates.escalationCount
    });
    
    alert('Complaint escalated successfully!');
    loadAdminDashboard();
}

// ==================== AUTO ESCALATION ====================

// Check and escalate complaints
async function checkAndEscalateComplaints() {
    const complaints = storage.getAllComplaints();
    const now = new Date();
    
    for (const complaint of complaints) {
        // Skip if already resolved
        if (complaint.status === 'Resolved') continue;
        
        // Check if deadline missed
        if (complaint.resolutionDeadline) {
            const deadline = new Date(complaint.resolutionDeadline);
            
            if (now > deadline && complaint.status !== 'Delayed') {
                // Mark as delayed
                storage.updateComplaint(complaint.complaintId, {
                    status: 'Delayed',
                    delayCount: (complaint.delayCount || 0) + 1
                });
                
                storage.addTimelineEntry(complaint.complaintId, 'Deadline Missed', 
                    'Resolution deadline has passed. Complaint marked as delayed.');
                
                await blockchain.logAction(complaint.complaintId, 'DEADLINE_MISSED', {
                    deadline: complaint.resolutionDeadline
                });
            }
        }
        
        // Check if no response for 3 days
        const createdAt = new Date(complaint.createdAt);
        const daysSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
        
        if (daysSinceCreated >= 3 && complaint.status === 'Pending' && complaint.responseCount === 0) {
            // Auto-escalate
            storage.updateComplaint(complaint.complaintId, {
                status: 'Delayed',
                escalationCount: (complaint.escalationCount || 0) + 1
            });
            
            storage.addTimelineEntry(complaint.complaintId, 'Auto-Escalated', 
                'No response received within 3 days. Complaint auto-escalated to Senior Authority.');
            
            await blockchain.logAction(complaint.complaintId, 'ESCALATED', {
                reason: 'No response within 3 days'
            });
        }
    }
    
    // Re-check every minute
    setTimeout(checkAndEscalateComplaints, 60000);
}

// ==================== HELPER FUNCTIONS ====================

// Get priority class
function getPriorityClass(priority) {
    switch(priority) {
        case 'Critical': return 'danger';
        case 'High': return 'warning';
        case 'Medium': return 'info';
        case 'Low': return 'secondary';
        default: return 'secondary';
    }
}

// Get status class
function getStatusClass(status) {
    switch(status) {
        case 'Pending': return 'warning';
        case 'Verified': return 'info';
        case 'Work Started': return 'primary';
        case 'Resolved': return 'success';
        case 'Delayed': return 'danger';
        default: return 'secondary';
    }
}

// Open login modal
function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Make functions globally available
window.showSection = showSection;
window.trackComplaint = trackComplaint;
window.viewComplaint = viewComplaint;
window.viewAdminComplaint = viewAdminComplaint;
window.escalateComplaint = escalateComplaint;
window.openLoginModal = openLoginModal;
window.closeModal = closeModal;
window.handleLogout = handleLogout;
window.getCurrentLocation = getCurrentLocation;

// ==================== PUBLIC PORTAL ====================

// Load public portal
function loadPublicPortal() {
    const complaints = storage.getAllComplaints();
    const container = document.getElementById('public-complaints');
    
    if (complaints.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No complaints yet.</p>';
        return;
    }
    
    // Sort by support count (most supported first)
    const sortedComplaints = [...complaints].sort((a, b) => (b.supportCount || 0) - (a.supportCount || 0));
    
    container.innerHTML = sortedComplaints.map(c => `
        <div class="public-complaint-card">
            <div class="public-complaint-header">
                <span class="public-complaint-id">${c.complaintId}</span>
                <div>
                    <span class="badge badge-${getPriorityClass(c.priority)}">${c.priority}</span>
                    <span class="badge badge-${getStatusClass(c.status)}">${c.status}</span>
                </div>
            </div>
            <div class="public-complaint-location">
                <i class="fas fa-map-marker-alt"></i> ${c.location.address}
            </div>
            <p><strong>${c.category}</strong></p>
            <p>${c.description.substring(0, 100)}${c.description.length > 100 ? '...' : ''}</p>
            <div class="public-complaint-actions">
                <button class="btn btn-sm btn-outline" onclick="supportPublicComplaint('${c.complaintId}')">
                    👍 Support (${c.supportCount || 0})
                </button>
                <button class="btn btn-sm btn-outline" onclick="viewPublicComplaint('${c.complaintId}')">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Support public complaint
function supportPublicComplaint(complaintId) {
    const supporterName = 'Public_Citizen_' + Math.floor(Math.random() * 10000);
    storage.supportComplaint(complaintId, supporterName);
    
    blockchain.logAction(complaintId, 'COMPLAINT_SUPPORTED', {
        supporter: supporterName
    });
    
    alert('You have supported this complaint!');
    loadPublicPortal();
}

// View public complaint
function viewPublicComplaint(complaintId) {
    showSection('tracking');
    document.getElementById('tracking-id').value = complaintId;
    trackComplaint();
}

// ==================== BLOCKCHAIN LOG ====================

// Load blockchain log
function loadBlockchainLog() {
    const blocks = blockchain.getAllBlocks().reverse();
    const container = document.getElementById('blockchain-blocks');
    
    if (blocks.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No blockchain records yet.</p>';
        return;
    }
    
    container.innerHTML = blocks.map(block => {
        const actionClass = getActionClass(block.action);
        return `
            <div class="block-card">
                <div class="block-header">
                    <span class="block-index">Block #${block.index}</span>
                    <span class="block-timestamp">${new Date(block.timestamp).toLocaleString()}</span>
                </div>
                <div class="block-action">
                    <span class="badge badge-${actionClass}">${block.action}</span>
                </div>
                <p><strong>Complaint ID:</strong> ${block.complaintId}</p>
                <div class="block-hash">
                    Hash: ${block.hash.substring(0, 20)}...
                </div>
                <p class="text-muted" style="font-size: 0.75rem; margin-top: 0.5rem;">
                    Previous: ${block.previousHash.substring(0, 15)}...
                </p>
            </div>
        `;
    }).join('');
}

// Get action class for blockchain
function getActionClass(action) {
    switch(action) {
        case 'COMPLAINT_SUBMITTED': return 'info';
        case 'COMPLAINT_SUPPORTED': return 'success';
        case 'COMPLAINT_RESPONDED': return 'primary';
        case 'STATUS_UPDATED': return 'warning';
        case 'ESCALATED': return 'danger';
        case 'DEADLINE_MISSED': return 'danger';
        case 'PENALTY_ADDED': return 'danger';
        case 'ADMIN_ACTION': return 'secondary';
        case 'GENESIS': return 'success';
        default: return 'secondary';
    }
}

// ==================== HOME STATISTICS ====================

// Update home section statistics
function updateHomeStats() {
    const stats = storage.getStatistics();
    
    const homeTotal = document.getElementById('home-total');
    const homePending = document.getElementById('home-pending');
    const homeResolved = document.getElementById('home-resolved');
    const homeDelayed = document.getElementById('home-delayed');
    
    if (homeTotal) homeTotal.textContent = stats.total;
    if (homePending) homePending.textContent = stats.pending;
    if (homeResolved) homeResolved.textContent = stats.resolved;
    if (homeDelayed) homeDelayed.textContent = stats.delayed;
}

