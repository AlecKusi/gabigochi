import type { Season, Weather } from './home/season';

/** Kwestie o porze roku, pogodzie i o kotku w tej pogodzie/porze (`{kot}` — imię kota). */
const seasonLines: {
  season: Readonly<Record<Season, readonly string[]>>;
  weather: Readonly<Record<Weather, readonly string[]>>;
  catWeather: Readonly<Partial<Record<Weather, readonly string[]>>>;
  catSeason: Readonly<Partial<Record<Season, readonly string[]>>>;
} = {
  season: {
    spring: ['Wiosna! Wszystko kwitnie!', 'Pachnie wiosną!', 'Czas na nowe kwiatki na balkonie.'],
    summer: ['Ale upał!', 'Lody by się przydały…', 'Lato, wakacje, KitKat w lodówce!'],
    autumn: [
      'Jestem jesieniarą!',
      'Czas na herbatkę i kocyk.',
      'Czas na pumpkin spice latte!',
      'Pumpkin spice latte, poproszę!',
      'Liście są takie kolorowe!',
    ],
    winter: ['Brr, zimno!', 'Kakao i kocyk — idealnie.', 'Ulepimy bałwanka?'],
  },
  weather: {
    sunny: ['Ładna pogoda!', 'Ale słoneczko!'],
    cloudy: ['Szaro dziś…', 'Chmurki zasłoniły słońce.'],
    rain: ['Pada i pada…', 'Kap, kap, kap…', 'Dobrze, że jestem w domu.'],
    storm: ['Aaa! Grzmi!', 'Ale błyska!'],
    snow: ['Śnieg! Wszystko białe!', 'Pada śnieg!'],
    frost: ['Mróz szczypie w nos!', 'Szron na szybach!'],
  },
  catWeather: {
    snow: ['{kot} chce łapać płatki za szybą!'],
    rain: ['{kot} patrzy na krople na szybie.'],
    storm: ['{kot} chowa się pod łóżkiem!'],
  },
  catSeason: {
    spring: ['{kot} kicha od kwiatków!'],
    summer: ['{kot} wygrzewa się w słoneczku.'],
    autumn: ['{kot} poluje na liście!'],
  },
};

