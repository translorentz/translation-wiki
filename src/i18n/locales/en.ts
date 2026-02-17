const en = {
  // Header
  "nav.browse": "Browse",
  "nav.search": "Search",
  "nav.admin": "Admin",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",

  // Language switcher
  "lang.switch": "Language",
  "lang.en": "English",
  "lang.zh": "中文 (Chinese)",

  // Homepage hero
  "home.title": "Deltoi",
  "home.subtitle":
    "A collaborative wiki of interlinear translations of pre-contemporary texts.",
  "home.description":
    "The goal of this project is to allow translators and scholars to comment on, collaborate on, edit, criticise, check, and endorse translations of important texts that are not yet available in the English language. The initial translations on this website are made using artificial intelligence; this project aims to build upon that foundation to produce proper and accessible translations.",
  "home.browseTexts": "Browse Texts",
  "home.searchTexts": "Search Texts",
  "home.highlights": "Highlights",
  "home.exploreByLanguage": "Explore By Language",
  "home.exploreByCategory": "Explore By Category",
  "home.featuredTexts": "Featured Texts",

  // Browse page
  "browse.title": "Browse Texts",
  "browse.category": "Category:",
  "browse.language": "Language:",
  "browse.all": "All",
  "browse.clearFilters": "Clear all filters",
  "browse.showing": "Showing",
  "browse.texts": "texts",
  "browse.text": "text",
  "browse.in": "in",
  "browse.chapters": "chapters",
  "browse.chapter": "chapter",

  // Genre names
  "genre.philosophy": "Philosophy",
  "genre.theology": "Theology",
  "genre.devotional": "Devotional",
  "genre.commentary": "Commentary",
  "genre.literature": "Literature",
  "genre.poetry": "Poetry",
  "genre.history": "History",
  "genre.science": "Science",
  "genre.ritual": "Ritual",
  "genre.uncategorized": "Uncategorized",

  // Source language display names
  "sourcelang.zh": "Chinese",
  "sourcelang.grc": "Greek",
  "sourcelang.la": "Latin",
  "sourcelang.ta": "Tamil",
  "sourcelang.te": "Telugu",
  "sourcelang.hy": "Armenian",
  "sourcelang.it": "Italian",
  "sourcelang.ms": "Malay",
  "sourcelang.pl": "Polish",
  "sourcelang.cs": "Czech",
  "sourcelang.ru": "Russian",
  "sourcelang.tr": "Turkish",
  "sourcelang.ko": "Korean",
  "sourcelang.fa": "Persian",
  "sourcelang.chg": "Chagatai",
  "sourcelang.fr": "French",
  "sourcelang.sr": "Serbian",
  "sourcelang.de": "German",
  "sourcelang.xcl": "Classical Armenian",
  "sourcelang.ja": "Japanese",

  // Search page
  "search.title": "Search",
  "search.placeholder": "Search texts and chapters...",
  "search.filter": "Filter:",
  "search.clear": "Clear",
  "search.searchingTitles": "Searching titles...",
  "search.searchingContent": "Searching inside texts...",
  "search.noResults": "No results found for",
  "search.withFilter": "with the selected language filter",
  "search.texts": "Texts",
  "search.chapters": "Chapters",
  "search.loadMore": "Load More",
  "search.loading": "Loading...",

  // Auth - Login
  "login.title": "Sign In",
  "login.emailExists":
    "This email is already registered. Please sign in with your password.",
  "login.email": "Email",
  "login.password": "Password",
  "login.invalidCredentials": "Invalid email or password.",
  "login.signingIn": "Signing in...",
  "login.signIn": "Sign In",
  "login.or": "or",
  "login.google": "Sign in with Google",
  "login.noAccount": "Don't have an account?",
  "login.register": "Register",

  // Auth - Register
  "register.title": "Register",
  "register.inviteRequired":
    "A valid invitation token is required to register.",
  "register.userLimit":
    "User limit reached. No more registrations are accepted.",
  "register.failed": "Registration failed. Please try again.",
  "register.inviteToken": "Invitation Token",
  "register.invitePlaceholder": "Paste your invitation token",
  "register.email": "Email",
  "register.username": "Username",
  "register.password": "Password",
  "register.creating": "Creating account...",
  "register.create": "Create Account",
  "register.or": "or",
  "register.google": "Sign in with Google",
  "register.googleHint":
    "Enter an invitation token above to enable Google sign-in",
  "register.redirecting": "Redirecting...",
  "register.hasAccount": "Already have an account?",
  "register.signIn": "Sign in",

  // Profile
  "profile.title": "Profile",
  "profile.loading": "Loading profile...",
  "profile.notFound": "Profile not found.",
  "profile.accountInfo": "Account Information",
  "profile.username": "Username",
  "profile.email": "Email",
  "profile.role": "Role",
  "profile.joined": "Joined",
  "profile.signInMethods": "Sign-in methods",
  "profile.password": "Password",
  "profile.google": "Google",
  "profile.changePassword": "Change Password",
  "profile.currentPassword": "Current Password",
  "profile.newPassword": "New Password",
  "profile.confirmPassword": "Confirm New Password",
  "profile.passwordChanged": "Password changed successfully.",
  "profile.passwordMismatch": "New passwords do not match.",
  "profile.changing": "Changing...",
  "profile.deleteAccount": "Delete Account",
  "profile.deleteWarning":
    "This action is permanent. Your contributions (translations, comments) will be preserved but your account and personal data will be permanently deleted.",
  "profile.deleteButton": "Delete my account",
  "profile.deleteConfirmLabel": "Type your username {username} to confirm",
  "profile.deleting": "Deleting...",
  "profile.deleteConfirmButton": "Permanently delete my account",
  "profile.cancel": "Cancel",

  // Footer
  "footer.description":
    "Deltoi — A collaborative wiki of interlinear translations of pre-contemporary texts.",
  "footer.trial": "Trial project by Bryan Cheong.",

  // Common
  "common.loading": "Loading...",
} as const;

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;
export default en;
