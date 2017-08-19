; (function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            global.VeloxWebView = factory() ;
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
        if(typeof(window.crypto) !== "undefined" && crypto.getRandomValues){
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c) {
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        }) ;
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
     * Options are : 
     *   container : id or reference of HTML Element
     *   bindObject : object to bind with the view
     *   bindPath : bind path to apply to object to get values to use in the view
     *   containerParent : id or reference of parent HTML Element, if container is not given, a DIV will be added in containerParent
     *   staticHTML : use this HTML instead of fetch HTML file
     *   staticCSS : use this CSS instead of fetch CSS file
     * 
     * @constructor
     * 
     * @param {string} directory - The directory path of the view HTML file
     * @param {string} name - The name of the view HTML file (without extension)
     * @param {object} options - The name of the view HTML file (without extension)
     */
    function VeloxWebView(directory, name, options) {
        EventEmiter.call(this);

        this.options = options;
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
                var els = this.elements;
                var elFound = false;
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

        //add extension features
        VeloxWebView.extensions.forEach(function(extension){
            if (extension.extendsObj) {
                Object.keys(extension.extendsObj).forEach(function (key) {
                    this[key] = extension.extendsObj[key].bind(this) ;
                }.bind(this));
            }
        }.bind(this));

    }

    VeloxWebView.prototype = Object.create(EventEmiter.prototype);
    VeloxWebView.prototype.constructor = VeloxWebView;

    /**
     * Open the view
     * 
     * @param {function(Error)} [callback] - Called when init is done
     */
    VeloxWebView.prototype.open = function (data, callback) {
        if(typeof(data) === "function"){
            callback = data;
            data = null;
        }

        if(!callback){ callback = function(){}; }

        if (this.initDone) {
            //already init

            //check if the container is still around there
            if(this.container && document.documentElement.contains(this.container)){
                //OK the container is still here
                return callback();
            }else{
                //the container has been wipped out (probably a parent DOM element has been removed)
                //the view is in unstable state, it should have been closed with close() before being take out the DOM
                //but it is quite common to forget it if the view is inserted in some other view so just consider that
                //the view is closed and go to open it again
                this.container = null;
                this.close();
            }
            

        }

        
        this.container = this.options.container;
        this.bindObject = data || this.options.bindObject;
        this.bindPath = this.options.bindPath;
        this.containerParent = this.options.containerParent;
        this.staticHTML = this.options.html;
        this.staticCSS = this.options.css;

        if (!callback) { callback = function (err) { 
            
            if(err){ 
                console.error("Unexpected error", err) ;
                throw "Unexpected error "+err ; 
            }
        }; }

        
        


        this.loadCSS();

        this.getHTML((function (html) {
            this.ids = {};

            var htmlReplaced = html;

            var functionInView = null;
            var indexScript = htmlReplaced.toLowerCase().indexOf("<script") ;
            if(indexScript === 0){
                var indexBodyScript = htmlReplaced.indexOf(">", indexScript) ;
                var indexEndScript = htmlReplaced.toLowerCase().indexOf("</script>") ;
                if(indexEndScript === -1){
                    return callback("can't find closing </script> in view") ;
                }
                var scriptBody = htmlReplaced.substring(indexBodyScript+1, indexEndScript) ;
                
                scriptBody +=  "//# sourceURL=/"+this.directory+"/"+this.name+".js" ;

                functionInView = new Function("view", scriptBody) ;
                
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
            VeloxWebView.extensions.sort(function(e1, e2){
                //sort accordingly to mustRunBefore setting
                if(e1.mustRunBefore && e1.mustRunBefore.indexOf(e2.name) !== -1){
                    return -1;
                }else {
                    return 1 ;
                }
            }).forEach((function (extension) {
                if (extension.init) {
                    calls.push((function (cb) {
                        if (extension.init.length === 0) {
                            //no callback
                            try{
                                extension.init.bind(this)();
                                cb() ;
                            }catch(err){
                                cb(err) ;
                            }
                        } else {
                            extension.init.bind(this)(cb);
                        }
                    }).bind(this));
                }
            }).bind(this));

            asyncSeries(calls, (function (err) {
                if(err){ return callback(err) ;}

                if(functionInView){
                    functionInView(this) ;
                }
                this.initDone = true;
                this.emit("initDone");

                this.render((function (err) {
                    if(err){ return callback(err) ;}
                    this.show();      
                    callback();
                }).bind(this));
            }).bind(this));
        }).bind(this));
        return this;
    };

    /**
     * Hide the view in the DOM (display none)
     */
    VeloxWebView.prototype.hide = function(){
        this.container.style.display = "none";
        this.emit("hidden");      
    } ;
       
    /**
     * Show the view in the DOM (display empty)
     */
    VeloxWebView.prototype.show = function(){
        this.container.style.display = ""; 
        this.emit("displayed");      
    } ;

    /**
     * Get all elements of the view having an attribute
     * This will also return the container if it has the attribute
     * 
     * @param {string} attributeName the attribute name
     */
    VeloxWebView.prototype.elementsHavingAttribute = function(attributeName){
        var elements = Array.prototype.slice.apply(this.container.querySelectorAll('['+attributeName+']'));
        if(this.container.hasAttribute(attributeName)){//add the container himself if it has this attribute
            elements.push(this.container) ;
        }
        return elements;
    } ;



    VeloxWebView.prototype.close = function(){
        if(!this.options.container && this.options.containerParent && this.containerParent && this.container){
            this.containerParent.removeChild(this.container) ;
        }else if(this.container){
            this.container.innerHTML = "" ;
        }
        this.ids = null;
        this.views = {};
        this.elements = null;
        this.initDone = false;
        this.boundElements = null;
    } ;

    /**
     * Get the current bound object
     * 
     * @return {object} - The object bound to the view
     */
    VeloxWebView.prototype.getBoundObject = function () {
        return pathExtract(this.bindObject, this.bindPath);
    };


    VeloxWebView.prototype.pathExtract = function(obj, path, getParent) {
        return pathExtract(obj, path, getParent) ;
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
        if(this.staticCSS){
            this.loadStaticCss(this.staticCSS) ;
        }else if(this.name){
            this.loadCSSFile();
        }
    };

    VeloxWebView.prototype.loadStaticCss = function(css){
        if (!loadedCss[css]) {
            var head = document.getElementsByTagName('head')[0];
            var s = document.createElement('style');
            s.setAttribute('type', 'text/css');
            if (s.styleSheet) {   // IE
                s.styleSheet.cssText = css;
            } else {        // the world
                s.appendChild(document.createTextNode(css));
            }
            head.appendChild(s);
            loadedCss[css] = true;
        }
    } ;

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
                    var link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.type = "text/css";
                    link.href = cssUrl;
		
                    document.getElementsByTagName("head")[0].appendChild(link);
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
            var elementsSubViews = Array.prototype.slice.apply(el.querySelectorAll('[data-original-id]'));
            elementsSubViews.forEach(function(elInner, z){
                var elInner = elementsSubViews[z] ;
                elInner.id = elInner.getAttribute("data-original-id") ; 
                if(elInner.id){

                    elInner.setAttribute("data-original-id", "") ;
    
                    //for the anonymous subviews, remember all internal id to give access in EL (because there is no explicit view to access to them)
                    var fakeEl = {
                        id : elInner.id,
                        el: el,
                        listeners: {},
                        addEventListener: function(event, listener){
                            if(!this.listeners[event]){
                                this.listeners[event] = [] ;
                            }
                            this.listeners[event].push(listener) ;
                        }
                    } ;
                    //create decorator around element properties and function
                    Object.keys(Element.prototype).forEach(function(k){
                        if(Object.keys(fakeEl).indexOf(k) === -1){
                            if(typeof(elInner[k]) === "function"){
                                fakeEl[k] = function(){
                                    if(fakeEl.realEl){
                                        return fakeEl.realEl[k].apply(fakeEl.realEl, arguments) ;
                                    }
                                } ;
                            }else{
                                Object.defineProperty(fakeEl, k, {
                                    get: function(){
                                        if(fakeEl.realEl){ return fakeEl.realEl[k] ;}
                                        return null;
                                    },
                                    set : function(value){
                                        if(fakeEl.realEl){ fakeEl.realEl[k] = value ;}
                                    }
                                }) ;
                            }
                        }
                    }) ;
                    this.innerViewIds.push(fakeEl) ;
                }
            }.bind(this)) ;
            
            if(!isAlreadyInSubView){
                //we reference only the direct subview, subviews of subviews will be handled by the subview
                this._addSubView(el) ;
            }
        }

    };

    VeloxWebView.prototype._transformData = function (callback) {
        if(!this.options.transformData){
            return callback() ;
        }
        if(this.options.transformData.length === 1){
            try{
                var transformed = this.options.transformData(this.bindObject);
                if(!transformed){ return callback("The transformData function should return the modified value") ; }
                this.bindObject = transformed;
                callback() ;
            }catch(err){
                callback(err) ;
            }
        }else if(this.options.transformData.length === 1){
            this.options.transformData(this.bindObject, function(err, transformed){
                if(err){ return callback(err); }
                if(!transformed){ return callback("The transformData function should give back the modified value on callback (err, modifiedValue)") ; }
                this.bindObject = transformed ;
                callback() ;
            }) ;
        }else{
            callback("The transformData function should take argument (data) or (data, callback)") ;
        }
    } ;

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

        this._transformData(function(err){
            if(err){ return callback(err); }

            if (!this.boundElements) {
                this.boundElements = [];

                var elements = Array.prototype.slice.apply(this.container.querySelectorAll('[data-bind]'));
                if(this.container.hasAttribute("data-bind")){//add the container himself if it has data-bind attribute
                    elements.push(this.container) ;
                }
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
                
                if (el.setValue){
                    el.setValue(bindData) ;
                }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                    if(el.tagName === "INPUT" && el.type === "checkbox"){
                        el.checked = bindData === true || bindData === "true" || bindData === "TRUE" || bindData === 1 || bindData === "1" ;
                    }else{
                        if (bindData === null || bindData === undefined) {
                            bindData = "";
                        }
                        el.value = bindData;
                    }
                    
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
                    if(!hideIfData){
                        shouldDisplay = true; //no data should display
                    }else if(hideIfData && Array.isArray(hideIfData) && hideIfData.length === 0) {
                        shouldDisplay = true; //empty array, should display
                    }
                }

                var bindData = pathExtract(baseData, bindPath.replace(/\s/g, "").replace(/\[\]$/, ""));
                if(bindPath.length >0 && bindPath[bindPath.length - 1] === "]" && !bindData){
                    //array binding but array is null
                    shouldDisplay = false;
                }


                var removedInstance = [] ;
                if(shouldDisplay){
                    calls.push(function(cb){
                            this.renderOneView(viewId, bindData, cb) ;
                    }.bind(this)) ;
                }else{
                    //not displayed, remove all instance
                    removedInstance = view.instances.splice(0);
                    removedInstance.forEach((function (instance) {
                        el.removeChild(instance.container);
                    }).bind(this));
                }
            }).bind(this));

            asyncSeries(calls, (function () {
                this.emit("load");
                callback();
            }).bind(this));
        }.bind(this));  
    };


    VeloxWebView.prototype.renderOneView = function (viewId, bindData, callback) {
        var view = this.views[viewId];
        var el = view.el;
        if(!Array.isArray(bindData)){
            bindData = [bindData] ;
        }
        var calls = [];
        bindData.forEach((function (d, y) {
            if (!view.instances[y]) {
                //this instance does not exist yet, create it
                calls.push(function(cb){
                    this.addViewInstance(viewId, cb) ;
                }.bind(this)) ;
            } else {
                //this instance already exist, just reload data in it
                calls.push(function(cb){
                    if(view.instances[y].bindPath && view.instances[y].bindPath[view.instances[y].bindPath.length-1] === "]"){
                        //update bind path because the index in array may have change with user remove line in list auto
                        view.instances[y].bindPath = view.instances[y].bindPath.substring(0, view.instances[y].bindPath.lastIndexOf("[")+1)+y+"]" ;
                    }
                    view.instances[y].render(this.bindObject, cb) ;
                }.bind(this)) ;
            }
        }).bind(this));

        
        var removedInstance = view.instances.splice(bindData.length);
        
        //delete removed elements
        removedInstance.forEach((function (instance) {
            el.removeChild(instance.container);
        }).bind(this));
        asyncSeries(calls, (function () {
            callback();
        }).bind(this));
    } ;

    /**
     * Add a new instance of a sub view (usefull for list)
     * 
     * @param {string} viewId id of the sub view
     * @param {function} callback called when the view is created
     */
    VeloxWebView.prototype.removeViewInstance = function (viewId, index) {
        var view = this.views[viewId];
        var el = view.el;
        var removedInstance = view.instances.splice(index, 1);
        
        //delete removed elements
        removedInstance.forEach((function (instance) {
            el.removeChild(instance.container);
        }).bind(this));
        this.emit("viewInstanceRemoved", {viewId: viewId, index : index}) ;
    } ;
    /**
     * Add a new instance of a sub view (usefull for list)
     * 
     * @param {string} viewId id of the sub view
     * @param {function} callback called when the view is created
     */
    VeloxWebView.prototype.addViewInstance = function (viewId, callback) {
        var view = this.views[viewId];
        var el = view.el;
        var bindPath = view.bindPath || "";

        var v = new VeloxWebView(view.dir, view.file, {
            containerParent: el,
            html: view.html,
            css: view.html?"":undefined,
            bindObject: this.bindObject,
            bindPath: (this.bindPath ? this.bindPath + "." : "") + bindPath.replace(/\s/g, "").replace(/\[\]$/, "[" + view.instances.length + "]")
        });
        v.viewId = viewId;
        v.parentView = this ;
        view.instances.push(v);
        if(view.html){ //anonymous subview
            v.on("initDone", function(){
                //propagate event listener from containing view to subview created elements
                this.innerViewIds.forEach(function(innerViewId){
                    if(v.ids[innerViewId.id]){ //the ids belong to this view
                        innerViewId.realEl = v.EL[innerViewId.id] ;
                        Object.keys(innerViewId.listeners).forEach(function(event){
                            innerViewId.listeners[event].forEach(function(l){
                                v.EL[innerViewId.id].addEventListener(event, l) ;
                            }) ;
                        }) ;  
                    }
                }) ;
            }.bind(this)) ;
        }
        //the emitted event are propagated to this view
        var _emit = v.emit ;
        v.emit = function(event, data){
            _emit.bind(v)(event, data) ; //emit the event inside the view
            this.emit(event, data) ; //propagate on this view
        }.bind(this) ;
        v.open(function(err){
            if(err){return callback(err);}
            callback() ;
            this.emit("viewInstanceAdded", {viewId: viewId, index : view.instances.length-1}) ;
        }.bind(this)) ;
    } ;

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
            if (el.getValue){
                value = el.getValue();
            }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                if(el.tagName === "INPUT" && el.type === "checkbox"){
                    value = el.checked ;
                }else{
                    value = el.value;
                }
            }
            if(value !== undefined){
                pathSetValue(baseData, bindPath, value);
            }
            
        }).bind(this));

        //set sub views
        Object.keys(this.views).forEach((function (viewId) {
            this._updateDataFromView(viewId, baseData, dataObject) ;
        }).bind(this));
        return dataObject ;
    };

    /**
     * update the data from the sub view instances
     * 
     * @param {string} viewId the view id
     * @param {object} baseData the data of this view
     * @param {object} dataObject the global data object
     */
    VeloxWebView.prototype._updateDataFromView = function (viewId, baseData, dataObject) {
        var view = this.views[viewId];
        var viewBindPath =  view.bindPath;
        if(viewBindPath){
            viewBindPath = viewBindPath.replace(/\s/g, "").replace(/\[\]$/, "") ;
        }
        var viewData = pathExtract(baseData, viewBindPath);
        if (!viewData) {
            viewData = [];
            pathSetValue(baseData, viewBindPath, viewData);
        }
        
            
        view.instances.forEach((function (instance, i) {

            if(instance.bindPath[instance.bindPath.length-1] === "]"){
                //refresh the path index because it may have changed from user manual remove
                instance.bindPath = instance.bindPath.substring(0, instance.bindPath.lastIndexOf("[")+1)+i+"]" ;
                if(!viewData[i]){
                    //list object, add object for each instance
                    viewData[i] = {} ;
                }
            };
            instance.updateData(dataObject);
        }).bind(this));

        if(Array.isArray(viewData) && viewData.length>0){
            viewData.splice(view.instances.length);
        }
        return viewData ;
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
                var event = el.getAttribute("data-emit");
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
    
    VeloxWebView.prototype._asyncSeries = asyncSeries ;
    VeloxWebView._asyncSeries = asyncSeries ;
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