import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // WICHTIG für den Light/Dark-Mode Switch
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#202124",
      },
    },
  },
  plugins: [],
};
export default config;