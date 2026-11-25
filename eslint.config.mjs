import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

// ESLint 9 flat config. `eslint-config-next` 16 ships flat configs, so the
// FlatCompat wrapper (and @eslint/eslintrc) is no longer needed.
const eslintConfig = [
  { ignores: ["e2e-tests/**", ".next/**", "node_modules/**"] },
  ...nextVitals,
  ...nextTypescript,
  prettier,
];

export default eslintConfig;
