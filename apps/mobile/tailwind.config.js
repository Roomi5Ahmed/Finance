/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#01472e",
        surface: "#013925",
        surfaceLight: "#015033",
        primary: "#ccd5ae",
        primaryDark: "#a3b18a",
        foreground: "#fefae0",
        muted: "#a3b18a",
        mutedDark: "#77836c",
        border: "rgba(254,250,224,0.14)",
        borderLight: "rgba(254,250,224,0.24)",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
        income: "#34d399",
        expense: "#f472b6",
      },
      borderRadius: {
        card: "0px",
        button: "11px",
        input: "11px",
        badge: "4px",
        modal: "16px",
      },
      fontFamily: {
        heading: ["Inter_700Bold"],
        body: ["Inter_400Regular"],
        label: ["Roboto_900Black"],
      },
    },
  },
  plugins: [],
};
