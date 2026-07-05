import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const ignores = {
  ignores: [
    ".next/**",
    "node_modules/**",
    "frontend/**",
    "backend/**",
    "loadtest/**",
    "public/**",
    "brand/**",
    "pect/**",
    "*.pptx",
    "*.xlsx",
  ],
};

const config = [
  ignores,
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
