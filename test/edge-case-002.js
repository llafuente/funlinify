// call inside return
function A(arg_a) {
    arg_a = arg_a + 1;

    return arg_a * arg_a;
}

function B(arg_b) {
    return A(arg_b) * arg_b;
}


module.exports = {
    B: B,
    A: A
};