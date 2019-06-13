const fs = require('fs')
const path = require('path')

const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const babel = require('rollup-plugin-babel')

const DEMO_DIR = path.join(__dirname, '../demo')

const demos = fs.readdirSync(DEMO_DIR).filter(name => {
	return fs.statSync(path.join(DEMO_DIR, name)).isDirectory()
})

const demoConfig = demoName => ({
	input: `demo/${demoName}/index.js`,
	output: {
		name: `demo`,
		file: 'index.bundle.js',
		dir: `demo/${demoName}`,
		format: 'iife',
	},
	watch: {},
	plugins: [
		resolve(),
		commonjs(),
		babel({
			exclude: 'node_modules/**'
		})
	]
})

module.exports = demos.map(demoConfig)
