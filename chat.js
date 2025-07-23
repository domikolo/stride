const API_URL = 'https://aoxd3r49fa.execute-api.eu-central-1.amazonaws.com/chat';

const openBtn  = document.getElementById('open-btn');
const widget   = document.getElementById('chat-widget');
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

// Ukrywanie strzałki "ZAPYTAJ AI" po kliknięciu przycisku czatu
const askAiArrow = document.getElementById('ask-ai-arrow');

const CHAT_ANIMATION_DURATION = 2000; // ms
const CHAT_HEIGHT_SHRINK = 1000; // ms
const CHAT_SLIDE = 1000; // ms
const CHAT_WIDTH = 450; // px, szerokość wrappera
const BTN_WIDTH = 35; // px, szerokość przycisku

function isMobile() {
  return window.matchMedia('(max-width: 600px)').matches;
}

function animateCloseChat() {
  if (widget.classList.contains('hidden') || widget.classList.contains('animating')) return;
  if (isMobile()) {
    widget.classList.add('hidden');
    widget.classList.remove('shrink-height', 'animating');
    widget.style.removeProperty('height');
    widget.style.removeProperty('transform');
    widget.style.removeProperty('transition');
    widget.style.removeProperty('z-index');
    widget.style.removeProperty('width');
    return;
  }
  console.log('Zamykanie czatu - animacja start');
  widget.classList.add('animating');
  
  // Ukryj nagłówek i treść na początku animacji
  const header = widget.querySelector('.widget-header');
  const body = widget.querySelector('.widget-body');
  const footer = widget.querySelector('.widget-footer');
  
  if (header) header.style.opacity = '0';
  if (body) body.style.opacity = '0';
  if (footer) footer.style.opacity = '0';
  
  // 1. Shrink height
  widget.style.setProperty('transition', 'height 0.5s cubic-bezier(0.77,0,0.18,1)', 'important');
  widget.style.setProperty('height', '120px', 'important');
  console.log('Wysokość zmniejszona do 120px');
  setTimeout(() => {
    // 2. Slide right (tunel)
    console.log('Rozpoczynam animację tunelu - przesuwam w prawo');
    widget.style.setProperty('transition', 'transform 0.6s cubic-bezier(0.77,0,0.18,1)', 'important');
    widget.style.setProperty('transform', 'translateY(-50%) translateX(40px)', 'important');
    console.log('Transform ustawiony na translateX(40px)');
    setTimeout(() => {
      // 3. Shrink width to button width
      console.log('Zwężam szerokość do szerokości przycisku');
      widget.style.setProperty('transition', 'width 0.4s cubic-bezier(0.77,0,0.18,1)', 'important');
      widget.style.setProperty('width', '35px', 'important');
      setTimeout(() => {
        console.log('Animacja tunelu zakończona - ukrywam okno');
        widget.classList.remove('animating');
        widget.classList.add('hidden');
        widget.style.removeProperty('height');
        widget.style.removeProperty('transform');
        widget.style.removeProperty('transition');
        widget.style.removeProperty('width');
        // Przywróć widoczność wszystkich elementów
        if (header) header.style.removeProperty('opacity');
        if (body) body.style.removeProperty('opacity');
        if (footer) footer.style.removeProperty('opacity');
      }, 400);
    }, 600);
  }, 500);
}

