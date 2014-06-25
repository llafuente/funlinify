var tap = require("tap"),
    test = tap.test;

//setup
[
"fixtures.js"
,"edge-case-001.js"
,"edge-case-002.js"
,"edge-case-003.js"
,"edge-case-004.js"
,"edge-case-005.js"
,"edge-case-006.js"
,"edge-case-007.js"
,"edge-case-008.js"
].forEach(function(target_file) {
    var mfixture,
        fixture;

    test("Generate file: " + target_file, function(t) {
            var browserify = require('browserify'),
                fs = require('fs'),
                output_stream = fs.createWriteStream(__dirname +'/generated-fixture.js');

            browserify(__dirname + '/' + target_file)
                .on('file', function (file, id, parent) {
                    //console.log("file read", arguments);
                })
                .on("transform", function() {
                    //console.log("transformation end", arguments);
                })
                .transform(require("../index.js"))
                //.transform(require("../index.js").verbose())
                .bundle()
                .pipe(output_stream);

            output_stream.on("close", function() {
                //console.log("end-of-generation");
                t.end();
            });

    });


    test("integrity test: " + target_file, function(t) {

        // remove browserify code, so we can require it!
        var file = require("fs").readFileSync(__dirname + '/generated-fixture.js', {encoding: "UTF-8"});
        file = file.split("\n");
        file.pop();
        file.shift();

        require("fs").writeFileSync(__dirname + '/generated-fixture.js', file.join("\n"));
        // YEAH!
        delete require.cache[__dirname + "/generated-fixture.js"];
        mfixture = require("./generated-fixture.js");
        fixture = require("./" + target_file);

        console.log(mfixture);

        t.end();
    });

    test("test function!", function(t) {
        var i;


        console.log(mfixture.A.toString());
        console.log(mfixture.B.toString());

        for (i = 0; i < 10; i+=4) {
            t.equal(mfixture.A(i), fixture.A(i), target_file + " A(" + i +")");
            t.equal(mfixture.B(i), fixture.B(i), target_file + " B(" + i +")");
        }

        t.end();
    });

});
