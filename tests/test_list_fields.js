/* global before, veloxScriptLoader, chai, describe, it, VeloxWebView */
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


describe("List extension", function() {
  describe("List auto with data", function() {
    var view = new VeloxWebView("views", "list_fields", {container: "container"}) ;
    it("should open without error", function(done) {
      this.timeout(5000); //more timeout as it must fetch all libs
      view.open({animals: animals}, function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    });

    it("should render animals", function() {
        expect(document.querySelectorAll("input").length).to.equal(animals.length) ;
        expect(document.querySelector("input").value).to.equal(animals[0].name) ;
    });

    it("should toggle list auto without error", function(done) {
      view.setListAuto(true, function(err){
        expect(err).to.not.exist ;
        done();
      }) ;
    });

    it("should have an extra line", function() {
      expect(document.querySelectorAll("input").length).to.equal(animals.length+1) ;
    });

    it("should have remove on all line except last one", function() {
      for(var i=0; i<animals.length; i++){
        expect(document.querySelectorAll("button")[i].style.display).to.equal("") ;
      }
      expect(document.querySelectorAll("button")[animals.length].style.display).to.equal("none") ;
    });

    it("should remove the line when click on remove button", function() {
      document.querySelectorAll("button")[1].click() ;
      expect(document.querySelectorAll("input").length).to.equal(animals.length) ;
      expect(document.querySelectorAll("input")[0].value).to.equal("Cat") ;
      expect(document.querySelectorAll("input")[1].value).to.equal("Lion") ;
    });

    it("should add a line when set value in last line", function() {
      var allInput = document.querySelectorAll("input") ;
      var allFields = document.querySelectorAll("[data-field]") ;
      allInput[allInput.length-1].value = "change" ;
      allFields[allFields.length-1].dispatchEvent(new Event('change'));
      expect(document.querySelectorAll("input").length).to.equals(allInput.length+1) ;
      expect(document.querySelectorAll("input")[allInput.length-1].value).to.equals("change") ;
      expect(document.querySelectorAll("input")[allInput.length].value).to.equals("") ;
    });

    it("should not give back the last empty line in data", function() {
      var allInput = document.querySelectorAll("input") ;
      var data = view.getData() ;
      expect(data.animals.length).to.equals(allInput.length-1) ;
      expect(data.animals[data.animals.length-1].name).to.equals("change") ;
      expect(data.animals[0].name).to.equals("Cat") ;
      expect(data.animals[1].name).to.equals("Lion") ;
    });
   
    
  });

  describe("List auto with no data", function() {
    var view = new VeloxWebView("views", "list_fields", {container: "container"}) ;
    it("should open without error", function(done) {
      this.timeout(5000); //more timeout as it must fetch all libs
      view.open({animals: []}, function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    });

    it("should toggle list auto without error", function(done) {
      view.setListAuto(true, function(err){
        expect(err).to.not.exist ;
        done();
      }) ;
    });

    it("should have an extra line", function() {
      expect(document.querySelectorAll("input").length).to.equal(1) ;
      expect(document.querySelector("button").style.display).to.equal("none") ;
    });

    it("should add a line when set value in last line", function() {
      var allInput = document.querySelectorAll("input") ;
      var allFields = document.querySelectorAll("[data-field]") ;
      allInput[allInput.length-1].value = "change" ;
      allFields[allFields.length-1].dispatchEvent(new Event('change'));
      expect(document.querySelectorAll("input").length).to.equals(allInput.length+1) ;
      expect(document.querySelectorAll("input")[allInput.length-1].value).to.equals("change") ;
      expect(document.querySelectorAll("input")[allInput.length].value).to.equals("") ;
    });
   
    
  });

});
