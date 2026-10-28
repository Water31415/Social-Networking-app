import React, { useEffect, useRef, useState } from 'react';
import './MorphSlider.css';

const MorphSlider = ({ items = [], onSelect, onHeightChange, label = 'Your places', initialIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
  const [aspectRatios, setAspectRatios] = useState({});
  const [imageWidth, setImageWidth] = useState(400);
  const sliderRef = useRef(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return undefined;
    const observer = new ResizeObserver(entries => {
      const width = entries[entries.length - 1]?.contentRect.width || slider.clientWidth;
      setImageWidth(Math.min(400, Math.max(1, width)));
    });
    observer.observe(slider);
    return () => observer.disconnect();
  }, []);

  const activeImage = items[activeIndex]?.image;
  const aspectRatio = aspectRatios[activeImage] || 1.5;
  const sliderHeight = Math.round(imageWidth / aspectRatio);

  useEffect(() => {
    if (items.length) onHeightChange?.(sliderHeight);
  }, [items.length, onHeightChange, sliderHeight]);

  if (!items.length) return null;

  const show = index => setActiveIndex((index + items.length) % items.length);
  const selectActive = () => onSelect?.(items[activeIndex], activeIndex);

  return (
    <section ref={sliderRef} className="morph-slider" aria-label={label} style={{ height: `${sliderHeight}px` }}>
      <div className="morph-slider-stage">
        {items.map((item, index) => (
          <button
            className={`morph-slider-slide${index === activeIndex ? ' is-active' : ''}`}
            type="button"
            key={item.id || `${item.caption}-${index}`}
            onClick={selectActive}
            tabIndex={index === activeIndex ? 0 : -1}
            aria-label={`Show details for ${item.caption || `place ${index + 1}`}`}
            aria-hidden={index !== activeIndex}
          >
            <img className="morph-slider-slide__backdrop" src={item.image} alt="" aria-hidden="true" draggable="false" />
            <img
              className="morph-slider-slide__image"
              src={item.image}
              alt={item.caption || ''}
              draggable="false"
              style={{ width: `${imageWidth}px` }}
              onLoad={event => {
                const image = event.currentTarget;
                if (!image.naturalWidth || !image.naturalHeight) return;
                const ratio = image.naturalWidth / image.naturalHeight;
                setAspectRatios(current => current[item.image] === ratio ? current : { ...current, [item.image]: ratio });
              }}
            />
          </button>
        ))}
        {items.length > 1 && (
          <div className="morph-slider-controls">
            <button type="button" className="morph-slider-btn" onClick={() => show(activeIndex - 1)} aria-label="Previous place">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
            </button>
            <button type="button" className="morph-slider-btn" onClick={() => show(activeIndex + 1)} aria-label="Next place">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>
          </div>
        )}
        {items[activeIndex].caption && (
          <div className="morph-slider-caption" aria-live="polite">
            <span className="morph-slider-caption-text is-active">{items[activeIndex].caption}</span>
          </div>
        )}
      </div>
      {items.length > 1 && (
        <div className="morph-slider-indicators" role="group" aria-label="Choose a place">
          {items.map((item, index) => (
            <button
              key={item.id || `${item.caption}-${index}`}
              type="button"
              className={`morph-slider-dot${index === activeIndex ? ' is-active' : ''}`}
              aria-label={`Go to ${item.caption || `place ${index + 1}`}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => show(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default MorphSlider;

