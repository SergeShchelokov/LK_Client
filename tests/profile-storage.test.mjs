import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clearProfile, loadProfile, saveProfile } from '../src/profile-storage.mjs'

test('profile edits and avatar survive reload; clearing profile leaves unrelated storage alone', () => {
  const values = new Map([['unrelated', 'keep']])
  const storage = {
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  const defaults = { firstName: 'Иван', photo: 'default', role: 'Администратор' }
  const photo = 'data:image/png;base64,AA=='
  saveProfile(storage, { firstName: 'Анна', photo, role: 'Другая роль' })
  assert.deepEqual(loadProfile(storage, defaults), { ...defaults, firstName: 'Анна', photo })
  saveProfile(storage, { firstName: 42, photo: 'data:image/svg+xml;base64,AA==' })
  assert.deepEqual(loadProfile(storage, defaults), defaults)
  saveProfile(storage, { photo: '' })
  assert.equal(loadProfile(storage, defaults).photo, 'default')
  saveProfile(storage, { photo: 'initials' })
  assert.equal(loadProfile(storage, defaults).photo, 'initials')
  clearProfile(storage)
  assert.deepEqual(loadProfile(storage, defaults), defaults)
  assert.equal(storage.getItem('unrelated'), 'keep')
})
