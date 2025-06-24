import eslintJs from "@eslint/js";
// import prettier from "eslint-config-prettier";
// import eslintConfigPrettier from "eslint-config-prettier/flat";
import prettier from "eslint-plugin-prettier/recommended";
// import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptEslint from "typescript-eslint";
import typescriptParser from "@typescript-eslint/parser";
import eslintPluginImport from "eslint-plugin-import";
import stylistic from "@stylistic/eslint-plugin";

export default [
  eslintJs.configs.recommended,
  ...typescriptEslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      parser: typescriptParser,
      parserOptions: {
        projectService: true,
        // project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: { "@stylistic": stylistic, import: eslintPluginImport },
    settings: { "import/resolver": { typescript: {} } },
    ignores: ["eslint.config.*", "*.json", "node_modules/*"],
    rules: {
      // Base ESLint rules
      indent: ["warn", 2],
      quotes: ["warn", "double"],
      semi: ["warn", "always"],
      curly: ["warn", "all"],
      "max-len": ["warn", { code: 120, ignorePattern: "^\\s*(// eslint-disable-)|(describe)|(test).+" }],
      "no-use-before-define": "off",
      "no-bitwise": "off",
      "no-else-return": "warn",
      "no-unneeded-ternary": "warn",
      "spaced-comment": "warn",
      "consistent-return": "warn",
      "no-useless-constructor": "warn",
      "prefer-destructuring": "warn",
      "prefer-const": "warn",
      "prefer-object-spread": "off",
      "no-return-assign": "warn",
      "default-case": "off",
      "no-restricted-syntax": "off",
      "no-plusplus": "off",
      "no-case-declarations": "warn",
      "array-callback-return": "off",
      "no-shadow": ["warn", { builtinGlobals: true, hoist: "functions", ignoreOnInitialization: false }],
      "no-prototype-builtins": "off",
      "default-param-last": "off",
      "lines-between-class-members": "off",
      camelcase: "off",
      "no-underscore-dangle": "off",
      "prefer-arrow-callback": "off",
      "prefer-template": "off",
      "no-undef": "off",
      "no-lonely-if": "warn",
      "no-fallthrough": "off",
      "comma-dangle": "off",
      "no-param-reassign": "warn",
      "func-names": ["error", "always"],
      "object-shorthand": ["warn", "methods"],
      "object-curly-newline": ["warn", { consistent: true }],
      "arrow-body-style": "off",
      "function-paren-newline": "off",
      "space-before-function-paren": "off",

      // Import rules
      "import/no-extraneous-dependencies": "off",
      "import/extensions": "off",
      "import/no-unresolved": "off",
      "import/no-useless-path-segments": "warn",
      "import/prefer-default-export": "off",
      "import/no-cycle": "warn",
      "import/order": "warn",

      // Prettier
      "prettier/prettier": ["warn"],

      // TypeScript rules
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@stylistic/member-delimiter-style": "warn",
      "@typescript-eslint/member-ordering": "warn",
      "@stylistic/type-annotation-spacing": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-restricted-types": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/restrict-plus-operands": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn"
    }
  }
];
