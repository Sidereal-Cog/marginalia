import { createTheme } from "@mui/material";


export const theme = createTheme( {
  palette: {
    primary: {
      light: '#757ce8',
      main: '#3f50b5',
      dark: '#002884',
      contrastText: '#fff',
    },
    secondary: {
      light: '#8792d1',
      main: '#6f7cc8',
      dark: '#5766be',
      contrastText: '#fff',
    },
    background: {
      default: '#3f50b5',
    },
  },
  components: {
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '30px',
        },
      },
    },
    // MuiListItemButton: {
    //   styleOverrides: {
    //     root: {
    //       '& '
    //     }
    //   },
    // },
  },
} );