import React,{Suspense, useState} from 'react';
import {BrowserRouter as Router , Route ,Redirect, Switch} from 'react-router-dom'
import Places from './places/pages/places.js';
import MainNavigation from './shared/components/Navigation/MainNavigation.js';
import AuthUser from './user/pages/auth.js';
import UserPlaces from './places/pages/UserPlaces.js';
import UpdatePlace from './places/pages/UpdatePlace.js';
import { AuthContext } from './shared/components/context/auth-context.js';
import NewPlace from './places/pages/NewPlaces.js';
import Dashboard from './user/pages/Dashboard.js';
import NearbyPlaces from './places/pages/NearbyPlaces.js';
import StartTrip from './trips/pages/StartTrip.js';
import ActiveTrip from './trips/pages/ActiveTrip.js';
import ReviewTrip from './trips/pages/ReviewTrip.js';
import { TripProvider } from './shared/components/context/trip-context.js';
import { CheckAuth } from './shared/hooks/auth-hook.js';
import { LoadingText } from './shared/components/UI';
import { PlaceSearchContext } from './shared/components/context/place-search-context.js';
//const User = React.lazy(()=> import('./user/pages/user.js'))
//const Places = React.lazy(()=> import('./places/pages/NewPlaces.js'))
//const AuthUser = React.lazy(()=> import('./user/pages/auth.js'))
//const UserPlaces = React.lazy(()=> import('./places/pages/UserPlaces.js'))
//const UpdatePlace = React.lazy(()=> import('./places/pages/UpdatePlace.js'))
//const NewPlace = React.lazy(()=> import('./places/pages/NewPlaces.js'))



const App = () => {

const {login,logout,token,userId}= CheckAuth() 
const [placeSearchTerm, setPlaceSearchTerm] = useState('');

let routes


  if (token) {
    routes=(
      <Switch>
      <Route path = "/" exact>
        <Places/>
      </Route>
      <Route path="/near-me" exact><NearbyPlaces/></Route>
      <Route path ="/:userId/places" exact >
        <UserPlaces/>
      </Route>
      <Route path="/dashboard" exact><Dashboard/></Route>
      <Route path="/places/new" exact><Redirect to="/?create=1"/></Route>
      <Route path="/places/new/place" exact><NewPlace/></Route>
      <Route path="/places/new/trip" exact><StartTrip/></Route>
      <Route path="/trips/start" exact><Redirect to="/places/new/trip"/></Route>
      <Route path="/trips/:tripId/publish" exact render={({ match }) => <Redirect to={`/trips/${match.params.tripId}/review`} />} />
      <Route path="/trips/:tripId/review" exact><ReviewTrip/></Route>
      <Route path="/trips/:tripId" exact><ActiveTrip/></Route>
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
        <Places/>
      </Route>
      <Route path ="/:userId/places" exact ><UserPlaces/></Route>
        <Route path ="/auth">
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
    <TripProvider>
    <PlaceSearchContext.Provider value={{ searchTerm: placeSearchTerm, setSearchTerm: setPlaceSearchTerm }}>
    <Router>
      <div className="app-shell">
        <div className="app-content">
          <MainNavigation/>
          <main>
            <Suspense fallback={<div className='center'><LoadingText text="SnapIt" /></div>} ></Suspense>
            {routes}
          </main>
        </div>
      </div>
  </Router>
  </PlaceSearchContext.Provider>
  </TripProvider>
  </AuthContext.Provider>
  )
  
}

export default App;
