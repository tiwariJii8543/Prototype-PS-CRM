(function() {
    let loginCaptcha = null;
    let signupCaptcha = null;

    function getContext() {
        return window.PSCRMAppContext;
    }

    function setCaptchaLoading(prefix, isLoading) {
        const prompt = document.getElementById(`${prefix}-captcha-prompt`);
        const refreshBtn = document.getElementById(`${prefix}-captcha-refresh`);
        if (prompt) {
            prompt.textContent = isLoading ? 'Loading captcha...' : prompt.textContent;
        }
        if (refreshBtn) {
            refreshBtn.disabled = isLoading;
        }
    }

    async function loadCaptcha(prefix) {
        const { getStorage, showToast, setFieldError } = getContext();
        const prompt = document.getElementById(`${prefix}-captcha-prompt`);
        const answerInput = document.getElementById(`${prefix}-captcha-answer`);
        const tokenInput = document.getElementById(`${prefix}-captcha-token`);
        setCaptchaLoading(prefix, true);
        try {
            const challenge = await getStorage().getCaptchaChallengeAsync();
            if (prefix === 'login') loginCaptcha = challenge;
            else signupCaptcha = challenge;
            if (prompt) prompt.textContent = `Solve: ${challenge.prompt} = ?`;
            if (answerInput) answerInput.value = '';
            if (tokenInput) tokenInput.value = challenge.token;
            setFieldError(`${prefix}-captcha-answer`, '');
        } catch (error) {
            if (prompt) prompt.textContent = 'Captcha unavailable';
            showToast(error.message || 'Unable to load captcha', 'error');
        } finally {
            setCaptchaLoading(prefix, false);
        }
    }

    function validateCaptcha(prefix) {
        const { setFieldError, t } = getContext();
        const answer = document.getElementById(`${prefix}-captcha-answer`)?.value.trim() || '';
        const token = document.getElementById(`${prefix}-captcha-token`)?.value || '';
        if (!token || !answer) {
            setFieldError(`${prefix}-captcha-answer`, t('authCaptchaRequired'));
            return null;
        }
        setFieldError(`${prefix}-captcha-answer`, '');
        return { captchaToken: token, captchaAnswer: answer };
    }

    function openUserTypeModal() {
        const { closeModal } = getContext();
        closeModal('login-modal');
        closeModal('signup-modal');
        const modal = document.getElementById('user-type-modal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
    }

    function closeUserTypeModal() {
        const modal = document.getElementById('user-type-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    function selectUserType(type) {
        const { showSection } = getContext();
        closeUserTypeModal();
        if (type === 'department') openLoginModal('department');
        else if (type === 'admin') openLoginModal('admin');
        else if (type === 'citizen') openLoginModal('citizen');
        else showSection('home');
    }

    function openSignupModal() {
        const { closeModal } = getContext();
        closeUserTypeModal();
        closeModal('login-modal');
        const modal = document.getElementById('signup-modal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
        loadCaptcha('signup');
    }

    async function handleSignup(e) {
        e.preventDefault();
        const {
            getStorage,
            setCurrentUser,
            validateSignupForm,
            setFieldError,
            t,
            showToast,
            updateUserDisplay,
            showSection,
            closeModal
        } = getContext();

        const storage = getStorage();
        const name = document.getElementById('signup-name').value.trim();
        const mobile = document.getElementById('signup-mobile').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        const submitBtn = document.getElementById('signup-submit-btn');
        const captcha = validateCaptcha('signup');

        if (!validateSignupForm({ name, mobile, email, username, password })) {
            showToast(t('authFixSignupFields'), 'warning');
            return;
        }
        if (!captcha) {
            showToast(t('authCaptchaRequired'), 'warning');
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = t('authSignupCreating');
            }
            const signupResult = await storage.registerUserAsync({
                name,
                mobile,
                email,
                username,
                password,
                preferredLanguage: storage.getCurrentLanguage ? storage.getCurrentLanguage() : 'en',
                ...captcha
            });
            if (!signupResult) {
                showToast(t('authSignupError'), 'error');
                return;
            }

            // If backend requires OTP verification, open OTP modal and don't log in yet
            if (signupResult.requiresOtp) {
                const emailDisplay = document.getElementById('signup-otp-email');
                const emailInput = document.getElementById('signup-otp-email-input');
                const devNote = document.getElementById('signup-otp-dev-note');
                if (emailDisplay) emailDisplay.textContent = signupResult.maskedEmail || signupResult.email || '';
                if (emailInput) emailInput.value = signupResult.email || '';
                if (devNote) {
                    if (signupResult.devOtp) {
                        devNote.textContent = `Dev OTP: ${signupResult.devOtp}`;
                        devNote.classList.remove('d-none');
                    } else {
                        devNote.textContent = '';
                        devNote.classList.add('d-none');
                    }
                }
            
                openSignupOtpModal();
                showToast(signupResult.message || t('authOtpSent'), 'info');
                return;
            }

            // Fallback: immediate user object returned (local mode)
            storage.setCurrentUser(signupResult);
            setCurrentUser(signupResult);
            closeModal('signup-modal');
            showSection('home');
            updateUserDisplay();
            showToast(t('authSignupSuccess'), 'success');
        } catch (err) {
            loadCaptcha('signup');
            if ((err.message || '').toLowerCase().includes('username')) {
                setFieldError('signup-username', t('authUsernameTaken'));
            }
            if ((err.message || '').toLowerCase().includes('backend server is not running')) {
                setFieldError('signup-username', t('authServerOffline'));
            }
            if ((err.message || '').toLowerCase().includes('captcha')) {
                setFieldError('signup-captcha-answer', t('authCaptchaInvalid'));
            }
            showToast(err.message || 'Signup failed', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = t('signupSubmit');
            }
        }
    }

    function openSignupOtpModal() {
        closeUserTypeModal();
        const otpModal = document.getElementById('signup-otp-modal');
        if (otpModal) {
            otpModal.classList.add('active');
            otpModal.style.display = 'flex';
        }
        const otpInput = document.getElementById('signup-otp-input');
        if (otpInput) otpInput.focus();
        
    }

    async function handleSignupOtp(e) {
        e.preventDefault();
        const { getStorage, setCurrentUser, setFieldError, t, showToast, updateUserDisplay, showSection, closeModal } = getContext();
        const storage = getStorage();
        const email = document.getElementById('signup-otp-email-input')?.value || '';
        const otp = (document.getElementById('signup-otp-input')?.value || '').trim();
        const submitBtn = document.getElementById('signup-otp-submit-btn');

        if (!email || !otp) {
            setFieldError('signup-otp-input', t('authOtpRequired'));
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = t('authVerifyingOtp');
            }
            const result = await storage.verifySignupOtpAsync(email, otp);
            if (!result) throw new Error(t('authOtpFailed'));

            storage.setCurrentUser(result);
            setCurrentUser(result);
            closeModal('signup-otp-modal');
            closeModal('signup-modal');
            showSection('home');
            updateUserDisplay();
            showToast(t('authSignupSuccess'), 'success');
        } catch (err) {
            setFieldError('signup-otp-input', err.message || t('authOtpInvalid'));
            showToast(err.message || t('authOtpInvalid'), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = t('authVerifyOtp');
            }
        }
    }

    async function resendSignupOtp() {
        const { getStorage, showToast, t } = getContext();
        const storage = getStorage();
        const email = document.getElementById('signup-otp-email-input')?.value || '';
        const resendBtn = document.getElementById('signup-otp-resend-btn');
        const devNote = document.getElementById('signup-otp-dev-note');
        const COOLDOWN_SECONDS = 30;
        let cooldownTimer = null;
        try {
            if (resendBtn) {
                resendBtn.disabled = true;
                resendBtn.textContent = `${t('authResendOtp')} (${COOLDOWN_SECONDS}s)`;
            }
            const resp = await storage.resendSignupOtpAsync(email);
            showToast(resp?.message || t('authOtpResent'), 'info');
            // start cooldown countdown
            let remaining = COOLDOWN_SECONDS;
            cooldownTimer = setInterval(() => {
                remaining -= 1;
                if (!resendBtn) return;
                if (remaining <= 0) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = t('authResendOtp');
                    clearInterval(cooldownTimer);
                } else {
                    resendBtn.textContent = `${t('authResendOtp')} (${remaining}s)`;
                }
            }, 1000);
            const emailDisplay = document.getElementById('signup-otp-email');
            if (emailDisplay && resp?.maskedEmail) emailDisplay.textContent = resp.maskedEmail;
            if (devNote) {
                if (resp?.devOtp) {
                    devNote.textContent = `Dev OTP: ${resp.devOtp}`;
                    devNote.classList.remove('d-none');
                } else {
                    devNote.textContent = '';
                    devNote.classList.add('d-none');
                }
            }
            
        } catch (err) {
            if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = t('authResendOtp'); }
            showToast(err.message || t('authOtpResendError'), 'error');
        }
    }

    

    async function handleLogin(e) {
        e.preventDefault();
        const {
            getStorage,
            setCurrentUser,
            validateLoginForm,
            setFieldError,
            showToast,
            updateUserDisplay,
            showSection,
            closeModal,
            applyTranslations,
            getLoginButtonLabel,
            t
        } = getContext();

        const storage = getStorage();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const loginRole = document.getElementById('login-role').value || 'department';
        const submitBtn = document.getElementById('login-submit-btn');
        const captcha = validateCaptcha('login');

        if (!validateLoginForm({ username, password })) {
            showToast(t('authEnterCredentials'), 'warning');
            return;
        }
        if (!captcha) {
            showToast(t('authCaptchaRequired'), 'warning');
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = t('authLoginSigningIn');
            }
            const user = await storage.loginWithCaptchaAsync({
                username,
                password,
                ...captcha
            });
            if (!user) {
                loadCaptcha('login');
                showToast(t('authInvalidCredentials'), 'error');
                return;
            }

            if (loginRole === 'department' && user.role !== 'department') {
                loadCaptcha('login');
                showToast(t('authDepartmentOnly'), 'warning');
                return;
            }
            if (loginRole === 'admin' && user.role !== 'admin') {
                loadCaptcha('login');
                showToast(t('authAdminOnly'), 'warning');
                return;
            }
            if (loginRole === 'citizen' && user.role !== 'citizen') {
                loadCaptcha('login');
                showToast(t('authCitizenOnly'), 'warning');
                return;
            }

            storage.setCurrentUser(user);
            setCurrentUser(user);
            if (user.preferredLanguage && storage.setCurrentLanguage) {
                storage.setCurrentLanguage(user.preferredLanguage);
                const languageSelect = document.getElementById('language-select');
                if (languageSelect) languageSelect.value = user.preferredLanguage;
                applyTranslations(user.preferredLanguage);
            }

            closeModal('login-modal');
            if (user.role === 'admin') showSection('admin-dashboard');
            else if (user.role === 'department') showSection('department-dashboard');
            else showSection('home');

            updateUserDisplay();
        } catch (err) {
            setFieldError('login-password', t('authCheckCredentials'));
            loadCaptcha('login');
            if ((err.message || '').toLowerCase().includes('captcha')) {
                setFieldError('login-captcha-answer', t('authCaptchaInvalid'));
            }
            showToast(err.message || t('authLoginFailed'), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = getLoginButtonLabel(loginRole);
            }
        }
    }

    function handleLogout() {
        const { getStorage, setCurrentUser, showSection } = getContext();
        const storage = getStorage();
        storage.logoutUser();
        setCurrentUser(null);
        document.getElementById('user-display').innerHTML = '';
        showSection('home');
    }

    function openLoginModal(role = 'department') {
        const { closeModal, clearFormErrors, t } = getContext();
        closeUserTypeModal();
        closeModal('signup-modal');

        const loginModal = document.getElementById('login-modal');
        const loginRoleInput = document.getElementById('login-role');
        const loginTitle = document.getElementById('login-modal-title');
        const credentialsInfo = document.getElementById('login-credentials-info');
        const rolePanel = document.getElementById('login-role-panel');
        const roleBadge = document.getElementById('login-role-badge');
        const roleHeading = document.getElementById('login-role-heading');
        const roleDescription = document.getElementById('login-role-description');
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const submitBtn = document.getElementById('login-submit-btn');
        const linkSignup = document.getElementById('login-link-signup');
        const linkCitizen = document.getElementById('login-link-citizen');
        const linkDepartment = document.getElementById('login-link-department');
        const linkAdmin = document.getElementById('login-link-admin');

        if (loginRoleInput) loginRoleInput.value = role;
        clearFormErrors(['login-username', 'login-password']);
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        const loginCaptchaAnswer = document.getElementById('login-captcha-answer');
        if (loginCaptchaAnswer) loginCaptchaAnswer.value = '';

        const roleConfig = {
            citizen: {
                title: t('authCitizenTitle'),
                badge: t('authCitizenBadge'),
                heading: t('authCitizenHeading'),
                description: t('authCitizenDescription'),
                credentials: t('authCitizenCredentials'),
                submitLabel: t('authCitizenSubmit'),
                usernamePlaceholder: t('authCitizenUsernamePlaceholder'),
                passwordPlaceholder: t('authCitizenPasswordPlaceholder'),
                panelClass: 'citizen',
                links: { signup: 'block', citizen: 'none', department: 'block', admin: 'block' }
            },
            admin: {
                title: t('authAdminTitle'),
                badge: t('authAdminBadge'),
                heading: t('authAdminHeading'),
                description: t('authAdminDescription'),
                credentials: t('authAdminCredentials'),
                submitLabel: t('authAdminSubmit'),
                usernamePlaceholder: t('authAdminUsernamePlaceholder'),
                passwordPlaceholder: t('authAdminPasswordPlaceholder'),
                panelClass: 'admin',
                links: { signup: 'none', citizen: 'block', department: 'block', admin: 'none' }
            },
            department: {
                title: t('authDepartmentTitle'),
                badge: t('authDepartmentBadge'),
                heading: t('authDepartmentHeading'),
                description: t('authDepartmentDescription'),
                credentials: t('authDepartmentCredentials'),
                submitLabel: t('authDepartmentSubmit'),
                usernamePlaceholder: t('authDepartmentUsernamePlaceholder'),
                passwordPlaceholder: t('authDepartmentPasswordPlaceholder'),
                panelClass: 'department',
                links: { signup: 'none', citizen: 'block', department: 'none', admin: 'block' }
            }
        };
        const config = roleConfig[role] || roleConfig.department;

        if (loginTitle) loginTitle.textContent = config.title;
        if (roleBadge) roleBadge.textContent = config.badge;
        if (roleHeading) roleHeading.textContent = config.heading;
        if (roleDescription) roleDescription.textContent = config.description;
        if (credentialsInfo) credentialsInfo.innerHTML = config.credentials;
        if (submitBtn) submitBtn.textContent = config.submitLabel;
        if (usernameInput) usernameInput.placeholder = config.usernamePlaceholder;
        if (passwordInput) passwordInput.placeholder = config.passwordPlaceholder;
        if (rolePanel) rolePanel.className = `auth-role-panel ${config.panelClass}`;
        if (linkSignup) linkSignup.style.display = config.links.signup;
        if (linkCitizen) linkCitizen.style.display = config.links.citizen;
        if (linkDepartment) linkDepartment.style.display = config.links.department;
        if (linkAdmin) linkAdmin.style.display = config.links.admin;

        if (loginModal) {
            loginModal.classList.add('active');
            loginModal.style.display = 'flex';
        }
        loadCaptcha('login');
    }

    window.PSCRMAuth = {
        openUserTypeModal,
        closeUserTypeModal,
        selectUserType,
        openSignupModal,
        handleSignup,
        openSignupOtpModal,
        handleSignupOtp,
        resendSignupOtp,
        handleLogin,
        handleLogout,
        openLoginModal,
        loadCaptcha
    };
})();
