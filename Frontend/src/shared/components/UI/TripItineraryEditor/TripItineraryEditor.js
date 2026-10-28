import React from 'react'
import './TripItineraryEditor.css'

const TripItineraryEditor = ({ items = [], onChange, disabled = false }) => {
  const update = (index, key, value) => onChange(items.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const add = () => onChange([...items, { day: items.length ? Number(items[items.length - 1].day) || 1 : 1, plannedPlace: '', plannedTime: '', done: false }])
  const remove = index => onChange(items.filter((_, i) => i !== index))
  return <section className="trip-itinerary">
    <div className="trip-itinerary__heading"><div><h3>Itinerary</h3><p>Plan places by trip day. You can adjust it while travelling.</p></div><button type="button" onClick={add} disabled={disabled}>Add plan</button></div>
    {items.map((item, index) => <div className="trip-itinerary__row" key={item._id || index}>
      <label>Day<input type="number" min="1" value={item.day} disabled={disabled} onChange={event => update(index, 'day', Number(event.target.value))} /></label>
      <label>Place<input value={item.plannedPlace} disabled={disabled} onChange={event => update(index, 'plannedPlace', event.target.value)} placeholder="Place to visit" /></label>
      <label>Time<input type="time" value={item.plannedTime || ''} disabled={disabled} onChange={event => update(index, 'plannedTime', event.target.value)} /></label>
      <label className="trip-itinerary__done"><input type="checkbox" checked={Boolean(item.done)} disabled={disabled} onChange={event => update(index, 'done', event.target.checked)} /> Done</label>
      <button type="button" aria-label="Remove itinerary item" onClick={() => remove(index)} disabled={disabled}>×</button>
    </div>)}
    {!items.length && <p className="trip-itinerary__empty">No plans added yet.</p>}
  </section>
}

export default TripItineraryEditor
