var parse_ast = require('esprima').parse,
    escodegen = require("escodegen"),
    object = require("object-enhancements"),
    validators = {},
    verbose = false,
    selector = require('cssauron-falafel'),
    is_function = selector("function"),
    hash = 0;

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};
var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn);
    for (var i = 0; i < xs.length; i++) {
        fn.call(xs, xs[i], i, xs);
    }
};

// set $parent node
function parentize(node) {
    traverse(node, function(node, parent) {
        node.$parent = parent;
    });
}

var node_ids = 0;
// set a unique $id
function idze(node) {
    traverse(node, function(node, parent) {
        if (node.$id === undefined) {
            node.$id = ++node_ids;
        }
    });
}

// filter ast
function filter(node, callback) {
    var out = [];

    traverse(node, function(node, parent) {
        if (callback(node)) {
            out.push(node);
        }
    });

    return out.length ? out : null;
}

// traverse ast
// callback: function(node, parent, property, index, depth) -> Boolean (false to stop)
function traverse(node, callback, depth, recursive) {

    depth = depth || 0;
    forEach(objectKeys(node), function (key) {
        // do not follow internal vars
        if (key[0] === '$') return;

        var child = node[key];
        if (Array.isArray(child)) {
            forEach(child, function (c, idx) {
                if (c && typeof c.type === 'string') {
                    callback(c, node, key, idx, depth);
                    recursive !== false && traverse(c, callback, depth + 1, recursive);
                }
            });
        }
        else if (child && typeof child.type === 'string') {
            callback(child, node, key, null, depth);
            recursive !== false && traverse(child, callback, depth + 1, recursive);
        }
    });
}

function find(node, needle) {
    var found = false;
    traverse(node, function(nn) {
        if (nn.$id === needle.$id) {
            found = true;
        }
    });

    return found;
}



function rename(node, replacements) {
    traverse(node, function(node) {
        if (node.type == "Identifier") {
            if (replacements[node.name]) {
                node.name = replacements[node.name];
            }
        }
    });
}

// function must exists in the file atm
function getFunction(node, name) {
    // search nearest function
    var fn = filter(node, function(node) {
        return is_function(node) && node.id && node.id.name == name;
    });

    if (fn.length) {
        return fn[0];
    }

    return null;
}

function getParent(node, callback) {
    var n = node;
    while(n.$parent) {
        n = n.$parent;
        if (callback(n)) {
            return n;
        }
    }

    return null;
}


///
///
///


function get_hash() {
    return "$" + (++hash) + "$";
}


function clone_node(node) {
    var copy = {};
    forEach(objectKeys(node), function(name) {
        // ignore auto generated
        if (name[0] === "$") return;

        var value = node[name],
            cvalue;

        if (name == "body") {
            //recursion!
            if (Array.isArray(value)) {
                cvalue = value.map(clone_node);
            } else {
                cvalue = clone_node(value);
            }
        } else if ("object" === object.typeof(value)) {
            //cvalue = object.clone(value);
            //cvalue.$clone = true;
        }

        // Note that undefined fields will be visited too, according to
        // the rules associated with node.type, and default field values
        // will be substituted if appropriate.
        copy[name] = cvalue || value;
    });

    copy.$clone = true;

    return copy;
}


function replace(node, property, index, new_node) {
    if (index === null) {
        node[property] = new_node;
    } else {
        node[property].splice(index, 1, new_node);
    }
}

function insertBefore(node, property, index, new_node) {
    if (index === null) {
        throw new Error("is this legal ?");
    } else {
        node[property].splice(index, 0, new_node);
    }
}


function returnToExpression(root, output_var) {
    traverse(root, function(node, parent, property, index, depth) {
        if (node.type == "ReturnStatement") {

            //console.log("****************************");
            //console.log(node, parent, property, index, depth);
            //console.log("****************************");
            //console.log(require("util").inspect(parent, {depth: null}));
            //console.log(require("util").inspect(node, {depth: null}));

            replace(parent, property, index,  {
                type: 'ExpressionStatement',
                expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                        type: 'Identifier',
                        name: output_var
                    },
                    right: node.argument
                },
            });

            //console.log(require("util").inspect(parent, {depth: null}));
            //console.log(escodegen.generate(parent));
        }
    });
}


function getArguments(node) {
    var args = [],
        i,
        max;

    switch(node.type) {
        case "FunctionDeclaration":
        case "FunctionExpression":
            if (node.id && node.id.name) {
                for (i = 0, max = node.params.length; i < max; ++i) {
                    args.push(node.params[i].name);
                }
            }
        break;
        case "CallExpression":
            for (i = 0, max = node.arguments.length; i < max; ++i) {
                args.push(node.arguments[i].name);
            }
        break;
    }

    return args;
}


module.exports = require("browserify-transform-tools").makeStringTransform("inlinify", {},
    function (content, transformOptions, done) {

        //parse ast

        var root = parse_ast(content, {comment: true, loc: true});

        idze(root);
        parentize(root);

        traverse(root, function(node, parent, property, index, depth) {
            //console.log("#" + node.$id, node.type, property, index);

            if (node.type == "CallExpression") {
                var fn = getFunction(root, node.callee.name);

                var hash = get_hash(),
                    return_var = hash + "return",
                    cfun = clone_node(fn),
                    fun_args = getArguments(cfun),
                    call_args = getArguments(node),
                    fun_hargs = fun_args.map(function(x) { return hash + x; }),
                    replacements = object.combine(fun_args, fun_hargs);

                //console.log(" --> Calling: ", node.callee.name);
                //console.log(" --> Arguments: ", replacements);

                rename(cfun, replacements);

                var args_to_var = fun_hargs.map(function(v, k) {
                    return v + " = " + call_args[k];
                });

                args_to_var.push(return_var);

                args_to_var = "var " + args_to_var.join(",");

                returnToExpression(cfun, hash + "return");

                var statement = getParent(node, function(node) { return node.type === "BlockStatement"});

                if (statement) {
                    //console.log("statement", statement);

                    var fst_property,
                        fst_index;

                    // find where am i in this block statement
                    //loop first level only, and try to find me!
                    traverse(statement, function(st_node, st_parent, st_property, st_index, st_depth) {
                        if (find(st_node, node)) {
                            fst_property = st_property,
                            fst_index = st_index;
                        }
                    }, 0, false);

                    if (fst_property) {
                        replace(parent, property, index, {
                            type: 'Identifier',
                            name: return_var,
                        });

                        insertBefore(statement, fst_property, fst_index, cfun.body);
                        insertBefore(statement, fst_property, fst_index, parse_ast(args_to_var));

                        //console.log(escodegen.generate(statement));
                    }
                }
            }

            return true;
        });

        //console.log(escodegen.generate(root));

        done(null, escodegen.generate(root));
    });


module.exports.verbose = function(val) {
    if (val === undefined) {
        verbose = !verbose;
    } else {
        verbose = val;
    }

    return this;
};
