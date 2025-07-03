module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff9800', // orange
          light: '#ffc947',
          dark: '#c66900',
        },
        accent: {
          DEFAULT: '#ffd180', // light yellow-orange
          dark: '#ffb300',
        },
        secondary: {
          DEFAULT: '#212121', // dark for contrast
          light: '#484848',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
