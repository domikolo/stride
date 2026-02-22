import Link from 'next/link';

export default function PolitykaPrywatnosci() {
  return (
    <main className="min-h-screen px-8 py-16 max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-[#71717a] hover:text-white transition-colors mb-12"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Powrót
      </Link>

      <h1 className="text-3xl font-bold mb-8">Polityka Prywatności</h1>
      <p className="text-sm text-[#71717a] mb-10">Ostatnia aktualizacja: luty 2025</p>

      <div className="prose prose-invert max-w-none space-y-8 text-[#a1a1aa] leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Administrator danych</h2>
          <p>
            Administratorem danych osobowych jest Stride Services. Kontakt:{' '}
            <a href="mailto:jakub@stride-services.com" className="text-blue-400 hover:text-blue-300">
              jakub@stride-services.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Jakie dane zbieramy</h2>
          <p>W trakcie korzystania z chatbota możemy zbierać:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Treść wiadomości przesyłanych do chatbota</li>
            <li>Adres e-mail lub numer telefonu — tylko jeśli je podasz w celu umówienia spotkania</li>
            <li>Anonimowy identyfikator sesji (przechowywany w sessionStorage przeglądarki)</li>
            <li>Datę i godzinę rozmowy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Cel przetwarzania</h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Obsługa zapytań przesłanych przez chatbota</li>
            <li>Umawianie spotkań i wysyłanie potwierdzeń</li>
            <li>Poprawa jakości usług (anonimowe analizy statystyczne)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Podstawa prawna</h2>
          <p>
            Przetwarzanie danych odbywa się na podstawie Twojej zgody (art. 6 ust. 1 lit. a RODO)
            lub w celu wykonania umowy / podjęcia działań na Twoje żądanie (art. 6 ust. 1 lit. b RODO).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Przechowywanie danych</h2>
          <p>
            Historia rozmów jest przechowywana przez 14 dni. Dane kontaktowe podane
            przy rezerwacji spotkania — przez czas niezbędny do realizacji usługi,
            nie dłużej niż 90 dni.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Twoje prawa</h2>
          <p>Przysługuje Ci prawo do:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Dostępu do swoich danych</li>
            <li>Sprostowania lub usunięcia danych</li>
            <li>Ograniczenia przetwarzania</li>
            <li>Wniesienia skargi do organu nadzorczego (UODO)</li>
          </ul>
          <p className="mt-2">
            Aby skorzystać z tych praw, skontaktuj się z nami:{' '}
            <a href="mailto:jakub@stride-services.com" className="text-blue-400 hover:text-blue-300">
              jakub@stride-services.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Przekazywanie danych</h2>
          <p>
            Dane są przechowywane w infrastrukturze AWS (Frankfurt, UE). Nie sprzedajemy
            ani nie udostępniamy danych osobowych podmiotom trzecim w celach marketingowych.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Pliki cookie i sessionStorage</h2>
          <p>
            Chatbot używa <code className="text-blue-300">sessionStorage</code> do przechowywania
            identyfikatora sesji. Dane znikają po zamknięciu karty przeglądarki.
            Nie używamy plików cookie śledzących.
          </p>
        </section>
      </div>
    </main>
  );
}
