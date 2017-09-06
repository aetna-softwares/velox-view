/* global chai, describe, it, VeloxWebView */
var expect = chai.expect;

var animals = [
  {family: "Felidae", name: "Cat", color: "blue"},
  {family: "Felidae", name: "Tiger", color: "blue"},
  {family: "Felidae", name: "Lion", color: "blue"},
  {family: "Canidae", name: "Dog", color: "red"},
  {family: "Canidae", name: "Wolf", color: "red"},
  {family: "Canidae", name: "Coyote", color: "red"},
  {family: "Ursidae", name: "Bear", color: "green"},
  {family: "Ursidae", name: "Giant Panda", color: "green"}
] ;

describe("render", function() {
  describe("simple render", function() {
    var view = new VeloxWebView("views", "animal", {container: "container"}) ;
    it("should do the initial render", function(done) {
      view.open(animals[0], function(err){
        expect(err).to.not.exist ;

        expect(view.EL.animal.style.color).to.equal(animals[0].color);
        expect(view.EL.family.innerHTML).to.equal(animals[0].family);
        expect(view.EL.name.innerHTML).to.equal(animals[0].name);
        done() ;
      }) ;
    });

    it("should do a second render", function(done) {
      view.render(animals[3], function(err){
        expect(err).to.not.exist ;

        expect(view.EL.animal.style.color).to.equal(animals[3].color);
        expect(view.EL.family.innerHTML).to.equal(animals[3].family);
        expect(view.EL.name.innerHTML).to.equal(animals[3].name);
        done() ;
      }) ;
    });
  });

  describe("complex render", function() {
    var view = new VeloxWebView("views", "nested", {container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open({
        title: {color: "red", label: "Save the animals !"},
        tosave : animals.filter(function(a, i){ return i%2 === 0; }),
        saved : animals.filter(function(a, i){ return i%2 !== 0; }).map(function(a, i){
          if(i%2 === 0){ a.inZoo = true; }
          return a;
        }),
      }, function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should have nested title as first child", function() {
      expect(view.container.children[0].getAttribute("data-view")).to.equal("nested_title");
    }) ;
    it("should have rendered the title", function() {
      expect(view.container.querySelector('h3').innerHTML).to.equal("Save the animals !");
    }) ;
    it("should have text 'You must save' on all animals to save", function() {
      expect(view.container.querySelector('[data-bind="tosave[]"]').innerHTML).to.startWith("You must save");
    }) ;
    it("should have "+animals.length/2+" animals to save", function() {
      expect(view.container.querySelectorAll('[data-bind="tosave[]"]').length).to.equal(animals.length/2);
    }) ;
    it("should have "+animals.length/2+" animals saved", function() {
      expect(view.container.querySelectorAll('[data-bind="saved[]"]').length).to.equal(animals.length/2);
    }) ;
    it("First animal to save is "+animals[0].name, function() {
      expect(view.container.querySelector('[data-bind="tosave[]"]').querySelector('[data-bind="name"]').innerHTML).to.equal(animals[0].name);
    }) ;
    it("First saved animal is "+animals[1].name, function() {
      expect(view.container.querySelector('[data-bind="saved[]"]').querySelector('[data-bind="name"]').innerHTML).to.equal(animals[1].name);
    }) ;
    it(animals[1].name+" is in zoo", function() {
      expect(view.container.querySelector('[data-bind="saved[]"]').querySelector('[data-show-if="inZoo"]')).to.exist;
    }) ;
    it(animals[3].name+" is not in zoo", function() {
      expect(view.container.querySelectorAll('[data-bind="saved[]"]')[1].querySelector('[data-show-if="inZoo"]')).to.not.exist;
    }) ;
  });

  describe("Don't process flag", function() {
    var view = new VeloxWebView("views", "dont_process", {container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open({
        title: {color: "red", label: "Animals"},
        animals : animals
      }, function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should have nested title as first child", function() {
      expect(view.container.children[0].getAttribute("data-view")).to.equal("nested_title");
    }) ;
    it("should have rendered the title", function() {
      expect(view.container.querySelector('h3').innerHTML).to.equal("Animals");
    }) ;
    it("should have block dont process untouched", function() {
      expect(view.container.querySelectorAll('[data-dont-process] li').length).to.equal(1);
    }) ;

    it("should have "+animals.length+" animals processed", function() {
      expect(view.container.querySelectorAll('.processed [data-bind="animals[]"]').length).to.equal(animals.length);
    }) ;
    
  });
  
  describe("Event propagation", function() {
    var view = new VeloxWebView("views", "event_propagation", {container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open({
        animals : animals
      }, function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should have "+animals.length+" animals", function() {
      expect(view.container.querySelectorAll('[data-bind="animals[]"]').length).to.equal(animals.length);
    }) ;
    
    it("should have 3 proud dogs", function() {
      expect(view.container.querySelectorAll('[data-original-id="proud"]').length).to.equal(3);
    }) ;

    it("should receive inner event", function(done) {
      view.on("proud", function(ev){
        expect(ev.data.currentData).to.exist ;
        expect(ev.data.currentData.name).to.equal("Wolf") ;
        done() ;
      }) ;
      view.container.querySelectorAll('[data-original-id="proud"]')[1].click();

    }) ;
    
  });
  
  describe("Nested and visibility", function() {
    var view = new VeloxWebView("views", "nested_visibility", {container: "container"}) ;
    
    var data = {
      tosave : animals.slice(),
      saved : []
    } ;

    view.on("save", function(ev){
      var clickedLine = ev.data.currentData ;
      data.saved.push(clickedLine) ;
      data.tosave.splice(data.tosave.indexOf(clickedLine), 1) ;
      view.render() ;
    }) ;

    it("should open without error", function(done) {
      view.open(data, function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should have "+animals.length+" animals", function() {
      expect(view.container.querySelectorAll('[data-bind="tosave[]"]').length).to.equal(animals.length);
      expect(view.container.querySelector('[data-hide-if="tosave"]')).to.not.exist ;;
      expect(view.container.querySelector('[data-show-if="saved"]')).to.not.exist ;;
    }) ;

    it("should have 1 saved animals", function() {
      view.container.querySelector("[data-original-id='save']").click() ;
      expect(view.container.querySelectorAll('[data-bind="tosave[]"]').length).to.equal(animals.length-1);
      expect(view.container.querySelectorAll('[data-bind="saved[]"]').length).to.equal(1);
    }) ;
    
    it("should have saved animals displayed after to save animals", function() {
      expect(view.container.querySelector('[data-show-if="saved"]')).to.exist ;
      expect(view.container.querySelector('[data-show-if="tosave"]').nextElementSibling).to.equal(view.container.querySelector('[data-show-if="saved"]')) ;
    });

    it("should have no more animals to save", function() {
      view.container.querySelector("[data-original-id='save']").click() ;
      view.container.querySelector("[data-original-id='save']").click() ;
      view.container.querySelector("[data-original-id='save']").click() ;
      view.container.querySelector("[data-original-id='save']").click() ;
      view.container.querySelector("[data-original-id='save']").click() ;
      view.container.querySelector("[data-original-id='save']").click() ;
      view.container.querySelector("[data-original-id='save']").click() ;
      expect(view.container.querySelector('[data-show-if="tosave"]')).to.not.exist ;
      expect(view.container.querySelector('[data-hide-if="tosave"]')).to.exist ;
      expect(view.container.querySelector('[data-hide-if="tosave"]').nextElementSibling).to.equal(view.container.querySelector('[data-show-if="saved"]')) ;
    }) ;
    
  });


});

describe("Inline content", function() {
  describe("Inline HTML", function() {
    var view = new VeloxWebView({html: "<p class='inlinehtml'>I am inline</p>", container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open(function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should be displayed", function() {
      expect(document.querySelector(".inlinehtml")).to.exist;
    }) ;

    
  });
});

describe("Style", function() {
  describe("Inline", function() {
    var view = new VeloxWebView("views", "style_inline", {container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open(function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should have red background", function() {
      expect(window.getComputedStyle(view.container.querySelector(".red")).backgroundColor).to.equal("rgb(255, 0, 0)");
    }) ;

    
  });
  describe("Static", function() {
    var view = new VeloxWebView("views", "style_static", {container: "container", css: ".green {background: green; color: white}"}) ;
    
    it("should open without error", function(done) {
      view.open(function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should have green background", function() {
      expect(window.getComputedStyle(view.container.querySelector(".green")).backgroundColor).to.equal("rgb(0, 128, 0)");
    }) ;

    
  });
  describe("External", function() {
    var view = new VeloxWebView("views", "style_external", {container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open(function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should have blue background", function() {
      expect(window.getComputedStyle(view.container.querySelector(".blue")).backgroundColor).to.equal("rgb(0, 0, 255)");
    }) ;

    
  });
});



describe("Long task", function() {
  describe("Success callback", function() {
    var view = new VeloxWebView("views", "longtask", {container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open(function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should display waiting spinner", function(done) {
      view.on("bt", function(){
        view.longTask(function(done){
            setTimeout(function(){
                done() ; 
            }, 1000) ;
        }, "please be patient", done) ;
      }) ;
      view.EL.bt.click() ;
      //check display only after 300ms
      expect(document.querySelector(".velox_overlay")).to.not.exist;
      setTimeout(function(){
        expect(document.querySelector(".velox_overlay")).to.not.exist;
      }, 200) ;
      setTimeout(function(){
        expect(document.querySelector(".velox_overlay")).to.exist;
      }, 400) ;
    }) ;

    it("should hide waiting spinner", function() {
      expect(document.querySelector(".velox_overlay")).to.not.exist;
    }) ;
  });

  describe("Use global object", function() {
    var view = new VeloxWebView("views", "longtask", {container: "container"}) ;
    
    it("should open without error", function(done) {
      view.open(function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    }) ;

    it("should display waiting spinner", function(done) {
      view.on("bt", function(){
        VeloxWebView.longTask(function(done){
            setTimeout(function(){
                done() ; 
            }, 1000) ;
        }, "please be patient", done) ;
      }) ;
      view.EL.bt.click() ;
      //check display only after 300ms
      expect(document.querySelector(".velox_overlay")).to.not.exist;
      setTimeout(function(){
        expect(document.querySelector(".velox_overlay")).to.not.exist;
      }, 200) ;
      setTimeout(function(){
        expect(document.querySelector(".velox_overlay")).to.exist;
      }, 400) ;
    }) ;

    it("should hide waiting spinner", function() {
      expect(document.querySelector(".velox_overlay")).to.not.exist;
    }) ;
  });
  
});