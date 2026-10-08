/**
 * Słowa do Szyfrokrzyżówki.
 *
 * PERSONAL_WORDS — słowa osobiste (imiona, miejsca, wspólne żarty). Śmiało podmień je na własne!
 * Każda plansza zawiera co najmniej 2 z nich. Wielkość liter nie ma znaczenia, polskie znaki są
 * mile widziane. Słowa dłuższe niż 11 liter nie zmieszczą się na planszy (zostaną pominięte),
 * a słowa z literami Q, V, X są pomijane (nie ma ich na klawiaturze).
 */
export const PERSONAL_WORDS: string[] = [
  'GABI',
  'HACHI',
  'SOMERKA',
  'LORDOFON',
  'PIELĘGNIARA',
  'FIOLET',
  'CAPIBARA',
  'FLOPPA',
  'KITKAT',
  'KOTEK',
  'MANGA',
  'SZYDEŁKO',
  'WŁÓCZKA',
  'PIELĘGNIARKA',
  'OKULARY',
  'LAWENDA',
  'MUZYKA',
  'TELEFON',
  'ROŚLINY',
  'MONSTERA',
  'URODZINY',
  'PREZENT',
  'TORT',
  'SŁUCHAWKI',
  'KSIĄŻKA',
  'NAUKA',
  'STETOSKOP',
  'PIŻAMA',
  'KĄPIEL',
  'SWETEREK',
  'PIZZA',
];

