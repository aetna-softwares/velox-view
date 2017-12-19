/* global before, veloxScriptLoader, chai, describe, it, VeloxWebView */
var expect = chai.expect;



describe("Fields extension", function() {
  describe("Field generation", function() {
    var view = new VeloxWebView("views", "fields", {container: "container"}) ;
    it("should open without error", function(done) {
      this.timeout(5000); //more timeout as it must fetch all libs
      view.open(function(err){
        expect(err).to.not.exist ;
        done() ;
      }) ;
    });

    it("should have mask field", function() {
        expect(document.querySelector("[data-field=text]>input")).to.exist ;
    });
    it("should have int field", function() {
        expect(document.querySelector("[data-field=int]>input")).to.exist ;
    });
    it("should have double field", function() {
        expect(document.querySelector("[data-field=double]>input")).to.exist ;
    });
    it("should have percent field", function() {
        expect(document.querySelector("[data-field=percent]>input")).to.exist ;
    });
    it("should have email field", function() {
        expect(document.querySelector("[data-field=email]>input")).to.exist ;
    });
    it("should have date field", function() {
        expect(document.querySelector("[data-field=date]>input.flatpickr-input")).to.exist ;
    });
    it("should have datetime field", function() {
        expect(document.querySelector("[data-field=datetime]>input.flatpickr-input")).to.exist ;
    });
    it("should have select field", function() {
        expect(document.querySelector("[data-field=select]>select.selectized")).to.exist ;
    });
    it("should have checkbox field", function() {
      expect(document.querySelector("[data-field=checkbox]>input")).to.exist ;
    });
    it("should have toggle field", function() {
      expect(document.querySelector("[data-field=toggle]>label.switch")).to.exist ;
    });
    it("should have upload field", function() {
      expect(document.querySelector("[data-field=upload]>input")).to.exist ;
    });
    it("should have grid field", function() {
      expect(document.querySelector("[data-field=grid]>div.w2ui-grid-box")).to.exist ;
    });
    it("should have pdf field", function() {
      expect(document.querySelector("[data-field=pdf]>div.pdfobject-container")).to.exist ;
    });
    
  });

});

describe("Fields with i18n", function() {
  describe("Field generation", function() {
    before(function(done){
      VeloxWebView.fields.resetLocale() ;
      veloxScriptLoader.loadScript("../ext/velox-i18next.js", function(err){
        if(err){ return done(err);}
        VeloxWebView.i18n.setLang("vi") ;
        VeloxWebView.clearCache() ;
        done() ;
      }) ;
    }) ;
    
      var view = new VeloxWebView("views", "fields", {container: "container"}) ;
      it("should open without error", function(done) {
        this.timeout(5000); //more timeout as it must fetch all libs
        view.open(function(err){
          expect(err).to.not.exist ;
          done() ;
        }) ;
      });
  
      it("should have mask field", function() {
          expect(document.querySelector("[data-field=text]>input")).to.exist ;
      });
      it("should have int field", function() {
          expect(document.querySelector("[data-field=int]>input")).to.exist ;
      });
      it("should have double field", function() {
          expect(document.querySelector("[data-field=double]>input")).to.exist ;
      });
      it("should have percent field", function() {
          expect(document.querySelector("[data-field=percent]>input")).to.exist ;
      });
      it("should have email field", function() {
          expect(document.querySelector("[data-field=email]>input")).to.exist ;
      });
      it("should have date field", function() {
          expect(document.querySelector("[data-field=date]>input.flatpickr-input")).to.exist ;
      });
      it("should have datetime field", function() {
          expect(document.querySelector("[data-field=datetime]>input.flatpickr-input")).to.exist ;
      });
      it("should have select field", function() {
          expect(document.querySelector("[data-field=select]>select.selectized")).to.exist ;
      });
      it("should have checkbox field", function() {
        expect(document.querySelector("[data-field=checkbox]>input")).to.exist ;
      });
      it("should have toggle field", function() {
        expect(document.querySelector("[data-field=toggle]>label.switch")).to.exist ;
      });
      it("should have upload field", function() {
        expect(document.querySelector("[data-field=upload]>input")).to.exist ;
      });
      it("should have grid field", function() {
        expect(document.querySelector("[data-field=grid]>div.w2ui-grid-box")).to.exist ;
      });
      it("should have pdf field", function() {
        expect(document.querySelector("[data-field=pdf]>div.pdfobject-container")).to.exist ;
      });
      
    });
  }) ;