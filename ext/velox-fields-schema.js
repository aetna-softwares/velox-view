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
     * fieldsSchema extension definition
     */
    var extension = {} ;
    extension.name = "fieldsSchema" ;

    var schema; 
    // var schemaExtend; 
    // var apiClient; 

    //must run before fields extension
    extension.mustRunBefore = ["fields"] ;

    extension.prepare = function(params, cb){
        var elements = params.doc.querySelectorAll('[data-field-def]');
        if(!schema) {
            if(elements.length > 0){
                console.error("You must set the schema with VeloxWebView.fieldsSchema.setSchema before instanciate your views") ;
                return cb("You must set the schema with VeloxWebView.fieldsSchema.setSchema before instanciate your views") ;
            }
        }
        var calls = [] ;
        elements.forEach(function(element){
            var schemaId = element.getAttribute("data-field-def").split(".") ;
            if(schemaId.length !== 2){
                throw ("Invalid data-field-def value : "+element.getAttribute("data-field-def")+", expected format is table.column") ;
            }

            var tableDef = schema[schemaId[0]];
            if(!tableDef){
                throw ("Unknow table : "+schemaId[0].trim()) ;
            }

            if(schemaId[1] === "grid"){
                element.setAttribute("data-field", "grid") ;
                prepareGrid(element, schemaId[0], tableDef) ;
                calls.push(function(cb){
                    VeloxWebView.fields.loadFieldLib("grid", null, cb) ;
                }) ;
            } else {
                var colDef = null;
                tableDef.columns.some(function(c){
                    if(c.name === schemaId[1].trim()){
                        colDef = c;
                        return true ;
                    }
                }) ;
                if(!colDef){
                    throw ("Unknown column "+schemaId[1]+" in table "+schemaId[0]) ;
                }


                if(!element.hasAttribute("data-bind")){
                    element.setAttribute("data-bind", colDef.name) ;
                }

                element.setAttribute("data-field", colDef.type) ;
                if(colDef.size){
                    element.setAttribute("data-field-size", colDef.size) ;
                }
                if(colDef.options){
                    Object.keys(colDef.options).forEach(function(k){
                        element.setAttribute("data-field-"+k, colDef.options[k]) ;
                    }) ;
                }

                prepareElement(element,schemaId[0], colDef) ;

               
                calls.push(function(cb){
                    VeloxWebView.fields.loadFieldLib(colDef.type, colDef.options, cb) ;
                }) ;
            }
        });
        VeloxWebView._asyncSeries(calls, cb) ;
    } ;
    
    // extension.init = function(){
    //     var view = this ;
    //     doInitView.bind(view)() ;
    // } ;

    

    extension.extendsGlobal = {} ;

    extension.extendsGlobal.fieldsSchema = {} ;
    
   

    /**
     * Get schema
     */
    extension.extendsGlobal.fieldsSchema.getSchema = function(){
        return schema ;
    } ;
    

     /**
     * @typedef VeloxViewFieldSchemaOptions
     * @type {object}
     * @property {VeloxServiceClient} [apiClient] The api client object. Will be used to get schema if not given and linked table values if used
     * @property {object} [schema] The database schema. if not given, use the apiClient to retrieve it
     * @property {object} [schemaExtend] schema object that extends the base schema  
     * @property {boolean} [addLabelToFields] automatically add <label> to the field (default false)
     */


    /**
     * Configure fields schema
     * @example
     * VeloxWebView.configure({ schema: 
     *     {
     *      "tableName": {
	 *		    columns: [
	 *				{name : "name", type: "varchar", size: 10},
	 *				{name : "status", type: "selection", values: ["todo", "done"]},
	 *				{name : "date_done", type: "date"},
	 *				{name : "level", type: "int"},
	 *				{name : "cost", type: "decimal:3"},
	 *			]
     *		}
     *     }
     * })
     * 
     * @param {VeloxViewFieldSchemaOptions} options the option of field schema extension
     */
    extension.extendsGlobal.fieldsSchema.configure = function(options){
        if(!options.schema && !options.apiClient){
            throw "you should provide either a schema or an apiClient option" ;
        }
        // apiClient = options.apiClient ;
        schema = options.schema;
        // schemaExtend = options.schemaExtend;
        if(schema && options.schemaExtend){
            extendsSchema(schema, options.schemaExtend) ;
        }
        if(options.addLabelToFields){
            if(!VeloxWebView.i18n){
                throw "you should add the i18n extension to use the option addLabelToFields" ;
            }
            VeloxWebView.fields.addDecorator(function(element, fieldType){
                if(fieldType === "grid"){ return ;}//ignore grids
                var fieldDef = element.getAttribute("data-field-def") ;
                if(!fieldDef){ return ; }
                if(element.hasAttribute("data-field-nolabel")){
                    return ;
                }
                
                var label = document.createElement("LABEL") ;
                var text = document.createTextNode(VeloxWebView.tr("fields."+fieldDef));
                if(fieldType === "boolean" || fieldType === "bool" || fieldType === "checkbox"){
                    //for checkbox, add input in the label
                    var input = element.querySelector("input") ;
                    element.removeChild(input) ;
                    label.appendChild(input) ;
                }
                label.appendChild(text) ;
                element.insertBefore(label, element.children[0]) ;
            }) ;
        }
    } ;

    function extendsSchema(schemaBase, schemaExtends){
        Object.keys(schemaExtends).forEach(function(table){
            if(!schemaBase[table]){
                schemaBase[table] = schemaExtends[table] ;
            }else{
                schemaExtends[table].columns.forEach(function(col){
                    var found = schemaBase[table].columns.some(function(colBase){
                        if(colBase.name === col.name){
                            Object.keys(col).forEach(function(k){
                                colBase[k] = col[k] ;
                            }) ;
                            return true ;
                        }
                    }) ;
                    if(!found){
                        schemaBase[table].columns.push(col) ;
                    }
                }) ;
            }
        }) ;
    }

    /**
     * Prepare the element markup for field creation
     * 
     * @param {HTMLElement} element the HTML element to prepare
     * @param {string} table the table name
     * @param {object} colDef the column configuration to apply
     */
    function prepareElement(element, table, colDef){
        if(colDef.type === "selection" || colDef.type === "select"){
            if(element.tagName !== "SELECT" && element.getElementsByTagName("select").length === 0){
                var select = document.createElement("SELECT") ;
                var emptyOption = document.createElement("OPTION") ;
                emptyOption.value = "";
                emptyOption.innerHTML = "&nbsp;" ;
                select.appendChild(emptyOption) ;
                element.appendChild(select) ;
                if(colDef.values && Array.isArray(colDef.values)){
                    //case where values are defined by list of values
                    colDef.values.forEach(function(val){
                        var option = document.createElement("OPTION") ;
                        option.value = val;
                        if(VeloxWebView.i18n){
                            option.innerHTML = VeloxWebView.i18n.tr("fields.values."+table+"."+colDef.name+"."+val) ;
                        }else{
                            option.innerHTML = val ;
                        }
                        select.appendChild(option) ;
                    }) ;
                }else if(colDef.values && typeof(colDef.values) === "object"){
                    //case where values are defined as key:label object
                    Object.keys(colDef.values).forEach(function(val){
                        var option = document.createElement("OPTION") ;
                        option.value = val;
                        option.innerHTML = colDef.values[val] ;
                        select.appendChild(option) ;
                    }) ;
                }else if(colDef.values === "2one"){
                    //case where values are content of another table
                    // getPossibleValues(table, colDef, function(err, values){
                    //     if(err){ return callback(err);}
                    //     Object.keys(values).forEach(function(k){
                    //         var option = document.createElement("OPTION") ;
                    //         option.value = k;
                    //         option.innerHTML = values[k] ;
                    //         select.appendChild(option) ;
                    //     });
                    //     callback() ;
                    // }) ;
                }
            }
        }
    }

    // function getPossibleValues(table, colDef, callback){
    //     if(!apiClient){
    //         return callback("You must give the VeloxServiceClient VeloxWebView.fieldsSchema.configure options to use the selection 2one fields") ;
    //     }
    //     var otherTable = colDef.otherTable ;
    //     var valColumn = colDef.valFields ;
    //     if(!otherTable || !valColumn){
    //         //try to get in fk
    //         schema[table].fk.some(function(fk){
    //             if(fk.thisColumn === colDef.name){
    //                 if(!otherTable){
    //                     otherTable = fk.targetTable;
    //                 }
    //                 if(!valColumn){ //if val column in other table not explicitelly given, use the FK target column
    //                     valColumn = fk.targetColumn;
    //                 }
    //                 return true ;
    //             }
    //         }) ;
    //     }
    //     if(!otherTable){
    //         return  callback("Can't find target table for "+table+"."+colDef.name+" you should define a FK or give option otherTable in col def") ;
    //     }
    //     if(!valColumn){
    //         //val column not given and not found in FK
    //         return  callback("Can't find target column value for "+table+"."+colDef.name+" you should define a FK or give option valField in col def") ;
    //     }
        
    //     var orderBy = colDef.orderBy ;

    //     if(!orderBy && colDef.labelField){
    //         //no order by specified, get columns from label
    //         var orderFields = [] ;
    //         schema[otherTable].columns.forEach(function(c){
    //             if(colDef.labelField.indexOf(c.name) !== -1){
    //                 orderFields.push(c.name) ;
    //             }
    //         }) ;
    //         if(orderFields.length>0){
    //             orderBy = orderFields.sort(function(f1, f2){
    //                 //sort in the order it appear in label
    //                 return colDef.labelField.indexOf(f1) - colDef.labelField.indexOf(f2) ;
    //             }).join(",") ;
    //         }
    //     } 

    //     if(!orderBy){
    //         //still not order by, use pk
    //         orderBy = schema[otherTable].pk.join(',') ;
    //     }
        
    //     apiClient.__velox_database[otherTable].search(colDef.search||{}, orderBy, function(err, results){
    //         if(err){ return callback(err); }
    //         var values = {} ;
    //         results.forEach(function(r){
    //             var label = colDef.labelField || valColumn;
    //             schema[otherTable].columns.forEach(function(c){
    //                 label = label.replace(c.name, r[c.name]) ;
    //             }) ;
    //             values[r[valColumn]] = label ;
    //         }.bind(this)) ;
    //         callback(null, values) ;
    //     }.bind(this));
    // }

    function prepareGrid(element, tableName,tableDef){
        var listTables = element.getElementsByTagName("TABLE") ;
        var table = null;
        if(listTables.length === 0){
            var table = document.createElement("TABLE") ;
            element.append(table) ;
        }else{
            table = listTables[0] ;
        }
        
        if(!table.getAttribute("recid") && tableDef.pk && tableDef.pk.length === 1){
            table.setAttribute("recid", tableDef.pk[0]) ;
        }

        var listTH = Array.prototype.slice.call(table.getElementsByTagName("TH")) ;
        if(listTH.length === 0){
            listTH = [] ;
            var listThead = element.getElementsByTagName("THEAD") ;

            var thead = null;
            if(listThead.length === 0){
                var thead = document.createElement("THEAD") ;
                table.appendChild(thead) ;
            }else{
                thead = listThead[0] ;
            }

            var tr = document.createElement("TR") ;
            thead.appendChild(tr) ;
            
            

            tableDef.columns.forEach(function(colDef){
                if(colDef.name.indexOf("velox_") === 0) { return ; }
                
                var th = document.createElement("TH") ;
                tr.appendChild(th) ;
                th.setAttribute("data-field-name", colDef.name) ;

                var innerHTML = prepareGridThInnerHTML(tableName, colDef) ;
                th.innerHTML = innerHTML ;
                th.setAttribute("data-field-type", colDef.type) ;
                if(colDef.options){
                    Object.keys(colDef.options).forEach(function(k){
                        th.setAttribute("data-field-"+k, colDef.options[k]) ;
                    }) ;
                }
            }) ;
        }else{
            listTH.forEach(function(th){
                var thName = th.getAttribute("data-field-name") ;
                var colDef = null;
                tableDef.columns.some(function(c){
                    if(c.name === thName){
                        colDef = c ;
                        return true ;
                    }
                }) ;
                if(colDef){
                    if(!th.getAttribute("data-field-type")){
                        th.setAttribute("data-field-type", colDef.type) ;
                    }
                    if(colDef.options){
                        Object.keys(colDef.options).forEach(function(k){
                            if(!th.getAttribute("data-field-"+k)){
                                th.setAttribute("data-field-"+k, colDef.options[k]) ;
                            }
                        }) ;
                    }
                    if(!th.innerHTML){
                        var innerHTML = prepareGridThInnerHTML(tableName, colDef);
                        th.innerHTML = innerHTML ;
                    }else{
                        if(th.children.length === 1 && th.children[0].tagName === "SCRIPT"){
                            //only a script renderer but no label
                            var label = document.createElement("LABEL") ;
                            if(VeloxWebView.i18n){
                                label.innerHTML = VeloxWebView.i18n.tr("fields."+tableName+"."+colDef.name) ;
                            }else{
                                label.innerHTML = colDef.label || colDef.name ;
                            }
                            th.appendChild(label) ;
                        }
                    }
                }
            }) ;
        }
    }

    function prepareGridThInnerHTML(table, colDef){
        var innerHTML = "" ;
        if(VeloxWebView.i18n){
            innerHTML = VeloxWebView.i18n.tr("fields."+table+"."+colDef.name) ;
        }else{
            innerHTML = colDef.label || colDef.name ;
        }
        
        if(colDef.values === "2one"){
            return innerHTML ;
            // getPossibleValues(table, colDef, function(err, values){
            //     if(err){ return callback(err);}
            //     var script = "<script>";
            //     script += "var values = "+JSON.stringify(values)+";";
            //     script += "return values[record['"+colDef.name+"']] || '';" ;
            //     script += "</script>" ;
            //     innerHTML = script + innerHTML ;
            //     callback(null, innerHTML) ;
            // }) ;
        }else if(Array.isArray(colDef.values)){
            var script = "<script>";
            if(VeloxWebView.i18n){
                script += 'return VeloxWebView.i18n.tr("fields.values.'+table+'.'+colDef.name+'."+record["'+colDef.name+'"]) ;' ;
            }else{
                script += "return record['"+colDef.name+"'] ;" ;
            }
            script += "</script>" ;
            innerHTML = script + innerHTML ;
            return innerHTML ;
        }else if(typeof(colDef.values) === "object" ){
            var script = "<script>";
            script += 'var values = '+JSON.stringify(colDef.values) +" ;" ;
            script += "return values[record['"+colDef.name+"']] ;" ;
            script += "</script>" ;
            innerHTML = script + innerHTML ;
            return innerHTML ;
        }else{
            return innerHTML ;
        }           
    }


    return extension ;

})));