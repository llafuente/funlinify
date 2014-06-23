var tap = require("tap"),
    test = tap.test,
    mfixture,
    fixture;

//setup

test("Generate file!", function(t) {
        var browserify = require('browserify'),
            fs = require('fs'),
            output_stream = fs.createWriteStream(__dirname +'/generated-fixture.js'),
            by;

        by = browserify(__dirname + '/fixtures.js');
        by
            .on('file', function (file, id, parent) {
                //console.log("file read", arguments);
            })
            .on("transform", function() {
                //console.log("transformation end", arguments);
            })
            .transform(require("../index.js"))
            .bundle()
            .pipe(output_stream);

        output_stream.on("close", function() {
            //console.log("end-of-generation");
            t.end();
        });

});


test("test Generated file!", function(t) {

    // remove browserify code, so we can require it!
    var file = require("fs").readFileSync(__dirname + '/generated-fixture.js', {encoding: "UTF-8"});
    file = file.split("\n");
    file.pop();
    file.shift();

    require("fs").writeFileSync(__dirname + '/generated-fixture.js', file.join("\n"));
    // YEAH!

    mfixture = require("./generated-fixture.js");
    fixture = require("./fixtures.js");

    console.log(mfixture);

    t.end();
});

test("test function!", function(t) {


    console.log(mfixture.B(5));
    t.equal(mfixture.B(5), fixture.B(5));

    t.end();
});

