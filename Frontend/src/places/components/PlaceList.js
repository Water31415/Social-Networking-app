import React, { useContext, useEffect, useMemo, useState } from "react";
import "./PlaceList.css"
import Card from "../../shared/components/UIElements/Card";
import PlaceItem from "./PlaceItem";
import Button from "../../shared/components/FormElements/Button";
import { Masonry } from "../../shared/components/UI";
import { TripFeedCard } from "../../trips/components/TripFeed";
import useTripFeed from "../../trips/hooks/useTripFeed";
import { backendImageUrl } from "../../shared/Utils/backend-url";
import Modal from "../../shared/components/UIElements/Modal";
import { PlaceSearchContext } from "../../shared/components/context/place-search-context";
import { useHistory, useLocation } from "react-router-dom";

const readSharedPlaceKey = hash => {
    try {
        const key = decodeURIComponent(hash.slice(1));
        return key.startsWith('place-') ? key : '';
    } catch {
        return '';
    }
};

const PlaceList = props=>{
     const [selectedItemKey, setSelectedItemKey] = useState(null);
     const history = useHistory();
     const routeLocation = useLocation();
     const sharedPlaceKey = readSharedPlaceKey(routeLocation.hash);
     const { searchTerm: searchValue, setSearchTerm: setSearchValue } = useContext(PlaceSearchContext);
     const searchQuery = searchValue.trim().toLowerCase();

     const filteredPlaces = useMemo(() => (props.items || []).filter(place => {
        if (!searchQuery) return true;
        const creatorName = typeof place.creator === 'object'
            ? place.creator?.name
            : place.creatorName;
        return [place.title, creatorName].some(value => (value || '').toLowerCase().includes(searchQuery));
     }), [props.items, searchQuery]);

     const trips = useTripFeed({
        userId: props.tripFeedUserId,
        enabled: props.includeTripFeed !== false && !searchQuery
     });
     const feedItems = useMemo(() => {
        const places = filteredPlaces;
        const placeItems = places.map(place => ({ type: 'place', key: `place-${place.id}`, data: place }));
        const tripItems = searchQuery
            ? []
            : trips.map(trip => ({ type: 'trip', key: `trip-${trip.id || trip._id}`, data: trip }));
        if (!tripItems.length) return placeItems;
        if (!placeItems.length) return tripItems;

        const gapCount = Math.max(1, placeItems.length - 1);
        const gaps = Array.from({ length: gapCount }, () => []);
        tripItems.forEach(trip => gaps[Math.floor(Math.random() * gaps.length)].push(trip));

        const mixed = [];
        placeItems.forEach((place, index) => {
            mixed.push(place);
            if (gaps[index]?.length) mixed.push(...gaps[index]);
        });
        return mixed;
     }, [filteredPlaces, searchQuery, trips]);

     const galleryItems = useMemo(() => feedItems.map(item => {
        const record = item.data;
        const isTrip = item.type === 'trip';
        const cover = isTrip
            ? record.coverImage || record.stops?.find(stop => stop.images?.length)?.images?.[0]
            : record.images?.[0] || record.image;
        const tripDescription = `${record.creator?.name || 'SnapIt! traveler'} · ${record.stops?.length || 0} stops`;

        return {
            id: item.key,
            title: record.title || (isTrip ? 'Trip journal' : 'Untitled place'),
            description: isTrip
                ? tripDescription
                : [record.creator?.name || record.creatorName ? `By ${record.creator?.name || record.creatorName}` : '', record.address || record.description || ''].filter(Boolean).join(' · '),
            alt: isTrip ? `${record.title || 'Trip'} cover` : `${record.title || 'Place'} photo`,
            img: cover ? backendImageUrl(cover) : `${process.env.PUBLIC_URL}/images/landscape.png`,
            feedKey: item.key,
            feedType: item.type,
            feedRecord: record,
            selected: item.key === selectedItemKey
        };
     }), [feedItems, selectedItemKey]);

     const selectedItem = feedItems.find(item => item.key === selectedItemKey) || null;
     const selectedDescription = selectedItem?.type === 'trip'
        ? selectedItem.data.description || selectedItem.data.stops?.map(stop => stop.note).filter(Boolean).join(' ')
        : selectedItem?.data.description;

     useEffect(() => {
        if (!sharedPlaceKey || !(props.items || []).some(place => `place-${place.id || place._id}` === sharedPlaceKey)) return;
        setSearchValue('');
        setSelectedItemKey(sharedPlaceKey);
     }, [sharedPlaceKey, props.items, setSearchValue]);

     useEffect(() => {
        if (selectedItemKey && !selectedItem) setSelectedItemKey(null);
     }, [selectedItem, selectedItemKey]);

     const clearSharedAnchor = () => {
        if (routeLocation.hash) history.replace({ ...routeLocation, hash: '' });
     };

     const closePreview = () => {
        setSelectedItemKey(null);
        clearSharedAnchor();
     };

     const handlePlaceDelete = deletedPlaceId => {
        closePreview();
        props.onDeletePlace?.(deletedPlaceId);
     };

     const handleItemClick = (item, index, event) => {
        event.preventDefault();
        clearSharedAnchor();
        setSelectedItemKey(current => current === item.feedKey ? null : item.feedKey);
     };

      if (feedItems.length === 0){
        return (
            <div className="place-list">
                <Card className="place-list__empty">
                    <h2>{searchQuery ? 'No matching places' : 'No places found'}</h2>
                    <p>{searchQuery ? `No place name or creator matches “${searchValue.trim()}”.` : 'Be the first to share a place.'}</p>
                    {searchQuery
                        ? <button className="place-list__clear-search" type="button" onClick={() => setSearchValue('')}>Clear search</button>
                        : <Button to="/places/new">Share a place</Button>}
                </Card>
            </div>
        );
     }

     return <div className="place-list">
        <Masonry
            className="places-masonry"
            items={galleryItems}
            columnWidth={250}
            minItemHeight={240}
            gap={16}
            radius={12}
            animateFrom="bottom"
            stagger={0.045}
            duration={0.65}
            bounce={0.12}
            blurToFocus
            revealOnScroll
            hoverEffect="zoom"
            captions="always"
            lightbox={false}
            draggable={false}
            onItemClick={handleItemClick}
        />
        <Modal
            show={Boolean(selectedItem)}
            onCancel={closePreview}
            noForm
            className="post-preview-modal"
            backdropClass="backdrop--blurred"
            dialogLabel={selectedItem?.data.title || 'Post details'}
            header={<><span>{selectedItem?.data.title || 'Post details'}</span><button className="post-preview-modal__close" type="button" onClick={closePreview} aria-label="Close post details">×</button></>}
            headerClass="post-preview-modal__header"
            contentClass="post-preview-modal__content"
            footerClass="post-preview-modal__footer"
        >
            {selectedItem?.type === 'trip' && selectedDescription && <p className="post-preview-modal__description">{selectedDescription}</p>}
            {selectedItem?.type === 'trip' ? <TripFeedCard key={selectedItem.key} trip={selectedItem.data} /> : selectedItem && <PlaceItem
                key={selectedItem.key}
                id={selectedItem.data.id}
                image={selectedItem.data.image}
                images={selectedItem.data.images}
                title={selectedItem.data.title}
                description={selectedItem.data.description}
                address={selectedItem.data.address}
                creatorName={selectedItem.data.creator?.name || selectedItem.data.creatorName}
                creator={selectedItem.data.creator?._id?.toString() || selectedItem.data.creator?.toString?.()}
                coordinates={selectedItem.data.location}
                likes={selectedItem.data.likes || []}
                comments={selectedItem.data.comments || []}
                shareCount={selectedItem.data.shareCount || 0}
                distanceKm={selectedItem.data.distanceKm}
                initiallyExpanded
                onDelete={handlePlaceDelete}
            />}
        </Modal>
     </div>

}
export default PlaceList
