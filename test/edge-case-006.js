function A(arg_a, arg_b) {
    arg_a = arg_a + 1;

    var decoy = {
        arg_b: 0
    };
    decoy.arg_a = 1;

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