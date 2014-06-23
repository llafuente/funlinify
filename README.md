# funlinify [![Build Status](https://secure.travis-ci.org/llafuente/funlinify.png?branch=master)](http://travis-ci.org/llafuente/funlinify)

Inline javascript functions within a file (inline expansion).


## Gotchas

The algorithm is pretty simple at this moment.
* Search all CallExpressions.
  * Search if the function body is reachable (same file/ast)
  * Generate a unique hash to use it as prefix for all variables in the function.
  * Replace all identifiers in the function (that could lead to many problems)
  * Replace ReturnExpression in the function by an AssignamentExpression to return variable.
  * Replace the CallExpression with the given return variable.
  * Append argument conversion before the CallExpression
  * Append function before the CallExpression

It's pretty straight forward, don't do anything fancy. So is no error prone.

* Do not support nested CallExpressions
* Do not support function outside given 'string/ast'
* Inline a function with CallExpressions could lead to problems


## Usage

**Browserify transform**

```js

output_stream = fs.createWriteStream('debug/js-2dmath-browser-debug.js');

require('browserify')('./index.js')
    .transform('funlinify')
    .bundle()
    .pipe(output_stream);

```

**Direct**

```js

var file_contents = require("fs").fileReadSync("your-file.js");
require("funlinify")(file_contents, {}, callback(err, new_file_contents));

```


## License

MIT