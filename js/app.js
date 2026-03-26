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
let currentLanguage = 'en';
let pendingEvidenceFile = null;
let pendingResolutionProofFile = null;
const PriorityRules = {
    Road: 'High',
    Traffic: 'High',
    Water: 'High',
    Electricity: 'Critical',
    Sanitation: 'Medium',
    Parks: 'Low',
    Noise: 'Medium',
    Other: 'Low'
};
const CategoryDepartmentMap = {
    Road: 'dept_road',
    Traffic: 'dept_road',
    Water: 'dept_water',
    Electricity: 'dept_electric',
    Sanitation: 'dept_sanitation',
    Parks: 'dept_parks',
    Noise: 'dept_noise',
    Other: 'dept_admin'
};
const translations = {
    en: {
        title: 'Smart Public Service CRM',
        subtitle: 'Blockchain-Enabled Transparent Grievance Management',
        homeHeading: 'Welcome to Smart PS-CRM',
        homeBlurb: 'Report civic issues, track resolutions, and hold departments accountable through transparent blockchain-powered grievance management.',
        citizenLoginHint: 'Already registered? Citizen Login',
        loginButton: 'Login',
        submitComplaint: 'Submit Complaint',
        trackStatus: 'Track Status',
        publicPortal: 'View All Issues'
    },
    hi: {
        title: 'स्मार्ट पब्लिक सर्विस CRM',
        subtitle: 'ब्लॉकचेन-सक्षम पारदर्शी शिकायत प्रबंधन',
        homeHeading: 'स्मार्ट PS-CRM में आपका स्वागत है',
        homeBlurb: 'नागरिक समस्याएँ दर्ज करें, समाधान की स्थिति देखें और विभागों को पारदर्शी शिकायत प्रबंधन के माध्यम से जवाबदेह बनाएं।',
        citizenLoginHint: 'पहले से पंजीकृत हैं? नागरिक लॉगिन',
        loginButton: 'लॉगिन',
        submitComplaint: 'शिकायत दर्ज करें',
        trackStatus: 'स्थिति देखें',
        publicPortal: 'सभी शिकायतें देखें'
    }
};

Object.assign(translations.en, {
    docSuffix: 'Public Service Complaint Management',
    navMainMenu: 'Main Menu',
    navHome: 'Home',
    navSubmitComplaint: 'Submit Complaint',
    navTrackComplaint: 'Track Complaint',
    navPublicPortal: 'Public Portal',
    navMapView: 'Map View',
    navDepartment: 'Department',
    navDepartmentDashboard: 'Department Dashboard',
    navAdmin: 'Admin',
    navAdminDashboard: 'Admin Dashboard',
    navBlockchainLog: 'Blockchain Log',
    navAnalytics: 'Analytics',
    quickLogin: 'Login Portal',
    totalComplaints: 'Total Complaints',
    pending: 'Pending',
    resolved: 'Resolved',
    delayed: 'Delayed',
    citizenPortalTitle: '📝 Submit New Complaint',
    fullNameLabel: 'Full Name *',
    mobileLabel: 'Mobile Number *',
    locationLabel: 'Location *',
    useMyLocation: 'Use My Location',
    addressPlaceholder: 'Enter address manually',
    categoryLabel: 'Category *',
    categoryPlaceholder: 'Select Category',
    catRoad: 'Road',
    catWater: 'Water',
    catElectricity: 'Electricity',
    catSanitation: 'Sanitation',
    catParks: 'Parks',
    catTraffic: 'Traffic',
    catNoise: 'Noise',
    catOther: 'Other',
    evidenceLabel: 'Evidence (Optional)',
    capturePhoto: 'Capture Photo',
    descriptionLabel: 'Description *',
    descriptionPlaceholder: 'Describe the issue in detail...',
    submitComplaintButton: 'Submit Complaint',
    trackingTitle: '🔍 Track Your Complaint',
    trackingLabel: 'Enter Complaint ID',
    trackingPlaceholder: 'e.g., PSR-XXXXX-001',
    trackButton: 'Track',
    mapTitle: '🗺️ Complaint Map',
    publicPortalTitle: '🌍 Public Grievance Portal',
    publicPortalBlurb: 'View all civic issues and support them to help prioritize resolution.',
    welcomeTitle: 'Welcome to Smart PS-CRM',
    welcomePrompt: 'Please choose how you want to continue:',
    citizenSignup: 'Citizen Sign Up',
    citizenLogin: 'Citizen Login',
    departmentLogin: 'Department Login',
    adminLogin: 'Admin Login',
    continuePublic: 'Continue to public view',
    signupTitle: 'Citizen Sign Up',
    signupBadge: 'Citizen Access',
    signupHeading: 'Create your citizen account',
    signupDescription: 'Sign up once to submit complaints, track progress, and verify completed work.',
    nameLabel: 'Name',
    mobileShortLabel: 'Mobile',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    signupNamePlaceholder: 'Enter your name',
    signupMobilePlaceholder: 'Enter mobile number',
    signupUsernamePlaceholder: 'Choose username',
    signupPasswordPlaceholder: 'Choose password',
    signupSubmit: 'Sign Up',
    authCitizenTitle: 'Citizen Login',
    authCitizenBadge: 'Citizen Portal',
    authCitizenHeading: 'Track and verify your complaints',
    authCitizenDescription: 'Use your citizen account to submit issues, track progress, and review department proof.',
    authCitizenCredentials: '<strong>Citizen Access:</strong><br>Use the username and password you created during signup.',
    authCitizenSubmit: 'Login as Citizen',
    authCitizenUsernamePlaceholder: 'Enter citizen username',
    authCitizenPasswordPlaceholder: 'Enter your password',
    authAdminTitle: 'Admin Login',
    authAdminBadge: 'Admin Portal',
    authAdminHeading: 'Governance and oversight access',
    authAdminDescription: 'Monitor performance, review escalations, and access system-wide analytics.',
    authAdminCredentials: '<strong>Admin Demo Credentials:</strong><br>Admin: admin / admin123',
    authAdminSubmit: 'Login as Admin',
    authAdminUsernamePlaceholder: 'Enter admin username',
    authAdminPasswordPlaceholder: 'Enter admin password',
    authDepartmentTitle: 'Department Login',
    authDepartmentBadge: 'Department Portal',
    authDepartmentHeading: 'Work queue access',
    authDepartmentDescription: 'Sign in with department credentials to inspect complaints, update status, and upload proof.',
    authDepartmentCredentials: '<strong>Department Demo Credentials:</strong><br>Roads: roads / road123<br>Water: water / water123<br>Electricity: electric / electric123<br>Sanitation: sanitation / sanitation123',
    authDepartmentSubmit: 'Login as Department',
    authDepartmentUsernamePlaceholder: 'Enter department username',
    authDepartmentPasswordPlaceholder: 'Enter department password'
});

