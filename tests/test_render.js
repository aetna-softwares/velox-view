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
        


    // it("should do a second render", function(done) {
    //   view.render(animals[3], function(err){
    //     expect(err).to.not.exist ;

    //     expect(view.EL.animal.style.color).to.equal(animals[3].color);
    //     expect(view.EL.family.innerHTML).to.equal(animals[3].family);
    //     expect(view.EL.name.innerHTML).to.equal(animals[3].name);
    //     done() ;
    //   }) ;
    // });
  });
});