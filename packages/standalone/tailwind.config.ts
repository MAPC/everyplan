import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: "#1B4F72",
        blue: "#2E75B6",
        forest: "#1B6B52",
        teal: "#2E9E78",
        mint: "#43C99B",
        coral: "#D85A30",
        amber: "#BA7517",
        purple: "#534AB7",
        "ep-bg": "#F7F9FC",
        "ep-text": "#333333",
        "ep-secondary": "#555555",
        // Topic tag colors
        "tag-green-bg": "#E1F5EE",
        "tag-green-text": "#0F6E56",
        "tag-blue-bg": "#E6F1FB",
        "tag-blue-text": "#185FA5",
        "tag-amber-bg": "#FAEEDA",
        "tag-amber-text": "#854F0B",
        "tag-purple-bg": "#EEEDFE",
        "tag-purple-text": "#534AB7",
        "tag-coral-bg": "#FAECE7",
        "tag-coral-text": "#993C1D",
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
