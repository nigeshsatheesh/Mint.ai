const { ipcRenderer } = require('electron')

// ─── URL Params ───
const params = new URLSearchParams(window.location.search)
const chatId = params.get('id')
const firstMessage = params.get('first')
const chatMode = params.get('mode') || 'general'

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

// ─── Sidebar ───
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

// ─── Search ───
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
             onclick="navigateToChat('${c.id}')">
          <img src="../assets/icons/Chat.png" alt="">
          ${c.title}
        </div>`).join('')
    : `<div style="padding:20px;text-align:center;color:#444;font-size:13px">
         No chats found
       </div>`
}

function navigateToChat(id) {
  window.location.href = `chat.html?id=${id}`
}

// ─── Storage ───
function getChats() {
  try {
    return JSON.parse(localStorage.getItem('mintai_chats') || '[]')
  } catch { return [] }
}

function getCurrentChat() {
  return getChats().find(c => c.id === chatId) || {
    id: chatId,
    title: 'New Chat',
    mode: chatMode,
    messages: []
  }
}

function saveCurrentChat(chat) {
  const chats = getChats()
  const idx = chats.findIndex(c => c.id === chatId)
  if (idx >= 0) chats[idx] = chat
  else chats.unshift(chat)
  localStorage.setItem('mintai_chats', JSON.stringify(chats))
}

function loadChatHistory() {
  const container = document.getElementById('chat-history')
  if (!container) return
  const chats = getChats()
  container.innerHTML = chats.map(c => `
    <div class="chat-history-item ${c.id === chatId ? 'active' : ''}"
         onclick="navigateToChat('${c.id}')">
      <img src="../assets/icons/Chat.png" alt="">
      ${c.title}
    </div>`).join('')
}

// ─── New Chat ───
document.getElementById('new-chat-btn')?.addEventListener('click', () => {
  window.location.href = 'home.html'
})

// ─── Mode Selection ───
let currentMode = chatMode

document.querySelectorAll('.mode-btn').forEach(btn => {
  if (btn.dataset.mode === currentMode) btn.classList.add('active')
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn')
      .forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentMode = btn.dataset.mode
  })
})

// ─── System Prompts per Mode ───
function getSystemPrompt(mode) {
  const base = `You are Mint.ai, an intelligent study mentor for Nigesh.
Always use markdown formatting in your responses.
For code, always use fenced code blocks with the language name like \`\`\`python.
Bold important terms using **term**.
Use headings with ## for topics.`

  const modes = {
    general: base + `
Keep responses SHORT, CRISP and to the point.
No unnecessary details. Answer directly.`,

    study: base + `
You are a dedicated study mentor.
Give DETAILED, VISUAL explanations.
Use flowcharts in mermaid syntax when helpful.
Break down concepts step by step.
Use examples, analogies, and structured formatting.
Use ## headings for topics, bullet points for lists.`,

    code: base + `
You are an expert coding assistant.
ALWAYS provide complete, efficient, well-commented code.
Explain what each part does briefly.
Use proper code blocks with language specified.
Follow best practices and clean code principles.`,

    research: base + `
You are a deep research assistant.
Provide VERY DETAILED, comprehensive explanations.
Cover all aspects: history, how it works, applications, pros/cons.
Use structured headings, subheadings, and detailed paragraphs.
Cite concepts clearly and explain thoroughly.`
  }
  return modes[mode] || modes.general
}

// ─── Render Messages ───
const messagesArea = document.getElementById('messages-area')
let chatHistory = []

function renderMessage(role, content, mode) {
  const snapMode = mode || currentMode   // ← snapshot passed in or current
  if (role === 'user') {
    const block = document.createElement('div')
    block.className = 'message-block user-message'
    block.innerHTML = `
      <div class="user-bubble">${escapeHtml(content)}</div>
      <div class="user-actions">
        <button class="msg-action-btn" onclick="copyText(this)"
                data-text="${escapeHtml(content)}" title="Copy">
          <img src="../assets/icons/Copy.png" alt="copy">
        </button>
        <button class="msg-action-btn" onclick="editMessage(this)"
                data-text="${escapeHtml(content)}" title="Edit">
          <img src="../assets/icons/Edit.png" alt="edit">
        </button>
      </div>`
    messagesArea.appendChild(block)
  } else {
    const modeIcons = {
      general:  '../assets/icons/Chat.png',
      study:    '../assets/icons/Study.png',
      code:     '../assets/icons/Code.png',
      research: '../assets/icons/Research.png'
    }
    const modePill = `
      <div class="ai-mode-pill">
        <img src="../assets/images/Logo_with_nobg.png" alt="" class="ai-leaf-icon">
        <span class="ai-mode-badge">
          <img src="${modeIcons[snapMode]}" alt="">
          ${snapMode.charAt(0).toUpperCase() + snapMode.slice(1)}
        </span>
      </div>`
    const block = document.createElement('div')
    block.className = 'message-block ai-message'
    block.innerHTML = `<div class="ai-bubble">${modePill}${formatAIResponse(content)}</div>`
    messagesArea.appendChild(block)
  }
  scrollToBottom()
}

