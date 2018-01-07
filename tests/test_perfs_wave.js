/* global chai, describe, it, VeloxWebView, sinon, beforeEach */
var expect = chai.expect;


describe("perfs wave", function () {
	describe("simple render", function () {
		var view = new VeloxWebView("views", "perfs_wave", { container: "container" });
		it("should do the initial render", function (done) {
			view.open(function (err) {
				expect(err).to.not.exist;
-
				done();
			});
		});
	});

});
