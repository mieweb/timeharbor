import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        th: {
          dark:  '#222831',
          darker: '#31363F',
          accent: '#76ABAE',
          light:  '#EEEEEE',
        },
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#76ABAE",
          "primary-content": "#ffffff",
          "secondary": "#31363F",
          "secondary-content": "#EEEEEE",
          "accent": "#76ABAE",
          "neutral": "#222831",
          "base-100": "#EEEEEE",
          "base-content": "#222831",
          "info": "#3182CE",
          "success": "#38A169",
          "warning": "#D69E2E",
          "error": "#E53E3E",
        },
      },
      {
        dark: {
          "primary": "#76ABAE",
          "primary-content": "#ffffff",
          "secondary": "#31363F",
          "secondary-content": "#EEEEEE",
          "accent": "#76ABAE",
          "neutral": "#EEEEEE",
          "base-100": "#222831",
          "base-content": "#EEEEEE",
          "info": "#3182CE",
          "success": "#38A169",
          "warning": "#D69E2E",
          "error": "#E53E3E",
        },
      },
    ],
  },
  plugins: [daisyui],
};