function formatAIResponse(text) {
  // Code blocks first
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'code'
    const escaped = escapeHtml(code.trim())
    const highlighted = syntaxHighlight(escaped, language)
    return `
      <div class="code-block">
        <div class="code-header">
          <span class="code-lang">${language}</span>
          <button class="code-copy-btn"
                  onclick="copyCode(this)"
                  data-code="${escapeHtml(code.trim())}">
            <img src="../assets/icons/Copy.png" alt="">
            Copy
          </button>
        </div>
        <pre>${highlighted}</pre>
      </div>`
  })

  // Headings
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^## (.+)$/gm,  '<h2>$1</h2>')
  text = text.replace(/^# (.+)$/gm,   '<h1>$1</h1>')

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Inline code
  text = text.replace(/`([^`]+)`/g,
    '<code>$1</code>')

  // Bullet lists
  text = text.replace(/^\- (.+)$/gm, '<li>$1</li>')
  text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

  // Numbered lists
  text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Line breaks
  text = text.replace(/\n\n/g, '</p><p>')
  text = '<p>' + text + '</p>'
  text = text.replace(/<p><\/p>/g, '')

  return text
}

function syntaxHighlight(code, lang) {
  if (!['javascript','js','python','py',
        'cpp','java','html','css'].includes(lang)) {
    return code
  }

  const keywords = {
    javascript: ['const','let','var','function','return',
                 'if','else','for','while','class',
                 'import','export','from','async','await',
                 'new','this','typeof','true','false','null'],
    python:     ['def','return','if','elif','else','for',
                 'while','class','import','from','as',
                 'with','try','except','True','False','None',
                 'and','or','not','in','is','lambda'],
    java:       ['public','private','protected','class',
                 'static','void','return','if','else',
                 'for','while','new','import','package',
                 'interface','extends','implements'],
    cpp:        ['int','float','double','char','bool',
                 'void','return','if','else','for','while',
                 'class','public','private','include',
                 'namespace','using','new','delete']
  }

  const kws = keywords[lang] || keywords['javascript']

  // Strings
  code = code.replace(/(["'`])(.*?)\1/g,
    '<span class="st">$1$2$1</span>')

  // Comments
  code = code.replace(/(\/\/.*$)/gm,
    '<span class="cm">$1</span>')
  code = code.replace(/(#.*$)/gm,
    '<span class="cm">$1</span>')

  // Numbers
  code = code.replace(/\b(\d+\.?\d*)\b/g,
    '<span class="nm">$1</span>')

  // Keywords
  kws.forEach(kw => {
    const re = new RegExp(`\\b(${kw})\\b`, 'g')
    code = code.replace(re, '<span class="kw">$1</span>')
  })

  return code
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── Copy & Edit ───
function copyText(btn) {
  navigator.clipboard.writeText(btn.dataset.text)
  const img = btn.querySelector('img')
  img.style.filter = 'brightness(1) saturate(2)'
  setTimeout(() => img.style.filter = 'brightness(10)', 1500)
}

function copyCode(btn) {
  navigator.clipboard.writeText(btn.dataset.code)
  btn.textContent = '✓ Copied'
  btn.classList.add('copied')
  setTimeout(() => {
    btn.innerHTML = `<img src="../assets/icons/Copy.png" alt=""> Copy`
    btn.classList.remove('copied')
  }, 2000)
}

function editMessage(btn) {
  const bubble = btn.closest('.message-block').querySelector('.user-bubble')
  const original = btn.dataset.text
  bubble.innerHTML = `
    <textarea class="edit-input" rows="3">${original}</textarea>
    <div class="edit-actions">
      <button class="edit-cancel-btn"
              onclick="cancelEdit(this, '${escapeHtml(original)}')">
        Cancel
      </button>
      <button class="edit-save-btn" onclick="saveEdit(this)">
        Save & Resend
      </button>
    </div>`
  bubble.querySelector('.edit-input').focus()
}

function cancelEdit(btn, original) {
  const bubble = btn.closest('.user-bubble')
  bubble.innerHTML = original
}

function saveEdit(btn) {
  const textarea = btn.closest('.user-bubble')
    .querySelector('.edit-input')
  const newText = textarea.value.trim()
  if (!newText) return
  const bubble = btn.closest('.user-bubble')
  bubble.innerHTML = escapeHtml(newText)
  sendToAI(newText)
}

// ─── Typing Indicator ───
function showTyping() {
  const block = document.createElement('div')
  block.className = 'message-block ai-message'
  block.id = 'typing-indicator'
  block.innerHTML = `
    <div class="ai-avatar">
      <img src="../assets/images/Logo_with_nobg.png" alt="">
    </div>
    <div class="ai-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`
  messagesArea.appendChild(block)
  scrollToBottom()
  return block
}

// ─── Send to Ollama ───
let isGenerating = false

async function sendToAI(userMessage) {
  if (isGenerating) return
  isGenerating = true

  const sendBtn = document.getElementById('send-btn')
  if (sendBtn) sendBtn.disabled = true

  const modeAtSend = currentMode   // ← snapshot NOW before any awaits

  chatHistory.push({ role: 'user', content: userMessage })

  const typingBlock = showTyping()

  const modeIcons = {
    general:  '../assets/icons/Chat.png',
    study:    '../assets/icons/Study.png',
    code:     '../assets/icons/Code.png',
    research: '../assets/icons/Research.png'
  }

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        messages: [
          { role: 'system', content: getSystemPrompt(modeAtSend) },
          ...chatHistory
        ],
        stream: true
      })
    })

    typingBlock.remove()

    // Build streaming block WITH the pill immediately visible
    const modePill = `
      <div class="ai-mode-pill">
        <img src="../assets/images/Logo_with_nobg.png" alt="" class="ai-leaf-icon">
        <span class="ai-mode-badge">
          <img src="${modeIcons[modeAtSend]}" alt="">
          ${modeAtSend.charAt(0).toUpperCase() + modeAtSend.slice(1)}
        </span>
      </div>`

    const aiBlock = document.createElement('div')
    aiBlock.className = 'message-block ai-message'
    aiBlock.innerHTML = `
      <div class="ai-bubble">
        ${modePill}
        <div id="streaming-content"></div>
      </div>`
    messagesArea.appendChild(aiBlock)

    const streamContent = document.getElementById('streaming-content')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            fullText += data.message.content
            streamContent.innerHTML = formatAIResponse(fullText)
            scrollToBottom()
          }
        } catch (e) {}
      }
    }

    streamContent.removeAttribute('id')
    chatHistory.push({ role: 'assistant', content: fullText })

    // Save with mode so reloads render correctly
    const chat = getCurrentChat()
    chat.messages = chatHistory.map((m, i) => ({
      ...m,
      mode: m.role === 'assistant' ? modeAtSend : undefined
    }))
    saveCurrentChat(chat)

  } catch (err) {
    typingBlock.remove()
    const errBlock = document.createElement('div')
    errBlock.className = 'message-block ai-message'
    errBlock.innerHTML = `
      <div class="ai-bubble" style="color:#f09595">
        ❌ Cannot connect to Ollama.<br>
        Make sure Ollama is running at localhost:11434
      </div>`
    messagesArea.appendChild(errBlock)
  }

  isGenerating = false
  if (sendBtn) sendBtn.disabled = false
}

