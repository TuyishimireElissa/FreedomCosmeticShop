import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ESLint config for Ubumwe Beauty.
 *
 * Philosophy: permissive in development (don't block iteration),
 * but enforce the most common bug-catching rules.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // ─── TypeScript ────────────────────────────────────────────────
      // Allow `any` during rapid prototyping, but warn
      "@typescript-eslint/no-explicit-any": "warn",
      // Error on unused vars (prefixed with _ are allowed)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-disable-directive": "off",

      // ─── React ─────────────────────────────────────────────────────
      // Off — exhaustive-deps is too aggressive for our patterns
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/purity": "off",
      // Allow apostrophes in JSX text ("Beauty's")
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",

      // ─── Next.js ───────────────────────────────────────────────────
      // Allow <img> for external images (we use Unsplash CDN in MVP)
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // ─── General JavaScript ────────────────────────────────────────
      "prefer-const": "warn",
      "no-unused-vars": "off", // Use TS rule instead
      // Allow console.log in dev, error in production builds
      "no-console": process.env.NODE_ENV === "production" ? ["warn", { allow: ["warn", "error"] }] : "off",
      "no-debugger": "warn",
      "no-empty": "warn",
      "no-irregular-whitespace": "error",
      "no-case-declarations": "off",
      "no-fallthrough": "warn",
      "no-mixed-spaces-and-tabs": "error",
      "no-redeclare": "off", // TS handles this
      "no-undef": "off", // TS handles this
      "no-unreachable": "warn",
      "no-useless-escape": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      "mini-services/**",
      "*.config.mjs",
      "*.config.ts",
    ],
  },
];

export default eslintConfig;
