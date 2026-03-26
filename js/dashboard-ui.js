(function() {
    function getContext() {
        return window.PSCRMAppContext;
    }

    async function loadDepartmentComplaints() {
        const { getStorage, getCurrentUser, renderEmptyState, getPriorityClass, getStatusClass } = getContext();
        const storage = getStorage();
        const currentUser = getCurrentUser();

        if (!currentUser || currentUser.role !== 'department') {
            document.getElementById('department-login-prompt').style.display = 'block';
            document.getElementById('department-complaints-list').style.display = 'none';
            return;
        }

        document.getElementById('department-login-prompt').style.display = 'none';
        document.getElementById('department-complaints-list').style.display = 'block';

        const complaints = await storage.getComplaintsByDepartmentAsync(currentUser.department);
        const dept = await storage.getDepartmentByIdAsync(currentUser.department);
        document.getElementById('department-title').textContent = dept ? dept.name : 'Department Dashboard';

        if (complaints.length === 0) {
            document.getElementById('department-complaints-table').innerHTML =
                renderEmptyState('No assigned complaints', 'Your department queue is clear right now.', 7);
            return;
        }

        document.getElementById('department-complaints-table').innerHTML = complaints.map(c => `
            <tr>
                <td><code>${c.complaintId}</code></td>
                <td><span class="badge badge-${getPriorityClass(c.priority)}">${c.priority}</span></td>
                <td>${c.category}</td>
                <td>${c.location.address}</td>
                <td><span class="badge badge-${getStatusClass(c.status)}">${c.status}</span></td>
                <td>${c.sla?.resolutionDeadline ? new Date(c.sla.resolutionDeadline).toLocaleDateString() : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewComplaint('${c.complaintId}')">View</button>
                </td>
            </tr>
        `).join('');
    }

    async function viewComplaint(complaintId) {
        const { getStorage, setPendingResolutionProofFile } = getContext();
        const storage = getStorage();
        const complaint = await storage.getComplaintByIdAsync(complaintId);
        if (!complaint) return;

        document.getElementById('response-complaint-id').textContent = complaint.complaintId;
        document.getElementById('response-category').textContent = complaint.category;
        document.getElementById('response-priority').textContent = complaint.priority;
        document.getElementById('response-description').textContent = complaint.description;
        document.getElementById('response-location').textContent = complaint.location.address;

        const proofs = complaint.proofs || [];
        document.getElementById('response-evidence').innerHTML = proofs.length > 0
            ? proofs.map(proof => `<img src="${proof.url}" alt="Proof" style="max-width: 200px; margin-right: 8px;">`).join('')
            : '<span class="text-muted">No evidence uploaded yet.</span>';
        document.getElementById('resolution-proof').value = '';
        const resolutionProofUpload = document.getElementById('resolution-proof-upload');
        if (resolutionProofUpload) resolutionProofUpload.value = '';
        document.getElementById('resolution-proof-preview').innerHTML = '';
        setPendingResolutionProofFile(null);
        document.getElementById('response-modal').style.display = 'flex';
    }

    async function handleDepartmentResponse(e) {
        e.preventDefault();
        const {
            getStorage,
            getCurrentUser,
            getPendingResolutionProofFile,
            setPendingResolutionProofFile,
            recordBlockchainEvent,
            showToast
        } = getContext();
        const storage = getStorage();
        const currentUser = getCurrentUser();

        const complaintId = document.getElementById('response-complaint-id').textContent;
        const response = document.getElementById('inspection-response').value;
        const estimatedTime = document.getElementById('estimated-time').value;
        const status = document.getElementById('response-status').value;
        let proof = document.getElementById('resolution-proof').value;

        try {
            if (storage.apiMode && getPendingResolutionProofFile()) {
                const uploadedProof = await storage.uploadFileAsync(getPendingResolutionProofFile());
                proof = uploadedProof.url;
            }

            const actor = currentUser || { id: 'department', name: 'Department Officer', role: 'department' };
            const updatedComplaint = storage.apiMode
                ? await storage.updateComplaintAsync(complaintId, {
                    status,
                    response,
                    estimatedDays: estimatedTime,
                    proof: proof ? { url: proof, type: 'resolution' } : null
                })
                : storage.updateComplaintWorkflow(complaintId, {
                    status,
                    response,
                    estimatedDays: estimatedTime,
                    proof: proof ? { url: proof, type: 'resolution' } : null,
                    timelineAction: 'Department Response',
                    timelineDescription: `Response: ${response}. Status updated to ${status}.`
                }, actor);

            await recordBlockchainEvent(complaintId, 'COMPLAINT_RESPONDED', {
                response,
                status,
                proofAdded: Boolean(proof)
            });

            if (updatedComplaint.status === 'Awaiting Citizen Verification') {
                await recordBlockchainEvent(complaintId, 'PROOF_ATTACHED', { proofType: 'resolution' });
            }

            document.getElementById('response-modal').style.display = 'none';
            document.getElementById('department-response-form').reset();
            const resolutionProofUpload = document.getElementById('resolution-proof-upload');
            if (resolutionProofUpload) resolutionProofUpload.value = '';
            setPendingResolutionProofFile(null);
            loadDepartmentComplaints();
            showToast('Department response submitted successfully.', 'success');
        } catch (error) {
            showToast(error.message || 'Could not update complaint.', 'error');
        }
    }

    async function loadAdminDashboard() {
        const { getStorage } = getContext();
        const storage = getStorage();
        const stats = await storage.getStatisticsAsync();
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-pending').textContent = stats.pending;
        document.getElementById('stat-resolved').textContent = stats.resolved;
        document.getElementById('stat-delayed').textContent = stats.delayed;
        document.getElementById('stat-critical').textContent = stats.critical;
        applyAdminFilters();
    }

    async function applyAdminFilters() {
        const { getStorage, renderEmptyState, getPriorityClass, getStatusClass } = getContext();
        const storage = getStorage();
        const deptFilter = document.getElementById('filter-department').value;
        const categoryFilter = document.getElementById('filter-category').value;
        const statusFilter = document.getElementById('filter-status').value;
        const priorityFilter = document.getElementById('filter-priority').value;

        let complaints = await storage.getAllComplaintsAsync();
        if (deptFilter) complaints = complaints.filter(c => c.assignedDepartment === deptFilter);
        if (categoryFilter) complaints = complaints.filter(c => c.category === categoryFilter);
        if (statusFilter) complaints = complaints.filter(c => c.status === statusFilter);
        if (priorityFilter) complaints = complaints.filter(c => c.priority === priorityFilter);

        const tbody = document.getElementById('admin-complaints-table');
        if (complaints.length === 0) {
            tbody.innerHTML = renderEmptyState('No complaints found', 'Try changing the filters to widen the search.', 9);
            return;
        }

        const departments = await storage.getAllDepartmentsAsync();
        const deptMap = new Map((departments || []).map(d => [d.id, d]));
        tbody.innerHTML = complaints.map(c => {
            const dept = deptMap.get(c.assignedDepartment) || null;
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

    async function viewAdminComplaint(complaintId) {
        const { getStorage } = getContext();
        const storage = getStorage();
        const complaint = await storage.getComplaintByIdAsync(complaintId);
        if (!complaint) return;

        const dept = await storage.getDepartmentByIdAsync(complaint.assignedDepartment);
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

    async function escalateComplaint(complaintId) {
        const { getStorage, getCurrentUser, recordBlockchainEvent, showToast } = getContext();
        const storage = getStorage();
        const currentUser = getCurrentUser();
        try {
            const reason = 'Complaint escalated to senior authority for SLA breach or manual intervention.';
            const updated = storage.apiMode
                ? await storage.escalateComplaintAsync(complaintId, reason)
                : storage.escalateComplaintRecord(
                    complaintId,
                    reason,
                    currentUser || { id: 'admin', name: 'Admin', role: 'admin' }
                );

            await recordBlockchainEvent(complaintId, 'ESCALATED', {
                escalationCount: updated.escalationCount
            });

            showToast('Complaint escalated successfully.', 'success');
            loadAdminDashboard();
        } catch (error) {
            showToast(error.message || 'Could not escalate complaint.', 'error');
        }
    }

    async function verifyComplaintAction(complaintId, decision) {
        const { getStorage, getCurrentUser, recordBlockchainEvent, showToast, trackComplaint } = getContext();
        const storage = getStorage();
        const currentUser = getCurrentUser();
        const remarks = prompt(
            decision === 'accepted'
                ? 'Add an optional acceptance note:'
                : 'Why are you rejecting this resolution?'
        ) || '';

        try {
            const updated = storage.apiMode
                ? await storage.verifyComplaintAsync(complaintId, decision, remarks)
                : storage.verifyComplaint(
                    complaintId,
                    decision,
                    remarks,
                    currentUser || { id: 'citizen', name: 'Citizen', role: 'citizen' }
                );
            await recordBlockchainEvent(complaintId, 'CITIZEN_VERIFIED', { decision, remarks });
            showToast(decision === 'accepted' ? 'Resolution accepted successfully.' : 'Complaint reopened successfully.', 'success');
            document.getElementById('tracking-id').value = complaintId;
            trackComplaint();
            if (updated.status === 'Reopened' && currentUser?.role === 'department') {
                loadDepartmentComplaints();
            }
        } catch (error) {
            showToast(error.message || 'Could not verify complaint.', 'error');
        }
    }

    async function checkAndEscalateComplaints() {
        const { getStorage, recordBlockchainEvent } = getContext();
        const storage = getStorage();
        if (storage.apiMode) {
            setTimeout(checkAndEscalateComplaints, 60000);
            return;
        }

        const complaints = await storage.getAllComplaintsAsync();
        const now = new Date();

        for (const complaint of complaints) {
            if (complaint.status === 'Closed') continue;

            if (complaint.sla?.resolutionDeadline) {
                const deadline = new Date(complaint.sla.resolutionDeadline);
                if (now > deadline && complaint.status !== 'Escalated') {
                    storage.escalateComplaintRecord(
                        complaint.complaintId,
                        'Resolution deadline breached. Complaint auto-escalated.',
                        { id: 'system', name: 'SLA Engine', role: 'system' }
                    );
                    await recordBlockchainEvent(complaint.complaintId, 'DEADLINE_MISSED', {
                        deadline: complaint.sla.resolutionDeadline
                    });
                }
            }

            const createdAt = new Date(complaint.createdAt);
            const daysSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            if (daysSinceCreated >= 3 && complaint.status === 'Assigned' && complaint.responseCount === 0) {
                storage.escalateComplaintRecord(
                    complaint.complaintId,
                    'No response received within 3 days. Complaint auto-escalated.',
                    { id: 'system', name: 'SLA Engine', role: 'system' }
                );
                await recordBlockchainEvent(complaint.complaintId, 'ESCALATED', {
                    reason: 'No response within 3 days'
                });
            }
        }

        setTimeout(checkAndEscalateComplaints, 60000);
    }

    window.PSCRMDashboard = {
        loadDepartmentComplaints,
        viewComplaint,
        handleDepartmentResponse,
        loadAdminDashboard,
        applyAdminFilters,
        viewAdminComplaint,
        escalateComplaint,
        verifyComplaintAction,
        checkAndEscalateComplaints
    };
})();
