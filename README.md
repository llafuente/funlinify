# funlinify [![Build Status](https://secure.travis-ci.org/llafuente/funlinify.png?branch=master)](http://travis-ci.org/llafuente/funlinify)

Inline javascript functions within a file (inline expansion).


## How it works ?

The algorithm is pretty simple at this moment.
* Search all CallExpressions.
  * Search if the function body is reachable (same file/ast)
  * Prefix all variable arguments with a unique hash
  * Replace ReturnExpression in the function by an AssignamentExpression(=) and break till the end of the function body.
  * Replace the CallExpression with the given return variable.
  * Append argument conversion before the CallExpression
  * Append function before the CallExpression

It's pretty straight forward, don't do anything fancy. So is no error prone.

## Gotchas

* Do not support nested CallExpressions (just one will be replaced)
* Do not inline functions outside given 'file/string/ast'
* Do not inline functions with expressions as arguments.

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