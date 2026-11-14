// Draft persistence is optional when storage is unavailable or full.
export const saveDraft = (key, serialized) => {
  try { window.localStorage.setItem(key, serialized) } catch {}
}
export const removeDraft = key => {
  try { window.localStorage.removeItem(key) } catch {}
}

const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const text = value => typeof value === 'string' ? value : ''
const amount = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : ''
const readDraft = key => {
  try { return record(JSON.parse(window.localStorage.getItem(key) || 'null')) }
  catch { return {} }
}

export const loadTripDraft = key => {
  const saved = readDraft(key)
  const form = record(saved.form || saved)
  return {
    title:text(form.title), plannedBudget:amount(form.plannedBudget),
    visibility:['private', 'followers', 'public'].includes(form.visibility) ? form.visibility : 'private',
    startAddress:form.startAddressFetched === true || form.startLocation ? '' : text(form.startAddress),
    startLocation:null,
    itinerary:(Array.isArray(form.itinerary) ? form.itinerary : [])
      .filter(item => item && typeof item.plannedPlace === 'string')
      .map(item => ({
        day:Number.isSafeInteger(Number(item.day)) && Number(item.day) > 0 ? Number(item.day) : 1,
        plannedPlace:item.plannedPlace, plannedTime:text(item.plannedTime), done:item.done === true
      }))
  }
}

export const loadStopDraft = key => {
  const saved = readDraft(key)
  const form = record(saved.form || saved)
  const expenses = (Array.isArray(saved.expenses) ? saved.expenses : [])
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map(item => ({
      amount:amount(item.amount), note:text(item.note),
      category:['Other', 'Food', 'Transport', 'Lodging', 'Tickets', 'Shopping'].includes(item.category) ? item.category : 'Other'
    }))
  return {
    form:{ title:text(form.title), note:text(form.note), address:text(form.address) },
    expenses:expenses.length ? expenses : [{ amount:'', category:'Other', note:'' }]
  }
}
