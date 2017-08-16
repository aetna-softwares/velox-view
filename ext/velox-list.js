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
            this.listAutoActive = active ;
            var calls = [] ;
            Object.keys(this.views).forEach(function(viewId){
                var viewDef = this.views[viewId] ;
                if(viewDef.el.hasAttribute("data-list-auto")){
                    calls.push(function(cb){
                        this.setListAuto(viewId, active, cb) ;
                    }.bind(this)) ;
                }
            }.bind(this));
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
                //get the list array from data
                this.list = this.pathExtract(this.bindObject, this.bindPath.substring(0, indexBracket)) ;
                //get my view definition from parent
                var viewDef = this.parentView.views[this.viewId] ;
                if(this.list){
                    //if the list exists

                    this.once("load", function(){
                        //first time render on this item, search for all fields to listen on changes

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

                        var onParentChange = function(){
                            //listener that will be called when the rendering of this list changed (full render or add/remove instance)
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
                        }.bind(this) ;
                        //listen to load (render), remove and add instance events in parent view
                        this.parentView.on('load', onParentChange) ;
                        this.parentView.on('viewInstanceRemoved', onParentChange) ;
                        this.parentView.on('viewInstanceAdded', onParentChange) ;
                    }.bind(this)) ;

                }
            }
        }
    }

    return extension ;

})));