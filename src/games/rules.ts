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
};

/** Wspólne dla wszystkich gier. */
export const COMMON_RULES = 'Każda gra kosztuje 5 energii. Gdy Gabi ma mniej niż 10 energii, jest za zmęczona na granie.';
