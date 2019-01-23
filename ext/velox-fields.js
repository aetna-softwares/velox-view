/*global define*/
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

    var phoneCountry;

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
            phoneCountry = options.phoneCountry ;
            if(options.libs) {
                Object.keys(options.libs).forEach(function(k){
                    libs[k] = options.libs[k] ;
                }) ;
            }
        },

        setPhoneCountry: function(phoneCountryP){
            phoneCountry = phoneCountryP ;
        },

        addDecorator: function(decorator){
            decorators.push(decorator) ;
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
        this.emit("readOnly", readOnly) ;
    } ;


    /**
     * Create the field
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */
    extension.extendsProto.createField = function(element, fieldType, fieldSize, fieldOptions, callback){
        setNeededLib(fieldType, fieldOptions) ;
        loadLibs(function(err){
            if(err){ return callback(err) ;}
            createField(this, element, fieldType, fieldSize, fieldOptions) ;
            callback() ;
        }.bind(this)) ;
    } ;

    ///// DEPENDENCIES LIBRARIES LOADING ////////
    var INPUTMASK_VERSION = "3.3.11"; //v4 will drop jquery dependency 
    var JQUERY_VERSION = "3.3.1" ;
    var DECIMALJS_VERSION = "2.2.0" ;
    var FLATPICKR_VERSION = "4.5.0" ;
    var MOMENTJS_VERSION = "2.22.1" ;
    
    var PDFOBJECT_VERSION = "2.0.201604172" ;
    var PDFJS_VERSION = "1.9.426" ;
    var QUILL_VERSION = "1.3.6" ;

    var JSZIP_VERSION = "3.1.5" ;
    var PDFMAKE_VERSION = "0.1.36" ;
    var DATATABLES_VERSION = "1.10.16" ;
    
    var LIBPHONE_VERSION = "3.1.6" ;

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
            bowerPath: "datatables.net/js/jquery.dataTables.min.js",
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


    var LIBPHONE_LIB = [
        {
            name: "google-libphonenumber",
            type: "js",
            version: LIBPHONE_VERSION,
            cdn: "https://cdn.rawgit.com/ruimarinho/google-libphonenumber/v$VERSION/dist/libphonenumber.js",
            bowerPath: "google-libphonenumber/dist/libphonenumber.js",
            npmPath: "google-libphonenumber/dist/libphonenumber.js",
        }
    ] ;

    extension.libs = [
        JQUERY_LIB,
        INPUT_MASK_LIB,
        DECIMALJS_LIB,
        FLATPICKR_LIB,
        DATATABLES_LIB,
        PDFOBJECT_LIB,
        QUILL_LIB,
        LIBPHONE_LIB,
        {
            name: "quill-map",
            type: "js",
            version: QUILL_VERSION,
            cdn: "https://cdn.quilljs.com/$VERSION/quill.js",
            bowerPath: "quill/dist/quill.min.js.map",
            npmPath: "quill/dist/quill.min.js.map",
        },
        // {
        //     name: "pdf-js-html",
        //     type: "html",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/viewer.html"
        // },
        // {
        //     name: "pdf-js-js",
        //     type: "js",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/viewer.js"
        // },
        // {
        //     name: "pdf-js-css",
        //     type: "css",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/viewer.css"
        // },
        // {
        //     name: "pdf-js-images",
        //     type: "raw",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/images/*"
        // },
        // {
        //     name: "pdf-js-locales-fr",
        //     type: "raw",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/locale/fr/*"
        // },
        // {
        //     name: "pdf-js-locales-es",
        //     type: "raw",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/locale/es-ES/*"
        // },
        // {
        //     name: "pdf-js-locales-de",
        //     type: "raw",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/locale/de/*"
        // },
        // {
        //     name: "pdf-js-locales-en",
        //     type: "raw",
        //     version: PDFJS_VERSION,
        //     npmPath: "velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/locale/en-GB/*"
        // },
    ]
    .concat(
        ["de", "fr", "es", 'en-gb', "vi"].map(function(l){
            return {
                name: "moment-locales-"+l,
                type: "js",
                version: MOMENTJS_VERSION,
                cdn: "https://cdnjs.cloudflare.com/ajax/libs/moment.js/$VERSION/locale/"+l+".js",
                bowerPath: "moment/locale/"+l+".js",
                npmPath: "moment/locale/"+l+".js"
            };
        })
    ) 
    .concat(
        ["English", "German", "French", 'Spanish', "Vietnamese"].map(function(l){
            return {
                name: "datatables-locales-"+l,
                type: "json",
                version: DATATABLES_VERSION,
                cdn: "https://cdn.datatables.net/plug-ins/$VERSION/i18n/"+l+".lang",
                bowerPath: "datatables.net-plugins/i18n/"+l+".lang",
                npmPath: "datatables.net-plugins/i18n/"+l+".lang",
            } ;
        })
    ) 
    .concat(
        ["fr", "es", "de", 'vn'].map(function(l){
            return {
                name: "flatpickr-calendar-locales-"+l,
                type: "js",
                version: FLATPICKR_VERSION,
                cdn: "https://npmcdn.com/flatpickr@$VERSION/dist/l10n/"+l+".js",
                bowerPath: "flatpickr/dist/l10n/"+l+".js",
                npmPath: "flatpickr/dist/l10n/"+l+".js",
            };
        })
    ) 
    ;

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

        if(availableLocales.indexOf(lang.substring(0,2)) !== -1){
            return lang.substring(0,2) ;
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

        if(availableLocales.indexOf(lang.substring(0,2)) !== -1){
            return lang.substring(0,2) ;
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
            var results = JSON.parse(results[0][0].substring(results[0][0].indexOf("{"))) ;
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

    function triggerEvent(element, eventOrName){
        var ev;
        if(typeof(Event) === 'function') {
            //normal browser
            if(typeof(eventOrName) === "string"){
                ev = new Event(eventOrName);
            }else{
                ev = new eventOrName.constructor(eventOrName.type, eventOrName);
            }
        }else{
            //IE
            if(typeof(eventOrName) === "string"){
                ev = document.createEvent('Event');
                ev.initEvent(eventOrName, true, true);
            }else{
                ev = document.createEvent('Event');
                ev.initEvent(eventOrName.type, true, true);
            }
        }
        element.dispatchEvent(ev);
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
        loadLibs(function(err){
            if(err){ return callback(err) ;}

            var elements = Array.prototype.slice.apply(params.doc.querySelectorAll("[data-cell-view]"));
            var compiles = [] ;
            this.cellViews = {} ;
            elements.forEach(function(el, i){
                el.parentElement.setAttribute("data-cell-view-id", i) ;
                el.removeAttribute("data-cell-view") ;
                compiles.push(function(cb){
                    this.cellViews[i] = el;
                    var cellView = new VeloxWebView(null, null, {htmlEl : el});
                    cellView.compileView(cb) ;
                }.bind(this)) ;
            }.bind(this)) ;
            series(compiles, callback) ;
        }.bind(this)) ;
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
        } else if(fieldType === "phone"){
            setLibToLoad("libphone", function(done){
                loadLib("libphone", LIBPHONE_VERSION, LIBPHONE_LIB, done) ;
            }) ;
        } else if(["date", "datetime", "time", "timestamp", "timestamptz"].indexOf(fieldType) !== -1){
            setLibToLoad("flatpickr", function(done){
                loadLib("flatpickr", FLATPICKR_VERSION, FLATPICKR_LIB, done) ;
            }) ;
            setLibToLoad("inputMask", loadInputMask) ;
            setLibToLoad("locale", getLocale) ;
            setLibToLoad("localeDate", loadDateLibLocale) ;
        } else if(fieldType === "selection" || fieldType === "select" || fieldType === "multiple"){
            loadSelectCSS() ;
        } else if(fieldType === "radio" || fieldType === "checkboxes"){
            //no lib
        } else if(fieldType === "bool" || fieldType === "boolean" || fieldType === "checkbox"  || fieldType === "toggle" || fieldType === "switch"){
            //no lib
        } else if(fieldType === "grid"){
            setLibToLoad("datatables", function(done){
                loadLib("datatables", DATATABLES_VERSION, DATATABLES_LIB, done) ;
            }) ;
            setLibToLoad("locale", getLocale) ;
            setLibToLoad("locale-datatables", loadDatatablesLibLocale) ;
        } else if(fieldType === "upload"){
            //no lib
        } else if(fieldType === "pdf"){
            setLibToLoad("PDFObject", function(done){
                if(!navigator.mimeTypes['application/pdf']){
                    var isModernBrowser = (function (){ return (typeof window.Promise !== "undefined"); })() ;
    
                    var ua = window.navigator.userAgent;
                    //Sniff for Firefox
                    var isFirefox = (function (){ return (ua.indexOf("irefox") !== -1); } )();
                    //Firefox started shipping PDF.js in Firefox 19.
                    //If this is Firefox 19 or greater, assume PDF.js is available
                    var isFirefoxWithPDFJS = (function (){
                        if(!isFirefox){ return false; }
                        //parse userAgent string to get release version ("rv")
                        //ex: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:57.0) Gecko/20100101 Firefox/57.0
                        return (parseInt(ua.split("rv:")[1].split(".")[0], 10) > 18);
                    })();
    
                    if(isModernBrowser || isFirefoxWithPDFJS){
                        //force PDF support
                        navigator.mimeTypes['application/pdf'] = true ;
                    }
                }
                loadLib("PDFObject", PDFOBJECT_VERSION, PDFOBJECT_LIB, done) ;
            }) ;
        } else if(fieldType === "html"){
            setLibToLoad("Quill", function(done){
                loadLib("Quill", QUILL_VERSION, QUILL_LIB, done) ;
            }) ;
            loadHTMLEditorCSS() ;
        } else if(fieldType === "textarea" || fieldType === "email" ){
            //no lib to load
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
        view.on("render", function(){
            //after render the element attributes may have changed, we must update the field
            if(element.setReadOnly){
                element.setReadOnly(element.hasAttribute("readonly")) ;
            }
            if(element.setRequired){
                element.setRequired(element.hasAttribute("required")) ;
            }
        }) ;
        if(fieldType === "varchar" || fieldType==="text" || fieldType === "string" || fieldType === "password"){
            createTextField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "int" || fieldType === "integer" || fieldType==="number" || fieldType==="numeric" || fieldType==="decimal" || 
            fieldType==="double" || fieldType==="float"  || fieldType==="float8" || fieldType==="currency" || fieldType==="percent"){
            createNumberField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "email"){
            createEmailField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "phone"){
            createPhoneField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(["date", "datetime", "time", "timestamp", "timestamptz"].indexOf(fieldType) !== -1){
            createDateField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "selection" || fieldType === "select" || fieldType === "multiple"){
            createSelectField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "radio" || fieldType === "checkboxes"){
            createRadioField(element, fieldType, fieldSize, fieldOptions) ;
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
        } else if(fieldType === "textarea"){
            createTextareaField(element, fieldType, fieldSize, fieldOptions) ;
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
            if(select){
                select.disabled = readOnly ;
            }else{
                var textarea = element.getElementsByTagName("textarea")[0] ;
                if(textarea){
                    textarea.disabled = readOnly ;
                }   
            }
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
     * Set the field as required or not
     * 
     * @param {HTMLElement} element the element to set as readonly
     * @param {boolean} readOnly the flag read only or not
     */
    function setRequired(element, required) {
        element._veloxIsRequired = required ;
        if(required){
            element.setAttribute("required", "required") ;
        }else{
            element.removeAttribute("required") ;
        }
        var select = element.getElementsByTagName("select")[0] ;
        if(select){
            if(required){
                select.setAttribute("required", "required") ;
            }else{
                select.removeAttribute("required") ;
            }
        }else{
            var input = element.getElementsByTagName("input")[0] ;
            if(input){
                if(required){
                    input.setAttribute("required", "required") ;
                }else{
                    input.removeAttribute("required") ;
                }
            } else {
                var textarea = element.getElementsByTagName("textarea")[0] ;
                if(textarea){
                    if(required){
                        textarea.setAttribute("required", "required") ;
                    }else{
                        textarea.removeAttribute("required") ;
                    }
                }   
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
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;

        element.focus = function(){
            input.focus() ;
        };

        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                triggerEvent(element, ev) ;
            }) ;
        }) ;

        if( fieldOptions.mask){
            var im = new libs.Inputmask(fieldOptions.mask);
            maskField = im.mask(input) ;
        }
    }
    
    /**
     * Create a textarea field
     * 
     * The maxlength is set accordingly to the fieldSize option if given
     * 
     * @param {HTMLElement} element HTML element to transform
     * @param {"textarea"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field option (from attributes)
     * @param {function(Error)} callback called when finished
     */
    function createTextareaField(element, fieldType, fieldSize, fieldOptions){
        var input = appendInputHtml(element) ;

        var input = document.createElement("TEXTAREA") ;
        element.innerHTML = "" ;
        element.appendChild(input) ;
        var attrs = ["required", "maxlength"];
        for(var i=0; i<attrs.length; i++){
            var attr = attrs[i] ;
            if(element.hasAttribute(attr)){
                input.setAttribute(attr, element.getAttribute(attr)) ;
            }
        }
        
        if(fieldSize){
            var fieldSize = parseInt(fieldSize, 10) ;
            if(isNaN(fieldSize)){
                throw ("Incorrect field size option : "+fieldSize+" on "+elToString(element)) ;
            }
            input.maxLength = fieldSize ;
        }

        element.getValue = function(){
            return input.value ;
        } ;
        element.setValue = function(value){
            input.value = value?""+value:"";
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;

        element.focus = function(){
            input.focus() ;
        };

        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                triggerEvent(element, ev) ;
            }) ;
        }) ;
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
                delimiters : {thousands: ",", decimale: "."}
            } ;
            if(VeloxWebView.i18n){
                currentLocale = VeloxWebView.i18n.getLocale() ;
                VeloxWebView.i18n.onLanguageChanged(function(){
                    currentLocale = VeloxWebView.i18n.getLocale() ;
                });
                callback() ;
            }else{
                callback() ;
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
        //loadNumberCSS() ;
        var input = appendInputHtml(element) ;

        input.type = "tel" ;
        if(fieldType==="numeric" || fieldType==="decimal" || fieldType==="double" || fieldType==="float" || fieldType==="float8" || fieldType==="percent" || fieldType==="currency"){
            var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
            if(iOS){
                input.type = "text" ;//ios does not support decimal separator in tel pad
            }
        }


        var maskField = null;
        var maskOptions = { 
            placeholder: "",
            digitsOptional: true,
            radixPoint: currentLocale.delimiters.decimal , 
            groupSeparator : currentLocale.delimiters.thousands , 
            prefix : "", suffix : "", positionCaretOnTab: false
        };

        if(fieldOptions.decimaldigits){
            var digits = parseInt(fieldOptions.decimaldigits, 10) ;
            if(isNaN(digits)){
                throw "Invalid value for option decimaldigits, number expected" ;		
            }
            maskOptions.digits = digits ;
        }

        input.addEventListener("focus", function(){
            input.select() ;
        }) ;

        element.getValue = function(){
            if(maskField){
                var value = maskField._valueGet() ;
                if(maskOptions){
                    value = replaceAll(value, maskOptions.radixPoint, ".");
                    value = replaceAll(value, maskOptions.groupSeparator, "");
                    value = replaceAll(value, maskOptions.prefix, "");
                    value = replaceAll(value, maskOptions.suffix, "");
                }
                value = (value === "" || value === ".") ? null : new libs.Decimal(value);
                if(fieldType === "percent"){
                    value = value.div(100) ;
                }
                return value?value.toNumber():null ;
            }
            return Number(input.value) ;
        } ;
        element.setValue = function(value){
            if(!value && value !== 0){ 
                input.value = "" ;
                if(maskField){
                    maskField._valueSet(null) ;
                }
                return;
            }
            var decimalValue = new libs.Decimal(value) ;
            if(fieldType === "percent"){
                decimalValue = decimalValue.mul(100) ;
            }
            value = decimalValue.toNumber() ;
            if(fieldType==="numeric" || fieldType==="decimal" || fieldType==="double" || fieldType==="float" || fieldType==="float8" || fieldType==="percent" || fieldType==="currency"){
                value = decimalValue.toFixed(maskOptions.digits || 2) .replace(".", currentLocale.delimiters.decimal); 
            }
            if(maskField){
                maskField._valueSet(value) ;
            }
            input.value = value ;
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;

        if(element !== input){
            element.focus = function(){
                input.focus() ;
            };
            
            ["focus", "blur", "keyup", "keydown"].forEach(function(eventName){
                input.addEventListener(eventName, function(ev){
                    triggerEvent(element, ev) ;
                    if(eventName === "blur"){
                        //change is not fired because of mask
                        triggerEvent(element, "change") ;
                    }
                }) ;
            }) ;
        }

        if(fieldType === "int" || fieldType === "integer" || fieldType==="number") {
            maskOptions.digits = 0 ;
            var im = new libs.Inputmask("currency", maskOptions);
            maskField = im.mask(input) ;
        }else if(fieldType==="numeric" || fieldType==="decimal" || fieldType==="double" || fieldType==="float" || fieldType==="float8" || fieldType==="percent" || fieldType==="currency"){
            if(fieldType === "percent"){
                maskOptions.suffix = " %";
            }
            var im = new libs.Inputmask("currency", maskOptions);
            maskField = im.mask(input) ;
        }

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
        input.type = "email" ;

        element.getValue = function(){
            return input.value ;
        } ;
        element.setValue = function(value){
            if(value === undefined || value === null){
                value = "";
            }
            input.value = value ;
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;

        element.focus = function(){
            input.focus() ;
        };
        
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                triggerEvent(element, ev) ;
            }) ;
        }) ;
    }
    
    /**
     * Create a input masked phone field.
     * 
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {string} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options (from attributes)
     */
    function createPhoneField(element, fieldType, fieldSize, fieldOptions){
        var input = appendInputHtml(element) ;
        input.type = "tel" ;

        element.getValue = function(){
            return input.value ;
        } ;
        element.setValue = function(value){
            if(value === undefined || value === null){
                value = "";
            }
            input.value = value ;
        } ;
        element.setReadOnly = function(readOnly){
            setReadOnly(element, readOnly) ;
        } ;
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;

        element.focus = function(){
            input.focus() ;
        };

        var PNF = window.libphonenumber.PhoneNumberFormat ;
        var phoneUtil = window.libphonenumber.PhoneNumberUtil.getInstance();
        input.addEventListener("blur", function(ev){
            var value = this.value;
            if(value){
                try{
                    var parsed = phoneUtil.parseAndKeepRawInput(value, phoneCountry||"FR");
                    if(!phoneUtil.isValidNumber(parsed)){
                    }else{
                        this.value = phoneUtil.format(parsed, PNF.INTERNATIONAL);
                    }
                }catch(e){}
            }
        }) ;

        input.addEventListener("keyup", function(ev){
            var value = this.value;
            if(value){
                try{
                    var parsed = phoneUtil.parseAndKeepRawInput(value, window.phoneCountry||"FR");
                    if(!phoneUtil.isValidNumber(parsed)){
                        input.setCustomValidity(VeloxWebView.tr?VeloxWebView.tr("form.wrongPhoneNumber"):"Wrong phone number");
                    }else{
                        input.setCustomValidity("");
                    }
                }catch(e){
                    input.setCustomValidity(VeloxWebView.tr?VeloxWebView.tr("form.wrongPhoneNumber"):"Wrong phone number");
                }
            }else{
                input.setCustomValidity("");
            }
        });
        
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                triggerEvent(element, ev) ;
            }) ;
        }) ;
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
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                triggerEvent(element, ev) ;
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

        var css = ".select-multiple-hidden {position: absolute; top:0; left:0; bottom:0; right:0; opacity: 0;  width: 100%; } ";
        css += ".select-multiple-container {min-height: 35px; width: 100%; border-width: 1px; position: relative; overflow-x: hidden;} ";
        css += ".readonly .select-multiple-container {background: #e9ecef;} ";
        css += ".select-multiple-values {line-height: 2.4em;} ";
        css += ".select-multiple-option {font-size: 1.2em} ";
        css += ".select-multiple-option-selected {font-weight: bold; background-color: #EEE} ";
        css += ".select-multiple-value-item {background: #EEE; padding: 5px; margin-right: 10px; border-radius: 2px; border: 1px solid #DDD;white-space: nowrap;} ";
        
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

    function createRadioField(element, fieldType, fieldSize, fieldOptions){
        var inputs = Array.prototype.slice.apply(element.getElementsByTagName("INPUT")) ;
        var nameOfGroup = "";
        if(inputs[0] && inputs[0].name){
            nameOfGroup = inputs[0].name;
        }else{
            nameOfGroup = uuidv4() ;
        }

        var isMultiple = inputs.type === "checkbox" ;

        function registerEvents(){
            ["change"].forEach(function(eventName){
                inputs.forEach(function(input){
                    input.addEventListener(eventName, function(){
                        triggerEvent(element, eventName) ;
                    });
                });
            }) ;
        } ;
        registerEvents();
        
        element.getValue = function(){
            var result = [];
            for (var i=0; i<inputs.length; i++) {
                var opt = inputs[i];
                if (opt.checked) {
                    result.push(opt.value);
                }
            }
            return isMultiple?result:result[0];
        } ;

        var _currentValue = null;
        element.setValue = function(value){
            _currentValue = value ;
            if(!value){
                value = [] ;
            }
            if(!Array.isArray(value)){
                value = [value] ;
            }
            for (var i=0; i<inputs.length; i++) {
                var opt = inputs[i];
                opt.checked = value.indexOf(opt.value) !== -1 ;
            }
        } ;
        element.setReadOnly = function(readOnly){
            for (var i=0; i<inputs.length; i++) {
                var opt = inputs[i];
                if(readOnly) {
                    opt.disabled = true;
                }else{
                    opt.disabled = false;
                }
            }
            setReadOnly(element, readOnly) ;
        } ;
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;

        element.setValueEnable = function(value, isEnabled){
            for (var i=0; i<inputs.length; i++) {
                var opt = inputs[i];
                if(opt.value == value){
                    opt.disabled = !isEnabled;
                }
            }
            if(!isEnabled){
                //remove disabled value if already selected
                var currentValue = element.getValue() ;
                if(Array.isArray(currentValue)){
                    var indexVal = currentValue.indexOf(value) ;
                    if(indexVal !== -1){
                        currentValue.splice(indexVal, 1) ;
                        element.setValue(currentValue) ;
                    }
                }else{
                    if(currentValue === value){
                        element.setValue(null) ;
                    }
                }
            }
        } ;
        element.setOptions = function(options){
            var currentValue = element.getValue() ;
            if(!currentValue){ currentValue = [] ;}
            if(!Array.isArray(currentValue)){
                currentValue = [currentValue] ;
            }
            
            element.innerHTML = "" ;

                
            
            inputs = [] ;
            
            for(var i=0; i<options.length; i++){
                var opt = document.createElement("INPUT") ;
                opt.type = isMultiple?"checkbox":"radio" ;
                opt.value = options[i].id;
                opt.id = uuidv4();
                opt.name = nameOfGroup ;
                
                var label = document.createElement("LABEL") ;
                label.innerHTML = options[i].label ;
                label.setAttribute("for",opt.id);

                if(currentValue.indexOf(options[i].id) !== -1){
                    opt.checked = true ;
                }
                element.appendChild(opt) ;
                element.appendChild(label) ;
                inputs.push(opt) ;
            }

            decorators.forEach(function(deco){
                deco(element, fieldType, fieldSize, fieldOptions) ;
            }) ; 

            registerEvents();
        } ;
        element.getOptions = function(){
            var opts = [] ;
            for(var i=0; i<inputs.length; i++){
                opts.push({
                    id: inputs[i].value,
                    label: inputs[i].innerHTML,
                }) ;
            }
            return opts ;
        } ;

        element.refresh = function(){
            if(fieldOptions.readfromtable){
                getPossibleValues(fieldOptions, function(err, values){
                    if(err){
                        throw err ;
                    }
                    element.setOptions(values) ;
                    if(_currentValue){
                        element.setValue(_currentValue) ;
                    }
                });
            } ;
        } ;

        if(fieldOptions.readfromtable){
            element.refresh() ;
            element.setAttribute("data-field-refreshable", "true") ;
        }

        
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

        var attrs = ["required"];
        for(var i=0; i<attrs.length; i++){
            var attr = attrs[i] ;
            if(element.hasAttribute(attr)){
                select.setAttribute(attr, element.getAttribute(attr)) ;
            }
        }

        var selectOptions = [] ;
        for(var i=0; i<select.options.length; i++){
            selectOptions.push({
                id: select.options[i].value,
                label: select.options[i].innerHTML,
            }) ;
        }
        var currentValue = select.value ;

        var renderValues = function(){} ;

        var isIos = false;
        var nP = navigator.platform;      
        if (nP == "iPad" || nP == "iPhone" || nP == "iPod" || nP == "iPhone Simulator" || nP == "iPad Simulator"){
            isIos = true;
        }

        var isMultiple = select.multiple ;
        if(isMultiple){
            currentValue = [] ;
            var options = select && select.options;
            for (var i=0; i<options.length; i++) {
                var opt = options[i];
                if (opt.selected) {
                    currentValue.push(opt.value);
                }
            }
            var isMobile = /android|ip(hone|od|ad)/i.test(navigator.userAgent);
            if(!isMobile){
                select.multiple = false;
            }
            var divMultiple = document.createElement("DIV") ;

            var divSelection = document.createElement("DIV") ;
            divSelection.className = "select-multiple-values" ;
            if(element.tagName === "SELECT"){
                var divContainer = document.createElement("DIV") ;
                element.parentElement.insertBefore(divContainer, element) ;
                divContainer.appendChild(element) ;
                element = divContainer;
            }
            element.appendChild(divMultiple) ;
            divMultiple.appendChild(divSelection);
            divMultiple.appendChild(select);
            select.className += " select-multiple-hidden" ;
            divMultiple.className = " select-multiple-container" ;
            renderValues = function(){
                divSelection.innerHTML = "" ;
                var options = select.options ;
                for (var y=0; y<options.length; y++) {
                    var opt = options[y];
                    if(!opt.hasAttribute("data-label")){
                        opt.setAttribute("data-label", opt.innerText) ;
                    }
                    if(isMobile){
                        opt.selected = false;
                    }else{
                        opt.className = opt.className.replace(" select-multiple-option-selected", "") ;
                        opt.className = opt.className += " select-multiple-option";
                        if(opt.value){
                            opt.innerHTML = "&#9744; "+opt.getAttribute("data-label")  ;
                        }
                    }
                }
                for(var i=0; i<currentValue.length; i++){
                    var val = currentValue[i] ;
                    if(val){
                        for (var y=0; y<options.length; y++) {
                            var opt = options[y];
                            if (opt.value === val) {
                                if(isMobile){
                                    opt.selected = true;
                                }else{
                                    opt.innerHTML = "&#9746; "+opt.getAttribute("data-label") ;
                                    opt.className += " select-multiple-option-selected" ;
                                }
                                var spanValue = document.createElement("SPAN") ;
                                spanValue.setAttribute("data-value", opt.value) ;
                                spanValue.innerText = opt.getAttribute("data-label")  ;
                                spanValue.className = "select-multiple-value-item" ;
                                divSelection.appendChild(spanValue) ;
                                divSelection.appendChild(document.createTextNode(" ")) ;
                                break;
                            }
                        }
                    }
                }
            } ;
            select.addEventListener("change", function(){
                if(isMobile){
                    var options = select.options ;
                    currentValue = [];
                    for (var y=0; y<options.length; y++) {
                        if(options[y].selected){
                            currentValue.push(options[y].value) ;
                        }
                    }
                }else{
                    var chosenValue = select.value;
                    if(chosenValue){
                        var removed = false ;
                        for(var i=0; i<currentValue.length; i++){
                            var val = currentValue[i] ;
                            if(val === chosenValue){
                                currentValue.splice(i, 1) ;
                                removed = true;
                                break;
                            }
                        }
                        if(!removed){
                           currentValue.push(chosenValue) ;
                        }
                        select.value = "" ;
                    }
                }
                renderValues();
                triggerEvent(element, "change") ;
            }) ;
            renderValues();
        }else{
            select.addEventListener("change", function(){
                currentValue = select.value ;
                triggerEvent(element, "change") ;
            }) ;
        }



        element.getValue = function(){
            return currentValue||null ;
        } ;
        element.setValue = function(value){
            currentValue = value ;
            if(isMultiple){
                if(!value){
                    currentValue = [] ;
                }
                renderValues() ;
            }else{
                if(value === undefined || value === null){
                    select.value = null;
                }else{
                    select.value = value;
                }
            }
        } ;
        element.setReadOnly = function(readOnly){
            if(readOnly) {
                select.disabled = true;
            }else{
                select.disabled = false;
            }
            setReadOnly(element, readOnly) ;
        } ;
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;

        element.setValueEnable = function(value, isEnabled){
            var found = false;
            for(var i=0; i<select.options.length; i++){
                var opt = select.options[i] ;
                if(opt.value == value){
                    found = true;
                    opt.disabled = !isEnabled;
                }
            }
            if(isEnabled && !found){
                //to enable but not found
                for(var i=0; i<selectOptions.length; i++){
                    if(selectOptions[i].id == value){
                        var opt = document.createElement("OPTION") ;
                        opt.value = selectOptions[i].id;
                        opt.innerHTML = selectOptions[i].label;
                        select.appendChild(opt) ;
                    }
                }
            }
            if(!isEnabled){
                //remove disabled value if already selected
                var currentValue = element.getValue() ;
                if(isMultiple){
                    var indexVal = currentValue.indexOf(value) ;
                    if(indexVal !== -1){
                        currentValue.splice(indexVal, 1) ;
                        element.setValue(currentValue) ;
                    }
                }else{
                    if(currentValue === value){
                        element.setValue(null) ;
                    }
                }
                if(isIos){
                    window.jQuery(select).find('option[disabled]').remove();
                }
            }
            renderValues() ;
        } ;
        element.setOptions = function(options){
            selectOptions = options;
            select.innerHTML = "";
            if(!isMultiple || !isMobile){
                var emptyOption = document.createElement("OPTION") ;
                emptyOption.value = "";
                emptyOption.innerHTML = "&nbsp;" ;
                select.appendChild(emptyOption) ;
            }
            for(var i=0; i<options.length; i++){
                var opt = document.createElement("OPTION") ;
                opt.value = options[i].id;
                opt.innerHTML = options[i].label;
                if(currentValue === options[i].id){
                    opt.selected = true ;
                }else if(Array.isArray(currentValue) && currentValue.indexOf(options[i].id) !== -1){
                    opt.selected = true ;
                }
                select.appendChild(opt) ;
            }
            renderValues() ;
        } ;
        element.getOptions = function(){
            if(isIos){
                return selectOptions ;
            }
            var opts = [] ;
            for(var i=0; i<select.options.length; i++){
                opts.push({
                    id: select.options[i].value,
                    label: select.options[i].innerHTML,
                }) ;
            }
            return opts ;
        } ;

        
        element.refresh = function(){
            if(fieldOptions.readfromtable){
                getPossibleValues(fieldOptions, function(err, values){
                    if(err){
                        throw err ;
                    }
                    element.setOptions(values) ;
                    if(currentValue){
                        element.setValue(currentValue) ;
                    }
                });
            } ;
        } ;

        if(fieldOptions.readfromtable){
            element.refresh() ;
            element.setAttribute("data-field-refreshable", "true") ;
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
        css += ".dt-table {flex-grow: 1; display: flex; flex-direction: column;flex-shrink: 1;flex-basis: 10px;} ";
        css += ".dataTables_scroll {display: flex; flex-direction: column;flex-grow: 1;}";
        //css += ".dataTables_scrollHead { flex-basis: 50px; }";
        css += ".dataTables_scrollBody { flex-grow: 1;flex-basis: 50px; flex-shrink: 1 }";
        css += '@media screen and (max-width: 767px) {';
        css += 'div.dataTables_wrapper div.dataTables_length, div.dataTables_wrapper div.dataTables_filter, div.dataTables_wrapper div.dataTables_info, div.dataTables_wrapper div.dataTables_paginate {';
        css += '    text-align: right;';
        css += '}';
        css += '}';
        css += '@media screen and (max-width: 576px) {';
        css += 'div.dataTables_wrapper div.dataTables_length, div.dataTables_wrapper div.dataTables_filter, div.dataTables_wrapper div.dataTables_info, div.dataTables_wrapper div.dataTables_paginate {';
        css += '    text-align: left;';
        css += '}';
        css += '}';
        css += 'div.dataTables_wrapper div.dataTables_filter label {';
        css += 'width: 100%; display: flex; line-height: 30px;';
        css += '}';
        css += 'div.dataTables_wrapper div.dataTables_filter label input {';
        css += 'flex-grow: 1';
        css += '}';
        css += '.table.dataTable td, .table.dataTable th {';
        css += '    padding: 5px; white-space: nowrap';
        css += '  }';
        css += '.datatable-header-search:before {content: "\\1F50D"; }';
        css += '.datatable-header-search {font-size: 8pt; color: #999; float: right; margin-top: 6px; margin-right: -20px;}';
        css += '.dtr-details .datatable-header-search {display: none}';
        css += '@media print { .datatable-header-search  {display: none;} }';

        css += '.data-table-header-filtered .datatable-header-search { color: red }';
        css += '.datatable-search-info:before {display: inline-block; content: "\\1F50D"; margin-right: 5px;}';
        css += '.datatable-search-info {float: right; position: absolute; right: 20px; top: -20px;}';
        css += '.datatable-search-info strong {color: red;}';
        css += '.datatable-search-save-bt:before {display: inline-block; content: "\\1F4BE"; margin-left: 5px;}';
        css += '.datatable-search-save-bt {color: #11516b;cursor: pointer;}';
        css += '.datatable-search-clear-bt:before {display: inline-block; content: "\\00D7"; margin-left: 5px;}';
        css += '.datatable-search-clear-bt {color: #11516b;cursor: pointer;}';
        css += '.datatable-search-history-bt:before {display: inline-block; content: "\\1F4D6";}';
        css += '.datatable-search-history-bt {color: #11516b;cursor: pointer;position: absolute; right: 10px;}';
        css += '.datatable-search-history-name {cursor: pointer; border: 1px solid #d2d2d2; border-width: 1px 1px 0px 1px; padding: 10px; }';
        css += '.datatable-search-history-name:first-child {border-width: 1px 1px 0 1px; ; border-radius: 5px 5px 0 0;}';
        css += '.datatable-search-history-name:last-child {border-width: 1px; border-radius: 0 0 5px 5px;}';
        css += '.datatable-search-history-remove { float:right; cursor: pointer; }';
        css += '.datatable-search-save-name {flex-grow:1;}';
        css += '.datatable-search-popup { display: flex; height: 35px;}';
        css += '.datatable-search-popup>* { margin-left: 5px; margin-right: 5px }';
        css += '.datatable-search-popup>[data-search-field] { flex-grow: 1; margin-bottom: 0 }';
        css += '.datatable-search-popup .datatable-search-popup-ok { margin-left: auto }';

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


    var gridFilters = {} ;
    var gridFilterInitialized = false ;
    var GRID_FILTERS = {
        equal : { typeValue: "single", filter: function(filterValue, value){ return (""+value).toLowerCase() == (""+filterValue).toLowerCase() ; }},
        startWith : { typeValue: "single", filter: function(filterValue, value){ return (""+value).toLowerCase().indexOf((""+filterValue).toLowerCase()) === 0 ; }},
        contains : { typeValue: "single", filter: function(filterValue, value){ return (""+value).toLowerCase().indexOf((""+filterValue).toLowerCase()) !== -1 ; }},
        //in : { typeValue: "single", filter: function(filterValue, value){ return filterValue.indexOf(value) !== -1 ; }},
        between : { typeValue: "double", filter: function(filterValue, value){ return value >= filterValue[0] && value <= filterValue[1] ; }},
        lowerThan : { typeValue: "single", filter: function(filterValue, value){ return value < filterValue ; }},
        greaterThan : { typeValue: "single", filter: function(filterValue, value){ return value > filterValue ; }}
     } ;

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
        if(!table.id){
            table.id = uuidv4() ;
        }
        var thisGridId = table.id ;

        var listThead = table.getElementsByTagName("THEAD") ;
        var thead = listThead.length>0?listThead[0]:null ;

        var toolbars = table.querySelectorAll("[data-toolbar]") ;
        for(var i=0; i<toolbars.length; i++){
            //remove it to avoid mix toolbar TH element with header column TH elements
            toolbars[i].parentElement.removeChild(toolbars[i]) ;
        }
       


        var listTh = Array.prototype.slice.call((thead||table).getElementsByTagName("TH")) ;
        if(listTh.length === 0){
            throw ("Your data field grid should have at least a TH tag") ;
        }

        var filename = "export" ;

        if(table.getAttribute("title")){
            filename = table.getAttribute("title") ;
        }
        var title = filename;

        var buttons = [
            {
                extend: 'colvis',
                titleAttr: VeloxWebView.tr?VeloxWebView.tr("global.columnVisibility"):"Column visibility",
            },
            {
                extend: 'copy',
                titleAttr: VeloxWebView.tr?VeloxWebView.tr("global.copyLines"):"Copy",
            },
            {
                extend: 'excel',
                title: title,
                titleAttr: VeloxWebView.tr?VeloxWebView.tr("global.excelExport"):"Excel",
                filename: filename,
            },
            {
                extend: 'pdf',
                title: title,
                titleAttr: VeloxWebView.tr?VeloxWebView.tr("global.pdfExport"):"PDF",
                filename: filename,
            },
            {
                extend: 'print',
                titleAttr: VeloxWebView.tr?VeloxWebView.tr("global.print"):"PDF",
                title: title,
            },
        ] ;
        if(table.hasAttribute("no-toolbar") || table.hasAttribute("data-no-toolbar")){
            buttons = [];
        }
        var searching = true;
        if(table.hasAttribute("no-search") || table.hasAttribute("data-no-search")){
            searching = false;
        }
        var info = true;
        if(table.hasAttribute("no-footer") || table.hasAttribute("data-no-footer")){
            info = false;
        }

        var checkBoxSelection = false;
        var checkBoxMultiple = true;
        if(table.hasAttribute("data-select-checkbox")){
            checkBoxSelection = true;
            if(table.hasAttribute("data-select-single")){
                checkBoxMultiple = false;
            }
        }

        var responsiveDisplay = window.jQuery.fn.dataTable.Responsive.display.childRowImmediate ;
        if(table.hasAttribute("data-responsive-display")){
            switch(table.getAttribute("data-responsive-display")){
                case 'expanded':
                    responsiveDisplay = window.jQuery.fn.dataTable.Responsive.display.childRowImmediate ;
                    break;
                case 'collapsed':
                    responsiveDisplay = window.jQuery.fn.dataTable.Responsive.display.childRow ;
                    break;
            }
        }

        var responsiveOpeningIndex = 0;
        if(table.hasAttribute("data-responsive-opening-index")){
            responsiveOpeningIndex = Number(table.getAttribute("data-responsive-opening-index")) ;
        }

        var responsiveCellRenders = {} ;
        function renderResponsiveCells(api, rowIdx){
            if(!responsiveCellRenders[rowIdx]) { return; }
            var columsNumbers = Object.keys(responsiveCellRenders[rowIdx]);
            for(var i=0; i<columsNumbers.length; i++){
                var colNumber = columsNumbers[i] ;
                var cellInfos = responsiveCellRenders[rowIdx][colNumber] ;
                var span = document.getElementById(cellInfos.cellId) ;
                if(span){
                    if(!cellInfos.els){
                        cellInfos.els = [] ;
                        var cellEl = api.cell(rowIdx, cellInfos.col).node() ;
                        while(cellEl.firstChild){
                            var c = cellEl.firstChild ;
                            span.appendChild(c) ;
                            cellInfos.els.push(c) ;
                        }
                    }else{
                        for(var y=0; y<cellInfos.els.length; y++){
                            span.appendChild(cellInfos.els[y]) ;
                        }
                    }
                }
            }
        }

        var responsiveOpt = {
            details: {
                type: '',
                target: responsiveOpeningIndex,
                display: responsiveDisplay,
                renderer: function ( api, rowIdx, columns ) {
                    var htmlCell = '<ul data-dtr-index="'+rowIdx+'" class="dtr-details">' ;
                    var found = false ;
                    for(var i=0; i<columns.length; i++){
                        var col = columns[i] ;
                        if(col.hidden && !gridOptions.columns[i].className){
                            found = true ;
                            var cellId = uuidv4();
                            htmlCell += '<li data-dtr-index="'+col.columnIndex+'" data-dt-row="'+col.rowIndex+'" data-dt-column="'+col.columnIndex+'">'+
                                '<span class="dtr-title">'+
                                    col.title+
                                '</span> '+
                                '<span class="dtr-data" id="'+cellId+'" data-row="'+col.rowIndex+'" data-col="'+col.columnIndex+'"></span>'+
                            '</li>' ;
                            if(!responsiveCellRenders[rowIdx]){ responsiveCellRenders[rowIdx] = {} ; }
                            if(!responsiveCellRenders[rowIdx][col.columnIndex]){ responsiveCellRenders[rowIdx][col.columnIndex] = {} ; }
                            responsiveCellRenders[rowIdx][col.columnIndex].cellId = cellId;
                            responsiveCellRenders[rowIdx][col.columnIndex].col = col.columnIndex;
                        }
                    }
                    if(found){
                        //datatable add the HTML as innerHTML = ...
                        //so we wait after the HTML change and do proper render in the DOM
                        //to avoid loosing all event listening we done in the cell generation
                        setTimeout(function(){
                            renderResponsiveCells(api, rowIdx) ;
                        }, 1) ;
                        htmlCell += '</ul>' ;
                        return htmlCell;
                    }else{
                        return false;
                    }
                }
            }
        } ;

        var scrollX = false ; //by default responsive is active, no scrollX 
        if(table.hasAttribute("data-responsive") && table.getAttribute("data-responsive") === "false"){
            responsiveOpt = false ;
            scrollX = true ; //no responsive, active scrollX
        }

        var datatable = null;

        var gridOptions = {
            responsive: responsiveOpt,
            autoWidth: false,

            scrollY: "auto",
            scrollCollapse: false,
            scrollX: scrollX,
            info: info,

            paging: false,
            buttons: buttons,
            searching: searching,
            columns: [],
            order: []
        } ;

        var tfoot = element.querySelector("tfoot") ;
        if(tfoot){
            var scriptFooter = tfoot.querySelector("script") ;
            if(scriptFooter){
                var scriptBody = scriptFooter.text ;
                scriptBody +=  "//# sourceURL=/footer/render/"+element.getAttribute("data-original-id")+"/footer-callback.js" ;
                var functionCallback = new Function("row", "data", "start", "end", "display", "datatable", "view", scriptBody) ;
                gridOptions.footerCallback = function ( row, data, start, end, display ) {
                    var datatable = this.api() ;
                    functionCallback(row, data, start, end, display, datatable, view) ;
                } ;
                scriptFooter.parentElement.removeChild(scriptFooter) ;
            }
        }

        function ensureDatatable(callback){
            if(datatable){ return callback() ;}
            var cb = function(){
                HTMLElement.prototype.removeEventListener.call(element,"tableinit", cb) ;
                callback() ;    
            } ;
            HTMLElement.prototype.addEventListener.call(element,"tableinit", cb) ;
        }

        var isCheckboxMouseDown = false;
        var isCheckboxMouseCheck = false;
        if(checkBoxSelection){
            window.jQuery("body").on("mouseup", function(){
                isCheckboxMouseDown = false;
            });
            gridOptions.select = {
                style: checkBoxMultiple?'multi':'single'
            } ;
            var refreshHeaderCheckbox = function(){
                var rows = datatable.rows({ 'search': 'applied' }).nodes();
                var allUnchecked = true ;
                var allChecked = true ;
                for(var z=0; z<rows.length; z++){
                    var checkboxRow = rows[z].querySelector('input[type="checkbox"].dt-col-checkbox') ;
                    if(checkboxRow.checked){
                        allUnchecked = false;
                    }else{
                        allChecked = false ;
                    }
                    if(!allChecked && !allUnchecked){
                        break;
                    }
                }
                var selectAll = element.querySelector(".dataTables_scrollHeadInner .dt-col-checkbox-select-all");
                if(allChecked){
                    selectAll.checked = true ;
                    selectAll.indeterminate = false;
                }else if(allUnchecked){
                    selectAll.checked = false ;
                    selectAll.indeterminate = false;
                }else{
                    selectAll.checked = true ;
                    selectAll.indeterminate = true;
                }
            } ;
            ensureDatatable(function(){
                datatable.on( 'select', function ( e, dt, type, indexes ) {
                    if ( type === 'row' ) {
                        var changed = false;
                        for(var i=0; i<indexes.length; i++){
                            var row = indexes[i] ;
                            var checkbox = element.querySelector('input[row="'+row+'"]') ;
                            if(checkbox && !checkbox.checked){
                                checkbox.checked = true ;
                                changed = true;
                            }
                        }
                        if(changed){
                            refreshHeaderCheckbox() ;
                        }
                    }
                } );
                datatable.on( 'deselect', function ( e, dt, type, indexes ) {
                    if ( type === 'row' ) {
                        var changed = false;
                        for(var i=0; i<indexes.length; i++){
                            var row = indexes[i] ;
                            var checkbox = element.querySelector('input[row="'+row+'"]') ;
                            if(checkbox && checkbox.checked){
                                checkbox.checked = false ;
                                changed = true;
                            }
                        }
                        if(changed){
                            refreshHeaderCheckbox() ;
                        }
                    }
                } );
            });
            gridOptions.columns.push({
                title: '<input type="checkbox" class="dt-col-checkbox-select-all">',
                searchable: false,
                orderable: false,
                width: "12px",
                data: null,
                createdCell : function (td, cellData, rowData, row, col) {
                    var inputCheckBox = document.createElement("INPUT") ;
                    inputCheckBox.type = "checkbox" ;
                    inputCheckBox.className = "dt-col-checkbox" ;
                    inputCheckBox.setAttribute("row", row) ;
                    
                    function inputCheckboxClick(checkbox){
                        var row = Number(checkbox.getAttribute("row")) ;
                        if(!checkbox.checked){
                            datatable.row( row ).select();
                        }else{
                            datatable.row( row ).deselect();
                        }
                        
                    }

                    inputCheckBox.addEventListener("click", function(){
                        inputCheckboxClick(this) ;
                    }) ;

                    inputCheckBox.addEventListener("mousedown", function(){
                        isCheckboxMouseDown = true; 
                        isCheckboxMouseCheck = !this.checked;
                    }) ;
                    td.addEventListener("mouseover", function(){
                        var checkbox = td.querySelector("input") ;
                        if(isCheckboxMouseDown && checkbox.checked !== isCheckboxMouseCheck){ 
                            inputCheckboxClick(checkbox) ;
                            checkbox.checked = isCheckboxMouseCheck; 
                        }
                    }) ;
                    inputCheckBox.addEventListener("mouseout", function(){
                        if(isCheckboxMouseDown && this.checked !== isCheckboxMouseCheck){ 
                            inputCheckboxClick(this) ;
                            this.checked = isCheckboxMouseCheck;
                        }
                    }) ;
                    td.innerHTML = "";
                    var div = document.createElement("DIV");
                    div.style.width = "10px" ;
                    div.appendChild(inputCheckBox) ;
                    td.appendChild(div) ;
                }
            });

            var thCheckbox = document.createElement("TH") ;
            listTh[0].parentElement.insertBefore(thCheckbox, listTh[0]) ;
        }


        var titleHeaderSearchHtml = '<span class="datatable-header-search"></span>' ;
        if(!searching){
            titleHeaderSearchHtml = "" ;
        }
        listTh.forEach(function(th, i){
            if(th.hasAttribute("colspan")){ return ; }
            var colDef = {
                data     : th.getAttribute("data-field-name")||"f"+i,
            };
            if(th.hasAttribute("data-field-size")){
                colDef.width = th.getAttribute("data-field-size") ;
            }


            if(th.hasAttribute("data-cell-view-id")){
                var elView = view.cellViews[th.getAttribute("data-cell-view-id")] ;
                colDef.createdCell = function (td, cellData, rowData, row, col) {
                    var viewOptions = {
                        container: td,
                        htmlEl: elView,
                        css: "",
                        bindObject: rowData
                    } ;
                    
                    var cellView = new VeloxWebView(null, null, viewOptions);

                    //the emitted event are propagated to this view
                    var _emit = cellView.emit ;
                    cellView.emit = function(event, data, source, dontPropagate){
                        _emit.bind(cellView)(event, data, source) ; //emit the event inside the view
                        if(!dontPropagate){
                            this.emit(event, data, cellView) ; //propagate on this view
                        }
                    }.bind(view) ;
                    cellView.openCompiled() ;
                };
            }else{
                var scriptRender = th.querySelector("script") ;
                if(scriptRender){
                    var scriptBody = scriptRender.text ;
                    scriptBody +=  "//# sourceURL=/column/render/"+element.getAttribute("data-original-id")+"/"+colDef.field+".js" ;
                    var functionRender = new Function("td", "data", "row", "rowNum", "col", "view", scriptBody) ;
                    colDef.createdCell = function (td, cellData, rowData, row, col) {
                        var rendered = functionRender(td, cellData, rowData, row, col, view);
                        if(rendered){
                            if(typeof(rendered) === "string"){
                                td.innerHTML = rendered ;
                            }else if(typeof(rendered) === "object" && rendered instanceof HTMLElement){
                                td.innerHTML = "" ;
                                td.appendChild(rendered) ;
                            }
                        }
                    };
                    th.removeChild(scriptRender) ;
                }
            }


            var labelEl = th.querySelector("label") ;
            if(labelEl){
                if(labelEl.hasAttribute("data-i18n")){
                    colDef.title = '<span data-i18n="'+labelEl.getAttribute("data-i18n")+'">'+labelEl.innerHTML+'</span>' ;
                }else{
                    colDef.title = labelEl.innerHTML ;
                }
            }else{
                if(th.hasAttribute("data-i18n")){
                    colDef.title = '<span data-i18n="'+th.getAttribute("data-i18n")+'">'+th.innerHTML+'</span>' ;
                }else{
                    colDef.title = th.innerHTML ;
                }
            }


            colDef.title += ' '+titleHeaderSearchHtml ;

            if(th.hasAttribute("data-sort")){
                gridOptions.order.push([i, th.getAttribute("data-sort")]) ;
            }
            
            ["orderable", "sortable", "searchable", "visible"].forEach(function(colAtt){
                var colValue = th.getAttribute(colAtt);
                if(colAtt === "sortable"){
                    colAtt = "orderable" ;
                }
                if(colValue !== null){
                    colDef[colAtt] = colValue.trim().toLowerCase() !== "false" ;
                }
            });

            ["width"].forEach(function(colAtt){
                var colValue = th.getAttribute(colAtt);
                if(colValue !== null){
                    colDef[colAtt] = colValue ;
                }
            });

            var attDevice = th.getAttribute("data-device");
            if(attDevice){
                colDef.className = attDevice;
            }
            
            var type = th.getAttribute("data-field-type") ;
            colDef.fieldType = type;
            if(!colDef.createdCell && type){
                colDef.createdCell = createGridRenderer(th.getAttribute("data-field-defname"), type) ;
            }

            var searchElement = th.querySelector("[data-search-field]") ;
            if(searchElement){
                colDef.searchElement = searchElement;
                th.removeChild(searchElement) ;
            }


            gridOptions.columns.push(colDef) ;
        }) ;

        

        if(!gridFilterInitialized){
            window.jQuery.fn.dataTable.ext.search.push(
                function( settings, data, dataIndex ) {
                    if(gridFilters[settings.nTable.id]){
                        for(var i=0; i<settings.aoColumns.length; i++){
                            var colDef = settings.aoColumns[i] ;
                            var fieldName = colDef.data ;
                            var filter = gridFilters[settings.nTable.id][fieldName] ;
                            if(filter){
                                var value =data[i] ;
                                if(GRID_FILTERS[filter.ope] && !GRID_FILTERS[filter.ope].filter(filter.value, value)){
                                    return false;
                                }
                            }
                        }
                        return true;
                    }else{
                        return true ;
                    }
                }
            );
            gridFilterInitialized = true ;
        }
        


        var tableData = [] ;
        var eventListeners = {} ;

        element.render = function(){
            redrawColumns() ;
        } ;
        element.search = function(value){
            ensureDatatable(function(){
                datatable.search( value||"" ).draw();
            }) ;
        } ;
        
        element.getValue = function(){
            return tableData;
        } ;
        element.setValue = function(value){
            if(!value){
                value = [] ;
            }
            //sanitize values to avoid this error : https://datatables.net/manual/tech-notes/4
            for(var i=0; i<value.length; i++){
                var row = value[i] ;
                for(var y=0; y<gridOptions.columns.length; y++){
                    var fieldName = gridOptions.columns[y].data ;
                    if(!fieldName){ continue; }
                    var path = fieldName.split(".") ;
                    var obj = row ;
                    while(path.length>0){
                        var p = path.shift() ;
                        if(obj[p] === null || obj[p] === undefined){
                            if(path.length===0){
                                obj[p] = null;
                            }else{
                                obj[p] = {};
                                obj = obj[p] ;
                            }
                        }else{
                            obj = obj[p] ;
                        }
                    }
                }
            }
            tableData = value;
            if(datatable){
                datatable.clear();
                datatable.rows.add(value);
                redrawColumns() ;
            }
        } ;
        element.setReadOnly = function(readOnly){
        } ;
        element.addEventListener = function(event, listener){
            if(!eventListeners[event]){
                eventListeners[event] = [] ;
            }
            eventListeners[event].push(listener) ;
            if(!datatable){
                return ;
            }
        } ;
        element.getSelection = function(){
            var selection = [] ;
            if(datatable){
                selection = Array.prototype.slice.apply(datatable.rows( { selected: true } ).data()) ;
            }
            return selection ;
        } ;

        var getColumnDef = function(fieldName){
            var colDef = null;
            gridOptions.columns.some(function(col){
                if(col.data === fieldName){
                    colDef = col ;
                    return true;
                }
            }) ;
            return colDef;
        } ;

        var getColumnLabel = function(fieldName){
            var colDef = getColumnDef(fieldName) ;
            if(colDef){
                 return colDef.title.replace(titleHeaderSearchHtml, "") ;
            }
            return "";
        } ;
        
        var showFilters = function(){
            var filters = gridFilters[thisGridId] ;
            var allTh = element.querySelectorAll('th[data-field-name]') ;
            for(var i=0; i<allTh.length; i++){
                allTh[i].className = allTh[i].className.replace("data-table-header-filtered", "") ;
            }
            if(filters && Object.keys(filters).length >0){
                var filterDiv = element.querySelector(".dataTables_filter") ;
                var searchInfoDiv = filterDiv.querySelector(".datatable-search-info") ;
                if(!searchInfoDiv){
                    searchInfoDiv = document.createElement("DIV") ;
                    searchInfoDiv.className = "datatable-search-info" ;
                    filterDiv.appendChild(searchInfoDiv) ;
                }
                var currentFilters = Object.keys(filters).map(function(fieldName){
                    var th = element.querySelector('th[data-field-name="'+fieldName+'"]') ;
                    var tableAndColName = null;
                    if(th){
                        tableAndColName = th.getAttribute("data-field-defname") ;
                        th.className += " data-table-header-filtered" ;
                    }
                    var filter = filters[fieldName] ;
                    var value = filter.value;
                    if(tableAndColName){
                        value = VeloxWebView.formatField(value, tableAndColName) ;
                    }else{
                        value = VeloxWebView.format(value, fieldType) ;
                    }
                        
                    return { fieldName: fieldName, ope: filter.ope, value: value } ;
                }) ;
                searchInfoDiv.innerHTML = currentFilters.map(function(f){
                    return "<strong>"+getColumnLabel(f.fieldName) + '</strong> <span data-i18n="'+'grid.search.'+f.ope+'">' + VeloxWebView.tr('grid.search.'+f.ope)+"</span> <strong>"+f.value+"</strong>" ;
                }).join(" + ") ;

                var btClear = document.createElement("SPAN") ;
                btClear.className = "datatable-search-clear-bt" ;
                searchInfoDiv.appendChild(btClear) ;
                btClear.addEventListener("click", function(){
                    delete gridFilters[thisGridId] ;
                    showFilters();
                    datatable.draw() ;
                }) ;
                var btSave = document.createElement("SPAN") ;
                btSave.className = "datatable-search-save-bt" ;
                searchInfoDiv.appendChild(btSave) ;
                btSave.addEventListener("click", function(){
                    var v = new VeloxWebView({html: '<div class="datatable-search-popup">'+
                    '<input type="text" class="datatable-search-save-name" data-bind="name" maxlength="128"/>'+
                    '<button class="datatable-search-popup-ok" id="ok" data-emit data-i18n="global.ok">OK</button></div>'}) ;
                    v.openInPopup(function(){
                        var data= {
                            name : currentFilters.map(function(f){
                                var htmlLabel = getColumnLabel(f.fieldName);
                                return htmlLabel.substring(htmlLabel.indexOf(">")+1, htmlLabel.lastIndexOf("<")) +" "+ VeloxWebView.tr('grid.search.'+f.ope)+" "+f.value ;
                            }).join(" + ")
                        } ;
                        v.render(data) ;
                    });
                    v.on("ok", function(){
                        v.updateData() ;
                        v.close() ;
                        var data = v.getBoundObject();
                        if(apiClient && apiClient.__velox_database && apiClient.__velox_database.velox_map){
                            v.longTask(function(done){
                                apiClient.__velox_database.velox_map.insert({
                                    code: "velox_grid_search_saved",
                                    key: data.name.substring(0,128),
                                    value: filters
                                }, function(err){
                                    if(err){ return done(err) ;}
                                    VeloxWebView.info(VeloxWebView.tr?VeloxWebView.tr("global.saveOk"):"Save OK") ;
                                    done() ;
                                }) ;
                            }) ;
                        }else{
                            //no server map storage, save in local storage only
                            var localSaved = localStorage.getItem("velox_grid_search_saved") ;
                            if(localSaved){
                                localSaved = JSON.parse(localSaved) ;
                            }else{
                                localSaved = {} ;
                            }
                            localSaved[data.name] = filters ;
                            localStorage.setItem("velox_grid_search_saved", JSON.stringify(localSaved)) ;
                            VeloxWebView.info(VeloxWebView.tr?VeloxWebView.tr("global.saveOk"):"Save OK") ;
                        }
                    }) ;
                }) ;
            }else{
                var searchInfoDiv = element.querySelector(".datatable-search-info") ;
                if(searchInfoDiv){
                    searchInfoDiv.parentElement.removeChild(searchInfoDiv) ;
                }
            }
        } ;


       var showSearchHistory = function(){
            var inputSearch = element.querySelector('[type="search"]') ;
            if(inputSearch){
                var elHistory = document.createElement("SPAN") ;
                elHistory.className = "datatable-search-history-bt" ;
                inputSearch.parentElement.style.position = "relative" ;
                inputSearch.parentElement.appendChild(elHistory) ;
                elHistory.addEventListener("click", function(){
                    if(apiClient && apiClient.__velox_database && apiClient.__velox_database.velox_map){
                        view.longTask(function(done){
                            apiClient.__velox_database.velox_map.search({code: "velox_grid_search_saved"}, function(err, searches){
                                if(err){ return console.log("Error while get grid searches", err) ;}
                                searches = searches.map(function(s){
                                    return { name : s.key, filters: s.value } ;
                                }) ;
                                openPopup(searches) ;
                                done() ;
                            });
                        }) ;
                    }else{
                        var localSaved = localStorage.getItem("velox_grid_search_saved") ;
                        if(localSaved){
                            localSaved = JSON.parse(localSaved) ;
                        }else{
                            localSaved = {} ;
                        }
                        var searches = [] ;
                        Object.keys(localSaved).forEach(function(name){
                            searches.push({ name : name, filters: localSaved[name]}) ;
                        });
                    }
                }) ;
                var openPopup = function(searches){
                    var v = new VeloxWebView({html: '<div class="datatable-search-history">'+
                    '<div data-hide-if="searches" data-i18n="grid.noSavedSearch"></div>'+
                    '<div class="datatable-search-history-name" data-bind="searches[]" id="searchItem" data-emit><span data-bind="name"></span> <button id="remove" data-emit class="datatable-search-history-remove">&times;</button></div>'+
                    '</div>'}) ;
                    v.openInPopup(function(){
                        var data= {
                            searches : searches
                        } ;
                        v.render(data) ;
                    });
                    v.on("searchItem", function(ev){
                        var filters = ev.data.data.filters ;
                        v.close() ;
                        gridFilters[thisGridId] = filters ;
                        showFilters() ;
                        datatable.draw() ;
                    }) ;
                    v.on("remove", function(ev){
                        var item = ev.data.data ;
                        searches.some(function(s, i){
                            if(s.name === item.name){
                                searches.splice(i, 1) ;
                                return true;
                            }
                        }) ;
                        if(apiClient && apiClient.__velox_database && apiClient.__velox_database.velox_map){
                            view.longTask(function(done){
                                apiClient.__velox_database.transactionalChanges([{table: "velox_map", action: "removeWhere", record: {code: "velox_grid_search_saved", key: item.name}}], function(err){
                                    if(err){ return console.log("Error while get grid searches", err) ;}
                                    v.render() ;
                                    done() ;
                                });
                            }) ;
                        }else{
                            var localSaved = localStorage.getItem("velox_grid_search_saved") ;
                            if(localSaved){
                                localSaved = JSON.parse(localSaved) ;
                            }else{
                                localSaved = {} ;
                            }
                            delete localSaved[item.name] ;
                            localStorage.setItem("velox_grid_search_saved", JSON.stringify(localSaved)) ;
                            v.render() ;
                        }
                    }) ;
                } ;
            }
        };

        var redrawColumns = function(){
            if(datatable && view.isDisplayed()){
                if(responsiveOpt){
                    datatable.columns.adjust().responsive.recalc().draw();
                }else{
                    datatable.columns.adjust().draw();
                }
            }
        };

        var redraw = function(){
            if(datatable && view.isDisplayed()){
                datatable.draw();
            }
        };

        view.ensureDisplayed(function(){
            if(!datatable){
                //create only when displayed

                datatable = window.jQuery(table).DataTable( gridOptions );

                datatable.on("responsive-display", function(e, datatable, row, showHide, update){
                    renderResponsiveCells(datatable, row.index()) ;
                }) ;

                if(checkBoxSelection){
                    datatable.on( 'draw.dt', function () {
                        element.querySelector(".dataTables_scrollHeadInner .dt-col-checkbox-select-all").addEventListener("click", function(){
                            // Get all rows with search applied
                            var rows = datatable.rows({ 'search': 'applied' }).nodes();
                            // Check/uncheck checkboxes for all rows in the table
                            window.jQuery('input[type="checkbox"].dt-col-checkbox', rows).prop('checked', this.checked);

                            if(this.checked){
                                datatable.rows({ 'search': 'applied' }).select();
                            }else{
                                datatable.rows({ 'search': 'applied' }).deselect();
                            }

                        }) ;
                    } );
                    
                }

                for(var i=0; i<toolbars.length; i++){
                    var toolbar = toolbars[i];
        
                    var customButtons = [] ;
                    Array.prototype.slice.apply(toolbar.children).forEach(function(item){
                        var id = item.getAttribute("data-original-id") ;
                        customButtons.push({
                            text: item.innerHTML,
                            titleAttr: item.title,
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
                decorators.forEach(function(deco){
                    deco(element, fieldType, fieldSize, fieldOptions) ;
                }) ;

                window.jQuery(element).find("thead th").on('click', '.datatable-header-search', function (ev) {
                    var fieldName = ev.target.parentElement.getAttribute("data-field-name") ;
                    var colDef = getColumnDef(fieldName);
                    if(!colDef){
                        throw "Configuration of column "+fieldName+" not found" ;
                    }
                    var select = '<select data-bind="ope" id="ope" data-emit>' ;
                    select += '<option value="nofilter" data-i18n="grid.search.nofilter"></option>' ;
                    Object.keys(GRID_FILTERS).forEach(function(ope){
                        select += '<option value="'+ope+'" data-i18n="grid.search.'+ope+'"></option>' ;
                    }) ;
                    select += '</select>' ;
                    var v = new VeloxWebView({html: '<div class="datatable-search-popup">'+select+
                        colDef.searchElement.outerHTML.replace(">", ' id="value1" data-bind="value1">')+
                        colDef.searchElement.outerHTML.replace(">", ' id="value2" data-bind="value2" style="display:none">')+
                        '<button class="datatable-search-popup-ok" id="ok" data-emit data-i18n="global.ok">OK</button></div>'}) ;
                    v.openInPopup(function(){
                        var data= {
                            ope : "nofilter"
                        } ;
                        var filters = gridFilters[thisGridId] ;
                        if(filters && filters[fieldName]){
                            data = JSON.parse(JSON.stringify(filters[fieldName])) ;
                            if(GRID_FILTERS[data.ope].typeValue === "double"){
                                data.value1 = data.value[0] ;
                                data.value2 = data.value[1] ;
                            }else{
                                data.value1 = data.value ;
                            }
                        }
                        v.render(data) ;
                    });
                    v.on("render", function(){
                        var data = v.getBoundObject();
                        if(data.ope === "nofilter"){
                            v.EL.value1.style.display = "none" ;
                            v.EL.value2.style.display = "none" ;
                        }else{
                            v.EL.value1.style.display = "block" ;
                            if(GRID_FILTERS[data.ope] && GRID_FILTERS[data.ope].typeValue === "double"){
                                v.EL.value2.style.display = "block" ;
                            }else{
                                v.EL.value2.style.display = "none" ;
                            }
                        }
                    }) ;
                    v.on("ope", function(){
                        v.updateData() ;
                        v.render() ;
                    }) ;
                    v.on("ok", function(){
                        v.updateData() ;
                        var data = v.getBoundObject();
                        if(!gridFilters[thisGridId]){
                            gridFilters[thisGridId] = {} ;
                        }
                        var filters = gridFilters[thisGridId] ;
                        if(data.ope === "nofilter"){
                            delete filters[fieldName] ;
                        }else{
                            data.value = data.value1 ;
                            if(GRID_FILTERS[data.ope].typeValue === "double"){
                                data.value = [data.value1, data.value2] ;
                            }
                            delete data.value1;
                            delete data.value2;
                            filters[fieldName] = data ;
                        }
                        v.close() ;
                        showFilters() ;
                        redraw() ;
                    }) ;
                    //openPopupSearchColumn(ev.target.parentElement.getAttribute("data-field-defname")) ;
                    ev.preventDefault() ;
                    ev.stopPropagation() ;
                } );
                window.jQuery(element).find("tbody").on('click', 'tr', function (ev) {
                    if(ev.detail > 1){ return; }
                    if(ev.target.tagName === "INPUT" || ev.target.tagName === "BUTTON" || ev.target.parentElement.tagName === "BUTTON"){
                        return; //click on a button on the line, don't consider as a row click
                    }
                    Object.keys(eventListeners).forEach(function(event){
                        eventListeners[event].forEach(function(listener){
                            if(event === "rowClick"){
                                var rowTr = ev.currentTarget ;
                                if(rowTr.className.indexOf("child") !== -1){
                                    //this is responsive child row
                                    rowTr = rowTr.previousSibling ;
                                }
                                var data = datatable.row( rowTr ).data();
                                ev.rowData = data;
                                listener.bind(this)(ev) ;
                            }
                        });
                    });
                } );
                window.jQuery(element).find("tbody").on('dblclick', 'tr', function (ev) {
                    if(ev.target.tagName === "INPUT" || ev.target.tagName === "BUTTON" || ev.target.parentElement.tagName === "BUTTON"){
                        return; //click on a button on the line, don't consider as a row click
                    }
                    Object.keys(eventListeners).forEach(function(event){
                        eventListeners[event].forEach(function(listener){
                            if(event === "rowDblClick"){
                                var rowTr = ev.currentTarget ;
                                if(rowTr.className.indexOf("child") !== -1){
                                    //this is responsive child row
                                    rowTr = rowTr.previousSibling ;
                                }
                                var data = datatable.row( rowTr ).data();
                                ev.rowData = data;
                                listener.bind(this)(ev) ;
                            }
                        });
                    });
                } );
                element.setValue(tableData) ;
                showSearchHistory() ;
                triggerEvent(element, "tableinit") ;
            }else{
                //already exists, redraw
                redrawColumns();
            }
        }) ;
    }

    

    function createGridRenderer(tableAndColName, type){
        if(["int", "integer", "double", "float", "float8", "number", "decimal"].indexOf(type) !== -1){
            return function (td, cellData/*, rowData, row, col*/) {
                td.style.textAlign = "right" ;
                if(VeloxWebView.formatField && tableAndColName){
                    td.innerHTML = VeloxWebView.formatField(cellData, tableAndColName) ;
                }else{
                    td.innerHTML = VeloxWebView.format(cellData, type) ;
                }
            };
        }
        return function (td, cellData/*, rowData, row, col*/) {
            if(VeloxWebView.formatField && tableAndColName){
                td.innerHTML = VeloxWebView.formatField(cellData, tableAndColName) ;
            }else{
                td.innerHTML = VeloxWebView.format(cellData, type) ;
            }
        };
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
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
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
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
        } ;
        ["change", "focus", "blur", "keyUp", "keyDown"].forEach(function(eventName){
            input.addEventListener(eventName, function(ev){
                triggerEvent(element, ev) ;
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
    
        //trigger change on format actions
        var buttons = element.querySelectorAll('button');
        for(var i=0; i<buttons.length; i++){
            buttons[i].addEventListener("click", function(ev){
                setTimeout(function(){
                    triggerEvent(element, "change") ;
                },1) ;
            }) ;
        }

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
        element.setRequired = function(readOnly){
            setRequired(element, readOnly) ;
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
        var baseUrl = "" ;
        if(element.hasAttribute("data-base-url")){
            baseUrl = element.getAttribute("data-base-url") ;
        }
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

            

            // if(!libs.PDFObject.supportsPDFs){
            //     if(VeloxScriptLoader.options.policy === "cdn"){
            //         console.warn("This browser does not support PDF and PDF.js viewer cannot be load from CDN because it cannot run remotely") ;
            //     }else{
            //         options.PDFJS_URL = VeloxScriptLoader.options.npmPath+"velox-view/ext/pdfjs/"+PDFJS_VERSION+"/web/viewer.html" ;
            //     }
            // }
            
            /*var embedEl = */libs.PDFObject.embed(baseUrl+value, pdfEl, options);
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
        if(element.tagName === "INPUT"){
            return element;
        }
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
                var label = labelField; 
                Object.keys(r).forEach(function(k){ label = label.replace(new RegExp(k,"g"), r[k]); }); 
                return {
                    id: r[idField],
                    label: label 
                } ;
            }) ;
            callback(null, values) ;
        }.bind(this));
    }


    return extension ;

})));