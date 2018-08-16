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
     * field extension definition
     */
    var extension = {} ;
    extension.name = "keyboard" ;

    /**
     * contains loaded libs
     */
    var libs = {} ;

    /**
     * called on view prepare
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
        //doPrepareView.bind(view)(params, cb) ;
        cb() ;
    } ;
    extension.extendsGlobal = {} ;
    extension.extendsProto = {} ;

    
    /**
     * Global object to access to charts configuration
     */
    extension.extendsGlobal.keyboard = {
        /**
         * load configuration
         * 
         * The options object should contains a libs property with instance of libraries object 
         * if they are not available from window object and you don't want them to be loaded by CDN/bower
         * 
         * @param {object} options the configuration options
         */
        configure : function(options){
            if(options.libs) {
                Object.keys(options.libs).forEach(function(k){
                    libs[k] = options.libs[k] ;
                }) ;
            }
        }
    } ;


    /**
     * init view keyboards
     * 
     * get all HTML elements having data-keyboard attribute
     * 
     * @private
     */
    function doInitView(){
        var view = this;
        var elements = this.elementsHavingAttribute("data-keyboard");
        for(var i=0; i<elements.length; i++){
            var element = elements[i] ;
            var keyboardType = element.getAttribute("data-keyboard") ;
            var keyboardOptions = {} ;
            Array.prototype.slice.call(element.attributes).forEach(function(att){
                var startIndex = "data-keyboard-".length ;
                var attKey = att.name ;
                if(attKey.indexOf("data-keyboard") === 0 && attKey.length > startIndex){
                    keyboardOptions[attKey.substring(startIndex)] = element.getAttribute(attKey) ;
                }
            }) ;
            createKeyboard(view, element, keyboardType, keyboardOptions) ;
        }
    }

    function triggerEvent(element, eventOrName){
        var ev;
        if(typeof(Event) === 'function') {
            //normal browser
            if(typeof(eventOrName) === "string"){
                ev = new Event(eventOrName);
            }else{
                ev = new eventOrName.constructor(eventOrName.type, eventOrName);
            }
        }else{
            //IE
            if(typeof(eventOrName) === "string"){
                ev = document.createEvent('Event');
                ev.initEvent(eventOrName, true, true);
            }else{
                ev = document.createEvent('Event');
                ev.initEvent(eventOrName.type, true, true);
            }
        }
        element.dispatchEvent(ev);
    }
    


    /**
     * Create the keyboard
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} keyboardType the field type
     * @param {object} keyboardOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */
    function createKeyboard(view, element, keyboardType, keyboardOptions){
        //dispatch bound event on container element
        view.emit('beforeInitKeyboard', {id: element.getAttribute("data-original-id"), element: element, chartType: keyboardType, chartOptions: keyboardOptions});
        _createKeyboard(element, keyboardType, keyboardOptions, view) ;
        view.emit('afterInitKeyboard', {id: element.getAttribute("data-original-id"), element: element, chartType: keyboardType, chartOptions: keyboardOptions});
    }

    /**
     * Create the chart
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} keyboardType the field type
     * @param {object} keyboardOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */ 
    function _createKeyboard(element, keyboardType, keyboardOptions, view){
        if(keyboardType === "number"){
            createNumpad(element, keyboardType, keyboardOptions, view) ;
        } else {
            throw "Unknow chart type "+keyboardType ; 
        }
    }

    var divContainer = null;

    function createNumpad(element, keyboardType, keyboardOptions, view){
        element.showKeyboard = function(){
            var openList = document.querySelectorAll(".velox-keyboard-open");
            for(var i=0; i<openList.length; i++){
                openList[i].className = openList[i].className.replace("velox-keyboard-open", "") ;
            }
            element.className += " velox-keyboard-open" ;

            var htmlPad =  '<div class="velox-numpad-container">'                                 ;
                htmlPad += '  <div class="velox-numpad-row">'                                     ;
                htmlPad += '    <div class="velox-numpad-header">'                                ;
                htmlPad += '      <button id="backspace" class="velox-numpad-backspace" data-emit> &lt; </button>'               ;
                htmlPad += '    </div>'                                                           ;
                htmlPad += '  </div>'                                                             ;
                htmlPad += '  <div data-bind="rows[]" class="velox-numpad-row">'                  ;
                htmlPad += '    <div data-bind="items[]" class="velox-numpad-item">'              ;
                htmlPad += '       <div data-show-if="value">'                                    ;
                htmlPad += '           <button id="value" data-emit data-bind="value"></button>'  ;
                htmlPad += '       </div>'                                                        ;
                htmlPad += '       <div data-show-if="action">'                                   ;
                htmlPad += '           <button id="action" data-emit data-bind="label"></button>' ;
                htmlPad += '       </div>'                                                        ;
                htmlPad += '    </div>'                                                           ;
                htmlPad += '  </div>'                                                             ;
                htmlPad += '</div>'                                                               ;

            var cssPad = ".velox-numpad-container { border: 1px solid #DDD; display: flex; flex-direction: column; border-radius: 5px; } " ;
            cssPad += ".velox-numpad-row { display: flex; flex-direction: row; justify-content: space-between; } " ;
            cssPad += ".velox-numpad-item { width: 200px; height: 80px; margin: 5px;} " ;
            cssPad += ".velox-numpad-item button{ width: 100%; height: 100%; background: transparent; border: 1px solid #999; border-radius: 5px;} " ;
            cssPad += ".velox-numpad-header { width: 100%;} " ;
            cssPad += ".velox-numpad-backspace { background: transparent; border: 1px solid #999; border-radius: 5px; margin: 5px; width: 50px; float: right;} " ;

            var keys = {
                rows: [
                    { items: [ { value: 1     }, { value: 2   }, { value: 3                          } ] },
                    { items: [ { value: 4     }, { value: 5   }, { value: 6                          } ] },
                    { items: [ { value: 7     }, { value: 8   }, { value: 9                          } ] },
                    { items: [ { value: "0"   }, { value: "." }, { value: "000"                      } ] },
                ]
            } ;

            if(!divContainer){
                divContainer = document.createElement("DIV") ;
            }

            if(keyboardOptions.container){
                document.getElementById(element.getAttribute("data-keyboard-container")).appendChild(divContainer) ;
            }else{
                var nextElement = element.nextElementSibling ;
                if(nextElement){
                    element.parentElement.insertBefore(divContainer, nextElement);
                }else{
                    element.parentElement.appendChild(divContainer);
                }
            }

            var viewOptions = {
                container: divContainer,
                html: htmlPad,
                bindObject: keys,
                css: cssPad
            } ;
            var padView = new VeloxWebView(null, null, viewOptions);
            padView.open() ;
            var valueBefore = element.value ;
            if(element.getValue){
                valueBefore = element.getValue() ;
            }
            var currentValue = "" ;
            padView.on("value", function(ev){
                var item = ev.data.data ;
                currentValue = currentValue+(""+item.value) ;
                if(element.setValue){
                    element.setValue(Number(currentValue)) ;
                }else{
                    element.value = currentValue ;
                }
                triggerEvent(element, "change") ;
            }) ;
            padView.on("backspace", function(){
                currentValue = currentValue.substring(0, currentValue.length-1) ;
                if(element.setValue){
                    element.setValue(Number(currentValue)) ;
                }else{
                    element.value = currentValue ;
                }
                triggerEvent(element, "change") ;
            }) ;
            padView.on("action", function(ev){
                var item = ev.data.data ;
                if(item.action === "validate"){
                    padView.close() ;
                    triggerEvent(element, "keyboardValidate");
                }else if(item.action === "cancel"){
                    if(element.setValue){
                        element.setValue(valueBefore) ;
                    }else{
                        element.value = valueBefore ;
                    }
                    padView.close() ;
                    triggerEvent(element, "keyboardCancel");
                    triggerEvent(element, "change") ;
                }
            }) ;
        } ;
        
        if(keyboardOptions.onfocus !== undefined){
            element.addEventListener("focus", function(){
                element.showKeyboard() ;
            }) ;
        }
    }


    return extension ;

})));