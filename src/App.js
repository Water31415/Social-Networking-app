import React from 'react';
import {BrowserRouter as Router , Route ,Redirect, Switch} from 'react-router-dom'
import User from './user/pages/user.js';
import Places from './places/pages/NewPlaces.js'
import MainNavigation from './shared/components/Navigation/MainNavigation.js';
import AuthUser from './user/pages/auth.js';
import UserPlaces from './places/pages/UserPlaces.js';
import UpdatePlace from './places/pages/UpdatePlace.js';
const App = () => {
  return (
    <Router>
      <MainNavigation/>
        <main>
      <Switch>
      <Route path = "/" exact>
        <User/>
      </Route>
      <Route path ="/:userId/places" exact >
        <UserPlaces/>
      </Route>
      <Route path = "/places/new" >
        <Places/>
      </Route>
      <Route path="/places/:placeId">
        <UpdatePlace/>
      </Route>
        <Route to ="/auth">
          <AuthUser/>
        </Route>
        <Redirect to="/" />
      </Switch>
        </main>
  </Router>)
}

export default App;
