const key = 'lk-client:profile:v1'

export function loadProfile(storage, defaults) {
  try {
    const stored = JSON.parse(storage.getItem(key) ?? 'null')
    if (!stored || typeof stored !== 'object') return { ...defaults }
    const editable = ['firstName', 'lastName', 'middleName', 'position', 'email', 'phone', 'comment']
    const fields = Object.fromEntries(editable
      .filter(field => typeof stored[field] === 'string')
      .map(field => [field, stored[field]]))
    const photo = typeof stored.photo === 'string' && /^data:image\/(jpeg|png);base64,[\w+/]+=*$/.test(stored.photo)
      ? stored.photo : ''
    return { ...defaults, ...fields, photo }
  } catch {
    return { ...defaults }
  }
}

export function saveProfile(storage, profile) {
  storage.setItem(key, JSON.stringify(profile))
}

export function clearProfile(storage) {
  storage.removeItem(key)
}