Object.assign(translations.hi, {
    docSuffix: 'लोक सेवा शिकायत प्रबंधन',
    navMainMenu: 'मुख्य मेनू',
    navHome: 'होम',
    navSubmitComplaint: 'शिकायत दर्ज करें',
    navTrackComplaint: 'शिकायत ट्रैक करें',
    navPublicPortal: 'सार्वजनिक पोर्टल',
    navMapView: 'मानचित्र दृश्य',
    navDepartment: 'विभाग',
    navDepartmentDashboard: 'विभाग डैशबोर्ड',
    navAdmin: 'एडमिन',
    navAdminDashboard: 'एडमिन डैशबोर्ड',
    navBlockchainLog: 'ब्लॉकचेन लॉग',
    navAnalytics: 'एनालिटिक्स',
    quickLogin: 'लॉगिन पोर्टल',
    totalComplaints: 'कुल शिकायतें',
    pending: 'लंबित',
    resolved: 'निस्तारित',
    delayed: 'विलंबित',
    citizenPortalTitle: '📝 नई शिकायत दर्ज करें',
    fullNameLabel: 'पूरा नाम *',
    mobileLabel: 'मोबाइल नंबर *',
    locationLabel: 'स्थान *',
    useMyLocation: 'मेरा स्थान उपयोग करें',
    addressPlaceholder: 'पता मैन्युअली दर्ज करें',
    categoryLabel: 'श्रेणी *',
    categoryPlaceholder: 'श्रेणी चुनें',
    catRoad: 'सड़क',
    catWater: 'पानी',
    catElectricity: 'बिजली',
    catSanitation: 'स्वच्छता',
    catParks: 'पार्क',
    catTraffic: 'यातायात',
    catNoise: 'शोर',
    catOther: 'अन्य',
    evidenceLabel: 'साक्ष्य (वैकल्पिक)',
    capturePhoto: 'फोटो लें',
    descriptionLabel: 'विवरण *',
    descriptionPlaceholder: 'समस्या का विस्तृत विवरण लिखें...',
    submitComplaintButton: 'शिकायत दर्ज करें',
    trackingTitle: '🔍 अपनी शिकायत ट्रैक करें',
    trackingLabel: 'शिकायत आईडी दर्ज करें',
    trackingPlaceholder: 'उदा. PSR-XXXXX-001',
    trackButton: 'ट्रैक करें',
    mapTitle: '🗺️ शिकायत मानचित्र',
    publicPortalTitle: '🌍 सार्वजनिक शिकायत पोर्टल',
    publicPortalBlurb: 'सभी नागरिक समस्याएँ देखें और समाधान की प्राथमिकता बढ़ाने के लिए समर्थन दें।',
    welcomeTitle: 'स्मार्ट PS-CRM में आपका स्वागत है',
    welcomePrompt: 'कृपया आगे बढ़ने का विकल्प चुनें:',
    citizenSignup: 'नागरिक साइन अप',
    citizenLogin: 'नागरिक लॉगिन',
    departmentLogin: 'विभाग लॉगिन',
    adminLogin: 'एडमिन लॉगिन',
    continuePublic: 'सार्वजनिक दृश्य जारी रखें',
    signupTitle: 'नागरिक साइन अप',
    signupBadge: 'नागरिक प्रवेश',
    signupHeading: 'अपना नागरिक खाता बनाएं',
    signupDescription: 'एक बार साइन अप करें और शिकायतें दर्ज करें, प्रगति देखें तथा पूर्ण कार्य की पुष्टि करें।',
    nameLabel: 'नाम',
    mobileShortLabel: 'मोबाइल',
    usernameLabel: 'यूज़रनेम',
    passwordLabel: 'पासवर्ड',
    signupNamePlaceholder: 'अपना नाम दर्ज करें',
    signupMobilePlaceholder: 'मोबाइल नंबर दर्ज करें',
    signupUsernamePlaceholder: 'यूज़रनेम चुनें',
    signupPasswordPlaceholder: 'पासवर्ड चुनें',
    signupSubmit: 'साइन अप',
    authCitizenTitle: 'नागरिक लॉगिन',
    authCitizenBadge: 'नागरिक पोर्टल',
    authCitizenHeading: 'अपनी शिकायतें ट्रैक और सत्यापित करें',
    authCitizenDescription: 'अपनी शिकायत दर्ज करने, प्रगति देखने और विभाग के प्रमाण की समीक्षा करने के लिए नागरिक खाता उपयोग करें।',
    authCitizenCredentials: '<strong>नागरिक प्रवेश:</strong><br>साइनअप के समय बनाया गया यूज़रनेम और पासवर्ड उपयोग करें।',
    authCitizenSubmit: 'नागरिक के रूप में लॉगिन',
    authCitizenUsernamePlaceholder: 'नागरिक यूज़रनेम दर्ज करें',
    authCitizenPasswordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    authAdminTitle: 'एडमिन लॉगिन',
    authAdminBadge: 'एडमिन पोर्टल',
    authAdminHeading: 'शासन और निगरानी प्रवेश',
    authAdminDescription: 'प्रदर्शन देखें, एस्केलेशन की समीक्षा करें और सिस्टम-स्तरीय एनालिटिक्स एक्सेस करें।',
    authAdminCredentials: '<strong>एडमिन डेमो क्रेडेंशियल्स:</strong><br>Admin: admin / admin123',
    authAdminSubmit: 'एडमिन के रूप में लॉगिन',
    authAdminUsernamePlaceholder: 'एडमिन यूज़रनेम दर्ज करें',
    authAdminPasswordPlaceholder: 'एडमिन पासवर्ड दर्ज करें',
    authDepartmentTitle: 'विभाग लॉगिन',
    authDepartmentBadge: 'विभाग पोर्टल',
    authDepartmentHeading: 'कार्य कतार प्रवेश',
    authDepartmentDescription: 'शिकायतें देखने, स्थिति अपडेट करने और प्रमाण अपलोड करने के लिए विभाग क्रेडेंशियल्स से लॉगिन करें।',
    authDepartmentCredentials: '<strong>विभाग डेमो क्रेडेंशियल्स:</strong><br>Roads: roads / road123<br>Water: water / water123<br>Electricity: electric / electric123<br>Sanitation: sanitation / sanitation123',
    authDepartmentSubmit: 'विभाग के रूप में लॉगिन',
    authDepartmentUsernamePlaceholder: 'विभाग यूज़रनेम दर्ज करें',
    authDepartmentPasswordPlaceholder: 'विभाग पासवर्ड दर्ज करें'
});

