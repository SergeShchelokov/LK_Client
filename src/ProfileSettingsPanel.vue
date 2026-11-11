<script setup>
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { AlertDialog, Dialog, Menu, Tabs } from '@vuetify/v0/components'
import UiButton from './UiButton.vue'
import UiField from './UiField.vue'
import Trufols from './Trufols.vue'
import { clearProfile, loadProfile, saveProfile } from './profile-storage.mjs'
import closeIcon from './assets/close.svg'
import editIcon from './assets/edit.svg'
import uploadIcon from './assets/upload.svg'
import deletePhotoIcon from './assets/delete-photo.svg'
import deleteIcon from './assets/delete-profile.svg'
import lockIcon from './assets/lock.svg'
import showIcon from './assets/show.svg'
import hideIcon from './assets/hide.svg'
import checkIcon from './assets/check.svg'
import errorIcon from './assets/error.svg'
import footerLine from './assets/footer-line.svg'
import defaultAvatar from './assets/header-avatar.png'
import headerStar from './assets/header-star.svg'
import headerGrid from './assets/header-grid.svg'
import headerProfile from './assets/header-profile.svg'
import headerExit from './assets/header-exit.svg'

const tabs = [
  ['info', 'Основная информация'], ['security', 'Безопасность'],
  ['billing', 'Биллинг'], ['relax', 'Расслабиться'],
]
const sections = [
  { title: 'Личные данные', rows: [
    [['firstName', 'Имя', 'text', 'given-name', 60], ['lastName', 'Фамилия', 'text', 'family-name', 60], ['middleName', 'Отчество', 'text', 'additional-name', 60]],
    [['position', 'Должность', 'text', 'organization-title', 120]],
  ] },
  { title: 'Контактная информация', rows: [
    [['email', 'E-mail', 'email', 'email', 120], ['phone', 'Мобильный телефон', 'tel', 'tel', 32]],
  ] },
  { title: 'В компании', rows: [
    [['role', 'Роль'], ['department', 'Подразделение']],
  ] },
]
const exampleProfile = {
  firstName: 'Иван', lastName: 'Иванов', middleName: 'Иванович',
  position: 'Менеджер по работе с партнёрами', email: 'ivan.ivanov@example.com',
  phone: '+7 (900) 000-00-00', role: 'Администратор', department: 'Отдел продаж',
  comment: 'По рабочим вопросам — с 9:00 до 18:00', photo: 'default',
}
const saved = shallowRef({ ...exampleProfile })
try { saved.value = loadProfile(window.localStorage, exampleProfile) } catch { /* Storage may be blocked by browser settings. */ }
const draft = ref({ ...saved.value })
const open = shallowRef(false)
const headerAvatar = ref(null)
const signedOut = shallowRef(false)
const activeTab = shallowRef('info')
const fileInput = ref(null)
const profileForm = ref(null)
const errors = ref({})
const photoError = shallowRef('')
const status = shallowRef('')
const saveError = shallowRef('')
let photoRequest = 0
const initials = ({ lastName, firstName }) => [lastName, firstName].map(name => [...name.trim()][0] || '').join('').toLocaleUpperCase('ru') || '—'
const avatarSrc = photo => photo === 'initials' ? '' : photo === 'default' ? defaultAvatar : photo

function openProfile() {
  removed.value = false
  signedOut.value = false
  open.value = true
}

function useNativeMenuClick(event) {
  // Let native buttons dispatch click before v0's menu can consume the key.
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
}

watch(open, isOpen => {
  if (!isOpen) {
    photoRequest++
    draft.value = { ...saved.value }
    photoError.value = ''
    errors.value = {}
    saveError.value = ''
    resetPassword()
    nextTick(() => headerAvatar.value?.$el?.focus())
  }
})
watch(activeTab, tab => {
  status.value = ''
  saveError.value = ''
  if (tab !== 'security') resetPassword()
})

async function selectPhoto(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const request = ++photoRequest
  photoError.value = ''
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    photoError.value = 'Выберите изображение в формате JPG или PNG.'
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    photoError.value = 'Размер фото должен быть не больше 3 МБ.'
    return
  }
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close()
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    if (request === photoRequest && open.value) draft.value.photo = data
  } catch {
    if (request === photoRequest && open.value) photoError.value = 'Не удалось открыть изображение. Выберите другой файл.'
  }
}

