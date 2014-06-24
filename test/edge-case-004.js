// function with expression as argument

function A(arg_a) {
    arg_a = arg_a + (function() {
        return 1;
    }());

    return arg_a * arg_a;
}

function B(arg_b) {
    var out;

    out = A(arg_b * arg_b) * arg_b;

    return out;
}


module.exports = {
    B: B,
    A: A
};