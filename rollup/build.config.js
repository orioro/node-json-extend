const path = require('path')

const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const babel = require('rollup-plugin-babel')

module.exports = {
	input: 'src/index.js',
	output: [
		{
			file: 'index.js',
			dir: 'dist',
			format: 'cjs',
			exports: 'named',
		},
		{
			file: 'index.mjs',
			dir: 'dist',
			format: 'esm',
		}
	],
	external: Object.keys(require('../package.json').dependencies || {}),
	plugins: [
		babel({
			babelrc: true,
			exclude: 'node_modules/**'
		}),
		resolve(),
		commonjs(),
	]
}
