import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { backendUrl } from '../../shared/Utils/backend-url';
import PlaceList from '../components/PlaceList';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import { AuthContext } from '../../shared/components/context/auth-context';
import { useHistory, useLocation } from 'react-router-dom';
import AddPlaceOptions from '../../shared/components/UI/AddPlaceOptions/AddPlaceOptions';
import { LoadingText } from '../../shared/components/UI';
import './places.css';

const Places = () => {
  const auth = useContext(AuthContext);
  const history = useHistory();
  const routeLocation = useLocation();
  const { isLoading, sendRequest, error, clearError } = useHttpClient();
  const [loadedPlaces, setLoadedPlaces] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [postSubmitLoadingText, setPostSubmitLoadingText] = useState('');
  const postSubmitLoadingTimer = useRef(null);
  const submittedLoadingLabel = routeLocation.state?.postSubmitLoadingText;
  const showCreatePanel = auth.isLoggedIn && new URLSearchParams(routeLocation.search).get('create') === '1';
  const closeCreatePanel = () => history.replace('/');
  const placeDeleteHandler = deletedPlaceId => {
    const keepPlace = place => String(place.id || place._id) !== String(deletedPlaceId);
    setLoadedPlaces(current => current?.filter(keepPlace) ?? current);
    setNearbyPlaces(current => current?.filter(keepPlace) ?? current);
  };

  useEffect(() => {
    if (!submittedLoadingLabel) return;
    setPostSubmitLoadingText(submittedLoadingLabel);
    window.clearTimeout(postSubmitLoadingTimer.current);
    postSubmitLoadingTimer.current = window.setTimeout(() => {
      setPostSubmitLoadingText('');
      postSubmitLoadingTimer.current = null;
    }, 1500);
    history.replace({ pathname: routeLocation.pathname, search: routeLocation.search, hash: routeLocation.hash });
  }, [submittedLoadingLabel, history, routeLocation.pathname, routeLocation.search, routeLocation.hash]);

  useEffect(() => () => window.clearTimeout(postSubmitLoadingTimer.current), []);

  const findNearbyPlaces = useCallback(() => {
    if (nearbyPlaces) {
      setNearbyPlaces(null);
      setLocationError('');
      window.dispatchEvent(new CustomEvent('snapit:nearby-state', { detail: { active: false } }));
      return;
    }

    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location services are not available in this browser.');
      window.dispatchEvent(new CustomEvent('snapit:nearby-state', { detail: { active: false } }));
      return;
    }

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const result = await sendRequest(
          backendUrl(`api/places/nearby?lat=${coords.latitude}&lng=${coords.longitude}&radius=100`)
        );
        const places = (result.places || []).map(place => ({
          ...place,
          id: (place.id || place._id).toString()
        }));
        setNearbyPlaces(places);
        window.dispatchEvent(new CustomEvent('snapit:nearby-state', { detail: { active: true } }));
      } catch (requestError) {
        setLocationError(requestError.message || 'Could not load nearby places.');
        window.dispatchEvent(new CustomEvent('snapit:nearby-state', { detail: { active: false } }));
      }
    }, () => {
      setLocationError('Location permission is needed to find places near you.');
      window.dispatchEvent(new CustomEvent('snapit:nearby-state', { detail: { active: false } }));
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }, [nearbyPlaces, sendRequest]);

  useEffect(() => {
    const handleFindNearby = () => {
      if (auth.isLoggedIn) findNearbyPlaces();
    };
    window.addEventListener('snapit:find-nearby', handleFindNearby);
    return () => window.removeEventListener('snapit:find-nearby', handleFindNearby);
  }, [auth.isLoggedIn, findNearbyPlaces]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const responseData = await sendRequest(backendUrl('api/places'));
        const placeData = responseData.places || responseData.place || [];
        const places = Array.isArray(placeData)
          ? placeData.map(place => ({ ...place, id: (place.id || place._id).toString() }))
          : [];
        setLoadedPlaces(places);
      } catch {
        // useHttpClient exposes the error to ErrorModal.
      }
    };

    fetchPlaces();
  }, [sendRequest]);

  return (
    <div className={`places-page${showCreatePanel ? ' places-page--with-create' : ''}`}>
      {showCreatePanel && <aside className="places-page__create"><AddPlaceOptions onClose={closeCreatePanel} /></aside>}
      <section className="places-page__feed" aria-label="Places feed">
        <header className="places-page__intro">
          <div>
            <p className="places-page__eyebrow"><span aria-hidden="true" />The SnapIt journal</p>
            <h1>{nearbyPlaces ? <>Around <em>your corner.</em></> : <>Somewhere <em>worth sharing.</em></>}</h1>
          </div>
          <p className="places-page__intro-note">A place. A photograph. A story.<br /> See the world through someone else's lens.</p>
        </header>
        <div className="places-page__toolbar" aria-label="Explore places">
          <div className="places-page__filters">
            <button type="button" className={!nearbyPlaces ? 'is-active' : ''} aria-pressed={!nearbyPlaces} onClick={() => { if (nearbyPlaces) findNearbyPlaces(); }}>All places</button>
            <button type="button" className={nearbyPlaces ? 'is-active' : ''} aria-pressed={Boolean(nearbyPlaces)} disabled={isLoading} onClick={() => { if (!auth.isLoggedIn) history.push('/auth'); else if (!nearbyPlaces) findNearbyPlaces(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>Near you</button>
          </div>
          <span className="places-page__collection-note">{nearbyPlaces ? 'Within 100 km of you' : 'Collected by the community'}<span aria-hidden="true"> ↗</span></span>
        </div>
        <ErrorModal error={error} onClear={clearError} />
        {locationError && <p className="places-location-error" role="status">{locationError}</p>}
        <LoadingText isLoading={!showCreatePanel && (isLoading || Boolean(postSubmitLoadingText))} text={postSubmitLoadingText || 'places'} />

        {!isLoading && (nearbyPlaces || loadedPlaces) && <PlaceList items={nearbyPlaces || loadedPlaces} includeTripFeed={!nearbyPlaces} onDeletePlace={placeDeleteHandler} />}
      </section>
    </div>
  );
};

export default Places;
