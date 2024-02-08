module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	overrides: [
		{
			env: { node: true },
			files: [ '.eslintrc.{js,cjs}' ],
			parserOptions: { sourceType: 'script' },
		},
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	ignorePatterns: [ 'node_modules/*', 'dist/*' ],
	plugins: [ '@stylistic', '@typescript-eslint' ],
	extends: [ 'eslint:recommended', 'plugin:@typescript-eslint/recommended' ],
	rules: {
		'@stylistic/indent': [ 'error', 'tab' ],
		'@stylistic/linebreak-style': [ 'error', 'unix' ],
		'@stylistic/quotes': [ 'error', 'single' ],
		'@stylistic/semi': [ 'error', 'always' ],
		'@stylistic/jsx-indent': [ 'error', 'tab' ],
		'@stylistic/object-curly-spacing': [ 'error', 'always' ],
		'@stylistic/array-bracket-spacing': [ 'error', 'always' ],
		'@stylistic/arrow-parens': [ 'error', 'always' ],
		'@stylistic/arrow-spacing': [ 'error', { 'before': true, 'after': true } ],
		'@stylistic/block-spacing': [ 'error', 'always' ],
		'@stylistic/brace-style': [ 'error', '1tbs', { allowSingleLine: true } ],
		'@stylistic/comma-dangle': [ 'error', 'only-multiline' ],
		'@stylistic/max-len': [ 'error', { 'code': 160, tabWidth: 4 } ],
		'@stylistic/no-multiple-empty-lines': [ 'error', { max: 1, maxEOF: 0, maxBOF: 0 } ]
	},
};
