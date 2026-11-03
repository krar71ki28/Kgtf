(() => {
    "use strict";

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
        "rename-object": ["Rename", "إعادة تسمية"],
        "delete-object": ["Delete", "حذف"],
        "terrain-reset": ["Reset Terrain", "إعادة التضاريس"],
        "close-world-settings": ["×", "×"],
        "close-lighting": ["×", "×"],
        "close-terrain": ["×", "×"],
        "close-outliner": ["×", "×"]
    };

    const labels = {
        "world-size": ["World Size", "حجم العالم"],
        "sun-elevation": ["Sun Elevation", "ارتفاع الشمس"],
        "sun-azimuth": ["Sun Azimuth", "اتجاه الشمس"],
        "sun-intensity": ["Sun Intensity", "شدة ضوء الشمس"],
        "ambient-intensity": ["Ambient Intensity", "شدة الإضاءة المحيطية"],
        "sky-color": ["Sky Color", "لون السماء"],
        "fog-near": ["Fog Near", "بداية الضباب"],
        "fog-far": ["Fog Far", "نهاية الضباب"],
        "terrain-tool": ["Sculpting Tool", "أداة تشكيل التضاريس"],
        "terrain-brush-size": ["Brush Size", "حجم الفرشاة"],
        "terrain-brush-strength": ["Brush Strength", "قوة الفرشاة"],
        "object-name": ["Selected Object", "العنصر المحدد"],
        "details-name": ["Object Name", "اسم العنصر"],
        "details-material-color": ["Material Color", "لون المادة"],
        "details-roughness": ["Roughness", "الخشونة"],
        "details-metalness": ["Metalness", "المعدنية"]
    };

    const toggleLabels = {
        "ground-visible": ["Show Ground", "إظهار الأرض"],
        "grid-visible": ["Show Grid", "إظهار الشبكة"],
        "axes-visible": ["Show Axes", "إظهار المحاور"],
        "fog-enabled": ["Enable Fog", "تفعيل الضباب"]
    };

    const selectOptions = {
        "terrain-tool": [
            ["Raise", "رفع"],
            ["Lower", "خفض"],
            ["Smooth", "تنعيم"]
        ]
    };

    const staticText = {
        "details-empty": [
            "Select an object to view its properties",
            "اختر عنصراً لعرض خصائصه"
        ],
        "material-unavailable": [
            "The current material does not support these properties.",
            "المادة الحالية لا تدعم هذه الخصائص."
        ]
    };

    let language = "en";
    let observer = null;
    let applying = false;

    function currentIndex() {
        return language === "ar" ? 1 : 0;
    }

    function setText(element, value) {
        if (element && element.textContent !== value) {
            element.textContent = value;
        }
    }

    function translateLabel(id, values) {
        const input = document.getElementById(id);
        const label = input?.closest("label");

        if (!label) return;

        const textNode = [...label.childNodes].find(
            node => node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim().length > 0
        );

        if (textNode) {
            const value = values[currentIndex()];
            const nextValue = ` ${value}`;

            if (textNode.textContent !== nextValue) {
                textNode.textContent = nextValue;
            }
        }
    }

    function translateStatus() {
        const status = document.getElementById("engine-status");
        if (!status) return;

        const value = status.textContent.trim();

        if (language === "en") {
            const arabic = {
                "المحرك: جارٍ التهيئة": "ENGINE: INITIALIZING",
                "المحرك: يعمل": "ENGINE: RUNNING",
                "المحرك: وضع التحرير": "ENGINE: EDITOR MODE",
                "المحرك: خطأ": "ENGINE: ERROR",
                "التضاريس: تمت إعادة الضبط": "TERRAIN: RESET",
                "المشهد: تم التصدير": "SCENE: EXPORTED",
                "المشهد: خطأ في الحفظ": "SCENE: SAVE ERROR",
                "المشهد: خطأ في التحميل": "SCENE: LOAD ERROR"
            };

            setText(status, arabic[value] || value);
            return;
        }

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

        let translated = exact[value] || value;

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
            /^SCENE: LOADED \((\d+) OBJECTS?\)$/,
            "المشهد: تم تحميل $1 عناصر"
        );

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
                        ? `عدد العناصر: ${match[0]}`
                        : `OBJECTS: ${match[0]}`
                );
            }
        }

        translateStatus();
    }

    function translateDetails() {
        const index = currentIndex();

        setText(
            document.querySelector("#details-header strong"),
            "DETAILS"
        );

        setText(
            document.querySelector("#details-panel .details-header strong"),
            language === "ar" ? "التفاصيل" : "DETAILS"
        );

        const sections = document.querySelectorAll(
            "#details-panel .details-section > strong"
        );

        const names = [
            ["POSITION", "الموقع"],
            ["ROTATION", "الدوران"],
            ["SCALE", "الحجم"],
            ["MATERIAL", "المادة"]
        ];

        sections.forEach((element, i) => {
            if (names[i]) setText(element, names[i][index]);
        });

        for (const [id, values] of Object.entries(labels)) {
            if (id.startsWith("details-")) {
                translateLabel(id, values);
            }
        }

        for (const [id, values] of Object.entries(staticText)) {
            setText(document.getElementById(id), values[index]);
        }

        const nameInput = document.getElementById("details-name");

        if (nameInput) {
            nameInput.placeholder = language === "ar"
                ? "لا يوجد عنصر محدد"
                : "No object selected";
        }
    }

    function applyLanguage() {
        if (applying) return;

        applying = true;

        try {
            const index = currentIndex();

            document.documentElement.lang = language;
            document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

            for (const [id, values] of Object.entries(translations)) {
                setText(document.getElementById(id), values[index]);
            }

            for (const [id, values] of Object.entries(labels)) {
                translateLabel(id, values);
            }

            for (const [id, values] of Object.entries(toggleLabels)) {
                translateLabel(id, values);
            }

            for (const [id, values] of Object.entries(selectOptions)) {
                const select = document.getElementById(id);
                if (!select) continue;

                [...select.options].forEach((option, i) => {
                    if (values[i]) setText(option, values[i][index]);
                });
            }

            for (const [id, values] of Object.entries(staticText)) {
                setText(document.getElementById(id), values[index]);
            }

            setText(
                document.querySelector("#world-settings .settings-header strong"),
                language === "ar" ? "إعدادات العالم" : "WORLD SETTINGS"
            );

            setText(
                document.querySelector("#lighting-panel .settings-header strong"),
                language === "ar" ? "الإضاءة والسماء" : "LIGHTING & SKY"
            );

            setText(
                document.querySelector("#terrain-panel .settings-header strong"),
                language === "ar" ? "أدوات التضاريس" : "TERRAIN TOOLS"
            );

            setText(
                document.querySelector("#outliner-panel .settings-header strong"),
                language === "ar" ? "قائمة عناصر العالم" : "WORLD OUTLINER"
            );

            setText(
                document.getElementById("details-toggle"),
                language === "ar" ? "التفاصيل" : "Details"
            );

            setText(
                document.getElementById("language-toggle"),
                language === "ar" ? "English" : "العربية"
            );

            const objectName = document.getElementById("object-name");

            if (objectName) {
                objectName.placeholder = language === "ar"
                    ? "اختر عنصراً"
                    : "Select an object";
            }

            translateDetails();
            translateDynamic();
        } finally {
            applying = false;
        }
    }

    function setLanguage(nextLanguage) {
        language = nextLanguage === "ar" ? "ar" : "en";

        try {
            localStorage.setItem("kgtf-language", language);
        } catch (error) {
            console.warn("Could not save language preference.", error);
        }

        applyLanguage();
    }

    try {
        const saved = localStorage.getItem("kgtf-language");

        if (saved === "ar" || saved === "en") {
            language = saved;
        }
    } catch (error) {
        console.warn("Could not load language preference.", error);
    }

    document.getElementById("language-toggle")?.addEventListener(
        "click",
        () => setLanguage(language === "en" ? "ar" : "en")
    );

    window.KGTF_LOCALIZATION = {
        getLanguage: () => language,
        setLanguage
    };

    applyLanguage();

    observer = new MutationObserver(() => {
        if (!applying) applyLanguage();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
})();
