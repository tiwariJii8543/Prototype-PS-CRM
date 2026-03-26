/**
 * Map Module - PS-CRM
 * Handles Leaflet.js map visualization of complaints
 */

// Global map variable
let complaintMap = null;
let mapComplaints = [];

// Initialize map
function initMap() {
    // Wait for DOM to be ready
    setTimeout(async () => {
        const mapContainer = document.getElementById('complaint-map');
        if (!mapContainer) return;
        
        // Check if map already initialized
        if (complaintMap) {
            complaintMap.remove();
        }
        
        // Default center (India)
        const defaultCenter = [20.5937, 78.9629];
        const defaultZoom = 5;
        
        // Initialize map
        complaintMap = L.map('complaint-map').setView(defaultCenter, defaultZoom);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(complaintMap);
        
        // Add complaint markers
        mapComplaints = await storage.getAllComplaintsAsync();
        addComplaintMarkers();
        
        // Fit map to markers
        fitMapToMarkers();
        
        console.log('Map initialized successfully');
    }, 100);
}

// Add complaint markers to map
function addComplaintMarkers() {
    if (!complaintMap) return;
    const markers = [];
    
    mapComplaints.forEach(complaint => {
        if (complaint.location && complaint.location.lat && complaint.location.lng) {
            const marker = createComplaintMarker(complaint);
            if (marker) {
                markers.push(marker);
            }
        }
    });
    
    // Store markers for filtering
    window.complaintMarkers = markers;
}

// Create marker for a complaint
function createComplaintMarker(complaint) {
    const lat = complaint.location.lat;
    const lng = complaint.location.lng;
    
    if (!lat || !lng || lat === 0 || lng === 0) return null;
    
    // Determine marker color based on priority
    const markerColor = getMarkerColor(complaint.priority);
    
    // Create custom icon
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin marker-${markerColor}"></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -42]
    });
    
    // Create popup content
    const popupContent = `
        <div class="complaint-popup">
            <h4>${complaint.complaintId}</h4>
            <p><strong>Category:</strong> ${complaint.category}</p>
            <p><strong>Priority:</strong> <span class="badge badge-${getPriorityClass(complaint.priority)}">${complaint.priority}</span></p>
            <p><strong>Status:</strong> <span class="badge badge-${getStatusClass(complaint.status)}">${complaint.status}</span></p>
            <p><strong>Location:</strong> ${complaint.location.address}</p>
            <p><strong>Supports:</strong> ${complaint.supportCount || 0}</p>
            <button class="btn btn-sm btn-primary" onclick="viewComplaintFromMap('${complaint.complaintId}')">
                View Details
            </button>
        </div>
    `;
    
    // Add marker to map
    const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(complaintMap)
        .bindPopup(popupContent);
    
    return marker;
}

// Get marker color based on priority
function getMarkerColor(priority) {
    switch(priority) {
        case 'Critical': return 'red';
        case 'High': return 'orange';
        case 'Medium': return 'blue';
        case 'Low': return 'green';
        default: return 'blue';
    }
}

// Fit map to show all markers
function fitMapToMarkers() {
    if (!complaintMap) return;
    const validComplaints = mapComplaints.filter(c => 
        c.location && c.location.lat && c.location.lng && 
        c.location.lat !== 0 && c.location.lng !== 0
    );
    
    if (validComplaints.length > 0) {
        const bounds = L.latLngBounds(
            validComplaints.map(c => [c.location.lat, c.location.lng])
        );
        complaintMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Filter markers by status
function filterMapMarkers(status) {
    if (!complaintMap || !window.complaintMarkers) return;
    
    window.complaintMarkers.forEach(marker => {
        const complaint = mapComplaints.find(item => item.complaintId === marker._popup._content.match(/PSR-[A-Z0-9-]+/)?.[0]);
        if (!complaint) return;
        
        if (status && complaint.status !== status) {
            complaintMap.removeLayer(marker);
        } else {
            if (!complaintMap.hasLayer(marker)) {
                marker.addTo(complaintMap);
            }
        }
    });
}

// Filter markers by priority
function filterMapByPriority(priority) {
    if (!complaintMap || !window.complaintMarkers) return;
    
    // Remove all markers
    window.complaintMarkers.forEach(marker => {
        if (complaintMap.hasLayer(marker)) {
            complaintMap.removeLayer(marker);
        }
    });
    
    // Add filtered markers
    mapComplaints.forEach(complaint => {
        if (!priority || complaint.priority === priority) {
            if (complaint.location && complaint.location.lat && complaint.location.lng) {
                const marker = createComplaintMarker(complaint);
                if (marker) {
                    marker.addTo(complaintMap);
                }
            }
        }
    });
    
    fitMapToMarkers();
}

// View complaint from map
function viewComplaintFromMap(complaintId) {
    showSection('tracking');
    document.getElementById('tracking-id').value = complaintId;
    trackComplaint();
}

// Refresh map
function refreshMap() {
    if (complaintMap) {
        complaintMap.remove();
        complaintMap = null;
    }
    initMap();
}

// Export functions
window.initMap = initMap;
window.filterMapMarkers = filterMapMarkers;
window.filterMapByPriority = filterMapByPriority;
window.refreshMap = refreshMap;
window.viewComplaintFromMap = viewComplaintFromMap;