translations.bn = { ...translations.en, title: 'স্মার্ট পাবলিক সার্ভিস CRM', subtitle: 'ব্লকচেইন-সমর্থিত স্বচ্ছ অভিযোগ ব্যবস্থাপনা', navMainMenu: 'মূল মেনু', navHome: 'হোম', navSubmitComplaint: 'অভিযোগ জমা দিন', navTrackComplaint: 'অভিযোগ ট্র্যাক করুন', navPublicPortal: 'পাবলিক পোর্টাল', navMapView: 'মানচিত্র ভিউ', navDepartment: 'বিভাগ', navDepartmentDashboard: 'বিভাগ ড্যাশবোর্ড', navAdmin: 'অ্যাডমিন', navAdminDashboard: 'অ্যাডমিন ড্যাশবোর্ড', navBlockchainLog: 'ব্লকচেইন লগ', navAnalytics: 'অ্যানালিটিক্স', loginButton: 'লগইন', homeHeading: 'স্মার্ট PS-CRM-এ স্বাগতম', homeBlurb: 'নাগরিক সমস্যা রিপোর্ট করুন, সমাধানের অগ্রগতি দেখুন এবং বিভাগকে জবাবদিহিতার মধ্যে আনুন।', quickSubmit: 'অভিযোগ জমা দিন', quickTrack: 'স্ট্যাটাস দেখুন', quickPublic: 'সব অভিযোগ দেখুন', quickLogin: 'লগইন পোর্টাল', totalComplaints: 'মোট অভিযোগ', pending: 'অমীমাংসিত', resolved: 'সমাধানকৃত', delayed: 'বিলম্বিত', citizenPortalTitle: '📝 নতুন অভিযোগ জমা দিন', fullNameLabel: 'পূর্ণ নাম *', mobileLabel: 'মোবাইল নম্বর *', locationLabel: 'অবস্থান *', useMyLocation: 'আমার অবস্থান ব্যবহার করুন', addressPlaceholder: 'হাতে ঠিকানা লিখুন', categoryLabel: 'বিভাগ *', categoryPlaceholder: 'বিভাগ নির্বাচন করুন', catRoad: 'রাস্তা', catWater: 'পানি', catElectricity: 'বিদ্যুৎ', catSanitation: 'পরিচ্ছন্নতা', catParks: 'উদ্যান', catTraffic: 'ট্রাফিক', catNoise: 'শব্দ', catOther: 'অন্যান্য', evidenceLabel: 'প্রমাণ (ঐচ্ছিক)', capturePhoto: 'ছবি তুলুন', descriptionLabel: 'বিবরণ *', descriptionPlaceholder: 'সমস্যার বিস্তারিত লিখুন...', submitComplaintButton: 'অভিযোগ জমা দিন', trackingTitle: '🔍 আপনার অভিযোগ ট্র্যাক করুন', trackingLabel: 'অভিযোগ আইডি লিখুন', trackingPlaceholder: 'যেমন PSR-XXXXX-001', trackButton: 'ট্র্যাক করুন', mapTitle: '🗺️ অভিযোগ মানচিত্র', publicPortalTitle: '🌍 পাবলিক গ্রিভ্যান্স পোর্টাল', publicPortalBlurb: 'সব নাগরিক সমস্যা দেখুন এবং সমর্থন দিন।', welcomeTitle: 'স্মার্ট PS-CRM-এ স্বাগতম', welcomePrompt: 'কীভাবে এগোতে চান তা বেছে নিন:', citizenSignup: 'নাগরিক সাইন আপ', citizenLogin: 'নাগরিক লগইন', departmentLogin: 'বিভাগ লগইন', adminLogin: 'অ্যাডমিন লগইন', continuePublic: 'পাবলিক ভিউতে যান', signupTitle: 'নাগরিক সাইন আপ', signupBadge: 'নাগরিক প্রবেশ', signupHeading: 'আপনার নাগরিক অ্যাকাউন্ট তৈরি করুন', signupDescription: 'একবার সাইন আপ করলেই অভিযোগ জমা ও ট্র্যাক করতে পারবেন।', nameLabel: 'নাম', mobileShortLabel: 'মোবাইল', usernameLabel: 'ইউজারনেম', passwordLabel: 'পাসওয়ার্ড', signupNamePlaceholder: 'আপনার নাম লিখুন', signupMobilePlaceholder: 'মোবাইল নম্বর লিখুন', signupUsernamePlaceholder: 'ইউজারনেম বেছে নিন', signupPasswordPlaceholder: 'পাসওয়ার্ড বেছে নিন', signupSubmit: 'সাইন আপ', authCitizenTitle: 'নাগরিক লগইন', authCitizenBadge: 'নাগরিক পোর্টাল', authCitizenHeading: 'আপনার অভিযোগ ট্র্যাক ও যাচাই করুন', authCitizenDescription: 'অভিযোগ জমা, অগ্রগতি দেখা এবং প্রমাণ যাচাই করতে নাগরিক অ্যাকাউন্ট ব্যবহার করুন।', authCitizenCredentials: '<strong>নাগরিক প্রবেশ:</strong><br>সাইনআপের সময় তৈরি করা ইউজারনেম ও পাসওয়ার্ড ব্যবহার করুন।', authCitizenSubmit: 'নাগরিক হিসেবে লগইন', authCitizenUsernamePlaceholder: 'নাগরিক ইউজারনেম দিন', authCitizenPasswordPlaceholder: 'আপনার পাসওয়ার্ড দিন', authAdminTitle: 'অ্যাডমিন লগইন', authAdminBadge: 'অ্যাডমিন পোর্টাল', authAdminHeading: 'পর্যবেক্ষণ ও প্রশাসনিক প্রবেশ', authAdminDescription: 'পারফরম্যান্স, এস্কেলেশন এবং অ্যানালিটিক্স দেখুন।', authAdminCredentials: '<strong>অ্যাডমিন ডেমো তথ্য:</strong><br>Admin: admin / admin123', authAdminSubmit: 'অ্যাডমিন হিসেবে লগইন', authAdminUsernamePlaceholder: 'অ্যাডমিন ইউজারনেম দিন', authAdminPasswordPlaceholder: 'অ্যাডমিন পাসওয়ার্ড দিন', authDepartmentTitle: 'বিভাগ লগইন', authDepartmentBadge: 'বিভাগ পোর্টাল', authDepartmentHeading: 'কাজের কিউ অ্যাক্সেস', authDepartmentDescription: 'অভিযোগ দেখুন, স্ট্যাটাস আপডেট করুন এবং প্রমাণ আপলোড করুন।', authDepartmentCredentials: '<strong>বিভাগ ডেমো তথ্য:</strong><br>Roads: roads / road123<br>Water: water / water123<br>Electricity: electric / electric123<br>Sanitation: sanitation / sanitation123', authDepartmentSubmit: 'বিভাগ হিসেবে লগইন', authDepartmentUsernamePlaceholder: 'বিভাগ ইউজারনেম দিন', authDepartmentPasswordPlaceholder: 'বিভাগ পাসওয়ার্ড দিন', docSuffix: 'পাবলিক সার্ভিস অভিযোগ ব্যবস্থাপনা' };
translations.ta = { ...translations.en, title: 'ஸ்மார்ட் பொது சேவை CRM', subtitle: 'பிளாக்செயின் ஆதரவு கொண்ட வெளிப்படையான புகார் மேலாண்மை', navMainMenu: 'முக்கிய மெனு', navHome: 'முகப்பு', navSubmitComplaint: 'புகார் அளிக்கவும்', navTrackComplaint: 'புகாரை கண்காணிக்கவும்', navPublicPortal: 'பொது தளம்', navMapView: 'வரைபடக் காட்சி', navDepartment: 'துறை', navDepartmentDashboard: 'துறை டாஷ்போர்டு', navAdmin: 'நிர்வாகம்', navAdminDashboard: 'அட்மின் டாஷ்போர்டு', navBlockchainLog: 'பிளாக்செயின் பதிவு', navAnalytics: 'ஆய்வறிக்கைகள்', loginButton: 'உள்நுழைவு', homeHeading: 'ஸ்மார்ட் PS-CRM-க்கு வரவேற்கிறோம்', homeBlurb: 'குடிமக்கள் பிரச்சினைகளை புகாரளிக்கவும் மற்றும் தீர்வுகளை கண்காணிக்கவும்.', quickSubmit: 'புகார் அளிக்கவும்', quickTrack: 'நிலையை பார்க்கவும்', quickPublic: 'அனைத்து புகார்களையும் பார்க்கவும்', quickLogin: 'உள்நுழைவு தளம்', totalComplaints: 'மொத்த புகார்கள்', pending: 'நிலுவையில்', resolved: 'தீர்க்கப்பட்டது', delayed: 'தாமதமானது', citizenPortalTitle: '📝 புதிய புகார் அளிக்கவும்', fullNameLabel: 'முழுப்பெயர் *', mobileLabel: 'மொபைல் எண் *', locationLabel: 'இடம் *', useMyLocation: 'என் இருப்பிடத்தை பயன்படுத்தவும்', addressPlaceholder: 'முகவரியை கைமுறையாக உள்ளிடவும்', categoryLabel: 'வகை *', categoryPlaceholder: 'வகையைத் தேர்ந்தெடுக்கவும்', catRoad: 'சாலை', catWater: 'தண்ணீர்', catElectricity: 'மின்சாரம்', catSanitation: 'சுகாதாரம்', catParks: 'பூங்கா', catTraffic: 'போக்குவரத்து', catNoise: 'சத்தம்', catOther: 'மற்றவை', evidenceLabel: 'ஆதாரம் (விருப்பத்தேர்வு)', capturePhoto: 'புகைப்படம் எடுக்கவும்', descriptionLabel: 'விவரம் *', descriptionPlaceholder: 'பிரச்சினையை விரிவாக எழுதவும்...', submitComplaintButton: 'புகார் அளிக்கவும்', trackingTitle: '🔍 உங்கள் புகாரை கண்காணிக்கவும்', trackingLabel: 'புகார் ஐடியை உள்ளிடவும்', trackingPlaceholder: 'உதா. PSR-XXXXX-001', trackButton: 'கண்காணிக்கவும்', mapTitle: '🗺️ புகார் வரைபடம்', publicPortalTitle: '🌍 பொது குறைதீர் தளம்', publicPortalBlurb: 'அனைத்து குடிமக்கள் பிரச்சினைகளையும் பார்க்கவும் மற்றும் ஆதரவு வழங்கவும்.', welcomeTitle: 'ஸ்மார்ட் PS-CRM-க்கு வரவேற்கிறோம்', welcomePrompt: 'தொடர விரும்பும் முறையைத் தேர்ந்தெடுக்கவும்:', citizenSignup: 'குடிமக்கள் பதிவு', citizenLogin: 'குடிமக்கள் உள்நுழைவு', departmentLogin: 'துறை உள்நுழைவு', adminLogin: 'அட்மின் உள்நுழைவு', continuePublic: 'பொது பார்வைக்கு தொடரவும்', signupTitle: 'குடிமக்கள் பதிவு', signupBadge: 'குடிமக்கள் அணுகல்', signupHeading: 'உங்கள் குடிமக்கள் கணக்கை உருவாக்கவும்', signupDescription: 'புகார் அளிக்க, கண்காணிக்க, சரிபார்க்க ஒருமுறை பதிவு போதும்.', nameLabel: 'பெயர்', mobileShortLabel: 'மொபைல்', usernameLabel: 'பயனர்பெயர்', passwordLabel: 'கடவுச்சொல்', signupNamePlaceholder: 'உங்கள் பெயரை உள்ளிடவும்', signupMobilePlaceholder: 'மொபைல் எண்ணை உள்ளிடவும்', signupUsernamePlaceholder: 'பயனர்பெயரை தேர்ந்தெடுக்கவும்', signupPasswordPlaceholder: 'கடவுச்சொல்லை தேர்ந்தெடுக்கவும்', signupSubmit: 'பதிவு செய்யவும்', authCitizenTitle: 'குடிமக்கள் உள்நுழைவு', authCitizenBadge: 'குடிமக்கள் தளம்', authCitizenHeading: 'உங்கள் புகார்களை கண்காணிக்கவும்', authCitizenDescription: 'புகார் அளிக்கவும், முன்னேற்றத்தைப் பார்க்கவும், ஆதாரத்தைச் சரிபார்க்கவும்.', authCitizenCredentials: '<strong>குடிமக்கள் அணுகல்:</strong><br>பதிவின் போது உருவாக்கிய பயனர்பெயர் மற்றும் கடவுச்சொல் பயன்படுத்தவும்.', authCitizenSubmit: 'குடிமக்களாக உள்நுழைக', authCitizenUsernamePlaceholder: 'குடிமக்கள் பயனர்பெயரை உள்ளிடவும்', authCitizenPasswordPlaceholder: 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்', authAdminTitle: 'அட்மின் உள்நுழைவு', authAdminBadge: 'அட்மின் தளம்', authAdminHeading: 'மேற்பார்வை அணுகல்', authAdminDescription: 'செயல்திறன், உயர்வு, ஆய்வறிக்கைகளைப் பாருங்கள்.', authAdminCredentials: '<strong>அட்மின் டெமோ விவரங்கள்:</strong><br>Admin: admin / admin123', authAdminSubmit: 'அட்மினாக உள்நுழைக', authAdminUsernamePlaceholder: 'அட்மின் பயனர்பெயரை உள்ளிடவும்', authAdminPasswordPlaceholder: 'அட்மின் கடவுச்சொல்லை உள்ளிடவும்', authDepartmentTitle: 'துறை உள்நுழைவு', authDepartmentBadge: 'துறை தளம்', authDepartmentHeading: 'பணி வரிசை அணுகல்', authDepartmentDescription: 'புகார்களைப் பார்வையிடவும், நிலையைப் புதுப்பிக்கவும், ஆதாரம் பதிவேற்றவும்.', authDepartmentCredentials: '<strong>துறை டெமோ விவரங்கள்:</strong><br>Roads: roads / road123<br>Water: water / water123<br>Electricity: electric / electric123<br>Sanitation: sanitation / sanitation123', authDepartmentSubmit: 'துறையாக உள்நுழைக', authDepartmentUsernamePlaceholder: 'துறை பயனர்பெயரை உள்ளிடவும்', authDepartmentPasswordPlaceholder: 'துறை கடவுச்சொல்லை உள்ளிடவும்', docSuffix: 'பொது சேவை புகார் மேலாண்மை' };
translations.te = { ...translations.en, title: 'స్మార్ట్ పబ్లిక్ సర్వీస్ CRM', subtitle: 'బ్లాక్‌చెయిన్ ఆధారిత పారదర్శక ఫిర్యాదు నిర్వహణ', navMainMenu: 'ముఖ్య మెను', navHome: 'హోమ్', navSubmitComplaint: 'ఫిర్యాదు నమోదు', navTrackComplaint: 'ఫిర్యాదును ట్రాక్ చేయండి', navPublicPortal: 'పబ్లిక్ పోర్టల్', navMapView: 'మ్యాప్ వీక్షణ', navDepartment: 'శాఖ', navDepartmentDashboard: 'శాఖ డ్యాష్‌బోర్డ్', navAdmin: 'అడ్మిన్', navAdminDashboard: 'అడ్మిన్ డ్యాష్‌బోర్డ్', navBlockchainLog: 'బ్లాక్‌చెయిన్ లాగ్', navAnalytics: 'అనలిటిక్స్', loginButton: 'లాగిన్', homeHeading: 'స్మార్ట్ PS-CRM కు స్వాగతం', homeBlurb: 'పౌర సమస్యలను నమోదు చేయండి, పరిష్కారాలను ట్రాక్ చేయండి.', quickSubmit: 'ఫిర్యాదు నమోదు', quickTrack: 'స్థితి చూడండి', quickPublic: 'అన్ని సమస్యలు చూడండి', quickLogin: 'లాగిన్ పోర్టల్', totalComplaints: 'మొత్తం ఫిర్యాదులు', pending: 'పెండింగ్', resolved: 'పరిష్కరించబడినవి', delayed: 'ఆలస్యమైనవి', citizenPortalTitle: '📝 కొత్త ఫిర్యాదు నమోదు చేయండి', fullNameLabel: 'పూర్తి పేరు *', mobileLabel: 'మొబైల్ నంబర్ *', locationLabel: 'స్థానం *', useMyLocation: 'నా స్థానాన్ని ఉపయోగించండి', addressPlaceholder: 'చిరునామాను నమోదు చేయండి', categoryLabel: 'వర్గం *', categoryPlaceholder: 'వర్గాన్ని ఎంచుకోండి', catRoad: 'రోడ్డు', catWater: 'నీరు', catElectricity: 'విద్యుత్', catSanitation: 'పరిశుభ్రత', catParks: 'పార్కులు', catTraffic: 'ట్రాఫిక్', catNoise: 'శబ్దం', catOther: 'ఇతర', evidenceLabel: 'సాక్ష్యం (ఐచ్చికం)', capturePhoto: 'ఫోటో తీయండి', descriptionLabel: 'వివరణ *', descriptionPlaceholder: 'సమస్యను వివరంగా వ్రాయండి...', submitComplaintButton: 'ఫిర్యాదు నమోదు', trackingTitle: '🔍 మీ ఫిర్యాదును ట్రాక్ చేయండి', trackingLabel: 'ఫిర్యాదు ఐడీ నమోదు చేయండి', trackingPlaceholder: 'ఉదా. PSR-XXXXX-001', trackButton: 'ట్రాక్ చేయండి', mapTitle: '🗺️ ఫిర్యాదు మ్యాప్', publicPortalTitle: '🌍 పబ్లిక్ గ్రీవెన్స్ పోర్టల్', publicPortalBlurb: 'అన్ని పౌర సమస్యలను చూడండి మరియు మద్దతు ఇవ్వండి.', welcomeTitle: 'స్మార్ట్ PS-CRM కు స్వాగతం', welcomePrompt: 'దయచేసి ఎలా కొనసాగాలనుకుంటున్నారో ఎంచుకోండి:', citizenSignup: 'పౌర సైన్ అప్', citizenLogin: 'పౌర లాగిన్', departmentLogin: 'శాఖ లాగిన్', adminLogin: 'అడ్మిన్ లాగిన్', continuePublic: 'పబ్లిక్ వీక్షణకు కొనసాగండి', signupTitle: 'పౌర సైన్ అప్', signupBadge: 'పౌర ప్రవేశం', signupHeading: 'మీ పౌర ఖాతాను సృష్టించండి', signupDescription: 'ఒక్కసారి సైన్ అప్ చేస్తే ఫిర్యాదులు నమోదు చేయవచ్చు.', nameLabel: 'పేరు', mobileShortLabel: 'మొబైల్', usernameLabel: 'యూజర్‌నేమ్', passwordLabel: 'పాస్‌వర్డ్', signupNamePlaceholder: 'మీ పేరు నమోదు చేయండి', signupMobilePlaceholder: 'మొబైల్ నంబర్ నమోదు చేయండి', signupUsernamePlaceholder: 'యూజర్‌నేమ్ ఎంచుకోండి', signupPasswordPlaceholder: 'పాస్‌వర్డ్ ఎంచుకోండి', signupSubmit: 'సైన్ అప్', authCitizenTitle: 'పౌర లాగిన్', authCitizenBadge: 'పౌర పోర్టల్', authCitizenHeading: 'మీ ఫిర్యాదులను ట్రాక్ చేయండి', authCitizenDescription: 'ఫిర్యాదులు నమోదు చేయండి, పురోగతిని చూడండి, సాక్ష్యాన్ని సమీక్షించండి.', authCitizenCredentials: '<strong>పౌర ప్రవేశం:</strong><br>సైన్ అప్ సమయంలో సృష్టించిన యూజర్‌నేమ్ మరియు పాస్‌వర్డ్ ఉపయోగించండి.', authCitizenSubmit: 'పౌరునిగా లాగిన్', authCitizenUsernamePlaceholder: 'పౌర యూజర్‌నేమ్ నమోదు చేయండి', authCitizenPasswordPlaceholder: 'మీ పాస్‌వర్డ్ నమోదు చేయండి', authAdminTitle: 'అడ్మిన్ లాగిన్', authAdminBadge: 'అడ్మిన్ పోర్టల్', authAdminHeading: 'పర్యవేక్షణ ప్రవేశం', authAdminDescription: 'పనితీరు, ఎస్కలేషన్లు, అనలిటిక్స్ చూడండి.', authAdminCredentials: '<strong>అడ్మిన్ డెమో వివరాలు:</strong><br>Admin: admin / admin123', authAdminSubmit: 'అడ్మిన్‌గా లాగిన్', authAdminUsernamePlaceholder: 'అడ్మిన్ యూజర్‌నేమ్ నమోదు చేయండి', authAdminPasswordPlaceholder: 'అడ్మిన్ పాస్‌వర్డ్ నమోదు చేయండి', authDepartmentTitle: 'శాఖ లాగిన్', authDepartmentBadge: 'శాఖ పోర్టల్', authDepartmentHeading: 'వర్క్ క్యూ యాక్సెస్', authDepartmentDescription: 'ఫిర్యాదులను చూడండి, స్థితిని నవీకరించండి, సాక్ష్యాన్ని అప్‌లోడ్ చేయండి.', authDepartmentCredentials: '<strong>శాఖ డెమో వివరాలు:</strong><br>Roads: roads / road123<br>Water: water / water123<br>Electricity: electric / electric123<br>Sanitation: sanitation / sanitation123', authDepartmentSubmit: 'శాఖగా లాగిన్', authDepartmentUsernamePlaceholder: 'శాఖ యూజర్‌నేమ్ నమోదు చేయండి', authDepartmentPasswordPlaceholder: 'శాఖ పాస్‌వర్డ్ నమోదు చేయండి', docSuffix: 'ప్రజా సేవ ఫిర్యాదు నిర్వహణ' };

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
    initializeAuthValidation();
    initializeDemoData();
    updateUserDisplay();
    initializeLanguage();
    initializeNotifications();
    
    // Show home section by default (behind role selector)
    showSection('home');

    // Show role selector on first load
    if (!currentUser) openUserTypeModal();
    
    console.log('PS-CRM Application initialized successfully');
});

