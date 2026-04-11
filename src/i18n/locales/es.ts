import type { Translations } from "./en";

const es: Translations = {
  // Header
  "nav.browse": "Explorar",
  "nav.search": "Buscar",
  "nav.admin": "Administración",
  "nav.signIn": "Iniciar sesión",
  "nav.signOut": "Cerrar sesión",

  // Language switcher
  "lang.switch": "Idioma",
  "lang.en": "English",
  "lang.cn": "中文 (Chinese)",
  "lang.hi": "हिंदी (Hindi)",

  // Homepage hero
  "home.title": "Deltoi",
  "home.subtitle":
    "Una wiki colaborativa de traducciones interlineales de textos precontemporáneos.",
  "home.description":
    "El objetivo de este proyecto es permitir que traductores y académicos comenten, colaboren, editen, critiquen, verifiquen y aprueben traducciones de textos importantes que aún no están disponibles en inglés o chino. Las traducciones iniciales en este sitio web se realizan mediante inteligencia artificial; este proyecto pretende construir sobre esa base para producir traducciones adecuadas y accesibles.",
  "home.browseTexts": "Explorar textos",
  "home.searchTexts": "Buscar textos",
  "home.highlights": "Destacados",
  "home.exploreByLanguage": "Explorar por idioma",
  "home.exploreByCategory": "Explorar por categoría",
  "home.featuredTexts": "Textos destacados",

  // Browse page
  "browse.title": "Explorar textos",
  "browse.category": "Categoría:",
  "browse.language": "Idioma:",
  "browse.all": "Todos",
  "browse.clearFilters": "Borrar todos los filtros",
  "browse.showing": "Mostrando",
  "browse.texts": "textos",
  "browse.text": "texto",
  "browse.in": "en",
  "browse.chapters": "capítulos",
  "browse.chapter": "capítulo",

  // Genre names
  "genre.philosophy": "Filosofía",
  "genre.theology": "Teología",
  "genre.devotional": "Devocional",
  "genre.commentary": "Comentario",
  "genre.literature": "Literatura",
  "genre.poetry": "Poesía",
  "genre.history": "Historia",
  "genre.science": "Ciencia",
  "genre.ritual": "Ritual",
  "genre.uncategorized": "Sin categorizar",

  // Source language display names
  "sourcelang.zh": "Chino",
  "sourcelang.grc": "Griego",
  "sourcelang.la": "Latín",
  "sourcelang.ta": "Tamil",
  "sourcelang.te": "Telugu",
  "sourcelang.hy": "Armenio",
  "sourcelang.it": "Italiano",
  "sourcelang.ms": "Malayo",
  "sourcelang.pl": "Polaco",
  "sourcelang.cs": "Checo",
  "sourcelang.ru": "Ruso",
  "sourcelang.tr": "Turco",
  "sourcelang.ko": "Coreano",
  "sourcelang.fa": "Persa",
  "sourcelang.chg": "Chagatái",
  "sourcelang.fr": "Francés",
  "sourcelang.sr": "Serbio",
  "sourcelang.de": "Alemán",
  "sourcelang.xcl": "Armenio clásico",
  "sourcelang.ja": "Japonés",
  "sourcelang.el": "Griego moderno",
  "sourcelang.am": "Amhárico",
  "sourcelang.sq": "Albanés",
  "sourcelang.en": "Inglés",
  "sourcelang.hu": "Húngaro",
  "sourcelang.ro": "Rumano",
  "sourcelang.vi": "Vietnamita",
  "sourcelang.vi-nom": "Vietnamita (Chữ Nôm)",
  "sourcelang.ar": "Árabe",
  "sourcelang.th": "Tailandés",

  // Search page
  "search.title": "Buscar",
  "search.placeholder": "Buscar textos y capítulos...",
  "search.filter": "Filtrar:",
  "search.clear": "Borrar",
  "search.searchingTitles": "Buscando títulos...",
  "search.searchingContent": "Buscando dentro de los textos...",
  "search.noResults": "No se encontraron resultados para",
  "search.withFilter": "con el filtro de idioma seleccionado",
  "search.texts": "Textos",
  "search.chapters": "Capítulos",
  "search.loadMore": "Cargar más",
  "search.loading": "Cargando...",
  "search.searchContent": "Buscar dentro de los textos",
  "search.searchingWithin": "Buscando dentro de:",
  "search.clearFilter": "Borrar",
  "search.placeholderInText": "Buscar dentro de este texto...",

  // Auth - Login
  "login.title": "Iniciar sesión",
  "login.emailExists":
    "Este correo electrónico ya está registrado. Por favor, inicie sesión con su contraseña.",
  "login.email": "Correo electrónico",
  "login.password": "Contraseña",
  "login.invalidCredentials": "Correo electrónico o contraseña no válidos.",
  "login.signingIn": "Iniciando sesión...",
  "login.signIn": "Iniciar sesión",
  "login.or": "o",
  "login.google": "Iniciar sesión con Google",
  "login.noAccount": "¿No tiene una cuenta?",
  "login.register": "Registrarse",

  // Auth - Register
  "register.title": "Registro",
  "register.inviteRequired":
    "Se requiere un token de invitación válido para registrarse.",
  "register.userLimit":
    "Se alcanzó el límite de usuarios. No se aceptan más registros.",
  "register.failed": "El registro falló. Por favor, inténtelo de nuevo.",
  "register.inviteToken": "Token de invitación",
  "register.invitePlaceholder": "Pegue su token de invitación",
  "register.email": "Correo electrónico",
  "register.username": "Nombre de usuario",
  "register.password": "Contraseña",
  "register.creating": "Creando cuenta...",
  "register.create": "Crear cuenta",
  "register.or": "o",
  "register.google": "Iniciar sesión con Google",
  "register.googleHint":
    "Ingrese un token de invitación arriba para habilitar el inicio de sesión con Google",
  "register.redirecting": "Redirigiendo...",
  "register.hasAccount": "¿Ya tiene una cuenta?",
  "register.signIn": "Iniciar sesión",

  // Profile
  "profile.title": "Perfil",
  "profile.loading": "Cargando perfil...",
  "profile.notFound": "Perfil no encontrado.",
  "profile.accountInfo": "Información de la cuenta",
  "profile.username": "Nombre de usuario",
  "profile.email": "Correo electrónico",
  "profile.role": "Rol",
  "profile.joined": "Se unió",
  "profile.signInMethods": "Métodos de inicio de sesión",
  "profile.password": "Contraseña",
  "profile.google": "Google",
  "profile.changePassword": "Cambiar contraseña",
  "profile.currentPassword": "Contraseña actual",
  "profile.newPassword": "Nueva contraseña",
  "profile.confirmPassword": "Confirmar nueva contraseña",
  "profile.passwordChanged": "Contraseña cambiada exitosamente.",
  "profile.passwordMismatch": "Las nuevas contraseñas no coinciden.",
  "profile.changing": "Cambiando...",
  "profile.deleteAccount": "Eliminar cuenta",
  "profile.deleteWarning":
    "Esta acción es permanente. Sus contribuciones (traducciones, comentarios) se conservarán, pero su cuenta y datos personales se eliminarán permanentemente.",
  "profile.deleteButton": "Eliminar mi cuenta",
  "profile.deleteConfirmLabel": "Escriba su nombre de usuario {username} para confirmar",
  "profile.deleting": "Eliminando...",
  "profile.deleteConfirmButton": "Eliminar mi cuenta permanentemente",
  "profile.cancel": "Cancelar",

  // Footer
  "footer.description":
    "Deltoi — Una wiki colaborativa de traducciones interlineales de textos precontemporáneos.",
  "footer.trial": "Proyecto de prueba de Bryan Cheong. El contenido está licenciado bajo",
  "footer.license": "CC BY-NC-SA 4.0",
  "footer.licenseSuffix": ".",

  // Common
  "common.loading": "Cargando...",
  "common.cancel": "Cancelar",
  "common.saving": "Guardando...",
  "common.by": "por",

  // Text detail page
  "textDetail.chapters": "Capítulos",
  "textDetail.chaptersCount": "Capítulos ({count})",
  "textDetail.noChapters": "Aún no se han añadido capítulos.",

  // Chapter page
  "chapter.chapterOf": "Capítulo {n} de {m}",
  "chapter.editTranslation": "Editar traducción",
  "chapter.editSource": "Editar texto original",
  "chapter.history": "Historial",
  "chapter.discussion": "Discusión",
  "chapter.translatedBy": "Traducido por {name}",
  "chapter.previous": "Anterior",
  "chapter.next": "Siguiente",

  // Interlinear viewer
  "interlinear.source": "Texto original",
  "interlinear.translation": "Traducción",
  "interlinear.noContent": "No hay contenido disponible para este capítulo.",
  "interlinear.notTranslated": "Aún no traducido",
  "interlinear.sourceRemoved": "Párrafo del texto original eliminado",
  "interlinear.showOriginal": "Mostrar original",
  "interlinear.hideOriginal": "Ocultar original",
  "interlinear.showOriginalText": "Mostrar texto original",
  "interlinear.hideOriginalText": "Ocultar texto original",

  // Featured texts / browse
  "featured.sort": "Ordenar:",
  "featured.sortTitle": "Título",
  "featured.sortAuthor": "Autor",
  "featured.works": "{count} obras",
  "featured.work": "{count} obra",
  "featured.ch": "cap.",
  "featured.texts": "{count} textos",
  "featured.text": "{count} texto",
  "featured.noTexts": "Aún no hay textos en este idioma.",
  "featured.noMatch": "No hay textos que coincidan con los filtros actuales.",

  // Highlight cards
  "highlights.zhuziyulei": "Filosofía neoconfuciana registrada por los estudiantes de Zhu Xi.",
  "highlights.daad": "Una novela de amor en medio del derramamiento de sangre sectario en el Monte Líbano de 1860.",
  "highlights.romaike": "Política cortesana, guerras civiles y divisiones teológicas en el Bizancio tardío.",
  "highlights.capponi": "Florencia desde la comuna al principado, por un estadista del Risorgimento.",
  "highlights.paluba":
    "Una novela polaca metaficcional que deconstruye el realismo psicológico a través de un narrador autoconsciente.",
  "highlights.shahnameh":
    "La epopeya nacional persa — mito, heroísmo e imperio a lo largo de cincuenta mil dísticos.",

  // Editor
  "editor.enterTranslation": "Ingresar traducción...",
  "editor.enterSource": "Ingresar texto original...",
  "editor.editSummary": "Resumen de edición (opcional)",
  "editor.describChanges": "Describa sus cambios...",
  "editor.saveTranslation": "Guardar traducción",
  "editor.saveSource": "Guardar texto original",
  "editor.failedSave": "Error al guardar:",
  "editor.paragraph": "Párrafo",
  "editor.translationRemoved": "(la traducción también se eliminará)",
  "editor.restore": "Restaurar",
  "editor.delete": "Eliminar",
  "editor.paragraphRemoved": "Este párrafo ha sido eliminado",
  "editor.deleteWithTranslation": "Eliminar párrafo con traducción",
  "editor.deleteConfirmation": "Este párrafo tiene una traducción existente. ¿Desea eliminar también la traducción o conservarla?",
  "editor.keepTranslation": "Conservar traducción",
  "editor.deleteBoth": "Eliminar ambos",
  "editor.ccNotice":
    "Las traducciones publicadas en Deltoi se publican bajo Creative Commons BY-NC-SA.",

  // Discussion
  "discussion.noThreads": "Aún no hay hilos de discusión. Sea el primero en iniciar una conversación.",
  "discussion.pinned": "Fijado",
  "discussion.resolved": "Resuelto",
  "discussion.reply": "respuesta",
  "discussion.replies": "respuestas",
  "discussion.replyButton": "Responder",
  "discussion.reopen": "Reabrir",
  "discussion.markResolved": "Marcar como resuelto",
  "discussion.unpin": "Desfijar",
  "discussion.pin": "Fijar",
  "discussion.signInToReply": "Inicie sesión para responder a esta discusión.",
  "discussion.startedBy": "Iniciado por",
  "discussion.title": "Título",
  "discussion.topicPlaceholder": "Tema de discusión",
  "discussion.content": "Contenido",
  "discussion.writePlaceholder": "Escriba sus ideas...",
  "discussion.creating": "Creando...",
  "discussion.createThread": "Crear hilo",
  "discussion.replyPlaceholder": "Escriba una respuesta...",
  "discussion.posting": "Publicando...",
  "discussion.postReply": "Publicar respuesta",

  // History
  "history.noHistory": "No hay historial de ediciones.",
  "history.versions": "Versiones",
  "history.version": "Versión",
  "history.on": "el",
  "history.selectVersion": "Seleccione una versión para ver.",
  "history.translationHistory": "Historial de traducción ({count})",
  "history.sourceHistory": "Historial del texto original ({count})",
  "history.noTranslationHistory": "Aún no hay historial de traducción para este capítulo.",
  "history.noSourceHistory": "Aún no hay historial de edición del texto original para este capítulo.",
  "history.paragraphRemoved": "Párrafo eliminado",
  "history.paragraphRestored": "Párrafo restaurado:",

  // Endorsement
  "endorsement.endorsed": "Aprobado",
  "endorsement.endorse": "Aprobar",

  // Export
  "export.failed": "Error al generar",
  "export.generating": "Generando...",
  "export.search": "Buscar",
  "export.pdf": "PDF",
  "export.epub": "EPUB",

  // Table of contents
  "toc.title": "Tabla de contenidos",

  // Page-level strings (server components)
  "page.backToChapter": "Volver al capítulo",
  "page.discussion": "Discusión",
  "page.editPrefix": "Editar:",
  "page.historyPrefix": "Historial:",
  "page.chapterN": "Capítulo {n}",
  "page.signInToDiscuss": "Inicie sesión para iniciar una discusión.",
  "page.newThread": "Nuevo hilo",
  "page.chapterBreadcrumb": "Capítulo",
  "page.editSourcePrefix": "Editar texto original:",

  // About page
  "nav.about": "Acerca de",
  "about.title": "Acerca de Deltoi",
  "about.mission":
    "El objetivo de este proyecto es permitir que traductores y académicos comenten, colaboren, editen, critiquen, verifiquen y aprueben traducciones de textos importantes que aún no están disponibles en inglés, chino o español. Las traducciones iniciales en este sitio web se realizan mediante inteligencia artificial; este proyecto pretende construir sobre esa base para producir traducciones adecuadas y accesibles. Se ha hecho un esfuerzo para que la mayoría de los textos elegidos para el proyecto Deltoi no tengan ya traducciones formales completas.",
  "about.registrationTitle": "Registro",
  "about.registration":
    "Los registros están actualmente limitados a usuarios seleccionados por invitación. Si está interesado en contribuir, por favor contacte a Bryan Cheong.",
  "about.licenseTitle": "Licencia",
  "about.licenseText":
    "Todas las traducciones publicadas en Deltoi se publican bajo la licencia",
  "about.licenseSuffix": ".",

  // Contribute page
  "nav.contribute": "Colaborar",
  "contribute.title": "Contribuir un texto",
  "contribute.description":
    "Suba textos originales y traducciones en formato JSON. Use el botón Validar para comprobar su JSON en busca de errores antes de subirlo.",
  "contribute.sourceTab": "Subir texto original",
  "contribute.translationTab": "Subir traducción",
  "contribute.formatTitle": "Formato JSON",
  "contribute.sourceFormatDesc":
    "Suba un nuevo texto original con todos sus capítulos. El JSON debe seguir la estructura siguiente.",
  "contribute.translationFormatDesc":
    "Suba una traducción para un texto existente. El número de párrafos en cada capítulo debe coincidir exactamente con el texto original.",
  "contribute.validLanguages": "Códigos de idioma válidos:",
  "contribute.langFieldDesc":
    "Un código de idioma del corpus (vea los códigos válidos arriba).",
  "contribute.authorNameDesc":
    "Nombre para mostrar del autor (ej. \"Marcus Tullius Cicero\").",
  "contribute.authorSlugDesc":
    "Identificador seguro para URL del autor, en minúsculas con guiones (ej. \"cicero\"). Si este slug ya existe, se usa el registro de autor existente.",
  "contribute.titleFieldDesc":
    "Título completo del texto.",
  "contribute.slugFieldDesc":
    "Identificador seguro para URL del texto, en minúsculas con guiones (ej. \"de-amicitia\"). Debe ser único dentro del idioma.",
  "contribute.genreFieldDesc":
    "Uno de: philosophy, theology, devotional, commentary, literature, poetry, history, science, ritual, uncategorized.",
  "contribute.yearFieldDesc":
    "Año de composición (entero, negativo para a.C.). Opcional.",
  "contribute.chaptersFieldDesc":
    "Un array de objetos de capítulo, cada uno con un título y un array de párrafos.",
  "contribute.paragraphsFieldDesc":
    "Un array de objetos con índice secuencial (comenzando desde 0) y campos de texto.",
  "contribute.textSlugDesc":
    "El slug de un texto existente en la base de datos.",
  "contribute.targetLangDesc":
    "Código de idioma de destino (ej. \"en\" para inglés, \"zh\" para chino).",
  "contribute.chapterNumDesc":
    "El número de capítulo (debe coincidir con un capítulo existente en el texto).",
  "contribute.transParagraphsDesc":
    "Párrafos traducidos. La cantidad debe coincidir con el número de párrafos del texto original para ese capítulo.",
  "contribute.jsonInput": "Entrada JSON",
  "contribute.jsonPlaceholder": "Pegue su JSON aquí...",
  "contribute.validate": "Validar",
  "contribute.upload": "Subir",
  "contribute.validationPassed": "Validación aprobada.",
  "contribute.validationFailed": "Validación fallida:",

  // Register success
  "register.accountCreated": "Cuenta creada",
  "register.accountCreatedDesc": "¡Su cuenta ha sido creada exitosamente!",
  "register.loginPrompt": "Ahora puede iniciar sesión con sus credenciales.",
  "register.logIn": "Iniciar sesión",
};

export default es;