export const content = {
  name: 'Gabriela',
  nameGenitive: 'Gabrieli',
  shortName: 'Gabi',
  appName: 'Gabigochi',
  age: 26,
  /** Urodziny Gabi (co roku: prezent w monetach, konfetti i urodzinowe teksty); `year` — rok urodzenia. */
  birthday: { day: 12, month: 10, year: 2000 },
  /** Okno urodzinowego prezentu (`{wiek}` — ile lat kończy). */
  birthdayGift: 'Dziś kończysz {wiek} lat! Wszystkiego najlepszego — prezent od Gabigochi:',
  wishesTitle: 'Sto lat, Gabi!',
  /** Samouczek przy pierwszym wejściu do pokoju (po ekranie urodzinowym); `target` — element, który pulsuje. */
  tips: [
    { text: 'To Twoja Gabi! Stuknij ją, żeby ją pogłaskać, albo przytrzymaj i przeciągnij — da się ją podnieść.', target: '.stage' },
    { text: 'Stuknij mebel, a Gabi do niego podejdzie: usiądzie, zrobi kawę, weźmie kąpiel… Strzałki po bokach prowadzą do innych pokoi.', target: '.stage' },
    { text: 'Gdy zgłodnieje: Karm otwiera lodówkę — stuknij jedzenie albo przeciągnij je prosto do Gabi.', target: '[data-nav="feed"]' },
    { text: 'W minigrach zdobywasz monety. Za monety kupisz jedzenie i meble w Sklepie, a ubrania w Szafie.', target: '[data-nav="games"]' },
    { text: 'Ołówek to tryb Urządzaj: przestawiaj meble, stawiaj kupione z magazynu, zmieniaj tapety i podłogi.', target: '.edit-toggle' },
    { text: 'Wieczorem zgaś Światło, żeby Gabi się wyspała. A w Profilu (stuknij portret u góry) zrób czasem kopię zapisu.', target: '.profile-btn' },
  ],
  wishes: [
    'Sto lat.. Sto lat.. a jednak 26!',
    'Wszystkiego najlepszego z okazji podatku dochodowego, kolejnej osiemnastki <3',
  ],
  signature: 'Z całego serca!',
  /** Kwestie Gabi przy konkretnym jedzeniu (reszta — `lines.eat`). */
  foodLines: {
    strawberry: ['Słodkie truskaweczki!', 'Mniam, lato!'],
    donut: ['Tłusty czwartek codziennie!', 'Z różą w środku!'],
    icecream: ['Zimne, ale pyszne!', 'Brr… jeszcze łyżeczkę!'],
    zapiekanka: ['Zapiekanka jak z budki!', 'Dużo keczupu!'],
    pancakes: ['Naleśniki z dżemem!', 'Jeszcze jeden naleśnik?'],
    pierogi: ['Pierożki jak u babci!', 'Ruskie najlepsze!'],
    ramen: ['Siorb, siorb!', 'Itadakimasu!'],
    sushi: ['Sushi! Wasabi pali!', 'Uwielbiam łososia!'],
    pizza: ['Pizza zawsze wchodzi!'],
    cake: ['Tort! Sto lat!'],
  },
  seasonLines,
  lines: {
    greeting: ['Cześć!', 'Hej, tęskniłam!', 'O, jesteś!'],
    /** W dniu urodzin — zamiast części zwykłych tekstów (`{wiek}` — ile lat kończy). */
    birthdayToday: ['Dziś moje urodziny!', 'Sto lat, sto lat!', 'Kto ma dziś urodziny? Ja!', '{wiek} lat i ani dnia starsza!', 'Gdzie mój tort?'],
    happy: ['Ale fajny dzień!', 'Lubię ten pokój.', 'Zagramy w coś?', 'Sto lat dla mnie!', 'Mam ochotę na KitKata…'],
    hungry: ['Zjadłabym coś…', 'Burczy mi w brzuchu!', 'Może KitKat?'],
    sleepy: ['Ziew… jestem śpiąca.', 'Zgasisz światło?'],
    bored: ['Pobawisz się ze mną?', 'Nudzę się…'],
    /** Losowe teksty Gabi — wtrącane od czasu do czasu, gdy niczego jej nie brakuje. */
    random: [
      'Somerka i Hachi to jedna rodzina.',
      'Jestem kierowniczka.',
      'ALEEEEKSA… a no tak, nie ma go tutaj.',
      'Czukier czy cukier?',
      'Żyjemy w symulacji?',
      'Żart o psie spawaczu zawsze jest śmieszny.',
      'Dan dan danana!',
      'Moje ciuchy są popsute, bo żyję w symulacji.',
      'Meow.',
      'Więc… adios.',
      'I wisz i was a berd.',
      'Uwu.',
    ],
    eat: ['Mniam!', 'Pyszne!', 'Dziękuję!'],
    drink: ['Ahh, orzeźwiające!', 'Bąbelki!', 'Psst… pyszna cola!'],
    kitkat: ['KITKAT! Kocham!', 'Mój ulubiony!!!', 'Najlepszy prezent!'],
    pet: ['Hihi!', 'To łaskocze!', 'Miło!'],
    goodNight: ['Dobranoc!', 'Słodkich snów…'],
    notSleepy: ['Nie jestem śpiąca!', 'Jeszcze nie chcę spać!'],
    wakeUp: ['Dzień dobry!', 'Już nie śpię!', 'Ziew… co się dzieje?'],
    angry: ['Hej! Przestań!', 'Nie zaczepiaj mnie!'],
    scared: ['Aaa! Ostrożnie!', 'Kręci mi się w głowie…'],
    crazy: ['Cukier! Cukieeer!', 'Wiiiii!'],
    drag: ['Łiii!', 'Postaw mnie!', 'Lecę!'],
    landHappy: ['Jeszcze raz!', 'Hihi!'],
    activityStop: ['Już, już!', 'Dobra, dobra…'],
    // interakcje z przedmiotami
    water: ['Pij, roślinko!', 'Proszę, kwiatku!'],
    read: ['Ten tom jest super!', 'Jeszcze jeden rozdział!'],
    play: ['Jeszcze jedna runda!', 'Wygrywam!'],
    cute: ['Słodziak!', 'Jaki uroczy!'],
    window: ['Ładna pogoda!', 'Ale słoneczko!', 'Hej, sąsiedzi!', 'Pa pa, kotku za oknem!'],
    windowNight: ['Gwiazdy!', 'Jaki piękny księżyc…'],
    // zegar ścienny — {czas} to godzina z telefonu
    clockMorning: ['Jest {czas}. Dzień dobry!', '{czas} — pora na kawkę!', 'Już {czas}, wstajemy!'],
    clockDay: ['Jest {czas}.', '{czas} — dzień w pełni!', 'Dopiero {czas}, jeszcze dużo dnia!'],
    clockEvening: ['Jest {czas}, robi się wieczór.', '{czas} — zachód słońca!', 'Już {czas}, czas na relaks.'],
    clockNight: ['Jest {czas}… pora spać!', '{czas}?! Trzeba iść do łóżka.', 'Już {czas}, dobranoc!'],
    // noc wg pory roku, ale jeszcze nie pora spać (zimą od 17:00) — {czas} to godzina z telefonu
    clockDark: ['Jest {czas}, a już ciemno!', '{czas} — za oknem już noc.', 'Już {czas}, księżyc świeci!'],
    toilet: ['Pssst!'],
    shower: ['Czas na prysznic!', 'Ciepła woda!'],
    showerDone: ['Świeżutka!', 'Pachnę jak kwiatuszek!'],
    mirror: ['Ale ładnie dziś wyglądam!', 'Kto tu jest najpiękniejszy?', 'Fryzura idealna!'],
    laundry: ['Pranie nastawione!', 'Będą pachnące ciuszki!', 'Kręć się, kręć!'],
    scale: ['Waga pokazuje… sto lat!', 'Zero kilogramów smutku!', 'Hmm… to przez KitKaty.'],
    bath: ['Kąpiel z pianką!', 'Bąbelki!'],
    bathRelax: ['Ale relaks…', 'Mogłabym tu zostać…'],
    sink: ['Myję rączki!', 'Czyste rączki!'],
    teeth: ['Szoruję ząbki!', 'Dwie minuty, nie mniej!', 'Uśmiech jak z reklamy!'],
    duck: ['Kwa, kwa!', 'Moja gumowa kaczuszka!'],
    showerSing: ['La la la!', 'Koncert pod prysznicem!', 'Dan dan danana!'],
    brew: ['Kawusia się parzy!', 'Pachnie kawą!', 'Herbatka dla mnie!'],
    dishes: ['Zmywam naczynia!', 'Czyściutkie talerze!', 'Lśni jak nowe!'],
    towel: ['Wycieram rączki.', 'Mięciutki ręcznik!'],
    hairdryer: ['Bzzz… suszę włosy!', 'Fryzura gotowa!'],
    nap: ['Tylko pięć minutek…', 'Zzz… mięciutko…', 'Krótka drzemka!'],
    coffee: ['Mmm, kawka!', 'Kawka na dobry dzień!'],
    cake: ['Pyszne ciasto!', 'Jeszcze kawałeczek…'],
    tea: ['Herbatka…', 'Ciepła herbatka!'],
    relaxPhone: ['Co tam w telefonie…', 'Hihi, memy.'],
    tv: ['Ulubiony serial!', 'Jeszcze jeden odcinek!'],
    cat: ['Kici, kici!', '{kot} mruczy!', 'Kto tu jest słodki? {kot}!'],
    fridge: ['Co by tu zjeść…', 'Zajrzyjmy do lodówki!'],
    cook: ['Gotuję coś pysznego!', 'Mmm, ale pachnie!', 'Szefowa kuchni Gabi!'],
    catfood: ['{kot}, jedzonko!', 'Smacznego, {kot}!'],
    catHungry: ['{kot} jest głodny…', 'Trzeba nakarmić {kot}!', 'Miau? {kot} prosi o jedzenie.'],
    cookLater: ['Na razie wystarczy gotowania!', 'Lodówka pełna, ugotuję coś później.'],
    plantsThirsty: ['Kwiatki chcą pić!', 'Podlejemy kwiatki?'],
    noSeat: ['Brakuje mi siedziska…'],
    noDesk: ['Brakuje mi biurka do nauki…'],
  },
} as const;
