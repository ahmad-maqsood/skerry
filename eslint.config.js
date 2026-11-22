import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// IPC must only appear in each directory's api.ts (see boundary encapsulation rules in src/AGENTS.md).
const ipcImportRestriction = {
  paths: [
    {
      name: "@tauri-apps/api/core",
      importNames: ["invoke"],
      message: "invoke can only be used in api.ts; call it through the corresponding directory's api.ts.",
    },
    {
      name: "@tauri-apps/api/event",
      importNames: ["listen"],
      message: "listen can only be used in api.ts; subscribe through the corresponding directory's api.ts.",
    },
  ],
};

// Files directly calling invoke / listen were downgraded to warn before refactoring. All legacy issues resolved (7.2); all rules are error.

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "src-tauri/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.base],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-imports": ["error", ipcImportRestriction],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression[source.value=/^@tauri-apps\\u002Fapi\\u002F(core|event)$/]",
          message: "Do not bypass api.ts IPC boundary encapsulation using dynamic imports.",
        },
      ],
    },
  },
  {
    files: ["src/**/api.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    // utils/ holds pure functions only: no dependency on React or Tauri.
    files: ["src/utils/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react/*", "react-dom", "react-dom/*"], message: "utils/ must not depend on React." },
            { group: ["@tauri-apps/*"], message: "utils/ must not depend on Tauri." },
          ],
        },
      ],
    },
  },
);
