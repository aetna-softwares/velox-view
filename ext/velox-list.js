/*global define, echarts*/
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
     * contains loaded libs
     */
    var libs = {} ;

    var sortableCSSLoaded = false;

    ///// DEPENDENCIES LIBRARIES LOADING ////////
    var SORTABLE_VERSION = "1.7.0";

    var SORTABLE_LIB = {
        name: "sortablejs",
        type: "js",
        version: SORTABLE_VERSION,
        cdn: "https://cdn.jsdelivr.net/npm/sortablejs@$VERSION/Sortable.min.js",
        bowerPath: "Sortable/Sortable.min.js",
        npmPath: "sortablejs/Sortable.min.js",
    } ;

    
    /**
     * field extension definition
     */
    var extension = {} ;
    extension.name = "list" ;
    
    extension.libs = [
        SORTABLE_LIB
    ] ;
    //must run before fields extension
    extension.mustRunAfter = ["fields"] ;

    /**
     * called on view init
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

    extension.extendsProto = {} ;
    
    extension.extendsProto.startListAuto = function(viewId){
        this.setListAuto(viewId, true) ;
    } ;
    
    extension.extendsProto.stopListAuto = function(viewId){
        this.setListAuto(viewId, false) ;
    } ;

    extension.extendsProto.setListAuto = function(active){
        if(this.isListAuto){
            //if this view is a list auto view, set its active flag
            this.listAutoActive = active ;
        }
        //apply on sub views if there is any one of them that may be a list auto
        Object.keys(this.views).forEach(function(viewId){
            var viewDef = this.views[viewId] ;
            if(viewDef.el.hasAttribute("data-list-auto")){
                viewDef.listAutoActive = active ;
            }


            this.views[viewId].instances.forEach(function(subView){
                subView.setListAuto(active) ;
            }) ;
            if(active){
                if(viewDef.el.hasAttribute("data-list-auto")){
                    var mustAddLine = false; 
                    if(this.views[viewId].instances.length === 0){
                        //no line at all
                        mustAddLine = true ;
                    }else{
                        var lastObj = this.views[viewId].instances[this.views[viewId].instances.length-1].getBoundObject() ;
                        if(lastObj && JSON.stringify(lastObj) !== "{}"){
                            //last line is not an empty line
                            mustAddLine = true;
                        }
                    }
                    if(mustAddLine){
                        //add an instance to start input
                        var v = this.addViewInstance(viewId) ;
                        v.listAutoActive = active ;
                    }
                    if(viewDef.el.hasAttribute("data-list-sortable")){
                        libs.Sortable.create(viewDef.elParent, {
                            draggable: ".list-sortable",
                            handle: ".list-sort-handle",
                            onEnd: function (/**Event*/evt) {
                                if (evt.newIndex >= viewDef.instances.length) {
                                    var k = evt.newIndex - viewDef.instances.length;
                                    while ((k--) + 1) {
                                        viewDef.instances.push(undefined);
                                    }
                                }
                                viewDef.instances.splice(evt.newIndex, 0, viewDef.instances.splice(evt.oldIndex, 1)[0]);
                            },
                        });
                    }
                }
            }
        }.bind(this));

        if(this.isListAuto){
            toggleRemoveEls.bind(this)() ;
        }
    } ;

    extension.extendsObj = {} ;

    extension.extendsObj._getSubviewData = function (viewId, viewData) {
        var viewData = VeloxWebView.prototype._getSubviewData.call(this, viewId, viewData);
        if(this.views[viewId].listAutoActive && Array.isArray(viewData)){
            //remove the last entry of the array because it is always an empty line if list auto is active
            viewData.splice(viewData.length - 1, 1) ;
        }
        return viewData ;
    } ;

    /**
     * Manage the visibility of remove elements
     */
    function toggleRemoveEls(){
        var elsRemove = this.elementsHavingAttribute("data-list-remove");
        var elsHandles = this.elementsHavingAttribute("data-list-sort-handle");
        if(this.listAutoActive){
            var viewDef = this.parentView.views[this.viewId] ;
            var listIndex = viewDef.instances.indexOf(this) ;
            if(listIndex === viewDef.instances.length - 1){
                //this instance is the last instance, don't allow to remove it
                elsRemove.forEach(function(elRemove){
                    elRemove.style.display = "none" ;
                });
                elsHandles.forEach(function(el){
                    el.style.display = "none" ;
                });
                this.container.className = this.container.className.replace("list-sortable", "") ;
            }else{
                //this instance is not the last, allow to remove it
                elsRemove.forEach(function(elRemove){
                    elRemove.style.display = "" ;
                });
                elsHandles.forEach(function(el){
                    el.style.display = "" ;
                });
                if(this.container.className.indexOf("list-sortable") === -1){
                    this.container.className += " list-sortable" ;
                }
            }
        }else{
            //not active, hide all
            elsRemove.forEach(function(elRemove){
                elRemove.style.display = "none" ;
            });
            elsHandles.forEach(function(el){
                el.style.display = "none" ;
            });
            this.container.className = this.container.className.replace("list-sortable", "") ;
        }
    }
    
    /**
     * Prepare sort handles
     */
    function prepareSortHandlers(){
        var elsSortables = this.elementsHavingAttribute("data-list-sort-handle");
        elsSortables.forEach(function(elHandle){
            if(elHandle.className.indexOf("list-sort-handle") === -1){
                elHandle.className += " list-sort-handle" ;
            }
        });
        // var elsSortables = this.elementsHavingAttribute("data-list-sortable");
        // elsSortables.forEach(function(el){
        //     if(el.className.indexOf("list-sortable") === -1){
        //         el.className += " list-sortable" ;
        //     }
        // });
    }


    /**
     * init view fields
     * 
     * get all HTML elements having data-field attribute
     * 
     * @private
     */
    function doInitView(){
        this.on("load", function(){
            //on load (after render) on the parent view, we must propagate the list auto status to all created instances
            Object.keys(this.views).forEach(function(viewId){
                this.views[viewId].instances.forEach(function(v){
                    v.listAutoActive = this.views[viewId].listAutoActive ;
                }.bind(this)) ;
            }.bind(this)) ;
        }.bind(this)) ;

       
        if(this.isMultiple){
            //I am a view 'item' of a list
            
            //get my view definition from parent
            var viewDef = this.parentView.views[this.viewId] ;

            if(viewDef.el.hasAttribute("data-list-auto")){
                this.isListAuto = true ;
                viewDef.getValue = function(){
                    return this.parentView._getSubviewData(this.viewId) ;
                }.bind(this) ;
            }
                
            this.once("load", function(){
                //first time render on this item, search for all fields to listen on changes
                
                //get the list array from data
                var elements = this.elementsHavingAttribute("data-bind");
                elements.forEach(function(element){
                    var eventType = "change" ;
                    if(element.tagName === "INPUT" && element.type === "text"){
                        eventType = "keyup" ;
                    }else if(element.hasAttribute("data-field") && element.getAttribute("data-field") === "varchar"){
                        eventType = "keyup" ;
                    }
                    element.addEventListener(eventType, function(){
                        //a change happen 
                        if(this.listAutoActive){ //the list is active
                            var listIndex = viewDef.instances.indexOf(this) ; //recompute because it may have change with remove actions
                            if(listIndex === viewDef.instances.length - 1){
                                //where are on the last line, add a line
                                var v = this.parentView.addViewInstance(this.viewId, function(){}) ;
                                v.listAutoActive = true ;
                            }
                        }
                    }.bind(this)) ;
                }.bind(this));

                //get the potential remove buttons
                var elsRemove = this.elementsHavingAttribute("data-list-remove");
                elsRemove.forEach(function(elRemove){
                    elRemove.addEventListener("click", function(){
                        //click on remove button
                        if(this.listAutoActive){ //the list is active
                            //remove the line
                            var listIndex = viewDef.instances.indexOf(this) ;
                            this.parentView.removeViewInstance(this.viewId, listIndex) ;
                        }
                    }.bind(this)) ;
                }.bind(this)) ;

                
                //listen to load (render), remove and add instance events in parent view
                this.parentView.on('load', toggleRemoveEls.bind(this)) ;
                this.parentView.on('viewInstanceRemoved', toggleRemoveEls.bind(this)) ;
                this.parentView.on('viewInstanceAdded', toggleRemoveEls.bind(this)) ;    
                this.parentView.on('viewInstanceAdded', prepareSortHandlers.bind(this)) ;    
            }.bind(this)) ;
        }
    }

     /**
     * init view fields
     * 
     * get all HTML elements having data-field attribute
     * 
     * @private
     */
    function doPrepareView(params, callback){
        var elements = params.doc.querySelectorAll("[data-list-sortable]");
        if(elements.length>0){
            loadSortableCSS() ;
            loadLib("Sortable", SORTABLE_VERSION, SORTABLE_LIB, callback) ;
        }else{
            callback() ;
        }
    }

    /**
     * load the Switch CSS
     */
    function loadSortableCSS(){
        if(sortableCSSLoaded){ return ;}

        var css = ".list-sort-handle { cursor: move; }";
        
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        sortableCSSLoaded = true ;
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

    return extension ;

})));