; (function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        var VeloxScriptLoader = require("velox-loader") ;
        var VeloxWebView = require("../velox-web-view") ;
        module.exports = factory(VeloxScriptLoader, VeloxWebView) ;
    } else if (typeof define === 'function' && define.amd) {
        define(['VeloxScriptLoader', 'VeloxWebView'], factory);
    } else {
        global.VeloxWebView.registerExtension(factory(global.veloxScriptLoader, global.VeloxWebView));
    }
}(this, (function (VeloxScriptLoader, VeloxWebView) { 'use strict';

    /**
     * field extension definition
     */
    var extension = {} ;
    extension.name = "fields" ;

    //must run after i18n
    extension.mustRunAfter = ["i18n"] ;

    /**
     * contains loaded libs
     */
    var libs = {} ;

    /**
     * decorators to modify HTML element before insert them
     */
    var decorators = [] ;

    /**
     * the current locale
     */
    var currentLocale = null ;

    /**
     * flag for CSS of switch widget
     */
    var switchCSSLoaded = false;
    /**
     * flag for CSS of datatables widget
     */
    var datatableCSSLoaded = false;
    /**
     * flag for CSS of select widget
     */
    var selectCSSLoaded = false;
    /**
     * flag for CSS of number widget
     */
    var numberCSSLoaded = false;
    /**
     * flag for CSS of HTML editor widget
     */
    var htmlEditorCSSLoaded = false;
    /**
     * flag for CSS of upload widget
     */
    var uploadCSSLoaded = false;

    /**
     * API to call server
     */
    var apiClient;

    /**
     * called on view prepare
     */
    extension.init = function(){
        var view = this ;
        doInitView.bind(view)() ;
    } ;
    /**
     * called on view compile
     */
    extension.prepare = function(params, cb){
        var view = this ;
        doPrepareView.bind(view)(params, cb) ;
    } ;
    extension.extendsGlobal = {} ;

    
    /**
     * Global object to access to fields configuration
     */
    extension.extendsGlobal.fields = {
        /**
         * load configuration
         * 
         * The options object should contains a libs property with instance of libraries object 
         * if they are not available from window object and you don't want them to be loaded by CDN/bower
         * 
         * @param {object} options the configuration options
         */
        configure : function(options){
            apiClient = options.apiClient ;
            if(options.libs) {
                Object.keys(options.libs).forEach(function(k){
                    libs[k] = options.libs[k] ;
                }) ;
            }
        },

        addDecorator: function(decorator){
            decorators.push(decorator) ;
        },

        /**
         * Create the field
         * 
         * @param {HTMLElement} element the HTML element to transform to field
         * @param {string} fieldType the field type
         * @param {string} fieldSize the field size
         * @param {object} fieldOptions field options map (from element attributes)
         * @param {function(Error)} callback called when the field is created
         */
        createField: function(element, fieldType, fieldSize, fieldOptions, callback){
            createField(this, element, fieldType, fieldSize, fieldOptions, callback) ;
        },

        resetLocale: function(){
            currentLocale=null;
        },

        loadFieldLib: function(fieldType, fieldOptions, callback){
            setNeededLib(fieldType, fieldOptions) ;
            loadLibs(callback) ;
        }
    } ;


    extension.extendsProto = {} ;

    extension.extendsProto.setReadOnly = function(readOnly){
        this.elementsHavingAttribute("data-field").forEach(function(element){
            element.setReadOnly(readOnly) ;
        }) ;
        var keys = Object.keys(this.views);
        for(var i=0; i<keys.length; i++){
            var instances = this.views[keys[i]].instances ;
            for(var y=0; y<instances.length; y++){
                var instance = instances[y] ;
                if(instance.setReadOnly){
                    instance.setReadOnly(readOnly) ;
                }
            }
        }
    } ;

    ///// DEPENDENCIES LIBRARIES LOADING ////////
    var INPUTMASK_VERSION = "3.3.11"; //v4 will drop jquery dependency 
    var JQUERY_VERSION = "3.3.1" ;
    var NUMBRO_VERSION = "2.0.6" ;
    var DECIMALJS_VERSION = "2.2.0" ;
    var FLATPICKR_VERSION = "4.5.0" ;
    var MOMENTJS_VERSION = "2.22.1" ;
    var SELECTR_VERSION = "2.4.1" ;
    
    var PDFOBJECT_VERSION = "2.0.201604172" ;
    var PDFJS_VERSION = "1.9.426" ;
    var QUILL_VERSION = "1.3.6" ;

    var JSZIP_VERSION = "3.1.5" ;
    var PDFMAKE_VERSION = "0.1.36" ;
    var DATATABLES_VERSION = "1.10.16" ;

    var JQUERY_LIB = {
        name: "jquery",
        type: "js",
        version: JQUERY_VERSION,
        cdn: "http://code.jquery.com/jquery-$VERSION.min.js",
        bowerPath: "jquery/dist/jquery.min.js",
        npmPath: "jquery/dist/jquery.min.js",
    } ;
    var INPUT_MASK_LIB = [
        JQUERY_LIB,
        {
            name: "inputmask-bundle",
            type: "js",
            version: INPUTMASK_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/RobinHerbots/Inputmask@$VERSION/dist/jquery.inputmask.bundle.js",
            bowerPath: "inputmask/dist/jquery.inputmask.bundle.js",
            npmPath: "inputmask/dist/jquery.inputmask.bundle.js",
        }
    ];

    var NUMBRO_LIB = [
        {
            name: "numbro",
            type: "js",
            version: NUMBRO_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/numbro/$VERSION/numbro.min.js",
            bowerPath: "numbro/dist/numbro.min.js",
            npmPath: "numbro/dist/numbro.min.js"
        },
        {
            name: "numbro-language",
            type: "js",
            version: NUMBRO_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/numbro/$VERSION/languages.min.js",
            bowerPath: "numbro/dist/languages.min.js",
            npmPath: "numbro/dist/languages.min.js"
        }
    ];

    var DECIMALJS_LIB = [
        {
            name: "decimaljs-light",
            type: "js",
            version: DECIMALJS_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/MikeMcl/decimal.js-light@$VERSION/decimal.min.js",
            bowerPath: "decimal.js-light/decimal.min.js",
            npmPath: "decimal.js-light/decimal.min.js",
        }
    ];

    var FLATPICKR_LIB = [
        {
            name: "flatpickr-calendar-css",
            type: "css",
            version: FLATPICKR_VERSION,
            cdn: "https://unpkg.com/flatpickr@$VERSION/dist/flatpickr.min.css",
            bowerPath: "flatpickr/dist/flatpickr.min.css",
            npmPath: "flatpickr/dist/flatpickr.min.css",
        },
        {
            name: "flatpickr-calendar-js",
            type: "js",
            version: FLATPICKR_VERSION,
            cdn: "https://unpkg.com/flatpickr@$VERSION",
            bowerPath: "flatpickr/dist/flatpickr.min.js",
            npmPath: "flatpickr/dist/flatpickr.min.js",
        }
    ];

    
    var SELECTR_LIB = [
        {
            name: "selectr-css",
            type: "css",
            version: SELECTR_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/mobius1/selectr@latest/dist/selectr.min.css",
            bowerPath: "mobius1-selectr/dist/selectr.min.css",
            npmPath: "mobius1-selectr/dist/selectr.min.css",
        },
        {
            name: "selectr-js",
            type: "js",
            version: SELECTR_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/mobius1/selectr@latest/dist/selectr.min.js",
            bowerPath: "mobius1-selectr/dist/selectr.min.js",
            npmPath: "mobius1-selectr/dist/selectr.min.js"
        }
    ];

    var DATATABLES_LIB = [
        JQUERY_LIB,
        [
            {
                name: "jszip",
                type: "js",
                version: JSZIP_VERSION,
                cdn: "https://cdnjs.cloudflare.com/ajax/libs/jszip/$VERSION/jszip.min.js",
                bowerPath: "jszip/dist/jszip.min.js",
                npmPath: "jszip/dist/jszip.min.js",
            },
            {
                name: "pdfmake",
                type: "js",
                version: PDFMAKE_VERSION,
                cdn: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/$VERSION/pdfmake.min.js",
                bowerPath: "pdfmake/build/pdfmake.min.js",
                npmPath: "pdfmake/build/pdfmake.min.js",
            },
        ],
        {
            name: "pdfmake-fonts",
            type: "js",
            version: PDFMAKE_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/$VERSION/vfs_fonts.js",
            bowerPath: "pdfmake/build/vfs_fonts.js",
            npmPath: "pdfmake/build/vfs_fonts.js",
        },
        {
            name: "datatables-js",
            type: "js",
            version: DATATABLES_VERSION,
            cdn: "https://cdn.datatables.net/$VERSION/js/jquery.dataTables.min.js",
            bowerPath: "datatables.net/js/jquery.dataTables.js",
            npmPath: "datatables.net/js/jquery.dataTables.js",
        },
        [
            {
                name: "datatables-autofill-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/autofill/2.2.2/js/dataTables.autoFill.min.js",
                bowerPath: "datatables.net-autofill/js/dataTables.autoFill.min.js",
                npmPath: "datatables.net-autofill/js/dataTables.autoFill.min.js",
            },
            {
                name: "datatables-buttons-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/buttons/1.5.1/js/dataTables.buttons.min.js",
                bowerPath: "datatables.net-buttons/js/dataTables.buttons.min.js",
                npmPath: "datatables.net-buttons/js/dataTables.buttons.min.js",
            },
            {
                name: "datatables-buttons-colVis-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/buttons/1.5.1/js/buttons.colVis.min.js",
                bowerPath: "datatables.net-buttons/js/buttons.colVis.min.js",
                npmPath: "datatables.net-buttons/js/buttons.colVis.min.js",
            },
            {
                name: "datatables-buttons-html5-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/buttons/1.5.1/js/buttons.html5.min.js",
                bowerPath: "datatables.net-buttons/js/buttons.html5.min.js",
                npmPath: "datatables.net-buttons/js/buttons.html5.min.js",
            },
            {
                name: "datatables-buttons-print-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/buttons/1.5.1/js/buttons.print.min.js",
                bowerPath: "datatables.net-buttons/js/buttons.print.min.js",
                npmPath: "datatables.net-buttons/js/buttons.print.min.js",
            },
            {
                name: "datatables-colreorder-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/colreorder/1.4.1/js/dataTables.colReorder.min.js",
                bowerPath: "datatables.net-colreorder/js/dataTables.colReorder.min.js",
                npmPath: "datatables.net-colreorder/js/dataTables.colReorder.min.js",
            },
            {
                name: "datatables-fixedcolumns-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/fixedcolumns/3.2.4/js/dataTables.fixedColumns.min.js",
                bowerPath: "datatables.net-fixedcolumns/js/dataTables.fixedColumns.min.js",
                npmPath: "datatables.net-fixedcolumns/js/dataTables.fixedColumns.min.js",
            },
            {
                name: "datatables-fixedheader-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/fixedheader/3.1.3/js/dataTables.fixedHeader.min.js",
                bowerPath: "datatables.net-fixedheader/js/dataTables.fixedHeader.min.js",
                npmPath: "datatables.net-fixedheader/js/dataTables.fixedHeader.min.js",
            },
            {
                name: "datatables-responsive-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/responsive/2.2.1/js/dataTables.responsive.min.js",
                bowerPath: "datatables.net-responsive/js/dataTables.responsive.min.js",
                npmPath: "datatables.net-responsive/js/dataTables.responsive.min.js",
            },
            {
                name: "datatables-rowgroup-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/rowgroup/1.0.2/js/dataTables.rowGroup.min.js",
                bowerPath: "datatables.net-rowgroup/js/dataTables.rowGroup.min.js",
                npmPath: "datatables.net-rowgroup/js/dataTables.rowGroup.min.js",
            },
            {
                name: "datatables-rowreorder-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/rowreorder/1.2.3/js/dataTables.rowReorder.min.js",
                bowerPath: "datatables.net-rowreorder/js/dataTables.rowReorder.min.js",
                npmPath: "datatables.net-rowreorder/js/dataTables.rowReorder.min.js",
            },
            {
                name: "datatables-scroller-js",
                type: "js",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/scroller/1.4.4/js/dataTables.scroller.min.js",
                bowerPath: "datatables.net-scroller/js/dataTables.scroller.min.js",
                npmPath: "datatables.net-scroller/js/dataTables.scroller.min.js",
            }
        ],
        {
            name: "datatables-select-js",
            type: "js",
            version: DATATABLES_VERSION,
            cdn: "https://cdn.datatables.net/select/1.2.5/js/dataTables.select.min.js",
            bowerPath: "datatables.net-select/js/dataTables.select.min.js",
            npmPath: "datatables.net-select/js/dataTables.select.min.js",
        },
    ];

    var PDFOBJECT_LIB = [
        {
            name: "pdfobject",
            type: "js",
            version: PDFOBJECT_VERSION,
            cdn: "https://bowercdn.net/c/pdfobject2-$VERSION/pdfobject.min.js",
            bowerPath: "pdfobject/pdfobject.min.js",
            npmPath: "pdfobject/pdfobject.min.js",
        }
    ];
    
    var QUILL_LIB = [
        {
            name: "quill",
            type: "js",
            version: QUILL_VERSION,
            cdn: "https://cdn.quilljs.com/$VERSION/quill.js",
            bowerPath: "quill/dist/quill.min.js",
            npmPath: "quill/dist/quill.min.js",
        },
        {
            name: "quill-css-snow",
            type: "css",
            version: QUILL_VERSION,
            cdn: "https://cdn.quilljs.com/$VERSION/quill.snow.css",
            bowerPath: "quill/dist/quill.snow.css",
            npmPath: "quill/dist/quill.snow.css",
        },
        {
            name: "quill-css-bubble",
            type: "css",
            version: QUILL_VERSION,
            cdn: "https://cdn.quilljs.com/$VERSION/quill.bubble.css",
            bowerPath: "quill/dist/quill.bubble.css",
            npmPath: "quill/dist/quill.bubble.css",
        }
    ];


    extension.libs = [
        JQUERY_LIB,
        INPUT_MASK_LIB,
        NUMBRO_LIB,
        DECIMALJS_LIB,
        FLATPICKR_LIB,
        SELECTR_LIB,
        DATATABLES_LIB,
        PDFOBJECT_LIB,
        QUILL_LIB,
        {
            name: "datatables-locales",
            type: "json",
            version: DATATABLES_VERSION,
            cdn: "https://cdn.datatables.net/plug-ins/$VERSION/i18n/*.json",
            bowerPath: "datatables.net-plugins/i18n/*.lang",
            npmPath: "datatables.net-plugins/i18n/*.lang",
        },
        {
            name: "flatpickr-calendar-locales",
            type: "js",
            version: FLATPICKR_VERSION,
            cdn: "https://npmcdn.com/flatpickr@$VERSION/dist/l10n/*.js",
            bowerPath: "flatpickr/dist/l10n/*.js",
            npmPath: "flatpickr/dist/l10n/*.js",
        },
        {
            name: "moment-locales",
            type: "js",
            version: MOMENTJS_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/moment.js/$VERSION/locale/*.js",
            bowerPath: "moment/locale/*.js",
            npmPath: "moment/locale/*.js"
        }
    ] ;

    /**
     * Translate the locale code in flatpicker naming conviention
     * 
     * Fallback to default US locale if lang not found
     * 
     * @param {string} lang the lang code from current locale
     */
    function flatpickerLocaleCode(lang){
        var availableLocales = ["ar", "bg", "bn", "cat", "cs", "cy", "da", "de", "eo", "es", "et", "fa", "fi", "fr", "gr", "he", "hi", "hr", "hu", "id", "it", "ja", "ko", "lt", "lv", "mk", "ms", "my", "nl", "no", "pa", "pl", "pt", "ro", "ru", "si", "sk", "sl", "sq", "sr", "sv", "th", "tr", "uk", "vn", "zh"];

        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        return "" ;
    }

    /**
     * Translate the locale code in moment naming conviention
     * 
     * Fallback to default US locale if lang not found
     * 
     * @param {string} lang the lang code from current locale
     */
    function momentLocaleCode(lang){
        var availableLocales = ["af", "ar-dz", "ar", "ar-kw", "ar-ly", "ar-ma", "ar-sa", "ar-tn", "az", "be", "bg", "bn", "bo", "br", "bs", "ca", "cs", "cv", "cy", "da", "de-at", "de-ch", "de", "dv", "el", "en-au", "en-ca", "en-gb", "en-ie", "en-nz", "eo", "es-do", "es", "et", "eu", "fa", "fi", "fo", "fr-ca", "fr-ch", "fr", "fy", "gd", "gl", "gom-latn", "he", "hi", "hr", "hu", "hy-am", "id", "is", "it", "ja", "jv", "ka", "kk", "km", "kn", "ko", "ky", "lb", "lo", "lt", "lv", "me", "mi", "mk", "ml", "mr", "ms", "ms-my", "my", "nb", "ne", "nl-be", "nl", "nn", "pa-in", "pl", "pt-br", "pt", "ro", "ru", "sd", "se", "si", "sk", "sl", "sq", "sr-cyrl", "sr", "ss", "sv", "sw", "ta", "te", "tet", "th", "tlh", "tl-ph", "tr", "tzl", "tzm", "tzm-latn", "uk", "ur", "uz", "uz-latn", "vi", "x-pseudo", "yo", "zh-cn", "zh-hk", "zh-tw"];
        lang = lang.replace("_", "-").toLowerCase() ;

        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        return "en-us" ;
    }

    /**
     * Translate the locale code in datatables naming conviention
     * 
     * Fallback to default US locale if lang not found
     * 
     * @param {string} lang the lang code from current locale
     */
    function datatablesLocaleCode(lang){
        var mapLocales = {
            "af": "Afrikaans",
            "af-ZA": "Afrikaans",
            "ar": "Arabic",
            "ar-AE": "Arabic",
            "ar-BH": "Arabic",
            "ar-DZ": "Arabic",
            "ar-EG": "Arabic",
            "ar-IQ": "Arabic",
            "ar-JO": "Arabic",
            "ar-KW": "Arabic",
            "ar-LB": "Arabic",
            "ar-LY": "Arabic",
            "ar-MA": "Arabic",
            "ar-OM": "Arabic",
            "ar-QA": "Arabic",
            "ar-SA": "Arabic",
            "ar-SY": "Arabic",
            "ar-TN": "Arabic",
            "ar-YE": "Arabic",
            "az": "Azerbaijan",
            "az-AZ": "Azerbaijan",
            "be": "Belarusian",
            "be-BY": "Belarusian",
            "bg": "Bulgarian",
            "bg-BG": "Bulgarian",
            "ca": "Catalan",
            "ca-ES": "Catalan",
            "cs": "Czech",
            "cs-CZ": "Czech",
            "cy": "Welsh",
            "cy-GB": "Welsh",
            "da": "Danish",
            "da-DK": "Danish",
            "de": "German",
            "de-AT": "German",
            "de-CH": "German",
            "de-DE": "German",
            "de-LI": "German",
            "de-LU": "German",
            "el": "Greek",
            "el-GR": "Greek",
            "en": "English",
            "en-AU": "English",
            "en-BZ": "English",
            "en-CA": "English",
            "en-CB": "English",
            "en-GB": "English",
            "en-IE": "English",
            "en-JM": "English",
            "en-NZ": "English",
            "en-PH": "English",
            "en-TT": "English",
            "en-US": "English",
            "en-ZA": "English",
            "en-ZW": "English",
            "es": "Spanish",
            "es-AR": "Spanish",
            "es-BO": "Spanish",
            "es-CL": "Spanish",
            "es-CO": "Spanish",
            "es-CR": "Spanish",
            "es-DO": "Spanish",
            "es-EC": "Spanish",
            "es-ES": "Spanish",
            "es-GT": "Spanish",
            "es-HN": "Spanish",
            "es-MX": "Spanish",
            "es-NI": "Spanish",
            "es-PA": "Spanish",
            "es-PE": "Spanish",
            "es-PR": "Spanish",
            "es-PY": "Spanish",
            "es-SV": "Spanish",
            "es-UY": "Spanish",
            "es-VE": "Spanish",
            "et": "Estonian",
            "et-EE": "Estonian",
            "eu": "Basque",
            "eu-ES": "Basque",
            "fi": "Finnish",
            "fi-FI": "Finnish",
            "fr": "French",
            "fr-BE": "French",
            "fr-CA": "French",
            "fr-CH": "French",
            "fr-FR": "French",
            "fr-LU": "French",
            "fr-MC": "French",
            "gl": "Galician",
            "gl-ES": "Galician",
            "gu": "Gujarati",
            "gu-IN": "Gujarati",
            "he": "Hebrew",
            "he-IL": "Hebrew",
            "hi": "Hindi",
            "hi-IN": "Hindi",
            "hr": "Croatian",
            "hr-BA": "Croatian",
            "hr-HR": "Croatian",
            "hu": "Hungarian",
            "hu-HU": "Hungarian",
            "hy": "Armenian",
            "hy-AM": "Armenian",
            "id": "Indonesian",
            "id-ID": "Indonesian",
            "is": "Icelandic",
            "is-IS": "Icelandic",
            "it": "Italian",
            "it-CH": "Italian",
            "it-IT": "Italian",
            "ja": "Japanese",
            "ja-JP": "Japanese",
            "ka": "Georgian",
            "ka-GE": "Georgian",
            "kk": "Kazakh",
            "kk-KZ": "Kazakh",
            "ko": "Korean",
            "ko-KR": "Korean",
            "ky": "Kyrgyz",
            "ky-KG": "Kyrgyz",
            "lt": "Lithuanian",
            "lt-LT": "Lithuanian",
            "mk": "Macedonian",
            "mk-MK": "Macedonian",
            "mn": "Mongolian",
            "mn-MN": "Mongolian",
            "ms": "Malay",
            "ms-BN": "Malay",
            "ms-MY": "Malay",
            "nb": "Norwegian-Bokmal",
            "nb-NO": "Norwegian-Bokmal",
            "nl": "Dutch",
            "nl-BE": "Dutch",
            "nl-NL": "Dutch",
            "nn-NO": "Norwegian-Nynorsk",
            "pl": "Polish",
            "pl-PL": "Polish",
            "ps": "Pashto",
            "ps-AR": "Pashto",
            "pt": "Portuguese",
            "pt-BR": "Portuguese-Brasil",
            "pt-PT": "Portuguese",
            "ro": "Romanian",
            "ro-RO": "Romanian",
            "ru": "Russian",
            "ru-RU": "Russian",
            "sk": "Slovak",
            "sk-SK": "Slovak",
            "sl": "Slovenian",
            "sl-SI": "Slovenian",
            "sq": "Albanian",
            "sq-AL": "Albanian",
            "sr-BA": "Serbian",
            "sr-SP": "Serbian",
            "sv": "Swedish",
            "sv-FI": "Swedish",
            "sv-SE": "Swedish",
            "sw": "Swahili",
            "sw-KE": "Swahili",
            "ta": "Tamil",
            "ta-IN": "Tamil",
            "te": "telugu",
            "te-IN": "telugu",
            "th": "Thai",
            "th-TH": "Thai",
            "tr": "Turkish",
            "tr-TR": "Turkish",
            "uk": "Ukrainian",
            "uk-UA": "Ukrainian",
            "ur": "Urdu",
            "ur-PK": "Urdu",
            "uz": "Uzbek",
            "uz-UZ": "Uzbek",
            "vi": "Vietnamese",
            "vi-VN": "Vietnamese",

        } ;
        
        if(mapLocales[lang]){
            return mapLocales[lang] ;
        } 
        
        return "English" ;
    }

    /**
     * Load the local for datatable and configure datatable with it
     * 
     * @param {function(Error)} callback called on finished
     */
    function loadDatatablesLibLocale(callback){
        var dtLangName = datatablesLocaleCode(currentLocale.lang);
        var lib =  {
            name: "datatables-locale-"+dtLangName,
            type: "json",
            version: DATATABLES_VERSION,
            cdn: "https://cdn.datatables.net/plug-ins/$VERSION/i18n/"+dtLangName+".json",
            bowerPath: "datatables.net-plugins/i18n/"+dtLangName+".lang",
            npmPath: "datatables.net-plugins/i18n/"+dtLangName+".lang",
        };

        loadLib("datatables-locale-"+dtLangName, DATATABLES_VERSION, lib, function(err, results){
            if(err){ return callback(err) ;}
            var existingLanguage = window.jQuery.fn.dataTable.defaults.language ;
            if(existingLanguage){
                window.jQuery.extend( true, results, existingLanguage) ;
            }
            window.jQuery.extend( true, window.jQuery.fn.dataTable.defaults, {
                language: results
            } );
            callback() ;
        }) ;
    }

    /**
     * Load the locales for date fields
     * It get locales for flatpikr calendar and get moment locale to have default date format for current lang
     * 
     * Note : we are using moment locales but we don't load moment if it is not already loaded. We don't rely on moment libs
     * 
     * @param {function(Error)} callback called on finish
     */
    function loadDateLibLocale(callback){
        var libPicker =  {
                name: "flatpickr-calendar-locale-"+flatpickerLocaleCode(currentLocale.lang),
                type: "js",
                version: FLATPICKR_VERSION,
                cdn: "https://npmcdn.com/flatpickr@$VERSION/dist/l10n/"+flatpickerLocaleCode(currentLocale.lang)+".js",
                bowerPath: "flatpickr/dist/l10n/"+flatpickerLocaleCode(currentLocale.lang)+".js",
                npmPath: "flatpickr/dist/l10n/"+flatpickerLocaleCode(currentLocale.lang)+".js",
        };
        var libMoment =  {
                name: "moment-locale-"+momentLocaleCode(currentLocale.lang),
                type: "js",
                version: MOMENTJS_VERSION,
                cdn: "https://cdnjs.cloudflare.com/ajax/libs/moment.js/$VERSION/locale/"+momentLocaleCode(currentLocale.lang)+".js",
                bowerPath: "moment/locale/"+momentLocaleCode(currentLocale.lang)+".js",
                npmPath: "moment/locale/"+momentLocaleCode(currentLocale.lang)+".js"
        };

        var calls = [] ;

        if(flatpickerLocaleCode(currentLocale.lang)){
            calls.push(function(cb){
                loadLib("flatpicker-locale-"+currentLocale.lang, FLATPICKR_VERSION, libPicker, cb) ;
            }) ;
        }
        
        if(!libs.moment && !window.moment){
            //no moment lib available, add polyfill
            window.moment = {
                locales : {
                    "en-us": {
                        _longDateFormat : {
                            LTS  : 'h:mm:ss A',
                            LT   : 'h:mm A',
                            L    : 'MM/DD/YYYY',
                            LL   : 'MMMM D, YYYY',
                            LLL  : 'MMMM D, YYYY h:mm A',
                            LLLL : 'dddd, MMMM D, YYYY h:mm A'
                        }
                    }
                },
                defineLocale : function(code, localeDef){
                    localeDef._longDateFormat = localeDef.longDateFormat ;
                    this.locales[code] = localeDef ;
                },
                localeData: function(code){
                    return this.locales[code] ;
                }
            };
            libs.moment = window.moment ;
        }
        if(window.moment && !libs.moment){
            libs.moment = window.moment ;
        }
        if(!libs.moment.localeData(momentLocaleCode(currentLocale.lang))){
            if(!window.moment){
                window.moment = libs.moment;
            }
            calls.push(function(cb){
                loadLib("moment-locale-"+momentLocaleCode(currentLocale.lang), MOMENTJS_VERSION, libMoment, cb) ;
            }) ;
        }
        
        series(calls, callback) ;
    }
    

    /**
     * init view fields
     * 
     * get all HTML elements having data-field attribute
     * 
     * @private
     */
    function doPrepareView(params, callback){
        var elements = params.doc.querySelectorAll("[data-field]");
        for(var i=0; i<elements.length; i++){
            (function (element){
                var fieldType = element.getAttribute("data-field") ;
                var fieldOptions = {} ;
                Array.prototype.slice.call(element.attributes).forEach(function(att){
                    var startIndex = "data-field-".length ;
                    var attKey = att.name ;
                    if(attKey.indexOf("data-field") === 0 && attKey.length > startIndex){
                        fieldOptions[attKey.substring(startIndex)] = element.getAttribute(attKey) ;
                    }
                }) ;
                setNeededLib(fieldType, fieldOptions) ;
            })(elements[i]) ;
        }
        loadLibs(callback) ;
    }

    /**
     * init view fields
     * 
     * get all HTML elements having data-field attribute
     * 
     * @private
     */
    function doInitView(){
        var view = this;
        var elements = this.elementsHavingAttribute("data-field");
        for(var i=0; i<elements.length; i++){
            var element = elements[i] ;
            var fieldType = element.getAttribute("data-field") ;
            var fieldSize = element.getAttribute("data-field-size") ;
            var fieldOptions = {} ;
            Array.prototype.slice.call(element.attributes).forEach(function(att){
                var startIndex = "data-field-".length ;
                var attKey = att.name ;
                if(attKey.indexOf("data-field") === 0 && attKey.length > startIndex){
                    fieldOptions[attKey.substring(startIndex)] = element.getAttribute(attKey) ;
                }
            }) ;
            createField(view, element, fieldType, fieldSize, fieldOptions) ;
        }
        this.on("displayed", function(ev){
            if(ev.data.view === this){
                var grids = this.container.querySelectorAll("[data-field=grid]");
                for(var i=0; i<grids.length; i++){
                    grids[i].render() ;
                }
            }
        }.bind(this)) ;
    }

    var libsToLoad = {} ;

    function setLibToLoad(name, loader){
        if(!libsToLoad[name]){
            libsToLoad[name] = {loader:loader, status: "to_load"} ;
        }
    }   

    function loadLibs(callback){
        var calls = [] ;
        Object.keys(libsToLoad).forEach(function(k){
            if(libsToLoad[k].status === "to_load"){
                calls.push(function(cb){
                    libsToLoad[k].loader(function(err){
                        if(err){
                            return cb(err) ;
                        }
                        libsToLoad[k].status = "done" ;
                        cb() ;
                    }) ;
                });
            }
        });
        series(calls, callback) ;
    }

    function setNeededLib(fieldType, fieldOptions){
        if(fieldType === "varchar" || fieldType==="text" || fieldType === "string" || fieldType === "password"){
            if(fieldOptions && fieldOptions.mask){
                setLibToLoad("inputMask", loadInputMask) ;
            }
        } else if(fieldType === "int" || fieldType === "integer" || fieldType==="number" || fieldType==="decimal" || fieldType==="numeric" ||
            fieldType==="double" || fieldType==="float" || fieldType==="float8" || fieldType==="currency" || fieldType==="percent"){
            setLibToLoad("Decimal", function(done){
                loadLib("Decimal", DECIMALJS_VERSION, DECIMALJS_LIB, done) ;
            }) ;
            setLibToLoad("inputMask", loadInputMask) ;
            setLibToLoad("locale", getLocale) ;
        } else if(fieldType === "email"){
            setLibToLoad("inputMask", loadInputMask) ;
        } else if(["date", "datetime", "time", "timestamp", "timestamptz"].indexOf(fieldType) !== -1){
            setLibToLoad("flatpickr", function(done){
                loadLib("flatpickr", FLATPICKR_VERSION, FLATPICKR_LIB, done) ;
            }) ;
            setLibToLoad("inputMask", loadInputMask) ;
            setLibToLoad("locale", getLocale) ;
            setLibToLoad("localeDate", loadDateLibLocale) ;
        } else if(fieldType === "selection" || fieldType === "select"){
            setLibToLoad("selectr", function(done){
                loadLib("selectr", SELECTR_VERSION, SELECTR_LIB, done) ;
            }) ;
            loadSelectCSS() ;
        } else if(fieldType === "bool" || fieldType === "boolean" || fieldType === "checkbox"  || fieldType === "toggle" || fieldType === "switch"){
            //no lib
        } else if(fieldType === "grid"){
            setLibToLoad("datatables", function(done){
                loadLib("datatables", DATATABLES_VERSION, DATATABLES_LIB, done) ;
            }) ;
            setLibToLoad("locale", getLocale) ;
            setLibToLoad("localeW2ui", loadDatatablesLibLocale) ;
        } else if(fieldType === "upload"){
            //no lib
        } else if(fieldType === "pdf"){
            setLibToLoad("PDFObject", function(done){
                loadLib("PDFObject", PDFOBJECT_VERSION, PDFOBJECT_LIB, done) ;
            }) ;
        } else if(fieldType === "html"){
            setLibToLoad("Quill", function(done){
                loadLib("Quill", QUILL_VERSION, QUILL_LIB, done) ;
            }) ;
            loadHTMLEditorCSS() ;
        } else {
            throw "Unknow field type "+fieldType ; 
        }
    }

    /**
     * Create the field
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */
    function createField(view, element, fieldType, fieldSize, fieldOptions){
        //dispatch bound event on container element
        view.emit('beforeInitField', {id: element.getAttribute("data-original-id"), element: element, fieldType: fieldType, fieldOptions: fieldOptions});
        _createField(element, fieldType, fieldSize, fieldOptions, view) ;
        decorators.forEach(function(deco){
            deco(element, fieldType, fieldSize, fieldOptions) ;
        }) ;
        if(element.hasAttribute("readonly")){
            element.setReadOnly(true) ;
        }
        view.emit('afterInitField', {id: element.getAttribute("data-original-id"), element: element, fieldType: fieldType, fieldOptions: fieldOptions});
    }

    /**
     * Create the field
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */
    function _createField(element, fieldType, fieldSize, fieldOptions, view){
        if(fieldType === "varchar" || fieldType==="text" || fieldType === "string" || fieldType === "password"){
            createTextField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "int" || fieldType === "integer" || fieldType==="number" || fieldType==="numeric" || fieldType==="decimal" || 
            fieldType==="double" || fieldType==="float"  || fieldType==="float8" || fieldType==="currency" || fieldType==="percent"){
            createNumberField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "email"){
            createEmailField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(["date", "datetime", "time", "timestamp", "timestamptz"].indexOf(fieldType) !== -1){
            createDateField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "selection" || fieldType === "select"){
            createSelectField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "bool" || fieldType === "boolean" || fieldType === "checkbox"  || fieldType === "toggle" || fieldType === "switch"){
            createCheckboxField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "grid"){
            createGridField(element, fieldType, fieldSize, fieldOptions, view) ;
        } else if(fieldType === "upload"){
            createUploadField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "pdf"){
            createPdfField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "html"){
            createHTMLField(element, fieldType, fieldSize, fieldOptions) ;
        } else {
            throw "Unknow field type "+fieldType ; 
        }
    }

    /**
     * Load a lib from CDN/Bower if not already loaded or given in configure.libs
     * 
     * @param {string} name lib name
     * @param {string} version the lib version
     * @param {object} libDef the lib def for VeloxScriptLoader
     * @param {function(Err)} callback called on loaded
     */
    function loadLib(name, version, libDef, callback){
        if(!libs[name]){
            if(window[name]){
                libs[name] = window[name] ;
                return callback() ;
            }

            console.debug("No "+name+" object given, we will load from CDN/bower"+
            ". If you don't want this, add the lib "+name+ " (version "+version+")"+
                " in your global import scripts or give "+name+" object to VeloxWebView.field.configure({libs : { "+name+": __here__ }})");

            if (!VeloxScriptLoader) {
                return callback("To have automatic script loading, you need to import VeloxScriptLoader");
            }

            VeloxScriptLoader.load(libDef, function(err, result){
                if(err){ return callback(err); }
                libs[name] = window[name] ;
                callback(null, result) ;
            }) ;
        }else{
            callback() ;
        }
    }

    /**
     * Set the field as readonly or not
     * 
     * @param {HTMLElement} element the element to set as readonly
     * @param {boolean} readOnly the flag read only or not
     */
    function setReadOnly(element, readOnly) {
        element._veloxIsReadOnly = readOnly ;
        var input = element.getElementsByTagName("input")[0] ;
        if(input){
            if(input.type === "text" || input.type === "password"){
                input.readOnly = readOnly ;
            }else{
                input.disabled = readOnly ;
            }
        } else {
            var select = element.getElementsByTagName("select")[0] ;
            select.disabled = readOnly ;
        }

        if(readOnly){
            if(element.className.indexOf("readonly") === -1){
                element.className += " readonly" ;
            }
        }else{
            if(element.className.indexOf("readonly") !== -1){
                element.className = element.className.replace("readonly", "") ;
            }
        }
    }

    /**
     * Load the input mask lib if needed and add mask aliases
     * 
     * @param {function(Error)} callback called on loaded
     */
    function loadInputMask(callback){
        loadLib("Inputmask", INPUTMASK_VERSION, INPUT_MASK_LIB, function(err){
            if(err){ return callback(err);}

            libs.Inputmask.extendAliases({
                'uppercase': {
                    mask: "*{*}",
                    casing: "upper"
                },
                'lowercase': {
                    mask: "*{*}",
                    casing: "lower"
                }
            });
            callback() ;
        }) ;
    }

    /**
     * Create a text field
     * 
     * If mask option is provided, an input mask is added to the field
     * 
     * The maxlength is set accordingly to the fieldSize option if given
     * 
     * @param {HTMLElement} element HTML element to transform
     * @param {"password"|"varchar"|"text"|"string"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field option (from attributes)
     * @param {function(Error)} callback called when finished
     */
    function createTextField(element, fieldType, fieldSize, fieldOptions){
        var input = appendInputHtml(element) ;
        if(fieldType === "password"){
            input.type = "password" ;
        }
        
        if(fieldSize){
            var fieldSize = parseInt(fieldSize, 10) ;
            if(isNaN(fieldSize)){
                throw ("Incorrect field size option : "+fieldSize+" on "+elToString(element)) ;
            }
            input.maxLength = fieldSize ;
        }

        var maskField = null;

        element.getValue = function(){
            if(maskField){
                return maskField._valueGet() ;
            }
            return input.value ;
        } ;
        element.setValue = function(value){
            input.value = value?""+value:"";
            if(maskField){
                maskField._valueSet(value) ;
            }
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;

        element.focus = function(){
            input.focus() ;
        };

        // ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
        //     input.addEventListener(eventName, function(ev){
        //         var cloneEv = new ev.constructor(ev.type, ev);
        //         element.dispatchEvent(cloneEv);
        //     }) ;
        // }) ;

        if( fieldOptions.mask){
            var im = new libs.Inputmask(fieldOptions.mask);
            maskField = im.mask(input) ;
        }
    }

    /**
     * Add extra data to localdata such as thousands and decimal delimiters
     * 
     * Try to rely on toLocaleString browser if supported, if not supported, the numbro lib is loaded
     * 
     * @param {function(Error)} callback called on finished
     */
    function fillLocales(callback){
        if((99.99).toLocaleString('fr') === "99,99"){
            //the browser support locale string
            var localizedNumber = (1000.99).toLocaleString(currentLocale.lang) ;
            currentLocale.delimiters.thousands = localizedNumber[1] ;
            currentLocale.delimiters.decimal = localizedNumber[5] ;
            callback() ;
        }else{
            //the browser does not support locale string, load numbro lib
            loadLib("numbro", NUMBRO_VERSION, NUMBRO_LIB, function(err){
                if(err){ return callback(err); }

                var numbroLangName = currentLocale.lang ;
                var numbroCultures = libs.numbro.cultures() ;
                if(!numbroCultures[numbroLangName]){ //lang code not found
                    if(numbroCultures[numbroLangName+"-"+numbroLangName.toUpperCase()]){ //try with same as region code (ex : fr-FR)
                        numbroLangName = numbroLangName+"-"+numbroLangName.toUpperCase() ;
                    }else{
                        //search a lang code starting with our lang code
                        var foundStartWith = Object.keys(numbroCultures).some(function(l){
                            if(l.indexOf(numbroLangName) === 0){
                                numbroLangName = l;
                                return true;
                            }
                        });
                        if(!foundStartWith){
                            //found nothing, fallback to en-US
                            numbroLangName = "en-US" ;
                        }
                    }
                }

                var langData = libs.numbro.cultureData(numbroLangName); 
                currentLocale.delimiters.thousands = langData.delimiters.thousands ;
                currentLocale.delimiters.decimal = langData.delimiters.decimal ;
                callback() ;
            }) ;
        }
    }

    /**
     * Get the current locale of user
     * 
     * If the i18n extension is loaded, the locale is get from i18n extension
     * If not, it is get from browser lang
     * 
     * If the i18n is loaded, the locale is automatically reloaded when locale change
     * (note : it will be applied on new loaded view only, the existing view are not reload)
     * 
     * @param {function(Error)} callback called on finished
     */
    function getLocale(callback){
        if(!currentLocale){
            currentLocale = {
                lang: navigator.language || navigator.userLanguage,
                delimiters : {}
            } ;
            if(VeloxWebView.i18n){
                currentLocale.lang = VeloxWebView.i18n.getLang() ;
                VeloxWebView.i18n.onLanguageChanged(function(newLang){
                    currentLocale.lang = newLang ;
                    fillLocales(function(err){
                        if(err){
                            return console.error("Error while reloading locales", err) ;
                        }
                        console.debug("Locales reloaded") ;
                    });
                });
                fillLocales(callback) ;
            }else{
                fillLocales(callback) ;
            }
        }else{
            callback() ;
        }
    }

    /**
     * Create a input masked number field.
     * 
     * The value is given in Decimal.js object to be able to handle big numbers and avoid rounding issues
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"int"|"integer"|"number"|"decimal"|"double"|"float"|"precent"|"currency"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options (from attributes)
     * @param {function(Error)} callback called when field is created
     */
    function createNumberField(element, fieldType, fieldSize, fieldOptions){
        loadNumberCSS() ;
        var input = appendInputHtml(element) ;
        input.type = "number" ;
        if(fieldType==="decimal" || fieldType==="numeric" || fieldType==="double" || fieldType==="float" || fieldType==="float8" || fieldType==="percent" || fieldType==="currency"){
            input.step="0.01" ;
        }

        element.getValue = function(){
            return input.value ;
        } ;
        element.setValue = function(value){
            input.value = value ;
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;

        element.focus = function(){
            input.focus() ;
        };
        
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                var cloneEv = new ev.constructor(ev.type, ev);
                element.dispatchEvent(cloneEv);
            }) ;
        }) ;

    }

    /**
     * Create a input masked email field.
     * 
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {string} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options (from attributes)
     */
    function createEmailField(element, fieldType, fieldSize, fieldOptions){
        var input = appendInputHtml(element) ;
        var maskField = null;

        element.getValue = function(){
            if(maskField){
                return maskField._valueGet() ;
            }
            return input.value ;
        } ;
        element.setValue = function(value){
            input.value = value?""+value:"";
            if(maskField){
                maskField._valueSet(value) ;
            }
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                var cloneEv = new ev.constructor(ev.type, ev);
                element.dispatchEvent(cloneEv);
            }) ;
        }) ;

        
        var im = new libs.Inputmask("email");
        maskField = im.mask(input) ;
    }

    /**
     * Create the date field.
     * 
     * Date field present popup calendar and masked input
     * 
     * The input format is automatically taken from locale
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"date"|"datetime"|"time"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options (from attributes)
     */
    function createDateField(element, fieldType, fieldSize, fieldOptions){
        var input = appendInputHtml(element) ;
        var maskField = null;
        var pickrField = null;


        element.getValue = function(){
            var value = null;
            if(pickrField && pickrField.selectedDates.length > 0){
                value = pickrField.selectedDates[0] ;
            }
            return value ;
        } ;
        element.setValue = function(value){
            pickrField.setDate(value, false) ;
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
            if(readOnly){
                input.setAttribute('disabled', 'disabled') ;
            }else{
                input.removeAttribute('disabled') ;
            }
        } ;
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                var cloneEv = new ev.constructor(ev.type, ev);
                element.dispatchEvent(cloneEv);
            }) ;
        }) ;
        

        var localeData = libs.moment.localeData(momentLocaleCode(currentLocale.lang)) ;
        var localeDateFormat = localeData._longDateFormat.L ;
        if(["datetime", "timestamp", "timestamptz"].indexOf(fieldType) !== -1){
            localeDateFormat = localeData._longDateFormat.L + " "+localeData._longDateFormat.LT ;
        }else if(fieldType === "time"){
            localeDateFormat = localeData._longDateFormat.LT ;
        }

        var useAMPM = localeData._longDateFormat.LT.indexOf("A") !== -1 ;


        var flatpickrOptions = {
            allowInput: true,
            //https://chmln.github.io/flatpickr/formatting/
            dateFormat : localeDateFormat
                .replace("YYYY", "Y").replace("YY", "y").replace("DD", "d").replace("MM", "m")
                .replace("HH", "H").replace("mm", "i").replace("A", "K"),
            enableTime : fieldType.indexOf("time") !== -1,
            noCalendar: fieldType === "time",
            time_24hr: !useAMPM
        } ;

        
        

        if(flatpickerLocaleCode(currentLocale.lang)){
            flatpickrOptions.locale = flatpickerLocaleCode(currentLocale.lang) ;
        }

        pickrField = libs.flatpickr(input, flatpickrOptions);
        
        var maskFormat = localeDateFormat.toLowerCase() ;
        if(fieldType === "datetime" || fieldType === "timestamp" || fieldType === "timestamptz"){
            maskFormat = "datetime" ;
            if(useAMPM){
                maskFormat = "datetime12" ;
                if(localeDateFormat.indexOf("MM") === 0){
                    //start by month (US)
                    maskFormat = "mm/dd/yyyy hh:mm xm" ;
                }
            }
        }else if(fieldType === "time"){
            maskFormat = "hh:mm" ;
            if(useAMPM){
                maskFormat = "hh:mm t" ;
            }
        }
        var im = new libs.Inputmask(maskFormat, {placeholder: "_"});
        maskField = im.mask(input) ;

        input.addEventListener("blur", function(){
            pickrField.setDate(maskField._valueGet(), false) ;
        }) ;
    }

    /**
     * load the Switch CSS
     */
    function loadSwitchCSS(){
        if(switchCSSLoaded){ return ;}

        var css = "/* The switch - the box around the slider */";
        css += ".switch { position: relative; display: inline-block; width: 60px; height: 34px; }";
        css += "/* Hide default HTML checkbox */";
        css += ".switch input {display:none;}";
        css += "/* The slider */";
        css += ".slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: .4s; transition: .4s; }";
        css += '.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; -webkit-transition: .4s; transition: .4s; }';
        css += "input:checked + .slider { background-color: #2196F3; }";
        css += "input:focus + .slider { box-shadow: 0 0 1px #2196F3; }";
        css += "input:checked + .slider:before { -webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); }";
        css += "/* Rounded sliders */";
        css += ".slider.round { border-radius: 34px; }";
        css += ".slider.round:before { border-radius: 50%; }";

        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        switchCSSLoaded = true ;
    }
    

    /**
     * load the Select CSS
     */
    function loadSelectCSS(){
        if(selectCSSLoaded){ return ;}

        var css = ".selectr-selected[disabled] { color: rgb(73, 80, 87); background-color: #e9ecef; border-color: rgb(206, 212, 218);}";
        css += ".selectr-selected[disabled]::before { display: none; }";
        css += ".selectr-selected { padding: 6px 28px 6px 14px !important; }";
        css += ".selectr-disabled { opacity: 1 !important; }";
        
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        selectCSSLoaded = true ;
    }

    /**
     * load the number CSS
     */
    function loadNumberCSS(){
        if(numberCSSLoaded){ return ;}

        var css = 'input[type="number"] { text-align: right;}';
        
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        numberCSSLoaded = true ;
    }
    
    /**
     * load the html editor CSS
     */
    function loadHTMLEditorCSS(){
        if(htmlEditorCSSLoaded){ return ;}

        var css = "div[data-field=html] { height: 200px;} ";
        css += "div[data-field=html] .ql-container { height: calc(100% - 60px); } ";
        css += "div[data-field=html].readonly .ql-container { height: calc(100% - 20px); } ";
        css += "div[data-field=html].readonly .ql-toolbar { display: none } ";
        css += "div[data-field=html].readonly .ql-container.ql-snow { border-top: 1px solid #ccc; background: #eeeeee; } ";
        
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        htmlEditorCSSLoaded = true ;
    }

    /**
     * Create a select field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"select"|"selection"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions option from attribute
     */
    function createSelectField(element, fieldType, fieldSize, fieldOptions){

        var select = null ;
        if(element.tagName ===  "SELECT"){
            select = element ;
        }else{
            var subSelects = element.getElementsByTagName("SELECT") ;
            if(subSelects.length === 0){
                throw ("Your data field select should be a SELECT tag or contain a SELECT tag") ;
            }
            select = subSelects[0];
        }


        var currentValue = null;
        
        var selectr = new window.Selectr(select, {
            searchable: false,
        });

        
        selectr.setValue("") ;
        //element.style.visibility = "visible";

        element.getValue = function(){
            var value = selectr.getValue()  ;
            return value||null ;
        } ;
        element.setValue = function(value){
            currentValue = value ;
            if(value === undefined || value === null){
                return selectr.clear() ;
            }
            return selectr.setValue(value) ;
        } ;
        element.setReadOnly = function(readOnly){
            if(readOnly) {
                selectr.disable();
            }else{
                selectr.enable();
            }
            setReadOnly(element, readOnly) ;
        } ;
        // element.addEventListener = function(event, listener){
        //     $select.on(event, function(ev){
        //         ev.target = element;
        //         listener(ev) ;
        //     }); 
        // } ;

        element.setOptions = function(options){
            selectr.removeAll() ;
            element._options= options.map(function(rec){ 
                return {
                    value: rec.id,
                    text: rec.label
                } ;
            });
            selectr.add(element._options) ;
        } ;
        element.getOptions = function(){
            return element._options ;
        } ;

        if(fieldOptions.readfromtable){
            getPossibleValues(fieldOptions, function(err, values){
                if(err){
                    throw err ;
                }
                element.setOptions(values) ;
                if(currentValue){
                    setTimeout(function(){
                        selectr.setValue(currentValue) ;
                    }, 1) ;
                }
            });
        }

    }

    /**
     * Create an unique ID
     */
    function uuidv4() {
        if(typeof(window.crypto) !== "undefined" && crypto.getRandomValues){
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
                return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) ;
            }) ;
        }else{
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    /**
     * load the Datatables CSS
     * 
     * This CSS make the table take the whole height on container
     */
    function loadDatatablesCSS(){
        if(datatableCSSLoaded){ return ;}

        //
        var css = ".velox-grid { display: flex; }";
        css += ".dataTables_wrapper { display: flex; flex-direction: column; }";
        css += ".dt-table {flex-grow: 1; display: flex; flex-direction: column;} ";
        css += ".dataTables_scroll {display: flex; flex-direction: column;flex-grow: 1;}";
        css += ".dataTables_scrollBody { flex-grow: 1; flex-basis: 1px;}";

        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        datatableCSSLoaded = true ;
    }

    /**
     * Create the grid field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"grid"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions the field options (from attributes)
     */
    function createGridField(element, fieldType, fieldSize, fieldOptions, view){
        loadDatatablesCSS() ;

        var subTables = element.getElementsByTagName("TABLE") ;
        if(subTables.length === 0){
            throw ("Your data field grid should contain a TABLE tag") ;
        }
        var table = subTables[0];

        var listThead = table.getElementsByTagName("THEAD") ;
        var thead = listThead.length>0?listThead[0]:null ;

        var toolbars = table.querySelectorAll("[data-toolbar]") ;
        for(var i=0; i<toolbars.length; i++){
            //remove it to avoid mix toolbar TH element with header column TH elements
            toolbars[i].parentElement.removeChild(toolbars[i]) ;
        }
       


        var listTh = Array.prototype.slice.call(table.getElementsByTagName("TH")) ;
        if(listTh.length === 0){
            throw ("Your data field grid should have at least a TH tag") ;
        }

        var filename = "export" ;

        if(table.getAttribute("title")){
            filename = table.getAttribute("title") ;
        }
        var title = filename;

        var gridOptions = {
            //scroller: true,
            responsive: true,
            scrollY: "auto",
            paging: false,
            buttons: [
                'colvis', 
                'copy',
                {
                    extend: 'excel',
                    title: title,
                    filename: filename,
                },
                {
                    extend: 'pdf',
                    title: title,
                    filename: filename,
                },
                {
                    extend: 'print',
                    title: title,
                },
            ],
            columns: []
        } ;


        listTh.forEach(function(th, i){
            var colDef = {
                data     : th.getAttribute("data-field-name")||"f"+i,
                //width    : th.getAttribute("data-field-size")
            };

            var scriptRender = th.querySelector("script") ;
            if(scriptRender){
                var scriptBody = scriptRender.text ;
                scriptBody +=  "//# sourceURL=/column/render/"+element.getAttribute("data-original-id")+"/"+colDef.field+".js" ;
                var functionRender = new Function("data", "type", "row", scriptBody) ;
                colDef.render = functionRender ;
                th.removeChild(scriptRender) ;
            }

            var labelEl = th.querySelector("label") ;
            if(labelEl){
                colDef.title = labelEl.innerHTML ;
            }else{
                colDef.title = th.innerHTML ;
            }

            // if(colDef.width){
            //     if(colDef.size.indexOf("px") === -1 && colDef.size.indexOf("%") === -1){
            //         //no unit given, assuming px
            //         colDef.size = colDef.size+"px" ;
            //     }

            //     if(colDef.size.indexOf("px") !== -1){
            //         totalColsWithSizePx += parseInt(colDef.size.replace("px", ""), 10) ;
            //     }else if(colDef.size.indexOf("%") !== -1){
            //         totalColsWithSizePercent += parseInt(colDef.size.replace("%", ""), 10) ;
            //     }
            // }
            
            ["orderable", "sortable", "searchable", "visible"].forEach(function(colAtt){
                if(colAtt === "sortable"){
                    colAtt = "orderable" ;
                }
                var colValue = th.getAttribute(colAtt);
                if(colValue !== null){
                    colDef[colAtt] = colValue.trim().toLowerCase() !== "false" ;
                }
            });
            
            // var type = th.getAttribute("data-field-type") ;
            // colDef.fieldType = type;
            // if(!colDef.render && type){
            //     colDef.render = createGridRenderer(type, colDef.field) ;
            // }
            gridOptions.columns.push(colDef) ;
        }) ;

        
        
        var datatable = window.jQuery(table).DataTable( gridOptions );

        for(var i=0; i<toolbars.length; i++){
            var toolbar = toolbars[i];

            var customButtons = [] ;
            Array.prototype.slice.apply(toolbar.children).forEach(function(item){
                var id = item.getAttribute("data-original-id") ;
                customButtons.push({
                    text: item.innerHTML,
                    className: (item.className||"")+(" table-custom-button-"+id),
                    action: function(){
                        view.emit(id) ;
                    }
                }) ;
            }.bind(this)) ;

            var buttons = new window.jQuery.fn.dataTable.Buttons( datatable, {
                buttons: customButtons
            } );
         
            if(toolbar.getAttribute("data-toolbar-prepend")){
                buttons.container().prependTo(
                    datatable.buttons().container().parent()
                );
            }else{
                buttons.container().appendTo(
                    datatable.buttons().container().parent()
                );
            }
        }

        view.on("displayed", function(){
            //force redraw on display as width compute are not correct when hidden
            datatable.columns.adjust().draw();
        }) ;

        element.render = function(){
            datatable.columns.adjust().draw();
        } ;
        var tableData = [] ;
        element.getValue = function(){
            return tableData;
        } ;
        element.setValue = function(value){
            tableData = value;
            datatable.clear();
            datatable.rows.add(value);
            datatable.draw();
        } ;
        element.setReadOnly = function(readOnly){
            //FIXME
            console.log("implement read only on grid ?") ;
        } ;
        element.addEventListener = function(event, listener){
            if(event === "rowClick"){
                window.jQuery(element).find("tbody").on('click', 'tr', function (ev) {
                    var data = datatable.row( this ).data();
                    ev.rowData = data;
                    listener.bind(this)(ev) ;
                } );
            }
        } ;

        
        

        return;
        var listThead = table.getElementsByTagName("THEAD") ;
        var thead = listThead.length>0?listThead[0]:null ;

        var toolbar = table.querySelector("[data-toolbar]") ;
        if(toolbar){
            //remove it to avoid mix toolbar TH element with header column TH elements
            toolbar.parentElement.removeChild(toolbar) ;
        }

        var listTh = Array.prototype.slice.call(table.getElementsByTagName("TH")) ;
        if(listTh.length === 0){
            throw ("Your data field grid should have at least a TH tag") ;
        }

        var listTr = Array.prototype.slice.call(table.getElementsByTagName("TR")) ;
        


        var idPath = Array.prototype.slice.call(
        window.jQuery(element).parents()).map(function(p){ 
            return p.getAttribute("data-original-id"); 
        }).filter(function(c){ return !!c;}).reverse().join(".") ;

        var gridOptions = {
            name: idPath||"grid_"+uuidv4(),
            textSearch: "contains",
            columns   : [],
            show      : {},
            searches : []
        } ;

        ["keyboard", "recid", "markSearch", "multiSearch", "multiSelect", "multiSort", 
            "recordHeight", "reorderColumns", "reorderRows", "selectType"].forEach(function(optionAttribute){
            var optionValue = table.getAttribute(optionAttribute);
            if(optionValue){
                if(optionValue === "false"){ optionValue = false ;}
                if(optionValue === "true"){ optionValue = true ;}
                gridOptions[optionAttribute] = optionValue ;
            }
        }) ;

        if(thead){

            ["header"         ,
            "toolbar"        ,
            "footer"         ,
            "columnHeaders"  ,
            "lineNumbers"    ,
            "expandColumn"   ,
            "selectColumn"   ,
            "emptyRecords"   ,
            "toolbarInput"  ,
            "toolbarReload"  ,
            "toolbarColumns" ,
            "toolbarSearch"  ,
            "toolbarAdd"     ,
            "toolbarEdit"    ,
            "toolbarDelete"  ,
            "toolbarSave"    ,
            "selectionBorder",
            "recordTitles"   ,
            "skipRecords"].forEach(function(showAttr){
                var showValue = thead.getAttribute(showAttr);
                if(showValue){
                    gridOptions.show[showAttr] = showValue.trim().toLowerCase() === "true" ;
                }
            }) ;
        }

        if(toolbar){
            gridOptions.toolbar = {
                items: []
            };
            gridOptions.show.toolbar = true ;
            Array.prototype.slice.apply(toolbar.children).forEach(function(item){
                var toolbarItem = {
                    id : item.getAttribute("data-original-id") ,
                    text: item.innerHTML
                } ;
                ["type", "tooltip", "count", "img", "icon", "style", "group"].forEach(function(k){
                    if(item.hasAttribute("data-"+k)){
                        toolbarItem[k] = item.getAttribute("data-"+k) ;
                    }
                }) ;
                ["hidden", "hidden", "checked"].forEach(function(k){
                    if(item.hasAttribute("data-"+k)){
                        toolbarItem[k] = item.getAttribute("data-"+k) !== "false" ;
                    }
                }) ;
                if(toolbarItem.type === "html"){
                    toolbarItem.html = toolbarItem.text ;
                    delete toolbarItem.text ;
                }
                gridOptions.toolbar.items.push(toolbarItem) ;
            }.bind(this)) ;
        }


        if(Object.keys(gridOptions.show).length === 0){
            delete gridOptions.show;
        }

        var totalColsWithSizePx  = 0;
        var totalColsWithSizePercent  = 0;
        
        listTh.forEach(function(th, i){
            var colDef = {
                field     : th.getAttribute("data-field-name")||"f"+i,
                size      : th.getAttribute("data-field-size")
            };

            var scriptRender = th.querySelector("script") ;
            if(scriptRender){
                var scriptBody = scriptRender.text ;
                scriptBody +=  "//# sourceURL=/column/render/"+element.getAttribute("data-original-id")+"/"+colDef.field+".js" ;
                var functionRender = new Function("record", "index", "column_index", scriptBody) ;
                colDef.render = functionRender ;
                th.removeChild(scriptRender) ;
            }

            var labelEl = th.querySelector("label") ;
            if(labelEl){
                    colDef.caption = labelEl.innerHTML ;
            }else{
                colDef.caption = th.innerHTML ;
            }

                        
                        
            if(colDef.size){
                if(colDef.size.indexOf("px") === -1 && colDef.size.indexOf("%") === -1){
                    //no unit given, assuming px
                    colDef.size = colDef.size+"px" ;
                }

                if(colDef.size.indexOf("px") !== -1){
                    totalColsWithSizePx += parseInt(colDef.size.replace("px", ""), 10) ;
                }else if(colDef.size.indexOf("%") !== -1){
                    totalColsWithSizePercent += parseInt(colDef.size.replace("%", ""), 10) ;
                }
            }
            

            ["sortable", "searchable", "hidden"].forEach(function(colAtt){
                    var colValue = th.getAttribute(colAtt);
                    if(colValue !== null){
                        colDef[colAtt] = colValue.trim().toLowerCase() !== "false" ;
                    }
            });
            if(colDef.searchable === undefined){
                colDef.searchable = true ;
            }
            if(colDef.sortable === undefined){
                colDef.sortable = true ;
            }
            var type = th.getAttribute("data-field-type") ;
            colDef.fieldType = type;
            if(!colDef.render && type){
                colDef.render = createGridRenderer(type, colDef.field) ;
            }
            gridOptions.columns.push(colDef) ;
        }) ;
        var totalColsNoSize = gridOptions.columns.filter(function(c){ return !c.size;}).length ;
        if(totalColsNoSize > 0){
            //there is some column with no size, we must compute ideal size

            var totalWidth = element.offsetWidth-3 ;
            var totalPercent = 100 ;
            var defaultColSize = "10%" ;
            if(totalColsWithSizePx === 0){
                //no size is defined in px, use %
                var colPercent = (totalPercent - totalColsWithSizePercent)/totalColsNoSize ;
                if(colPercent>0){
                    defaultColSize = (colPercent)+"%" ;
                }
            }else{
                //there is pixel column, compute in pixels
                var percentPixels = (totalColsWithSizePercent/100) * totalWidth ;
                var remainingWidth = totalWidth - percentPixels - totalColsWithSizePx ;
                var colPixel = (remainingWidth / totalColsNoSize) ;
                if(colPixel > 10){
                    defaultColSize = colPixel + "px" ;
                }
            }

            gridOptions.columns.forEach(function(c){ 
                if(!c.size){
                    c.size = defaultColSize ;
                }
            }) ;
        }

        var records = [] ;
        var recid = 1 ;
        listTr.forEach(function(tr){
            var listTd = Array.prototype.slice.call(tr.getElementsByTagName("TD")) ;
            if(listTd.length > 0){
                var record = {recid: recid++} ;
                listTd.forEach(function(td, i){
                    var value = td.innerHTML ;
                    if(gridOptions.columns[i].fieldType){
                        if(gridOptions.columns[i].fieldType.indexOf("date") !== -1){
                            value = new Date(value) ;
                        }else if(["int", "integer", "double", "decimal", "number"].indexOf(gridOptions.columns[i].fieldType) !== -1){
                            value = parseFloat(value) ;
                        }
                    }
                    record[gridOptions.columns[i].field] = value ;
                }) ;
                records.push(record) ;
            }
        }) ;
        if(records.length>0){
            gridOptions.records = records ;
        }

        if(libs.w2ui[gridOptions.name]){
            //destroy existing grid before recreate
            libs.w2ui[gridOptions.name].destroy();
        }
        element.innerHTML = "" ;
        var grid = window.jQuery(element).w2grid(gridOptions) ;
    
        element.getValue = function(){
            var records = grid.records.slice() ;
            records.forEach(function(r){
                delete r.recid ;
            }) ;
            return records;
        } ;
        element.setValue = function(value){
            grid.clear() ;
            if(value){
                value.forEach(function(d,i){
                    if(!d.recid){
                        if(gridOptions.recid){
                            d.recid = d[gridOptions.recid] ;
                        }else{
                            d.recid = i ;
                        }
                    }
                });
                grid.add(value) ;
            }
        } ;
        element.setReadOnly = function(readOnly){
            //FIXME
            console.log("implement read only on grid ?") ;
        } ;
        element.addEventListener = function(event, listener){
            grid.on(event, function(ev){
                if(ev.recid){
                    ev.record = grid.get(ev.recid) ;
                }
                listener(ev) ;
            }); 
        } ;
        //copy grid methods to the elements
        Object.keys(Object.getPrototypeOf(grid)).concat(Object.keys(grid)).forEach(function(k){
            if(element[k] === undefined){
                if(typeof(grid[k]) === "function"){
                    element[k] = function(){
                        return grid[k].apply(grid, arguments) ;
                    };
                }else{
                    Object.defineProperty(element, k, {
                        get: function(){
                            return grid[k] ;
                        }
                    }) ;
                }
            }
        }) ;
    }

    function createGridRenderer(type, colName){
        if(["varchar", "text"].indexOf(type) !== -1){
            return null;
        }else if(["int", "integer"].indexOf(type) !== -1){
            return "int";
        }else if(["double", "float", "float8", "number", "decimal"].indexOf(type) !== -1){
            return "number:2" ;
        }else if(type === "date" || type === "timestamp"){
            return function(record){
                var dt = record[colName] ;
                if(typeof(dt) === "string" && /[0-3]{1}[0-9]{3}-[0-1]{1}[0-9]{1}-[0-3]{1}[0-9]{1}T[0-2]{1}[0-9]{1}:[0-5]{1}[0-9]{1}:[0-5]{1}[0-9]{1}.[0-9]{3}Z/.test(dt)){
                    //if is a date like "2017-07-24T22:00:00.000Z"
                    dt = new Date(dt) ;
                }
                if(/[0-3]{1}[0-9]{3}-[0-1]{1}[0-9]{1}-[0-3]{1}[0-9]{1}/.test(dt)){
                    //if is a date like "2017-07-24"
                    dt = new Date(dt) ;
                }
                if(dt instanceof Date){
                    //try to guess if it is a date or a date time
                    if(dt.getHours() === 0 && dt.getMinutes() === 0 && dt.getSeconds() === 0 && dt.getMilliseconds() === 0){
                        //the date is exactly midnight, assume it is date only data
                        if(dt.toLocaleDateString){
                            dt = dt.toLocaleDateString() ;
                        }else{
                            dt = dt.toDateString() ; //IE10...
                        }
                    }else{
                        //the date has a date with time information, it is probably a data/time
                        if(dt.toLocaleDateString){
                            dt = dt.toLocaleDateString()+" "+dt.toLocaleTimeString() ;
                        }else{
                            dt = dt.toDateString()+" "+dt.toTimeString() ; //IE10...
                        }
                    }
                }
                return dt ;
            } ;
            //return "date:"+window.w2utils.settings.dateFormat ;
        }
        return type;
    }


    /**
     * load the UPLOAD CSS
     */
    function loadUploadCSS(){
        if(uploadCSSLoaded){ return ;}

        var css = "";
        css += ".velox-upload-hover { background: rgba(255, 255, 255, 0.45); }";

        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        uploadCSSLoaded = true ;
    }

    /**
     * Create the upload field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"grid"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions the field options (from attributes)
     */
    function createUploadField(element, fieldType, fieldSize, fieldOptions){
        loadUploadCSS() ;

        var input = appendInputHtml(element) ;
        input.type = "file";
        input.className = "velox-upload-input" ;
        input.multiple = !!fieldOptions.multiple ;
        
        Object.defineProperty(element, "accept", { 
            get: function () { 
                return input.accept.split(","); 
            },
            
            set: function (accept) { 
                if(!Array.isArray(accept)){
                    accept = accept.split(",") ;
                }
                accept = accept.slice() ;
                accept.forEach(function(a, i){
                    if(a[0] !== "."){
                        accept[i] = "."+a;
                    }
                }) ;
                input.accept = accept.join(',') ;
            } 
        });

        if(fieldOptions.accept){
            element.accept = fieldOptions.accept ;
        }
    

        element.addEventListener("dragover", fileDragHover, false);
        element.addEventListener("dragleave", fileDragHover, false);
        element.addEventListener("drop", fileSelectHandler, false);

        input.addEventListener("change",function () {
			element.setValue(this.files);
		});
		
		input.addEventListener("click", function(){
		    input.value = "" ;
		}) ;

        var fileDragHover = function(e) {
            e.stopPropagation();
            e.preventDefault();
    
            if(e.type === "dragover"){
                if(!element.classList.contains("velox-upload-hover")){
                    element.classList.add("velox-upload-hover");
                }
            }else{
                element.classList.remove("velox-upload-hover");
            }
        };

        var selectedFiles = [] ;

        var fileSelectHandler = function(e) {
            // cancel event and hover styling
            fileDragHover(e);
    
            // fetch FileList object
            selectedFiles = e.target.files || e.dataTransfer.files;
        };

       
        element.getValue = function(){
            if(!selectedFiles){ return null; }
            if(input.multiple){
                return selectedFiles ;
            }else{
                return selectedFiles.length>0?selectedFiles[0]:null ;
            }
        } ;
        element.setValue = function(value){
            
            if(value && (!value instanceof FileList) && !Array.isArray(selectedFiles)){
                value = [value] ;
            }
            selectedFiles = value;
            if(!value){
                input.value = "" ;
            }
            
            // var names = selectedFiles.map(function(f){ return f.name ;}) ;
            
            // fileNameEl.innerHTML = names.join(", ") ;
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;

    }

    /**
     * Create a checkbox or a toggle field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"boolean"|"checkbox"|"switch"|"toggle"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {options} fieldOptions the field options (from attributes)
     */
    function createCheckboxField(element, fieldType, fieldSize, fieldOptions){
        var input = null;
        if(fieldType === "boolean" || fieldType === "bool" || fieldType === "checkbox"){
            input = appendInputHtml(element) ;
            input.type = "checkbox" ;
            
        }else{
            //https://www.w3schools.com/howto/howto_css_switch.asp
            input = document.createElement("input") ;
            input.type = "checkbox" ;
            var label = document.createElement("label") ;
            var slider = document.createElement("span") ;
            slider.className = "slider round" ;
            label.className = "switch" ;
            label.appendChild(input) ;
            label.appendChild(slider) ;
            element.innerHTML = "" ;
            element.appendChild(label) ;
            loadSwitchCSS() ;
        }
        element.getValue = function(){
            return input.checked ;
        } ;
        element.setValue = function(value){
            if(value === true || value === "true" || value === "1" || value === "on"){
                value = true ;
            }else{
                value = false ;
            }
            return input.checked = value;
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                var cloneEv = new ev.constructor(ev.type, ev);
                element.dispatchEvent(cloneEv);
            }) ;
        }) ;
    }

    /**
     * Create a HTML editor 
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"boolean"|"checkbox"|"switch"|"toggle"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {options} fieldOptions the field options (from attributes)
     */
    function createHTMLField(element, fieldType, fieldSize, fieldOptions){

        var BackgroundClass = libs.Quill.import('attributors/class/background');
        var ColorClass = libs.Quill.import('attributors/class/color');
        libs.Quill.register(BackgroundClass, true);
        libs.Quill.register(ColorClass, true);

        var editorDiv = document.createElement("DIV") ;
        element.appendChild(editorDiv) ;

        var quill = new libs.Quill(editorDiv, {
            modules: {
                toolbar: [
                    fieldOptions.toolbar||['bold', 'italic', 'underline']
                ]
            },
            placeholder: fieldOptions.placeholder||"",
            theme: fieldOptions.theme||'snow'
        });
    
        element.setValue = function(val){
            if(val){
                editorDiv.querySelector('.ql-editor').innerHTML = val ;
            }else{
                quill.setContents("") ;
            }
        };
    
        element.getValue = function(){
            return editorDiv.querySelector('.ql-editor').innerHTML;
        } ;
    

        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
            if(readOnly){
                quill.disable();
            }else{
                quill.enable();
            }
        } ;
    }

    /**
     * Create the PDF field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"grid"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions the field options (from attributes)
     * @param {function(Error)} callback called when field is created
     */
    function createPdfField(element, fieldType, fieldSize, fieldOptions){
        var pdfEl = null;
        var currentValue = null;
        element.getValue = function(){
            return currentValue ;
        } ;
        element.setValue = function(value){
            currentValue = value;
            if(pdfEl){
                element.removeChild(pdfEl) ;
            }
            pdfEl = document.createElement("div") ;
            pdfEl.style.width = "100%";
            pdfEl.style.height = "100%";
            element.appendChild(pdfEl) ;
            var options = {} ;
            if(!libs.PDFObject.supportsPDFs){
                if(VeloxScriptLoader.options.policy === "cdn"){
                    console.warn("This browser does not support PDF and PDF.js viewer cannot be load from CDN because it cannot run remotely") ;
                }else{
                    options.PDFJS_URL = VeloxScriptLoader.options.bowerPath+"velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/viewer.html" ;
                }
            }
            
            var embedEl = libs.PDFObject.embed(value, pdfEl, options);
        } ;
        element.showPDF = element.setValue ;
            
        element.setReadOnly = function(){
            //not handled on PDF viewer
        } ;

        if(fieldOptions.pdfurl){
            element.setValue(fieldOptions.pdfurl) ;
        }
    }

    /**
     * Change a string in regexp
     * @param {string} str the string to transform in regexp
     */
    var escapeRegExp = function (str) {
		return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	} ;

    /**
     * Replace all occurence in a string
     * 
     * @param {string} str string in which to replace
     * @param {string} find the string to find
     * @param {string} replace the string to replace
     */
	var replaceAll = function (str, find, replace) {
		return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	} ;

    /**
     * Describe an HTML as string
     * 
     * @param {HTMLElement} element the HTML element to describe
     */
    function elToString(element){
        var str = element.tagName ;
        for(var i=0; i<element.attributes.length; i++){
            str += " "+element.attributes[i]+" = \""+element.getAttribute(element.attributes[i])+"\"" ;
        }
        return "["+str+"]" ;
    }

    /**
     * Add input field in HTML element
     * 
     * @param {HTMLElement} element the HTML element in which add input field
     */
    function appendInputHtml(element){
        var input = document.createElement("INPUT") ;
        input.type = "text" ;
        element.innerHTML = "" ;
        element.appendChild(input) ;
        var attrs = ["required", "pattern", "minlength", "maxlength", "min", "max"];
        for(var i=0; i<attrs.length; i++){
            var attr = attrs[i] ;
            if(element.hasAttribute(attr)){
                input.setAttribute(attr, element.getAttribute(attr)) ;
            }
        }
        return input ;
    }

     /**
     * Execute many function in series
     * 
     * @param {function(Error)[]} calls array of function to run
     * @param {function(Error)} callback called when all calls are done
     */
    var series = function(calls, callback){
        if(calls.length === 0){ return callback(); }
        calls = calls.slice() ;
        var doOne = function(){
            var call = calls.shift() ;
            call(function(err){
                if(err){ return callback(err) ;}
                if(calls.length === 0){
                    callback() ;
                }else{
                    doOne() ;
                }
            }) ;
        } ;
        doOne() ;
    } ;

    function getPossibleValues(fieldOptions, callback){
        if(!apiClient){
            return callback("You must give the VeloxServiceClient VeloxWebView.fieldsSchema.configure options to use the selection 2one fields") ;
        }
        var otherTable = fieldOptions.readfromtable ;
        var orderBy = fieldOptions.orderbyfromtable ;
        var idField = fieldOptions.readfieldid ;
        var labelField = fieldOptions.readfieldlabel||idField ;

        
        apiClient.__velox_database[otherTable].search({}, orderBy, function(err, results){
            if(err){ return callback(err); }
            var values = results.map(function(r){
                return {
                    id: r[idField],
                    label: r[labelField] 
                } ;
            }) ;
            callback(null, values) ;
        }.bind(this));
    }


    return extension ;

})));