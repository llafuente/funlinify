// function declaration inside a function, with new identifiers!

function A(arg_a) {

    // this is just a decoy function to test that we don't modify it even with the same parameter names
    function AA(arg_a) {
        var decoy = arg_a;

        return decoy;
    }

    return arg_a * arg_a;
}

function B(arg_b) {
    var out;

    out = A(arg_b) * arg_b;

    return out;
}


module.exports = {
    B: B,
    A: A
};