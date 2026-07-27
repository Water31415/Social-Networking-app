import React,{useState,useCallback} from 'react';
import {BrowserRouter as Router , Route ,Redirect, Switch} from 'react-router-dom'
import User from './user/pages/user.js';
import Places from './places/pages/NewPlaces.js'
import MainNavigation from './shared/components/Navigation/MainNavigation.js';
import AuthUser from './user/pages/auth.js';
import UserPlaces from './places/pages/UserPlaces.js';
import UpdatePlace from './places/pages/UpdatePlace.js';
import { AuthContext } from './shared/components/context/auth-context.js';
import NewPlace from './places/pages/NewPlaces.js';



const App = () => {

  const[isLoggedIn,setIsLoggedIn]=useState(false)

const login=useCallback(()=>{
  setIsLoggedIn(true)
},[])

const logout=useCallback(()=>{
  setIsLoggedIn(false)
},[])

let routes

  if (isLoggedIn) {
    routes=(
      <Switch>
      <Route path = "/" exact>
        <User/>
      </Route>
      <Route path ="/:userId/places" exact >
        <UserPlaces/>
      </Route>
      <Route path = "/places/new" >
        <NewPlace/>
      </Route>
      <Route path="/places/:placeId">
        <UpdatePlace/>
      </Route>
        <Redirect to="/" />
      </Switch>
    )
  } else {
    routes=(
      <Switch>
      <Route path = "/" exact>
        <User/>
      </Route>
      <Route path = "/places/new" >
        <Places/>
      </Route>
        <Route to ="/auth">
          <AuthUser/>
        </Route>
        <Redirect to="/auth" />
      </Switch>
      
    )
    
  }


  return (
    <AuthContext.Provider value={{
      isLoggedIn:isLoggedIn,
      login:login,
      logout:logout
    }}>
    <Router>
      <MainNavigation/>
        <main>
          {routes}
        </main>
  </Router>
  </AuthContext.Provider>
  )
  
}

export default App;