// Initialize navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-item, .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section) showSection(section);
        });
    });
}

function initializeLanguage() {
    const select = document.getElementById('language-select');
    if (!select) return;
    const saved = storage.getCurrentLanguage ? storage.getCurrentLanguage() : 'en';
    currentLanguage = saved;
    select.value = saved;
    applyTranslations(saved);
    select.addEventListener('change', () => {
        currentLanguage = select.value;
        storage.setCurrentLanguage(select.value);
        applyTranslations(select.value);
    });
}

function getCopy(language = currentLanguage) {
    return translations[language] || translations.en;
}

function t(key, replacements = {}, language = currentLanguage) {
    const copy = getCopy(language);
    let value = copy[key] ?? translations.en[key] ?? key;
    Object.entries(replacements).forEach(([name, replacement]) => {
        value = value.replaceAll(`{${name}}`, replacement);
    });
    return value;
}

function applyTranslations(language) {
    currentLanguage = language;
    const textMap = {
        'page-title': 'title',
        'page-subtitle': 'subtitle',
        'nav-section-main': 'navMainMenu',
        'nav-home-text': 'navHome',
        'nav-submit-text': 'navSubmitComplaint',
        'nav-track-text': 'navTrackComplaint',
        'nav-public-text': 'navPublicPortal',
        'nav-map-text': 'navMapView',
        'nav-section-department': 'navDepartment',
        'nav-department-text': 'navDepartmentDashboard',
        'nav-section-admin': 'navAdmin',
        'nav-admin-dashboard-text': 'navAdminDashboard',
        'nav-blockchain-text': 'navBlockchainLog',
        'nav-analytics-text': 'navAnalytics',
        'header-login-label': 'loginButton',
        'home-hero-title': 'homeHeading',
        'home-hero-blurb': 'homeBlurb',
        'home-total-label': 'totalComplaints',
        'home-pending-label': 'pending',
        'home-resolved-label': 'resolved',
        'home-delayed-label': 'delayed',
        'citizen-portal-title': 'citizenPortalTitle',
        'label-fullname': 'fullNameLabel',
        'label-mobile': 'mobileLabel',
        'label-location': 'locationLabel',
        'use-location-label': 'useMyLocation',
        'label-category': 'categoryLabel',
        'category-placeholder': 'categoryPlaceholder',
        'category-road': 'catRoad',
        'category-water': 'catWater',
        'category-electricity': 'catElectricity',
        'category-sanitation': 'catSanitation',
        'category-parks': 'catParks',
        'category-traffic': 'catTraffic',
        'category-noise': 'catNoise',
        'category-other': 'catOther',
        'label-evidence': 'evidenceLabel',
        'capture-photo-label': 'capturePhoto',
        'label-description': 'descriptionLabel',
        'tracking-section-title': 'trackingTitle',
        'tracking-label': 'trackingLabel',
        'map-section-title': 'mapTitle',
        'public-portal-title': 'publicPortalTitle',
        'public-portal-blurb': 'publicPortalBlurb',
        'welcome-modal-title': 'welcomeTitle',
        'welcome-modal-text': 'welcomePrompt',
        'welcome-citizen-signup': 'citizenSignup',
        'welcome-citizen-login': 'citizenLogin',
        'welcome-department-login': 'departmentLogin',
        'welcome-admin-login': 'adminLogin',
        'welcome-public-link': 'continuePublic',
        'signup-modal-title': 'signupTitle',
        'signup-badge': 'signupBadge',
        'signup-heading': 'signupHeading',
        'signup-description': 'signupDescription',
        'signup-name-label': 'nameLabel',
        'signup-mobile-label': 'mobileShortLabel',
        'signup-username-label': 'usernameLabel',
        'signup-password-label': 'passwordLabel'
        ,
        'login-username-label': 'usernameLabel',
        'login-password-label': 'passwordLabel',
        'login-link-signup-anchor': 'citizenSignup',
        'login-link-citizen-anchor': 'citizenLogin',
        'login-link-department-anchor': 'departmentLogin',
        'login-link-admin-anchor': 'adminLogin'
    };

    Object.entries(textMap).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key, {}, language);
    });

    const setPlaceholder = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.placeholder = t(key, {}, language);
    };

    setPlaceholder('address', 'addressPlaceholder');
    setPlaceholder('description', 'descriptionPlaceholder');
    setPlaceholder('tracking-id', 'trackingPlaceholder');
    setPlaceholder('signup-name', 'signupNamePlaceholder');
    setPlaceholder('signup-mobile', 'signupMobilePlaceholder');
    setPlaceholder('signup-username', 'signupUsernamePlaceholder');
    setPlaceholder('signup-password', 'signupPasswordPlaceholder');

    const quickSubmit = document.getElementById('quick-submit-btn');
    const quickTrack = document.getElementById('quick-track-btn');
    const quickPublic = document.getElementById('quick-public-btn');
    const quickLogin = document.getElementById('quick-login-btn');
    const submitBtn = document.getElementById('complaint-submit-btn');
    const trackBtn = document.getElementById('track-complaint-btn');
    const signupBtn = document.getElementById('signup-submit-btn');

    if (quickSubmit) quickSubmit.innerHTML = `<i class="fas fa-plus-circle"></i>${t('quickSubmit', {}, language)}`;
    if (quickTrack) quickTrack.innerHTML = `<i class="fas fa-search"></i>${t('quickTrack', {}, language)}`;
    if (quickPublic) quickPublic.innerHTML = `<i class="fas fa-globe"></i>${t('quickPublic', {}, language)}`;
    if (quickLogin) quickLogin.innerHTML = `<i class="fas fa-user-shield"></i>${t('quickLogin', {}, language)}`;
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${t('submitComplaintButton', {}, language)}`;
    if (trackBtn) trackBtn.innerHTML = `<i class="fas fa-search"></i> ${t('trackButton', {}, language)}`;
    if (signupBtn) signupBtn.textContent = t('signupSubmit', {}, language);

    const loginModal = document.getElementById('login-modal');
    const loginRole = document.getElementById('login-role');
    if (loginModal?.classList.contains('active') && loginRole?.value && window.PSCRMAuth?.openLoginModal) {
        window.PSCRMAuth.openLoginModal(loginRole.value);
    }

    document.title = `${t('title', {}, language)} | ${t('docSuffix', {}, language)}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3200);
}

