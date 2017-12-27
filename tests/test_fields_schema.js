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

VeloxWebView.fieldsSchema.configure({
    schema: {
        "animal": {
            "columns": [
                {
                    "name": "name", "type": "text"
                },
                {
                    "name": "family", "type": "select", values: ["Felidae", "Canidae", "Ursidae"]
                },
            ]
        }
    }
}
);

describe("Fields from schema", function () {
    describe("With data", function () {
        var view = new VeloxWebView("views", "fields_schema", { container: "container" });
        it("should open without error", function (done) {
            this.timeout(5000); //more timeout as it must fetch all libs
            view.open(animals[0], function (err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it("should render animal", function () {
            expect(document.querySelector("input").value).to.equal(animals[0].name);
        });
    });

    describe("With no data", function () {
        var view = new VeloxWebView("views", "fields_schema", { container: "container" });
        it("should open without error", function (done) {
            this.timeout(5000); //more timeout as it must fetch all libs
            view.open({ }, function (err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it("should render nothing", function () {
            expect(document.querySelector("input").value).to.equal("");
        });
    });
});
