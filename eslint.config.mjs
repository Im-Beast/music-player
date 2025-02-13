import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import vue from "eslint-plugin-vue";

const ignores = [
	".DS_Store/",
	"node_modules/",
	"coverage/",
	"dist/",
	"ios/",
	"android/",
	// local env files
	".env.local",
	".env.*.local",
	// Log files
	"npm-debug.log*",
	"yarn-debug.log*",
	"yarn-error.log*",
	"pnpm-debug.log*",
	// Lock file
	"pnpm-lock.yaml",
	// Editor directories and files
	".idea/",
	".vscode/",
];

export default defineConfigWithVueTs([
	...vue.configs["flat/essential"],
	vueTsConfigs.recommendedTypeChecked,
	{
		name: "app/files-to-ignore",
		ignores,
	},
	{
		rules: {
			"no-console": "off",
			"no-debugger": "off",
			"vue/no-deprecated-slot-attribute": "off",
			"@typescript-eslint/explicit-function-return-type": "error",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/prefer-promise-reject-errors": "off",

			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},
]);
