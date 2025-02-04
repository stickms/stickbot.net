import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        blue: {
          50: { value: '#EAF1FB' },
          100: { value: "#C3D9F4" },
          200: { value: "#9CC0EC" },
          300: { value: "#76A8E5" },
          400: { value: "#4F90DE" },
          500: { value: "#2877D7" },
          600: { value: "#205FAC" },
          700: { value: "#184781" },
          800: { value: "#103056" },
          900: { value: "#08182B" }
        }
      },
      cursor: {
        menuitem: { value: 'pointer' },
        option: { value: 'pointer' }
      }
    }
  },
  globalCss: {
    html: {
      colorPalette: 'blue',
    },
  },
});

export const system = createSystem(defaultConfig, config);
