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


  
    var confirmNoLabel = function(){ return VeloxWebView.tr?VeloxWebView.tr("global.no"):"No"; }; 
    var confirmYesLabel = function(){ return VeloxWebView.tr?VeloxWebView.tr("global.yes"):"Yes"; }; 
    var okLabel = function(){ return VeloxWebView.tr?VeloxWebView.tr("global.ok"):"OK"; }; 
    
    /**
     * waiter extension definition
     */
    var extension = {} ;
    extension.name = "bootstrap4-dialogs" ;

    
    extension.extendsProto = {} ;

    function makeDraggable($elModal){
        var $elHeader = $elModal.find(".modal-header") ;
        var draggableData = {};
        $elHeader.on('mousedown', function (event) {
            draggableData.isMouseDown = true;
            var dialogOffset = $elModal.offset();
            draggableData.mouseOffset = {
                top: event.clientY - dialogOffset.top,
                left: event.clientX - dialogOffset.left
            };
        });
        $elModal.on('mouseup mouseleave', function () {
            draggableData.isMouseDown = false;
        });
        window.jQuery('body').on('mousemove', function (event) {
            if (!draggableData.isMouseDown) {
                return;
            }
            $elModal.offset({
                top: event.clientY - draggableData.mouseOffset.top,
                left: event.clientX - draggableData.mouseOffset.left
            });
        });
    }
    
    /**
     * Display info box
     * 
     * @param {string} message the message to display
     * @param {function} [callback] called when user close message
     */
    extension.extendsProto.info = function (message, callback) {
        var modalHtml = '<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">'+
        '  <div class="modal-dialog modal-dialog-centered" role="document">'+
        '    <div class="modal-content">'+
        '      <div class="modal-header bg-info">'+
        '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
        '          <span aria-hidden="true">&times;</span>'+
        '        </button>'+
        '      </div>'+
        '      <div class="modal-body">'+
        message.replace(/\n/g, "<br />")+
        '      </div>'+
        '      <div class="modal-footer">'+
        '        <button type="button" class="btn btn-primary" data-dismiss="modal">'+okLabel()+'</button>'+
        '      </div>'+
        '    </div>'+
        '  </div>'+
        '</div>' ;
        var $modal = window.jQuery(modalHtml);
        $modal.modal() ;
        makeDraggable($modal) ;
        $modal.on('hidden.bs.modal', function () {
            callback() ;
        });
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
			if(message && message instanceof Error){
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
        
        var modalHtml = '<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">'+
        '  <div class="modal-dialog modal-dialog-centered" role="document">'+
        '    <div class="modal-content">'+
        '      <div class="modal-header bg-danger">'+
        '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
        '          <span aria-hidden="true">&times;</span>'+
        '        </button>'+
        '      </div>'+
        '      <div class="modal-body">'+
        message.replace(/\n/g, "<br />")+
        '      </div>'+
        '      <div class="modal-footer">'+
        '        <button type="button" class="btn btn-primary" data-dismiss="modal">'+okLabel()+'</button>'+
        '      </div>'+
        '    </div>'+
        '  </div>'+
        '</div>' ;
        var $modal = window.jQuery(modalHtml);
        $modal.modal() ;
        makeDraggable($modal) ;
        if(callback){
            $modal.on('hidden.bs.modal', function () {
                callback() ;
            });
        }
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
        if(options.keyboard === undefined){
            options.keyboard = true ;
        }
        if(options.closeWithEsc === false && options.closeByClickOutside === undefined){
            options.closeByClickOutside = false ;
        }
        if(options.closeByClickOutside === false){
            options.backdrop = "static" ;
        }
        

        var $modal = null;
        this.closePopup = function(){
            if($modal){
                $modal.on('hidden.bs.modal', function () {
                    window.jQuery(this).data('bs.modal', null);
                });
                $modal.modal('hide') ;
            }
        } ;
        this.close = function(){
            VeloxWebView.prototype.close.apply(this) ;
            this.closePopup() ;
        } ;

        var modalHtml = '<div class="modal fade" data-focus="false" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">'+
        '  <div class="modal-dialog modal-dialog-centered" role="document">'+
        '    <div class="modal-content">'+
        '      <div class="modal-header">'+
        '        <h5 class="modal-title">'+(options.title||'&nbsp;')+'</h5>' ;
        if(options.closeable === true || options.closeable === undefined){
            modalHtml += '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
            '          <span aria-hidden="true">&times;</span>'+
            '        </button>' ;
        } 
        modalHtml += '      </div>'+
        '      <div class="modal-body">'+
        '      </div>'+
        '    </div>'+
        '  </div>'+
        '</div>' ;
        $modal = window.jQuery(modalHtml);
        if(options.zIndex){
            $modal[0].style.zIndex = options.zIndex ; 
        }

        this.options.container = $modal.find(".modal-body")[0];
        this.open(function(err){
            if(err){ return callback(err) ;}
            $modal.modal(options) ;
            if(options.draggable){
                makeDraggable($modal) ;
            }
            $modal.on('shown.bs.modal', function () {
                this.emit("popupOpen") ;
                callback() ;
            }.bind(this)) ;
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

        options.keyboard = options.closeWithEsc||true;
        
        var modalHtml = '<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">'+
        '  <div class="modal-dialog modal-dialog-centered" role="document">'+
        '    <div class="modal-content">'+
        '      <div class="modal-header">'+
        '        <h5 class="modal-title">'+(options.title||'&nbsp;')+'</h5>'+
        '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
        '          <span aria-hidden="true">&times;</span>'+
        '        </button>'+
        '      </div>'+
        '      <div class="modal-body">'+
        '      </div>'+
        '    </div>'+
        '  </div>'+
        '</div>' ;
        var $modal = window.jQuery(modalHtml);

        var contentEl = $modal.find(".modal-body")[0];
        if(typeof(htmlOrElement) === "string"){
            contentEl.innerHTML = htmlOrElement ;
        }else{
            contentEl.appendChild(htmlOrElement) ;
        }
        $modal.modal(options) ;
        if(options.draggable){
            makeDraggable($modal) ;
        }
        $modal.on('shown.bs.modal', function () {
            callback() ;
        }) ;
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

        var labelYes = options.yesLabel||confirmYesLabel() ;
        if(!labelYes){
            labelYes = VeloxWebView.tr?VeloxWebView.tr("global.yes"):"Yes";
        }
        var labelNo = options.noLabel||confirmNoLabel() ;
        if(!labelNo){
            labelNo = VeloxWebView.tr?VeloxWebView.tr("global.no"):"No";
        }

        var modalHtml = '<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">'+
        '  <div class="modal-dialog modal-dialog-centered" role="document">'+
        '    <div class="modal-content">'+
        '      <div class="modal-header bg-secondary">'+
        '        <h5 class="modal-title">'+(options.title||'&nbsp;')+'</h5>'+
        '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
        '          <span aria-hidden="true">&times;</span>'+
        '        </button>'+
        '      </div>'+
        '      <div class="modal-body">'+
        message.replace(/\n/g, "<br />")+
        '      </div>'+
        '      <div class="modal-footer">'+
        '        <button type="button" class="btn btn-secondary btn-no">'+labelNo+'</button>'+
        '        <button type="button" class="btn btn-primary btn-yes">'+labelYes+'</button>'+
        '      </div>'+
        '    </div>'+
        '  </div>'+
        '</div>' ;
        var $modal = window.jQuery(modalHtml);
        $modal.modal() ;
        var $btnYes = $modal.find(".btn-yes");
        var $btnNo = $modal.find(".btn-no");
        makeDraggable($modal) ;
        $modal.on('shown.bs.modal', function () {
            options.focusToNoButton?$btnNo.focus():$btnYes.focus() ;
        });
        $btnYes.on("click", function(){
            $modal.modal("hide");
            callback(true) ;
        });
        $btnNo.on("click", function(){
            $modal.modal("hide");
            callback(false) ;
        });
    } ;

            
    extension.extendsGlobal = {} ;

    extension.extendsGlobal.dialogs = {} ;


     /**
     * @typedef VeloxDialogGlobalOptions
     * @type {object}
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
        if(options.confirmYesLabel){ confirmYesLabel = options.confirmYesLabel ; }
        if(options.confirmNoLabel){ confirmNoLabel = options.confirmNoLabel ; }
    } ;
    
    extension.extendsGlobal.info = extension.extendsProto.info ;
    extension.extendsGlobal.error = extension.extendsProto.error ;
    extension.extendsGlobal.confirm = extension.extendsProto.confirm ;
    extension.extendsGlobal.popup = extension.extendsProto.popup ;

   
    return extension ;

})));