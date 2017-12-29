; (function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        var VeloxScriptLoader = require("velox-scriptloader") ;
        var VeloxWebView = require("velox-webview") ;
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
     * flag for CSS of select widget
     */
    var selectCSSLoaded = false;
    /**
     * flag for CSS of upload widget
     */
    var uploadCSSLoaded = false;

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
            loadNeededLib(fieldType, fieldOptions, callback) ;
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
    var INPUTMASK_VERSION = "3.3.7"; //v4 will drop jquery dependency 
    var JQUERY_VERSION = "3.2.1" ;
    var NUMBRO_VERSION = "1.11.0" ;
    var DECIMALJS_VERSION = "2.2.0" ;
    var FLATPICKR_VERSION = "3.0.5-1" ;
    var MOMENTJS_VERSION = "2.18.1" ;
    var CHOICESJS_VERSION = "3.0.2" ;
    var W2UI_VERSION = "1.5.rc1" ;
    var PDFOBJECT_VERSION = "latest" ;
    var PDFJS_VERSION = "1.9.426" ;

    var JQUERY_LIB = {
        name: "jquery",
        type: "js",
        version: JQUERY_VERSION,
        cdn: "http://code.jquery.com/jquery-$VERSION.min.js",
        bowerPath: "jquery/dist/jquery.min.js"
    } ;
    var INPUT_MASK_LIB = [
        JQUERY_LIB,
        {
            name: "inputmask-bundle",
            type: "js",
            version: INPUTMASK_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/RobinHerbots/Inputmask@$VERSION/dist/jquery.inputmask.bundle.js",
            bowerPath: "inputmask/dist/jquery.inputmask.bundle.js"
        }
    ];

    var NUMBRO_LIB = [
        {
            name: "numbro",
            type: "js",
            version: NUMBRO_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/numbro/$VERSION/numbro.min.js",
            bowerPath: "numbro/dist/numbro.min.js"
        },
        {
            name: "numbro-language",
            type: "js",
            version: NUMBRO_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/numbro/$VERSION/languages.min.js",
            bowerPath: "numbro/dist/languages.min.js"
        }
    ];

    var DECIMALJS_LIB = [
        {
            name: "decimaljs-light",
            type: "js",
            version: DECIMALJS_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/MikeMcl/decimal.js-light@$VERSION/decimal.min.js",
            bowerPath: "decimal.js-light/decimal.min.js"
        }
    ];

    var FLATPICKR_LIB = [
        {
            name: "flatpickr-calendar-css",
            type: "css",
            version: FLATPICKR_VERSION,
            cdn: "https://unpkg.com/flatpickr@$VERSION/dist/flatpickr.min.css",
            bowerPath: "flatpickr/dist/flatpickr.min.css"
        },
        {
            name: "flatpickr-calendar-js",
            type: "js",
            version: FLATPICKR_VERSION,
            cdn: "https://unpkg.com/flatpickr@$VERSION",
            bowerPath: "flatpickr/dist/flatpickr.min.js"
        }
    ];

    
    var CHOICEJS_LIB = [
        JQUERY_LIB,
        {
            name: "choices-css",
            type: "css",
            version: CHOICESJS_VERSION,
            cdn: "https://rawgit.com/jshjohnson/Choices/v$VERSION/assets/styles/css/choices.min.css",
            bowerPath: "choices.js/assets/styles/css/choices.min.css"
        },
        {
            name: "choices-js",
            type: "js",
            version: CHOICESJS_VERSION,
            cdn: "https://rawgit.com/jshjohnson/Choices/v$VERSION/assets/scripts/dist/choices.min.js",
            bowerPath: "choices.js/assets/scripts/dist/choices.min.js"
        }
    ];

    var W2UI_LIB = [
        JQUERY_LIB,
        {
            name: "w2ui-css",
            type: "css",
            version: W2UI_VERSION,
            
            cdn: "http://rawgit.com/vitmalina/w2ui/master/dist/w2ui.min.css",
            bowerPath: "w2ui/dist/w2ui.min.css"
        },
        {
            name: "w2ui-js",
            type: "js",
            version: W2UI_VERSION,
            cdn: "http://rawgit.com/vitmalina/w2ui/master/dist/w2ui.min.js",
            bowerPath: "w2ui/dist/w2ui.js"
        }
    ];

    var PDFOBJECT_LIB = [
        {
            name: "pdfobject",
            type: "js",
            version: PDFOBJECT_VERSION,
            cdn: "https://bowercdn.net/c/pdfobject2-$VERSION/pdfobject.min.js",
            bowerPath: "pdfobject/pdfobject.min.js"
        }
    ];

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
     * Translate the locale code in w2ui naming conviention
     * 
     * Fallback to default US locale if lang not found
     * 
     * @param {string} lang the lang code from current locale
     */
    function w2uiLocaleCode(lang){
        var availableLocales = ["az-az", "ba-ba", "bg-bg", "ca-es", "de-de", "en-gb", "en-us", "es-es", "es-mx", "fr-fr", "gl-es", "hr-hr", "hu-hu", "id-id", "it-it", "ja-jp", "ko-kr", "lt-lt", "nl-nl", "no-no", "pl-pl", "pt-br", "ru-ru", "sk-sk", "sl-si", "tr-tr", "zh-cn"];
        lang = lang.replace("_", "-").toLowerCase() ;

        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        lang = lang+"-"+lang ;
        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        return "en-us" ;
    }

    /**
     * Load the local for W2UI and configure W2UI with it
     * 
     * @param {function(Error)} callback called on finished
     */
    function loadW2uiLibLocale(callback){
        var lib =  {
            name: "w2ui-locale-"+w2uiLocaleCode(currentLocale.lang),
            type: "json",
            version: W2UI_VERSION,
            cdn: "https://cdn.rawgit.com/vitmalina/w2ui/master/src/locale/"+w2uiLocaleCode(currentLocale.lang)+".json",
            bowerPath: "w2ui/src/locale/"+w2uiLocaleCode(currentLocale.lang)+".json"
        };

        loadLib("w2ui-locale-"+currentLocale.lang, W2UI_VERSION, lib, function(err, results){
            if(err){ return callback(err) ;}
            var langJson = results[0][0] ;
            window.w2utils.locale(langJson);
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
                bowerPath: "flatpickr/dist/l10n/"+flatpickerLocaleCode(currentLocale.lang)+".js"
        };
        var libMoment =  {
                name: "moment-locale-"+momentLocaleCode(currentLocale.lang),
                type: "js",
                version: MOMENTJS_VERSION,
                cdn: "https://cdnjs.cloudflare.com/ajax/libs/moment.js/$VERSION/locale/"+momentLocaleCode(currentLocale.lang)+".js",
                bowerPath: "moment/locale/"+momentLocaleCode(currentLocale.lang)+".js"
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
        var calls = [] ;
        elements.forEach(function(element){
            calls.push(function(cb){
                var fieldType = element.getAttribute("data-field") ;
                var fieldOptions = {} ;
                Array.prototype.slice.call(element.attributes).forEach(function(att){
                    var startIndex = "data-field-".length ;
                    var attKey = att.name ;
                    if(attKey.indexOf("data-field") === 0 && attKey.length > startIndex){
                        fieldOptions[attKey.substring(startIndex)] = element.getAttribute(attKey) ;
                    }
                }) ;
                loadNeededLib(fieldType, fieldOptions, cb) ;
            }) ;
        });
        series(calls, callback) ;
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

    function loadNeededLib(fieldType, fieldOptions, callback){
        if(fieldType === "varchar" || fieldType==="text" || fieldType === "string" || fieldType === "password"){
            if(fieldOptions && fieldOptions.mask){
                loadInputMask(callback) ;
            }else{
                callback() ;
            }
        } else if(fieldType === "int" || fieldType === "integer" || fieldType==="number" || fieldType==="decimal" || 
            fieldType==="double" || fieldType==="float" || fieldType==="currency" || fieldType==="percent"){
            loadLib("Decimal", DECIMALJS_VERSION, DECIMALJS_LIB, function(err){
                if(err){ return callback(err) ;}
                loadInputMask(function(err){
                    if(err){ return callback(err) ;}
                    if(fieldType === "int" || fieldType === "integer" || fieldType==="number") {
                        getLocale(callback);
                    }else if(fieldType==="decimal" || fieldType==="double" || fieldType==="float" || fieldType==="percent" || fieldType==="currency"){
                        getLocale(callback) ;
                    }
                }) ;
            }) ;
        } else if(fieldType === "email"){
            loadInputMask(callback) ;
        } else if(["date", "datetime", "time", "timestamp", "timestamptz"].indexOf(fieldType) !== -1){
            loadLib("flatpickr", FLATPICKR_VERSION, FLATPICKR_LIB, function(err){
                if(err){ return callback(err) ;}
                loadInputMask(function(err){
                    if(err){ return callback(err) ;}
                    getLocale(function(err){
                        if(err){ return callback(err); }
                        loadDateLibLocale(callback) ;
                    }) ;
                }) ;
            }) ;
        } else if(fieldType === "selection" || fieldType === "select"){
            loadLib("choice.js", CHOICESJS_VERSION, CHOICEJS_LIB, callback) ;
            loadSelectCSS() ;
        } else if(fieldType === "bool" || fieldType === "boolean" || fieldType === "checkbox"  || fieldType === "toggle" || fieldType === "switch"){
            //no lib
            callback() ;
        } else if(fieldType === "grid"){
            loadLib("w2ui", W2UI_VERSION, W2UI_LIB, function(err){
                if(err){ return callback(err); }
                getLocale(function(err){
                    if(err){ return callback(err); }
                    loadW2uiLibLocale(callback) ;
                }) ;
            }) ;
        } else if(fieldType === "upload"){
            //no lib
            callback() ;
        } else if(fieldType === "pdf"){
            loadLib("PDFObject", PDFOBJECT_VERSION, PDFOBJECT_LIB, callback) ;
        } else {
            callback("Unknow field type "+fieldType) ; 
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
        _createField(element, fieldType, fieldSize, fieldOptions) ;
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
    function _createField(element, fieldType, fieldSize, fieldOptions){
        if(fieldType === "varchar" || fieldType==="text" || fieldType === "string" || fieldType === "password"){
            createTextField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "int" || fieldType === "integer" || fieldType==="number" || fieldType==="decimal" || 
            fieldType==="double" || fieldType==="float" || fieldType==="currency" || fieldType==="percent"){
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
            createGridField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "upload"){
            createUploadField(element, fieldType, fieldSize, fieldOptions) ;
        } else if(fieldType === "pdf"){
            createPdfField(element, fieldType, fieldSize, fieldOptions) ;
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
        var input = appendInputHtml(element) ;
        var maskField = null;
        var maskOptions = null;

        element.getValue = function(){
            if(maskField){
                var value = maskField._valueGet() ;
                if(maskOptions){
                    value = replaceAll(value, maskOptions.radixPoint, ".");
                    value = replaceAll(value, maskOptions.groupSeparator, "");
                    value = replaceAll(value, maskOptions.prefix, "");
                    value = replaceAll(value, maskOptions.suffix, "");
                }
                value = value === "" ? new libs.Decimal(0) : new libs.Decimal(value);
                if(fieldType === "percent"){
                    value = value.div(100) ;
                }
                return value ;
            }
            return input.value ;
        } ;
        element.setValue = function(value){
            if(!value){ value = 0; }
            value = new libs.Decimal(value) ;
            if(fieldType === "percent"){
                value = value.mul(100) ;
            }
            value = value.toNumber() ;
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


        if(fieldType === "int" || fieldType === "integer" || fieldType==="number") {
            maskOptions = { 
                radixPoint: currentLocale.delimiters.decimal , 
                groupSeparator : currentLocale.delimiters.thousands , 
                prefix : "", suffix : "", positionCaretOnTab: false
            } ;

            var im = new libs.Inputmask("integer", maskOptions);
            maskField = im.mask(input) ;
        }else if(fieldType==="decimal" || fieldType==="double" || fieldType==="float" || fieldType==="percent" || fieldType==="currency"){
            maskOptions = { 
                radixPoint: currentLocale.delimiters.decimal , 
                groupSeparator : currentLocale.delimiters.thousands , 
                prefix : "", suffix : "", positionCaretOnTab: false
            } ;

            if(fieldOptions.decimaldigits){
                var digits = parseInt(fieldOptions.decimaldigits, 10) ;
                if(isNaN(digits)){
                    throw "Invalid value for option decimaldigits, number expected" ;
                }
                maskOptions.digits = digits ;
            }
            
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

        var css = ".choices[data-type*=select-one] .choices__inner { padding-bottom: 3.5px ;}";
        css += ".choices__inner { background-color: white; padding: 3.5px 5.5px 2.75px; min-height: 34px;}";
        css += ".choices.is-disabled[data-type*=select-one]:after { display: none; }";
        
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
        //element.style.visibility = "hidden";

        var choices = new window.Choices(select, {
            searchEnabled: true
        });

        choices.setValue("") ;
        //element.style.visibility = "visible";

        element.getValue = function(){
            var value = choices.getValue(true)  ;
            return value||null ;
        } ;
        element.setValue = function(value){
            return choices.setValueByChoice(value) ;
        } ;
        element.setReadOnly = function(readOnly){
            if(readOnly) {
                choices.disable();
            }else{
                choices.enable();
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
            choices.setChoices(options) ;
        } ;
        element.getOptions = function(){
            return choices.choices;
        } ;
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
     * Create the grid field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"grid"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions the field options (from attributes)
     */
    function createGridField(element, fieldType, fieldSize, fieldOptions){
        var subTables = element.getElementsByTagName("TABLE") ;
        if(subTables.length === 0){
            throw ("Your data field grid should contain a TABLE tag") ;
        }
        var table = subTables[0];
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
        }else if(["double", "float", "number", "decimal"].indexOf(type) !== -1){
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
                    console.warn("This browser does not support PDF and PDF.js viewer cannot be load from CDN because it cannot run remotely")
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


    return extension ;

})));