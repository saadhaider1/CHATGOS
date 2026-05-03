/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#f0f2f5',
        'chat-primary': '#00a884',
        'chat-secondary': '#54656f',
        'chat-bubble-user': '#dcf8c6',
        'chat-bubble-other': '#ffffff',
      }
    },
  },
  plugins: [],
}

