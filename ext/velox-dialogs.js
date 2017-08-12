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
        
    var CUSTOMBOX_VERSION = "0.0.5" ;

    var CUSTOMBOX_LIB = [
        {
            name: "custombox-css",
            type: "css",
            version: CUSTOMBOX_VERSION,
            cdn: "https://cdn.rawgit.com/dixso/custombox/$VERSION/dist/custombox.min.css",
            bowerPath: "custombox/dist/custombox.min.css"
        },
        {
            name: "custombox-js",   
            type: "js",
            version: CUSTOMBOX_VERSION,
            cdn: "https://cdn.rawgit.com/dixso/custombox/$VERSION/dist/custombox.min.js",
            bowerPath: "custombox/dist/custombox.min.js"
        }
    ];


    /**
     * object that contains Custombox class, by default try to get the global variable
     */
    var Custombox = window.Custombox ;
    var defaultWaitMessage = "";
    var customHTMLWaiter = null;
    var customHTMLInfo = null;
    var customHTMLError = null;
    var waitCount = 0;
	var showTimeout = null;
    var waiterDelay = 300;
    var currentWaiter = null;
    var infoboxEl = null;
    var errorboxEl = null;

    
    /**
     * waiter extension definition
     */
    var extension = {} ;
    extension.name = "dialogs" ;

    extension.init = function(callback){
        getCustombox(callback) ;
    } ;
    extension.extendsProto = {} ;

    function getCustombox(callback){
        if(!Custombox) {
            //no i18next object exists, load from CDN/bower
            console.debug("No Custombox object given, we will load from CDN/bower. If you don't want this, include Custombox "+CUSTOMBOX_VERSION+
                " in your import scripts or give Custombox object to VeloxWebView.waiter.configure function");

            if (!VeloxScriptLoader) {
                return callback("To have automatic script loading, you need to import VeloxScriptLoader");
            }

            VeloxScriptLoader.load(CUSTOMBOX_LIB, function(err){
                if(err){ return callback(err); }
                Custombox = window.Custombox ;
                callback(null, Custombox);
            }) ;
        } else {
            callback(null, Custombox) ;
        }
    }

    function openModal(options){
        getCustombox(function(err, Custombox){
            if(err){
                return alert("Can't get custombox lib, can't display dialog. Error : "+err) ;
            }
            var modal = new Custombox.modal(options) ;
            modal.open() ;
        }) ;
    }
    

    /**
	 * Start wait animation
     * 
     * @param {string} [message] the message to display
	 */
	extension.extendsProto.startWait = function (message) {
        if(!message){
            message = defaultWaitMessage ;
        }
        if(!message && this.tr){
            message = this.tr("pleaseWait");
        }

		if (waitCount === 0) {
			showTimeout = setTimeout(function () {//don't display waiter if less than 300ms
				showWaiter(message);
			}.bind(this), waiterDelay);
		}
		waitCount++;
    };
    
    /**
	* End wait animation
	*/
	extension.extendsProto.endWait = function () {
		waitCount--;
		if (waitCount === 0) {
			clearTimeout(showTimeout);
			hideWaiter();
		}
	};
 
    /**
	* Close all waiters
	*/
	extension.extendsProto.closeAllWaiters = function () {
		if(waitCount>0){
            waitCount = 0;
			clearTimeout(showTimeout);
			hideWaiter();
		}
	};

    /**
     * Display info box
     * 
     * @param {string} message the message to display
     * @param {function} [callback] called when user close message
     */
    extension.extendsProto.info = function (message, callback) {
        if(!infoboxEl){
            infoboxEl = document.createElement("DIV") ;
            infoboxEl.style.display = "none" ;
            document.body.appendChild(infoboxEl) ;
        }
        var html = customHTMLInfo ;
        if(!html){
            html = '<div style="background-color: #FFF; box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14), 0 9px 46px 8px rgba(0, 0, 0, 0.12);'+
                        'padding: 25px; width: 60%; position: relative;">'+
                        '<div style="position: absolute; right: 10px; top: 10px; width: 10px; height: 10px; font-family: sans-serif;font-size: 15px; cursor: pointer;" onclick="$CLOSE">X</div>'+
                        '$MESSAGE</div>' ;
        }
        var boxId = uuidv4() ;
        html = html.replace("$CLOSE", "Custombox.modal.close('"+boxId+"')") ;                    
        html = html.replace("$MESSAGE", message) ;
        infoboxEl.innerHTML = html ;
        infoboxEl.children[0].id = "velox-infobox" ;
        openModal({
            content: {
                id: boxId,
                close: true,
                clone: true,
                target: "#velox-infobox",
                delay: 0,
                onClose: callback
            },
            overlay: {
                close: false
            },
            loader: {
                active: false
            }
        }) ;
        
    } ;

    /**
     * Display error box
     * 
     * @param {string} message the message to display
     * @param {function} [callback] called when user close message
     */
    extension.extendsProto.error = function (message, callback) {
        if(!errorboxEl){
            errorboxEl = document.createElement("DIV") ;
            errorboxEl.style.display = "none" ;
            document.body.appendChild(errorboxEl) ;
        }
        var html = customHTMLError ;
        var boxId = uuidv4() ;
        if(!html){
            html = '<div style="box-shadow: rgba(236, 0, 0, 0.2) 0px 11px 15px -7px, rgba(224, 88, 88, 0.137255) 0px 24px 38px 3px, rgba(0, 0, 0, 0.117647) 0px 9px 46px 8px;'+
                        'padding: 25px; width: 60%; position: relative;color:white; background: rgba(199, 45, 45, 0.67)">'+
                        '<div style="position: absolute; right: 10px; top: 10px; width: 10px; height: 10px; font-family: sans-serif;font-size: 15px; cursor: pointer;" onclick="$CLOSE">X</div>'+
                        '$MESSAGE</div>' ;
        }

        html = html.replace("$CLOSE", "Custombox.modal.close('"+boxId+"')") ;                    

        if(typeof(message) === "object"){
			if(message && message.constructor === Error){
                if(this.tr){
                    message = this.tr("unexpectedError", {err : message.message+"\n"+message.stack}) ;
                }else{
                    message =  message.message+"\n"+message.stack ;
                }
			}else{
                if(this.tr){
                    message = this.tr("unexpectedError", {err : JSON.stringify(message)}) ;
                }else{
                    message =  JSON.stringify(message) ;
                }
			}
        }
        
        html = html.replace("$MESSAGE", message) ;
        errorboxEl.innerHTML = html ;
        errorboxEl.children[0].id = "velox-errorbox" ;
        
        openModal({
            content: {
                id: boxId,
                close: true,
                clone: true,
                target: "#velox-errorbox",
                //delay: 0,
                onClose: callback
            },
            overlay: {
                close: false
            },
            loader: {
                active: false
            }
        });
    } ;

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
    extension.extendsProto.endWaitError = function (message, callback) {
        this.endWait() ;
        this.error(message, callback) ;
    };

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
     */
    extension.extendsProto.longTask = function (doTask) {
        this.startWait() ;
        if(typeof(doTask) === "function"){
            doTask(function(error){
                if(error){ return this.endWaitError(error) ;}
                this.endWait() ;
            }.bind(this)) ;
        }else if(doTask.constructor && doTask.constructor.name === "Promise"){
            doTask.then(function(){
                this.endWait() ;
            }.bind(this)).catch(function(error){
                this.endWaitError(error) ;
            }.bind(this)) ;
        }
    };
      
    function showWaiter(message){
        var html = customHTMLWaiter ;
        if(!html){
            html = '<div class="custombox-loader" style="border-color: darkgray; border-top-color: lightgray; animation-duration: 1000ms; display: block; position: relative;margin: auto;top: initial;left: initial;"></div>'+
                    '<span style="color: white">$MESSAGE</span></div>' ;
        }
        html = html.replace("$MESSAGE", message) ;
        var waiterEl = document.getElementById("velox-waiter") ;
        if(!waiterEl){
            waiterEl = document.createElement("DIV") ;
            waiterEl.id = "velox-waiter" ;
            waiterEl.style.display = "none" ;
            document.body.appendChild(waiterEl) ;
        }
        waiterEl.innerHTML = html ;

        openModal({
            content: {
                id: "velox-waiter",
                effect: 'blur',
                close: false,
                target: "#velox-waiter",
                delay: 0
            },
            overlay: {
                close: false
            },
            loader: {
                active: false
            }
        });
        currentWaiter = true ;
    } ;

    

    function hideWaiter() {
        if(currentWaiter){
            Custombox.modal.close("velox-waiter") ;
            currentWaiter = null;
        }
    };

            
    extension.extendsGlobal = {} ;

    extension.extendsGlobal.dialogs = {} ;
    /**
     * Configure the dialogs
     * 
     * options are : 
     * {
     *       custombox : the custom box instance to use (autoloaded if not given)
     *       defaultWaitMessage : the default waiting message (tr("pleaseWait") if not given and i18n activate, "" if no i18n)
     *       customHTMLWaiter : use your custom HTML for waiter
     *       customHTMLInfo : use your custom HTML for info dialog
     *       customHTMLError : use your custom HTML for error dialog
     *       waiterDelay : waiter is displayed only after a short delay to avoid flashing on very short task. you can change this delay (default : 300)
     *   }
     * 
     * @param {object} options - Init option of dialog
     */
    extension.extendsGlobal.dialogs.configure = function(options){
        if(options.custombox){ Custombox = options.custombox ; }
        if(options.defaultWaitMessage){ defaultWaitMessage = options.defaultWaitMessage ; }
        if(options.customHTMLWaiter){ customHTMLWaiter = options.customHTMLWaiter ; }
        if(options.customHTMLInfo){ customHTMLInfo = options.customHTMLInfo ; }
        if(options.customHTMLError){ customHTMLError = options.customHTMLError ; }
        if(options.waiterDelay){ waiterDelay = options.waiterDelay ; }
    } ;
    
    extension.extendsGlobal.info = extension.extendsProto.info ;
    extension.extendsGlobal.error = extension.extendsProto.error ;
    extension.extendsGlobal.startWait = extension.extendsProto.startWait ;
    extension.extendsGlobal.endWait = extension.extendsProto.endWait ;
    extension.extendsGlobal.endWaitError = extension.extendsProto.endWaitError ;
    extension.extendsGlobal.closeAllWaiters = extension.extendsProto.closeAllWaiters ;
    extension.extendsGlobal.longTask = extension.extendsProto.longTask ;

   
    return extension ;

})));