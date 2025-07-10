const API_URL = 'https://aoxd3r49fa.execute-api.eu-central-1.amazonaws.com/chat';

const openBtn  = document.getElementById('open-btn');
const widget   = document.getElementById('chat-widget');
const form     = document.getElementById('message-form');
const input    = document.getElementById('user-input');
const messages = document.getElementById('messages');

// CALL-OUT logic
const callout = document.createElement('div');
callout.className = 'callout';
const calloutText = document.createElement('span');
calloutText.className = 'callout-text';
calloutText.textContent = 'Potrzebujesz pomocy?';
callout.appendChild(calloutText);
document.body.appendChild(callout);

let callCount = 0;
function showCallout() {
  if (widget && !widget.classList.contains('hidden')) return;
  if (callCount++ >= 3) return;
  callout.classList.add('callout--visible');
  setTimeout(() => callout.classList.remove('callout--visible'), 6000);
}
setTimeout(showCallout, 20000);
setInterval(showCallout, 60000);

// TADA effect
setInterval(() => {
  if (widget.classList.contains('hidden')) {
    openBtn.classList.add('tada');
    setTimeout(() => openBtn.classList.remove('tada'), 1000);
  }
}, 30000);

const sessionKey = 'sessionId';
let sessionId = localStorage.getItem(sessionKey) || crypto.randomUUID();
localStorage.setItem(sessionKey, sessionId);

openBtn.addEventListener('click', () => {
  widget.classList.toggle('hidden');
  if (!widget.classList.contains('hidden')) {
    callout.classList.remove('callout--visible');
  }
});

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function sendMessage(query) {
  addMessage(query, 'user');
  input.value = '';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversation_id: sessionId })
    });
    const text = await res.text();
    addMessage(text, 'assistant');
  } catch {
    addMessage('Błąd połączenia', 'assistant');
  }
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const txt = input.value.trim();
  if (txt) sendMessage(txt);
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});