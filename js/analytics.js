/**
 * Analytics Module - PS-CRM
 * Handles Chart.js visualizations and analytics dashboard
 */

// Chart instances
let priorityChart = null;
let departmentChart = null;
let statusChart = null;
let timelineChart = null;
let analyticsSnapshot = {
    stats: null,
    complaints: []
};

// Load analytics
async function loadAnalytics() {
    setTimeout(async () => {
        analyticsSnapshot.stats = await storage.getStatisticsAsync();
        analyticsSnapshot.complaints = storage.apiMode
            ? await storage.getPublicComplaintsAsync()
            : await storage.getAllComplaintsAsync();
        initPriorityChart();
        initDepartmentChart();
        initStatusChart();
        initTimelineChart();
        loadStatsCards();
    }, 100);
}

// Initialize priority distribution chart
function initPriorityChart() {
    const ctx = document.getElementById('priority-chart');
    if (!ctx) return;
    
    const stats = analyticsSnapshot.stats || storage.getStatistics();
    
    if (priorityChart) {
        priorityChart.destroy();
    }
    
    priorityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
                data: [
                    stats.priority.Critical || 0,
                    stats.priority.High || 0,
                    stats.priority.Medium || 0,
                    stats.priority.Low || 0
                ],
                backgroundColor: [
                    '#dc3545', // Critical - Red
                    '#fd7e14', // High - Orange
                    '#0dcaf0', // Medium - Blue
                    '#198754'  // Low - Green
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                title: {
                    display: true,
                    text: 'Complaints by Priority',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

// Initialize department performance chart
function initDepartmentChart() {
    const ctx = document.getElementById('department-chart');
    if (!ctx) return;
    
    const stats = analyticsSnapshot.stats || storage.getStatistics();
    const deptStats = stats.byDepartment;
    
    const departments = Object.values(deptStats).map(d => d.name);
    const total = Object.values(deptStats).map(d => d.total);
    const resolved = Object.values(deptStats).map(d => d.resolved);
    const delayed = Object.values(deptStats).map(d => d.delayed);
    
    if (departmentChart) {
        departmentChart.destroy();
    }
    
    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: departments,
            datasets: [
                {
                    label: 'Total',
                    data: total,
                    backgroundColor: '#0d6efd'
                },
                {
                    label: 'Resolved',
                    data: resolved,
                    backgroundColor: '#198754'
                },
                {
                    label: 'Delayed',
                    data: delayed,
                    backgroundColor: '#dc3545'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false,
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    stacked: false,
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Department Performance',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

// Initialize status distribution chart
function initStatusChart() {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;
    
    const stats = analyticsSnapshot.stats || storage.getStatistics();
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Assigned', 'In Progress', 'Awaiting Verification', 'Closed', 'Escalated'],
            datasets: [{
                data: [
                    stats.assigned || 0,
                    stats.workStarted || 0,
                    stats.awaitingVerification || 0,
                    stats.closed || 0,
                    stats.escalated || 0
                ],
                backgroundColor: [
                    '#ffc107', // Pending - Yellow
                    '#0d6efd', // In progress - Blue
                    '#0dcaf0', // Awaiting verification - Cyan
                    '#198754', // Closed - Green
                    '#dc3545'  // Escalated - Red
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                title: {
                    display: true,
                    text: 'Complaints by Status',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

// Initialize timeline chart
function initTimelineChart() {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;
    
    const complaints = analyticsSnapshot.complaints || storage.getAllComplaints();
    
    // Group complaints by date
    const dateGroups = {};
    complaints.forEach(c => {
        const date = new Date(c.createdAt).toLocaleDateString();
        dateGroups[date] = (dateGroups[date] || 0) + 1;
    });
    
    // Sort dates
    const sortedDates = Object.keys(dateGroups).sort((a, b) => 
        new Date(a) - new Date(b)
    ).slice(-7); // Last 7 days
    
    const data = sortedDates.map(d => dateGroups[d]);
    
    if (timelineChart) {
        timelineChart.destroy();
    }
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Complaints Submitted',
                data: data,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Complaints Over Time',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

// Load stats cards
function loadStatsCards() {
    const stats = analyticsSnapshot.stats || storage.getStatistics();
    
    // Update cards
    document.getElementById('analytics-total').textContent = stats.total;
    document.getElementById('analytics-pending').textContent = stats.pending;
    document.getElementById('analytics-resolved').textContent = stats.resolved;
    document.getElementById('analytics-delayed').textContent = stats.delayed;
    
    // Calculate resolution rate
    const resolutionRate = stats.total > 0 ? 
        ((stats.resolved / stats.total) * 100).toFixed(1) : 0;
    document.getElementById('analytics-resolution-rate').textContent = resolutionRate + '%';
    
    const closedComplaints = (analyticsSnapshot.complaints || []).filter(c => c.closedAt);
    const avgDays = closedComplaints.length
        ? (
            closedComplaints.reduce((sum, complaint) => {
                return sum + ((new Date(complaint.closedAt) - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24));
            }, 0) / closedComplaints.length
        ).toFixed(1)
        : '0.0';
    document.getElementById('analytics-avg-time').textContent = `${avgDays} days`;
    
    // Update category breakdown
    const categoryBreakdown = document.getElementById('category-breakdown');
    if (categoryBreakdown) {
        const categories = Object.entries(stats.byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        categoryBreakdown.innerHTML = categories.map(([cat, count]) => `
            <div class="category-item">
                <span class="category-name">${cat}</span>
                <span class="category-count">${count}</span>
            </div>
        `).join('');
    }
    
    // Update department table
    const deptTable = document.getElementById('department-performance-table');
    if (deptTable) {
        const deptStats = Object.values(stats.byDepartment);
        
        deptTable.innerHTML = deptStats.map(d => `
            <tr>
                <td>${d.name}</td>
                <td>${d.total}</td>
                <td>${d.resolved}</td>
                <td>${d.pending}</td>
                <td>${d.delayed}</td>
                <td>
                    <div class="progress-bar-mini">
                        <div class="progress-fill" style="width: ${d.total > 0 ? (d.resolved/d.total*100) : 0}%"></div>
                    </div>
                    <span>${d.total > 0 ? Math.round((d.resolved/d.total)*100) : 0}%</span>
                </td>
            </tr>
        `).join('');
    }
}

// Refresh analytics
function refreshAnalytics() {
    loadAnalytics();
}

// Export functions
window.loadAnalytics = loadAnalytics;
window.refreshAnalytics = refreshAnalytics;

