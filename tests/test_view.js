/* global chai, describe, it, VeloxWebView, sinon, beforeEach */
var expect = chai.expect;

var animals = [
	{ family: "Felidae", name: "Cat", color: "blue" },
	{ family: "Felidae", name: "Tiger", color: "blue" },
	{ family: "Felidae", name: "Lion", color: "blue" },
	{ family: "Canidae", name: "Dog", color: "red" },
	{ family: "Canidae", name: "Wolf", color: "red" },
	{ family: "Canidae", name: "Coyote", color: "red" },
	{ family: "Ursidae", name: "Bear", color: "green" },
	{ family: "Ursidae", name: "Giant Panda", color: "green" }
];


describe("render", function () {
	
	describe("select text content", function () {
		var view = new VeloxWebView("views", "text_content", { container: "container" });
		it("should do the initial render", function (done) {
			view.open({animals: animals}, function (err) {
				expect(err).to.not.exist;

				expect(view.container.querySelector("option").getAttribute("value")).to.equal(animals[0].family);
				expect(view.container.querySelector("option").innerHTML).to.equal(animals[0].name);
				done();
			});
		});

	});


	describe("simple render", function () {
		var view = new VeloxWebView("views", "animal", { container: "container" });
		it("should do the initial render", function (done) {
			view.open(animals[0], function (err) {
				expect(err).to.not.exist;

				expect(view.EL.animal.style.color).to.equal(animals[0].color);
				expect(view.EL.family.innerHTML).to.equal(animals[0].family);
				expect(view.EL.name.innerHTML).to.equal(animals[0].name);
				done();
			});
		});

		it("should do a second render", function () {
			view.render(animals[3]) ;

			expect(view.EL.animal.style.color).to.equal(animals[3].color);
			expect(view.EL.family.innerHTML).to.equal(animals[3].family);
			expect(view.EL.name.innerHTML).to.equal(animals[3].name);
		});
	});

	describe("complex render", function () {
		var view = new VeloxWebView("views", "nested", { container: "container" });

		it("should open without error", function (done) {
			view.open({
				title: { color: "red", label: "Save the animals !" },
				tosave: animals.filter(function (a, i) { return i % 2 === 0; }),
				saved: animals.filter(function (a, i) { return i % 2 !== 0; }).map(function (a, i) {
					if (i % 2 === 0) { a.inZoo = true; }
					return a;
				}),
			}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have nested title as first child", function () {
			expect(view.container.children[0].getAttribute("data-view")).to.equal("nested_title");
		});
		it("should have rendered the title", function () {
			expect(view.container.querySelector('h3').innerHTML).to.equal("Save the animals !");
		});
		it("should have text 'You must save' on all animals to save", function () {
			expect(view.container.querySelector('[data-bind="tosave[]"]').innerHTML).to.startWith("You must save");
		});
		it("should have " + animals.length / 2 + " animals to save", function () {
			expect(view.container.querySelectorAll('[data-bind="tosave[]"]').length).to.equal(animals.length / 2);
		});
		it("should have " + animals.length / 2 + " animals saved", function () {
			expect(view.container.querySelectorAll('[data-test="saved[]"]').length).to.equal(animals.length / 2);
		});
		it("First animal to save is " + animals[0].name, function () {
			expect(view.container.querySelector('[data-bind="tosave[]"]').querySelector('[data-bind="name"]').innerHTML).to.equal(animals[0].name);
		});
		it("First saved animal is " + animals[1].name, function () {
			expect(view.container.querySelector('[data-test="saved[]"]').querySelector('[data-bind="name"]').innerHTML).to.equal(animals[1].name);
		});
		it(animals[1].name + " is in zoo", function () {
			expect(view.container.querySelector('[data-test="saved[]"]').querySelector('[data-test-show-if="inZoo"]')).to.exist;
		});
		it(animals[3].name + " is not in zoo", function () {
			expect(view.container.querySelectorAll('[data-test="saved[]"]')[1].querySelector('[data-test-show-if="inZoo"]')).to.not.exist;
		});
	});

	describe("Don't process flag", function () {
		var view = new VeloxWebView("views", "dont_process", { container: "container" });

		it("should open without error", function (done) {
			view.open({
				title: { color: "red", label: "Animals" },
				animals: animals
			}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have nested title as first child", function () {
			expect(view.container.children[0].getAttribute("data-view")).to.equal("nested_title");
		});
		it("should have rendered the title", function () {
			expect(view.container.querySelector('h3').innerHTML).to.equal("Animals");
		});
		it("should have block dont process untouched", function () {
			expect(view.container.querySelectorAll('[data-dont-process] li').length).to.equal(1);
		});

		it("should have " + animals.length + " animals processed", function () {
			expect(view.container.querySelectorAll('.processed [data-test="animals[]"]').length).to.equal(animals.length);
		});

	});

	describe("Event propagation", function () {
		var view = new VeloxWebView("views", "event_propagation", { container: "container" });

		it("should open without error", function (done) {
			view.open({
				animals: animals
			}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have " + animals.length + " animals", function () {
			expect(view.container.querySelectorAll('[data-test="animals[]"]').length).to.equal(animals.length);
		});

		it("should have 3 proud dogs", function () {
			expect(view.container.querySelectorAll('[data-original-id="proud"]').length).to.equal(3);
		});

		it("should receive inner event", function (done) {
			view.on("proud", function (ev) {
				expect(ev.data.currentData).to.exist;
				expect(ev.data.currentData.name).to.equal("Wolf");
				done();
			});
			view.container.querySelectorAll('[data-original-id="proud"]')[1].click();

		});

	});

	describe("Event HTML propagation", function () {
		var view = new VeloxWebView("views", "nested_event", { container: "container" });
		var btClicked = false;
		var lineClicked = false;
		view.on("initDone", function () {
			view.EL.bt.addEventListener("click", function () {
				btClicked = true;
			});
			view.EL.lineToSave.addEventListener("click", function () {
				lineClicked = true;
			});
		});
		it("should open without error", function (done) {
			view.open({
				families: [
					{
						name: "Felidae",
						tosave: animals.filter(function (a, i) { return a.family === "Felidae" && i % 2 === 0; }),
						saved: animals.filter(function (a, i) { return a.family === "Felidae" && i % 2 !== 0; })
					},
					{
						name: "Canidae",
						tosave: animals.filter(function (a, i) { return a.family === "Canidae" && i % 2 === 0; }),
						saved: animals.filter(function (a, i) { return a.family === "Canidae" && i % 2 !== 0; })
					}
				]
			}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should propagate click event (first level)", function () {
			view.container.querySelectorAll('[data-original-id="bt"]')[0].click();
			expect(btClicked).to.equal(true);
		});
		it("should propagate click event (second level)", function () {
			view.container.querySelectorAll('[data-original-id="lineToSave"]')[0].click();
			expect(lineClicked).to.equal(true);
		});


	});
	

	describe("Nested and visibility", function () {
		var view = new VeloxWebView("views", "nested_visibility", { container: "container" });

		var data = {
			title: "Animals to save",
			tosave: animals.slice(),
			saved: []
		};

		view.on("save", function (ev) {
			var clickedLine = ev.data.currentData;
			data.saved.push(clickedLine);
			data.tosave.splice(data.tosave.indexOf(clickedLine), 1);
			view.render();
		});

		it("should open without error", function (done) {
			view.open(data, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have a title", function () {
			expect(view.container.querySelector('[data-bind="title"]')).to.exist;;
			expect(view.container.querySelector('[data-bind="title"]').innerHTML).to.equal("Animals to save");
		});

		it("should have " + animals.length + " animals", function () {
			expect(view.container.querySelectorAll('[data-bind="tosave[]"]').length).to.equal(animals.length);
			expect(view.container.querySelector('[data-test="tosave-hide"]')).to.not.exist;;
			expect(view.container.querySelector('[data-test="saved-show"]')).to.not.exist;;
		});

		it("should have 1 saved animals", function () {
			data.saved.push(data.tosave[0]);
			data.tosave.splice(0, 1);
			view.render();
			expect(view.container.querySelectorAll('[data-bind="tosave[]"]').length).to.equal(animals.length - 1);
			expect(view.container.querySelectorAll('[data-test="saved"]').length).to.equal(1);
		});

		it("should have saved animals displayed after to save animals", function () {
			expect(view.container.querySelector('[data-test="saved-show"]')).to.exist;
			expect(view.container.querySelector('[data-test="tosave-show"]').nextElementSibling).to.equal(view.container.querySelector('[data-test="saved-show"]'));
		});

		it("should have no more animals to save", function () {
			data.tosave.forEach(function(s){
				data.saved.push(s);
			}) ;
			data.tosave.splice(0) ;

			view.render();
			expect(view.container.querySelector('[data-test="tosave-show"]')).to.not.exist;
			expect(view.container.querySelector('[data-test="tosave-hide"]')).to.exist;
			expect(view.container.querySelector('[data-test="tosave-hide"]').nextElementSibling).to.equal(view.container.querySelector('[data-test="saved-show"]'));
		});

	});

	describe("Check order", function () {
		var view = new VeloxWebView("views", "loop_insert_order", { container: "container" });

		var data = {
			animals: animals.slice()
		};

		it("should open without error", function (done) {
			view.open(data, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have animals after legend and before button", function () {
			expect(view.container.querySelector('fieldset').children[0].tagName).to.equal("LEGEND");
			expect(view.container.querySelector('fieldset').children[animals.length+1].tagName).to.equal("BUTTON");
			expect(view.container.querySelector('fieldset').children[1].tagName).to.equal("DIV");
		});
	});
});

describe("Inline content", function () {
	describe("Inline HTML", function () {
		var view = new VeloxWebView({ html: "<p class='inlinehtml'>I am inline</p>", container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should be displayed", function () {
			expect(document.querySelector(".inlinehtml")).to.exist;
		});


	});
});

describe("Style", function () {
	describe("Inline", function () {
		var view = new VeloxWebView("views", "style_inline", { container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have red background", function () {
			expect(window.getComputedStyle(view.container.querySelector(".red")).backgroundColor).to.equal("rgb(255, 0, 0)");
		});


	});
	describe("Static", function () {
		var view = new VeloxWebView("views", "style_static", { container: "container", css: ".green {background: green; color: white}" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have green background", function () {
			expect(window.getComputedStyle(view.container.querySelector(".green")).backgroundColor).to.equal("rgb(0, 128, 0)");
		});


	});
	describe("External", function () {
		var view = new VeloxWebView("views", "style_external", { container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have blue background", function () {
			expect(window.getComputedStyle(view.container.querySelector(".blue")).backgroundColor).to.equal("rgb(0, 0, 255)");
		});


	});
	describe("Style and script", function () {
		var view = new VeloxWebView("views", "style_style_and_script", { container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have blue background", function () {
			expect(window.getComputedStyle(view.container.querySelector(".yellow")).backgroundColor).to.equal("rgb(255, 255, 0)");
		});


	});
	describe("Script and style", function () {
		var view = new VeloxWebView("views", "style_script_and_style", { container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have purple background", function () {
			expect(window.getComputedStyle(view.container.querySelector(".purple")).backgroundColor).to.equal("rgb(128, 0, 128)");
		});


	});
	describe("Many style and script", function () {
		var view = new VeloxWebView("views", "style_many_style_and_script", { container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have yellow background", function () {
			expect(window.getComputedStyle(view.container.querySelector(".yellow")).backgroundColor).to.equal("rgb(255, 255, 0)");
		});

		it("should have blue background", function () {
			expect(window.getComputedStyle(view.container.querySelector(".blue")).backgroundColor).to.equal("rgb(0, 0, 255)");
		});


	});
});



describe("Long task", function () {
	describe("Success callback", function () {
		var view = new VeloxWebView("views", "longtask", { container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should display waiting spinner", function (done) {
			view.on("bt", function () {
				view.longTask(function (done) {
					setTimeout(function () {
						done();
					}, 1000);
				}, "please be patient", done);
			});
			view.EL.bt.click();
			//check display only after 300ms
			expect(document.querySelector(".velox_overlay")).to.not.exist;
			setTimeout(function () {
				expect(document.querySelector(".velox_overlay")).to.not.exist;
			}, 200);
			setTimeout(function () {
				expect(document.querySelector(".velox_overlay")).to.exist;
			}, 400);
		});

		it("should hide waiting spinner", function () {
			expect(document.querySelector(".velox_overlay")).to.not.exist;
		});
	});

	describe("Use global object", function () {
		var view = new VeloxWebView("views", "longtask", { container: "container" });

		it("should open without error", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should display waiting spinner", function (done) {
			view.on("bt", function () {
				VeloxWebView.longTask(function (done) {
					setTimeout(function () {
						done();
					}, 1000);
				}, "please be patient", done);
			});
			view.EL.bt.click();
			//check display only after 300ms
			expect(document.querySelector(".velox_overlay")).to.not.exist;
			setTimeout(function () {
				expect(document.querySelector(".velox_overlay")).to.not.exist;
			}, 200);
			setTimeout(function () {
				expect(document.querySelector(".velox_overlay")).to.exist;
			}, 400);
		});

		it("should hide waiting spinner", function () {
			expect(document.querySelector(".velox_overlay")).to.not.exist;
		});
	});

});



describe("Concurrent open", function () {
	describe("Open while is already opening", function () {

		beforeEach(function () {
			if (null == this.sinon) {
				this.sinon = sinon.sandbox.create();
			} else {
				this.sinon.restore();
			}
			this.sinon.stub(console, 'warn');
		});

		var view = new VeloxWebView("views", "animal_concurrent", { container: "container" });

		it("should add a warning when open twice", function (done) {
			view.open();
			view.open(function(){
				expect(console.warn.calledOnce).to.be.true;
				done() ;
			});
		});

	});
});


describe("Expr eval", function () {
	describe("Open while is already opening", function () {

		beforeEach(function () {
			if (null == this.sinon) {
				this.sinon = sinon.sandbox.create();
			} else {
				this.sinon.restore();
			}
			this.sinon.stub(console, 'error');
		});

		var view = new VeloxWebView("views", "eval", { container: "container" });

		it("should open without error", function (done) {
			view.open({foo: 2, bar:false}, function(err){
				if(err){ return done(err) ;}

				expect(console.error.callCount).to.equal(2);
				done() ;
			});
		});

		it("should display following expr", function () {
			expect(document.querySelector('[data-original-id="eval1"]')).to.exist;
			expect(document.querySelector('[data-original-id="eval2"]')).to.be.null;
			expect(document.querySelector('[data-original-id="eval3"]')).to.exist;
			expect(document.querySelector('[data-original-id="eval4"]')).to.be.null;
			expect(document.querySelector('[data-original-id="eval5"]')).to.be.null;
		});

		it("should display following expr after render", function () {
			view.render({foo: 2, bar: true}, function(){
				expect(document.querySelector('[data-original-id="eval1"]')).to.be.null;
				expect(document.querySelector('[data-original-id="eval2"]')).to.exist;
				expect(document.querySelector('[data-original-id="eval3"]')).to.be.null;
				expect(document.querySelector('[data-original-id="eval4"]')).to.be.null;
				expect(document.querySelector('[data-original-id="eval5"]')).to.be.null;
			}) ;
		});

	});
});



describe("Sub view render", function () {
	describe("Inline", function () {
		var view = new VeloxWebView("views", "nested_simple", { container: "container" });

		it("should open without error", function (done) {
			view.open({
				title: { color: "red", label: "Save the animals !" },
				tosave: animals
			}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should have nested title as first child", function () {
			var firstView = view.views[Object.keys(view.views)[0]].instances[0] ;
			expect(firstView.getBoundObject()).to.equal(animals[0]);
		});

		it("should render in subview accordingly to bind path", function () {
			var firstView = view.views[Object.keys(view.views)[0]].instances[0] ;
			firstView.render(animals[1]) ;
			expect(firstView.getBoundObject()).to.equal(animals[1]);
		});



	});
});