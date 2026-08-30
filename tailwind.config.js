/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // UALE design system — mirrored from the Florence/UALE production tokens
        // (the visual source of truth) so FCTC Coach visually belongs to the
        // same product family. Chrome uses these; instructional diagrams keep
        // their functional colors.
        uale: {
          ivory: '#F5F2EC', // page canvas
          paper: '#F8F6F1', // content surface
          card: '#FCFAF6',  // card surface
          stone: { 50: '#F1EDE6', 100: '#ECE7DF', 200: '#DED8CF', 300: '#D0C8BC' },
          ink: '#29252E',   // primary heading
          'ink-2': '#332E38',
          text: '#3C3740',  // body text
          sec: '#6D6764',   // secondary text
          faint: '#9A948C', // faint labels
          hero: { 1: '#514650', 2: '#3D3442', 3: '#29232E' },
          cream: '#F1EBDF',
          brass: '#A58B68',
          'brass-2': '#846D52',
          'brass-lite': '#B49A71',
          champagne: '#D5C5AB',
          'brass-soft': '#EDE4D7',
          lav: '#9188B7', 'lav-soft': '#F2EFF8',
          sage: '#809681', 'sage-soft': '#F0F4EF', 'sage-chip': '#E1EAE1',
          sand: '#B9A17F', 'sand-soft': '#F6EFE6',
          blush: '#C6A29F', 'blush-soft': '#F8F0EF',
          cta: { fill: '#F4EFE7', text: '#302A31', border: '#AE936E', hover: '#EAE1D5' },
        },
      },
      fontFamily: {
        'uale-serif': [
          'var(--font-uale-serif)',
          'Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'ui-serif', 'serif',
        ],
      },
    },
  },
  plugins: [],
}