function removePhoto() {
  photoRequest++
  draft.value.photo = 'initials'
  photoError.value = ''
}

async function submitProfile() {
  saveError.value = ''
  status.value = ''
  const { firstName, lastName, email, phone } = draft.value
  const fieldErrors = {}
  if (!firstName.trim()) fieldErrors.firstName = 'Введите имя.'
  if (!lastName.trim()) fieldErrors.lastName = 'Введите фамилию.'
  if (email.trim() && profileForm.value?.elements.email.validity.typeMismatch) fieldErrors.email = 'Проверьте адрес электронной почты.'
  if (phone.trim() && !/^\+?(?:[\s()-]*\d){7,15}[\s()-]*$/.test(phone.trim())) fieldErrors.phone = 'Проверьте номер телефона.'
  errors.value = fieldErrors
  if (Object.keys(fieldErrors).length) {
    activeTab.value = 'info'
    await nextTick()
    profileForm.value?.elements[Object.keys(fieldErrors)[0]]?.focus()
    return
  }
  const profile = { ...draft.value, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() }
  try {
    saveProfile(window.localStorage, profile)
    saved.value = profile
    draft.value = { ...profile }
    status.value = 'Изменения сохранены в этом браузере.'
  } catch {
    saveError.value = 'Не удалось сохранить профиль. Проверьте доступ к хранилищу браузера.'
  }
}