function animateOpenChat() {
  if (!widget.classList.contains('hidden') || widget.classList.contains('animating')) return;
  if (isMobile()) {
    widget.classList.remove('hidden');
    widget.classList.remove('shrink-height', 'animating');
    widget.style.removeProperty('height');
    widget.style.removeProperty('transform');
    widget.style.removeProperty('transition');
    widget.style.removeProperty('z-index');
    widget.style.removeProperty('width');
    return;
  }
  console.log('Otwieranie czatu - animacja start');
  widget.classList.add('animating');
  widget.style.setProperty('height', '120px', 'important');
  widget.style.setProperty('width', '35px', 'important');
  widget.style.setProperty('transform', 'translateY(-50%) translateX(40px)', 'important');
  widget.style.setProperty('transition', 'none', 'important');
  widget.style.setProperty('z-index', '2002', 'important');
  widget.classList.remove('hidden');
  
  // Ukryj wszystkie elementy na początku animacji
  const header = widget.querySelector('.widget-header');
  const body = widget.querySelector('.widget-body');
  const footer = widget.querySelector('.widget-footer');
  
  if (header) header.style.opacity = '0';
  if (body) body.style.opacity = '0';
  if (footer) footer.style.opacity = '0';
  
  console.log('Okno ustawione na pozycję startową (niskie, wąskie, przesunięte)');
  void widget.offsetWidth;
  // 1. Slide left (tunel)
  console.log('Rozpoczynam animację tunelu - przesuwam w lewo');
  widget.style.setProperty('transition', 'transform 0.6s cubic-bezier(0.77,0,0.18,1)', 'important');
  widget.style.setProperty('transform', 'translateY(-50%) translateX(0)', 'important');
  console.log('Transform ustawiony na translateX(0)');
  setTimeout(() => {
    // 2. Expand width
    console.log('Rozszerzam szerokość');
    widget.style.setProperty('transition', 'width 0.4s cubic-bezier(0.77,0,0.18,1)', 'important');
    widget.style.setProperty('width', '450px', 'important');
    setTimeout(() => {
      // 3. Expand height
      console.log('Rozpoczynam animację wysokości - rozciągam');
      widget.style.setProperty('transition', 'height 0.5s cubic-bezier(0.77,0,0.18,1)', 'important');
      widget.style.setProperty('height', '600px', 'important');
      setTimeout(() => {
        console.log('Animacja zakończona');
        widget.classList.remove('animating');
        widget.style.removeProperty('height');
        widget.style.removeProperty('transform');
        widget.style.removeProperty('transition');
        widget.style.removeProperty('width');
        // Pokaż wszystkie elementy na końcu animacji
        if (header) header.style.opacity = '1';
        if (body) body.style.opacity = '1';
        if (footer) footer.style.opacity = '1';
      }, 500);
    }, 400);
  }, 600);
}

