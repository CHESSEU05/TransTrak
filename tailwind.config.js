/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#007FFF',
        primaryDark: '#004D99',
        primarySoft: '#EAF3FF',
        accent: '#004D99',
        accentSoft: '#E8F1FF',
        info: '#2D9CDB',
        success: '#2ECC71',
        successSoft: '#EAFBF1',
        warning: '#F39C12',
        warningSoft: '#FFF7E8',
        danger: '#E74C3C',
        dangerSoft: '#FDECEC',
        taxi: '#FACC15',
        bike: '#16A34A',
        background: '#F7F9FC',
        surface: '#FFFFFF',
        surfaceAlt: '#EEF6FF',
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
