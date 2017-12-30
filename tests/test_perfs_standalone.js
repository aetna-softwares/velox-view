
data.categories = data.categories.concat(data.categories) ;
data.categories = data.categories.concat(data.categories) ;

var t0 = performance.now();
var view = new VeloxWebView("views", "perfs", { container: "container" });
view.open(data, function (err) {
	if(err){
		return document.write(err);
	}
	var t1 = performance.now();
	var div = document.createElement("div") ;
	div.innerText = "Call to doSomething took " + (t1 - t0) + " milliseconds for "+data.categories.length ;
	document.body.insertBefore(div, document.body.firstChild) ;	
});