function renderEmptyState(title, message, colspan = null) {
    const markup = `
        <div class="empty-state">
            <strong>${title}</strong>
            <span>${message}</span>
        </div>
    `;
    return colspan ? `<tr><td colspan="${colspan}">${markup}</td></tr>` : markup;
}

async function dataUrlToFile(dataUrl, filename) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

function setFieldError(fieldId, message = '') {
    const input = document.getElementById(fieldId);
    const error = document.getElementById(`${fieldId}-error`);
    if (input) {
        input.classList.toggle('is-invalid', Boolean(message));
    }
    if (error) {
        error.textContent = message;
    }
}

function clearFormErrors(fieldIds) {
    fieldIds.forEach(id => setFieldError(id, ''));
}

function initializeAuthValidation() {
    ['signup-name', 'signup-mobile', 'signup-username', 'signup-password', 'login-username', 'login-password'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => setFieldError(id, ''));
        }
    });
}

function validateSignupForm({ name, mobile, username, password }) {
    clearFormErrors(['signup-name', 'signup-mobile', 'signup-username', 'signup-password']);
    let valid = true;

    if (!name) {
        setFieldError('signup-name', t('validationNameRequired'));
        valid = false;
    }
    if (!/^\d{10}$/.test(mobile)) {
        setFieldError('signup-mobile', t('validationMobile'));
        valid = false;
    }
    if (username.length < 4) {
        setFieldError('signup-username', t('validationUsername'));
        valid = false;
    }
    if (password.length < 6) {
        setFieldError('signup-password', t('validationPassword'));
        valid = false;
    }

    return valid;
}

