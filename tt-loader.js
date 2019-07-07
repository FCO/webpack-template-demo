const execSync    = require('child_process').execSync
const loaderUtils = require("loader-utils")

function getLoaderConfig(context) {
	let query = loaderUtils.getOptions(context) || {};
	let configKey = query.config || 'ttLoader';
	let config = context.options && context.options.hasOwnProperty(configKey) ? context.options[configKey] : {};

	delete query.config;

	return Object.assign(query, config);
}

module.exports = function loader(content) {
    let config   = getLoaderConfig(this)
    let data = {
        includes: config.includePath,
        vars:     config.vars[this.getDependencies()[0]],
        template: content,
    }

    return execSync(`perl templater.pl`, { input: JSON.stringify(data) })
}
