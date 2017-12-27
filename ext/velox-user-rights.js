; (function (global, factory) {
        if (typeof exports === 'object' && typeof module !== 'undefined') {
        var VeloxScriptLoader = require("velox-scriptloader") ;
        module.exports = factory(VeloxScriptLoader) ;
    } else if (typeof define === 'function' && define.amd) {
        define(['VeloxScriptLoader'], factory);
    } else {
        global.VeloxWebView.registerExtension(factory(global.veloxScriptLoader));
    }
}(this, (function (VeloxScriptLoader) { 'use strict';

    /**
     * This extension aims to run with VeloxUserManagment system
     */

    /**
     * userRights extension definition
     */
    var extension = {} ;
    extension.name = "userRights" ;

    var localStorageUserKey = "velox_current_user"; 

    extension.prepare = function(params, cb){
        var i;
        var elements = params.doc.querySelectorAll('[data-user-min-level]');
        for(i=0; i<elements.length; i++){
            var element = elements[i] ;
            var minLevel = element.getAttribute("data-user-min-level") ;
            element.removeAttribute("data-user-min-level") ;
            element.setAttribute("data-show-if", "view.userHighestLevel >= "+minLevel) ;
        }
        var elements = params.doc.querySelectorAll('[data-user-max-level]');
        for(i=0; i<elements.length; i++){
            var element = elements[i] ;
            var maxLevel = element.getAttribute("data-user-max-level") ;
            element.removeAttribute("data-user-max-level") ;
            element.setAttribute("data-show-if", "view.userLowestLevel <= "+maxLevel) ;
        }
        cb() ;
    } ;

    extension.init = function(){
        var view = this ;
        var user = null;
        var strUser = localStorage.getItem(localStorageUserKey) ;
        if(strUser){
            user = JSON.parse(strUser) ;
            var userHighestLevel = Number.MIN_VALUE ;
            var userLowestLevel = Number.MAX_VALUE ;
            if(user.realms){
                for(var i=0; i<user.realms.length; i++){
                    var r = user.realms[i] ;
                    if(r.profile.level < userLowestLevel){
                        userLowestLevel = r.profile.level ;
                    }
                    if(r.profile.level > userHighestLevel){
                        userHighestLevel = r.profile.level ;
                    }
                }
            }else if(user.profile){
                userLowestLevel = user.profile.level ;
                userHighestLevel = user.profile.level ;
            }
            view.user = user ;
            view.userHighestLevel = userHighestLevel ;
            view.userLowestLevel = userLowestLevel ;
        }else{
            view.user = null ;
            view.userHighestLevel = Number.MAX_VALUE ;
            view.userLowestLevel = Number.MAX_VALUE ;
        }
    } ;
    

    extension.extendsGlobal = {} ;

    extension.extendsGlobal.userRights = {} ;
    
   


     /**
     * @typedef VeloxViewUserRightsOptions
     * @type {object}
     * @property {string} [localStorageUserKey] the local storage key to store current user (default: velox_current_user)
     */


    /**
     * Configure user rights
     * @example
     * VeloxWebView.configure({ localStorageUserKey : "custom_key" })
     * 
     * @param {VeloxViewUserRightsOptions} options the option of field schema extension
     */
    extension.extendsGlobal.userRights.configure = function(options){
        localStorageUserKey = options.localStorageUserKey || "velox_current_user" ;
    } ;



    return extension ;

})));