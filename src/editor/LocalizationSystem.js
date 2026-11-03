(() => {
    const translations = {
        "add-cube": ["Add Cube", "إضافة مكعب"],
        "save-scene": ["Save Scene", "حفظ المشهد"],
        "load-scene": ["Load Scene", "تحميل المشهد"],
        "tool-move": ["Move", "تحريك"],
        "tool-rotate": ["Rotate", "تدوير"],
        "tool-scale": ["Scale", "تحجيم"],
        "play-button": ["Coming Soon", "قريباً"],
        "world-settings-button": ["World Settings", "إعدادات العالم"],
        "lighting-toggle": ["Lighting", "الإضاءة"],
        "terrain-toggle": ["Terrain", "التضاريس"],
        "outliner-toggle": ["Outliner", "قائمة العناصر"],
        "close-world-settings": ["×", "×"],
        "close-lighting": ["×", "×"],
        "close-terrain": ["×", "×"],
        "close-outliner": ["×", "×"],
        "rename-object": ["Rename", "إعادة تسمية"],
        "delete-object": ["Delete", "حذف"],
        "terrain-reset": ["Reset Terrain", "إعادة التضاريس"],
        "loading-message": ["KGTF ENGINE — Initializing...", "KGTF ENGINE — جارٍ تجهيز المحرك"]
    };

    const labels = {
        "label[for='world-size']": ["World Size", "حجم العالم"],
        "label[for='sun-elevation']": ["Sun Elevation", "ارتفاع الشمس"],
        "label[for='sun-azimuth']": ["Sun Azimuth", "اتجاه الشمس"],
        "label[for='sun-intensity']": ["Sun Intensity", "شدة ضوء الشمس"],
        "label[for='ambient-intensity']": ["Ambient Intensity", "شدة الإضاءة المحيطية"],
        "label[for='sky-color']": ["Sky Color", "لون السماء"],
        "label[for='fog-near']": ["Fog Near", "بداية الضباب"],
        "label[for='fog-far']": ["Fog Far", "نهاية الضباب"],
        "label[for='terrain-tool']": ["Sculpting Tool", "أداة تشكيل التضاريس"],
        "label[for='terrain-brush-size']": ["Brush Size", "حجم الفرشاة"],
        "label[for='terrain-brush-strength']": ["Brush Strength", "قوة الفرشاة"],
        "label[for='object-name']": ["Selected Object", "العنصر المحدد"],
        "label[for='details-name']": ["Object Name", "اسم العنصر"],
        "label[for='details-material-color']": ["Material Color", "لون المادة"],
        "label[for='details-roughness']": ["Roughness", "الخشونة"],
        "label[for='details-metalness']": ["Metalness", "المعدنية"]
    };

    const options = {
        "terrain-tool": [
            ["Raise", "رفع"],
            ["Lower", "خفض"],
            ["Smooth", "تنعيم"]
        ]
    };

    let language = "en";

    function setText(element, value) {
        if (element && element.textContent !== value) {
            element.textContent = value;
        }
    }

    function setLabel(selector, value) {
        const element = document.querySelector(selector);
        if (!element) return;

        const textNode = [...element.childNodes].find(
            node => node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim()
        );

        if (textNode) {
            if (textNode.textContent.trim() !== value) {
                textNode.textContent = " " + value;
            }
        } else if (!element.querySelector("input, output")) {
            setText(element, value);
        }
    }

    function translateStatus() {
        const status = document.getElementById("engine-status");
        if (!status) return;

        const value = status.textContent.trim();
        let translated = value;

        const exact = {
            "ENGINE: INITIALIZING": "المحرك: جارٍ التهيئة",
            "ENGINE: RUNNING": "المحرك: يعمل",
            "ENGINE: EDITOR MODE": "المحرك: وضع التحرير",
            "ENGINE: ERROR": "المحرك: خطأ",
            "TERRAIN: RESET": "التضاريس: تمت إعادة الضبط",
            "SCENE: EXPORTED": "المشهد: تم التصدير",
            "SCENE: SAVE ERROR": "المشهد: خطأ في الحفظ",
            "SCENE: LOAD ERROR": "المشهد: خطأ في التحميل"
        };

        if (language === "ar") {
            translated = exact[value] || value;
            translated = translated.replace(
                /^TERRAIN: (RAISE|LOWER|SMOOTH|SCULPT MODE)$/,
                (_, tool) => "التضاريس: " + ({
                    RAISE: "رفع",
                    LOWER: "خفض",
                    SMOOTH: "تنعيم",
                    "SCULPT MODE": "وضع التشكيل"
                })[tool]
            );

            translated = translated.replace(
                /^SCENE: LOADED \((\d+) OBJECTS\)$/,
                "المشهد: تم تحميل ($1 عناصر)"
            );
        } else {
            const reverse = Object.fromEntries(
                Object.entries(exact).map(([en, ar]) => [ar, en])
            );

            translated = reverse[value] || value;
        }

        setText(status, translated);
    }

    function translateDynamic() {
        const worldInfo = document.getElementById("world-size-info");
        if (worldInfo) {
            const match = worldInfo.textContent.match(/(\d+)\s*×\s*(\d+)/);
            if (match) {
                setText(
                    worldInfo,
                    language === "ar"
                        ? `حجم العالم: ${match[1]} × ${match[2]}`
                        : `WORLD SIZE: ${match[1]} × ${match[2]}`
                );
            }
        }

        const count = document.getElementById("object-count");
        if (count) {
            const match = count.textContent.match(/\d+/);
            if (match) {
                setText(
                    count,
                    language === "ar"
                        ? `العناصر: ${match[0]}`
                        : `OBJECTS: ${match[0]}`
                );
            }
        }

        translateStatus();
    }

    function applyLanguage() {
        document.documentElement.lang = language;
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

        for (const [id, values] of Object.entries(translations)) {
            setText(
                document.getElementById(id),
                values[language === "ar" ? 1 : 0]
            );
        }

        for (const [selector, values] of Object.entries(labels)) {
            setLabel(selector, values[language === "ar" ? 1 : 0]);
        }

        for (const [id, values] of Object.entries(options)) {
            const select = document.getElementById(id);
            if (!select) continue;

            [...select.options].forEach((option, index) => {
                if (values[index]) {
                    setText(
                        option,
                        values[index][language === "ar" ? 1 : 0]
                    );
                }
            });
        }

        const toggles = [
            ["#ground-visible", "Show Ground", "إظهار الأرض"],
            ["#grid-visible", "Show Grid", "إظهار الشبكة"],
            ["#axes-visible", "Show Axes", "إظهار المحاور"],
            ["#fog-enabled", "Enable Fog", "تفعيل الضباب"]
        ];

        for (const [selector, en, ar] of toggles) {
            setLabel(
                `${selector}:not(dummy)`,
                language === "ar" ? ar : en
            );
        }

        const worldHeader = document.querySelector("#world-settings .settings-header strong");
        setText(worldHeader, language === "ar" ? "إعدادات العالم" : "WORLD SETTINGS");

        const detailsToggle = document.getElementById("details-toggle");
        setText(detailsToggle, language === "ar" ? "التفاصيل" : "Details");

        const detailsHeader = document.querySelector("#details-panel .details-header strong");
        setText(detailsHeader, "DETAILS");

        const detailsSections = document.querySelectorAll("#details-panel .details-section > strong");
        const sectionNames = [
            ["POSITION", "الموقع"],
            ["ROTATION", "الدوران"],
            ["SCALE", "الحجم"],
            ["MATERIAL", "المادة"]
        ];

        detailsSections.forEach((element, index) => {
            if (sectionNames[index]) {
                setText(
                    element,
                    language === "ar"
                        ? sectionNames[index][1]
                        : sectionNames[index][0]
                );
            }
        });

        setText(
            document.getElementById("details-empty"),
            language === "ar"
                ? "اختر عنصراً لعرض خصائصه"
                : "Select an object to view its properties"
        );

        setText(
            document.getElementById("material-unavailable"),
            language === "ar"
                ? "المادة الحالية لا تدعم هذه الخصائص."
                : "The current material does not support these properties."
        );

        const nameInput = document.getElementById("object-name");
        if (nameInput) {
            nameInput.placeholder = language === "ar"
                ? "اختر عنصراً"
                : "Select an object";
        }

        const detailsName = document.getElementById("details-name");
        if (detailsName) {
            detailsName.placeholder = language === "ar"
                ? "لا يوجد عنصر محدد"
                : "No object selected";
        }

        const languageButton = document.getElementById("language-toggle");
        setText(languageButton, language === "ar" ? "English" : "العربية");

        translateDynamic();
    }

    function setLanguage(nextLanguage) {
        language = nextLanguage === "ar" ? "ar" : "en";

        try {
            localStorage.setItem("kgtf-language", language);
        } catch (error) {
            console.warn("Language preference could not be saved.", error);
        }

        applyLanguage();
    }

    try {
        const saved = localStorage.getItem("kgtf-language");
        if (saved === "ar" || saved === "en") {
            language = saved;
        }
    } catch (error) {
        console.warn("Language preference could not be loaded.", error);
    }

    document.getElementById("language-toggle")?.addEventListener("click", () => {
        setLanguage(language === "en" ? "ar" : "en");
    });

    window.KGTF_LOCALIZATION = {
        getLanguage: () => language,
        setLanguage
    };

    applyLanguage();

    const observer = new MutationObserver(() => {
        applyLanguage();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
})();
