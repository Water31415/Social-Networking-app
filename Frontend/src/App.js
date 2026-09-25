import React,{Suspense} from 'react';
import {BrowserRouter as Router , Route ,Redirect, Switch} from 'react-router-dom'
import User from './user/pages/user.js';
import Places from './places/pages/NewPlaces.js'
import MainNavigation from './shared/components/Navigation/MainNavigation.js';
import AuthUser from './user/pages/auth.js';
import UserPlaces from './places/pages/UserPlaces.js';
import UpdatePlace from './places/pages/UpdatePlace.js';
import { AuthContext } from './shared/components/context/auth-context.js';
import NewPlace from './places/pages/NewPlaces.js';
import { CheckAuth } from './shared/hooks/auth-hook.js';
import LoadingSpinner from './shared/components/UIElements/LoadingSpinner.js';

//const User = React.lazy(()=> import('./user/pages/user.js'))
//const Places = React.lazy(()=> import('./places/pages/NewPlaces.js'))
//const AuthUser = React.lazy(()=> import('./user/pages/auth.js'))
//const UserPlaces = React.lazy(()=> import('./places/pages/UserPlaces.js'))
//const UpdatePlace = React.lazy(()=> import('./places/pages/UpdatePlace.js'))
//const NewPlace = React.lazy(()=> import('./places/pages/NewPlaces.js'))



const App = () => {

const {login,logout,token,userId}= CheckAuth() 

let routes
console.log(token);

  if (token) {
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
      isLoggedIn:!!token,
      token :token,
      login:login,
      logout:logout,
      userId:userId
    }}>
    <Router>
      <MainNavigation/>
        <main>
          <Suspense fallback={<div className='center' > <LoadingSpinner/></div>} ></Suspense>
          {routes}
        </main>
  </Router>
  </AuthContext.Provider>
  )
  
}

export default App;