// ─── Chat Input Send ───
const chatInput = document.getElementById('chat-input')
const sendBtn = document.getElementById('send-btn')

chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
})

chatInput?.addEventListener('input', () => {
  chatInput.style.height = 'auto'
  chatInput.style.height = chatInput.scrollHeight + 'px'
})

sendBtn?.addEventListener('click', handleSend)

function handleSend() {
  const msg = chatInput?.value.trim()
  if (!msg || isGenerating) return
  renderMessage('user', msg)
  chatInput.value = ''
  chatInput.style.height = 'auto'
  sendToAI(msg)
}

// ─── Attachment ───
const attachBtn = document.getElementById('attach-btn')
const fileInput = document.getElementById('file-input')

attachBtn?.addEventListener('click', () => fileInput.click())

fileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    if (chatInput) {
      chatInput.value =
        `[File: ${file.name}]\n` + chatInput.value
    }
  }
  if (file.type.startsWith('text') ||
      /\.(js|py|cpp|java|ts|html|css|json)$/.test(file.name)) {
    reader.readAsText(file)
  } else {
    reader.readAsDataURL(file)
  }
  fileInput.value = ''
})

// ─── Microphone ───
const micBtn = document.getElementById('mic-btn')
let isRecording = false
let recognition = null

function setupSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return
  recognition = new SR()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.onstart = () => {
    isRecording = true
    micBtn?.classList.add('mic-active')
  }
  recognition.onresult = (e) => {
    const t = Array.from(e.results).map(r => r[0].transcript).join('')
    if (chatInput) chatInput.value = t
  }
  recognition.onerror = () => {
    isRecording = false
    micBtn?.classList.remove('mic-active')
  }
  recognition.onend = () => {
    isRecording = false
    micBtn?.classList.remove('mic-active')
  }
}

setupSpeech()

micBtn?.addEventListener('click', () => {
  if (!recognition) { setupSpeech(); if (!recognition) return }
  isRecording ? recognition.stop() : recognition.start()
})

// ─── Init ───
function init() {
  // Set chat title
  const chat = getCurrentChat()
  const titleBar = document.getElementById('chat-title-bar')
  if (titleBar) titleBar.textContent = chat.title || 'New Chat'

  // Set active mode button
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode)
  })

  // Load existing messages if returning to chat
  if (chat.messages && chat.messages.length > 0) {
    chatHistory = chat.messages
    chat.messages.forEach(m => renderMessage(m.role, m.content, m.mode))
  }

  // Send first message if coming from home screen
  if (firstMessage) {
    renderMessage('user', firstMessage)
    sendToAI(firstMessage)
  }
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight
}

init()