(function() {
    function getContext() {
        return window.PSCRMAppContext;
    }

    function resetComplaintForm() {
        const { getCurrentUser, setPendingEvidenceFile } = getContext();
        const currentUser = getCurrentUser();
        const form = document.getElementById('complaint-form');
        if (form) form.reset();

        document.getElementById('location-display').textContent = '';
        document.getElementById('evidence-preview').innerHTML = '';
        document.getElementById('similar-complaints').innerHTML = '';
        document.getElementById('duplicate-warning').style.display = 'none';
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        document.getElementById('captured-image').value = '';
        const evidenceUpload = document.getElementById('evidence-upload');
        if (evidenceUpload) evidenceUpload.value = '';
        setPendingEvidenceFile(null);

        if (currentUser?.role === 'citizen') {
            document.getElementById('fullname').value = currentUser.name || '';
            document.getElementById('mobile').value = currentUser.mobile || '';
        }
    }

    function getCurrentLocation() {
        const { showToast, t } = getContext();
        if (!navigator.geolocation) {
            showToast(t('geolocationUnsupported'), 'warning');
            return;
        }

        const btn = document.getElementById('get-location-btn');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> ${t('gettingLocation')}`;

        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById('latitude').value = lat;
                document.getElementById('longitude').value = lng;
                document.getElementById('location-display').textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
                document.getElementById('address').value = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                btn.disabled = false;
                btn.innerHTML = `📍 ${t('locationButtonReady')}`;
                checkSimilarComplaints();
            },
            error => {
                showToast(t('locationError', { message: error.message }), 'error');
                btn.disabled = false;
                btn.innerHTML = `📍 ${t('locationButtonReady')}`;
            }
        );
    }

    function checkSimilarComplaints() {
        const { getStorage, getStatusClass, t } = getContext();
        const storage = getStorage();
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
            warningDiv.innerHTML = `⚠️ ${t('duplicateFound', { count: String(similarComplaints.length) })}`;

            similarDiv.innerHTML = similarComplaints.map(c => `
                <div class="similar-complaint-card">
                    <div class="similar-complaint-info">
                        <strong>${c.complaintId}</strong> - ${c.category}
                        <br>${t('duplicateStatus')}: <span class="badge badge-${getStatusClass(c.status)}">${c.status}</span>
                        <br>${t('duplicateSupports')}: ${c.supportCount || 0}
                    </div>
                    <div class="similar-complaint-actions">
                        <button class="support-existing-btn btn btn-sm btn-success" data-complaint-id="${c.complaintId}">
                            👍 ${t('duplicateSupportBtn')}
                        </button>
                        <button class="submit-anyway-btn btn btn-sm btn-outline" data-complaint-id="${c.complaintId}">
                            ${t('duplicateSubmitAnyway')}
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('duplicate-warning').style.display = 'none';
            document.getElementById('similar-complaints').innerHTML = '';
        }
    }

    function supportExistingComplaint(complaintId) {
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
                    showToast(t('supportSuccess'), 'success');
                    checkSimilarComplaints();
                })
                .catch(err => showToast(err.message || t('supportError'), 'error'));
        } else {
            storage.supportComplaint(complaintId, currentUser.username || `support-${currentUser.id}`);
            showToast(t('supportSuccess'), 'success');
            checkSimilarComplaints();
        }
    }

    function submitAnyway() {
        document.getElementById('duplicate-warning').style.display = 'none';
        document.getElementById('similar-complaints').innerHTML = '';
    }

    function openCamera() {
        const { showToast, t } = getContext();
        const video = document.getElementById('camera-video');
        const cameraModal = document.getElementById('camera-modal');

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
                video.style.display = 'block';
                cameraModal.style.display = 'flex';
            })
            .catch(err => showToast(t('cameraAccessError', { message: err.message }), 'error'));
    }

    function closeCamera() {
        const video = document.getElementById('camera-video');
        const cameraModal = document.getElementById('camera-modal');
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        video.style.display = 'none';
        cameraModal.style.display = 'none';
    }

    function capturePhoto() {
        const { setPendingEvidenceFile, t } = getContext();
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        const preview = document.getElementById('evidence-preview');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg');
        document.getElementById('captured-image').value = imageData;
        setPendingEvidenceFile(null);
        canvas.toBlob(blob => {
            if (blob) {
                setPendingEvidenceFile(new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            }
        }, 'image/jpeg', 0.9);

        preview.innerHTML = `
            <div class="evidence-item">
                <img src="${imageData}" alt="Captured Evidence" style="max-width: 200px;">
                <span class="badge badge-success">${t('cameraCaptureBadge')}</span>
            </div>
        `;

        closeCamera();
    }

    function handleFileUpload(e) {
        const { setPendingEvidenceFile, t } = getContext();
        const file = e.target.files[0];
        const preview = document.getElementById('evidence-preview');
        if (!file) return;

        setPendingEvidenceFile(file);
        const objectUrl = URL.createObjectURL(file);
        preview.innerHTML = `
            <div class="evidence-item">
                <img src="${objectUrl}" alt="Uploaded Evidence" style="max-width: 200px;">
                <span class="badge badge-info">${t('uploadBadge')}</span>
            </div>
        `;
        document.getElementById('captured-image').value = '';
    }

    function handleResolutionProofUpload(e) {
        const { setPendingResolutionProofFile } = getContext();
        const file = e.target.files[0];
        if (!file) return;
        setPendingResolutionProofFile(file);
        document.getElementById('resolution-proof').value = '';
        previewResolutionProof();
    }

    function previewResolutionProof() {
        const { getPendingResolutionProofFile, t } = getContext();
        const proofValue = document.getElementById('resolution-proof')?.value;
        const preview = document.getElementById('resolution-proof-preview');
        if (!preview) return;

        if (!proofValue) {
            if (getPendingResolutionProofFile()) {
                const objectUrl = URL.createObjectURL(getPendingResolutionProofFile());
                preview.innerHTML = `
                    <div class="evidence-item">
                        <img src="${objectUrl}" alt="Resolution proof preview" style="max-width: 200px;">
                        <span class="badge badge-info">${t('proofPreview')}</span>
                    </div>
                `;
                return;
            }
            preview.innerHTML = '';
            return;
        }

        if (proofValue.startsWith('data:image') || /^https?:\/\//.test(proofValue)) {
            preview.innerHTML = `
                <div class="evidence-item">
                    <img src="${proofValue}" alt="Resolution proof preview" style="max-width: 200px;">
                    <span class="badge badge-info">${t('proofPreview')}</span>
                </div>
            `;
            return;
        }

        preview.innerHTML = `<small class="text-muted">${t('proofPreviewHint')}</small>`;
    }

    async function handleComplaintSubmit(e) {
        e.preventDefault();
        const {
            getStorage,
            getCurrentUser,
            getPendingEvidenceFile,
            getPriorityRules,
            getCategoryDepartmentMap,
            dataUrlToFile,
            recordBlockchainEvent,
            showToast,
            openSignupModal,
            trackComplaint,
            t
        } = getContext();
        const storage = getStorage();
        const currentUser = getCurrentUser();

        if (!currentUser || currentUser.role !== 'citizen') {
            showToast(t('complaintLoginRequired'), 'warning');
            openSignupModal();
            return;
        }

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner"></span> ${t('complaintSubmitting')}`;

        try {
            const fullName = document.getElementById('fullname').value;
            const mobile = document.getElementById('mobile').value;
            const address = document.getElementById('address').value;
            const category = document.getElementById('category').value;
            const description = document.getElementById('description').value;
            const lat = parseFloat(document.getElementById('latitude').value) || 0;
            const lng = parseFloat(document.getElementById('longitude').value) || 0;

            let evidence = document.getElementById('captured-image').value;
            if (storage.apiMode) {
                if (getPendingEvidenceFile()) {
                    const uploadedEvidence = await storage.uploadFileAsync(getPendingEvidenceFile());
                    evidence = uploadedEvidence.url;
                } else if (evidence.startsWith('data:image')) {
                    const cameraFile = await dataUrlToFile(evidence, `camera-capture-${Date.now()}.jpg`);
                    const uploadedEvidence = await storage.uploadFileAsync(cameraFile);
                    evidence = uploadedEvidence.url;
                }
            }

            const priority = getPriorityRules()[category] || 'Low';
            const department = getCategoryDepartmentMap()[category] || 'dept_admin';
            const complaint = {
                complaintId: storage.generateComplaintId(),
                fullName,
                mobile,
                location: { address, lat, lng },
                category,
                description,
                priority,
                status: 'Assigned',
                assignedDepartment: department,
                evidence,
                submittedBy: currentUser.id || 'citizen'
            };

            await storage.saveComplaintAsync(complaint);
            await recordBlockchainEvent(complaint.complaintId, 'COMPLAINT_SUBMITTED', {
                category,
                priority,
                department
            });
            showToast(t('complaintSubmitted', { id: complaint.complaintId }), 'success');
            resetComplaintForm();
            document.getElementById('tracking-id').value = complaint.complaintId;
            trackComplaint();
        } catch (error) {
            console.error('Error submitting complaint:', error);
            showToast(t('complaintSubmitError'), 'error');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = t('submitComplaintButton');
    }

    window.PSCRMCitizen = {
        resetComplaintForm,
        getCurrentLocation,
        checkSimilarComplaints,
        supportExistingComplaint,
        submitAnyway,
        openCamera,
        closeCamera,
        capturePhoto,
        handleFileUpload,
        handleResolutionProofUpload,
        previewResolutionProof,
        handleComplaintSubmit
    };
})();
