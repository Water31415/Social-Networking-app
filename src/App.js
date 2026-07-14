import React from 'react';
import {BrowserRouter as Router , Route ,Redirect, Switch} from 'react-router-dom'
import User from './user/pages/user.js';
import Places from './places/pages/NewPlaces.js'
import MainNavigation from './shared/components/Navigation/MainNavigation.js';
const App = () => {
  return 
  <Router>
    <MainNavigation/>
    <main>
    <Switch>
    <Route path = "/" exact>
      <User/>
    </Route>

    <Route path = "/places/new" >
      <Places/>
    </Route>
    <Redirect to="/" />
    </Switch>
    </main>
  </Router>
}

export default App;
