/*global define*/
; (function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        var VeloxScriptLoader = require("velox-loader") ;
        module.exports = factory(VeloxScriptLoader) ;
    } else if (typeof define === 'function' && define.amd) {
        define(['VeloxScriptLoader', 'VeloxWebView'], factory);
    } else {
        global.VeloxWebView.registerExtension(factory(global.veloxScriptLoader, global));
    }
}(this, (function (VeloxScriptLoader) { 'use strict';

    var I18NEXT_VERSION = "11.3.1" ;
    var I18NEXT_XHR_VERSION = "1.5.1";
    var I18NEXT_BROWSER_DETECT_VERSION = "2.2.0";
    var LANG_NUMBERS_VERSION = "1.0.0" ;

    var I18NEXT_LIB = [
        {
            name: "i18next",
            type: "js",
            version: I18NEXT_VERSION,
            cdn: "https://unpkg.com/i18next@$VERSION/i18next.js",
            bowerPath: "i18next/i18next.min.js",
            npmPath: "i18next/i18next.min.js"
        },
        {
            name: "i18next-xhr-backend",
            type: "js",
            version: I18NEXT_XHR_VERSION,
            cdn: "https://unpkg.com/i18next-xhr-backend@$VERSION/i18nextXHRBackend.js",
            bowerPath: "i18next-xhr-backend/i18nextXHRBackend.min.js",
            npmPath: "i18next-xhr-backend/i18nextXHRBackend.min.js"
        },
        {
            name: "i18next-browser-languagedetector",
            type: "js",
            version: I18NEXT_BROWSER_DETECT_VERSION,
            cdn: "https://unpkg.com/i18next-browser-languagedetector@$VERSION/i18nextBrowserLanguageDetector.js",
            bowerPath: "i18next-browser-languagedetector/i18nextBrowserLanguageDetector.min.js",
            npmPath: "i18next-browser-languagedetector/i18nextBrowserLanguageDetector.min.js",
        }
    ];

    var LANG_NUMBERS_LIB = {
        name: "lang-numbers",
        type: "json",
        version: LANG_NUMBERS_VERSION,
        cdn: "https://cdn.rawgit.com/aetna-softwares/velox-view/master/ext/lang/numbers.json",
        bowerPath: "velox-view/ext/lang/numbers.json",
        npmPath: "velox-view/ext/lang/numbers.json"
    };


    /**
     * object that contains i18next instance, by default try to get the global variable
     */
    var i18next = typeof(window)!=="undefined"?window.i18next:null ;

    /**
     * check if we did the initialization of i18next
     */
    var i18nextInitDone = false ;

    /**
     * list of listener waiting for i18next to finish
     */
    var initListeners = [] ;

    /**
     * i18next extension definition
     */
    var extension = {} ;

    extension.libs = [
        I18NEXT_LIB,
        LANG_NUMBERS_LIB,
    ] ;

    extension.name = "i18n" ;

    extension.prepare = function(params, cb){
        if(!i18nextInitDone) {
            //i18next is not inistialized
            console.debug("i18next is not initialized, initialization with default parameters") ;
            configureI18Next({}, cb) ;
        } else {
            cb() ;
        }  
    } ;

    extension.init = function(){
        var view = this ;
        doInitView.bind(view)() ;
    } ;
    extension.extendsProto = {} ;

    /**
     * Translated the given translation key
     * 
     * see https://www.i18next.com/api.html#t
     * 
     * @param {string} trKey - The translation key
     * @param {*} [params] - translation parameters
     * @return {string} - The translated string in current language
     */      
    extension.extendsProto.tr = function(trKey, params){
        return translate.apply(this, arguments) ;
    } ;

    var currentLocale = null;

    /**
     * Add extra data to localdata such as thousands and decimal delimiters
     * 
     * Try to rely on toLocaleString browser if supported, if not supported, the numbro lib is loaded
     * 
     * @param {function(Error)} callback called on finished
     */
    function fillLocales(callback){
        currentLocale = {lang : getLang(), delimiters: {}} ;
        if((99.99).toLocaleString('fr') === "99,99"){
            //the browser support locale string
            var localizedNumber = (1000.99).toLocaleString(currentLocale.lang) ;
            currentLocale.delimiters.thousands = localizedNumber[1] ;
            currentLocale.delimiters.decimal = localizedNumber[5] ;
            callback() ;
        }else{
            //the browser does not support locale string, load numbro lib
            VeloxScriptLoader.load(LANG_NUMBERS_LIB, function(err, result){
                if(err){ return callback(err); }
                var numbroLanguages = result[0][0] ;
                var numbroLangName = currentLocale.lang ;
                if(!numbroLanguages[numbroLangName]){ //lang code not found
                    if(numbroLanguages[numbroLangName+"-"+numbroLangName.toUpperCase()]){ //try with same as region code (ex : fr-FR)
                        numbroLangName = numbroLangName+"-"+numbroLangName.toUpperCase() ;
                    }else{
                        //search a lang code starting with our lang code
                        var foundStartWith = Object.keys(numbroLanguages).some(function(l){
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

                var langData = numbroLanguages[numbroLangName]; 
                currentLocale.delimiters.thousands = langData.delimiters.thousands ;
                currentLocale.delimiters.decimal = langData.delimiters.decimal ;
                callback() ;
            }) ;
        }
    }


    /**
     * Format a value to display
     * 
     * @param {*} value - the value to format
     * @param {string} [type] - type of value
     */
    function format(value, type) {
        if (value === null || value === undefined) {
            if(["int", "integer", "number"].indexOf(type) !== -1){
                return "0";
            }else if(["double", "float", "float8"].indexOf(type) !== -1){
                return "0"+currentLocale.delimiters.decimal+"00";
            }else{
                return "";
            }
        }

        if(typeof(value) === "string" && /[0-3]{1}[0-9]{3}-[0-1]{1}[0-9]{1}-[0-3]{1}[0-9]{1}T[0-2]{1}[0-9]{1}:[0-5]{1}[0-9]{1}:[0-5]{1}[0-9]{1}.[0-9]{3}Z/.test(value)){
            //if is a date like "2017-07-24T22:00:00.000Z"
            value = new Date(value) ;
        }
        if(/[0-3]{1}[0-9]{3}-[0-1]{1}[0-9]{1}-[0-3]{1}[0-9]{1}/.test(value)){
            //if is a date like "2017-07-24"
            value = new Date(value) ;
        }
        if(value instanceof Date){
            if(!type){
                //try to guess if it is a date or a date time
                if(value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0 && value.getMilliseconds() === 0){
                    //the date is exactly midnight, assume it is date only data
                    type = "date";
                }else{
                    //the date has a date with time information, it is probably a data/time
                    type = "datetime";
                }
            }

            if(["datetime", "timestamp", "timestamptz"].indexOf(type) !== -1){
                if(value.toLocaleDateString){
                    return value.toLocaleDateString(currentLocale.lang)+" "+value.toLocaleTimeString(currentLocale.lang) ;
                }else{
                    return value.toDateString()+" "+value.toTimeString() ; //IE10...
                }
            }else{
                if(value.toLocaleDateString){
                    return value.toLocaleDateString(currentLocale.lang) ;
                }else{
                    return value.toDateString() ; //IE10...
                }
            }
        }

        if(typeof(value)==="string" && ["int", "integer", "number", "double", "float", "float8"].indexOf(type) !== -1){
            value = Number(value) ;
        }
        
        if(typeof(value)==="number"){
            if(["int", "integer", "number"].indexOf(type) !== -1){
                return Math.round(value).toFixed(0).replace(/,/g, currentLocale.delimiters.thousands);
            }else if(["double", "float", "float8"].indexOf(type) !== -1){
                var n = value.toFixed(2);
                n = n.substring(0, n.length-3).replace(/\B(?=(\d{3})+(?!\d))/g, currentLocale.delimiters.thousands)+ 
                    currentLocale.delimiters.decimal+
                    n.substring(n.length-2) ;
                return n;
            }else{
                return ""+value;
            }
        }
        return ""+value;
    }

    extension.extendsProto.format = format ;
    
    extension.extendsGlobal = {} ;

    extension.extendsGlobal.i18n = {} ;
    /**
     * Configure the i18next system.
     * options should contains any option of https://www.i18next.com/configuration-options.html
     * in more it can contains an i18n object to use. If not given, the global i18next object will be used
     * if it does not exists, i18next will be retrieved from CDN
     * 
     * default options are : 
     * {
     *       fallbackLng: 'en',
     *       backend: {
     *           loadPath: 'locales/{{lng}}.json',
     *       }
     *   }
     * 
     * @param {object} options - Init option of i18next
     * @param {function(err)} callback - Called when configuration is done
     */
    extension.extendsGlobal.i18n.configure = function(options, callback){
        return configureI18Next(options, callback) ;
    } ;

    /**
     * change the current lang 
     * 
     * @param {string} lang - the lang code
     */
    extension.extendsGlobal.i18n.setLang = function(lang, callback){
        return setLang(lang, callback) ;
    } ;
    /**
     * get the current lang 
     */
    extension.extendsGlobal.i18n.getLang = function(){
        return getLang() ;
    } ;

    /**
     * 
     */
    extension.extendsGlobal.i18n.onLanguageChanged = function(listener){
        onLanguageChanged(listener) ;
    } ;
    
    extension.extendsGlobal.i18n.tr = extension.extendsProto.tr ;
    
    extension.extendsGlobal.tr = extension.extendsProto.tr ;
    
    extension.extendsGlobal.format = extension.extendsProto.format ;

    /**
     * init view translation
     * 
     * @private
     */
    function doInitView(){
        var view = this ;
        i18next.on("languageChanged", function(){
            //when language change, reload the view translation
            doTranslateView.bind(view)() ;
        }) ;
        doTranslateView.bind(view)() ;
    }


    /**
     * translate in the view
     * 
     * @private
     */
    function doTranslateView(){
        var elements = this.elementsHavingAttribute("data-i18n");
        var regexpAttr = /^\[(.*)](.*)$/;
        for(var i=0; i<elements.length; i++){
            var str = elements[i].getAttribute("data-i18n") ;
            var match ;
            if((match = regexpAttr.exec(str)) !== null) {
                var attr = match[1] ;
                var code = match[2] ;
                elements[i].setAttribute(attr, translate(code)) ;
            }else{
                elements[i].innerHTML = translate(str) ;
            }
        }
    }


    /**
     * configure i18next
     * 
     * @private
     */
    function configureI18Next(options, callback) {
        if(options.i18next) {
            i18next = options.i18next ;
        }
        if(!i18next) {
            //no i18next object exists, load from CDN/bower
            console.debug("No i18next object given, we will load from CDN/bower. If you don't want this, include i18next "+I18NEXT_VERSION+
                " in your import scripts or give i18next object to VeloxWebView.i18n.configure function");

            if (!VeloxScriptLoader) {
                return callback("To have automatic script loading, you need to import VeloxScriptLoader");
            }

            VeloxScriptLoader.load(I18NEXT_LIB, function(err){
                if(err){ return callback(err); }
                i18next = window.i18next ;
                initI18Next(options, callback);
            }) ;
        } else {
            initI18Next(options, callback);
        }
    }

    /**
     * init i18next
     * 
     * @private
     */
    function initI18Next(options, callback){
        var opts = {
            fallbackLng: 'en',
            detection: {
                order: ['querystring', 'navigator', 'htmlTag', 'path', 'subdomain'],
            },
            backend: {
                loadPath: 'locales/{{lng}}.json',
            }
        } ;
        Object.keys(options).forEach(function(k){
            opts[k] = options[k] ;
        }) ;

        if(window.i18nextXHRBackend){
            i18next.use(window.i18nextXHRBackend);
        }
        if(window.i18nextBrowserLanguageDetector){
            i18next.use(window.i18nextBrowserLanguageDetector);
        }
        i18next.init(opts, function(err){
            i18nextInitDone = true ;
            console.debug("i18next init done") ;
            if(err){
                //just warn some files are missing, fallback will handle resolution to fallback lang
                console.warn("Some translation file are missing", err) ;
            }

            fillLocales(function(err){
                if(err){ return callback(err) ;}

                initListeners.forEach(function(l){
                    l() ;
                }) ;
                initListeners = [] ;
    
                callback() ;
            }) ;

        });
    }

    /**
     * Ensure the i18next is initialized
     * @param {function} callback called when i18n is done
     */
    function ensureInit(callback){
        if(i18next){ return callback() ;}
        initListeners.push(callback) ;
    }

    /**
     * change lang
     * 
     * @private 
     */
    function setLang(lang, callback){
        if(!callback){
            callback = function(){} ;
        }
        ensureInit(function(){
            i18next.changeLanguage(lang, callback);    
        }) ;
    }

    /**
     * Get the current language
     */
    function getLang(){
        if(i18next){
            return i18next.language ;
        }else{
            return navigator.language || navigator.userLanguage ;
        }
    }

    /**
     * Add a listener on language change
     * 
     * @param {function({string})} listener called when language changed, it receive the new language code
     */
    function onLanguageChanged(listener){
        ensureInit(function(){
            i18next.on("languageChanged", listener) ;
        }) ;
        
    }
    
    /**
     * do translation
     * 
     * @private
     */
    function translate(str, params){
        if(!i18next){
            return console.error("i18next is not yet initialized");
        }
        return i18next.t.apply(i18next, arguments) ;
    }

    return extension ;

})));