function validateLoginForm({ username, password }) {
    clearFormErrors(['login-username', 'login-password']);
    let valid = true;

    if (!username) {
        setFieldError('login-username', t('validationLoginUsername'));
        valid = false;
    }
    if (!password) {
        setFieldError('login-password', t('validationLoginPassword'));
        valid = false;
    }

    return valid;
}

function getLoginButtonLabel(role) {
    if (role === 'citizen') return t('authCitizenSubmit');
    if (role === 'admin') return t('authAdminSubmit');
    return t('authDepartmentSubmit');
}

window.PSCRMAppContext = {
    getStorage: () => storage,
    getBlockchain: () => blockchain,
    getCurrentUser: () => currentUser,
    setCurrentUser: (user) => { currentUser = user; },
    getPriorityRules: () => PriorityRules,
    getCategoryDepartmentMap: () => CategoryDepartmentMap,
    getPendingEvidenceFile: () => pendingEvidenceFile,
    setPendingEvidenceFile: (file) => { pendingEvidenceFile = file; },
    getPendingResolutionProofFile: () => pendingResolutionProofFile,
    setPendingResolutionProofFile: (file) => { pendingResolutionProofFile = file; },
    showToast,
    showSection,
    applyTranslations,
    t,
    getCurrentLanguage: () => currentLanguage,
    updateUserDisplay: () => updateUserDisplay(),
    closeModal: (modalId) => closeModal(modalId),
    clearFormErrors,
    setFieldError,
    validateSignupForm,
    validateLoginForm,
    getLoginButtonLabel,
    renderEmptyState,
    dataUrlToFile,
    showNotification,
    getPriorityClass: (priority) => getPriorityClass(priority),
    getStatusClass: (status) => getStatusClass(status),
    getActionClass: (action) => getActionClass(action),
    openLoginModal: (role) => openLoginModal(role),
    openSignupModal: (...args) => openSignupModal(...args),
    recordBlockchainEvent: (complaintId, action, data) => recordBlockchainEvent(complaintId, action, data),
    trackComplaint: () => trackComplaint()
};

