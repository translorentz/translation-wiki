import type { Translations } from "./en";

const hi: Translations = {
  // Header
  "nav.browse": "ब्राउज़ करें",
  "nav.search": "खोजें",
  "nav.admin": "प्रबंधन",
  "nav.signIn": "साइन इन करें",
  "nav.signOut": "साइन आउट करें",

  // Language switcher
  "lang.switch": "भाषा",
  "lang.en": "English",
  "lang.cn": "中文 (Chinese)",
  "lang.hi": "हिंदी (Hindi)",

  // Homepage hero
  "home.title": "Deltoi",
  "home.subtitle": "प्राचीन ग्रंथों के पंक्तिबद्ध अनुवाद का सहयोगी विकी।",
  "home.description":
    "इस परियोजना का लक्ष्य अनुवादकों और विद्वानों को एक ऐसा मंच प्रदान करना है जहाँ वे महत्वपूर्ण ग्रंथों पर टिप्पणी, सहयोग, संपादन, आलोचना, जाँच और अनुमोदन कर सकें, जिनके अभी तक अंग्रेजी या चीनी में अनुवाद उपलब्ध नहीं हैं। इस वेबसाइट पर प्रारंभिक अनुवाद कृत्रिम बुद्धिमत्ता द्वारा किए गए हैं; इस परियोजना का उद्देश्य उस आधार पर उचित और सुलभ अनुवाद तैयार करना है।",
  "home.browseTexts": "ग्रंथ ब्राउज़ करें",
  "home.searchTexts": "ग्रंथ खोजें",
  "home.highlights": "मुख्य आकर्षण",
  "home.exploreByLanguage": "भाषा के अनुसार खोजें",
  "home.exploreByCategory": "श्रेणी के अनुसार खोजें",
  "home.featuredTexts": "चुनिंदा ग्रंथ",

  // Browse page
  "browse.title": "ग्रंथ ब्राउज़ करें",
  "browse.category": "श्रेणी:",
  "browse.language": "भाषा:",
  "browse.all": "सभी",
  "browse.clearFilters": "सभी फ़िल्टर हटाएँ",
  "browse.showing": "दिखाया जा रहा है",
  "browse.texts": "ग्रंथ",
  "browse.text": "ग्रंथ",
  "browse.in": "में",
  "browse.chapters": "अध्याय",
  "browse.chapter": "अध्याय",

  // Genre names
  "genre.philosophy": "दर्शन",
  "genre.theology": "धर्मशास्त्र",
  "genre.devotional": "भक्ति",
  "genre.commentary": "टीका",
  "genre.literature": "साहित्य",
  "genre.poetry": "कविता",
  "genre.history": "इतिहास",
  "genre.science": "विज्ञान",
  "genre.ritual": "अनुष्ठान",
  "genre.uncategorized": "अवर्गीकृत",

  // Source language display names
  "sourcelang.zh": "चीनी",
  "sourcelang.grc": "यूनानी",
  "sourcelang.la": "लातीनी",
  "sourcelang.ta": "तमिल",
  "sourcelang.te": "तेलुगु",
  "sourcelang.hy": "आर्मेनियाई",
  "sourcelang.it": "इतालवी",
  "sourcelang.ms": "मलय",
  "sourcelang.pl": "पोलिश",
  "sourcelang.cs": "चेक",
  "sourcelang.ru": "रूसी",
  "sourcelang.tr": "तुर्की",
  "sourcelang.ko": "कोरियाई",
  "sourcelang.fa": "फ़ारसी",
  "sourcelang.chg": "चग़ताई",
  "sourcelang.fr": "फ़्रेंच",
  "sourcelang.sr": "सर्बियाई",
  "sourcelang.de": "जर्मन",
  "sourcelang.xcl": "शास्त्रीय आर्मेनियाई",
  "sourcelang.ja": "जापानी",
  "sourcelang.el": "आधुनिक यूनानी",
  "sourcelang.am": "अम्हारिक",
  "sourcelang.sq": "अल्बानियाई",

  // Search page
  "search.title": "खोजें",
  "search.placeholder": "ग्रंथ और अध्याय खोजें...",
  "search.filter": "फ़िल्टर:",
  "search.clear": "हटाएँ",
  "search.searchingTitles": "शीर्षक खोजे जा रहे हैं...",
  "search.searchingContent": "ग्रंथों की सामग्री में खोज रहे हैं...",
  "search.noResults": "के लिए कोई परिणाम नहीं मिला",
  "search.withFilter": "चयनित भाषा फ़िल्टर के साथ",
  "search.texts": "ग्रंथ",
  "search.chapters": "अध्याय",
  "search.loadMore": "और लोड करें",
  "search.loading": "लोड हो रहा है...",
  "search.searchContent": "ग्रंथों के भीतर खोजें",

  // Auth - Login
  "login.title": "साइन इन करें",
  "login.emailExists": "यह ईमेल पहले से पंजीकृत है। कृपया अपने पासवर्ड से साइन इन करें।",
  "login.email": "ईमेल",
  "login.password": "पासवर्ड",
  "login.invalidCredentials": "अमान्य ईमेल या पासवर्ड।",
  "login.signingIn": "साइन इन हो रहा है...",
  "login.signIn": "साइन इन करें",
  "login.or": "या",
  "login.google": "Google से साइन इन करें",
  "login.noAccount": "खाता नहीं है?",
  "login.register": "रजिस्टर करें",

  // Auth - Register
  "register.title": "रजिस्टर करें",
  "register.inviteRequired": "रजिस्टर करने के लिए वैध निमंत्रण टोकन आवश्यक है।",
  "register.userLimit": "उपयोगकर्ता सीमा पूर्ण। कोई नया पंजीकरण स्वीकार नहीं किया जा रहा है।",
  "register.failed": "पंजीकरण विफल। कृपया पुनः प्रयास करें।",
  "register.inviteToken": "निमंत्रण टोकन",
  "register.invitePlaceholder": "अपना निमंत्रण टोकन पेस्ट करें",
  "register.email": "ईमेल",
  "register.username": "उपयोगकर्ता नाम",
  "register.password": "पासवर्ड",
  "register.creating": "खाता बनाया जा रहा है...",
  "register.create": "खाता बनाएँ",
  "register.or": "या",
  "register.google": "Google से साइन इन करें",
  "register.googleHint": "Google साइन-इन सक्षम करने के लिए ऊपर निमंत्रण टोकन दर्ज करें",
  "register.redirecting": "पुनर्निर्देशित किया जा रहा है...",
  "register.hasAccount": "पहले से खाता है?",
  "register.signIn": "साइन इन करें",

  // Profile
  "profile.title": "प्रोफ़ाइल",
  "profile.loading": "प्रोफ़ाइल लोड हो रही है...",
  "profile.notFound": "प्रोफ़ाइल नहीं मिली।",
  "profile.accountInfo": "खाता जानकारी",
  "profile.username": "उपयोगकर्ता नाम",
  "profile.email": "ईमेल",
  "profile.role": "भूमिका",
  "profile.joined": "शामिल हुए",
  "profile.signInMethods": "साइन-इन विधियाँ",
  "profile.password": "पासवर्ड",
  "profile.google": "Google",
  "profile.changePassword": "पासवर्ड बदलें",
  "profile.currentPassword": "वर्तमान पासवर्ड",
  "profile.newPassword": "नया पासवर्ड",
  "profile.confirmPassword": "नया पासवर्ड पुष्टि करें",
  "profile.passwordChanged": "पासवर्ड सफलतापूर्वक बदल दिया गया।",
  "profile.passwordMismatch": "नए पासवर्ड मेल नहीं खाते।",
  "profile.changing": "बदल रहा है...",
  "profile.deleteAccount": "खाता हटाएँ",
  "profile.deleteWarning":
    "यह क्रिया स्थायी है। आपके योगदान (अनुवाद, टिप्पणियाँ) संरक्षित रहेंगे लेकिन आपका खाता और व्यक्तिगत डेटा स्थायी रूप से हटा दिया जाएगा।",
  "profile.deleteButton": "मेरा खाता हटाएँ",
  "profile.deleteConfirmLabel": "पुष्टि के लिए अपना उपयोगकर्ता नाम {username} टाइप करें",
  "profile.deleting": "हटाया जा रहा है...",
  "profile.deleteConfirmButton": "मेरा खाता स्थायी रूप से हटाएँ",
  "profile.cancel": "रद्द करें",

  // Footer
  "footer.description": "Deltoi — प्राचीन ग्रंथों के पंक्तिबद्ध अनुवाद का सहयोगी विकी।",
  "footer.trial": "Bryan Cheong द्वारा प्रायोगिक परियोजना। सामग्री लाइसेंस प्राप्त है",
  "footer.license": "CC BY-NC-SA 4.0",
  "footer.licenseSuffix": " के तहत।",

  // Common
  "common.loading": "लोड हो रहा है...",
  "common.cancel": "रद्द करें",
  "common.saving": "सहेजा जा रहा है...",
  "common.by": "द्वारा",

  // Text detail page
  "textDetail.chapters": "अध्याय",
  "textDetail.chaptersCount": "अध्याय ({count})",
  "textDetail.noChapters": "अभी तक कोई अध्याय नहीं जोड़े गए हैं।",

  // Chapter page
  "chapter.chapterOf": "अध्याय {n}, कुल {m} में से",
  "chapter.editTranslation": "अनुवाद संपादित करें",
  "chapter.editSource": "मूल संपादित करें",
  "chapter.history": "इतिहास",
  "chapter.discussion": "चर्चा",
  "chapter.translatedBy": "{name} द्वारा अनुवादित",
  "chapter.previous": "पिछला",
  "chapter.next": "अगला",

  // Interlinear viewer
  "interlinear.source": "मूल",
  "interlinear.translation": "अनुवाद",
  "interlinear.noContent": "इस अध्याय के लिए कोई सामग्री उपलब्ध नहीं है।",
  "interlinear.notTranslated": "अभी अनुवादित नहीं",
  "interlinear.sourceRemoved": "मूल पैराग्राफ़ हटाया गया",
  "interlinear.showOriginal": "मूल दिखाएँ",
  "interlinear.hideOriginal": "मूल छुपाएँ",
  "interlinear.showOriginalText": "मूल पाठ दिखाएँ",
  "interlinear.hideOriginalText": "मूल पाठ छुपाएँ",

  // Featured texts / browse
  "featured.sort": "क्रमबद्ध करें:",
  "featured.sortTitle": "शीर्षक",
  "featured.sortAuthor": "लेखक",
  "featured.works": "{count} कृतियाँ",
  "featured.work": "{count} कृति",
  "featured.ch": "अध्याय",
  "featured.texts": "{count} ग्रंथ",
  "featured.text": "{count} ग्रंथ",
  "featured.noTexts": "इस भाषा में अभी कोई ग्रंथ नहीं हैं।",
  "featured.noMatch": "वर्तमान फ़िल्टर से कोई ग्रंथ मेल नहीं खाते।",

  // Highlight cards
  "highlights.zhuziyulei": "झू शी के शिष्यों द्वारा लिखा गया नव-कन्फ्यूशियाई दर्शन।",
  "highlights.centanni": "एक शताब्दी की उथल-पुथल के दौरान मिलान का व्यापक उपन्यास।",
  "highlights.romaike": "उत्तर बीज़ान्टियम में दरबारी राजनीति, गृहयुद्ध और धार्मिक मतभेद।",
  "highlights.dongpozhilin": "निर्वासन में सू शी द्वारा उपाख्यान, स्वप्न और ध्यान।",
  "highlights.paluba":
    "एक आत्म-जागरूक कथाकार के माध्यम से मनोवैज्ञानिक यथार्थवाद को विखंडित करने वाला पोलिश मेटा-कथात्मक उपन्यास।",
  "highlights.shahnameh":
    "फ़ारसी राष्ट्रीय महाकाव्य — पचास हज़ार दोहों में मिथक, वीरता और साम्राज्य।",

  // Editor
  "editor.enterTranslation": "अनुवाद दर्ज करें...",
  "editor.enterSource": "मूल पाठ दर्ज करें...",
  "editor.editSummary": "संपादन सारांश (वैकल्पिक)",
  "editor.describChanges": "अपने परिवर्तनों का वर्णन करें...",
  "editor.saveTranslation": "अनुवाद सहेजें",
  "editor.saveSource": "मूल सहेजें",
  "editor.failedSave": "सहेजने में विफल:",
  "editor.paragraph": "पैराग्राफ़",
  "editor.translationRemoved": "(अनुवाद भी हटा दिया जाएगा)",
  "editor.restore": "पुनर्स्थापित करें",
  "editor.delete": "हटाएँ",
  "editor.paragraphRemoved": "यह पैराग्राफ़ हटा दिया गया है",
  "editor.deleteWithTranslation": "अनुवाद के साथ पैराग्राफ़ हटाएँ",
  "editor.deleteConfirmation": "इस पैराग्राफ़ का एक मौजूदा अनुवाद है। क्या आप अनुवाद भी हटाना चाहेंगे, या उसे रखेंगे?",
  "editor.keepTranslation": "अनुवाद रखें",
  "editor.deleteBoth": "दोनों हटाएँ",
  "editor.ccNotice":
    "Deltoi पर जारी अनुवाद Creative Commons BY-NC-SA के तहत प्रकाशित किए जाते हैं।",

  // Discussion
  "discussion.noThreads": "अभी कोई चर्चा धागा नहीं है। बातचीत शुरू करने वाले पहले व्यक्ति बनें।",
  "discussion.pinned": "पिन किया गया",
  "discussion.resolved": "हल किया गया",
  "discussion.reply": "उत्तर",
  "discussion.replies": "उत्तर",
  "discussion.replyButton": "उत्तर दें",
  "discussion.reopen": "पुनः खोलें",
  "discussion.markResolved": "हल किया गया चिह्नित करें",
  "discussion.unpin": "अनपिन करें",
  "discussion.pin": "पिन करें",
  "discussion.signInToReply": "इस चर्चा का उत्तर देने के लिए साइन इन करें।",
  "discussion.startedBy": "द्वारा आरंभ किया गया",
  "discussion.title": "शीर्षक",
  "discussion.topicPlaceholder": "चर्चा विषय",
  "discussion.content": "सामग्री",
  "discussion.writePlaceholder": "अपने विचार लिखें...",
  "discussion.creating": "बनाया जा रहा है...",
  "discussion.createThread": "धागा बनाएँ",
  "discussion.replyPlaceholder": "उत्तर लिखें...",
  "discussion.posting": "पोस्ट किया जा रहा है...",
  "discussion.postReply": "उत्तर पोस्ट करें",

  // History
  "history.noHistory": "कोई संपादन इतिहास नहीं।",
  "history.versions": "संस्करण",
  "history.version": "संस्करण",
  "history.on": "को",
  "history.selectVersion": "देखने के लिए एक संस्करण चुनें।",
  "history.translationHistory": "अनुवाद इतिहास ({count})",
  "history.sourceHistory": "मूल इतिहास ({count})",
  "history.noTranslationHistory": "इस अध्याय के लिए अभी तक कोई अनुवाद इतिहास नहीं है।",
  "history.noSourceHistory": "इस अध्याय के लिए अभी तक कोई मूल पाठ संपादन इतिहास नहीं है।",
  "history.paragraphRemoved": "पैराग्राफ़ हटाया गया",
  "history.paragraphRestored": "पैराग्राफ़ पुनर्स्थापित किया गया:",

  // Endorsement
  "endorsement.endorsed": "समर्थन किया गया",
  "endorsement.endorse": "समर्थन करें",

  // Export
  "export.failed": "उत्पन्न करने में विफल",
  "export.generating": "उत्पन्न हो रहा है...",
  "export.pdf": "PDF",
  "export.epub": "EPUB",

  // Table of contents
  "toc.title": "विषय सूची",

  // Page-level strings (server components)
  "page.backToChapter": "अध्याय पर वापस जाएँ",
  "page.discussion": "चर्चा",
  "page.editPrefix": "संपादित करें:",
  "page.historyPrefix": "इतिहास:",
  "page.chapterN": "अध्याय {n}",
  "page.signInToDiscuss": "चर्चा शुरू करने के लिए साइन इन करें।",
  "page.newThread": "नया धागा",
  "page.chapterBreadcrumb": "अध्याय",
  "page.editSourcePrefix": "मूल संपादित करें:",

  // About page
  "nav.about": "परिचय",
  "about.title": "Deltoi के बारे में",
  "about.mission":
    "इस परियोजना का लक्ष्य अनुवादकों और विद्वानों को एक ऐसा मंच प्रदान करना है जहाँ वे महत्वपूर्ण ग्रंथों पर टिप्पणी, सहयोग, संपादन, आलोचना, जाँच और अनुमोदन कर सकें, जिनके अभी तक अंग्रेजी या चीनी में अनुवाद उपलब्ध नहीं हैं। इस वेबसाइट पर प्रारंभिक अनुवाद कृत्रिम बुद्धिमत्ता द्वारा किए गए हैं; इस परियोजना का उद्देश्य उस आधार पर उचित और सुलभ अनुवाद तैयार करना है।",
  "about.registrationTitle": "पंजीकरण",
  "about.registration":
    "साइन-अप वर्तमान में निमंत्रण द्वारा चयनित उपयोगकर्ताओं तक सीमित हैं। यदि आप योगदान में रुचि रखते हैं, तो कृपया Bryan Cheong से संपर्क करें।",
  "about.licenseTitle": "लाइसेंस",
  "about.licenseText":
    "Deltoi पर प्रकाशित सभी अनुवाद",
  "about.licenseSuffix": " लाइसेंस के तहत जारी किए जाते हैं।",

  // Register success
  "register.accountCreated": "खाता बनाया गया",
  "register.accountCreatedDesc": "आपका खाता सफलतापूर्वक बनाया गया है!",
  "register.loginPrompt": "अब आप अपनी साख से लॉग इन कर सकते हैं।",
  "register.logIn": "लॉग इन करें",
};

export default hi;
