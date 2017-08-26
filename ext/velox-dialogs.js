/*global VeloxWebView */

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


  
        
    var JQUERY_VERSION = "3.2.1" ;
    var W2UI_VERSION = "1.5.rc1" ;
    

    var JQUERY_LIB = {
        name: "jquery",
        type: "js",
        version: JQUERY_VERSION,
        cdn: "http://code.jquery.com/jquery-$VERSION.min.js",
        bowerPath: "jquery/dist/jquery.min.js"
    } ;

    var W2UI_LIB = [
        JQUERY_LIB,
        {
            name: "w2ui-css",
            type: "css",
            version: W2UI_VERSION,
            
            cdn: "http://rawgit.com/vitmalina/w2ui/master/dist/w2ui.min.css",
            bowerPath: "w2ui/dist/w2ui.min.css"
        },
        {
            name: "w2ui-js",
            type: "js",
            version: W2UI_VERSION,
            cdn: "http://rawgit.com/vitmalina/w2ui/master/dist/w2ui.min.js",
            bowerPath: "w2ui/dist/w2ui.min.js"
        }
    ];


    /**
     * object that contains Custombox class, by default try to get the global variable
     */
    var w2utils = window.w2utils ;
    var w2alert = window.w2alert ;
    var w2confirm = window.w2confirm ;
    var w2prompt = window.w2prompt ;
    var w2popup = window.w2popup ;
    var defaultWaitMessage = "";
    var confirmNoLabel = null;
    var confirmYesLabel = null;
    var waitCount = 0;
	var showTimeout = null;
    var waiterDelay = 300;
    
    
    /**
     * waiter extension definition
     */
    var extension = {} ;
    extension.name = "dialogs" ;

    extension.init = function(callback){
        loadW2ui(callback) ;
    } ;
    extension.extendsProto = {} ;

    function loadW2ui(callback){
        if(!w2utils) {
            //no w2utils object exists, load from CDN/bower
            console.debug("No W2UI object given, we will load from CDN/bower. If you don't want this, include W2UI "+W2UI_VERSION+
                " in your import scripts or give w2utils object to VeloxWebView.waiter.configure function");

            if (!VeloxScriptLoader) {
                return callback("To have automatic script loading, you need to import VeloxScriptLoader");
            }

            VeloxScriptLoader.load(W2UI_LIB, function(err){
                if(err){ return callback(err); }
                w2utils = window.w2utils ;
                w2alert = window.w2alert ;
                w2confirm = window.w2confirm ;
                w2prompt = window.w2prompt ;
                w2popup = window.w2popup ;
                callback(null, w2utils);
            }) ;
        } else {
            callback(null, w2utils) ;
        }
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
        loadW2ui(function(){
            w2alert(message, '&nbsp;', callback);
        }.bind(this)) ;
    } ;

    /**
     * Display error box
     * 
     * @param {string} message the message to display
     * @param {function} [callback] called when user close message
     */
    extension.extendsProto.error = function (message, callback) {
        if(typeof(message) === "object"){
            console.error("unexpected error", message) ;
			if(message && message.constructor === Error){
                if(this.tr){
                    message = this.tr("global.unexpectedError", {err : message.message+"\n"+message.stack}) ;
                }else{
                    message =  message.message+"\n"+message.stack ;
                }
			}else{
                if(this.tr){
                    message = this.tr("global.unexpectedError", {err : JSON.stringify(message)}) ;
                }else{
                    message =  JSON.stringify(message) ;
                }
			}
        }
        
        loadW2ui(function(){
            w2alert(message, '&nbsp;', function(){
                window.jQuery("#w2ui-popup").css("box-shadow", "0 0 25px #555");
                if(callback){
                    callback();
                }
            });
            window.jQuery("#w2ui-popup").css("box-shadow", "0 0 25px rgba(255, 48, 0, 0.75") ;
        });
    } ;

    /**
     * @typedef VeloxPopupOptions
     * @type {object}
     * @property {boolean} [modal] indicates if modal (defaut false)
     * @property {string} [title] Title (default '')
     * @property {number} [width] width (pixels) (default 500)
     * @property {number} [height] height (pixels) (default 300)
     * @property {boolean} [closeWithEsc] close when user press ESC (default true)
     */

    /**
     * Open the view in a popup
     * 
     * @param {VeloxPopupOptions} [options] popup options
     * @param {function} callback called when opened
     */
    extension.extendsProto.openInPopup = function (options, callback) {
        if(typeof(options) === "function"){
            callback = options;
            options = null ;
        }
        if(!options){options = {} ;}

        if(!callback){ callback = function(){} ;}

        options.keyboard = options.closeWithEsc ;
        options.onOpen = callback ;

        var popup = null;
        this.closePopup = function(){
            if(popup){
                popup.close() ;
            }
        } ;

        // if(!options.width){
        //     var windowWidth = window.innerWidth ;
        //     if(windowWidth > 1000){
        //         options.width = windowWidth/2;
        //     }else if(windowWidth > 500){
        //         options.width = windowWidth * 0.66;
        //     }else{
        //         options.width = windowWidth - 30;
        //     }
        // }

        this.options.container = document.createElement("DIV");
        this.open(function(err){
            if(err){ return callback(err) ;}
            options.body = '<div id="velox_popup_body"></div>' ;

            if(!options.width){
                //no width given, use the view width
                options.width = window.jQuery(this.options.container).width() ;
            }
            if(!options.height){
                //no height given, use the view height + 32 (title bar height)
                options.height = window.jQuery(this.options.container).height() + 32 ;
            }
            if(!options.title){
                //add an empty title to have the close button
                options.title = "&nbsp;" ;
            }

            options.onOpen = function(ev){
                ev.onComplete = function(){
                    //append the view in the opened popup
                    document.getElementById("velox_popup_body").appendChild(this.options.container) ;
                    callback() ;
                }.bind(this) ;
            }.bind(this) ;

            loadW2ui(function(){
                popup = w2popup.open(options);
            });
            
            //window.jQuery(this.container).w2popup(options) ;
        }.bind(this)) ;
    } ;

    /**
     * Open HTML or an element in popup
     * 
     * @param {string|HTMLElement} htmlOrElement the HTML or element to display in popup
     * @param {VeloxPopupOptions} [options] popup options
     * @param {function} callback called when opened
     */
    extension.extendsProto.popup = function (htmlOrElement, options, callback) {
        if(typeof(options) === "function"){
            callback = options;
            options = null ;
        }
        if(!options){options = {} ;}

        if(!callback){ callback = function(){} ;}

        options.keyboard = options.closeWithEsc ;
        options.onOpen = callback ;

        if(!options.width){
            var windowWidth = window.innerWidth ;
            if(windowWidth > 1000){
                options.width = windowWidth/2;
            }else if(windowWidth > 500){
                options.width = windowWidth * 0.66;
            }else{
                options.width = windowWidth - 30;
            }
        }

        // if(!options.height){
        //     var windowHeight = window.innerHeight ;
        //     options.height = windowHeight/2;
        // }
        
        if(typeof(htmlOrElement) === "object"){
            loadW2ui(function(){
                window.jQuery(htmlOrElement).w2popup(options) ;
            });
        }else{
            var container = document.createElement("DIV");
            document.body.appendChild(container) ;
            var v = new VeloxWebView(null, null, {
                container: container,
                html: htmlOrElement,
                css: ""
            });
            v.openInPopup(options, callback) ;
        }
    } ;

     /**
     * @typedef VeloxDialogConfirmOptions
     * @type {object}
     * @property {boolean} focusToNoButton Focus to the NO button instead of YES button
     * @property {string} yesLabel Yes button label
     * @property {string} noLabel No button label
     */

     /**
     * This callback is called when user answer confirm dialong
     * @callback VeloxDialogConfirmCallback
     * @param {boolean} yes is user answer YES ?
     */

    /**
     * Display confirm box
     * 
     * @param {string} message the message to display
     * @param {VeloxDialogConfirmOptions} [options] display options
     * @param {VeloxDialogConfirmCallback} callback called when user answer dialog
     */
    extension.extendsProto.confirm = function (message, options, callback) {
        if(typeof(options) === "function"){
            callback = options;
            options = {} ;
        }
        if(!options){ options = {} ; }

        var labelYes = options.yesLabel||confirmYesLabel ;
        if(!labelYes){
            labelYes = VeloxWebView.tr?VeloxWebView.tr("global.yes"):"Yes";
        }
        var labelNo = options.noLabel||confirmNoLabel ;
        if(!labelNo){
            labelNo = VeloxWebView.tr?VeloxWebView.tr("global.no"):"No";
        }

        loadW2ui(function(){
            w2confirm({
                msg : message,
                title : "&nbsp;",
                focus_to_no : options.focusToNoButton,
                btn_yes: {
                    text: labelYes,
                    callback: function(){
                        callback(true) ;
                    }
                },
                btn_no: {
                    text: labelNo,
                    callback: function(){
                        callback(false) ;
                    }
                }
            }) ;
        }) ;
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
     * 
     * @param {function(done)} doTask the function that do the task and call done on finish
     * @param {function(err)} [callback] called when the long task is done
     */
    extension.extendsProto.longTask = function (doTask, callback) {
        if(!callback){ callback = function(){} ;}
        this.startWait() ;
        if(typeof(doTask) === "function"){
            doTask(function(error){
                if(error){ this.endWaitError(error) ; return callback(error) ;}
                this.endWait() ;
                callback() ;
            }.bind(this)) ;
        }else if(doTask.constructor && doTask.constructor.name === "Promise"){
            doTask.then(function(){
                this.endWait() ;
                callback() ;
            }.bind(this)).catch(function(error){
                this.endWaitError(error) ;
                callback(error) ;
            }.bind(this)) ;
        }
    };
      
    function showWaiter(message){
        loadW2ui(function(){
            w2utils.lock(document.body, message, true) ;
        });
    } ;
    
    
    
    function hideWaiter() {
        loadW2ui(function(){
            w2utils.unlock(document.body) ;
        });
    };

            
    extension.extendsGlobal = {} ;

    extension.extendsGlobal.dialogs = {} ;


     /**
     * @typedef VeloxDialogGlobalOptions
     * @type {object}
     * @property {Custombox} [custombox] the custom box instance to use (autoloaded if not given)
     * @property {string} [defaultWaitMessage] the default waiting message (tr("global.pleaseWait") if not given and i18n activate, "" if no i18n)
     * @property {string} [waiterDelay] waiter is displayed only after a short delay to avoid flashing on very short task. you can change this delay (default : 300)
     * @property {string} [customHTMLWaiter] use your custom HTML for waiter
     * @property {string} [customHTMLInfo] use your custom HTML for info
     * @property {string} [customHTMLError] use your custom HTML for error
     * @property {string} [customHTMLConfirm] use your custom HTML for confirm
     * @property {string} [confirmYesLabel] the default YES label in confirm (tr("global.yes") if not given and i18n activate, "Yes" if no i18n)
     * @property {string} [confirmNoLabel] the default NO label in confirm (tr("global.no") if not given and i18n activate, "No" if no i18n)
     */


    /**
     * Configure the dialogs
     * 
     * options are : 
     * {
     *       custombox : 
     *        : 
     *       customHTMLWaiter : 
     *        : use your custom HTML for info dialog
     *        : use your custom HTML for error dialog
     *        : 
     *   }
     * 
     * @param {object} options - Init option of dialog
     */
    extension.extendsGlobal.dialogs.configure = function(options){
        if(options.w2utils){ w2utils = options.w2utils ; }
        if(options.w2alert){ w2alert = options.w2alert ; }
        if(options.w2confirm){ w2confirm = options.w2confirm ; }
        if(options.w2prompt){ w2prompt = options.w2prompt ; }
        if(options.w2popup){ w2popup = options.w2popup ; }
        if(options.defaultWaitMessage){ defaultWaitMessage = options.defaultWaitMessage ; }
        if(options.confirmYesLabel){ confirmYesLabel = options.confirmYesLabel ; }
        if(options.confirmNoLabel){ confirmNoLabel = options.confirmNoLabel ; }
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