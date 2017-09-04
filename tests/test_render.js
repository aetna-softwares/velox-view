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
});