// Navigation history stack for back behavior
let sectionHistory = [];

// Navigate back to previous section
function navigateBack() {
    if (sectionHistory.length > 0) {
        const previousSection = sectionHistory.pop();
        showSection(previousSection, { fromHistory: true });
    } else {
        showSection('home', { fromHistory: true });
    }
}

function updateBackButton() {
    const backBtn = document.getElementById('back-button');
    if (!backBtn) return;
    backBtn.style.display = sectionHistory.length > 0 && currentSection !== 'home' ? 'inline-flex' : 'none';
}

// Show specific section
function showSection(sectionId, options = {}) {
    // Manage history stack unless this transition comes from back-navigation
    if (!options.fromHistory && currentSection && currentSection !== sectionId) {
        sectionHistory.push(currentSection);
    }

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
        document.querySelectorAll('.nav-link, .nav-item').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Refresh section data
        refreshSection(sectionId);
    }

    updateBackButton();
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

    const resolutionProofInput = document.getElementById('resolution-proof');
    if (resolutionProofInput) {
        resolutionProofInput.addEventListener('input', previewResolutionProof);
    }

    const resolutionProofUpload = document.getElementById('resolution-proof-upload');
    if (resolutionProofUpload) {
        resolutionProofUpload.addEventListener('change', handleResolutionProofUpload);
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

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
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
    if (storage.apiMode) return; // skip local demo if using backend API
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
                status: 'Assigned',
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
                status: 'In Progress',
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
                status: 'Closed',
                assignedDepartment: 'dept_sanitation',
                evidence: null
            }
        ];
        
        sampleComplaints.forEach(complaint => {
            storage.saveComplaint(complaint);
            recordBlockchainEvent(complaint.complaintId, 'COMPLAINT_SUBMITTED', {
                category: complaint.category,
                priority: complaint.priority
            });
        });
        
        console.log('Sample complaints created for demo');
    }
}

// ==================== CITIZEN PORTAL ====================
const resetComplaintForm = (...args) => window.PSCRMCitizen.resetComplaintForm(...args);
const getCurrentLocation = (...args) => window.PSCRMCitizen.getCurrentLocation(...args);
const checkSimilarComplaints = (...args) => window.PSCRMCitizen.checkSimilarComplaints(...args);
const supportExistingComplaint = (...args) => window.PSCRMCitizen.supportExistingComplaint(...args);
const submitAnyway = (...args) => window.PSCRMCitizen.submitAnyway(...args);
const openCamera = (...args) => window.PSCRMCitizen.openCamera(...args);
const closeCamera = (...args) => window.PSCRMCitizen.closeCamera(...args);
const capturePhoto = (...args) => window.PSCRMCitizen.capturePhoto(...args);
const handleFileUpload = (...args) => window.PSCRMCitizen.handleFileUpload(...args);
const handleResolutionProofUpload = (...args) => window.PSCRMCitizen.handleResolutionProofUpload(...args);
const previewResolutionProof = (...args) => window.PSCRMCitizen.previewResolutionProof(...args);
const handleComplaintSubmit = (...args) => window.PSCRMCitizen.handleComplaintSubmit(...args);

// ==================== COMPLAINT TRACKING ====================
const trackComplaint = (...args) => window.PSCRMPublic.trackComplaint(...args);

// ==================== LOGIN / AUTH ====================
const openUserTypeModal = (...args) => window.PSCRMAuth.openUserTypeModal(...args);
const closeUserTypeModal = (...args) => window.PSCRMAuth.closeUserTypeModal(...args);
const selectUserType = (...args) => window.PSCRMAuth.selectUserType(...args);
const openSignupModal = (...args) => window.PSCRMAuth.openSignupModal(...args);
const handleSignup = (...args) => window.PSCRMAuth.handleSignup(...args);
const handleLogin = (...args) => window.PSCRMAuth.handleLogin(...args);
const handleLogout = (...args) => window.PSCRMAuth.handleLogout(...args);

// Update user display
function updateUserDisplay() {
    const headerLoginBtn = document.getElementById('header-login-btn');
    if (!currentUser) {
        document.getElementById('user-display').innerHTML = '';
        if (headerLoginBtn) headerLoginBtn.style.display = 'inline-flex';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.department-only').forEach(el => el.style.display = 'none');
        refreshSection(currentSection);
        return;
    }

    const roleLabel = currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'department' ? 'Department' : 'Citizen';
    const roleIcon = currentUser.role === 'admin' ? 'fas fa-shield-alt' : currentUser.role === 'department' ? 'fas fa-building' : 'fas fa-user';

    document.getElementById('user-display').innerHTML = `
        <span class="user-info">
            <i class="${roleIcon}"></i> <strong>${currentUser.name}</strong> (<small>${roleLabel}</small>)
            <button class="btn btn-sm btn-outline" onclick="handleLogout()">Logout</button>
        </span>
    `;
    if (headerLoginBtn) headerLoginBtn.style.display = 'none';

    // Show/hide nav items based on role
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.department-only').forEach(el => el.style.display = 'block');
    } else if (currentUser.role === 'department') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.department-only').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.department-only').forEach(el => el.style.display = 'none');
    }

    refreshSection(currentSection);
}

