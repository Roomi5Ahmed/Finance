/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#181818",
        surfaceLight: "#222222",
        primary: "#FF98A2",
        primaryDark: "#E88590",
        foreground: "#EFEFEF",
        muted: "#8C8C8C",
        mutedDark: "#555555",
        border: "rgba(255,255,255,0.06)",
        borderLight: "rgba(255,255,255,0.1)",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        income: "#10B981",
        expense: "#FF98A2",
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
