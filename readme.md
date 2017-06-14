# UglifyJS

Minify and combine your js files into single file.

## Configuration

Create or edit **codetasty.json** file in workspace root.

```
{
    "extension": {
        "uglifyjs": {
            "files": {
                "source": [
                    "js/jquery.js",
                    "js/plugin.js",
                    "js/libs.js"
                ],
                "output": "bundle.js"
            }
        }
    }
}
```

### files
Type: `Array|Object`

Can be also array to minify multiple bundles.

### files.source
Type: `Array`, Required

List of files to minify, these file will be watched and auto minified on save.

### files.output
Type: `String`, Required

Destination where the minified output is saved.