// ==================== DEPARTMENT DASHBOARD ====================
const loadDepartmentComplaints = (...args) => window.PSCRMDashboard.loadDepartmentComplaints(...args);
const viewComplaint = (...args) => window.PSCRMDashboard.viewComplaint(...args);
const handleDepartmentResponse = (...args) => window.PSCRMDashboard.handleDepartmentResponse(...args);

// ==================== ADMIN DASHBOARD ====================
const loadAdminDashboard = (...args) => window.PSCRMDashboard.loadAdminDashboard(...args);
const applyAdminFilters = (...args) => window.PSCRMDashboard.applyAdminFilters(...args);
const viewAdminComplaint = (...args) => window.PSCRMDashboard.viewAdminComplaint(...args);
const escalateComplaint = (...args) => window.PSCRMDashboard.escalateComplaint(...args);
const verifyComplaintAction = (...args) => window.PSCRMDashboard.verifyComplaintAction(...args);

// ==================== AUTO ESCALATION ====================
const checkAndEscalateComplaints = (...args) => window.PSCRMDashboard.checkAndEscalateComplaints(...args);

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
        case 'Submitted': return 'secondary';
        case 'Assigned': return 'warning';
        case 'In Progress': return 'primary';
        case 'Awaiting Citizen Verification': return 'info';
        case 'Reopened': return 'warning';
        case 'Escalated': return 'danger';
        case 'Closed': return 'success';
        default: return 'secondary';
    }
}

// Open login modal
const openLoginModal = (...args) => window.PSCRMAuth.openLoginModal(...args);

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Make functions globally available
window.showSection = showSection;
window.trackComplaint = trackComplaint;
window.viewComplaint = viewComplaint;
window.viewAdminComplaint = viewAdminComplaint;
window.escalateComplaint = escalateComplaint;
window.verifyComplaintAction = verifyComplaintAction;
window.openLoginModal = openLoginModal;
window.openUserTypeModal = openUserTypeModal;
window.openSignupModal = openSignupModal;
window.selectUserType = selectUserType;
window.closeModal = closeModal;
window.handleLogout = handleLogout;
window.getCurrentLocation = getCurrentLocation;
window.closeCamera = closeCamera;
window.supportExistingComplaint = supportExistingComplaint;
window.submitAnyway = submitAnyway;

// ==================== PUBLIC PORTAL ====================
const loadPublicPortal = (...args) => window.PSCRMPublic.loadPublicPortal(...args);

window.showToast = showToast;

// Support public complaint
const supportPublicComplaint = (...args) => window.PSCRMPublic.supportPublicComplaint(...args);

// View public complaint
const viewPublicComplaint = (...args) => window.PSCRMPublic.viewPublicComplaint(...args);
window.supportPublicComplaint = supportPublicComplaint;
window.viewPublicComplaint = viewPublicComplaint;

// ==================== BLOCKCHAIN LOG ====================

async function recordBlockchainEvent(complaintId, action, additionalData = {}) {
    return window.PSCRMPublic.recordBlockchainEvent(complaintId, action, additionalData);
}

// Load blockchain log
async function loadBlockchainLog() {
    return window.PSCRMPublic.loadBlockchainLog();
}

// Get action class for blockchain
function getActionClass(action) {
    switch(action) {
        case 'COMPLAINT_SUBMITTED': return 'info';
        case 'COMPLAINT_SUPPORTED': return 'success';
        case 'COMPLAINT_RESPONDED': return 'primary';
        case 'PROOF_ATTACHED': return 'primary';
        case 'CITIZEN_VERIFIED': return 'success';
        case 'STATUS_UPDATED': return 'warning';
        case 'ESCALATED': return 'danger';
        case 'DEADLINE_MISSED': return 'danger';
        case 'PENALTY_ADDED': return 'danger';
        case 'ADMIN_ACTION': return 'secondary';
        case 'GENESIS': return 'success';
        default: return 'secondary';
    }
}

// ==================== NOTIFICATIONS ====================

// Initialize notifications system
function initializeNotifications() {
    console.log('Notification system initialized');
}

// Show toast notification
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getNotificationIcon(type)}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, duration);
    }
}

function getNotificationIcon(type) {
    const icons = {
        'success': '✓',
        'error': '✕',
        'warning': '⚠',
        'info': 'ℹ'
    };
    return icons[type] || '•';
}

// Notify on complaint submitted
function notifyComplaintSubmitted(complaintId) {
    showNotification(
        `✓ Complaint submitted successfully! ID: ${complaintId}. Please save this for tracking.`,
        'success',
        5000
    );
}

// Notify on status change
function notifyStatusChanged(complaintId, newStatus) {
    const messages = {
        'Pending': '📋 Your complaint has been registered.',
        'Verified': '✓ Your complaint has been verified.',
        'Work Started': '🔨 Work has started on your complaint.',
        'Resolved': '🎉 Your complaint has been resolved!',
        'Delayed': '⚠️ Your complaint has been escalated due to delay.'
    };
    
    showNotification(
        `${messages[newStatus] || `Status updated to ${newStatus}`}`,
        newStatus === 'Resolved' ? 'success' : newStatus === 'Delayed' ? 'warning' : 'info',
        5000
    );
}

// Notify complaint escalated
function notifyEscalated(complaintId, reason = '') {
    showNotification(
        `⚠️ Complaint #${complaintId} has been escalated. ${reason}`,
        'warning',
        5000
    );
}

// Notify department response received
function notifyDepartmentResponse(complaintId) {
    showNotification(
        `📌 The department has responded to your complaint #${complaintId}. Please check the details.`,
        'info',
        5000
    );
}

// Notify deadline approaching
function notifyDeadlineApproaching(complaintId, daysLeft) {
    showNotification(
        `⏰ Complaint #${complaintId} deadline approaching in ${daysLeft} day(s). Please take action.`,
        'warning',
        6000
    );
}

// Notify support added
function notifySupportAdded(complaintId, totalSupport) {
    showNotification(
        `👍 Your complaint #${complaintId} now has ${totalSupport} support votes!`,
        'success',
        3000
    );
}

// Notify error
function notifyError(message) {
    showNotification(
        `❌ Error: ${message}`,
        'error',
        5000
    );
}

// Notify login success
function notifyLoginSuccess(username, role) {
    showNotification(
        `✓ Welcome back, ${username}! Logged in as ${role.toUpperCase()}.`,
        'success',
        4000
    );
}

// Notify logout
function notifyLogout() {
    showNotification(
        `You have been logged out.`,
        'info',
        3000
    );
}

// Notify new complaint assigned (for departments)
function notifyComplaintAssigned(complaintId, category) {
    showNotification(
        `📬 New complaint assigned: #${complaintId} (${category}). Please review and respond.`,
        'warning',
        6000
    );
}

// ==================== HOME STATISTICS ====================

// Update home section statistics
async function updateHomeStats() {
    const stats = await storage.getStatisticsAsync();
    
    const homeTotal = document.getElementById('home-total');
    const homePending = document.getElementById('home-pending');
    const homeResolved = document.getElementById('home-resolved');
    const homeDelayed = document.getElementById('home-delayed');
    
    if (homeTotal) homeTotal.textContent = stats.total;
    if (homePending) homePending.textContent = stats.pending;
    if (homeResolved) homeResolved.textContent = stats.resolved;
    if (homeDelayed) homeDelayed.textContent = stats.delayed;
}
