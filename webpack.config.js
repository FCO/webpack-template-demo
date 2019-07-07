const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin')
const copy  = require('copy')
const path  = require('path')
const fs    = require('fs')
const exec  = require('child_process').exec
const mkdir = require('mkdir-p')

function execute(command, callback){
    exec(command, function(error, stdout, stderr){ callback(stdout) })
}

class CopyBeforeRun {
    constructor(from, to) {
        this.from = Array.isArray(from) ? from : [ from ]
        this.to   = to
    }
    apply(compiler) {
        let func = (compilation, done) => {
            console.log(`Start coping`)
            let next = () => {
                console.log(`Done copy for ${ this.to }`)
                done()
            }
            this.from.reverse().forEach(item => {
                let after = next
                next = () => {
                    console.log(`Coping ${ item } to ${ this.to }`)
                    copy(item, this.to, after)
                    console.log("Copied!")
                }
            })
            next()
        }
        if(compiler.options.watch) {
            compiler.hooks.watchRun.tapAsync('AfterEmitPlugin', func)
        } else {
            compiler.hooks.beforeRun.tapAsync('AfterEmitPlugin', func)
        }
    }
}

class TT {
    constructor(opts) {
        this.entry          = opts.entry
        this.output         = opts.output
        this.vars           = opts.vars || []
        this.includePath    = opts.includePath
    }
    generateCli() {
        let defines = Object.keys(this.vars).map(key => `--define ${key}=${this.vars[key]}`).join(" ")
        return `tpage ${defines}` + ( this.includePath != null ? ` --include_path ${this.includePath}` : "" ) + ` ${ this.entry }`
    }
    apply(compiler) {
        compiler.hooks.emit.tapAsync('AfterEmitPlugin', (compiler, done) => {
            console.log(`Compiling ${this.entry}: ${ this.generateCli() }`)
            execute(this.generateCli(), html => {
                console.log(`Compiled ${this.entry} generated (${ this.output }):`, html)
                mkdir(path.dirname(this.output), err => {
                    if(err) {
                        console.error(err);
                        done(err)
                    }
                    fs.open(this.output, 'w', (err, file) => {
                        if(err) {
                            console.error(err);
                            done(err)
                        }
                        console.log(`Writing ${ this.output }`)
                        fs.write(file, html, done)
                    })
                })
            })
        })
    }
}

module.exports = env => {
    env = env || {country: "uk za ca"}
    let countries = env.country.split(/\s+/)

    console.log(`Generating countries: ${countries}`)

    let jsEntry = {
            index: `./compiled/${countries[0]}/js/index.js`,
    }

    let generated = [];

    [ 'js',  'tt' ].forEach( type => {
        countries.forEach( country => {
            generated.push(
                new CopyBeforeRun(
                    [
                        `src/${type}/common/**/*`,
                        `src/${type}/${country}/**/*`
                    ],
                    `compiled/${country}/${type}/`
                )
            )
        })
    })

    let genHtml = countries
        .map(country => new TT({
            vars:           { "bla": "test" },
            includePath:    `compiled/${country}/tt`,
            entry:          `compiled/${country}/tt/index.html.tt`,
            output:         `dist/${country}/html/index.html`,
        }))

    return {
        plugins: [
            ...generated,
            ...genHtml,
            new ExtraWatchWebpackPlugin({ files: [ 'src/tt/**' ] }),
        ],
        entry: jsEntry,
        output: {
            path: path.resolve(__dirname, `dist/${countries[0]}/js`),
            filename: '[name]-bundle.js'
        },
        mode: "development",
        //watch: true,
        watchOptions: {
            ignored: ['dist/**', 'compiled/**', 'node_modules/**']
        },
        devServer: {
            contentBase: path.join(__dirname, `dist/${countries[0]}/html`),
            compress: true,
            port: 9000
        },
    }
}
