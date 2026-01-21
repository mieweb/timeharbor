module.exports = {
  content: [
    './client/**/*.{html,js}',
    './server/**/*.{js}',
    './collections.js',
  ],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#6A5ACD",        // SlateBlue
          "primary-focus": "#5A4ABD",  // Darker SlateBlue
          "primary-content": "#ffffff",
          
          "secondary": "#4A5568",      // Slate gray
          "secondary-focus": "#2D3748",
          "secondary-content": "#ffffff",
          
          "accent": "#718096",         // Medium gray
          "accent-focus": "#4A5568",
          "accent-content": "#ffffff",
          
          "neutral": "#2D3748",        // Dark slate
          "neutral-focus": "#1A202C",
          "neutral-content": "#ffffff",
          
          "base-100": "#ffffff",       // White
          "base-200": "#F7FAFC",       // Light gray
          "base-300": "#E2E8F0",       // Lighter gray
          "base-content": "#1A202C",   // Near black
          
          "info": "#3182CE",           // Info blue
          "success": "#38A169",        // Success green
          "warning": "#D69E2E",        // Warning yellow
          "error": "#E53E3E",          // Error red
          
          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.25rem",
          "--rounded-badge": "0.125rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-text-case": "normal-case",
          "--btn-focus-scale": "0.95",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.25rem",
        },
        dark: {
          "primary": "#8B7FD9",        // Lighter SlateBlue for dark mode
          "primary-focus": "#7A6BC9",
          "primary-content": "#ffffff",
          
          "secondary": "#718096",      // Lighter gray for dark mode
          "secondary-focus": "#4A5568",
          "secondary-content": "#ffffff",
          
          "accent": "#9CA3AF",         // Light gray
          "accent-focus": "#718096",
          "accent-content": "#1A202C",
          
          "neutral": "#374151",        // Dark gray
          "neutral-focus": "#4B5563",
          "neutral-content": "#ffffff",
          
          "base-100": "#1F2937",       // Dark gray background
          "base-200": "#111827",       // Darker gray
          "base-300": "#374151",       // Medium dark gray
          "base-content": "#F9FAFB",   // Light text
          
          "info": "#60A5FA",           // Lighter info blue
          "success": "#34D399",        // Lighter success green
          "warning": "#FBBF24",        // Lighter warning yellow
          "error": "#F87171",          // Lighter error red
          
          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.25rem",
          "--rounded-badge": "0.125rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-text-case": "normal-case",
          "--btn-focus-scale": "0.95",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.25rem",
        },
      },
    ],
    darkTheme: "dark",
  },
  plugins: [require('daisyui')],
};