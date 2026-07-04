(function () {
  "use strict";

  var STRINGS = {
    ar: {
      "nav.funding": "التمويل الثقافي",
      "nav.investment": "الاستثمار",
      "nav.enablement": "خدمات نماء التمكينية",
      "nav.more": "المزيد ⌄",
      "nav.langToggle": "English",
      "nav.login": "تسجيل الدخول",
      "hero.title": "نخلق إمكانات المشاريع الثقافية",
      "about.text": "تأسس الصندوق الثقافي بمرسوم ملكي عام 2021؛ لينهض بإمكانات المشهد الثقافي، ويُمكّن رواد الأعمال والمنشآت الثقافية من التمويل والاستثمار والخدمات التمكينية اللازمة للنمو والاستدامة.",
      "sectors.title": "القطاعات الثقافية",
      "sectors.subtitle": "ندعم التنوع الثقافي عبر أحد عشر قطاعًا إبداعيًا",
      "sectors.heritage": "التراث",
      "sectors.literature": "الأدب",
      "sectors.fashion": "الأزياء",
      "sectors.film": "الأفلام",
      "sectors.visualArts": "الفنون البصرية",
      "sectors.museums": "المتاحف",
      "sectors.theatre": "المسرح والفنون الأدائية",
      "sectors.libraries": "المكتبات",
      "sectors.music": "الموسيقى",
      "sectors.culinary": "فنون الطهي",
      "sectors.architecture": "فنون العمارة والتصميم",
      "stories.title": "قصص نجاح دعمها الصندوق",
      "stories.leather": "حرفي جلود يطور مشروعه الخاص",
      "stories.film": "إنتاج سينمائي في قلب الصحراء",
      "stories.library": "شغف بالمعرفة في مكتبة عامة",
      "stories.fashion": "مصممة أزياء تُطلق علامتها التجارية",
      "footer.note": "هذا موقع تجريبي (Proof of Concept) لغرض العرض التوضيحي فقط."
    },
    en: {
      "nav.funding": "Cultural Funding",
      "nav.investment": "Investment",
      "nav.enablement": "Namaa Enablement Services",
      "nav.more": "More ⌄",
      "nav.langToggle": "العربية",
      "nav.login": "Log in",
      "hero.title": "We create potential for cultural projects",
      "about.text": "The Cultural Development Fund was established by royal decree in 2021 to unlock the potential of the cultural scene, empowering entrepreneurs and cultural enterprises with the financing, investment, and enablement services needed for growth and sustainability.",
      "sectors.title": "Cultural Sectors",
      "sectors.subtitle": "We support cultural diversity across eleven creative sectors",
      "sectors.heritage": "Heritage",
      "sectors.literature": "Literature",
      "sectors.fashion": "Fashion",
      "sectors.film": "Film",
      "sectors.visualArts": "Visual Arts",
      "sectors.museums": "Museums",
      "sectors.theatre": "Theatre & Performing Arts",
      "sectors.libraries": "Libraries",
      "sectors.music": "Music",
      "sectors.culinary": "Culinary Arts",
      "sectors.architecture": "Architecture & Design",
      "stories.title": "Success Stories the Fund Supported",
      "stories.leather": "A leather craftsman grows his own business",
      "stories.film": "Film production in the heart of the desert",
      "stories.library": "A passion for knowledge at a public library",
      "stories.fashion": "A fashion designer launches her own label",
      "footer.note": "This is a demo website (Proof of Concept) for demonstration purposes only."
    }
  };

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.body.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var value = STRINGS[lang][key];
      if (value) el.textContent = value;
    });
    localStorage.setItem("cdf_site_lang", lang);
    window.dispatchEvent(new CustomEvent("cdf:language-changed", { detail: { lang: lang } }));
  }

  document.addEventListener("DOMContentLoaded", function () {
    var savedLang = localStorage.getItem("cdf_site_lang") || "ar";
    applyLanguage(savedLang);

    var toggle = document.getElementById("langToggle");
    toggle.addEventListener("click", function () {
      var current = document.documentElement.lang === "ar" ? "ar" : "en";
      applyLanguage(current === "ar" ? "en" : "ar");
    });

    // Simple hero dot rotation (purely decorative, single-slide POC)
    var dots = document.querySelectorAll(".hero-dots .dot");
    var current = 0;
    setInterval(function () {
      dots[current].classList.remove("active");
      current = (current + 1) % dots.length;
      dots[current].classList.add("active");
    }, 4000);

    // Accessibility button: simple font-size bump toggle
    var a11yBtn = document.getElementById("a11yBtn");
    var largeText = false;
    a11yBtn.addEventListener("click", function () {
      largeText = !largeText;
      document.body.style.fontSize = largeText ? "112%" : "";
    });
  });
})();
