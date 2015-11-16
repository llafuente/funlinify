var utils = require("esprima-ast-utils"),
    object = require("object-enhancements"),
    validators = {},
    verbose = false,
    selector = require('cssauron-falafel'),
    is_function = selector("function"),
    hash_id = 0;


function find(node, needle) {
    var found = false;
    utils.traverse(node, function(nn) {
        if (nn.$id === needle.$id) {
            found = true;
        }
    });

    return found;
}

///
///
///


function get_hash() {
    return "__" + (++hash_id) + "__";
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

function insertAfter(node, property, index, new_node) {
    if (index === null) {
        throw new Error("is this legal ?");
    } else {
        if (node[property].length > index) {
            node[property].splice(index + 1, 0, new_node);
        } else {
            node[property].push(new_node);
        }
    }
}


function returnToExpression(root, output_var, break_label) {

    utils.traverse(root, function(node, parent, property, index, depth) {
        if (node.type == "ReturnStatement") {
            var owner = utils.getParent(node, is_function);

            if (owner.$id === root.body[0].$id) {

                var program = utils.parse(break_label+ ": {\n" +
                    output_var + " = " + utils.getCode(node.argument) +
                    ";break " + break_label+ ";}\n"
                );

                program = utils.toProgram(program.body[0].body);


                utils.replace(node, program);
            }
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
                if (node.arguments[i].type !== "Identifier") {
                    throw new Error("Argument[@"+i+"] is not an identifier");
                }
                args.push(node.arguments[i].name);
            }
        break;
    }

    return args;
}


function transform (content, transformOptions, done) {
        //parse ast

        var root = utils.parse(content),
            file = require("path").basename(transformOptions.file);

        utils.traverse(root, function(node, parent, property, index, depth) {
            verbose && console.log("#" + node.$id, node.type, property, index);

            if (node.type == "CallExpression") {
                var fn = utils.getFunction(root, node.callee.name),
                    owner = utils.getParent(node, is_function);



                if (
                    (fn && !owner) // function call outside a function
                    ||
                    (fn && owner && owner.id && owner.id.name != node.callee.name) // no recursion
                ) {
                    try {
                        call_args = getArguments(node);
                    } catch(e) {
                        console.info("(info) " + file + "@" + node.loc.start.line + "  " + node.callee.name + " cannot be inline: " + e.message);
                        return;
                    }

                    var statement = utils.getParent(node, function(node) { return node.type === "BlockStatement"; });

                    if (statement) {

                        var hash = get_hash(),
                            return_var = hash + "return",
                            cfun = utils.toProgram(fn),
                            fun_args = getArguments(cfun),
                            call_args,
                            fun_hargs = fun_args.map(function(x) { return hash + x; }),
                            replacements = object.combine(fun_args, fun_hargs);

                        console.info(file + "@" + node.range + " Calling: ", node.callee.name);

                        if (Object.keys(replacements).length) {
                            console.log("replacements", replacements);
                            utils.renameVariable(cfun, replacements);
                        }

                        var args_to_var = fun_hargs.map(function(v, k) {
                            return v + " = " + call_args[k];
                        });

                        args_to_var.push(return_var);

                        args_to_var = "var " + args_to_var.join(",");

                        returnToExpression(cfun, hash + "return", hash);

                        //console.log("statement", statement);

                        var fst_property,
                            fst_index;

                        // find where am i in this block statement
                        //loop first level only, and try to find me!
                        utils.traverse(statement, function(st_node, st_parent, st_property, st_index, st_depth) {
                            if (find(st_node, node)) {
                                fst_property = st_property;
                                fst_index = st_index;
                            }
                        }, 0, false);

                        utils.detach(node, fst_property);

                        //utils.replace(node, return_var);
                        /*
                        replace(parent, property, index, {
                            type: 'Identifier',
                            name: return_var,
                        });
                        */


                        console.log(require("util").inspect(root, {depth: null, colors: true}));
                        process.exit();


                        cfun.leadingComments = [
                            {
                                "type": "Line",
                                "value": "inline CallExpression() - " + node.callee.name,
                            }
                        ];

                        insertBefore(statement, fst_property, fst_index, {
                            type: 'LabeledStatement',
                            label: {
                                type: 'Identifier',
                                name: hash
                            },
                            body: cfun.body
                        });
                        insertBefore(statement, fst_property, fst_index, parse_ast(args_to_var));

                        //console.log(escodegen.generate(statement));
                    }
                } else if (node.callee.type == "MemberExpression") {
                    console.log(file + "@" + node.loc.start.line + " ignore-call: cant resolve a MemberExpression");
                } else {
                    console.log(file + "@" + node.loc.start.line + " ignore-call: ", node.callee.name);
                }
            }

            return true;
        });

        //console.log(escodegen.generate(root));

        done(null, root.$code);
    }


module.exports = require("browserify-transform-tools").makeStringTransform("funlinify", {}, transform);

module.exports.transform = transform;

module.exports.verbose = function(val) {
    if (val === undefined) {
        verbose = !verbose;
    } else {
        verbose = val;
    }

    return this;
};
