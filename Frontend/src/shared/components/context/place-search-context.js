import React from 'react';

export const PlaceSearchContext = React.createContext({
  searchTerm: '',
  setSearchTerm: () => {}
});