/** Popularne polskie rzeczowniki (3–9 liter, bez Q/V/X), uzupełniają planszę. */
export const COMMON_WORDS: string[] = [
  // natura i pogoda
  'DOM', 'LAS', 'MORZE', 'RZEKA', 'GÓRA', 'SŁOŃCE', 'KSIĘŻYC', 'GWIAZDA', 'NIEBO', 'CHMURA',
  'DESZCZ', 'ŚNIEG', 'WIATR', 'BURZA', 'TĘCZA', 'KWIAT', 'DRZEWO', 'LIŚĆ', 'TRAWA', 'RÓŻA',
  'TULIPAN', 'ZŁOTO', 'SREBRO', 'ŻELAZO', 'KAMIEŃ', 'PIASEK', 'MUSZLA', 'FALA', 'OGIEŃ', 'DYM',
  'LÓD', 'MGŁA', 'ROSA', 'ISKRA', 'ŚWIATŁO', 'CIEŃ', 'KOLOR', 'ZIELEŃ', 'BŁĘKIT', 'FIOLET',
  'KOMETA', 'PLANETA', 'ZIEMIA', 'KOSMOS', 'OBŁOK', 'ZACHÓD', 'WSCHÓD', 'PÓŁNOC', 'JEZIORO', 'WYSPA',
  'ŁĄKA', 'POLE', 'PLAŻA', 'PEJZAŻ', 'WIDOK',
  // rośliny
  'ŚWIERK', 'SOSNA', 'DĄB', 'BRZOZA', 'KLON', 'LIPA', 'WIERZBA', 'KAKTUS', 'PALMA', 'PAPROĆ',
  'MECH', 'BLUSZCZ', 'STOKROTKA', 'MAK', 'FIOŁEK', 'BRATEK', 'KONWALIA', 'LILIA', 'NARCYZ', 'HIACYNT',
  'BUKIET', 'WAZON', 'DONICZKA', 'GRZYB', 'ORZECH', 'ŻOŁĄDŹ', 'SZYSZKA', 'KASZTAN',
  // jedzenie
  'JABŁKO', 'GRUSZKA', 'ŚLIWKA', 'WIŚNIA', 'BANAN', 'CYTRYNA', 'POMARAŃCZ', 'TRUSKAWKA', 'MALINA', 'JAGODA',
  'ARBUZ', 'MELON', 'MARCHEWKA', 'ZIEMNIAK', 'POMIDOR', 'OGÓREK', 'CEBULA', 'CZOSNEK', 'KAPUSTA', 'SAŁATA',
  'GROCH', 'FASOLA', 'CHLEB', 'BUŁKA', 'MASŁO', 'SER', 'MLEKO', 'JAJKO', 'MIÓD', 'CUKIER',
  'SÓL', 'PIEPRZ', 'ZUPA', 'OBIAD', 'KOLACJA', 'ŚNIADANIE', 'KAWA', 'HERBATA', 'SOK', 'WODA',
  'CIASTO', 'CIASTKO', 'LODY', 'CZEKOLADA', 'KANAPKA', 'NALEŚNIK', 'PIEROGI', 'MAKARON', 'RYŻ', 'KASZA',
  'ROSÓŁ', 'BIGOS', 'KOTLET', 'RYBA', 'KURCZAK', 'DESER', 'BUDYŃ', 'KISIEL', 'GOFR', 'PĄCZEK',
  'SERNIK', 'PIERNIK', 'POPCORN', 'FRYTKI', 'OMLET', 'SAŁATKA', 'JOGURT', 'KEFIR', 'TWARÓG', 'DŻEM',
  'KOMPOT', 'LEMONIADA', 'KAKAO',
  // dom
  'STÓŁ', 'KRZESŁO', 'SZAFA', 'ŁÓŻKO', 'LAMPA', 'OKNO', 'DRZWI', 'ŚCIANA', 'PODŁOGA', 'SUFIT',
  'DACH', 'KOMIN', 'BALKON', 'OGRÓD', 'PŁOT', 'BRAMA', 'SCHODY', 'PIWNICA', 'STRYCH', 'KUCHNIA',
  'ŁAZIENKA', 'POKÓJ', 'SALON', 'DYWAN', 'ZASŁONA', 'LUSTRO', 'PÓŁKA', 'KANAPA', 'FOTEL', 'PODUSZKA',
  'KOŁDRA', 'KOC', 'ZEGAR', 'BUDZIK', 'KUBEK', 'TALERZ', 'MISKA', 'ŁYŻKA', 'WIDELEC', 'NÓŻ',
  'GARNEK', 'PATELNIA', 'CZAJNIK', 'LODÓWKA', 'PIEKARNIK', 'ZLEW', 'MYDŁO', 'RĘCZNIK', 'SZCZOTKA', 'GRZEBIEŃ',
  'KLUCZ', 'ZAMEK', 'ŻARÓWKA', 'PRALKA', 'ODKURZACZ', 'KONEWKA', 'ŁOPATA', 'GRABIE', 'TACZKA', 'MŁOTEK',
  'GWÓŹDŹ', 'ŚRUBA', 'PIŁA', 'NOŻYCZKI', 'IGŁA', 'NITKA', 'GUZIK', 'ŚWIECZKA', 'LATARKA', 'KOSZYK',
  // ubrania i drobiazgi
  'PORTFEL', 'TORBA', 'PLECAK', 'WALIZKA', 'PARASOL', 'KAPELUSZ', 'CZAPKA', 'SZALIK', 'KURTKA', 'PŁASZCZ',
  'SPODNIE', 'SUKIENKA', 'SPÓDNICA', 'KOSZULA', 'BLUZKA', 'BUTY', 'SKARPETA', 'PIERŚCIEŃ', 'KORALE', 'ZEGAREK',
  'KOLCZYK', 'NASZYJNIK', 'KIESZEŃ', 'WSTĄŻKA', 'KOKARDA', 'PERŁA', 'DIAMENT',
  // ciało
  'OKO', 'UCHO', 'NOS', 'USTA', 'RĘKA', 'NOGA', 'GŁOWA', 'WŁOSY', 'SERCE', 'PALEC',
  'KOLANO', 'RAMIĘ', 'PLECY', 'BRZUCH', 'ZĄB', 'UŚMIECH',
  // ludzie
  'MAMA', 'TATA', 'BABCIA', 'DZIADEK', 'SIOSTRA', 'BRAT', 'CIOCIA', 'WUJEK', 'DZIECKO', 'RODZINA',
  'KOLEGA', 'SĄSIAD', 'KRÓL', 'KRÓLOWA', 'RYCERZ', 'SMOK', 'WRÓŻKA',
  // miejsca i podróże
  'MIASTO', 'WIEŚ', 'ULICA', 'PLAC', 'PARK', 'SKLEP', 'SZKOŁA', 'KINO', 'TEATR', 'MUZEUM',
  'SZPITAL', 'APTEKA', 'POCZTA', 'DWORZEC', 'LOTNISKO', 'DROGA', 'MOST', 'TUNEL', 'SAMOCHÓD', 'ROWER',
  'AUTOBUS', 'TRAMWAJ', 'POCIĄG', 'SAMOLOT', 'STATEK', 'ŁÓDKA', 'RAKIETA', 'HULAJNOGA', 'BILET', 'PASZPORT',
  'NAMIOT', 'OGNISKO', 'MAPA', 'ATLAS', 'GLOBUS', 'KOMPAS', 'ŁAWKA', 'FONTANNA', 'POMNIK', 'WIEŻA',
  'LATARNIA', 'PORT', 'KOTWICA', 'ŻAGIEL', 'WIOSŁO', 'KARUZELA', 'HUŚTAWKA',
  // zwierzęta
  'KOT', 'PIES', 'KOŃ', 'KROWA', 'ŚWINIA', 'OWCA', 'KOZA', 'KURA', 'KACZKA', 'GĘŚ',
  'KRÓLIK', 'MYSZ', 'CHOMIK', 'ŻÓŁW', 'ŻABA', 'PTAK', 'SOWA', 'ORZEŁ', 'BOCIAN', 'WRÓBEL',
  'MOTYL', 'PSZCZOŁA', 'BIEDRONKA', 'MRÓWKA', 'ŚLIMAK', 'JEŻ', 'LIS', 'WILK', 'SARNA', 'JELEŃ',
  'DZIK', 'WIEWIÓRKA', 'BÓBR', 'FOKA', 'DELFIN', 'WIELORYB', 'REKIN', 'SŁOŃ', 'ŻYRAFA', 'ZEBRA',
  'LEW', 'TYGRYS', 'MAŁPA', 'PAPUGA', 'PINGWIN', 'ŁABĘDŹ', 'KOGUT', 'INDYK', 'OSIOŁ', 'WIELBŁĄD',
  'KANGUR', 'KOALA', 'PANDA', 'LEMUR', 'ŁOŚ', 'BORSUK', 'KRET', 'NIETOPERZ', 'KOMAR', 'MUCHA',
  'PAJĄK', 'ROBAK',
  // szkoła, zabawa, czas
  'ZESZYT', 'OŁÓWEK', 'DŁUGOPIS', 'KREDKA', 'GUMKA', 'LINIJKA', 'PAPIER', 'LIST', 'KOPERTA', 'ZNACZEK',
  'GAZETA', 'OBRAZ', 'ZDJĘCIE', 'FILM', 'PIOSENKA', 'GITARA', 'PIANINO', 'BĘBEN', 'SKRZYPCE', 'TANIEC',
  'ZABAWA', 'PIŁKA', 'LALKA', 'MIŚ', 'KLOCKI', 'GRA', 'PUZZLE', 'BALON', 'ŚWIECA', 'KARTKA',
  'ŻART', 'SEN', 'MARZENIE', 'RADOŚĆ', 'MIŁOŚĆ', 'PRZYGODA', 'PODRÓŻ', 'WAKACJE', 'URLOP', 'ŚWIĘTO',
  'NIEDZIELA', 'SOBOTA', 'PIĄTEK', 'WTOREK', 'ŚRODA', 'CZWARTEK', 'RANEK', 'POŁUDNIE', 'WIECZÓR', 'NOC',
  'DZIEŃ', 'TYDZIEŃ', 'MIESIĄC', 'ROK', 'WIOSNA', 'LATO', 'JESIEŃ', 'ZIMA', 'SKARB', 'KORONA',
  'MIECZ', 'TARCZA', 'KOMPUTER', 'EKRAN', 'MYSZKA', 'RADIO', 'BATERIA', 'NOTES', 'KALENDARZ', 'POCZTÓWKA',
  'MEDAL', 'PUCHAR', 'NAGRODA', 'PIKNIK', 'SPACER', 'BIEG', 'SKOK', 'PŁYWANIE', 'NARTY', 'SANKI',
  'ŁYŻWY', 'BAŁWAN', 'SOPEL', 'KOSZ',
];
