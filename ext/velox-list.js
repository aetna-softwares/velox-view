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
    
    extension.extendsProto.startListAuto = function(viewId){
        if(viewId){
            this.views[viewId].instances.forEach(function(v){
                v.listAutoActive = true ;
            }) ;
            this.views[viewId].listAutoActive = true ;
        }else{
            this.listAutoActive = true ;
        }
    } ;
    
    extension.extendsProto.stopListAuto = function(viewId){
        if(viewId){
            this.views[viewId].instances.forEach(function(v){
                v.listAutoActive = false ;
            }) ;
            this.views[viewId].listAutoActive = true ;
        }else{
            this.listAutoActive = false ;
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
            Object.keys(this.views).forEach(function(viewId){
                this.views[viewId].instances.forEach(function(v){
                    v.listAutoActive = this.views[viewId].listAutoActive ;
                }.bind(this)) ;
            }.bind(this)) ;
        }.bind(this)) ;
        if(this.bindPath && this.bindPath[this.bindPath.length-1] === "]"){
            var indexBracket = this.bindPath.lastIndexOf("[") ;
            if(indexBracket !== -1){
                this.list = this.pathExtract(this.bindObject, this.bindPath.substring(0, indexBracket)) ;
                var viewDef = this.parentView.views[this.viewId] ;
                if(this.list){
                    this.once("load", function(){
                        var elements = this.elementsHavingAttribute("data-field");
                        elements.forEach(function(element){
                            element.addEventListener("change", function(){

                                if(this.listAutoActive){
                                    //a change happen 
                                    var listIndex = viewDef.instances.indexOf(this) ;
                                    if(listIndex === viewDef.instances.length - 1){
                                        //where are on the last line, add a line
                                        this.parentView.addViewInstance(this.viewId, function(){}) ;
                                    }
                                }
                            }.bind(this)) ;
                        }.bind(this));
                        var elsRemove = this.elementsHavingAttribute("data-list-remove");
                        elsRemove.forEach(function(elRemove){
                            elRemove.addEventListener("click", function(){
                                if(this.listAutoActive){
                                    //remove the line
                                    var listIndex = viewDef.instances.indexOf(this) ;
                                    this.parentView.removeViewInstance(this.viewId, listIndex) ;
                                }
                            }.bind(this)) ;
                        }.bind(this)) ;

                        var onParentChange = function(){
                            var listIndex = viewDef.instances.indexOf(this) ;
                            if(listIndex === viewDef.instances.length - 1){
                                elsRemove.forEach(function(elRemove){
                                    elRemove.style.display = "none" ;
                                });
                            }else{
                                elsRemove.forEach(function(elRemove){
                                    elRemove.style.display = "" ;
                                });
                            }
                        }.bind(this) ;
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