import { styled } from "@mui/material";


export const TitleBar = styled( 'h1' )( ( { theme } ) => ( {
  margin: '0',
  padding: '10px',
  textAlign: 'left',
  fontWeight: 'bold',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.primary.contrastText,
} ) );