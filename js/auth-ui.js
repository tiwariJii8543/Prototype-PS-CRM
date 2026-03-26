(function() {
    function getContext() {
        return window.PSCRMAppContext;
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
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        const submitBtn = document.getElementById('signup-submit-btn');

        if (!validateSignupForm({ name, mobile, username, password })) {
            showToast(t('authFixSignupFields'), 'warning');
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
                username,
                password,
                preferredLanguage: storage.getCurrentLanguage ? storage.getCurrentLanguage() : 'en'
            });
            if (!signupResult) {
                showToast(t('authSignupError'), 'error');
                return;
            }

            storage.setCurrentUser(signupResult);
            setCurrentUser(signupResult);
            closeModal('signup-modal');
            showSection('home');
            updateUserDisplay();
            showToast(t('authSignupSuccess'), 'success');
        } catch (err) {
            if ((err.message || '').toLowerCase().includes('username')) {
                setFieldError('signup-username', t('authUsernameTaken'));
            }
            if ((err.message || '').toLowerCase().includes('backend server is not running')) {
                setFieldError('signup-username', t('authServerOffline'));
            }
            showToast(err.message || 'Signup failed', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = t('signupSubmit');
            }
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

        if (!validateLoginForm({ username, password })) {
            showToast(t('authEnterCredentials'), 'warning');
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = t('authLoginSigningIn');
            }
            const user = await storage.authenticateUserAsync(username, password);
            if (!user) {
                showToast(t('authInvalidCredentials'), 'error');
                return;
            }

            if (loginRole === 'department' && user.role !== 'department') {
                showToast(t('authDepartmentOnly'), 'warning');
                return;
            }
            if (loginRole === 'admin' && user.role !== 'admin') {
                showToast(t('authAdminOnly'), 'warning');
                return;
            }
            if (loginRole === 'citizen' && user.role !== 'citizen') {
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
    }

    window.PSCRMAuth = {
        openUserTypeModal,
        closeUserTypeModal,
        selectUserType,
        openSignupModal,
        handleSignup,
        handleLogin,
        handleLogout,
        openLoginModal
    };
})();
