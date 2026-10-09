import { foodById, type FoodId } from '../core/config';
import { BOXES } from './catBoxesLogic';
import { RUN } from './catRunLogic';
import { CUPS } from './cupsLogic';
import { FOOD_CHAIN } from './food2048Logic';
import { SIMON } from './simonLogic';

/** Łańcuch 2048 słowami: „jabłko → truskawki → … → tort urodzinowy”. */
const CHAIN = FOOD_CHAIN.map((f) => foodById(f as FoodId).name.toLowerCase()).join(' → ').replace('kitkat', 'KitKat');

/**
 * Dokładne zasady minigier (okienko „i” w nagłówku gry). Liczby muszą zgadzać się z logiką gier —
 * pilnują tego testy (tests/games/rules.test.ts).
 */
export interface GameRules {
  /** Cel gry jednym zdaniem. */
  goal: string;
  /** Jak grać — kolejne punkty. */
  how: string[];
  /** Punkty i nagroda. */
  scoring: string[];
}

export const GAME_RULES: Readonly<Record<string, GameRules>> = {
  catch: {
    goal: 'Złap jak najwięcej smakołyków w 60 sekund.',
    how: [
      'Przesuwaj palcem w lewo i w prawo — Gabi idzie za palcem.',
      'Smakołyki spadają z góry: łap je, stając pod nimi.',
      'Omijaj brokuły! Każdy złapany brokuł zabiera jedno z 3 serduszek.',
      'Gra kończy się po 60 sekundach albo po utracie wszystkich serduszek.',
    ],
    scoring: [
      'Jabłko 3 pkt, kanapka 5 pkt, pizza 7 pkt, tort 10 pkt, KitKat 25 pkt.',
      'Nagroda: 1 moneta za każde 10 punktów (najwyżej 50) i +10 humoru.',
    ],
  },
  candles: {
    goal: 'Zdmuchnij jak najwięcej świeczek na urodzinowym torcie.',
    how: [
      'Przez 30 sekund na torcie zapalają się świeczki — stuknij płomyk, żeby go zdmuchnąć.',
      'Płomyki zapalają się coraz szybciej i szybciej gasną same — nie czekaj!',
      'Na koniec finał: 26 świeczek naraz i 10 sekund, żeby zdmuchnąć wszystkie.',
    ],
    scoring: [
      'Każda zdmuchnięta świeczka to 1 pkt.',
      'Seria: kolejna świeczka zdmuchnięta w ciągu 0,6 s daje bonus +1, +2, +3 pkt.',
      'Nagroda: ok. 1 moneta za każde 3–4 punkty (od 5 do 40 monet) i +15 humoru.',
    ],
  },
  bricks: {
    goal: 'Rozbijaj klocki, zanim dojdą do dołu planszy.',
    how: [
      'Przeciągnij palcem, żeby wycelować (kropki pokazują tor), i puść, żeby wystrzelić serię kulek.',
      'Kulki odbijają się od ścian i klocków. Liczba na klocku to liczba trafień potrzebna do rozbicia.',
      'Zbieraj kółka z plusem — każde to dodatkowa kulka w następnej turze.',
      'Po każdej turze klocki przesuwają się o rząd w dół, a na górze pojawia się nowy rząd (z coraz większymi liczbami; czasem klocek z podwójną).',
      'Pierwsza kulka, która spadnie, wyznacza miejsce następnego strzału.',
      'Gdy tura się dłuży, możesz ją przyspieszyć przyciskiem ×2.',
      'Gra kończy się, gdy klocek dotrze do dołu.',
    ],
    scoring: ['Wynik to numer osiągniętej rundy.', 'Nagroda: 2 monety za każdą rundę (najwyżej 50) i +10 humoru.'],
  },
  memory: {
    goal: 'Znajdź wszystkie 8 par obrazków.',
    how: [
      'Odkrywaj po dwie karty. Takie same zostają odkryte, różne się zakrywają.',
      'Zapamiętuj, gdzie co leży — liczy się każdy ruch.',
    ],
    scoring: [
      'Wynik zależy od liczby ruchów: 8 ruchów (bez pomyłki) to 100 pkt, każdy dodatkowy ruch −4 pkt (najmniej 10).',
      'Nagroda: 0,4 monety za punkt (od 15 do 40 monet) i +10 humoru.',
    ],
  },
  sudoku: {
    goal: 'Wypełnij planszę 9×9 cyframi od 1 do 9.',
    how: [
      'W każdym wierszu, każdej kolumnie i każdym kwadracie 3×3 każda cyfra może być tylko raz.',
      'Stuknij puste pole, potem cyfrę na klawiaturze. Gumka czyści pole, „Cofnij” cofa ruch.',
      'Ołówek pozwala wpisywać małe notatki — cyfry, które mogą pasować.',
      'Cyfry, które łamią zasady, świecą na czerwono.',
      'Grę możesz przerwać — plansza zapisze się i dokończysz ją później.',
    ],
    scoring: [
      'Poziomy: łatwe 30, średnie 50, trudne 80 monet za ukończenie.',
      'Do tego +15 humoru. Czas nie wpływa na nagrodę.',
    ],
  },
  crypto: {
    goal: 'Odgadnij wszystkie słowa krzyżówki — litery są ukryte pod liczbami.',
    how: [
      'Każda liczba to zawsze ta sama litera. Kilka liter jest odkrytych na start.',
      'Stuknij pole, potem literę: wpisze się we wszystkich polach z tą liczbą.',
      'Szukaj słów, które już prawie widać — każda odgadnięta litera pomaga w innych słowach.',
      'Podpowiedź odkrywa jedną liczbę (najwyżej 3 podpowiedzi).',
      'W krzyżówce są słowa o Gabi — imiona, ulubione rzeczy, wspólne żarty.',
      'Grę możesz przerwać — krzyżówka zapisze się i dokończysz ją później.',
    ],
    scoring: ['Ukończenie: 60 monet, każda podpowiedź −10 (najmniej 30).', 'Do tego +15 humoru.'],
  },
  food2048: {
    goal: 'Łącz jednakowe potrawy, aż powstanie tort — i zbierz jak najwięcej punktów.',
    how: [
      'Przesuń palcem po planszy (na komputerze: strzałki) — wszystkie kafelki jadą w tę stronę.',
      `Dwie takie same potrawy łączą się w następną: ${CHAIN}.`,
      'Po każdym ruchu pojawia się nowe jabłko (czasem od razu truskawki).',
      'Gra kończy się, gdy nie ma już żadnego ruchu — albo gdy stukniesz „Zakończ i odbierz”.',
    ],
    scoring: [
      'Każde połączenie daje punkty jak w 2048: truskawki 4, pączek 8, kanapka 16… aż po tort 8192.',
      'Nagroda: 1 moneta za każde 80 punktów (od 3 do 50) i +10 humoru.',
    ],
  },
  catboxes: {
    goal: `Stukaj kotki wyskakujące z pudełek przez ${BOXES.duration / 1000} sekund.`,
    how: [
      `Z ${BOXES.count} pudełek co chwilę wygląda kotek — stuknij go, zanim się schowa.`,
      'Złoty kotek pojawia się rzadko i jest wart więcej.',
      'Nie stukaj ogórków! Pojawiają się po kilku sekundach gry.',
      'Z czasem kotki wyglądają częściej i krócej, a naraz może ich być nawet 3.',
    ],
    scoring: [
      `Kotek +${BOXES.points.cat} pkt, złoty kotek +${BOXES.points.golden} pkt, ogórek −${-BOXES.points.cucumber} pkt.`,
      'Nagroda: ok. 1,2 monety za punkt (od 3 do 45) i +10 humoru.',
    ],
  },
  cups: {
    goal: 'Zgadnij, pod którym kubkiem schował się kotek.',
    how: [
      'Na początku rundy kubek z kotkiem się unosi — zapamiętaj go.',
      `Kubki zamieniają się miejscami: ${CUPS.baseSwaps} zamiany w pierwszej rundzie, potem co rundę o jedną więcej i coraz szybciej.`,
      'Gdy kubki staną, stuknij ten, pod którym jest kotek.',
      `Masz ${CUPS.lives} serduszka — każda pomyłka zabiera jedno.`,
    ],
    scoring: ['Każde trafienie to 1 pkt.', 'Nagroda: 3 monety za trafienie (od 3 do 45) i +10 humoru.'],
  },
  catrun: {
    goal: 'Biegnij jak najdalej i skacz nad przeszkodami.',
    how: [
      'Kotek biegnie sam, coraz szybciej. Stuknij ekran, żeby skoczyć (na komputerze: spacja).',
      'Przeskakuj doniczki i ogórki. Wysokie doniczki pojawiają się, gdy kotek się rozpędzi.',
      'Nad niektórymi przeszkodami wiszą rybki — złap je w skoku.',
      'Pierwsze zderzenie kończy bieg.',
    ],
    scoring: [
      `1 pkt za każdy metr biegu i ${RUN.fishPoints} pkt za każdą rybkę.`,
      'Nagroda: 1 moneta za każde 6 punktów (od 3 do 50) i +10 humoru.',
    ],
  },
  simon: {
    goal: 'Powtórz melodię, którą Gabi gra na ukulele.',
    how: [
      `Gabi gra melodię na ${SIMON.strings.length} strunach: ${SIMON.strings.map((s) => s.name).join(', ')} — każda ma swój kolor i dźwięk.`,
      'Gdy pojawi się „Twoja kolej!”, stukaj struny w tej samej kolejności.',
      'Każda powtórzona melodia jest dłuższa o jedną nutę i grana trochę szybciej.',
      'Pierwsza pomyłka kończy grę. Z dźwiękiem łatwiej — struny też się podświetlają.',
    ],
    scoring: ['Wynik to liczba powtórzonych melodii.', 'Nagroda: 3 monety za każdą melodię (od 3 do 45) i +12 humoru.'],
  },
};

/** Wspólne dla wszystkich gier. */
export const COMMON_RULES = 'Każda gra kosztuje 5 energii. Gdy Gabi ma mniej niż 10 energii, jest za zmęczona na granie.';
