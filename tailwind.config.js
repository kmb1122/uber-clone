/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ["JakartaRegular"],
        "jakarta-medium": ["JakartaMedium"],
        "jakarta-semibold": ["JakartaSemiBold"],
        "jakarta-bold": ["JakartaBold"],
      },
    },
  },
  plugins: [],
};
