import './App.css';
import { Box, Collapse, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { TitleBar } from './styled-components';
import { useEffect, useState } from 'react';

declare var chrome:any;

const domainNotes = [
  'Domain Notes 1',
  'Domain Notes 2',
  'Domain Notes 3',
  'Domain Notes 4',
  'Domain Notes 5',
  'Domain Notes 6',
  'Domain Notes 7',
  'Domain Notes 8',
];


function App() {
  const [ loading, setLoading ] = useState( true );
  const [ url, setUrl ] = useState<URL|null>( null );
  const [ domain, setDomain ] = useState<string>( '' );
  const [ subDomain, setSubDomain ] = useState<string>( '' );
  const [ path, setPath ] = useState<string>( '' );
  const [ query, setQuery ] = useState<string>( '' );
  const [ domainOpen, setDomainOpen ] = useState<boolean>( false );
  const [ subDomainOpen, setSubDomainOpen ] = useState<boolean>( false );
  const [ pathOpen, setPathOpen ] = useState<boolean>( false );
  const [ queryOpen, setQueryOpen ] = useState<boolean>( false );

  useEffect( () => {
    // sync with service worker for current url
    chrome.storage.sync.get( ( data:any ) => {
      console.log( 'storage', data );
      let { url } = data;
      if ( url ) {
        setUrl( new URL( url ) );
      }
    } );
    // listen for changes to the url
    chrome.storage.sync.onChanged.addListener( ( changes:any ) => {
      console.log( 'storage changed', changes );
      let { url } = changes;
      if ( url ) {
        setUrl( new URL( url.newValue ) );
      }
    } );
  }, [] )

  //update url compontnents when it changes
  useEffect( () => {
    if ( url ) {
      console.log( 'url changed', url );
      let hostname = url.hostname.replace( 'www.', '' );
      let path = url.pathname;
      let query = url.search;
      let subDomains = hostname.split( '.' );
      let tld = subDomains.pop();
      let domain = ( subDomains.pop() || '' ) + '.' + tld;
      let subDomain = subDomains.join( '.' );

      setDomain( domain );
      setSubDomain( subDomain );
      setPath( path );
      setQuery( query );
      setLoading( false );
    }
  }, [ url ] );


  return (
    <Box>
      <Box><TitleBar>Marginalia</TitleBar></Box>
      <List sx={ { padding: 0 } }>
        <ListItemButton onClick={ () => setDomainOpen( !domainOpen ) }>
          <ListItemIcon><LanguageIcon/></ListItemIcon>
          <ListItemText variant='h2'>Domain: { domain }</ListItemText>
        </ListItemButton>
        <Collapse in={ domainOpen }>
          <List>
            { domainNotes.map( ( note, index ) => (
              <ListItem key={ index }>
                <ListItemText primary={ note }/>
              </ListItem>
            ) ) }
          </List>
        </Collapse>
      </List>
    </Box>
  );
}

export default App;
