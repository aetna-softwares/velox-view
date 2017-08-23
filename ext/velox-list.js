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
    extension.name = "list" ;

    //must run before fields extension
    extension.mustRunAfter = ["fields"] ;

    /**
     * called on view init
     */
    extension.init = function(cb){
        var view = this ;
        doInitView.bind(view)() ;
        cb() ;
    } ;
    extension.extendsGlobal = {} ;

    extension.extendsProto = {} ;
    
    extension.extendsProto.startListAuto = function(viewId, callback){
        this.setListAuto(viewId, true, callback) ;
    } ;
    
    extension.extendsProto.stopListAuto = function(viewId, callback){
        this.setListAuto(viewId, false, callback) ;
    } ;

    extension.extendsProto.setListAuto = function(viewId, active, callback){
        if(typeof(viewId) === "boolean"){
            callback = active;
            active = viewId;
            viewId = null;
        }
        if(!callback){ callback = function(){}; }
        if(viewId){
            this.views[viewId].instances.forEach(function(v){
                v.listAutoActive = active ;
            }) ;
            this.views[viewId].listAutoActive = active ;
            if(active){
                var mustAddLine = false; 
                if(this.views[viewId].instances.length === 0){
                    mustAddLine = true ;
                }else{
                    var lastObj = this.views[viewId].instances[this.views[viewId].instances.length-1].getBoundObject()
                    if(lastObj && JSON.stringify(lastObj) !== "{}"){
                        mustAddLine = true;
                    }
                }
                
                if(mustAddLine){
                    //add an instance to start input
                    this.addViewInstance(viewId, callback) ;
                }
            }else{
                callback() ;
            }
        }else{
            var calls = [] ;
            toggleRemoveEls.bind(this) ;
            var hasSubViewWithListAuto = false;
            Object.keys(this.views).forEach(function(viewId){
                var viewDef = this.views[viewId] ;
                if(viewDef.el.hasAttribute("data-list-auto")){
                    hasSubViewWithListAuto = true ;
                    calls.push(function(cb){
                        this.setListAuto(viewId, active, cb) ;
                    }.bind(this)) ;
                }
            }.bind(this));
            if(hasSubViewWithListAuto){
                //activate list auto mode only if there is list auto sub view
                this.listAutoActive = active ;
            }
            this._asyncSeries(calls, callback) ;
        }
    } ;

    extension.extendsObj = {} ;

    extension.extendsObj._updateDataFromView = function (viewId, baseData, dataObject) {
        var viewData = VeloxWebView.prototype._updateDataFromView.call(this, viewId, baseData, dataObject);
        if(this.listAutoActive){
            //remove the last entry of the array because it is always an empty line if list auto is active
            viewData.splice(viewData.length - 1, 1) ;
        }
    } ;

    /**
     * Manage the visibility of remove elements
     */
    function toggleRemoveEls(){
        var elsRemove = this.elementsHavingAttribute("data-list-remove");
        if(this.listAutoActive){
            var viewDef = this.parentView.views[this.viewId] ;
            var listIndex = viewDef.instances.indexOf(this) ;
            if(listIndex === viewDef.instances.length - 1){
                //this instance is the last instance, don't allow to remove it
                elsRemove.forEach(function(elRemove){
                    elRemove.style.display = "none" ;
                });
            }else{
                //this instance is not the last, allow to remove it
                elsRemove.forEach(function(elRemove){
                    elRemove.style.display = "" ;
                });
            }
        }else{
            //not active, hide all
            elsRemove.forEach(function(elRemove){
                elRemove.style.display = "none" ;
            });
        }
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

       
        if(this.bindPath && this.bindPath[this.bindPath.length-1] === "]"){
            //I am a view 'item' of a list
            var indexBracket = this.bindPath.lastIndexOf("[") ;
            if(indexBracket !== -1){
                //get my view definition from parent
                var viewDef = this.parentView.views[this.viewId] ;
                
                this.once("load", function(){
                    //first time render on this item, search for all fields to listen on changes
                    
                    //get the list array from data
                    this.list = this.pathExtract(this.bindObject, this.bindPath.substring(0, indexBracket)) ;
                    if(this.list){
                        //if the list exists

                        var elements = this.elementsHavingAttribute("data-field");
                        elements.forEach(function(element){
                            element.addEventListener("change", function(){
                                //a change happen 
                                if(this.listAutoActive){ //the list is active
                                    var listIndex = viewDef.instances.indexOf(this) ; //recompute because it may have change with remove actions
                                    if(listIndex === viewDef.instances.length - 1){
                                        //where are on the last line, add a line
                                        this.parentView.addViewInstance(this.viewId, function(){}) ;
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
                    }
                }.bind(this)) ;
            }
        }
    }

    return extension ;

})));