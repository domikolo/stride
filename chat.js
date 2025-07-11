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

// Anti-spam - blokada wysyłania wiadomości podczas oczekiwania na odpowiedź
let isWaitingForResponse = false;

// Ukrywanie strzałki "ZAPYTAJ AI" po kliknięciu przycisku czatu lub strzałki
const aboutArrow = document.getElementById('about-arrow');
if (aboutArrow) {
  aboutArrow.addEventListener('click', () => {
    aboutArrow.style.display = 'none';
  });
}

openBtn.addEventListener('click', () => {
  widget.classList.toggle('hidden');
  if (!widget.classList.contains('hidden')) {
    callout.classList.remove('callout--visible');
    if (aboutArrow) aboutArrow.style.display = 'none';
  } else {
    if (aboutArrow) aboutArrow.style.display = '';
  }
});

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  
  // Formatowanie tekstu - zamiana podwójnych enterów na akapity
  const formattedText = text
    .replace(/\n\n/g, '</p><p>')  // Podwójne enter na nowy akapit
    .replace(/\n/g, '<br>');       // Pojedyncze enter na nową linię
  
  div.innerHTML = `<p>${formattedText}</p>`;
  messages.appendChild(div);
  
  // Auto-scroll do najnowszej wiadomości - natychmiast i po krótkim opóźnieniu
  scrollToBottom();
  setTimeout(scrollToBottom, 50);
  setTimeout(scrollToBottom, 200);
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  messages.appendChild(typingDiv);
  
  // Auto-scroll do typing indicator
  scrollToBottom();
  setTimeout(scrollToBottom, 50);
  
  return typingDiv;
}

function hideTypingIndicator(typingDiv) {
  if (typingDiv && typingDiv.parentNode) {
    typingDiv.remove();
    // Auto-scroll po ukryciu typing indicator
    setTimeout(scrollToBottom, 50);
  }
}

async function sendMessage(query) {
  // Sprawdź czy już czekamy na odpowiedź
  if (isWaitingForResponse) {
    return;
  }
  
  // Zablokuj wysyłanie kolejnych wiadomości
  isWaitingForResponse = true;
  input.disabled = true;
  input.placeholder = 'Czekam na odpowiedź...';
  
  // Zablokuj przycisk wysyłania
  const sendButton = document.querySelector('.send-btn');
  sendButton.disabled = true;
  
  addMessage(query, 'user');
  input.value = '';
  
  const typingIndicator = showTypingIndicator();
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversation_id: sessionId })
    });
    const data = await res.json();
    const answer = typeof data === 'string' ? data : data.answer ?? JSON.stringify(data);
    
    hideTypingIndicator(typingIndicator);
    addMessage(answer, 'assistant');
  } catch {
    hideTypingIndicator(typingIndicator);
    addMessage('Błąd połączenia', 'assistant');
  } finally {
    // Odblokuj wysyłanie wiadomości
    isWaitingForResponse = false;
    input.disabled = false;
    input.placeholder = 'Napisz wiadomość...';
    
    // Odblokuj przycisk wysyłania
    const sendButton = document.querySelector('.send-btn');
    sendButton.disabled = false;
    
    input.focus();
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

// --- Obsługa zakładek ---
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Usuń aktywną klasę ze wszystkich linków
    navLinks.forEach(l => l.classList.remove('active'));
    
    // Ukryj wszystkie zakładki
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Dodaj aktywną klasę do klikniętego linku
    link.classList.add('active');
    
    // Pokaż odpowiednią zakładkę
    const targetTab = link.getAttribute('data-tab');
    document.getElementById(targetTab).classList.add('active');
  });
});

// --- Obsługa formularza kontaktowego ---
const contactForm = document.querySelector('.contact-form-element');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    
    // Tutaj możesz dodać logikę wysyłania formularza
    alert(`Dziękujemy za wiadomość, ${name}! Skontaktujemy się z Tobą wkrótce.`);
    
    // Wyczyść formularz
    contactForm.reset();
  });
}
