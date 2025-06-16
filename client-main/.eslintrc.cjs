module.exports = {
	root: true,
	env: {
		browser: true,
		es2020: true,
		node: true, // Add Node environment
	},
	extends: [
		"eslint:recommended",
		"plugin:react/recommended",
		"plugin:react/jsx-runtime",
		"plugin:react-hooks/recommended",
		"plugin:jsx-a11y/recommended", // Add accessibility rules
		"plugin:import/errors", // Add import rules
		"plugin:import/warnings",
	],
	ignorePatterns: ["dist", ".eslintrc.cjs"],
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: {
			jsx: true, // Enable JSX
		},
	},
	settings: {
		react: { version: "18.2" },
		"import/resolver": {
			node: {
				extensions: [".js", ".jsx"],
			},
		},
	},
	plugins: [
		"react-refresh",
		"jsx-a11y", 
		"import",
	],
	rules: {
		"react/jsx-no-target-blank": "off",
		"react-refresh/only-export-components": [
			"warn",
			{ allowConstantExport: true },
		],
		"react/prop-types": "off", 
		"react/react-in-jsx-scope": "off", 
		"import/order": ["error", { "newlines-between": "always" }], // Enforce import order
	},
};
