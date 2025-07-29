const API_URL = 'https://aoxd3r49fa.execute-api.eu-central-1.amazonaws.com/chat';

// Stare elementy usunięte - openBtn i widget nie istnieją w nowym HTML
const form     = document.getElementById('message-form');
const input    = document.getElementById('user-input');
const messages = document.getElementById('messages');

// Elementy polityki RODO
const privacyCheckbox = document.getElementById('privacy-checkbox');
const startChatBtn = document.getElementById('start-chat-btn');
const privacySection = document.getElementById('privacy-section');

// Obsługa checkboxa polityki RODO
if (privacyCheckbox && startChatBtn) {
  privacyCheckbox.addEventListener('change', () => {
    startChatBtn.disabled = !privacyCheckbox.checked;
  });
  
  // Obsługa przycisku "Rozpocznij czat"
  startChatBtn.addEventListener('click', () => {
    if (privacyCheckbox.checked) {
      // Ukryj sekcję polityki RODO
      privacySection.style.display = 'none';
      
      // Pokaż formularz wiadomości
      form.classList.remove('hidden');
      
      // Dodaj powitalną wiadomość
      addMessage('Witaj! Jestem asystentem Stride-Services. Jak mogę Ci pomóc?', 'assistant');
      
      // Skup się na polu input
      input.focus();
    }
  });
}

// Stare funkcje callout, TADA effect usunięte - nie są potrzebne

// Funkcja do dodawania wiadomości
function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}-message`;
  
  // Formatowanie tekstu - zamiana podwójnych enterów na akapity
  const formattedText = text
    .replace(/\n\n/g, '</p><p>')  // Podwójne enter na nowy akapit
    .replace(/\n/g, '<br>');       // Pojedyncze enter na nową linię
  
  div.innerHTML = `<p>${formattedText}</p>`;
  messages.appendChild(div);
  
  // Auto-scroll do najnowszej wiadomości
  messages.scrollTop = messages.scrollHeight;
}
// Stare funkcje showCallout i TADA effect usunięte

const sessionKey = 'sessionId';
let sessionId = localStorage.getItem(sessionKey) || crypto.randomUUID();
localStorage.setItem(sessionKey, sessionId);

// Anti-spam - blokada wysyłania wiadomości podczas oczekiwania na odpowiedź
let isWaitingForResponse = false;

// Stary kod dla openBtn i widget usunięty - te elementy nie istnieją

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}-message`;
  
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
  typingDiv.className = 'message assistant-message';
  typingDiv.innerHTML = '<p><span class="typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></p>';
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

// Upewnij się że DOM jest załadowany
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up chat listeners');
  console.log('Form:', form);
  console.log('Input:', input);
  console.log('Send button:', document.querySelector('.send-btn'));

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      console.log('Form submit triggered');
      const txt = input.value.trim();
      if (txt) {
        console.log('Sending message:', txt);
        sendMessage(txt);
      }
    });
  }

  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        console.log('Enter pressed, dispatching submit');
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  // Event listener dla przycisku send
  const sendButton = document.querySelector('.send-btn');
  if (sendButton) {
    sendButton.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Send button clicked');
      form.dispatchEvent(new Event('submit'));
    });
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
