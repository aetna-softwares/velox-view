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
    extension.name = "charts" ;

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
        doPrepareView.bind(view)(params, cb) ;
    } ;
    extension.extendsGlobal = {} ;
    extension.extendsProto = {} ;

    
    /**
     * Global object to access to charts configuration
     */
    extension.extendsGlobal.charts = {
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
        },

        loadFieldLib: function(fieldType, fieldOptions, callback){
            setNeededLib(fieldType, fieldOptions) ;
            loadLibs(callback) ;
        }
    } ;


    /**
     * Create the chart
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} fieldType the field type
     * @param {object} fieldOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */
    extension.extendsProto.createChart = function(element, fieldType, fieldOptions, callback){
        setNeededLib(fieldType, fieldOptions) ;
        loadLibs(function(err){
            if(err){ return callback(err) ;}
            createChart(this, element, fieldType, fieldOptions) ;
            callback() ;
        }.bind(this)) ;
    } ;

    ///// DEPENDENCIES LIBRARIES LOADING ////////
    var ECHARTS_VERSION = "4.1.0"; 

    var ECHARTS_LIB = {
        name: "echarts",
        type: "js",
        version: ECHARTS_VERSION,
        cdn: "https://cdnjs.cloudflare.com/ajax/libs/echarts/$VERSION/echarts.min.js",
        bowerPath: "echarts/dist/echarts.min.js",
        npmPath: "echarts/dist/echarts.min.js",
    } ;
   
    extension.libs = [
        ECHARTS_LIB
    ] ;



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
     * init view charts
     * 
     * get all HTML elements having data-field attribute
     * 
     * @private
     */
    function doPrepareView(params, callback){
        var elements = params.doc.querySelectorAll("[data-chart]");
        for(var i=0; i<elements.length; i++){
            (function (element){
                var fieldType = element.getAttribute("data-chart") ;
                var fieldOptions = {} ;
                Array.prototype.slice.call(element.attributes).forEach(function(att){
                    var startIndex = "data-chart-".length ;
                    var attKey = att.name ;
                    if(attKey.indexOf("data-chart") === 0 && attKey.length > startIndex){
                        fieldOptions[attKey.substring(startIndex)] = element.getAttribute(attKey) ;
                    }
                }) ;
                setNeededLib(fieldType, fieldOptions) ;
            })(elements[i]) ;
        }
        loadLibs(function(err){
            if(err){ return callback(err) ;}

            // var elements = Array.prototype.slice.apply(params.doc.querySelectorAll("[data-cell-view]"));
            // var compiles = [] ;
            // this.cellViews = {} ;
            // elements.forEach(function(el, i){
            //     el.parentElement.setAttribute("data-cell-view-id", i) ;
            //     el.removeAttribute("data-cell-view") ;
            //     compiles.push(function(cb){
            //         this.cellViews[i] = el;
            //         var cellView = new VeloxWebView(null, null, {htmlEl : el});
            //         cellView.compileView(cb) ;
            //     }.bind(this)) ;
            // }.bind(this)) ;
            // series(compiles, callback) ;
            callback() ;
        }.bind(this)) ;
    }

    /**
     * init view charts
     * 
     * get all HTML elements having data-field attribute
     * 
     * @private
     */
    function doInitView(){
        var view = this;
        var elements = this.elementsHavingAttribute("data-chart");
        for(var i=0; i<elements.length; i++){
            var element = elements[i] ;
            var chartType = element.getAttribute("data-chart") ;
            var chartOptions = {} ;
            Array.prototype.slice.call(element.attributes).forEach(function(att){
                var startIndex = "data-chart-".length ;
                var attKey = att.name ;
                if(attKey.indexOf("data-chart") === 0 && attKey.length > startIndex){
                    chartOptions[attKey.substring(startIndex)] = element.getAttribute(attKey) ;
                }
            }) ;
            createChart(view, element, chartType, chartOptions) ;
        }
    }

    var libsToLoad = {} ;

    function setLibToLoad(name, loader){
        if(!libsToLoad[name]){
            libsToLoad[name] = {loader:loader, status: "to_load"} ;
        }
    }   

    function loadLibs(callback){
        var calls = [] ;
        Object.keys(libsToLoad).forEach(function(k){
            if(libsToLoad[k].status === "to_load"){
                calls.push(function(cb){
                    libsToLoad[k].loader(function(err){
                        if(err){
                            return cb(err) ;
                        }
                        libsToLoad[k].status = "done" ;
                        cb() ;
                    }) ;
                });
            }
        });
        VeloxWebView._asyncSeries(calls, callback) ;
    }

    function setNeededLib(chartType, chartOptions){
        setLibToLoad("echarts", function(done){
            loadLib("echarts", ECHARTS_VERSION, ECHARTS_LIB, done) ;
        }) ;
    }

    /**
     * Create the chart
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} chartType the field type
     * @param {object} chartOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */
    function createChart(view, element, chartType, chartOptions){
        //dispatch bound event on container element
        view.emit('beforeInitChart', {id: element.getAttribute("data-original-id"), element: element, chartType: chartType, chartOptions: chartOptions});
        _createChart(element, chartType, chartOptions, view) ;
        view.emit('afterInitChart', {id: element.getAttribute("data-original-id"), element: element, chartType: chartType, chartOptions: chartOptions});
    }

    /**
     * Create the chart
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} chartType the field type
     * @param {object} chartOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */ 
    function _createChart(element, chartType, chartOptions, view){
        if(chartType === "pie" || chartType === "donut"){
            createPie(element, chartType, chartOptions, view) ;
        } else if(chartType === "bar" || chartType === "barv" || chartType === "barh"){
            createBar(element, chartType, chartOptions, view) ;
        } else {
            throw "Unknow chart type "+chartType ; 
        }
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

    function sanitizeValue(val){
        val = val.trim() ;
        if(val[0]==="'" && val[val.length-1]==="'"){
            val = val.substring(1, val.length-1) ;
        }
        if(val[0]==='"' && val[val.length-1]==='"'){
            val = val.substring(1, val.length-1) ;
        }
        return val;
    }
    function parseCssStyle(str){
        var obj = {} ;
        var currentProp = "";
        var currentValue = "";
        var inProp = true;
        var inComplexValue = false;
        for(var i=0; i<str.length; i++){
            var c = str[i] ;
            if(inProp && c === ":"){
                inProp = false;
                currentValue = "";
            }else{
                if(inProp){
                    if(/[^\s]/.test(c)){
                        currentProp += c ;
                    }
                }else{
                    if(!currentValue && c === "{"){
                        inComplexValue = true ;
                    }else{
                        if(inComplexValue && c === "}"){
                            inComplexValue = false;
                            obj[currentProp] = parseCssStyle(currentValue.trim()) ;
                            currentValue = "";
                        }else if(!inComplexValue && c === ","){
                            inProp = true;
                            if(currentValue){
                                obj[currentProp] = sanitizeValue(currentValue) ;
                            }
                            currentProp = "";
                            currentValue = "";
                        }else{
                            if(/[^\s]/.test(c) || currentValue){
                                currentValue += c ;
                            }
                        }
                    }
                }
            }
        }
        if(currentProp){
            obj[currentProp] = sanitizeValue(currentValue) ;
        }
        return obj ;
    }

    function commonChartInit(element, option){
        if(element.hasAttribute("data-title")){
            var customTitle = parseCssStyle(element.getAttribute("data-title")) ;
            if(!option.title){ 
                option.title = customTitle ;
            }else{
                Object.keys(customTitle).forEach(function(k){
                    option.title[k] = customTitle[k] ;
                }) ;
            }
        }
        if(element.hasAttribute("data-tooltip")){
            var customTooltip = parseCssStyle(element.getAttribute("data-tooltip")) ;
            if(!option.tooltip){ 
                option.tooltip = customTooltip ;
            }else{
                Object.keys(customTooltip).forEach(function(k){
                    option.tooltip[k] = customTooltip[k] ;
                }) ;
            }
        }

        if(element.hasAttribute("data-label")){
            if(option.series[0]){
                var customLabel = parseCssStyle(element.getAttribute("data-label")) ;
                if(!option.series[0].label){ 
                    option.series[0].label = customLabel ;
                }else{
                    Object.keys(customLabel).forEach(function(k){
                        option.series[0].label[k] = customLabel[k] ;
                    }) ;
                }
            }
        }

        if(element.hasAttribute("data-legend")){
            var customLegend = parseCssStyle(element.getAttribute("data-legend")) ;
            if(!option.legend){ 
                option.legend = customLegend ;
            }else{
                Object.keys(customLegend).forEach(function(k){
                    option.legend[k] = customLegend[k] ;
                }) ;
            }
        }


        if(element.hasAttribute("data-label-inside")){
            if(option.series[0]){
                option.series[0].label = {
                    show: true,
                    position: "inside",
                    formatter: "{c}",
                    fontSize: 48,
                } ;
            }
        }

        if(element.hasAttribute("data-no-label")){
            if(option.series[0]){
                option.series[0].label = {
                    show: false
                } ;
            } 
        }

        if(element.hasAttribute("data-no-legend")){
            if(option.legend){
                option.legend.show = false;
            }else{
                option.legend = { show : false} ;
            }
        }
        if(element.hasAttribute("data-no-tooltip")){
            if(option.tooltip){
                option.tooltip.show = false;
            }else{
                option.tooltip = { show : false} ;
            }
        }
    }

    /**
     * Create a pie chart
     * 
     * @param {HTMLElement} element HTML element to transform
     * @param {"pie"|"donut"} chartType the field type
     * @param {object} fieldOptions field option (from attributes)
     * @param {function(Error)} callback called when finished
     */
    function createPie(element, chartType, fieldOptions, view){
        var option = {} ;

        var serieName = "";
        var elLabel = element.querySelector("label") ;
        if(elLabel){
            option.title = { text: elLabel.innerHTML, x:'center' } ;
            serieName = elLabel.innerHTML;
        }

        option.tooltip = {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c} ({d}%)"
        };

        var data = {legendData : [], selected: {}, seriesData: []};
        
        var colors = [] ;
        var elTable = element.querySelector("table") ;
        if(elTable){
            var ths = elTable.querySelectorAll("th") ;
            for(var i=0; i<ths.length; i++){
                var th = ths[i];
                var label = th.innerHTML;
                data.legendData.push(th.innerHTML) ;
                data.selected[label] = !th.hasAttribute("data-selected")||th.getAttribute("data-selected")==="true" ;
                if(th.hasAttribute("data-color")){
                    colors.push(th.getAttribute("data-color")) ;
                }
            }
            var tds = elTable.querySelectorAll("td") ;
            for(var i=0; i<tds.length; i++){
                var td = tds[i];
                var label = data.legendData[i];
                var value = Number(td.innerHTML) ;
                data.seriesData.push({
                    name: label,
                    value: value
                }) ;
            }
            var caption = elTable.querySelector("caption") ;
            if(caption){
                serieName = caption.innerHTML ;
            }
        }

        if(colors.length>0){
            option.color = colors ;
        }

        option.legend = {
            type: 'scroll',
            orient: 'horizontal',
            top: 20,
            data: data.legendData,
            selected: data.selected
        };

        option.series = [
            {
                name: serieName,
                type: 'pie',
                radius : chartType==="donut"?['50%', '70%']:'50%',
                //center: ['40%', '50%'],
                data: data.seriesData,
                itemStyle: {
                    emphasis: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ] ;

        commonChartInit(element, option) ;


        var myChart = echarts.init(element);

        
        myChart.setOption(option);
        
        var currentValue = data.seriesData ;

        /**
         * 
         * @param {Array} value array [{name: "", value: 123}]
         */
        element.setValue = function(value){
            currentValue = value;
            option.legend.data = value.map(function(v){ return v.name ;});
            option.series[0].data = value;
            myChart.setOption(option);
        } ;

        element.getValue = function(){
            return currentValue;
        } ;

        view.ensureDisplayed(function(){
            myChart.resize() ;
        });

        view.on("render", function(){
            commonChartInit(element, option) ;
            myChart.setOption(option);
        }) ;
    }
    
    /**
     * Create a bar chart
     * 
     * @param {HTMLElement} element HTML element to transform
     * @param {"bar"|"barv"|"barh"} chartType the field type
     * @param {object} fieldOptions field option (from attributes)
     * @param {function(Error)} callback called when finished
     */
    function createBar(element, chartType, fieldOptions, view){
        var option = {} ;

        var serieName = "";
        var elLabel = element.querySelector("label") ;
        if(elLabel){
            option.title = { text: elLabel.innerHTML, x:'center' } ;
            serieName = elLabel.innerHTML;
        }

        option.tooltip = {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c}"
        };

        var data = {xAxisData : [], selected: {}, seriesData: []};
        
        var colors = [] ;
        var elTable = element.querySelector("table") ;
        if(elTable){
            var ths = elTable.querySelectorAll("th") ;
            for(var i=0; i<ths.length; i++){
                var th = ths[i];
                data.xAxisData.push(th.innerHTML) ;
                if(th.hasAttribute("data-color")){
                    colors.push(th.getAttribute("data-color")) ;
                }
            }
            var tds = elTable.querySelectorAll("td") ;
            for(var i=0; i<tds.length; i++){
                var td = tds[i];
                var label = data.xAxisData[i];
                var value = Number(td.innerHTML) ;
                data.seriesData.push({
                    name: label,
                    value: value
                }) ;
            }
            var caption = elTable.querySelector("caption") ;
            if(caption){
                serieName = caption.innerHTML ;
            }
        }

        if(colors.length>0){
            option.color = colors ;
        }

        option.yAxis = {
            type: 'value'
        };
        option.xAxis = {
            type: 'category',
            data: data.xAxisData
        } ;
        option.series = [
            {
                name: serieName,
                type: 'bar',
                data: data.seriesData.map(function(v){ return v.value ;}),
                itemStyle: {
                    emphasis: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ] ;

        var myChart = echarts.init(element);

        commonChartInit(element, option) ;
        
        myChart.setOption(option);
        
        var currentValue = data.seriesData ;

        /**
         * 
         * @param {Array} value array [{name: "", value: 123}]
         */
        element.setValue = function(value){
            currentValue = value;
            option.series[0].data = value.map(function(v){ return v.value ;});
            option.xAxis.data = value.map(function(v){ return v.name ;});
            myChart.setOption(option);
        } ;

        element.getValue = function(){
            return currentValue;
        } ;

        view.ensureDisplayed(function(){
            myChart.resize() ;
        });

        view.on("render", function(){
            commonChartInit(element, option) ;
            myChart.setOption(option);
        }) ;
    }
    
    /**
     * Create an unique ID
     */
    function uuidv4() {
        if(typeof(window.crypto) !== "undefined" && crypto.getRandomValues){
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
                return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) ;
            }) ;
        }else{
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }


    /**
     * Change a string in regexp
     * @param {string} str the string to transform in regexp
     */
    var escapeRegExp = function (str) {
		return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	} ;

    /**
     * Replace all occurence in a string
     * 
     * @param {string} str string in which to replace
     * @param {string} find the string to find
     * @param {string} replace the string to replace
     */
	var replaceAll = function (str, find, replace) {
		return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	} ;


    return extension ;

})));