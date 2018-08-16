/*global define*/
; (function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            global.VeloxWebView = factory() ;
}(this, (function () { 'use strict';

    /**
     * Separator used in generated ID
     */
    var ID_SEP = "_-_";

    var HTMLELEMENT_PROTO_KEYS = [] ;
    if(typeof(Element)!=="undefined"){
        [Element.prototype, HTMLElement.prototype, HTMLInputElement.prototype].forEach(function(proto){
            Object.keys(proto).forEach(function(k){
                if(HTMLELEMENT_PROTO_KEYS.some(function(p){return p.prop === k ;})){ return ; }
                try{
                    if(typeof(proto[k]) === "function"){
                        HTMLELEMENT_PROTO_KEYS.push({prop : k, type: "function"}) ;
                    }else{
                        HTMLELEMENT_PROTO_KEYS.push({prop : k, type: "property"}) ;
                    }
                }catch(e){
                    HTMLELEMENT_PROTO_KEYS.push({prop : k, type: "property"}) ;
                }
            }) ;
        }) ;
    }
    HTMLELEMENT_PROTO_KEYS = HTMLELEMENT_PROTO_KEYS.concat([
        {prop : "setOptions", type: "function"}, {prop : "setValue", type: "function"}, {prop : "getValue", type: "function"}, 
        {prop : "setReadOnly", type: "function"}, {prop : "setRequired", type: "function"}, {prop : "setValueEnable", type: "function"}, 
        {prop : "getOptions", type: "function"}, {prop : "render", type: "function"}, {prop : "search", type: "function"}, 
    ]) ;

    /**
     * Dictionnary of all loaded CSS
     */
    var loadedCss = {};

    var parsedHTMLCache = {} ;

    var uuidBase = null;
    var uuidInc = 0;
    /**
     * Create an unique ID
     */
    function uuidv4() {
        if(!uuidBase){
            if(typeof(window.crypto) !== "undefined" && crypto.getRandomValues){
                uuidBase = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c) {
                    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) ;
                }) ;
            }else{
                uuidBase = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
        }
        return uuidBase+"-"+(uuidInc++) ;
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
        if(this.listeners[type].indexOf(listener) === -1){
            this.listeners[type].push(listener);
        }
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
        //recreate the array to make sure we don't affect anything if someone is looping in the array at the same time
        this.listeners[type] = listeners.filter(function(l){
            return l !== listener ;
        }) ;
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
    EventEmiter.prototype.emit = function (type, data, source) {
        var listeners = this.listeners[type];
        if (!listeners) {
            return;
        }
        for (var i = 0; i < listeners.length; i++) {
            var listener = listeners[i];
            listener({ type: type, data: data, source: source||this });
        }
    };

    function prepareEvalExpr(currentData, contextData){
        if(currentData){
            // prepare function arguments definition and value
            var argNames = [] ;
            var argValues = [] ;
            var dataKeys  = Object.keys(currentData);
            for(var i=0; i<dataKeys.length; i++){
                var k = dataKeys[i] ;
                argNames.push(k);
                argValues.push(currentData[k]);
            }
            dataKeys  = Object.keys(contextData);
            for(var i=0; i<dataKeys.length; i++){
                var k = dataKeys[i] ;
                argNames.push(k);
                argValues.push(contextData[k]);
            }

            return {
                names: argNames,
                values: argValues,
            } ;
        }
        return null;
    }

    var cacheExprs = {} ;

    function runEvalExpr(nameValues, expr){
        if(nameValues){
            var argNames = nameValues.names;
            var argValues = nameValues.values;

            /*
            we run in a loop to handle the undefined properties. consider the following example
            evalExpr({foo: true}, "foo && !bar") 
            we read !bar as !myObj.bar which usually return false
            but in the wrapping function this will throw a ReferenceError, so we loop to add them to the argument and retry
            */

            var funcKey = argNames.join("_")+expr ;
            var func = cacheExprs[funcKey] ;
            var i = 0;
            while(i<20){ //limit to 20 retry, somebody who use more than 20 not referenced variable is probably insane...
                i++;
                try{
                    if(!func){
                        func = new Function(argNames.join(","), "return "+expr) ;
                    }
                    var result = func.apply(null, argValues) ;
                    cacheExprs[funcKey] = func ;
                    return result ;
                }catch(e){
                    if(e.name === "ReferenceError" ){
                        //the expression use a variable name that is not in arguments name
                        
                        //add the variable to the argument list with undefined value
                        var varName = e.message.split(" ")[0].replace(/'/g, "") ;
                        argNames.push(varName);
                        argValues.push(undefined) ;
                        func = null;
                        funcKey = argNames.join("_")+expr ;
                        continue; //retry
                    }
                    //other case, log a console error as it likely to be a programmation error
                    console.error("Error while evaluing expr "+expr, e) ;
                    return false;
                }
            }
            console.error("More than 20 retry of "+expr+" there is something wrong in it !") ;
            return false;
        }
        return false;
    }



    // /**
    //  * This function evaluate an expression against a data object
    //  * 
    //  * @example
    //  * evalExpr({a: 1, b: 2}, {index: 1}, "a > 0 && b < 5") //return true
    //  * 
    //  * @param {object} currentData object data
    //  * @param {object} contextData object data
    //  * @param {string} expr expression to evaluate
    //  */
    // function evalExpr(currentData, contextData, expr){
    //     if(currentData){
    //         /*
    //         the expression will be run in a function receiving the object properties as argument
    //         for example : 
    //         evalExpr({a: 1, b: 2}, "a > 0 && b < 5") 
    //         will execute a function like this : 
    //         function(a, b){ return a > 0 && b < 5; }
    //         with arguments (1,2)
    //         */

    //         var nameValues = prepareEvalExpr(currentData, contextData) ;
    //         return runEvalExpr(nameValues, expr) ;
    //     } 
    //     return false;
    // }

    
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
        //console.log("extract path", path) ;
        if(!path){
            return obj ;
        }
        var pathArray = path ;
        if (!Array.isArray(path)) {
            pathArray = path.split(".").map(function(p){ return p.trim(); });
        }
        if(getParent){
            pathArray = pathArray.concat("$parent");
        }
        var objectPath = [];
        var dataObject = obj;
        var len = pathArray.length ;
        var ind=0;
        while (ind < len) {
            var p = pathArray[ind];

            if (dataObject) {
                if (p !== null && p !== undefined && p === "$parent"){
                    dataObject = objectPath.pop() ;
                    if(Array.isArray(dataObject)){
                        dataObject = objectPath.pop() ;
                    }
                }else if (p !== null && p !== undefined && p !== "$this") {
                    objectPath.push(dataObject);
                    dataObject = dataObject[p];
                }
            }
            ind++ ;
        }
        return dataObject;
    }

    function convertRelativeToAbsolutePath(base, relative) {
        var path = base.split("/").concat(relative.split("/")) ;
        var finalPath = [] ;
        for(var i=0; i<path.length; i++){
            var p = path[i] ;
            if(p === ".."){
                finalPath.pop() ;
            } else if(p !== "."){
                finalPath.push(p) ;
            }
        }
        return finalPath.join("/") ;
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
        
        var dataObject = obj;
        while (pathArray.length > 0) {
            //property name
            var p = pathArray.shift().trim();
            // var index = null;
            // if (p.indexOf("[") !== -1) {
            //     //has index
            //     index = parseInt(p.substring(p.indexOf("[") + 1, p.indexOf("]")).trim(), 10);
            //     p = p.substring(0, p.indexOf("[")).trim();
            // }

            if (dataObject) {
                if (pathArray.length === 0) {
                    //last part, set the value
                    // if (index !== null) {
                    //     if (p && p !== "this") {
                    //         if (!dataObject[p]) {
                    //             dataObject[p] = [];
                    //         }
                    //         dataObject = dataObject[p];
                    //     }
                    //     dataObject[index] = value;
                    // } else {
                        dataObject[p] = value;
                    // }
                } else {
                    //not last part, continue to dig
                    if (p && p !== "this") {
                        if (!dataObject[p]) {
                            // if (index !== null) {
                            //     dataObject[p] = [];
                            // } else {
                                dataObject[p] = {};
                            // }
                        }
                        dataObject = dataObject[p];
                    }
                    // if (dataObject && index !== null) {
                    //     if (!dataObject[index]) {
                    //         dataObject[index] = {};
                    //     }
                    //     dataObject = dataObject[index];
                    // }
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
        var len = calls.length;
        if (len === 0) {
            //nothing more to call
            return callback();
        }
        var call = calls[0];
        call(function (err) {
            if (err) { return callback(err); }

            if (len === 1) {
                //nothing more to call
                return callback();
            }

            // if(len > 20 && len % 20 === 0){
            //     //call setimmediate to avoid too much recursion
            //     // setTimeout(function(){
            //     //     asyncSeries(calls, ++index, callback);
            //     // }, 0) ;
            //     // setImmediate(function(){
            //     //     asyncSeries(calls, ++index, callback);
            //     // }) ;
            //     setImmediate(function(){
            //         asyncSeries(calls.slice(1), callback);
            //     }) ;
            // }else{
                asyncSeries(calls.slice(1), callback);
            // }
        });

    }

    function insertChild(parentElement, element, insertBefore, insertAfter){
        var nextElement = null;
        var previousElement = null;
        if(insertBefore /*|| insertAfter*/){
            var children = parentElement.children ;
            if(insertBefore){
                //must be inserted before another element in parent
                var afterChain = insertBefore ;
                if(!Array.isArray(afterChain)){
                    afterChain = [afterChain] ;
                }else{
                    var copy = [];
                    for ( var i=0;i<afterChain.length; i++ ) {copy[i] = afterChain[i];}
                    afterChain = copy ;
                }
                while(nextElement === null && afterChain.length>0){
                    var afterId = afterChain.shift() ;
                    for(var i=0; i<children.length; i++){
                        if(children[i].getAttribute("data-vieworder-id") === afterId){
                            nextElement = children[i];
                            break;
                        }
                    }
                }
            }
            if(insertAfter){
                //must be inserted after another element in parent
                if(typeof(insertAfter) === "string" || typeof(insertAfter[0]) === "string" ){
                    var beforeId = insertAfter.length === 1?insertAfter[0]:insertAfter ;
                    for(var i=children.length-1; i>=0; i--){
                        if(children[i].getAttribute("data-vieworder-id") === beforeId){
                            previousElement = children[i];
                            break;
                        }
                    }
                }else{
                    var beforeChain = insertAfter ;
    
                    if(!Array.isArray(beforeChain)){
                        beforeChain = [beforeChain] ;
                    }else{
                        var copy = [];
                        for ( var i=0;i<beforeChain.length; i++ ) {copy[i] = beforeChain[i];}
                        beforeChain = copy ;
                    }
                    while(previousElement === null && beforeChain.length>0){
                        var beforeId = beforeChain.shift() ;
                        for(var i=0; i<children.length; i++){
                            if(children[i].getAttribute("data-vieworder-id") === beforeId){
                                previousElement = children[i];
                                break;
                            }
                        }
                    }
                }
            }
        }
        if(nextElement){
            parentElement.insertBefore(element, nextElement);
        } else if(previousElement){
            parentElement.insertBefore(element, previousElement.nextSibling);
        }else{
            parentElement.appendChild(element);
        }
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

        if(directory && typeof(directory) === "object"){
            options = directory;
            directory=null;
            name = null;
        }

        this.uid = uuidv4() ;

        this.options = options || {};
        this.directory = directory;
        this.name = name;
        this.views = {};
        this.initDone = false;
        this.bindObject = null;
        this.bindPath = null;
        this.innerViewIds = [] ;
        this.waitCount = 0;
        this.EL = {} ;
        

        //add extension features
        for(var i=0; i<VeloxWebView.extensions.length; i++){
            var extension = VeloxWebView.extensions[i] ;
            if (extension.extendsObj) {
                var keys = Object.keys(extension.extendsObj) ;
                for(var y=0; y<keys.length; y++){
                    var key = keys[y] ;
                    this[key] = extension.extendsObj[key].bind(this) ;
                }
            }
        }

    }

    VeloxWebView.prototype = Object.create(EventEmiter.prototype);
    VeloxWebView.prototype.constructor = VeloxWebView;

    /**
     * Open the view
     * 
     * @param {function(Error)} [callback] - Called when init is done
     */
    VeloxWebView.prototype.open = function (data, pCallback) {
        if(typeof(data) === "function"){
            pCallback = data;
            data = null;
        }

        if (!pCallback) { 
            pCallback = function (err) { 
                if(err){ 
                    console.error("Unexpected error", err) ;
                    throw "Unexpected error "+err ; 
                }
            }; 
        }

        if(this.opening){
            //is already opening, callback when init is done and add a warning as it is probably not an expected situation
            console.warn("You are opening the view "+this.directory+" / "+this.name+" while it is already opening.") ;
            return this.once("openDone", function(){
                this.open(data, pCallback) ;
            }.bind(this)) ;
        }

        this.opening = true ;
        var callback = function(err){
            this.opening = false ;
            pCallback(err) ;
        }.bind(this) ;

        if (this.initDone) {
            //already init

            //check if the container is still around there
            if(this.container && document.documentElement.contains(this.container)){
                //OK the container is still here, just refresh data
                if(data){
                    this.bindObject = data;
                }
                this.render() ;
                return callback() ;
            }else{
                //the container has been wipped out (probably a parent DOM element has been removed)
                //the view is in unstable state, it should have been closed with close() before being take out the DOM
                //but it is quite common to forget it if the view is inserted in some other view so just consider that
                //the view is closed and go to open it again
                this.container = null;
                this.close();
            }
            

        }

        
        
        this.staticHTML = this.options.html;
        this.staticCSS = this.options.css;

        this.compileView((function viewCompiled(err, parsed){
            if(err){ throw err; }

            this.openCompiled(data, parsed) ;

            callback() ;
        }).bind(this));
        return this;
    };

    /**
     * Open the view
     * 
     * @param {function(Error)} [callback] - Called when init is done
     */
    VeloxWebView.prototype.openCompiled = function (data, parsed) {
        
        if(!parsed){
            var htmlEl = this.options.htmlEl;
            this.staticHTML = this.options.html;
            this.staticCSS = this.options.css;

            var key = this.directory + "/" + this.name;
            if(htmlEl){
                key = htmlEl.getAttribute("data-view-compile-id") ;
            }else if(this.staticHTML !== null && this.staticHTML !== undefined){
                key = this.staticHTML ;
            }
            
            parsed = parsedHTMLCache[key] ;
        }

        if(!parsed){ throw "try open compiled view but it is not compiled" ; }

        this.context = parsed.context ;

        this.container = this.options.container;
        this.bindObject = data || this.options.bindObject;

        this.bindPath = this.options.bindPath;
        if(!this.bindPath){
            this.bindPath = [] ;
        }else if(typeof(this.bindPath) === "string"){
            this.bindPath = this.bindPath.split(".").map(function(p){ return p.trim(); }) ;
        }
        this.containerParent = this.options.containerParent;
            
        this.prepareView(parsed);

        this.render() ;
        this.addToContainer(this.viewRootEl) ;
        this.show();      
        if(this.mustHide){
            this.hide(); //hide has been called while init running
            this.mustHide = false ;
        }
        this.opening = false ;

        this.container.setAttribute("data-viewname", this.directory+"/"+this.name) ;

        this.openDone = true ;
        this.emit("openDone", {view: this}, this, true);
        
        return;
    };

    VeloxWebView.prototype.compileView = function(callback){
        var htmlEl = this.options.htmlEl;
        this.staticHTML = this.options.html;
        this.staticCSS = this.options.css;

        var key = this.directory + "/" + this.name;
        if(htmlEl){
            key = htmlEl.getAttribute("data-view-compile-id") ;
            if(!key){
                key = uuidv4() ;
                htmlEl.setAttribute("data-view-compile-id", key) ;
            }
        }else if(this.staticHTML !== null && this.staticHTML !== undefined){
            key = this.staticHTML ;
        }
        
        var parsed = parsedHTMLCache[key] ;
        if(parsed && parsed.parseFinished){
            return callback(null, parsed) ;
        }else{
            this.getHTML(function (html) {
                this.parseHTML(html, function(err, parsed){
                    if(err){ throw err; }

                    parsedHTMLCache[key] = parsed;
                    parsed.context = {} ;

                    this._loadCSS(parsed.cssStatics, parsed.cssFiles, function(){
                        var calls = [];
                        
                        VeloxWebView.extensions.forEach((function (extension) {
                            if (extension.prepare) {
                                calls.push((function (cb) {
                                    if (extension.prepare.length === 0) {
                                        //no callback
                                        try{
                                            extension.prepare.bind(this)({doc : parsed.xmlDoc, context: parsed.context});
                                            cb() ;
                                        }catch(err){
                                            cb(err) ;
                                        }
                                    } else {
                                        setTimeout(function(){
                                            extension.prepare.bind(this)({doc: parsed.xmlDoc, context: parsed.context}, function(err){
                                                cb(err) ;
                                            }.bind(this));
                                        }.bind(this), 0) ;
                                    }
                                }).bind(this));
                            }
                        }).bind(this));

                        asyncSeries(calls, function(err){
                            if(err){ throw err; }
                            // parsed.childrenCount = parsed.xmlDoc.body.childNodes.length ;
                            parsed.childrenCount = 0 ;
                            for(var cn = 0; cn <parsed.xmlDoc.body.childNodes.length; cn++){
                                if(parsed.xmlDoc.body.childNodes[cn].nodeType !== Node.TEXT_NODE || parsed.xmlDoc.body.childNodes[cn].textContent.trim() !== ""){
                                        parsed.childrenCount++;
                                }
                            }
                            parsed.subviews = this.prepareSubViews(parsed.xmlDoc.body) ;
                            parsed.boundElements = this.computeBoundElements(parsed.xmlDoc) ;
                            parsed.ids = this.prepareIds(parsed.xmlDoc) ;
                           
                            
                            calls = [] ;
                            Object.keys(parsed.subviews).forEach((function (viewId) {
                                calls.push(function(cb){
                                    var view = parsed.subviews[viewId] ;
                                    var viewOptions = {
                                        containerParent: null,
                                        container: null,
                                        containerIsInside : null,
                                        insertBefore : null,
                                        insertAfter : null,
                                        file: view.file,
                                        htmlEl: view.file?null:view.el,
                                        html: view.html,
                                        css: view.html?"":undefined,
                                        bindObject: null,
                                        bindPath: []
                                    } ;
                                    
                                    var v = new VeloxWebView(view.dir, view.file, viewOptions);
                                    v.compileView(cb) ;
                                });
                            }));

                            asyncSeries(calls, function(err){
                                if(err){ throw err; }
                                parsed.parseFinished = true;
                                this.emit("compiled", parsed) ;
                                callback(null, parsed) ;
                            }.bind(this)) ;
                        }.bind(this)) ;
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }
    } ;

    VeloxWebView.prototype.prepareView = function(parsed){
        var functionInView = parsed.functionInView;
        var clonedBody = parsed.xmlDoc.body.cloneNode(true) ;

        this.replaceIds(clonedBody, parsed) ;
        
        this.prepareContainer(clonedBody, parsed) ;

        //clone the sub views definitions
        this.innerViewIds = [] ;
        this.views = {} ;
        var subViewsKeys = Object.keys(parsed.subviews) ;
        for(var i=0; i<subViewsKeys.length; i++){
            var k = subViewsKeys[i] ;
            var subViewDef = parsed.subviews[k] ;

            //search the parent element in current instance
            var idParent = subViewDef.elParent.getAttribute("data-vieworder-id") ;
            var parentInThisInstance = this.viewRootEl.querySelector('[data-vieworder-id="'+idParent+'"]') ;
            if(!parentInThisInstance) {// && (subViewDef.elParent.tagName === "BODY" || this.viewRootEl.getAttribute("data-vieworder-id") === idParent)){
                //parent is the view root
                parentInThisInstance = this.viewRootEl ;
            }
            
            this.views[k] = {
                elParent: parentInThisInstance,
                el: subViewDef.el,
                isBefore : subViewDef.isBefore,
                isAfter : subViewDef.isAfter,
                bindPath: subViewDef.bindPath,
                dir: subViewDef.dir,
                html: subViewDef.html,
                file: subViewDef.file,
                showIf: subViewDef.showIf,
                hideIf: subViewDef.hideIf,
                multiple: subViewDef.multiple,
                ids: subViewDef.ids,
                instances: []
            } ;
            this.prepareSubViewsSubElements(subViewDef) ;
        }

        //prepare the bound elements
        this.boundElements = [] ;
        for(var i=0; i<parsed.boundElements.length; i++){
            var boundEl = parsed.boundElements[i] ;
            var el = boundEl.el ;
            var idEl = el.getAttribute("data-vieworder-id") ;
            var elInThisInstance = this.viewRootEl.querySelector('[data-vieworder-id="'+idEl+'"]') ;
            if(!elInThisInstance){// && (el.tagName === "BODY" || this.viewRootEl.getAttribute("data-vieworder-id") === idEl)){
                //parent is the view root
                elInThisInstance = this.viewRootEl ;
            }

            var boundElCopy = {
                bindPath : boundEl.bindPath,
                boundAttributes: boundEl.boundAttributes,
                boundTextNodes: boundEl.boundTextNodes,
                isHTML : boundEl.isHTML,
                el: elInThisInstance
            } ;

            this.boundElements.push(boundElCopy) ;
        }

    
        for(var i=0; i<VeloxWebView.extensions.length; i++){
            var extension = VeloxWebView.extensions[i] ;
            if (extension.init) {
                extension.init.bind(this)();
            }
        }


        if(functionInView){
            functionInView(this) ;
        }

        this.initAutoEmit();

        this.initDone = true;
        this.emit("initDone", null, this, true);
    };

    
    VeloxWebView.prototype.prepareContainer = function(clonedBody, parsedHTML){
        if(parsedHTML.childrenCount === 1 && clonedBody.firstChild.nodeType !== Node.TEXT_NODE){
            //only 1 root element in view, use it as container
            this.viewRootEl = clonedBody.firstChild;
        }else{
            //many root element in the view, use the div as container
            var div = document.createElement("DIV");
            //div.innerHTML = htmlReplaced.trim();
            while(clonedBody.firstChild){
                div.appendChild(clonedBody.firstChild) ;
            }
            this.viewRootEl = div;
            this.viewRootElIsPacked = true; //flag to know that we created an artificial DIV arround the content of the view
        }
    };

    VeloxWebView.prototype.addToContainer = function(){
        if (typeof (this.container) === "string") {
            this.containerId = this.container;
            this.container = document.getElementById(this.container);
        }

        if (!this.container) {
            if (this.containerParent) {
                this.container = this.viewRootEl;
                
                if (this.containerId) {
                    this.container.id = this.containerId;
                }

                if (typeof (this.containerParent) === "string") {
                    this.containerParent = document.getElementById(this.containerParent);
                }
                insertChild(this.containerParent, this.container, this.options.insertBefore, this.options.insertAfter) ;
            } else {
                throw this.containerId + " is not found";
            }
        } else {
            // if(this.options.containerIsInside && this.container.id){
            //     //this container is considered to be inside the view
            //     //this is the case when we have a repeating view with external file, ex :
            //     //<div data-bind="foo[]" data-view="oneFoo" id="fooLine">
            //     //in this case the container can't be handled by parent view because it may happens 0 or many time
            //     //it must be handle by the sub view (we are here initializing this subview)
            //     this.container.setAttribute("data-original-id", this.container.id) ;
            //     var modifiedId = this.container.id+ID_SEP + uuidv4() ; ;
            //     this.ids[this.container.id] = modifiedId;
            //     this.container.id = modifiedId ;
            // }
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
            if(this.viewRootElIsPacked){
                //this view contains many sub element, add them
                while(this.viewRootEl.firstChild){
                    this.container.appendChild(this.viewRootEl.firstChild) ;
                }
                //update the root in subview parent element references
                var viewsKeys = Object.keys(this.views) ;
                for(var a=0; a<viewsKeys.length; a++){
                    var k = viewsKeys[a] ;
                    if(this.views[k].elParent === this.viewRootEl){
                        this.views[k].elParent = this.container ;
                    }
                }
                this.viewRootEl = this.container ;
            }else{
                this.container.appendChild(this.viewRootEl);
            }
        }
    };

    /**
     * Replace ids by view local ids (ensure unique)
     * 
     * @param {Element} bodyNode the body node of the HTML contents
     */
    VeloxWebView.prototype.replaceIds = function(bodyNode, parsed){
        this.ids = {};
        if(this.container && this.container.id && !this.container.hasAttribute("data-original-id")){
            //this container is considered to be inside the view
                //this is the case when we have a repeating view with external file, ex :
                //<div data-bind="foo[]" data-view="oneFoo" id="fooLine">
                //in this case the container can't be handled by parent view because it may happens 0 or many time
                //it must be handle by the sub view (we are here initializing this subview)
            this.changeId(this.container.id, this.container, bodyNode) ;
        }
        for(var i=0; i<parsed.ids.length; i++){
            var id = parsed.ids[i] ;
            var el = bodyNode.querySelector('[id="'+id+'"]') ;
            
            this.changeId(id, el, bodyNode) ;
        }
        
    };
    VeloxWebView.prototype.changeId = function(id, el, bodyNode){
        this.EL[id] = el ;
        var view = this;
        var elAddEventListener = el.addEventListener ;
        el.addEventListener = function(event, listener){
            if(typeof(listener) === "function"){ 
                elAddEventListener.call(el,event, function(ev){
                    ev.viewOfElement = view;
                    listener.bind(el)(ev) ;
                }) ;
            }else if(listener && listener.handleEvent){
                elAddEventListener.call(el,event, function(ev){
                    ev.viewOfElement = view;
                    listener.handleEvent.bind(listener)(ev) ;
                }) ;
            }
        } ;
        el.on = el.addEventListener ;

        var uuidEl = uuidv4();
        if (id[0] === "#") {
            //force keep this id
            id = id.substring(1);
            this.ids[id] = id;
            el.id = id ;
        } else {
            //add UUID
            var modifiedId = id + ID_SEP + uuidEl ;
            this.ids[id] = modifiedId;
            el.id = modifiedId ;
            el.setAttribute("data-original-id", id) ;
            this.updateIds(id, modifiedId, bodyNode);
        }
    } ;

    VeloxWebView.prototype.updateIds = function(id, modifiedId, bodyNode){
        //modify references
        var elTarget = bodyNode.querySelectorAll('[data-target="#'+id+'"]') ;
        for(var y=0; y<elTarget.length; y++){
            elTarget[y].setAttribute("data-target", "#"+modifiedId) ;
        }
        var elHref = bodyNode.querySelectorAll('[href="#'+id+'"]') ;
        for(var y=0; y<elHref.length; y++){
            elHref[y].setAttribute("href", "#"+modifiedId) ;
        }
        var elFor = bodyNode.querySelectorAll('[for="'+id+'"]') ;
        for(var y=0; y<elFor.length; y++){
            elFor[y].setAttribute("for", modifiedId) ;
        }
        var elFor = bodyNode.querySelectorAll('[data-keyboard-container="'+id+'"]') ;
        for(var y=0; y<elFor.length; y++){
            elFor[y].setAttribute("data-keyboard-container", modifiedId) ;
        }
    } ;

    /**
     * Replace relative path
     * 
     * @param {Element} bodyNode the body node of the HTML contents
     */
    VeloxWebView.prototype.replacePaths = function(bodyNode){
        var elImg = bodyNode.querySelectorAll("img") ;
        for(var i=0; i<elImg.length; i++){
            var el = elImg[i] ;
            var srcValue = el.getAttribute("src") ;
            if(!srcValue){
                //no src value, force empty image
                el.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=");
            }else if(srcValue && srcValue.indexOf("data:") !== 0){
                el.setAttribute("src", this.directory+"/"+srcValue);
            }
        }
    };

    /**
     * Hide the view in the DOM (display none)
     */
    VeloxWebView.prototype.hide = function(){
        if(this.container && this.initDone){
            this.container.style.display = "none";
            this.emit("hidden", null, this, true);      
        }else{
            //init not done, add a flag to hide when init will be done
            this.mustHide = true ;
        }
    } ;
       
    /**
     * Show the view in the DOM (display empty)
     */
    VeloxWebView.prototype.show = function(){
        if(this.container){
            if(this.container.style.display === "none"){
                this.container.style.display = ""; 
            }
            this.emit("displayed", {view : this}, this, true);      
        }
    } ;

    /**
     * Check if the view is displayed
     * 
     * @returns {boolean} true if the view is displayed
     */
    VeloxWebView.prototype.isDisplayed = function(){
        var isDisplayed = this.container && this.container.style && this.container.style.display !== "none" ;
        if(this.parentView){
            return isDisplayed && this.parentView.isDisplayed() ;
        }
        return isDisplayed ;
    } ;

    /**
     * Ensure the view is displayed
     * 
     */
    VeloxWebView.prototype.ensureDisplayed = function(callback){
        if(this.isDisplayed()){
            return callback() ;
        }
        this.on("displayed", function(){
            if(this.parentView){
                return this.parentView.ensureDisplayed(callback) ;
            }
            callback() ;
        }.bind(this)) ;
    } ;

    /**
     * Get all elements of the view having an attribute
     * This will also return the container if it has the attribute
     * 
     * @param {string} attributeName the attribute name
     * @param {boolean} withIgnore return the element contains in ignore blocks
     */
    VeloxWebView.prototype.elementsHavingAttribute = function(attributeName, withIgnore){
        var elements = [];
        var foundEls = this.viewRootEl.querySelectorAll('['+attributeName+']');
        for ( var i=0;i<foundEls.length; i++ ) {elements[i] = foundEls[i];}
        if(this.viewRootEl.hasAttribute(attributeName)){//add the container himself if it has this attribute
            elements.push(this.viewRootEl) ;
        }
        if(elements.length>0){
            //remove the elements contained in data-dont-process block
            var blockToIgnore = this.viewRootEl.querySelectorAll('[data-dont-process]');
            
            if(blockToIgnore.length>0){
                elements = elements.filter(function(el){
                    var toIgnore = false ;
                    for(var y=0; y<blockToIgnore.length; y++){
                        var bl = blockToIgnore[y] ;
                        if (bl === el || bl.contains(el)) {
                            toIgnore = true ;
                            break;
                        }
                    }
                    return !toIgnore ;
                }) ;
            }
        }
        return elements;
    } ;



    VeloxWebView.prototype.close = function(){
        this.emit("close",null, this, true);   
        if(!this.options.container && this.options.containerParent && this.containerParent && this.container){
            this.containerParent.removeChild(this.container) ;
        }else if(this.container && this.container.innerHTML){
            this.container.innerHTML = "" ;
        }
        this.ids = null;
        this.views = {};
        this.elements = null;
        this.initDone = false;
        this.boundElements = null;
        this.listeners = {};
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
    VeloxWebView.pathExtract = function(obj, path, getParent) {
        return pathExtract(obj, path, getParent) ;
    };

    /**
     * Get HTML file through XHR
     * @private
     * 
     * @param {function(html)} callback - Called with HTML contents when fetched
     */
    VeloxWebView.prototype.getHTML = function (callback) {
        if(this.options.htmlEl){
            callback(this.options.htmlEl);
        }else if (this.staticHTML !== null && this.staticHTML !== undefined) {
            callback(this.staticHTML);
        } else {
            var htmlUrl = this.directory + "/" + this.name + ".html";
            
            this.getXHR(htmlUrl, callback) ;
        }
    };

    VeloxWebView.prototype.getXHR = function (url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = (function () {
            if (xhr.status === 200) {
                callback.bind(this)(xhr.responseText);
            } else {
                callback.bind(this)('Request to ' + url + ' failed.  Returned status of ' + xhr.status);
            }
        }).bind(this);
        xhr.send();
    } ;
    
    VeloxWebView.prototype.prepareIds = function (xmlDoc) {
        var ids = [] ;
        var elIds = xmlDoc.querySelectorAll("[id]") ;
        for(var i=0; i<elIds.length; i++){
            ids.push(elIds[i].id) ;
        }

        this.replacePaths(xmlDoc.body) ;
        return ids;
    } ;

    /**
     * Compute the bound elements
     */
    VeloxWebView.prototype.computeBoundElements = function (xmlDoc) {
        var boundElements = [];
        var allElements = [];
        var foundEls = xmlDoc.body.querySelectorAll("*");
        for ( var i=0;i<foundEls.length; i++ ) {allElements[i] = foundEls[i];}
        for(var z=0; z<allElements.length; z++){
            var el = allElements[z] ;
            var bindPath = el.getAttribute("data-bind");
            var bindEl = {el: el} ;
            var isContainerOfNestedView = false;
            if(el === xmlDoc){
                if(el.getAttribute("data-view")){
                    isContainerOfNestedView = true;
                } else if(el.children.length > 0) {
                    isContainerOfNestedView = true;
                }
            }
            if(
                !isContainerOfNestedView &&
                bindPath && !bindPath.replace(/\s/g, "").match(/\[\]$/)) {
                if(bindPath.indexOf("html:") === 0){
                    bindPath = bindPath.substring("html:".length) ;
                    bindEl.isHTML = true ;
                }
                bindEl.bindPath = bindPath.split(".").map(function(p){ return p.trim(); });
            }
            var attributes = el.attributes ;
            var boundAttributes = {} ;
            var hasBoundAttribute = false ;
            for(var i=0; i<attributes.length; i++){
                if(attributes[i].value.indexOf("${") !== -1 && attributes[i].value.indexOf("}") !== -1){
                    boundAttributes[attributes[i].name] = attributes[i].value ;
                    hasBoundAttribute = true ;
                }
            }
            if(hasBoundAttribute){
                bindEl.boundAttributes = boundAttributes;
            }

            var textNodes = [];
            for ( var i=0;i<el.childNodes.length; i++ ) {
                if(el.childNodes[i].nodeType === Node.TEXT_NODE){
                    textNodes.push(el.childNodes[i]);
                }
            }

            var boundTextNodes = {} ;
            var hasBoundTextNodes = false ;
            for(var i=0; i<textNodes.length; i++){
                if(textNodes[i].textContent.indexOf("${") !== -1 && textNodes[i].textContent.indexOf("}") !== -1){
                    boundTextNodes[i] = textNodes[i].textContent ;
                    hasBoundTextNodes = true ;
                }
            }
            if(hasBoundTextNodes){
                bindEl.boundTextNodes = boundTextNodes;
            }


            if(bindEl.bindPath || bindEl.boundAttributes || bindEl.boundTextNodes){
                if(!bindEl.el.hasAttribute("data-vieworder-id")){
                    bindEl.el.setAttribute("data-vieworder-id", "v_"+uuidv4()) ;
                }
                boundElements.push(bindEl);
            }
        } ;
        return boundElements ;
    } ;

    /**
     * Extract the CSS/SCRIPT and HTML part from view HTML source
     * 
     * @param {sting} html the HTML of the view
     */
    VeloxWebView.prototype.parseHTML = function (htmlOfView, callback) {
        var parsed = null;
        var html = htmlOfView; //.replace(/data-original-id=['"]{1}[^'"]*['"]{1}/g, "") ; //remove any original id
        
        var cssStatics = [] ;
        if(this.staticCSS){
            cssStatics.push(this.staticCSS) ;
        }
        var cssFiles = [];
        var functionInView = null;
        var calls = [] ;

        var xmlDoc;
        if(htmlOfView instanceof HTMLElement){
            //it is aleady an HTMLElement
            xmlDoc = document.createDocumentFragment();
            xmlDoc.appendChild(htmlOfView) ;
            xmlDoc.head = { children: []} ;
            xmlDoc.body = xmlDoc ;
            // {
            //     head: 
            //     body: htmlOfView,
            //     document: htmlOfView
            // } ;
        }else{
            var parser = new DOMParser();
            xmlDoc = parser.parseFromString(html,"text/html");
        }
        if(xmlDoc.head.children.length>0){
            var child = xmlDoc.head.children[0] ;
            var scriptIndex = 0;
            while(child && (child.tagName === "SCRIPT" || child.tagName === "STYLE")){

                if(child.tagName === "SCRIPT"){
                    if(child.hasAttribute("data-file")){
                        (function(child){
                            var jsPath = child.getAttribute("data-file") ;
                            calls.push(function(cb){
                                var jsUrl = this.directory + "/" + jsPath;
                                this.getXHR(jsUrl, function(contents){
                                    var scriptBody = contents ;
                                    scriptBody +=  "\n//# sourceURL=/"+this.directory+"/"+jsPath ;
                                    functionInView = new Function("view", scriptBody) ;
                                    scriptIndex++;
                                    cb() ;
                                }) ;
                            }.bind(this)) ;
                        }).bind(this)(child) ;
                    }else{
                        var scriptBody = child.innerHTML ;
                        
                        scriptBody +=  "\n//# sourceURL=/"+this.directory+"/"+this.name+(scriptIndex>0?"_"+scriptIndex:"")+".js" ;
        
                        functionInView = new Function("view", scriptBody) ;
                        scriptIndex++;
                    }
                }else if(child.tagName === "STYLE"){
                    if(child.hasAttribute("data-file")){
                        cssFiles.push(child.getAttribute("data-file")) ;
                    }else{
                        cssStatics.push(child.innerHTML) ;
                    }
                }

                child = child.nextElementSibling ;
            }
        }

        //html = xmlDoc.body.innerHTML ;

        asyncSeries(calls,  function(err){
            if(err){
                return callback(err) ;
            }
            parsed = {
                xmlDoc :xmlDoc,
                //html: html,
                cssStatics: cssStatics,
                cssFiles: cssFiles,
                functionInView: functionInView,
            } ;
            callback(null, parsed) ;
        }.bind(this)) ;
    };


    VeloxWebView.loadStaticCss = function(css){
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
    VeloxWebView.prototype.loadStaticCss = VeloxWebView.loadStaticCss ;

    VeloxWebView.prototype._loadCSS = function (cssStrings, cssFiles, callback) {
        var calls = [] ;
        for(var i=0; i<cssStrings.length; i++){
            this.loadStaticCss(cssStrings[i]) ;
        }
        cssFiles.forEach(function(cssFile){
            calls.push(function(cb){
                this.loadCSSFile(cssFile, cb);
            }.bind(this)) ;
        }.bind(this)) ;
        asyncSeries(calls, callback) ;
    } ;


    /**
     * Load CSS from file
     * @private
     */
    VeloxWebView.prototype.loadCSSFile = function (file, callback) {
        var cssUrl = convertRelativeToAbsolutePath(this.directory , file);
        if (!loadedCss[cssUrl]) {
            
            //we must do an XHR to handle error case
            var xhr = new XMLHttpRequest();
            xhr.open('GET', cssUrl);
            xhr.onreadystatechange = (function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if(xhr.status !== 404){
                        //TODO : check if it is better to put in a <style> element
                        var link = document.createElement("link");
                        link.rel = "stylesheet";
                        link.type = "text/css";
                        link.href = cssUrl;
    
                        link.addEventListener('load', function() {
                            callback();
                        }, false);
    
                        document.getElementsByTagName("head")[0].appendChild(link);
                    }else{
                        callback() ;
                    }
                }
            }).bind(this);
            xhr.onabort = function(){
                callback() ;
            } ;
            xhr.onerror = function(){
                callback() ;
            } ;
            xhr.send();
            //$('head').append('<link rel="stylesheet" href="'+cssUrl+'" type="text/css" />');
            loadedCss[cssUrl] = true;
        }else{
            callback() ;
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
    
    /**
     * Make sure the view is open
     * 
     * @param {function} callback - Called when the open is done (or immediatly if already done)
     */
    VeloxWebView.prototype.ensureOpen = function (callback) {
        if (this.openDone && this.container) {
            callback();
        } else {
            this.once("openDone", callback);
        }
    };


    VeloxWebView.prototype.prepareSubViews = function (bodyEl) {
        
        var elementsSubs = [], i, els;
        
        els = bodyEl.querySelectorAll("[data-show-if]") ;
        for(i=0; i<els.length; i++){ elementsSubs.push(els[i]) ; }
        els = bodyEl.querySelectorAll("[data-hide-if]") ;
        for(i=0; i<els.length; i++){ elementsSubs.push(els[i]) ; }
        els = bodyEl.querySelectorAll("[data-bind]") ;
        for(i=0; i<els.length; i++){ 
            if(/\[\]$/.test(els[i].getAttribute("data-bind").replace(/\s/g, ""))){
                elementsSubs.push(els[i]) ; 
            }
        }
        els = bodyEl.querySelectorAll("[data-view]") ;
        for(i=0; i<els.length; i++){ 
            if(bodyEl instanceof DocumentFragment && bodyEl.children[0] === els[i]){
                //ignore this one because it is the first element of a sub view, it is the data-view of itself
            }else{
                elementsSubs.push(els[i]) ; 
            }
        }

        if(elementsSubs.length>0){
            //remove the elements contained in data-dont-process block
            var blockToIgnore = bodyEl.querySelectorAll("[data-dont-process]") ;;
            if(blockToIgnore.length>0){
                elementsSubs = elementsSubs.filter(function(el){
                    var toIgnore = false ;
                    for(var y=0; y<blockToIgnore.length; y++){
                        var bl = blockToIgnore[y] ;
                        if (bl === el || bl.contains(el)) {
                            toIgnore = true ;
                            break;
                        }
                    }
                    return !toIgnore ;
                }) ;
            }
        }

        elementsSubs = elementsSubs.filter(function(el, y){
            return !elementsSubs.some(function(otherEl, i){
                return  (i > y && otherEl === el) || //duplicated
                        (y !== i && otherEl !== el && otherEl.contains(el)) ; //contained by another element, will be handled by subview
            }) ;
        }) ;

        //do a first loop to prepare the order ids. Because containers of conditinal subviews
        //are removed from DOM, we must add id to all elements and remember the positions
        //of each others. This loop initialize order ids before creating view definition
        //to be sure that we have id on all when get HTML of views
        for(var i=0; i<elementsSubs.length; i++){
            var el = elementsSubs[i] ;
            var nextElementInParent = el.nextElementSibling ;
            while(nextElementInParent){
                if(!nextElementInParent.hasAttribute("data-vieworder-id")){
                    nextElementInParent.setAttribute("data-vieworder-id", "v_"+uuidv4()) ;
                }
                nextElementInParent = nextElementInParent.nextElementSibling ;
            }
            var previousElementInParent = el.previousElementSibling ;
            while(previousElementInParent){
                if(!previousElementInParent.hasAttribute("data-vieworder-id")){
                    previousElementInParent.setAttribute("data-vieworder-id", "v_"+uuidv4()) ;
                }
                previousElementInParent = previousElementInParent.previousElementSibling ;
            }
        }

        var subViews = {} ;
        for(var i=0; i<elementsSubs.length; i++){
            var el = elementsSubs[i] ;
            var elClone = el.cloneNode(true) ;
            
            var viewId = el.getAttribute("data-view-id");
            if (!viewId) {
                viewId = el.id; 
                if (!viewId) {
                    viewId = "v_"+uuidv4();
                }
                el.setAttribute("data-view-id", viewId);
            }
            var nextElementInParent = el.nextElementSibling ;
            var nextElementIds = [];
            while(nextElementInParent){
                if(!nextElementInParent.hasAttribute("data-vieworder-id")){
                    nextElementInParent.setAttribute("data-vieworder-id", "v_"+uuidv4()) ;
                }
                nextElementIds.push(nextElementInParent.getAttribute("data-vieworder-id")) ;
                nextElementInParent = nextElementInParent.nextElementSibling ;
            }
            var previousElementInParent = el.previousElementSibling ;
            var previousElementIds = [];
            while(previousElementInParent){
                if(!previousElementInParent.hasAttribute("data-vieworder-id")){
                    previousElementInParent.setAttribute("data-vieworder-id", "v_"+uuidv4()) ;
                }
                previousElementIds.push(previousElementInParent.getAttribute("data-vieworder-id")) ;
                previousElementInParent = previousElementInParent.previousElementSibling ;
            }
            if (!subViews[viewId]) {
                var viewAttr = el.getAttribute("data-view");
                var bindAttr = el.getAttribute("data-bind");
                var showIfAttr = el.getAttribute("data-show-if");
                var hideIfAttr = el.getAttribute("data-hide-if");
                if(el.parentElement && !el.parentElement.hasAttribute("data-vieworder-id")){
                    el.parentElement.setAttribute("data-vieworder-id", "v_"+uuidv4()) ;
                }
                var ids = [];
                var elIds = el.querySelectorAll('[id]');
                for(var y=0; y<elIds.length; y++){
                    ids.push(elIds[y].id) ;
                }
                var dir = this.directory ;
                if(viewAttr){
                    var lastSlash = viewAttr.lastIndexOf("/") ;
                    var file = viewAttr ;
                    if(lastSlash !== -1){
                        dir = viewAttr.substring(0, lastSlash) ;
                        file= viewAttr.substring(lastSlash+1) ;
                    }
                    var isMultiple = false ;
                    if(bindAttr && /\[\]$/.test(bindAttr)){
                        isMultiple = true ;
                    }
                    if(showIfAttr){
                        elClone.removeAttribute("data-show-if");
                    }
                    if(hideIfAttr){
                        elClone.removeAttribute("data-hide-if");
                    }
                    
                    var isMultiple = false ;
                    if(bindAttr && /\[\]$/.test(bindAttr)){
                        isMultiple = true ;
                        elClone.removeAttribute("data-bind");
                    }
                    subViews[viewId] = {
                        elParent: el.parentElement,
                        el: elClone,
                        isBefore : nextElementIds.length>0?nextElementIds:null,
                        isAfter : previousElementIds.length>0?previousElementIds:null,
                        bindPath: bindAttr?bindAttr.split(".").map(function(p){ return p.trim(); }):[],
                        dir: dir,
                        file: file,
                        showIf: showIfAttr,
                        hideIf: hideIfAttr,
                        multiple: isMultiple,
                        ids:ids,
                        instances: []
                    };
                }else{
                    if(showIfAttr){
                        elClone.removeAttribute("data-show-if");
                    }
                    if(hideIfAttr){
                        elClone.removeAttribute("data-hide-if");
                    }
                    var isMultiple = false ;
                    if(bindAttr && /\[\]$/.test(bindAttr)){
                        isMultiple = true ;
                        elClone.removeAttribute("data-bind");
                    }
                    if(el.id){ids.push(el.id) ;}
                    subViews[viewId] = {
                        elParent: el.parentElement,
                        el: elClone,
                        isBefore :  nextElementIds.length>0?nextElementIds:null,
                        isAfter : previousElementIds.length>0?previousElementIds:null,
                        bindPath: bindAttr?bindAttr.split(".").map(function(p){ return p.trim(); }):[],
                        dir: dir,
                        html: elClone.outerHTML,
                        multiple: isMultiple,
                        showIf: showIfAttr,
                        hideIf: hideIfAttr,
                        ids:ids,
                        instances: []
                    };
                } 
            }
        }
        
        //remove from parent (should be done in a separate loop to avoid loosing order relations between elements)
        for(var i=0; i<elementsSubs.length; i++){
            var el = elementsSubs[i] ;
            if(el.parentElement){
                el.parentElement.removeChild(el) ;
            }
        }


        return subViews ;
    } ;

    VeloxWebView.prototype.prepareSubViewsSubElements = function (viewDef) {

        viewDef.ids.forEach(function(id){
            var fakeEl = {
                id : id,
                //el: el,
                listeners: {},
                addEventListener: function(event, listener){
                    if(!this.listeners[event]){
                        this.listeners[event] = [] ;
                    }
                    this.listeners[event].push(listener) ;
                },
                realEls: [],
                isFake: true
            } ;
            //create decorator around element properties and function
            var fakeElKeys = Object.keys(fakeEl) ;
            HTMLELEMENT_PROTO_KEYS.forEach(function(k){
                if(fakeElKeys.indexOf(k.prop) === -1){
                    if(k.type === "function"){
                        fakeEl[k.prop] = function(){
                            var results = [] ;
                            for(var e=0; e<fakeEl.realEls.length; e++){
                                results.push(fakeEl.realEls[e][k.prop].apply(fakeEl.realEls[e], arguments)) ;
                            }
                            if(results.length === 0){
                                return null;
                            }else if(results.length === 1){
                                return results[0] ;
                            }
                            return results ;
                        } ;
                    }else{
                        Object.defineProperty(fakeEl, k.prop, {
                            get: function(){
                                var results = [] ;
                                for(var e=0; e<fakeEl.realEls.length; e++){
                                    results.push(fakeEl.realEls[e][k.prop]) ;
                                }
                                if(results.length === 0){
                                    return null;
                                }else if(results.length === 1){
                                    return results[0] ;
                                }
                                return results ;
                            },
                            set : function(value){
                                for(var e=0; e<fakeEl.realEls.length; e++){
                                    fakeEl.realEls[e][k.prop] = value ;
                                }
                            }
                        }) ;
                    }
                }
            }) ;
            this.innerViewIds.push(fakeEl) ;
            this.EL[id] = fakeEl;
        }.bind(this));
    } ;
    
    VeloxWebView.prototype.getElement = function(el){
        if(el.realEls.length>0){ return el.realEls[0] ;}
        return el ;
    } ;

    /**
     * Get the subview instance
     * 
     * @param {string} idSubView id of the subview (set by id attribute in HTML)
     */
    VeloxWebView.prototype.getSubView = function(idSubView){
        if(!this.views[idSubView]){ throw "The subview "+idSubView+" does not exists in view "+this.name+", make sure you add an id attribute on the containing element"; }
        return this.views[idSubView].instances[0] ;
    } ;

    /**
     * Render data in the view
     * 
     * @param {object} [dataToRender] - The data to render. If not given, it use the object given on init or on previous render
     * @param {function} [callback] - Called when render is done
     */
    VeloxWebView.prototype.render = function (dataToRender) {
        if (dataToRender !== undefined) {
            if(this.bindPath && this.bindPath.length > 0){
                //FIXME : handle extractor cache
                pathSetValue(this.bindObject, this.bindPath, dataToRender) ;
            }else{
                this.bindObject = dataToRender;
            }
        }

        if (!this.initDone) {
            this.once("initDone", function(){
                this.render() ;
            }.bind(this));
            return;
        }

        this.elements = null; //clear EL collection to force recompute as some sub element may change on render
        
        if(this.rendering){
            //render is not re-entrant. try to render when you are already rendering
            //is likely to be loop due to some change event listener
            return ;
        }

        

        this.rendering = true ;
        var callback = function(){
            this.rendering = false ;
        }.bind(this) ;
        

        if (!this.bindObject) { return callback(); }




        var baseData = this.bindObject;
        var parentData = null;
        if (this.bindPath && this.bindPath.length > 0) {
            baseData = pathExtract(this.bindObject, this.bindPath);
            parentData = pathExtract(this.bindObject, this.bindPath, true);
        }

        this.emit("beforeRender",baseData, this, true);

        var exprNameValues = prepareEvalExpr(baseData, {
            index: this.indexMultiple, 
            $index: this.indexMultiple, 
            view: this, 
            $view: this, 
            $parent: parentData, 
            $root: this.bindObject,
            $previous: function(){
                if(this.indexMultiple && this.indexMultiple > 0){
                    var previousData = pathExtract(this.bindObject, this.bindPath.slice(0,this.bindPath.length-1).concat([this.indexMultiple-1]));
                    return previousData ;
                }
                return  null;
            }.bind(this)
        }) ;

        //set simple elements
        for(var i=0; i<this.boundElements.length; i++){
            var boundEl = this.boundElements[i] ;
            var el = boundEl.el;

            if(boundEl.boundAttributes){
                var boundAttributesKeys = Object.keys(boundEl.boundAttributes) ;
                for(var y=0; y<boundAttributesKeys.length; y++){
                    var name = boundAttributesKeys[y] ;
                    var originalValue = boundEl.boundAttributes[name] ;
                    var value = originalValue ;
                    while(value.indexOf("${") !== -1){
                        var indexStart = value.indexOf("${") ;
                        var indexEnd = value.indexOf("}") ;
                        if(indexEnd < indexStart){ 
                            console.error("Wrong syntax in "+originalValue) ;
                            break;
                        }
                        var expr = value.substring(indexStart+2, indexEnd) ;
                        var exprValue = runEvalExpr(exprNameValues, expr) ;
                        value = value.substring(0, indexStart)+exprValue+value.substring(indexEnd+1) ;
                    }
                    if(name.indexOf("attr-") === 0){
                        name = name.substring(name.indexOf("-")+1) ;
                    }
                    if(value === "$removeAttr"){
                        boundEl.el.removeAttribute(name) ;
                    }else{
                        if(boundEl.el.getAttribute(name) != value){
                            boundEl.el.setAttribute(name, value) ;
                        }
                    }
                } ;
            }


            var bindPath = boundEl.bindPath;
            if(bindPath){
                var fullBindPath = (this.bindPath||["$this"]).concat(bindPath) ;
                if(el === this.container){
                    //the container is bound, so its data is not inside is path
                    fullBindPath = this.bindPath ;
                }
                var bindData = pathExtract(this.bindObject, fullBindPath);
                
                if (el.setValue){
                    var currentValue = el.getValue();
                    currentValue = currentValue !== null && currentValue !== undefined?currentValue.valueOf():null;
                    var newValue = bindData;
                    newValue = newValue !== null && newValue !== undefined?newValue.valueOf():null;
                    if(currentValue != newValue || Array.isArray(newValue)){
                        el.setValue(bindData) ;
                    }
                }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                    if(el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")){
                        var checked = bindData === true || bindData === "true" || bindData === "TRUE" || bindData === 1 || bindData === "1" ;
                        if(el.checked !== checked){
                            el.checked = checked ;
                        }
                    }else{
                        if (bindData === null || bindData === undefined) {
                            bindData = "";
                        }
                        if(el.value != bindData){
                            el.value = bindData;
                        }
                    }
                }else if (el.tagName === "IMG") {  
                    if(bindData){
                        var src = bindData ;
                        if(el.hasAttribute("data-src-pattern")){
                            src = el.getAttribute("data-src-pattern").replace("__data__", bindData) ;
                        }
                        el.src = src ;
                    }else{
                        el.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                    }
                }else if (el.tagName === "OBJECT") {  
                    if(bindData){
                        var src = bindData ;
                        if(el.hasAttribute("data-src-pattern")){
                            src = el.getAttribute("data-src-pattern").replace("__data__", bindData) ;
                        }
                        el.data = src ;
                    }else{
                        el.data = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                    }
                } else {
                    bindData = this.format(bindData) ;
                    if(el.tagName === "IFRAME"){
                        if(!el.contentWindow){
                            (function(bindData){
                                el.addEventListener("load", function(){
                                    el.contentWindow.document.body.innerHTML = bindData ;
                                });
                            })(bindData) ;
                        }else{
                            el.contentWindow.document.body.innerHTML = bindData ;
                        }
                    }else{
                        if(boundEl.isHTML){
                            if(el.innerHTML != bindData){
                                el.innerHTML = bindData;
                            }
                        }else{
                            if(el.textContent != bindData){
                                el.textContent = bindData;
                            }
                        }
                    }
                }
            }

            

            if(boundEl.boundTextNodes){
                var textNodes = [];
                for ( var y=0;y<el.childNodes.length; y++ ) {
                    if(el.childNodes[y].nodeType === Node.TEXT_NODE){
                        textNodes.push(el.childNodes[y]);
                    }
                }
                for(var y=0; y<textNodes.length; y++){
                    var originalValue = boundEl.boundTextNodes[y] ;
                    var value = originalValue ;
                    while(value.indexOf("${") !== -1){
                        var indexStart = value.indexOf("${") ;
                        var indexEnd = value.indexOf("}") ;
                        if(indexEnd < indexStart){ 
                            console.error("Wrong syntax in "+originalValue) ;
                            break;
                        }
                        var expr = value.substring(indexStart+2, indexEnd) ;
                        
                        var exprValue = runEvalExpr(exprNameValues, expr) ;
                        value = value.substring(0, indexStart)+exprValue+value.substring(indexEnd+1) ;
                    }
                    if(textNodes[y].textContent != value){
                        textNodes[y].textContent = value;
                    }
                }
            }

            //dispatch bound event on this element
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('bound', false, true, {
                value: bindData,
                baseData: baseData,
                bindPath: bindPath,
                view: this,
                data: bindData
            });
            var detailKeys = Object.keys(event.detail) ;
            for(var y=0; y<detailKeys.length; y++){
                var k = detailKeys[y] ;
                event[k] = event.detail[k] ;
            }
            el.dispatchEvent(event);
        }

        //dispatch bound event on container element
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('bound', false, true, {
            value: this.getBoundObject(),
            baseData: this.bindObject,
            bindPath: this.bindPath,
            view: this,
            data: baseData
        });
        var detailKeys = Object.keys(event.detail) ;
        for(var y=0; y<detailKeys.length; y++){
            var k = detailKeys[y] ;
            event[k] = event.detail[k] ;
        }
        this.viewRootEl.dispatchEvent(event);

        //set sub views
        var viewIds = Object.keys(this.views) ;
        for(var b=0; b<viewIds.length; b++){
            var viewId = viewIds[b] ;
            var view = this.views[viewId];
            var bindPath = view.bindPath || [];
            var shouldDisplay = true;
            if(view.showIf){
                var showIfData = runEvalExpr(exprNameValues, view.showIf) ;
                if(!showIfData || (Array.isArray(showIfData) && showIfData.length === 0)){
                    shouldDisplay = false ; 
                }
            }
            if(view.hideIf){
                var hideIfData = runEvalExpr(exprNameValues, view.hideIf) ;
                shouldDisplay = false;
                if(!hideIfData){
                    shouldDisplay = true; //no data should display
                }else if(hideIfData && Array.isArray(hideIfData) && hideIfData.length === 0) {
                    shouldDisplay = true; //empty array, should display
                }
            }

            var bindData = this.bindObject;
            if(bindPath.length>0){
                var pathConcat = (this.bindPath||["$this"]).concat(bindPath) ;
                pathConcat[pathConcat.length-1] = pathConcat[pathConcat.length-1].replace(/\[\]$/, "") ;

                bindData = pathExtract(this.bindObject, pathConcat);
            }

            if(bindPath.length >0 && bindPath[bindPath.length - 1][bindPath[bindPath.length - 1].length-1] === "]" && !bindData){
                //array binding but array is null
                shouldDisplay = false;
            }


            var removedInstance = [] ;
            if(shouldDisplay){
                this.renderOneView(viewId, bindData) ;
            }else{
                //not displayed, remove all instance
                removedInstance = view.instances.splice(0);
                for(var a=0; a<removedInstance.length; a++){
                    var instance = removedInstance[a] ;
                    instance.container.parentElement.removeChild(instance.container);
                }
            }
        }
        this.emit("load",null, this, true);
        this.emit("render",null, this, true);
        callback();
    };


    VeloxWebView.prototype.renderOneView = function (viewId, bindData) {
        var view = this.views[viewId];
        if(!Array.isArray(bindData)){
            bindData = [bindData] ;
        }
        for(var y=0; y<bindData.length; y++){
            //var d = bindData[y] ;
            if (!view.instances[y]) {
                //this instance does not exist yet, create it
                this.addViewInstance(viewId) ;
            } else {
                //this instance already exist, just reload data in it
                if(view.instances[y].bindPath && view.instances[y].bindPath[view.instances[y].bindPath.length-1] === "]"){
                    //update bind path because the index in array may have change with user remove line in list auto
                    view.instances[y].bindPath = view.instances[y].bindPath.substring(0, view.instances[y].bindPath.lastIndexOf("[")+1)+y+"]" ;
                }
                view.instances[y].bindObject = this.bindObject ;
                view.instances[y].render() ;
            }
        }
        
        var removedInstance = view.instances.splice(bindData.length);
        
        //delete removed elements
        for(var i=0; i<removedInstance.length; i++){
            var instance = removedInstance[i] ;
            instance.container.parentElement.removeChild(instance.container);
        }
    } ;

    /**
     * Add a new instance of a sub view (usefull for list)
     * 
     * @param {string} viewId id of the sub view
     * @param {function} callback called when the view is created
     */
    VeloxWebView.prototype.removeViewInstance = function (viewId, index) {
        var view = this.views[viewId];
        var removedInstance = view.instances.splice(index, 1);
        
        //delete removed elements
        for(var i=0; i<removedInstance.length; i++){
            var instance = removedInstance[i] ;
            instance.container.parentElement.removeChild(instance.container);
        }
        this.emit("viewInstanceRemoved", {viewId: viewId, index : index}, this, true) ;
    } ;
    /**
     * Add a new instance of a sub view (usefull for list)
     * 
     * @param {string} viewId id of the sub view
     * @param {function} callback called when the view is created
     */
    VeloxWebView.prototype.addViewInstance = function (viewId) {
        var view = this.views[viewId];
        var bindPath = view.bindPath || [];

        var isAfter = view.isAfter;
        if(view.instances.length > 0){
            var lastInstanceContainer = view.instances[view.instances.length - 1].container;
            if(!lastInstanceContainer.hasAttribute("data-vieworder-id")){
                lastInstanceContainer.setAttribute("data-vieworder-id", "v_"+uuidv4()) ;
            }
            isAfter = [lastInstanceContainer.getAttribute("data-vieworder-id")] ;
        }

        var parentEl = view.elParent; //default parent

        // var container = view.el.cloneNode() ;
        // while(container.firstChild){
        //     container.removeChild(container.firstChild) ;
        // }
        // insertChild(view.elParent, container, view.isBefore, isAfter) ;

        var container = null;
        var htmlEl = view.el;
        if(view.file){
            //in case of nested view, the view file contains the view innerHTML but not
            //the outer element like for inline sub view. We must add the outer element as container
            container = view.el.cloneNode() ;
            insertChild(view.elParent, container, view.isBefore, isAfter) ;

            //in case of external view, the html content is defined by the view
            htmlEl = null;
        }

        var thisBindPath = [];
        if(bindPath.length>0){
            for ( var i=0;i<bindPath.length; i++ ) {thisBindPath[i] = bindPath[i];}
            //thisBindPath[thisBindPath.length - 1] = thisBindPath[thisBindPath.length - 1].replace(/\[\]$/, "[" + view.instances.length + "]") ;
            thisBindPath[thisBindPath.length - 1] = thisBindPath[thisBindPath.length - 1].replace(/\[\]$/, "") ;
        }
        if(view.multiple){
            //linked to an array, add the index
            thisBindPath.push(""+view.instances.length) ;
        }

        //var baseData = pathExtract(this.bindObject, thisBindPath) ;

        var viewOptions = {
            containerParent: parentEl,
            container: container,
            containerIsInside : !!view.file,
            insertBefore : view.isBefore,
            insertAfter : isAfter,
            htmlEl : htmlEl,
            html: view.html,
            css: view.html?"":undefined,
            bindObject: null,
            bindPath: (this.bindPath ? this.bindPath : []).concat(thisBindPath) 
        } ;
        
        var v = new VeloxWebView(view.dir, view.file, viewOptions);
        v.viewId = viewId;
        v.parentView = this ;
        v.isMultiple = view.multiple;
        v.indexMultiple = view.instances.length;
        view.instances.push(v);
            
        //the emitted event are propagated to this view
        var _emit = v.emit ;
        v.emit = function(event, data, source, dontPropagate){
            _emit.bind(v)(event, data, source) ; //emit the event inside the view
            if(!dontPropagate){
                this.emit(event, data, v) ; //propagate on this view
            }
        }.bind(this) ;
        v.openCompiled() ;
        
        //propagate event listener from containing view to subview created elements
        var parents = [] ;
        var loopV = v;
        while(loopV.parentView){
            parents.push(loopV.parentView) ;
            loopV = loopV.parentView ;
        }
        for(var i=0; i<parents.length; i++){
            var parent = parents[i] ;
            
            for(var y=0; y<parent.innerViewIds.length; y++){
                var innerViewId = parent.innerViewIds[y] ;
                if(v.ids[innerViewId.id] && v.EL[innerViewId.id] && !v.EL[innerViewId.id].isFake){ //the ids belong to this view
                    innerViewId.realEls[v.indexMultiple] = v.EL[innerViewId.id] ;
                    var listenerKeys = Object.keys(innerViewId.listeners) ;
                    for(var z=0; z<listenerKeys.length; z++){
                        var event = listenerKeys[z] ;
                        var listeners = innerViewId.listeners[event] ;
                        for(var a=0; a<listeners.length; a++){
                            var l = listeners[a] ;
                            v.EL[innerViewId.id].addEventListener(event, l) ;
                        }
                    }
                }
            }

            Object.keys(parent.ids).forEach(function(id){
                var modifiedId = parent.ids[id] ;
                parent.updateIds(id, modifiedId, v.container) ;
            }) ;
        }

        //render after propagate event to be sure bound listener are called
        v.bindObject = this.bindObject ;
        v.render() ;
        
        
        this.emit("viewInstanceAdded", {view:v, viewId: viewId, index : view.instances.length-1}, this, false) ;
        return v;
    } ;

    /**
     * Get the root view (this view if it is normal view or parent if it is a sub view)
     */
    VeloxWebView.prototype.getRootView = function () {
        var v = this ;
        while(v.parentView){
            v = v.parentView ;
        }
        return v;
    };

    /**
     * Format a value to display
     * 
     * @param {*} value - the value to format
     * @param {string} [type] - type of value
     */
    VeloxWebView.prototype.format = function (value, type) {
        if (value === null || value === undefined) {
            if(["int", "integer", "number"].indexOf(type) !== -1){
                return "0";
            }else if(["double", "float", "float8"].indexOf(type) !== -1){
                return "0.00";
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
            //try to guess if it is a date or a date time
            if(value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0 && value.getMilliseconds() === 0){
                //the date is exactly midnight, assume it is date only data
                if(value.toLocaleDateString){
                    return value.toLocaleDateString() ;
                }else{
                    return value.toDateString() ; //IE10...
                }
            }else{
                //the date has a date with time information, it is probably a data/time
                if(value.toLocaleDateString){
                    return value.toLocaleDateString()+" "+value.toLocaleTimeString() ;
                }else{
                    return value.toDateString()+" "+value.toTimeString() ; //IE10...
                }
            }
        }

        if(typeof(value)==="string" && ["int", "integer", "number", "double", "float", "float8"].indexOf(type) !== -1){
            value = Number(value) ;
        }
        
        if(typeof(value)==="number"){
            if(["int", "integer", "number"].indexOf(type) !== -1){
                return Math.round(value);
            }else if(["double", "float", "float8"].indexOf(type) !== -1){
                return value.toFixed(2);
            }else{
                return ""+value;
            }
        }
        return ""+value;
    };
    

    VeloxWebView.format = VeloxWebView.prototype.format;

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
     * Get data object from value inputed in view
     * 
     */
    VeloxWebView.prototype.getData = function () {
        return this.updateData({}) ;
    } ;

    /**
     * Update data object from value inputed in view
     * 
     * @param {object} [dataToUpdate] - The data object to update. If not given the object used for render is updated
     */
    VeloxWebView.prototype.updateData = function (dataToUpdate) {

        if(!this.boundElements){
            throw "You try to call updateData() on a view that is not yet initialized or already closed" ;
        }

        var baseData = dataToUpdate;
        if (dataToUpdate === undefined) {
            //object not given, update in the bound object
            baseData = pathExtract(this.bindObject, this.bindPath);
        }
        if(!baseData){
            baseData = {} ;
        }
        
        //set simple elements
        for(var i=0; i<this.boundElements.length; i++){
            var boundEl = this.boundElements[i] ;
            if(boundEl.bindPath){
                var el = boundEl.el;
                var bindPath = boundEl.bindPath;
                var value = undefined;
                if (el.getValue){
                    value = el.getValue();
                }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                    if(el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")){
                        value = el.checked ;
                    }else{
                        value = el.value;
                    }
                }
                if(value !== undefined){
                    pathSetValue(baseData, bindPath, value);
                }
            }
            
        }

        //set sub views
        var viewsKeys = Object.keys(this.views) ;
        for(var i=0; i< viewsKeys.length; i++){
            var viewId = viewsKeys[i] ;
            this._updateDataFromView(viewId, baseData, dataToUpdate) ;
        }
        this.emit("updateData", baseData, this, true);
        return baseData ;
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
        
        var viewData = baseData ;
        if(viewBindPath.length>0){
            viewBindPath[viewBindPath.length-1] = viewBindPath[viewBindPath.length-1].replace(/\[\]$/, "") ;

            viewData = pathExtract(baseData, viewBindPath);
        }
        
        if (!viewData) {
            viewData = [];
            pathSetValue(baseData, viewBindPath, viewData);
        }

        this._getSubviewData(viewId, viewData) ;
        
        return viewData ;
    };

    /**
     * Give the sub view data
     * 
     * @param {string} viewId the view id
     * @param {object} [viewData] data to complete
     */
    VeloxWebView.prototype._getSubviewData = function (viewId, viewData) {
        if (!viewData) {
            viewData = [];
        }
        
        var view = this.views[viewId];
        for(var i=0; i<view.instances.length; i++){
            var instance = view.instances[i] ;
            if(instance.isMultiple){
                instance.bindPath[instance.bindPath.length-1] = i ; //refresh the path index because it may have changed from user manual remove
                if(!viewData[i]){
                    //list object, add object for each instance
                    viewData[i] = {} ;
                }
                instance.updateData(viewData[i]);
            } else {
                instance.updateData(viewData);
            }
        }

        if(Array.isArray(viewData) && viewData.length>0){
            viewData.splice(view.instances.length);
        }
        return viewData ;
    } ;


    /**
     * Init the auto emit on HTML elements
     * 
     * @private
     */
    VeloxWebView.prototype.initAutoEmit = function () {
        var emitters = this.elementsHavingAttribute("data-emit");
        
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
                        currentData: this.getBoundObject(),
                        parentData: pathExtract(this.bindObject, this.bindPath, true),
                        index: this.indexMultiple,
                        view: this
                    });
                }).bind(this));
            }).bind(this)(i);
        }
    };

    /**
     * Check form user input. It check all HTML 5 controls (required, format, etc...)
     * To add custom validations, add functions in view.validations. It can take a callback or not.
     * 
     * example :
     * view.validations = [];
     * view.validations.push(function(ctx){
     *      if(ctx.data.foo === "bar"){
     *          //return simple error
     *          return "Foo should not equals to bar" ;
     *      }
     * });
     * 
     * view.validations.push(function(ctx){
     *      if(ctx.data.foo === "bar"){
     *          //return an error linked to an element (will put the field in red with error message)
     *          return {el: view.EL.foo, msg: "Foo should not equals to bar"} ;
     *      }
     * });
     * 
     * view.validations.push(function(ctx, callback){
     *      //if your validation function has a callback, it is expected to be an async control so we wait for callback
     *      doSomeThingAsync(function(err){
     *          if(err){
     *              return callback(err) ;
     *          }
     *          callback() ;
     *      })
     * });
     * 
     * @param {HTMLElement} [form] - the <form> to check (default to the first found form if not given)
     * @param {function[]} [customValidations] - Array of custom validation (came in addition to the view.validations array)
     * @param {function} callback
     */
    VeloxWebView.prototype.checkForm = function(form, customValidations, callback){
        if(typeof(form) === "function"){
            callback = form;
            customValidations = [];
            if(this.viewRootEl.tagName === "FORM"){
                form = this.viewRootEl;
            }else{
                form = this.viewRootEl.querySelector("form");
                if(!form){
                    throw "Call check form but not form in the view !" ;
                }
            }
        } else if(typeof(customValidations) === "function"){
            callback = customValidations;
            customValidations = [];
        }
        var dataBeforeModif = JSON.parse(JSON.stringify(this.getBoundObject() || {})) ;
        var dataAfterModif = JSON.parse(JSON.stringify(dataBeforeModif)) ;
        var viewData = this.updateData(dataAfterModif) ;

        form.className += " was-validated" ;

        var errors = [] ;
        var calls = [] ;
        var validations = (customValidations || []).concat(this.validations || []) ;
        validations.forEach(function(validation){
            if(validation.length === 2){
                calls.push(function(cb){
                    //with callback
                    validation({form: form, data: viewData, dataBeforeModif : dataBeforeModif}, function(err, detectedErrors){
                        if(err){ return cb(err) ;}
                        if(!detectedErrors){ detectedErrors = [] ;}
                        if(detectedErrors && !Array.isArray(detectedErrors)){
                            detectedErrors = [detectedErrors];
                        }
                        detectedErrors.forEach(function(e, i){
                            if(typeof(e) === "string"){
                                detectedErrors[i]= {msg : e} ;
                            }
                        }) ;
                        errors = errors.concat(detectedErrors||[]) ;
                        cb() ;
                    }.bind(this)) ;
                }.bind(this)) ;
            }else{
                var detectedErrors = validation({form: form, data: viewData, dataBeforeModif : dataBeforeModif});
                if(!detectedErrors){ detectedErrors = [] ;}
                if(detectedErrors && !Array.isArray(detectedErrors)){
                    detectedErrors = [detectedErrors];
                }
                detectedErrors.forEach(function(e, i){
                    if(typeof(e) === "string"){
                        detectedErrors[i]= {msg : e} ;
                    }
                }) ;
                errors = errors.concat(detectedErrors||[]) ;
            }
            
        }.bind(this)) ;

        VeloxWebView._asyncSeries(calls, function(err){
            if(err){ return callback(err) ;}

            var invalids = form.querySelectorAll(":invalid") ;
            for(var i=0; i<invalids.length; i++){
                var invalidEl = invalids[i] ;
                if(invalidEl.isManualError){
                    delete invalidEl.isManualError ;
                    invalidEl.setCustomValidity("");
                }
            }

            var globalErrors = [] ;
            for(var i=0; i<errors.length; i++){
                var error = errors[i] ;
                if(error.field){
                    var elField = form.querySelector('[data-field-def="'+error.field+'"] input') ;
                    if(elField){
                        elField.setCustomValidity(error.msg);
                        elField.isManualError = true ;
                    }else{
                        globalErrors.push(error) ;
                    }
                }else{
                    globalErrors.push(error) ;
                }
            }

            var formValidity = form.checkValidity() ;

            var invalids = form.querySelectorAll(":invalid") ;
            for(var i=0; i<invalids.length; i++){
                var invalidEl = invalids[i] ;
                var message = invalidEl.validationMessage ;
                if(message){
                    var parentEl = invalidEl.closest("[data-bind]") ;
                    var feedbackEl = parentEl.querySelector(".invalid-feedback") ;
                    if(feedbackEl){
                        feedbackEl.innerHTML = message ;
                    }
                    var label = parentEl.getAttribute("data-field-label-error")||parentEl.getAttribute("data-field-label") ;
                    globalErrors.push({
                        el: parentEl,
                        field: parentEl.getAttribute("data-bind"),
                        fieldDef: parentEl.getAttribute("data-field-def"),
                        label: label,
                        msg: (label?label+" : ":"")+message
                    }) ;
                }
            }

            if(globalErrors.length > 0){
                var msg = globalErrors.map(function(e){ return "<p>"+e.msg+"</p>" ;}).join("") ;
                this.formError(msg) ;
            }
            callback(null, formValidity&&errors.length === 0) ;
        }.bind(this)) ;
    } ;

    VeloxWebView.prototype.formError = function(msg){
        var formError = this.viewRootEl.querySelector("[data-form-error]") ;
        if(formError){
            formError.innerHTML = msg ;
        }else{
            this.error(msg) ;
        }
    } ;

    VeloxWebView.prototype.clearFormError = function(){
        var errorFields = this.viewRootEl.querySelectorAll(".has-error");
        for(var i=0; i<errorFields.length; i++){
            errorFields[i].className = errorFields[i].className.replace(/has-error/g, "") ;
        }
        var formError = this.viewRootEl.querySelector("[data-form-error]") ;
        if(formError){
            formError.innerHTML = "" ;
        }
    } ;

    /**
	 * Start wait animation
     * 
     * @param {string} [message] the message to display
	 */
	VeloxWebView.startWait = function (message) {
        if(!message){
            message = this.options?this.options.defaultWaitMessage:null ;
        }
        
		if (!this.waitCount) {
            this.showWaiterTimeout = setTimeout(function () {//don't display waiter if less than 300ms
                this._showWaiter(message);
            }.bind(this), (this.options && this.options.waiterDelay)?this.options.waiterDelay : 300);
        }
        if(!this.waitCount){ this.waitCount = 0 ;}
        this.waitCount++;
    };
    VeloxWebView.prototype.startWait = VeloxWebView.startWait.bind(VeloxWebView) ; ;

    /**
	* End wait animation
	*/
	VeloxWebView.endWait = function () {
		this.waitCount--;
		if (this.waitCount === 0) {
			clearTimeout(this.showWaiterTimeout);
			this._hideWaiter();
		}
    };

    VeloxWebView.prototype.endWait = VeloxWebView.endWait.bind(VeloxWebView) ;

    /**
	* Close all waiters
	*/
	VeloxWebView.closeAllWaiters = function () {
		if(this.waitCount>0){
            this.waitCount = 0;
			clearTimeout(this.showWaiterTimeout);
			this._hideWaiter();
		}
    };

    VeloxWebView.prototype.closeAllWaiters = VeloxWebView.closeAllWaiters.bind(VeloxWebView) ; ;
    
    /**
     * Display info box
     * 
     * @param {string} message the message to display
     * @param {function} [callback] called when user close message
     */
    VeloxWebView.info = function (message, callback) {
        window.alert(message) ;
        if(callback){ callback() ; }
    } ;

    VeloxWebView.prototype.info = VeloxWebView.info.bind(VeloxWebView) ; ;

    /**
     * Display error box
     * 
     * @param {string} message the message to display
     * @param {function} [callback] called when user close message
     */
    VeloxWebView.error = VeloxWebView.info.bind(VeloxWebView) ; ;
    
    VeloxWebView.prototype.error = VeloxWebView.prototype.info ;

    /**
     * Display error box and stop waiter
     * 
     * @example
     * view.startWait()
     * api.callMyServer(function(err){
     *  if(err){ return view.endWaitError(err); }
     *  //OK
     *   view.endWait() ;
     * }) ;
     * 
     * @param {string} message the message to display
     * @param {function} [callback] called when user close message
     */
    VeloxWebView.endWaitError = function (message, callback) {
        this.endWait() ;
        this.error(message, callback) ;
    };

    VeloxWebView.prototype.endWaitError = VeloxWebView.endWaitError.bind(VeloxWebView) ; ;

    /**
     * Start a long task, it will display the waiter until finish
     * 
     * It can be use both with function(callback) style or Promise
     * 
     * @example
     * //callback style
     * view.longTask(function(cb){
     *      api.callMyServer(function(err){
     *          if(err){ cb(err); } //waiter will be hide and error message displayed
     *          ... do something on success ...
     *          cb() ;//long task finished, waiter will be hide
     *      });
     * });
     * 
     * //promise style
     * view.longTask(new Promise((resolve, reject)=>{
     *         myServerPromiseCall.then(resolve).catch(reject) ;
     * }).then(()=>{
     *         ... do something on success ...
     * })) ;
     * 
     * @param {function(done)} doTask the function that do the task and call done on finish
     * @param {string} [message] message to display
     * @param {function(err)} [callback] called when the long task is done
     */
    VeloxWebView.longTask = function (doTask, message, callback) {
        if(typeof(message) === "function"){
            callback = message ;
            message = null;
        }
        if(!callback){ callback = function(){} ;}
        this.startWait(message) ;
        if(typeof(doTask) === "function"){
            doTask(function(error){
                if(error){ this.endWaitError(error) ; return callback(error) ;}
                this.endWait() ;
                callback.apply(null, arguments) ;
            }.bind(this)) ;
        }else if(doTask.constructor && doTask.constructor.name === "Promise"){
            doTask.then(function(){
                this.endWait() ;
                callback.apply(null, [null].concat(arguments)) ;
            }.bind(this)).catch(function(error){
                this.endWaitError(error) ;
                callback(error) ;
            }.bind(this)) ;
        }
    };

    VeloxWebView.prototype.longTask = VeloxWebView.longTask.bind(VeloxWebView) ; ;
      
    VeloxWebView._showWaiter = function(message){
        //credit : https://stephanwagner.me/only-css-loading-spinner
        this.loadStaticCss(
            "@keyframes velox_spinner { to {transform: rotate(360deg);} }" +
            ".velox_overlay { "+
            "    position: fixed; "+
            "    top: 0; "+
            "    left: 0; "+
            "    right: 0; "+
            "    bottom: 0; "+
            "    background-color: rgba(0, 0, 0, 0.61); "+
            "    z-index: 1500; "+
            "  }"+
            ".velox_waitmsg { "+
            "    color: white; "+
            "    position: absolute;"+
            "    top: calc(50% + 30px);"+
            "    left: 0;"+
            "    width: 100%;"+
            "    text-align: center;"+
            "  }"+
            ".velox_spinner:before { "+
            "    content: '';"+
            "    box-sizing: border-box;"+
            "    position: absolute;"+
            "    top: 50%;"+
            "    left: 50%;"+
            "    width: 20px;"+
            "    height: 20px;"+
            "    margin-top: -10px;"+
            "    margin-left: -10px;"+
            "    border-radius: 50%;"+
            "    border: 2px solid #ccc;"+
            "    border-top-color: #333;"+
            "    animation: velox_spinner .6s linear infinite;"+
            "  }"
        ) ;
        this.waiterDiv = document.createElement("div") ;
        this.waiterDiv.className = "velox_overlay" ;
        var spinnerDiv = document.createElement("div") ;
        spinnerDiv.className = "velox_spinner" ;
        this.waiterDiv.appendChild(spinnerDiv) ;
        if(message){
            var msgDiv = document.createElement("div") ;
            msgDiv.className = "velox_waitmsg" ;
            msgDiv.innerHTML = message ;
            this.waiterDiv.appendChild(msgDiv) ;
        }
        document.body.appendChild(this.waiterDiv) ;
    } ;

    VeloxWebView.prototype._showWaiter = VeloxWebView._showWaiter.bind(VeloxWebView) ; ;
    
    VeloxWebView._hideWaiter = function() {
        if(this.waiterDiv){
            if(this.waiterDiv.parentElement){
                this.waiterDiv.parentElement.removeChild(this.waiterDiv) ;
            }
            this.waiterDiv = null ;
        }
    };
    VeloxWebView.prototype._hideWaiter = VeloxWebView._hideWaiter.bind(VeloxWebView) ; ;
    
    VeloxWebView.prototype._asyncSeries = asyncSeries ;
    VeloxWebView._asyncSeries = asyncSeries ;
    VeloxWebView.pathSetValue = pathSetValue ;

    /**
     * Clear compilation cache
     */
    VeloxWebView.clearCache = function(){
        parsedHTMLCache = {} ;
    } ;

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

        //sort extension following runBefore/runAfter rules

        //first add to indexes map
        var indexes = {};
        VeloxWebView.extensions.forEach(function(ext, i){
            indexes[ext.name] = i;
        });

        //transform runBefore rules to runAfter to less headaches
        VeloxWebView.extensions.forEach(function(ext){
            if(ext.mustRunBefore){
                ext.mustRunBefore.forEach(function(other){
                    VeloxWebView.extensions.forEach(function(extOther){
                        if(extOther.name === other){
                            if(!extOther.mustRunAfter){
                                extOther.mustRunAfter = [] ;
                            }
                            extOther.mustRunAfter.push(ext.name) ;
                        }
                    }) ;
                });
            }
        });

        //compute new indexes 
        var changed = true;
        var security = 10 ;
        while(changed){
            changed = false ;
            VeloxWebView.extensions.forEach(function(ext){
                if(ext.mustRunAfter){
                    ext.mustRunAfter.forEach(function(other){
                        if(indexes[other] && indexes[ext.name] <= indexes[other]){
                            indexes[ext.name] = indexes[other]+1 ;
                            changed = true ;
                        }
                    });
                }
            });
            security--;
            if(security<=0){
                //after many loop we still are modifying indexes, it is probably a too recursive rules somewhere, stop trying...
                console.warn("There is a loop in extensions order before/after, the order is not guaranteed") ;
                break;
            }
        }

        //sort following computed indexes
        VeloxWebView.extensions = VeloxWebView.extensions.sort(function(e1, e2){
            return indexes[e1.name] - indexes[e2.name] ;
        }) ;
    };


    return VeloxWebView;
})));

