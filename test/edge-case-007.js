// unrechable code

function A(arg_a) {
    arg_a = arg_a + 1;

    return arg_a * arg_a;

    throw new Error("reached unrechable code");
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