/*global define, Chart*/
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
    var CHARTJS_VERSION = "2.7.2"; 

    var CHARTJS_LIB = [
        {
            name: "chartjs-js",
            type: "js",
            version: CHARTJS_VERSION,
            cdn: "https://cdnjs.com/libraries/Chart.js",
            bowerPath: "chart.js/dist/Chart.min.js",
            npmPath: "chart.js/dist/Chart.min.js"
        },
    ] ;
   
    extension.libs = [
        CHARTJS_LIB
    ] ;

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
        setLibToLoad("chart.js", function(done){
            loadLib("chart.js", CHARTJS_VERSION, CHARTJS_LIB, done) ;
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
        var inQuotedValue = false;
        var currentQuoteChar = false;
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
                    }else if(!currentValue && (c === "'" || c === "\"")){
                        inQuotedValue = true ;
                        currentQuoteChar = c ;
                    }else{
                        if(inComplexValue && c === "}"){
                            inComplexValue = false;
                            obj[currentProp] = parseCssStyle(currentValue.trim()) ;
                            currentValue = "";
                        }else if(inQuotedValue && c === currentQuoteChar){
                            inQuotedValue = false;
                            currentQuoteChar = null;
                        }else if(!inComplexValue && !inQuotedValue && c === ","){
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
        return ;
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
        var div = document.createElement('div') ;
        div.style.position= "relative" ;
        var canvas = document.createElement('canvas') ;
        canvas.style.height= "100%" ;
        div.appendChild(canvas) ;
        element.appendChild(div) ;

        var chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
        };
        var option = {
            type: chartType==="donut"?"doughnut":chartType,
            options: chartOptions
        } ;

        var values = [] ;
        var labels = [] ;
        var colors = [] ;
        var data = {
            datasets: [{
                data: values,
                backgroundColor: colors
            }],
            labels: labels,
        } ;
        option.data = data;

        var elLabel = element.querySelector("label") ;
        if(elLabel){
            chartOptions.title = { display: true, text: elLabel.innerHTML, position:'top', fontSize: 14 } ;
            element.removeChild(elLabel) ;
        }

        
        var elTable = element.querySelector("table") ;
        if(elTable){
            var ths = elTable.querySelectorAll("th") ;
            for(var i=0; i<ths.length; i++){
                var th = ths[i];
                var label = th.innerHTML;
                labels.push(label) ;
                // data.selected[label] = !th.hasAttribute("data-selected")||th.getAttribute("data-selected")==="true" ;
                if(th.hasAttribute("data-color")){
                    colors.push(th.getAttribute("data-color")) ;
                }
            }
            var tds = elTable.querySelectorAll("td") ;
            for(var i=0; i<tds.length; i++){
                var td = tds[i];
                var label = labels[i];
                var value = Number(td.innerHTML) ;
                values.push(value) ;
                //data.colors[label] = colors[i] ;
            }
            var caption = elTable.querySelector("caption") ;
            if(caption){
                chartOptions.title = { 
                    display: true,
                    text: caption.innerHTML, 
                    position:'top' 
                } ;
            }
            element.removeChild(elTable) ;
        }


        commonChartInit(element, option) ;

        var chart = null;
        view.ensureDisplayed(function(){
            chart = new Chart(canvas, option) ;
        });


        var currentValue = values.map(function(v,i){
            return { name: v, value: labels[i]} ;
        }) ;

        /**
         * 
         * @param {Array} value array [{name: "", value: 123}]
         */
        element.setValue = function(value){
            currentValue = value;
            view.ensureDisplayed(function(){
                chart.data.labels = value.map(function(v){ return  v.name; }),
                chart.data.datasets[0].data = value.map(function(v){ return  v.value; }),
                chart.update();
            });
        } ;

        element.getValue = function(){
            return currentValue;
        } ;

        // view.on("render", function(){
        //     commonChartInit(element, option) ;
        //     view.ensureDisplayed(function(){
        //         myChart.setOption(option);
        //     }) ;
        // }) ;

        element.getDataURL = function(){
            return chart.toBase64Image() ;
        };
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

        var div = document.createElement('div') ;
        div.style.position= "relative" ;
        var canvas = document.createElement('canvas') ;
        canvas.style.height= "100%" ;
        div.appendChild(canvas) ;
        element.appendChild(div) ;

        var chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
        };
        var option = {
            type: chartType==="donut"?"doughnut":chartType,
            options: chartOptions
        } ;
        

        var datasets = [] ;
        var categories = [] ;
       
        var data = {
            labels: categories,
            datasets: datasets,
        } ;
        option.data = data;

        var elLabel = element.querySelector("label") ;
        if(elLabel){
            chartOptions.title = { display: true, text: elLabel.innerHTML, position:'top', fontSize: 14 } ;
            element.removeChild(elLabel) ;
        }

/*
        |        | Serie1 | Serie2 |
        | month1 |  val1  |  val2  |
        | month2 |  val1  |  val2  |
*/
        var elTable = element.querySelector("table") ;
        if(elTable){
            var trs = elTable.querySelectorAll("tr") ;
            for(var y=0; i<trs.length; y++){
                var tr = trs[y] ;

                if(y===0){
                    //first line series labels
                    var ths = tr.querySelectorAll("th") ;
                    for(var i=0; i<ths.length; i++){
                        var th = ths[i];
                        var ds = {
                            label : th.innerHTML,
                            data: []
                        };
                        datasets.push(ds) ;
                        if(th.hasAttribute("data-color")){
                            ds.backgroundColor = th.getAttribute("data-color") ;
                        }
                    }
                }else{
                    //body lines
                    var ths = tr.querySelectorAll("th") ;
                    for(var i=0; i<ths.length; i++){
                        var th = ths[i];
                        categories.push(th.innerHTML) ;
                    }

                    var tds = tr.querySelectorAll("td") ;
                    for(var i=0; i<tds.length; i++){
                        var td = tds[i];
                        var value = Number(td.innerHTML) ;
                        datasets[i].data.push(value) ;
                    }
                }

                
            }
            var caption = elTable.querySelector("caption") ;
            if(caption){
                chartOptions.title = { 
                    display: true,
                    text: caption.innerHTML, 
                    position:'top' 
                } ;
            }
            element.removeChild(elTable) ;
        }

        if(datasets.length<=1){
            chartOptions.legend = { display: false } ;
        }

        commonChartInit(element, option) ;

        var chart = null;
        view.ensureDisplayed(function(){
            chart = new Chart(canvas, option) ;
        });
        
        
        var currentValue = datasets.map(function(ds){
            return {
                name: ds.label,
                values: ds.data.map(function(v, i){
                    return {
                        name: categories[i],
                        value: v
                    };
                })
            };
        });
        
        /**
         * 
         * @param {Array} value array [{
         *      name: "serie1", values: [
         *          {name: "month1", value: 1}
         *          {name: "month2", value: 2}
         *          ] 
         * }]
         */
        element.setValue = function(value){
            currentValue = value;

            view.ensureDisplayed(function(){
                if(value[0]){
                    chart.data.labels = value[0].values.map(function(v){ return v.name ;});
                }

                chart.data.datasets = value.map(function(v){ 
                    return {
                        label: v.name,
                        backgroundColor: v.backgroundColor,
                        data: v.values.map(function(v){ return v.value ;})
                    } ;
                }) ;
                if(chart.data.datasets.length<=1){
                    chart.options.legend = { display: false } ;
                }
                chart.update();
            });
        } ;
        
        element.getValue = function(){
            return currentValue;
        } ;
        
        // view.on("render", function(){
        //     commonChartInit(element, option) ;
        //     view.ensureDisplayed(function(){
        //         myChart.setOption(option);
        //     }) ;
        // }) ;

        element.getDataURL = function(){
            return chart.toBase64Image() ;
        };
    }
    

    


    return extension ;

})));