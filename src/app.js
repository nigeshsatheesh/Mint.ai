const { ipcRenderer } = require('electron')

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

sidebarBtn?.addEventListener('click', () => {
  sidebarOpen = !sidebarOpen
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
  if (e.target === searchOverlay) {
    searchOverlay.classList.remove('show')
  }
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
        <div class="search-result-item" onclick="openChat('${c.id}')">
          <img src="../assets/icons/Projects.png" alt="">
          ${c.title}
        </div>`).join('')
    : `<div style="padding:20px;text-align:center;color:#444;font-size:13px">
         No chats found
       </div>`
}

// ─── Chat History Storage ───
function getChats() {
  const raw = localStorage.getItem('mintai_chats')
  return raw ? JSON.parse(raw) : []
}

function saveChat(chat) {
  const chats = getChats()
  const existing = chats.findIndex(c => c.id === chat.id)
  if (existing >= 0) chats[existing] = chat
  else chats.unshift(chat)
  localStorage.setItem('mintai_chats', JSON.stringify(chats))
}

function loadChatHistory() {
  const container = document.getElementById('chat-history')
  if (!container) return
  const chats = getChats()
  container.innerHTML = chats.length
    ? chats.map(c => `
        <div class="chat-history-item" onclick="openChat('${c.id}')">
          <img src="../assets/icons/Projects.png" alt="">
          ${c.title}
        </div>`).join('')
    : `<div style="padding:16px;color:#333;font-size:12px">
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

// ─── Home Input — Send on Enter ───
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
  window.location.href = `chat.html?id=${id}&first=${encodeURIComponent(msg)}`
}

// ─── New Chat Button ───
document.getElementById('new-chat-btn')?.addEventListener('click', () => {
  homeInput.value = ''
  homeInput.style.height = 'auto'
})

// ─── Attachment ───
const attachBtn = document.getElementById('attach-btn')
const fileInput = document.getElementById('file-input')

attachBtn?.addEventListener('click', () => fileInput.click())

fileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) {
    console.log('File selected:', file.name)
    // File handling will be added in next phase
  }
})

// ─── Microphone ───
const micBtn = document.getElementById('mic-btn')
let isRecording = false
let recognition = null

if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = 'en-US'

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript).join('')
    if (homeInput) homeInput.value = transcript
  }

  recognition.onend = () => {
    isRecording = false
    micBtn?.classList.remove('mic-active')
  }
}

micBtn?.addEventListener('click', () => {
  if (!recognition) return
  if (isRecording) {
    recognition.stop()
  } else {
    recognition.start()
    isRecording = true
    micBtn.classList.add('mic-active')
  }
})

// ─── IPC Window Controls in main.js ───
// Add to main.js ipcMain handlers