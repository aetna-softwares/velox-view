/* global chai, describe, it, VeloxWebView, sinon, beforeEach */
var expect = chai.expect;



describe("perfs", function () {
	describe("simple render", function () {
		var view = new VeloxWebView("views", "perfs", { container: "container" });
		it("should do the initial render", function (done) {
			view.open(data, function (err) {
				expect(err).to.not.exist;
-
				done();
			});
		});
	});

});