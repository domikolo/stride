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

// Pierwsza funkcja addMessage usunięta - używamy lepszej wersji poniżej
// Stare funkcje showCallout i TADA effect usunięte

const sessionKey = 'sessionId';
let sessionId = localStorage.getItem(sessionKey) || crypto.randomUUID();
localStorage.setItem(sessionKey, sessionId);

// Anti-spam - blokada wysyłania wiadomości podczas oczekiwania na odpowiedź
let isWaitingForResponse = false;

// Appointment booking state
let appointmentState = {
  currentStep: null, // 'selecting_date', 'selecting_time', 'entering_contact', 'verifying', 'completed'
  selectedDate: null,
  selectedTime: null,
  contactInfo: null,
  contactType: null,
  appointmentId: null,
  verificationCode: null
};

// Appointment keywords for intent detection
const appointmentKeywords = [
  'spotkanie', 'umówić', 'termin', 'wizyta', 'konsultacja',
  'appointment', 'meeting', 'schedule', 'book', 'rozmowa'
];

// Business hours for time slots
const businessHours = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

// Stary kod dla openBtn i widget usunięty - te elementy nie istnieją

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}-message`;
  
  // Ulepszone formatowanie tekstu
  let formattedText = text;
  
  // Obsługa list numerowanych (1. 2. 3.)
  formattedText = formattedText.replace(/^(\d+\.\s+)(.+)$/gm, '<div class="list-item"><span class="list-number">$1</span>$2</div>');
  
  // Obsługa list z kropkami (• lub -)
  formattedText = formattedText.replace(/^[•\-]\s+(.+)$/gm, '<div class="list-item"><span class="list-bullet">•</span>$1</div>');
  
  // Obsługa pogrubienia (**tekst**)
  formattedText = formattedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Obsługa kursywy (*tekst*)
  formattedText = formattedText.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Podwójne enter na nowy akapit z większym odstępem
  formattedText = formattedText.replace(/\n\n+/g, '</p><p class="paragraph-break">');
  
  // Pojedyncze enter na nową linię
  formattedText = formattedText.replace(/\n/g, '<br>');
  
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

// Intent detection for appointments
function detectAppointmentIntent(query) {
  const queryLower = query.toLowerCase();
  return appointmentKeywords.some(keyword => queryLower.includes(keyword));
}

// Handle appointment flow
function handleAppointmentFlow(query) {
  const queryLower = query.toLowerCase();
  
  // Handle verification code input
  if (appointmentState.currentStep === 'verifying') {
    const codeMatch = query.match(/\d{6}/);
    if (codeMatch) {
      const enteredCode = codeMatch[0];
      if (enteredCode === appointmentState.verificationCode) {
        appointmentState.currentStep = 'completed';
        addMessage(`✅ Spotkanie zostało potwierdzone!\n\n📅 Data: ${appointmentState.selectedDate}\n🕐 Godzina: ${appointmentState.selectedTime}\n📧 Kontakt: ${appointmentState.contactInfo}\n\nDziękujemy! Szczegóły zostały wysłane na podany adres email.`, 'assistant');
        resetAppointmentState();
        return true;
      } else {
        addMessage('❌ Nieprawidłowy kod weryfikacyjny. Spróbuj ponownie lub napisz "anuluj" aby przerwać proces.', 'assistant');
        return true;
      }
    }
  }
  
  // Handle cancel command
  if (queryLower.includes('anuluj') || queryLower.includes('cancel')) {
    if (appointmentState.currentStep) {
      resetAppointmentState();
      addMessage('❌ Proces umówienia spotkania został anulowany.', 'assistant');
      return true;
    }
  }
  
  // Start appointment flow
  if (detectAppointmentIntent(query) && !appointmentState.currentStep) {
    startAppointmentBooking();
    return true;
  }
  
  return false;
}

// Start appointment booking process
function startAppointmentBooking() {
  appointmentState.currentStep = 'selecting_date';
  addMessage('Świetnie! Pomogę Ci umówić spotkanie. Wybierz datę z kalendarza poniżej:', 'assistant');
  setTimeout(() => {
    showCalendarWidget();
  }, 500);
}

// Reset appointment state
function resetAppointmentState() {
  appointmentState = {
    currentStep: null,
    selectedDate: null,
    selectedTime: null,
    contactInfo: null,
    contactType: null,
    appointmentId: null,
    verificationCode: null
  };
}

// Handle backend action responses
function handleBackendAction(data) {
  console.log('Handling backend action:', data);
  
  switch (data.action_type) {
    case 'show_calendar':
      if (data.available_slots && data.available_slots.length > 0) {
        showRealCalendarWidget(data.available_slots);
      } else {
        addMessage('Przepraszam, nie udało się pobrać dostępnych terminów. Spróbuj ponownie.', 'assistant');
      }
      break;
      
    case 'request_verification':
      appointmentState.appointmentId = data.appointment_id;
      appointmentState.currentStep = 'verifying';
      addMessage('Kod weryfikacyjny został wysłany. Wprowadź go poniżej aby potwierdzić spotkanie.', 'assistant');
      break;
      
    case 'confirmed':
      appointmentState.currentStep = 'completed';
      resetAppointmentState();
      break;
      
    case 'error':
      // Error already shown in message
      break;
      
    default:
      console.log('Unknown action type:', data.action_type);
  }
}

async function sendMessage(query) {
  // Sprawdź czy już czekamy na odpowiedź
  if (isWaitingForResponse) {
    return;
  }
  
  // Check for appointment flow first
  if (handleAppointmentFlow(query)) {
    input.value = '';
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
    
    // Handle special action types from backend
    if (data.action_type) {
      handleBackendAction(data);
    }
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

// Calendar widget functions  
function showCalendarWidget() {
  const calendarDiv = document.createElement('div');
  calendarDiv.className = 'message assistant-message calendar-message';
  
  const calendarContent = createCalendarContent();
  calendarDiv.appendChild(calendarContent);
  
  messages.appendChild(calendarDiv);
  scrollToBottom();
  setTimeout(scrollToBottom, 50);
}

// Real calendar widget with backend data
function showRealCalendarWidget(availableSlots) {
  console.log('Showing real calendar widget with slots:', availableSlots);
  
  const calendarDiv = document.createElement('div');
  calendarDiv.className = 'message assistant-message calendar-message';
  
  const calendarContent = createRealCalendarContent(availableSlots);
  calendarDiv.appendChild(calendarContent);
  
  messages.appendChild(calendarDiv);
  scrollToBottom();
  setTimeout(scrollToBottom, 50);
}

function createCalendarContent() {
  const div = document.createElement('div');
  div.className = 'calendar-content';
  
  // Use current calendar date or initialize with current date
  if (!currentCalendarDate) {
    currentCalendarDate = new Date();
  }
  
  const currentMonth = currentCalendarDate.getMonth();
  const currentYear = currentCalendarDate.getFullYear();
  
  div.innerHTML = `
    <div class="calendar-header-inline">
      <h4>Wybierz datę spotkania</h4>
      <div class="calendar-month-nav">
        <button class="month-nav-btn" onclick="changeMonth(-1)" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="current-month" id="currentMonth">${getMonthName(currentMonth)} ${currentYear}</span>
        <button class="month-nav-btn" onclick="changeMonth(1)" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
    <div class="mini-calendar" id="calendar-grid">
      ${createCalendarDays(currentYear, currentMonth)}
    </div>
  `;
  
  return div;
}

function createRealCalendarContent(availableSlots) {
  const div = document.createElement('div');
  div.className = 'calendar-content';
  
  // Parse available slots to extract unique dates
  const availableDates = new Set();
  const slotsByDate = {};
  
  availableSlots.forEach(slot => {
    const date = new Date(slot);
    const dateStr = date.toISOString().split('T')[0];
    availableDates.add(dateStr);
    
    if (!slotsByDate[dateStr]) {
      slotsByDate[dateStr] = [];
    }
    slotsByDate[dateStr].push(date.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }));
  });
  
  // Use current calendar date or initialize
  if (!currentCalendarDate) {
    currentCalendarDate = new Date();
  }
  
  const currentMonth = currentCalendarDate.getMonth();
  const currentYear = currentCalendarDate.getFullYear();
  
  div.innerHTML = `
    <div class="calendar-header-inline">
      <h4>Wybierz datę spotkania</h4>
      <div class="calendar-month-nav">
        <button class="month-nav-btn" onclick="changeRealMonth(-1)" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="current-month" id="currentRealMonth">${getMonthName(currentMonth)} ${currentYear}</span>
        <button class="month-nav-btn" onclick="changeRealMonth(1)" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
    <div class="mini-calendar" id="real-calendar-grid">
      ${createRealCalendarDays(currentYear, currentMonth, availableDates)}
    </div>
  `;
  
  // Store slots data for later use
  div.slotsByDate = slotsByDate;
  
  return div;
}

function createCalendarDays(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();
  
  let html = '';
  
  // Day headers
  const dayHeaders = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
  dayHeaders.forEach(day => {
    html += `<div class="mini-day-header">${day}</div>`;
  });
  
  // Adjust first day (Monday = 0)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  
  // Empty cells for days before month start
  for (let i = 0; i < adjustedFirstDay; i++) {
    html += '<div class="mini-calendar-day disabled"></div>';
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    // FIX: Create date at noon to avoid timezone issues
    const date = new Date(year, month, day, 12, 0, 0);
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const isPast = date < new Date().setHours(0, 0, 0, 0);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    let className = 'mini-calendar-day';
    if (isPast || isWeekend) {
      className += ' disabled';
    } else {
      className += ' available';
    }
    
    html += `<div class="${className}" onclick="selectDate('${dateStr}')" data-date="${dateStr}">${day}</div>`;
  }
  
  return html;
}

function createRealCalendarDays(year, month, availableDates) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();
  
  let html = '';
  
  // Day headers
  const dayHeaders = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
  dayHeaders.forEach(day => {
    html += `<div class="mini-day-header">${day}</div>`;
  });
  
  // Adjust first day (Monday = 0)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  
  // Empty cells for days before month start
  for (let i = 0; i < adjustedFirstDay; i++) {
    html += '<div class="mini-calendar-day disabled"></div>';
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day, 12, 0, 0);
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const isPast = date < new Date().setHours(0, 0, 0, 0);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const hasAvailableSlots = availableDates.has(dateStr);
    
    let className = 'mini-calendar-day';
    if (isPast || isWeekend || !hasAvailableSlots) {
      className += ' disabled';
    } else {
      className += ' available';
    }
    
    html += `<div class="${className}" onclick="selectRealDate('${dateStr}')" data-date="${dateStr}">${day}</div>`;
  }
  
  return html;
}

function getMonthName(month) {
  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  return months[month];
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function selectDate(dateStr) {
  console.log('selectDate called with:', dateStr);
  
  // Jeśli data już została wybrana, zablokuj możliwość zmiany
  if (appointmentState.selectedDate) {
    console.log('Date already selected, ignoring click');
    return;
  }
  
  const dateElement = document.querySelector(`[data-date="${dateStr}"]`);
  console.log('Found date element:', dateElement);
  
  if (dateElement) {
    if (dateElement.classList.contains('disabled')) {
      console.log('Date is disabled, returning');
      return;
    }
    
    // Remove previous selection
    document.querySelectorAll('.mini-calendar-day.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Add selection to clicked date
    dateElement.classList.add('selected');
    
    // Disable all other dates
    document.querySelectorAll('.mini-calendar-day.available').forEach(el => {
      if (el !== dateElement) {
        el.classList.remove('available');
        el.classList.add('disabled');
        el.removeAttribute('onclick');
      }
    });
    
    // FIXED: Use the dateStr directly (it's already in correct format from createCalendarDays)
    appointmentState.selectedDate = dateStr;
    appointmentState.currentStep = 'selecting_time';
    
    console.log('Date selected:', dateStr);
    console.log('Date selected, showing time slots');
    setTimeout(() => {
      showTimeSlots(dateStr);
    }, 300);
  } else {
    console.log('Date element not found');
  }
}

function showTimeSlots(dateStr) {
  const formattedDate = new Date(dateStr).toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Find the existing calendar content and expand it
  const existingCalendar = document.querySelector('.calendar-content');
  if (existingCalendar) {
    // Show loading state first
    const loadingHTML = `
      <div class="time-slots-loading" style="display: block;">
        <h5>Sprawdzam dostępne terminy...</h5>
        <div class="calendar-skeleton large"></div>
        <div class="calendar-skeleton medium"></div>
        <div class="calendar-skeleton small"></div>
      </div>
    `;
    
    existingCalendar.insertAdjacentHTML('beforeend', loadingHTML);
    scrollToBottom();
    
    // Simulate loading delay
    setTimeout(() => {
      const loadingDiv = document.querySelector('.time-slots-loading');
      if (loadingDiv) {
        loadingDiv.remove();
      }
      
      // Generate available time slots (simulate some unavailable)
      const availableSlots = businessHours.filter(() => Math.random() > 0.3);
      
      const timeSlotsHTML = `
        <div class="time-slots" style="display: block;">
          <h5>Dostępne godziny na ${formattedDate}</h5>
          <div class="time-grid">
            ${availableSlots.map(time => `
              <div class="time-slot available" onclick="selectTime('${time}')" data-time="${time}">
                ${time}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      existingCalendar.insertAdjacentHTML('beforeend', timeSlotsHTML);
      scrollToBottom();
      setTimeout(scrollToBottom, 50);
    }, 800); // 800ms loading simulation
  }
}

function selectTime(timeStr) {
  // Jeśli godzina już została wybrana, zablokuj możliwość zmiany
  if (appointmentState.selectedTime) {
    console.log('Time already selected, ignoring click');
    return;
  }
  
  // Remove previous selection
  document.querySelectorAll('.time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Add selection to clicked time
  const timeElement = document.querySelector(`[data-time="${timeStr}"]`);
  if (timeElement) {
    timeElement.classList.add('selected');
    
    // Disable all other time slots
    document.querySelectorAll('.time-slot.available').forEach(el => {
      if (el !== timeElement) {
        el.classList.remove('available');
        el.classList.add('disabled');
        el.removeAttribute('onclick');
      }
    });
  }
  
  appointmentState.selectedTime = timeStr;
  appointmentState.currentStep = 'entering_contact';
  
  setTimeout(() => {
    showContactForm();
  }, 300);
}

function showContactForm() {
  // Find the existing calendar content and expand it
  const existingCalendar = document.querySelector('.calendar-content');
  if (existingCalendar) {
    const contactFormHTML = `
      <div class="appointment-form" style="display: block;">
        <h5>Podaj dane kontaktowe</h5>
        <div class="form-column">
          <input type="email" class="form-input" id="contact-email" placeholder="Adres email" />
          <div class="form-divider">LUB</div>
          <input type="tel" class="form-input" id="contact-phone" placeholder="Numer telefonu" />
        </div>
        <button class="book-btn" id="submit-appointment-btn" type="button">Umów spotkanie</button>
      </div>
    `;
    
    existingCalendar.insertAdjacentHTML('beforeend', contactFormHTML);
    
    // Event delegation is handled in DOMContentLoaded
    
    scrollToBottom();
    setTimeout(scrollToBottom, 50);
  }
}

function submitAppointment() {
  console.log('🚀 SUBMIT APPOINTMENT FUNCTION CALLED!');
  console.log('Current appointment state:', appointmentState);
  
  let email = document.getElementById('contact-email')?.value.trim();
  let phone = document.getElementById('contact-phone')?.value.trim();
  
  console.log('Email input:', email);
  console.log('Phone input:', phone);
  
  // If both empty, use placeholder contact
  if (!email && !phone) {
    email = 'placeholder@example.com';
    console.log('Using placeholder email');
  }
  
  // Send booking request to backend
  const contactInfo = email || phone;
  const contactType = email ? 'email' : 'phone';
  const datetimeStr = appointmentState.selectedDate + 'T' + appointmentState.selectedTime + ':00';
  
  console.log('Sending booking request:', {
    datetime: datetimeStr,
    contact: contactInfo,
    type: contactType
  });
  
  // Use special format that backend recognizes
  const bookingQuery = `BOOK_APPOINTMENT:${datetimeStr},${contactInfo},${contactType}`;
  
  // Hide appointment form
  const appointmentForm = document.querySelector('.appointment-form');
  if (appointmentForm) {
    appointmentForm.style.display = 'none';
  }
  
  // Send booking request
  sendBookingRequest(bookingQuery);
}

async function sendBookingRequest(query) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversation_id: sessionId })
    });
    const data = await res.json();
    
    if (data.action_type === 'request_verification') {
      appointmentState.appointmentId = data.appointment_id;
      appointmentState.currentStep = 'verifying';
      
      // Add verification section to calendar
      const existingCalendar = document.querySelector('.calendar-content');
      if (existingCalendar) {
        const verificationHTML = `
          <div class="verification-section" style="display: block;">
            <h5>Kod weryfikacyjny</h5>
            <p class="verification-text">${data.answer}</p>
            <div class="form-column">
              <input type="text" class="form-input verification-input" id="verification-code-input" placeholder="Wprowadź kod" maxlength="6" />
              <button class="book-btn verify-btn" id="verify-code-btn" type="button">Potwierdź</button>
            </div>
          </div>
        `;
        
        existingCalendar.insertAdjacentHTML('beforeend', verificationHTML);
        scrollToBottom();
      }
    } else {
      addMessage('Wystąpił błąd podczas rezerwacji spotkania. Spróbuj ponownie.', 'assistant');
    }
  } catch (error) {
    console.error('Booking request failed:', error);
    addMessage('Błąd połączenia podczas rezerwacji. Spróbuj ponownie.', 'assistant');
  }
}

function selectRealDate(dateStr) {
  console.log('selectRealDate called with:', dateStr);
  
  // Jeśli data już została wybrana, zablokuj możliwość zmiany
  if (appointmentState.selectedDate) {
    console.log('Date already selected, ignoring click');
    return;
  }
  
  const dateElement = document.querySelector(`[data-date="${dateStr}"]`);
  if (dateElement && !dateElement.classList.contains('disabled')) {
    // Remove previous selection
    document.querySelectorAll('.mini-calendar-day.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Add selection to clicked date
    dateElement.classList.add('selected');
    
    // Disable all other dates
    document.querySelectorAll('.mini-calendar-day.available').forEach(el => {
      if (el !== dateElement) {
        el.classList.remove('available');
        el.classList.add('disabled');
        el.removeAttribute('onclick');
      }
    });
    
    appointmentState.selectedDate = dateStr;
    appointmentState.currentStep = 'selecting_time';
    
    console.log('Real date selected:', dateStr);
    setTimeout(() => {
      showRealTimeSlots(dateStr);
    }, 300);
  }
}

function showRealTimeSlots(dateStr) {
  const existingCalendar = document.querySelector('.calendar-content');
  if (!existingCalendar || !existingCalendar.slotsByDate) {
    console.error('Calendar data not found');
    return;
  }
  
  const availableSlots = existingCalendar.slotsByDate[dateStr] || [];
  const formattedDate = new Date(dateStr).toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Show loading first
  const loadingHTML = `
    <div class="time-slots-loading" style="display: block;">
      <h5>Sprawdzam dostępne terminy...</h5>
      <div class="calendar-skeleton large"></div>
      <div class="calendar-skeleton medium"></div>
      <div class="calendar-skeleton small"></div>
    </div>
  `;
  
  existingCalendar.insertAdjacentHTML('beforeend', loadingHTML);
  scrollToBottom();
  
  // Show real slots after loading delay
  setTimeout(() => {
    const loadingDiv = document.querySelector('.time-slots-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
    
    const timeSlotsHTML = `
      <div class="time-slots" style="display: block;">
        <h5>Dostępne godziny na ${formattedDate}</h5>
        <div class="time-grid">
          ${availableSlots.map(time => `
            <div class="time-slot available" onclick="selectRealTime('${time}')" data-time="${time}">
              ${time}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    existingCalendar.insertAdjacentHTML('beforeend', timeSlotsHTML);
    scrollToBottom();
  }, 800);
}

function selectRealTime(timeStr) {
  // Jeśli godzina już została wybrana, zablokuj możliwość zmiany
  if (appointmentState.selectedTime) {
    console.log('Time already selected, ignoring click');
    return;
  }
  
  // Remove previous selection
  document.querySelectorAll('.time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Add selection to clicked time
  const timeElement = document.querySelector(`[data-time="${timeStr}"]`);
  if (timeElement) {
    timeElement.classList.add('selected');
    
    // Disable all other time slots
    document.querySelectorAll('.time-slot.available').forEach(el => {
      if (el !== timeElement) {
        el.classList.remove('available');
        el.classList.add('disabled');
        el.removeAttribute('onclick');
      }
    });
  }
  
  appointmentState.selectedTime = timeStr;
  appointmentState.currentStep = 'entering_contact';
  
  setTimeout(() => {
    showContactForm();
  }, 300);
}

async function verifyAppointmentCode(appointmentId, verificationCode) {
  try {
    console.log('Verifying appointment:', appointmentId, 'with code:', verificationCode);
    
    const verifyQuery = `VERIFY_APPOINTMENT:${appointmentId},${verificationCode}`;
    
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: verifyQuery, conversation_id: sessionId })
    });
    const data = await res.json();
    
    if (data.action_type === 'confirmed') {
      appointmentState.currentStep = 'completed';
      addMessage(data.answer, 'assistant');
      resetAppointmentState();
    } else if (data.action_type === 'error') {
      addMessage(data.answer, 'assistant');
    } else {
      addMessage('Wystąpił błąd podczas weryfikacji. Spróbuj ponownie.', 'assistant');
    }
  } catch (error) {
    console.error('Verification failed:', error);
    addMessage('Błąd połączenia podczas weryfikacji. Spróbuj ponownie.', 'assistant');
  }
}

function isValidEmail(email) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[\\d\\s\\+\\-\\(\\)]{9,}$/.test(phone);
}

// Global state for calendar
let currentCalendarDate = new Date();

// Make functions globally available
window.selectDate = selectDate;
window.selectTime = selectTime;
window.submitAppointment = submitAppointment;
window.selectRealDate = selectRealDate;
window.selectRealTime = selectRealTime;

window.changeMonth = function(direction) {
  console.log('Month navigation called with direction:', direction);
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
  
  // Update the displayed month
  const monthElement = document.getElementById('currentMonth');
  if (monthElement) {
    monthElement.textContent = `${getMonthName(currentCalendarDate.getMonth())} ${currentCalendarDate.getFullYear()}`;
  }
  
  // Update the calendar grid
  const calendarGrid = document.getElementById('calendar-grid');
  if (calendarGrid) {
    calendarGrid.innerHTML = createCalendarDays(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
  }
};

window.changeRealMonth = function(direction) {
  console.log('Real month navigation called with direction:', direction);
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
  
  // Update the displayed month
  const monthElement = document.getElementById('currentRealMonth');
  if (monthElement) {
    monthElement.textContent = `${getMonthName(currentCalendarDate.getMonth())} ${currentCalendarDate.getFullYear()}`;
  }
  
  // Update the calendar grid - we need to get the available dates from the calendar data
  const calendarGrid = document.getElementById('real-calendar-grid');
  const calendarContent = document.querySelector('.calendar-content');
  if (calendarGrid && calendarContent && calendarContent.slotsByDate) {
    const availableDates = new Set(Object.keys(calendarContent.slotsByDate));
    calendarGrid.innerHTML = createRealCalendarDays(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), availableDates);
  }
};

// Upewnij się że DOM jest załadowany
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up chat listeners');
  console.log('Form:', form);
  console.log('Input:', input);
  console.log('Send button:', document.querySelector('.send-btn'));
  
  // Event delegation for dynamically added appointment buttons - ENHANCED DEBUG VERSION
  document.addEventListener('click', (e) => {
    console.log('GLOBAL CLICK EVENT:', e.target);
    console.log('Target ID:', e.target.id);
    console.log('Target classes:', e.target.className);
    
    if (e.target && e.target.id === 'submit-appointment-btn') {
      console.log('✅ SUBMIT APPOINTMENT BUTTON CLICKED - EVENT FIRED!');
      e.preventDefault();
      e.stopPropagation();
      submitAppointment();
      return;
    }
    
    // Also check parent elements in case click event bubbles
    let parent = e.target.parentElement;
    while (parent && parent !== document) {
      if (parent.id === 'submit-appointment-btn') {
        console.log('✅ SUBMIT APPOINTMENT BUTTON CLICKED - PARENT ELEMENT!');
        e.preventDefault();
        e.stopPropagation();
        submitAppointment();
        return;
      }
      parent = parent.parentElement;
    }
    
    if (e.target && e.target.id === 'verify-code-btn') {
      console.log('Verify code button clicked!');
      e.preventDefault();
      const codeInput = document.getElementById('verification-code-input');
      if (codeInput && codeInput.value.trim() && appointmentState.appointmentId) {
        verifyAppointmentCode(appointmentState.appointmentId, codeInput.value.trim());
      }
    }
  });

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
