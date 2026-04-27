const { ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs')

// ─── Window Controls ───
document.getElementById('btn-minimize')
  ?.addEventListener('click', () => ipcRenderer.send('minimize'))
document.getElementById('btn-maximize')
  ?.addEventListener('click', () => ipcRenderer.send('maximize'))
document.getElementById('btn-close')
  ?.addEventListener('click', () => ipcRenderer.send('close'))

// ─── Menu Dropdown ───
const menuBtn = document.getElementById('btn-menu')
const dropdownMenu = document.getElementById('dropdown-menu')

menuBtn?.addEventListener('click', (e) => {
  e.stopPropagation()
  dropdownMenu.classList.toggle('show')
})
document.addEventListener('click', () => {
  dropdownMenu?.classList.remove('show')
})

// ─── Sidebar Toggle ───
const sidebarBtn = document.getElementById('btn-sidebar')
const sidebar = document.getElementById('sidebar')
const sidebarIcon = document.getElementById('sidebar-icon')
let sidebarOpen = false

sidebarBtn?.addEventListener('click', function () {
  sidebarOpen = !sidebarOpen

  this.classList.toggle('active', sidebarOpen)

  sidebar.classList.toggle('open', sidebarOpen)
  sidebarBtn.classList.toggle('open', sidebarOpen)

  sidebarIcon.src = sidebarOpen
    ? '../assets/icons/Sidebar_opened.png'
    : '../assets/icons/Sidebar_closed.png'

  loadChatHistory()
})

// ─── Search Overlay ───
const searchBtn = document.getElementById('btn-search')
const searchOverlay = document.getElementById('search-overlay')
const searchInput = document.getElementById('search-input')

searchBtn?.addEventListener('click', () => {
  searchOverlay.classList.toggle('show')
  if (searchOverlay.classList.contains('show')) {
    searchInput.focus()
    renderSearchResults('')
  }
})

searchOverlay?.addEventListener('click', (e) => {
  if (e.target === searchOverlay)
    searchOverlay.classList.remove('show')
})

searchInput?.addEventListener('input', (e) => {
  renderSearchResults(e.target.value)
})

function renderSearchResults(query) {
  const results = document.getElementById('search-results')
  if (!results) return
  const chats = getChats()
  const filtered = chats.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase())
  )
  results.innerHTML = filtered.length
    ? filtered.map(c => `
        <div class="search-result-item"
             onclick="openChat('${c.id}')">
          <img src="../assets/icons/Chat.png" alt="">
          ${c.title}
        </div>`).join('')
    : `<div style="padding:20px;text-align:center;
                   color:#444;font-family:'Gabarito',sans-serif;
                   font-size:13px">
         No chats found
       </div>`
}

// ─── Storage ───
function getChats() {
  try {
    const raw = localStorage.getItem('mintai_chats')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveChat(chat) {
  const chats = getChats()
  const idx = chats.findIndex(c => c.id === chat.id)
  if (idx >= 0) chats[idx] = chat
  else chats.unshift(chat)
  localStorage.setItem('mintai_chats', JSON.stringify(chats))
}

function loadChatHistory() {
  const container = document.getElementById('chat-history')
  if (!container) return
  const chats = getChats()
  container.innerHTML = chats.length
    ? chats.map(c => `
        <div class="chat-history-item"
             onclick="openChat('${c.id}')">
          <img src="../assets/icons/Chat.png" alt="">
          ${c.title}
        </div>`).join('')
    : `<div style="padding:16px;color:#333;
                   font-family:'Gabarito',sans-serif;
                   font-size:12px">
         No previous chats
       </div>`
}

function openChat(id) {
  searchOverlay?.classList.remove('show')
  window.location.href = `chat.html?id=${id}`
}

// ─── Mode Selection ───
let currentMode = 'general'

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn')
      .forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentMode = btn.dataset.mode
  })
})

// ─── Home Input ───
const homeInput = document.getElementById('home-input')

homeInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    startNewChat()
  }
})

homeInput?.addEventListener('input', () => {
  homeInput.style.height = 'auto'
  homeInput.style.height = homeInput.scrollHeight + 'px'
})

function startNewChat() {
  const msg = homeInput?.value.trim()
  if (!msg) return
  const id = 'chat_' + Date.now()
  const chat = {
    id,
    title: msg.slice(0, 40) + (msg.length > 40 ? '...' : ''),
    mode: currentMode,
    messages: []
  }
  saveChat(chat)
  window.location.href =
    `chat.html?id=${id}&first=${encodeURIComponent(msg)}&mode=${currentMode}`
}

document.getElementById('new-chat-btn')?.addEventListener('click', () => {
  if (homeInput) {
    homeInput.value = ''
    homeInput.style.height = 'auto'
  }
})

// ─── Fix 11 — Attachment (properly working) ───
const attachBtn = document.getElementById('attach-btn')
const fileInput = document.getElementById('file-input')

attachBtn?.addEventListener('click', (e) => {
  e.preventDefault()
  e.stopPropagation()
  fileInput.click()
})

fileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (evt) => {
    const content = evt.target.result
    if (homeInput) {
      homeInput.value =
        `[Attached: ${file.name}]\n\n` + homeInput.value
      homeInput.style.height = 'auto'
      homeInput.style.height = homeInput.scrollHeight + 'px'
    }
  }

  // Read text files as text, others as data URL
  if (file.type.startsWith('text') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.cpp') ||
      file.name.endsWith('.java')) {
    reader.readAsText(file)
  } else {
    reader.readAsDataURL(file)
  }

  // Reset so same file can be selected again
  fileInput.value = ''
})

// ─── Fix 11 — Microphone (properly working) ───
const micBtn = document.getElementById('mic-btn')
let isRecording = false
let recognition = null

function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported')
    return
  }

  recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = 'en-US'

  recognition.onstart = () => {
    isRecording = true
    micBtn?.classList.add('mic-active')
  }

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('')
    if (homeInput) {
      homeInput.value = transcript
      homeInput.style.height = 'auto'
      homeInput.style.height = homeInput.scrollHeight + 'px'
    }
  }

  recognition.onerror = (e) => {
    console.error('Speech error:', e.error)
    isRecording = false
    micBtn?.classList.remove('mic-active')
  }

  recognition.onend = () => {
    isRecording = false
    micBtn?.classList.remove('mic-active')
  }
}

setupSpeechRecognition()

micBtn?.addEventListener('click', () => {
  if (!recognition) {
    setupSpeechRecognition()
    if (!recognition) return
  }
  if (isRecording) {
    recognition.stop()
  } else {
    recognition.start()
  }
})

// ─── Mode button icons fix ───
// Make sure mode btn icons are white
document.querySelectorAll('.mode-btn img').forEach(img => {
  img.style.width = '14px'
  img.style.height = '14px'
  img.style.filter = 'brightness(10)'
  img.style.opacity = '0.7'
})