openBtn.addEventListener('click', () => {
  if (widget.classList.contains('hidden')) {
    animateOpenChat();
    callout.classList.remove('callout--visible');
  } else {
    animateCloseChat();
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
  // Sprawdź czy użytkownik zaakceptował politykę RODO
  if (!privacyCheckbox || !privacyCheckbox.checked) {
    return;
  }
  
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

// --- Obsługa kart flip ---
const flipCards = document.querySelectorAll('.flip-card');

console.log('Znalezione karty flip:', flipCards.length);

flipCards.forEach((card, index) => {
  console.log(`Karta ${index + 1}:`, card);
  card.addEventListener('click', () => {
    console.log(`Kliknięto kartę ${index + 1}`);
    card.classList.toggle('flipped');
  });
});

// --- Scroll animations ---
const scrollAnimations = () => {
  const elements = document.querySelectorAll('.scroll-animate');
  
  elements.forEach(element => {
    const elementTop = element.getBoundingClientRect().top;
    const elementVisible = 150;
    
    if (elementTop < window.innerHeight - elementVisible) {
      element.classList.add('visible');
    }
  });
};

// Initial check
scrollAnimations();

// Add scroll listener
window.addEventListener('scroll', scrollAnimations);

// Add floating animation to some elements
document.addEventListener('DOMContentLoaded', () => {
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    heroTitle.classList.add('floating');
  }
});

// --- Akordeon w sekcji o usłudze ---
document.addEventListener('DOMContentLoaded', () => {
  // Akordeon 'Nasza usługa' (unikalny selektor)
  const serviceAccordionBtn = document.getElementById('service-accordion-btn');
  const serviceAccordionContent = document.getElementById('service-accordion-content');
  if (serviceAccordionBtn && serviceAccordionContent) {
    serviceAccordionBtn.addEventListener('click', () => {
      const expanded = serviceAccordionBtn.getAttribute('aria-expanded') === 'true';
      serviceAccordionBtn.setAttribute('aria-expanded', String(!expanded));
      serviceAccordionContent.hidden = expanded;
      serviceAccordionBtn.querySelector('.accordion-arrow').textContent = expanded ? '▼' : '▲';
      serviceAccordionBtn.classList.toggle('active', !expanded);
      serviceAccordionContent.classList.toggle('open', !expanded);
    });
  }

  // Timeline: otwieranie wszystkich kroków przy scrollu
  const timelineSection = document.querySelector('.timeline-section');
  const timelineSteps = document.querySelectorAll('.timeline-horizontal .timeline-step');
  let timelineActivated = false;
  function openAllTimelineSteps() {
    timelineSteps.forEach(s => s.classList.add('active'));
    timelineActivated = true;
  }
  function onScrollTimeline() {
    if (timelineActivated) return;
    const rect = timelineSection.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      openAllTimelineSteps();
      window.removeEventListener('scroll', onScrollTimeline);
    }
  }
  if (timelineSection && timelineSteps.length > 0) {
    window.addEventListener('scroll', onScrollTimeline);
    // Jeśli sekcja już widoczna na starcie
    onScrollTimeline();
  }
});

// --- Nawigacja: O nas / Kontakt ---
document.addEventListener('DOMContentLoaded', () => {
  // Timeline: otwieranie wszystkich kroków przy scrollu
  const timelineSection = document.querySelector('.timeline-section');
  const timelineSteps = document.querySelectorAll('.timeline-horizontal .timeline-step');
  let timelineActivated = false;
  function openAllTimelineSteps() {
    timelineSteps.forEach(s => s.classList.add('active'));
    timelineActivated = true;
  }
  function onScrollTimeline() {
    if (timelineActivated) return;
    const rect = timelineSection.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      openAllTimelineSteps();
      window.removeEventListener('scroll', onScrollTimeline);
    }
  }
  if (timelineSection && timelineSteps.length > 0) {
    window.addEventListener('scroll', onScrollTimeline);
    // Jeśli sekcja już widoczna na starcie
    onScrollTimeline();
  }

  const aboutLink = document.querySelector('.nav-link[data-tab="about"]');
  const contactLink = document.querySelector('.nav-link[data-tab="contact"]');
  const heroSection = document.querySelector('.hero-scene');
  const aboutSections = [
    document.querySelector('.about-ai-section'),
    document.querySelector('.about-service-section'),
    document.querySelector('.timeline-section'),
    document.querySelector('.benefits-costs-section'),
    document.querySelector('.examples-section')
  ];
  const contactSection = document.getElementById('contact-section');

  function showAbout() {
    if (heroSection) heroSection.style.display = '';
    aboutSections.forEach(s => s && (s.style.display = ''));
    if (contactSection) contactSection.style.display = 'none';
    aboutLink.classList.add('active');
    contactLink.classList.remove('active');
    window.scrollTo({ top: heroSection?.offsetTop || 0, behavior: 'smooth' });
  }
  function showContact() {
    if (heroSection) heroSection.style.display = 'none';
    aboutSections.forEach(s => s && (s.style.display = 'none'));
    if (contactSection) contactSection.style.display = '';
    aboutLink.classList.remove('active');
    contactLink.classList.add('active');
    window.scrollTo({ top: contactSection?.offsetTop || 0, behavior: 'smooth' });
  }
  if (aboutLink && contactLink && contactSection) {
    aboutLink.addEventListener('click', e => { e.preventDefault(); showAbout(); });
    contactLink.addEventListener('click', e => { e.preventDefault(); showContact(); });
    // Domyślnie pokazujemy sekcje "O nas"
    showAbout();
  }
});
