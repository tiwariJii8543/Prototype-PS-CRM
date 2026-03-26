(function() {
    function getContext() {
        return window.PSCRMAppContext;
    }

    async function trackComplaint() {
        const {
            getStorage,
            getCurrentUser,
            showToast,
            getPriorityClass,
            getStatusClass,
            t
        } = getContext();
        const storage = getStorage();
        const currentUser = getCurrentUser();
        const complaintId = document.getElementById('tracking-id').value.trim();

        if (!complaintId) {
            showToast(t('trackEnterId'), 'warning');
            return;
        }

        try {
            const complaint = await storage.getComplaintByIdAsync(complaintId);
            const auditTrail = await storage.getPublicAuditTrailAsync(complaintId).catch(() => []);
            if (!complaint) {
                showToast(t('trackNotFound'), 'warning');
                return;
            }

            const dept = await storage.getDepartmentByIdAsync(complaint.assignedDepartment);
            const deptName = dept ? dept.name : 'Unknown';
            const hasPrivateDetails = Boolean(complaint.fullName || complaint.mobile || (complaint.proofs || []).length > 0 || complaint.verification);
            const proofsHtml = (complaint.proofs || []).length > 0
                ? complaint.proofs.map(proof => `
                    <div class="evidence-item" style="margin-bottom: 0.75rem;">
                        <img src="${proof.url}" alt="Proof" style="max-width: 220px;">
                        <div><small>${proof.type.replace(/_/g, ' ')} | ${new Date(proof.uploadedAt).toLocaleString()}</small></div>
                    </div>
                `).join('')
                : '<p class="text-muted">Proof is only visible to authorized users.</p>';

            const citizenActions = currentUser && currentUser.role === 'citizen' && complaint.status === 'Awaiting Citizen Verification'
                ? `
                    <div class="detail-actions mt-2">
                        <button class="btn btn-success" onclick="verifyComplaintAction('${complaint.complaintId}', 'accepted')">Accept Resolution</button>
                        <button class="btn btn-warning" onclick="verifyComplaintAction('${complaint.complaintId}', 'rejected')">Reject & Reopen</button>
                    </div>
                `
                : '';
            const verificationMarkup = hasPrivateDetails
                ? `
                    <div class="detail-item mt-2">
                        <label>Verification</label>
                        <span>${complaint.verification?.status || 'pending'}</span>
                    </div>
                    ${citizenActions}
                `
                : `
                    <div class="detail-item mt-2">
                        <label>Verification</label>
                        <span class="text-muted">Visible after secure login</span>
                    </div>
                `;
            const blockchainMarkup = auditTrail.length > 0
                ? `
                    <p><strong>Audit Entries:</strong> ${auditTrail.length}</p>
                    <p><strong>Latest Hash:</strong> <code>${auditTrail[auditTrail.length - 1].hash.substring(0, 18)}...</code></p>
                    <p class="text-success">Backed by server-side audit records</p>
                `
                : `
                    <p class="text-muted">Audit trail will appear here after complaint events are recorded.</p>
                `;

            const detailsDiv = document.getElementById('tracking-details');
            detailsDiv.innerHTML = `
                <div class="complaint-detail-card">
                    <div class="detail-header">
                        <h3>${complaint.complaintId}</h3>
                        <span class="badge badge-${getPriorityClass(complaint.priority)}">${complaint.priority}</span>
                        <span class="badge badge-${getStatusClass(complaint.status)}">${complaint.status}</span>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item"><label>Citizen Name:</label><span>${complaint.fullName || 'Protected'}</span></div>
                        <div class="detail-item"><label>Mobile:</label><span>${complaint.mobile || 'Protected'}</span></div>
                        <div class="detail-item"><label>Category:</label><span>${complaint.category}</span></div>
                        <div class="detail-item"><label>Department:</label><span>${deptName}</span></div>
                        <div class="detail-item"><label>Location:</label><span>${complaint.location.address}</span></div>
                        <div class="detail-item"><label>Description:</label><span>${complaint.description}</span></div>
                        <div class="detail-item"><label>Community Support:</label><span>👍 ${complaint.supportCount || 0}</span></div>
                        <div class="detail-item"><label>Created:</label><span>${new Date(complaint.createdAt).toLocaleString()}</span></div>
                    </div>
                    <div class="detail-evidence">
                        <label>Evidence & Completion Proof</label>
                        ${proofsHtml}
                    </div>
                    ${verificationMarkup}
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
                        <div class="blockchain-info">${blockchainMarkup}</div>
                    </div>
                </div>
            `;
            detailsDiv.style.display = 'block';
        } catch (error) {
            console.error('Error tracking complaint:', error);
            showToast(t('trackLoadError'), 'error');
        }
    }

    async function loadPublicPortal() {
        const { getStorage, renderEmptyState, getPriorityClass, getStatusClass, showNotification, t } = getContext();
        const storage = getStorage();
        const container = document.getElementById('public-complaints');
        if (!container) return;

        container.innerHTML = renderEmptyState(t('publicLoadingTitle'), t('publicLoadingMessage'));

        try {
            const complaints = await storage.getPublicComplaintsAsync();
             
            if (!complaints || !Array.isArray(complaints)) {
                container.innerHTML = `<p class="text-center text-danger">${t('publicError')}</p>`;
                showNotification?.('Failed to load public portal', 'error');
                console.error('Invalid complaints data:', complaints);
                return;
            }

            if (complaints.length === 0) {
                container.innerHTML = renderEmptyState(t('publicEmptyTitle'), t('publicEmptyMessage'));
                return;
            }

            const normalizedComplaints = complaints
                .filter(complaint => complaint && typeof complaint === 'object')
                .map(complaint => ({
                    complaintId: complaint.complaintId || 'Unknown ID',
                    priority: complaint.priority || 'Low',
                    status: complaint.status || 'Submitted',
                    category: complaint.category || 'Other',
                    description: typeof complaint.description === 'string' && complaint.description.trim()
                        ? complaint.description.trim()
                        : 'No description available.',
                    supportCount: Number(complaint.supportCount || 0),
                    location: complaint.location && typeof complaint.location === 'object'
                        ? complaint.location
                        : { address: 'Location not available' }
                }));

            if (normalizedComplaints.length === 0) {
                container.innerHTML = renderEmptyState(t('publicEmptyTitle'), t('publicEmptyMessage'));
                return;
            }

            const sortedComplaints = [...normalizedComplaints].sort((a, b) => (b.supportCount || 0) - (a.supportCount || 0));
            container.innerHTML = sortedComplaints.map(c => {
                const locationDisplay = c.location?.address || 'Location not available';
                const descriptionPreview = c.description.length > 100
                    ? `${c.description.substring(0, 100)}...`
                    : c.description;
                return `
                    <div class="public-complaint-card">
                        <div class="public-complaint-header">
                            <span class="public-complaint-id">${c.complaintId}</span>
                            <div>
                                <span class="badge badge-${getPriorityClass(c.priority)}">${c.priority}</span>
                                <span class="badge badge-${getStatusClass(c.status)}">${c.status}</span>
                            </div>
                        </div>
                        <div class="public-complaint-location">
                            <i class="fas fa-map-marker-alt"></i> ${locationDisplay}
                        </div>
                        <p><strong>${c.category}</strong></p>
                        <p>${descriptionPreview}</p>
                        <div class="public-complaint-actions">
                            <button class="btn btn-sm btn-outline" onclick="supportPublicComplaint('${c.complaintId}')">
                                👍 Support (${c.supportCount || 0})
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="viewPublicComplaint('${c.complaintId}')">
                                View Details
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Error loading public portal:', err);
            container.innerHTML = `<p class="text-center text-danger">⚠️ ${t('publicError')}</p>`;
            showNotification?.('Error loading public portal', 'error');
        }
    }

    function supportPublicComplaint(complaintId) {
        const { getStorage, getCurrentUser, showToast, openLoginModal, t } = getContext();
        const storage = getStorage();
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'citizen') {
            showToast(t('supportCitizenLogin'), 'warning');
            openLoginModal('citizen');
            return;
        }

        if (storage.apiMode) {
            storage.supportComplaintAsync(complaintId)
                .then(() => {
                    showToast(t('supportSuccessShort'), 'success');
                    loadPublicPortal();
                })
                .catch(err => showToast(err.message || t('supportError'), 'error'));
        } else {
            storage.supportComplaint(complaintId, currentUser.username || `support-${currentUser.id}`);
            showToast(t('supportSuccessShort'), 'success');
            loadPublicPortal();
        }
    }

    function viewPublicComplaint(complaintId) {
        const { showSection } = getContext();
        showSection('tracking');
        document.getElementById('tracking-id').value = complaintId;
        trackComplaint();
    }

    async function recordBlockchainEvent(complaintId, action, additionalData = {}) {
        const { getBlockchain, getStorage } = getContext();
        const blockchain = getBlockchain();
        const storage = getStorage();
        const block = await blockchain.logAction(complaintId, action, additionalData);
        try {
            await storage.addBlockchainEntryAsync(block);
        } catch (err) {
            console.warn('Blockchain persistence failed:', err);
        }
        return block;
    }

    async function loadBlockchainLog() {
        const { getBlockchain, getStorage, renderEmptyState, getActionClass } = getContext();
        const blockchain = getBlockchain();
        const storage = getStorage();
        let blocks = [];
        const container = document.getElementById('blockchain-blocks');

        if (storage.apiMode) {
            try {
                blocks = await storage.getBlockchainLogAsync();
            } catch (err) {
                console.warn('Could not load blockchain log from backend, falling back to local chain:', err);
                blocks = blockchain.getAllBlocks();
            }
        } else {
            blocks = blockchain.getAllBlocks();
        }

        blocks = (blocks || []).slice().reverse();
        if (blocks.length === 0) {
            container.innerHTML = renderEmptyState('No audit records yet', 'Audit entries will appear as soon as complaints or updates are recorded.');
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
                    <div class="block-hash">Hash: ${block.hash.substring(0, 20)}...</div>
                    <p class="text-muted" style="font-size: 0.75rem; margin-top: 0.5rem;">
                        Previous: ${block.previousHash.substring(0, 15)}...
                    </p>
                </div>
            `;
        }).join('');
    }

    window.PSCRMPublic = {
        trackComplaint,
        loadPublicPortal,
        supportPublicComplaint,
        viewPublicComplaint,
        recordBlockchainEvent,
        loadBlockchainLog
    };
})();
