/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#007FFF',
        accent: '#004D99',
        success: '#2ECC71',
        warning: '#F39C12',
        danger: '#E74C3C',
        background: '#F7F9FC',
        surface: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        divider: '#E5E7EB',
      }, 
      fontFamily: {
        'jakarta': ['PlusJakartaSans-Regular', 'sans-serif'],
        'jakarta-bold': ['PlusJakartaSans-Bold', 'sans-serif'],
        'jakarta-semibold': ['PlusJakartaSans-SemiBold', 'sans-serif'],
        'jakarta-medium': ['PlusJakartaSans-Medium', 'sans-serif'],
        'jakarta-light': ['PlusJakartaSans-Light', 'sans-serif'],
        'jakarta-extralight': ['PlusJakartaSans-ExtraLight', 'sans-serif'],
        'jakarta-extrabold': ['PlusJakartaSans-ExtraBold', 'sans-serif'],
        'dmserif': ['DMSerifDisplay-Regular', 'serif'],
      },
    },
  },
  plugins: [],
}