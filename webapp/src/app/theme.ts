'use client'

import { createTheme } from '@mui/material';

  
  const theme = createTheme({
    typography: {
      fontFamily: ['var(--font-noto-sans-jp)', "var(--font-roboto)", "sans-serif"].join(","),
    },
  });

  export default theme