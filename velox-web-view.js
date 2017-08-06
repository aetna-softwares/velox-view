; (function (global, factory) {
        typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
                typeof define === 'function' && define.amd ? define(factory) :
                        global.VeloxWebView = factory()
}(this, (function () { 'use strict';

        /**
         * Separator used in generated ID
         */
        var ID_SEP = "_-_";

        /**
         * Regexp to find id attribute
         */
        var REGEXP_ID = /id="([^"]*)"/g;

        /**
         * Dictionnary of all loaded CSS
         */
        var loadedCss = {};

        /**
         * Create an unique ID
         */
        function uuidv4() {
                if(crypto && crypto.getRandomValues){
                return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                ) ;
                }else{
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                });
                }
        }

        /**
         * Event emiter
         * 
         * @constructor
         */
        function EventEmiter() {
                this.listeners = {};
        }

        /**
         * Listen to event
         * 
         * @param {string} type - the event type name
         * @param {function} listener - the listener that will be called on event
         */
        EventEmiter.prototype.on = function (type, listener) {
                if (!this.listeners[type]) {
                        this.listeners[type] = [];
                }
                this.listeners[type].push(listener);
                return this;
        };

        /**
         * Unregister an event listener
         * 
         * @param {string} type - the event type name
         * @param {function} listener - the listener that will stop to listen
         */
        EventEmiter.prototype.off = function (type, listener) {
                var listeners = this.listeners[type];
                if (!listeners) {
                        return this;
                }
                for (var i = 0; i < listeners.length; i++) {
                        if (listeners[i] === listener) {
                                listeners.splice(i, 1);
                                break;
                        }
                }
                return this;
        };

        /**
         * Listen to an event only once
         * 
         * @param {string} type - the event type name
         * @param {function} listener - the listener that will be called on event
         */
        EventEmiter.prototype.once = function (type, listener) {
                var self = this;
                var once;
                this.on(type, once = function () {
                        self.off(type, once);
                        listener.call(self, arguments);
                });
        };

        /**
         * Emit an event
         * 
         * @private
         * @param {string} type - the event type name
         * @param {object} [data=undefined] - the data to send with the event
         */
        EventEmiter.prototype.emit = function (type, data) {
                var listeners = this.listeners[type];
                if (!listeners) {
                        return;
                }
                for (var i = 0; i < listeners.length; i++) {
                        var listener = listeners[i];
                        listener({ type: type, data: data });
                }
        };

        /**
         * Extract a sub object use a path
         * 
         * for example {foo: {bar : "something"}} with the path "foo.bar" gives "something"
         * 
         * @param {object} obj - The object in wich extract the sub object
         * @param {(string|string[])} path - The path used to extract the sub object
         * @param {boolean} getParent return the object containing the target value instead of the target value (default false)
         * @return {object} - The extracted sub object
         */
        function pathExtract(obj, path, getParent) {
                if(!path){
                        return obj ;
                }
                var pathArray = path ;
                if (!Array.isArray(path)) {
                        pathArray = path.split(".");
                }else{
                        pathArray = path.slice();
                }
                if(getParent){
                        pathArray.pop() ;
                }
                var dataObject = obj;
                while (pathArray.length > 0) {
                        //property name
                        var p = pathArray.shift().trim();
                        var index = null;
                        if (p.includes("[")) {
                                //has index
                                index = p.substring(p.indexOf("[") + 1, p.indexOf("]")).trim();
                                p = p.substring(0, p.indexOf("[")).trim();
                        }

                        if (dataObject) {
                                if (p && p !== "this") {
                                        dataObject = dataObject[p];
                                }
                                if (dataObject && index !== null) {
                                        dataObject = dataObject[index];
                                }
                        }
                }
                return dataObject;
        }

        /**
         * Set a value inside the object following a path
         * 
         * @example
         * var obj = {foo: {bar: "something"}} ;
         * pathSetValue(obj, "foo.bar", "new value") ;
         * //obj is now  {foo: {bar: "new value"}}
         * 
         * 
         * @param {object} obj - The object in which update a value
         * @param {(string|string[])} path - Path of the value to set in the object 
         * @param {*} value  - The value to set
         */
        function pathSetValue(obj, path, value) {
                var pathArray = path.slice();
                if (!Array.isArray(path)) {
                        pathArray = path.split(".");
                }
                var dataObject = obj;
                while (pathArray.length > 0) {
                        //property name
                        var p = pathArray.shift().trim();
                        var index = null;
                        if (p.includes("[")) {
                                //has index
                                index = parseInt(p.substring(p.indexOf("[") + 1, p.indexOf("]")).trim(), 10);
                                p = p.substring(0, p.indexOf("[")).trim();
                        }

                        if (dataObject) {
                                if (pathArray.length === 0) {
                                        //last part, set the value
                                        if (index !== null) {
                                                if (p && p !== "this") {
                                                        if (!dataObject[p]) {
                                                                dataObject[p] = [];
                                                        }
                                                        dataObject = dataObject[p];
                                                }
                                                dataObject[index] = value;
                                        } else {
                                                dataObject[p] = value;
                                        }
                                } else {
                                        //not last part, continue to dig
                                        if (p && p !== "this") {
                                                if (!dataObject[p]) {
                                                        if (index !== null) {
                                                                dataObject[p] = [];
                                                        } else {
                                                                dataObject[p] = {};
                                                        }
                                                }
                                                dataObject = dataObject[p];
                                        }
                                        if (dataObject && index !== null) {
                                                if (!dataObject[index]) {
                                                        dataObject[index] = {};
                                                }
                                                dataObject = dataObject[index];
                                        }
                                }

                        }
                }
        }

        /**
         * Execute async function (functions that take callback) in series
         * Call the callback in one function gives an error or when all are finished
         * 
         * @param {function(cb)} calls - Async functions to call in series
         * @param {function(err)} callback - Called when all functions are finished 
         */
        function asyncSeries(calls, callback) {
                if (calls.length === 0) {
                        //nothing more to call
                        return callback();
                }
                var call = calls[0];
                call(function (err) {
                        if (err) { return callback(err); }
                        asyncSeries(calls.slice(1), callback);
                });
        }


        /**
         * The Velox Web View class
         * 
         * @constructor
         * 
         * @param {string} directory - The directory path of the view HTML file
         * @param {string} name - The name of the view HTML file (without extension)
         */
        function VeloxWebView(directory, name) {
                EventEmiter.call(this);

                this.directory = directory;
                this.name = name;
                this.views = {};
                this.initDone = false;
                this.bindObject = null;
                this.bindPath = null;
                this.innerViewIds = [] ;

                Object.defineProperty(this, "EL", {
                        get: (function () {

                                if (!this.ids) {
                                        throw "Try to access element before initialization, consider to use ensureInit()";
                                }
                                let els = this.elements;
                                let elFound = false;
                                if (!els) {
                                        els = {};
                                        Object.keys(this.ids).forEach((function (id) {
                                                els[id] = document.getElementById(this.ids[id]);
                                                if (els[id]) {
                                                        els[id].on = els[id].addEventListener ;
                                                        elFound = true;
                                                }
                                        }).bind(this));
                                        this.innerViewIds.forEach(function(innerViewId){
                                                els[innerViewId.id] = innerViewId ;
                                        }.bind(this)) ;
                                }
                                if (elFound) {
                                        this.elements = els; //remember only if found
                                }
                                return els;
                        }).bind(this)
                });
        }

        VeloxWebView.prototype = Object.create(EventEmiter.prototype);
        VeloxWebView.prototype.constructor = VeloxWebView;

        /**
         * Init the view
         * 
         * Options are : 
         *   container : id or reference of HTML Element
         *   bindObject : object to bind with the view
         *   bindPath : bind path to apply to object to get values to use in the view
         *   containerParent : id or reference of parent HTML Element, if container is not given, a DIV will be added in containerParent
         *   staticHTML : use this HTML instead of fetch HTML file
         *   staticCSS : use this CSS instead of fetch CSS file
         * 
         * @param {object} options - The options
         * @param {function(Error)} [callback] - Called when init is done
         */
        VeloxWebView.prototype.init = function (options, callback) {
                this.container = options.container;
                this.bindObject = options.bindObject;
                this.bindPath = options.bindPath;
                this.containerParent = options.containerParent;
                this.staticHTML = options.html;
                this.staticCSS = options.css;

                if (!callback) { callback = function (err) { 
                        
                        if(err){ 
                                console.error("Unexpected error", err) ;
                                throw "Unexpected error "+err ; 
                        }
                }; }

                if (this.initDone) {
                        //already init
                        return callback();
                }

                


                this.loadCSS();

                this.getHTML((function (html) {
                        this.ids = {};

                        var htmlReplaced = html;

                        var functionInView = null;
                        var indexScript = htmlReplaced.toLowerCase().indexOf("<script") ;
                        if(indexScript !== -1){
                                var indexBodyScript = htmlReplaced.indexOf(">", indexScript) ;
                                var indexEndScript = htmlReplaced.toLowerCase().indexOf("</script>") ;
                                if(indexEndScript === -1){
                                        return callback("can't find closing </script> in view") ;
                                }
                                var scriptBody = htmlReplaced.substring(indexBodyScript+1, indexEndScript) ;

                                functionInView = function(view){
                                        eval(scriptBody) ;
                                } ;
                                htmlReplaced = htmlReplaced.substring(0, indexScript)+htmlReplaced.substring(indexEndScript+"</script>".length) ;
                        }

                        var match;
                        while ((match = REGEXP_ID.exec(html)) !== null) {
                                var id = match[1];
                                var uuidEl = uuidv4();

                                if (id[0] === "#") {
                                        //force keep this id
                                        id = id.substring(1);
                                        this.ids[id] = id;
                                        htmlReplaced = htmlReplaced.replace('id="#' + id + '"', 'id="' + id + '"');
                                } else {
                                        //add UUID
                                        this.ids[id] = id + ID_SEP + uuidEl;
                                        htmlReplaced = htmlReplaced.replace('id="' + id + '"', 'id="' + id + '_-_' + uuidEl + '" data-original-id="' + id + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('data-target="#' + id + '"', 'g'),
                                                'data-target="#' + id + '_-_' + uuidEl + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('href="#' + id + '"', 'g'),
                                                'href="#' + id + '_-_' + uuidEl + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('aria-controls="' + id + '"', 'g'),
                                                'aria-controls="' + id + '_-_' + uuidEl + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('for="' + id + '"', 'g'),
                                                'for="' + id + '_-_' + uuidEl + '"');
                                }
                        }

                        htmlReplaced = htmlReplaced.replace(/__dir__/g, this.directory);



                        if (typeof (this.container) === "string") {
                                this.containerId = this.container;
                                this.container = document.getElementById(this.container);
                        }

                        if (!this.container) {
                                if (this.containerParent) {
                                        //automatically create container in parent if not exist
                                        var div = document.createElement("DIV");
                                        div.innerHTML = htmlReplaced;
                                        if(div.childElementCount === 1){
                                                //only 1 root element in view, use it as container
                                                this.container = div.children[0] ;
                                        }else{
                                                //many root element in the view, use the div as container
                                                this.container = div ;
                                        }

                                        if (this.containerId) {
                                                this.container.id = this.containerId;
                                        }

                                        if (typeof (this.containerParent) === "string") {
                                                this.containerParent = document.getElementById(this.containerParent);
                                        }
                                        this.container.style.display = "none"; //hide during init
                                        this.containerParent.appendChild(this.container);
                                } else {
                                        throw this.containerId + " is not found";
                                }
                        } else {
                                this.container.style.display = "none"; //hide during init
                                this.container.innerHTML = htmlReplaced;
                        }

                        

                        this.initAutoEmit();

                        this.prepareSubView() ;

                        var calls = [];
                        VeloxWebView.extensions.forEach((function (extension) {
                                if (extension.init) {
                                        if (extension.init.length === 0) {
                                                //no callback
                                                extension.init.bind(this)();
                                        } else {
                                                calls.push((function (cb) {
                                                        extension.init.bind(this)(cb);
                                                }).bind(this));
                                        }
                                }
                        }).bind(this));

                        asyncSeries(calls, (function (err) {
                                

                                if(functionInView){
                                        functionInView(this) ;
                                }
                                this.initDone = true;
                                this.emit("initDone");

                                this.render((function () {
                                        this.container.style.display = ""; //show after init        
                                        callback(err);
                                }).bind(this));
                        }).bind(this));
                }).bind(this));
                return this;
        };

        /**
         * Get the current bound object
         * 
         * @return {object} - The object bound to the view
         */
        VeloxWebView.prototype.getBoundObject = function () {
                return pathExtract(this.bindObject, this.bindPath);
        };

        /**
         * Get HTML file through XHR
         * @private
         * 
         * @param {function(html)} callback - Called with HTML contents when fetched
         */
        VeloxWebView.prototype.getHTML = function (callback) {
                if (this.staticHTML) {
                        callback(this.staticHTML);
                } else {
                        var htmlUrl = this.directory + "/" + this.name + ".html";

                        var xhr = new XMLHttpRequest();
                        xhr.open('GET', htmlUrl);
                        xhr.onload = (function () {
                                if (xhr.status === 200) {
                                        callback.bind(this)(xhr.responseText);
                                } else {
                                        callback.bind(this)('Request to ' + htmlUrl + ' failed.  Returned status of ' + xhr.status);
                                }
                        }).bind(this);
                        xhr.send();
                }
        };

        /**
         * Load CSS of the view
         * @private
         */
        VeloxWebView.prototype.loadCSS = function () {
                if (!loadedCss[this.directory + "_" + this.name]) {
                        if (this.staticCSS !== undefined) {
                                if (this.staticCSS) {
                                        var head = document.getElementsByTagName('head')[0];
                                        var s = document.createElement('style');
                                        s.setAttribute('type', 'text/css');
                                        if (s.styleSheet) {   // IE
                                                s.styleSheet.cssText = this.staticCSS;
                                        } else {                // the world
                                                s.appendChild(document.createTextNode(this.staticCSS));
                                        }
                                        head.appendChild(s);
                                        //$('head').append('<style>'+this.staticCSS+'</style>');
                                }

                                loadedCss[this.directory + "_" + this.name] = true;
                        } else {
                                this.loadCSSFile();
                        }
                }
        };

        /**
         * Load CSS from file
         * @private
         */
        VeloxWebView.prototype.loadCSSFile = function () {
                if (!loadedCss[this.directory + "_" + this.name]) {
                        var cssUrl = this.directory + "/" + this.name + ".css";
                        var xhr = new XMLHttpRequest();
                        xhr.open('HEAD', cssUrl);
                        xhr.onload = (function () {
                                if (xhr.status !== 404) {
                                        document.querySelector('head').innerHTML += '<link rel="stylesheet" href="' + cssUrl + '" type="text/css"/>';
                                }
                        }).bind(this);
                        xhr.send();
                        //$('head').append('<link rel="stylesheet" href="'+cssUrl+'" type="text/css" />');
                        loadedCss[this.directory + "_" + this.name] = true;
                }
        };

        /**
         * Make sure the init process of the view is done
         * 
         * @param {function} callback - Called when the init is done (or immediatly if already done)
         */
        VeloxWebView.prototype.ensureInit = function (callback) {
                if (this.initDone) {
                        callback();
                } else {
                        this.once("initDone", callback);
                }
        };


        VeloxWebView.prototype._addSubView = function(el){
                if(Object.keys(this.views).some(function(k){ return this.views[k].el === el;}.bind(this))){
                        return; //already added
                }


                var viewId = el.getAttribute("data-view-id");
                if (!viewId) {
                        viewId = el.getAttribute("data-original-id");
                        if (!viewId) {
                                viewId = uuidv4();
                        }
                        el.setAttribute("data-view-id", viewId);
                }
                if (!this.views[viewId]) {
                        var viewAttr = el.getAttribute("data-view");
                        var bindAttr = el.getAttribute("data-bind");
                        var showIfAttr = el.getAttribute("data-show-if");
                        var hideIfAttr = el.getAttribute("data-hide-if");
                        if(viewAttr){
                                var lastSlash = viewAttr.lastIndexOf("/") ;
                                var dir = this.directory ;
                                var file = viewAttr ;
                                if(lastSlash !== -1){
                                        dir = viewAttr.substring(0, lastSlash) ;
                                        file= viewAttr.substring(lastSlash+1) ;
                                }
                                this.views[viewId] = {
                                        el: el,
                                        bindPath: bindAttr,
                                        dir: dir,
                                        file: file,
                                        showIf: showIfAttr,
                                        hideIf: hideIfAttr,
                                        instances: []
                                };
                        }else{
                                this.views[viewId] = {
                                        el: el,
                                        bindPath: bindAttr,
                                        html: el.innerHTML,
                                        showIf: showIfAttr,
                                        hideIf: hideIfAttr,
                                        instances: []
                                };
                                
                        }
                        
                        el.innerHTML = "";
                }
        } ;

        VeloxWebView.prototype.prepareSubView = function () {
                var elementsSubs = [] ;
                var i, el, bindPath;
                
                //views linked to data-show-if
                var elementsShowIf = this.container.querySelectorAll('[data-show-if]');
                for (i = 0; i < elementsShowIf.length; i++) {
                        elementsSubs.push(elementsShowIf[i]) ;
                }

                //views linked to data-show-if
                var elementsHideIf = this.container.querySelectorAll('[data-hide-if]');
                for (i = 0; i < elementsHideIf.length; i++) {
                        elementsSubs.push(elementsHideIf[i]) ;
                }

                
                //views linked to data bind of array like data-bind="obj.listOfSomething[]"
                var elements = this.container.querySelectorAll('[data-bind]');
                for (i = 0; i < elements.length; i++) {
                        el = elements[i];
                        bindPath = el.getAttribute("data-bind");
                        if (bindPath.replace(/\s/g, "").match(/\[\]$/)) {
                                elementsSubs.push(el) ;
                        }
                }

                //view explicitelly referenced with data-view="dir/myview"
                var elementsView = this.container.querySelectorAll('[data-view]');
                for (i = 0; i < elementsView.length; i++) {
                        elementsSubs.push(elementsView[i]) ;
                }

                for (i = 0; i < elementsSubs.length; i++) {
                        el = elementsSubs[i] ;
                        //check if it is a sub element of a subview
                        var parent = el.parentElement ;
                        var isAlreadyInSubView = false;
                        while(parent && parent !== this.container){
                                if(elementsSubs.indexOf(parent) !== -1){
                                     isAlreadyInSubView = true;
                                     break;   
                                }
                                parent = parent.parentElement ;
                        }

                        //reset the id has it will be parsed again when sub view will be instancied
                        var elementsSubViews = el.querySelectorAll('[data-original-id]');
                        for(var z=0; z<elementsSubViews.length; z++){
                                var elInner = elementsSubViews[z] ;
                                elInner.id = elInner.getAttribute("data-original-id") ; 
                                elInner.setAttribute("data-original-id", "") ;

                                //for the anonymous subviews, remember all internal id to give access in EL (because there is no explicit view to access to them)
                                this.innerViewIds.push({
                                        id: elInner.id,
                                        el :el,
                                        listeners: {},
                                        addEventListener: function(event, listener){
                                                if(!this.listeners[event]){
                                                        this.listeners[event] = [] ;
                                                }
                                                this.listeners[event].push(listener) ;
                                        }
                                }) ;
                        }
                        if(!isAlreadyInSubView){
                                //we reference only the direct subview, subviews of subviews will be handled by the subview
                                this._addSubView(el) ;
                        }
                }

        };

        /**
         * Render data in the view
         * 
         * @param {object} [bindObject] - The data to render. If not given, it use the object given on init or on previous render
         * @param {function} [callback] - Called when render is done
         */
        VeloxWebView.prototype.render = function (bindObject, callback) {
                this.elements = null; //clear EL collection to force recompute as some sub element may change on render

                if (typeof (bindObject) === "function") {
                        callback = bindObject;
                        bindObject = undefined;
                }
                if (bindObject !== undefined) {
                        this.bindObject = bindObject;
                }
                if (!callback) {
                        callback = function () { };
                }
                if (!this.bindObject) { return callback(); }

                if (!this.boundElements) {
                        this.boundElements = [];

                        var elements = this.container.querySelectorAll('[data-bind]');
                        for (var i = 0; i < elements.length; i++) {
                                var el = elements[i];
                                var bindPath = el.getAttribute("data-bind");
                                if (!bindPath.replace(/\s/g, "").match(/\[\]$/)) {
                                        this.boundElements.push({
                                                el: el,
                                                bindPath: bindPath
                                        });
                                }
                        }
                }

                var baseData = this.bindObject;
                if (this.bindPath) {
                        baseData = pathExtract(this.bindObject, this.bindPath);
                }


                //set simple elements
                this.boundElements.forEach((function (boundEl) {
                        var el = boundEl.el;
                        var bindPath = boundEl.bindPath;
                        var bindData = pathExtract(baseData, bindPath);
                        
                        if (el.veloxSetValue){
                                el.veloxSetValue(bindData) ;
                        }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                                if (bindData === null || bindData === undefined) {
                                        bindData = "";
                                }
                                el.value = bindData;
                        } else {
                                if (bindData === null || bindData === undefined) {
                                        bindData = "";
                                }
                                el.innerHTML = bindData;
                        }

                        //dispatch bound event on this element
                        var event = document.createEvent('CustomEvent');
                        event.initCustomEvent('bound', false, true, {
                                value: bindData,
                                baseData: baseData,
                                bindPath: bindPath,
                                data: pathExtract(baseData, bindPath, true)
                        });
                        Object.keys(event.detail).forEach(function(k){
                                event[k] = event.detail[k] ;
                        });
                        el.dispatchEvent(event);
                }).bind(this));

                //dispatch bound event on container element
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('bound', false, true, {
                        value: this.getBoundObject(),
                        baseData: this.bindObject,
                        bindPath: this.bindPath,
                        data: pathExtract(this.bindObject, this.bindPath, true)
                });
                Object.keys(event.detail).forEach(function(k){
                        event[k] = event.detail[k] ;
                });
                this.container.dispatchEvent(event);

                //set sub views
                var calls = [];
                Object.keys(this.views).forEach((function (viewId) {
                        var view = this.views[viewId];
                        var el = view.el;
                        var bindPath = view.bindPath || "";
                        var shouldDisplay = true;
                        if(view.showIf){
                                var showIfData = pathExtract(baseData, view.showIf) ;
                                if(!showIfData || (Array.isArray(showIfData) && showIfData.length === 0)){
                                       shouldDisplay = false ; 
                                }
                        }
                        if(view.hideIf){
                                var hideIfData = pathExtract(baseData, view.hideIf) ;
                                shouldDisplay = false;
                                if(hideIfData) {
                                        if(!Array.isArray(hideIfData)){
                                               shouldDisplay = true ; 
                                        } else if(hideIfData.length>0){
                                                shouldDisplay = true ; 
                                        }
                                }
                        }

                        var removedInstance = [] ;
                        if(shouldDisplay){
                                var bindData = pathExtract(baseData, bindPath.replace(/\s/g, "").replace(/\[\]$/, ""));
                                if(!Array.isArray(bindData)){
                                        bindData = [bindData] ;
                                }
                                bindData.forEach((function (d, y) {
                                        if (!view.instances[y]) {
                                                //this instance does not exist yet, create it
                                                var v = new VeloxWebView(view.dir, view.file);
                                                view.instances[y] = v;
                                                if(view.html){ //anonymous subview
                                                        v.on("initDone", function(){
                                                                //propagate event listener from containing view to subview created elements
                                                                this.innerViewIds.forEach(function(innerViewId){
                                                                        if(v.ids[innerViewId.id]){ //the ids belong to this view
                                                                                Object.keys(innerViewId.listeners).forEach(function(event){
                                                                                        innerViewId.listeners[event].forEach(function(l){
                                                                                                v.EL[innerViewId.id].addEventListener(event, l) ;
                                                                                        }) ;
                                                                                }) ;  
                                                                        }
                                                                }) ;
                                                                //as it is an anonymous subview, the emitted event are propagated to this view
                                                                v.emit = function(event, data){
                                                                        this.emit(event, data) ;
                                                                }.bind(this) ;
                                                        }.bind(this)) ;
                                                        
                                                }
                                                calls.push((function (cb) {
                                                        v.init({
                                                                containerParent: el,
                                                                html: view.html,
                                                                css: view.html?"":undefined,
                                                                bindObject: this.bindObject,
                                                                bindPath: (this.bindPath ? this.bindPath + "." : "") + bindPath.replace(/\s/g, "").replace(/\[\]$/, "[" + y + "]")
                                                        }, cb);
                                                }).bind(this));
                                        } else {
                                                //this instance already exist, just reload data in it
                                                calls.push((function (cb) {
                                                        view.instances[y].render(cb);
                                                }).bind(this));
                                        }
                                }).bind(this));

                                
                                removedInstance = view.instances.splice(bindData.length);
                        }else{
                                //not displayed, remove all instance
                                removedInstance = view.instances.splice(0);
                        }

                        //delete removed elements
                        removedInstance.forEach((function (instance) {
                                el.removeChild(instance.container);
                        }).bind(this));
                }).bind(this));

                asyncSeries(calls, (function () {
                        this.emit("load");
                        callback();
                }).bind(this));
        };

        /**
         * Redo the render from the previously rendered object
         * 
         * This is an alias to render(callback)
         * 
         * @param {function} [callback] - Called when render is done
         */
        VeloxWebView.prototype.reload = function (callback) {
                this.render(callback);
        };

        /**
         * Update data object from value inputed in view
         * 
         * @param {object} [dataObject] - The data object to update. If not given the object used for render is updated
         */
        VeloxWebView.prototype.updateData = function (dataObject) {
                if (dataObject === undefined) {
                        dataObject = this.bindObject;
                }

                var baseData = dataObject;
                if (this.bindPath) {
                        baseData = pathExtract(dataObject, this.bindPath);
                }
                //set simple elements
                this.boundElements.forEach((function (boundEl) {
                        var el = boundEl.el;
                        var bindPath = boundEl.bindPath;
                        var value = undefined;
                        if (el.veloxGetValue){
                                value = el.veloxGetValue();
                        }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                                value = el.value;
                        }
                        if(value !== undefined){
                                pathSetValue(baseData, bindPath, value);
                        }
                        
                }).bind(this));

                //set sub views
                Object.keys(this.views).forEach((function (viewId) {
                        var view = this.views[viewId];
                        var viewData = pathExtract(baseData, view.bindPath.replace(/\s/g, "").replace(/\[\]$/, ""));
                        if (!viewData) {
                                viewData = [];
                                pathSetValue(baseData, view.bindPath.replace(/\s/g, "").replace(/\[\]$/, ""), viewData);
                        }
                        view.instances.forEach((function (instance) {
                                instance.updateData(dataObject);
                        }).bind(this));

                        viewData.splice(view.instances.length);
                }).bind(this));
        };

        /**
         * Init the auto emit on HTML elements
         * 
         * @private
         */
        VeloxWebView.prototype.initAutoEmit = function () {
                var emitters = Array.prototype.slice.call(this.container.querySelectorAll("[data-emit]"));
                if(this.container.hasAttribute("data-emit")){
                        emitters.push(this.container) ;
                }
                for (var i = 0; i < emitters.length; i++) {
                        (function (i) {
                                var el = emitters[i];
                                let event = el.getAttribute("data-emit");
                                if (!event) {
                                        event = "click";
                                }
                                el.addEventListener(event, (function () {
                                        var id = el.getAttribute("data-original-id");

                                        this.emit(id, {
                                                data: this.getBoundObject(),
                                                parentData: pathExtract(this.bindObject, this.bindPath, true),
                                                view: this
                                        });
                                }).bind(this));
                        }).bind(this)(i);
                }
        };

        /**
         * contains extensions
         */
        VeloxWebView.extensions = [];

        /**
         * Register extensions
         * 
         * extension object should have : 
         *  name : the name of the extension
         *  init : function that will be executed on view init. If async is needed the function should have a callback param.
         *  extendsProto : object containing function to add to VeloxWebView prototype
         *  extendsGlobal : object containing function to add to VeloxWebView global object
         * 
         * @param {object} extension - The extension to register
         */
        VeloxWebView.registerExtension = function (extension) {
                VeloxWebView.extensions.push(extension);

                if (extension.extendsProto) {
                        Object.keys(extension.extendsProto).forEach(function (key) {
                                VeloxWebView.prototype[key] = extension.extendsProto[key];
                        });
                }
                if (extension.extendsGlobal) {
                        Object.keys(extension.extendsGlobal).forEach(function (key) {
                                VeloxWebView[key] = extension.extendsGlobal[key];
                        });
                }
        };


        return VeloxWebView;
})));