const changingPassword = shallowRef(false)
const passwords = ref(['', ''])
const visible = ref([false, false])
const firstPassword = ref(null)
const checks = computed(() => [
  { label: 'Не менее 8 символов', passes: passwords.value[0].length >= 8 },
  { label: 'Должен содержать минимум одну заглавную букву (A–Z)', passes: /[A-Z]/.test(passwords.value[0]) },
  { label: 'Должен содержать символ (!"№-)', passes: /[!"№-]/.test(passwords.value[0]) },
])
const matches = computed(() => passwords.value[0] === passwords.value[1])
const passwordReady = computed(() => checks.value.every(check => check.passes) && matches.value)

function resetPassword() {
  changingPassword.value = false
  passwords.value = ['', '']
  visible.value = [false, false]
}
async function startPassword() {
  status.value = ''
  changingPassword.value = true
  await nextTick()
  firstPassword.value?.[0]?.focus()
}
function savePassword() {
  if (!passwordReady.value) return
  resetPassword()
  status.value = 'Проверка пройдена. В демоверсии пароль аккаунта не меняется.'
}

const deleting = shallowRef(false)
const pending = shallowRef(false)
const confirmation = shallowRef('')
const confirmationPhrase = 'УДАЛИТЬ'
const removed = shallowRef(false)
const deleteError = shallowRef('')
watch(deleting, isOpen => {
  if (!isOpen) {
    confirmation.value = ''
    deleteError.value = ''
  }
})

async function confirmDelete() {
  if (pending.value || confirmation.value !== confirmationPhrase) return
  pending.value = true
  deleteError.value = ''
  try {
    await nextTick()
    clearProfile(window.localStorage)
    saved.value = { ...exampleProfile }
    deleting.value = false
    open.value = false
    removed.value = true
  } catch {
    deleteError.value = 'Не удалось удалить локальные данные. Попробуйте ещё раз.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Dialog.Root v-model="open">
    <header class="app-header">
      <div class="app-header__company">
        <span class="app-header__stars" aria-hidden="true">
          <span v-for="star in 4" :key="star"><img :src="headerStar" alt="" /></span>
        </span>
        <span class="app-header__name">Прогрессивные Технологии Сибирь-Софт</span>
      </div>
      <div class="app-header__actions">
        <img :src="headerGrid" alt="" />
        <Menu.Root>
          <Menu.Activator ref="headerAvatar" class="avatar app-header__avatar" aria-label="Меню профиля">
            <img v-if="avatarSrc(saved.photo)" :src="avatarSrc(saved.photo)" alt="" />
            <span v-else>{{ initials(saved) }}</span>
          </Menu.Activator>
          <Menu.Content class="header-menu" position-area="bottom span-left" aria-label="Профиль">
            <Menu.Item as="button" type="button" class="header-menu__item header-menu__item--profile" @keydown="useNativeMenuClick" @click="openProfile">
              <img :src="headerProfile" alt="" />Мой профиль
            </Menu.Item>
            <Menu.Item as="button" type="button" class="header-menu__item" @keydown="useNativeMenuClick" @click="signedOut = true; removed = false">
              <img :src="headerExit" alt="" />Выход
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
      </div>
    </header>
    <main class="app-status">
      <p v-if="removed" role="status">Локальные данные профиля удалены.</p>
      <p v-else-if="signedOut" role="status">Вы вышли из демопрофиля.</p>
    </main>
    <Dialog.Content class="profile" :scrim="false">
      <div class="profile-layout">
        <header class="profile-header">
          <Dialog.Title as="h1" tabindex="-1" autofocus>Мой профиль</Dialog.Title>
          <Dialog.Close class="icon-button" aria-label="Закрыть профиль"><img :src="closeIcon" alt="" /></Dialog.Close>
        </header>
        <Tabs.Root v-model="activeTab" class="profile-tabs">
          <Tabs.List class="tab-list" aria-label="Разделы профиля">
            <Tabs.Item v-for="[value, label] in tabs" :key="value" :value="value" :disabled="value === 'billing'" class="tab">{{ label }}</Tabs.Item>
          </Tabs.List>
          <div class="profile-scroll">
            <Tabs.Panel value="info" class="profile-content">
              <form ref="profileForm" id="profile-form" novalidate @submit.prevent="submitProfile">
                <div class="avatar-row">
                  <div class="avatar" aria-hidden="true">
                    <img v-if="avatarSrc(draft.photo)" :src="avatarSrc(draft.photo)" alt="" />
                    <span v-else>{{ initials(draft) }}</span>
                  </div>
                  <Menu.Root>
                    <Menu.Activator class="avatar-edit icon-button" aria-label="Изменить фото">
                      <img :src="editIcon" alt="" />
                    </Menu.Activator>
                    <Menu.Content class="avatar-menu" position-area="bottom span-right" aria-label="Действия с фото">
                      <Menu.Item as="button" type="button" class="avatar-action" @keydown="useNativeMenuClick" @click="fileInput?.click()">
                        <img :src="uploadIcon" alt="" /><span>Загрузить фото</span><small>(JPG, PNG • до 3 МБ)</small>
                      </Menu.Item>
                      <Menu.Item as="button" type="button" class="avatar-action avatar-action--danger" :disabled="!avatarSrc(draft.photo)" @keydown="useNativeMenuClick" @click="removePhoto">
                        <img :src="deletePhotoIcon" alt="" /><span>Удалить фото</span>
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                  <input ref="fileInput" type="file" accept="image/jpeg,image/png" hidden @change="selectPhoto" />
                </div>
                <p v-if="photoError" class="field-error" role="alert">{{ photoError }}</p>
                <div class="profile-sections">
                  <section v-for="section in sections" :key="section.title" class="profile-section">
                    <h2>{{ section.title }}</h2>
                    <div v-for="(row, index) in section.rows" :key="index" class="field-row" :style="{ '--columns': row.length }">
                      <UiField v-for="[field, label, type, autocomplete, limit] in row" :key="field"
                        v-model="draft[field]" :name="field" :label="label" :type="type"
                        :autocomplete="autocomplete" :maxlength="limit" :readonly="!type"
                        :aria-required="field === 'firstName' || field === 'lastName' ? 'true' : undefined"
                        :error="errors[field]" @update:model-value="delete errors[field]" />
                    </div>
                  </section>
                  <div class="ui-field comment">
                    <label for="comment">Комментарий</label>
                    <textarea id="comment" v-model="draft.comment" name="comment" />
                  </div>
                </div>
                <p class="contact-hint">Эти контакты используются для связи<br />с вами по служебным вопросам</p>
              </form>
            </Tabs.Panel>
            <Tabs.Panel value="security" class="profile-content">
              <section class="security" aria-labelledby="password-heading">
                <h2 id="password-heading">{{ changingPassword ? 'Сбросить пароль' : 'Пароль' }}</h2>
                <div v-if="!changingPassword">
                  <div class="password-field">
                    <img :src="lockIcon" alt="" />
                    <span aria-label="Текущий пароль скрыт">***********</span>
                    <img :src="hideIcon" alt="" />
                  </div>
                  <UiButton variant="secondary" class="reset-password" @click="startPassword">Сбросить пароль</UiButton>
                </div>
                <form v-else class="password-form" autocomplete="off" @submit.prevent="savePassword">
                  <div v-for="(label, index) in ['Новый пароль', 'Повторите новый пароль']" :key="label" class="password-field">
                    <img :src="lockIcon" alt="" />
                    <input ref="firstPassword" v-model="passwords[index]" :type="visible[index] ? 'text' : 'password'"
                      :id="`profile-new-password-${index}`" :name="index === 0 ? 'new-password' : 'confirm-new-password'"
                      :aria-label="label" autocomplete="section-profile-security new-password" autocapitalize="none" :spellcheck="false" :placeholder="label"
                      :aria-invalid="index === 1 && !!passwords[1] && !matches"
                      :aria-describedby="index === 0 ? 'password-rules' : passwords[1] && !matches ? 'password-match' : undefined" />
                    <button class="icon-button" type="button" :aria-label="`${visible[index] ? 'Скрыть' : 'Показать'}: ${label.toLowerCase()}`"
                      :aria-pressed="visible[index]" @click="visible[index] = !visible[index]">
                      <img :src="visible[index] ? hideIcon : showIcon" alt="" />
                    </button>
                  </div>
                  <p v-if="passwords[1] && !matches" id="password-match" class="field-error" role="alert">Пароли не совпадают.</p>
                  <ul id="password-rules" class="password-rules" aria-label="Требования к паролю">
                    <li v-for="check in checks" :key="check.label" :class="check.passes ? 'is-valid' : 'is-invalid'">
                      <img :src="check.passes ? checkIcon : errorIcon" alt="" />
                      <span><span class="sr-only">{{ check.passes ? 'Выполнено: ' : 'Не выполнено: ' }}</span>{{ check.label }}</span>
                    </li>
                  </ul>
                  <UiButton type="submit" variant="secondary" class="password-save" :disabled="!passwordReady">{{ passwordReady ? 'Сохранить новый пароль' : 'Сохранить' }}</UiButton>
                </form>
              </section>
            </Tabs.Panel>
            <Tabs.Panel value="relax" class="profile-content relax">
              <Trufols :active="open && activeTab === 'relax'" />
            </Tabs.Panel>
          </div>
        </Tabs.Root>
        <p v-if="status" class="profile-status" role="status">{{ status }}</p>
        <p v-if="saveError" class="profile-status field-error" role="alert">{{ saveError }}</p>
        <footer class="profile-footer">
          <img class="footer-line" :src="footerLine" alt="" />
          <AlertDialog.Root v-model="deleting">
            <AlertDialog.Activator class="button button--danger"><img :src="deleteIcon" alt="" /> Удалить профиль</AlertDialog.Activator>
            <AlertDialog.Content class="delete-dialog" :close-on-escape="!pending" :scrim="false" :aria-busy="pending">
              <AlertDialog.Title as="h2">Удалить профиль?</AlertDialog.Title>
              <AlertDialog.Description as="p">Это действие нельзя отменить. Введите <strong>{{ confirmationPhrase }}</strong>, чтобы подтвердить.</AlertDialog.Description>
              <form @submit.prevent="confirmDelete">
                <UiField v-model="confirmation" label="Текст подтверждения" autocomplete="off" :disabled="pending" />
                <p v-if="deleteError" class="field-error" role="alert">{{ deleteError }}</p>
                <div class="delete-actions">
                  <AlertDialog.Cancel class="button button--secondary" :disabled="pending">Отмена</AlertDialog.Cancel>
                  <UiButton type="submit" class="button--delete" :disabled="confirmation !== confirmationPhrase" :loading="pending">Удалить профиль</UiButton>
                </div>
              </form>
            </AlertDialog.Content>
          </AlertDialog.Root>
          <div class="footer-actions">
            <Dialog.Close class="button button--secondary" aria-label="Закрыть">Закрыть</Dialog.Close>
            <UiButton type="submit" form="profile-form">Сохранить</UiButton>
          </div>
        </footer>
      </div>
    </Dialog.Content>
  </Dialog.Root>
</template>
