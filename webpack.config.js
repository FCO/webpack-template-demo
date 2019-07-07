const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtraWatchPlugin = require('extra-watch-webpack-plugin')
const path  = require('path')
const copy  = require('copy')

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

module.exports = env => {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! AQUI !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    let country = env.country || "za"

    console.log(`Generating countries: ${country}`)

    let ttEntry = require("./pages.json")

    return {
        module: {
            rules: [
                {
                    test: /\.tt$/,
                    use: [
                        {
                            loader: 'html-loader',
                        },
                        {
                            loader: path.resolve('tt-loader.js'),
                            options: {
                                vars: Object.values(ttEntry).reduce(
                                    (agg, item) => {
                                        agg[path.resolve(item.template)] = item.vars;
                                        return agg
                                    },
                                    {}
                                ),
                                includePath:    [
                                    `src/tt/${country}`,
                                    `src/tt/common`,
                                ],
                            }
                        }
                    ]
                }
            ]
        },
        plugins: [
            new ExtraWatchPlugin({
                files: './pages.json'
            }),
            new CopyBeforeRun(
                [
                    `src/tt/common/**/*`,
                    `src/tt/${country}/**/*`
                ],
                `tt/${country}`
            ),
            ...Object.values(ttEntry).map(item =>
                new HtmlWebpackPlugin({
                    template: item.template
                })
            ),
        ],
        entry: Object.keys(ttEntry).reduce(
            (agg, key) => {
                agg[key] = path.resolve(ttEntry[key].template);
                return agg
            },
            {}
        ),
        output: {
            path: path.resolve(__dirname, `dist/${country}`),
            filename: '[name]-bundle.js'
        },
        mode: "development",
    }
}
