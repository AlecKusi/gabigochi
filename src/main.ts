import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import './styles/fonts.css';
import './styles/theme.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/games.css';
import { registerSW } from 'virtual:pwa-register';
import { createApp, type App, type ScreenFactory, type ScreenName } from './app';
import { claimBirthdayGift } from './core/birthday';
import { RELEASES, markSeen, readSeenVersion, unseenReleases } from './core/changelog';
import { CONFIG } from './core/config';
import { claimDailyBonus } from './core/economy';
import { applyElapsed } from './core/needs';
import { addNew, releaseItems } from './core/newItems';
import { NewerSaveError, loadState, saveState } from './core/save';
import { Store } from './core/store';
import { allActivityFrames } from './pet/activities';
import { ANIMATIONS, allFrameNames } from './sprites/animations';
import framesMeta from './sprites/frames.generated.json';
import { FRAMES, PORTRAIT_MASKS, loadSprites, maskUrl } from './sprites/loader';
import { h } from './ui/dom';
import { mountInstall } from './ui/install';
import { unlockAudio } from './ui/sound';
import { showWhatsNew } from './ui/whatsNew';
import { showBirthdayGift } from './ui/birthdayGift';
import { birthdayScreen } from './ui/screens/birthday';
import { gamesScreen } from './ui/screens/games';
import { profileScreen } from './ui/screens/profile';
import { roomScreen } from './ui/screens/room';
import { shopScreen } from './ui/screens/shop';
import { wardrobeScreen } from './ui/screens/wardrobe';
import { headSpriteNames } from './wardrobe/catalog';
import { createFigures } from './wardrobe/figures';
import { itemUrl } from './ui/home/itemSprites';
import { setClockOverride } from './home/clock';
import { setSeasonOverride, setWeatherOverride } from './home/season';
import type { GameState } from './core/types';

const SCREENS: Record<ScreenName, ScreenFactory> = {
  birthday: birthdayScreen,
  room: roomScreen,
  shop: shopScreen,
  games: gamesScreen,
  profile: profileScreen,
  wardrobe: wardrobeScreen,
};

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || matchMedia('(display-mode: standalone)').matches;
}

const NEWER_SAVE_MESSAGE =
  'Ta wersja Gabigochi jest starsza niż Twój zapis. Zamknij i otwórz aplikację ponownie, żeby pobrać aktualizację.';

function showBootError(message?: string): void {
  const root = document.getElementById('app');
  if (!root) return;
  root.replaceChildren(
    h(
      'div',
      { class: 'screen install' },
      h('h1', {}, 'Coś poszło nie tak…'),
      message ? h('p', {}, message) : null,
      h('button', { class: 'px-btn big', onclick: () => location.reload() }, 'Spróbuj ponownie'),
    ),
  );
}

/**
 * Przy tworzeniu gry (tylko `npm run dev`): `?monety=9000` dopisuje monety do zapisu, a parametr znika z adresu,
 * żeby odświeżenie strony nie dodało ich drugi raz.
 */
function withTestCoins(state: GameState): GameState {
  const params = new URLSearchParams(location.search);
  const extra = Number(params.get('monety'));
  if (!Number.isInteger(extra) || extra <= 0) return state;
  params.delete('monety');
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  return { ...state, coins: state.coins + extra };
}

async function boot(): Promise<void> {
  // Service worker rejestrujemy na samym początku: błąd dalszego startu nie może odciąć aktualizacji,
  // dzięki którym da się naprawić zepsutą wersję.
  let app: App | null = null;
  let pendingUpdate = false;
  const updateSW = registerSW({
    onRegisteredSW(_url, registration) {
      // Aplikacja z ekranu początkowego rzadko się przeładowuje – sprawdzamy aktualizacje po powrocie na pierwszy plan.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void registration?.update();
      });
    },
    onNeedRefresh() {
      pendingUpdate = true;
      app?.toast('Jest nowa wersja! Uruchom aplikację ponownie.');
    },
  });

  try {
    // iOS Safari uruchamia :active tylko, gdy na dokumencie jest nasłuch dotyku.
    document.addEventListener('touchstart', () => {}, { passive: true });
    unlockAudio();
    // iOS ignoruje user-scalable=no — pinch-zoom blokujemy tutaj.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    const root = document.getElementById('app')!;
    const browserAllowed = import.meta.env.DEV || new URLSearchParams(location.search).has('play');
    if (!isStandalone() && !browserAllowed) {
      mountInstall(root);
      return;
    }
    void navigator.storage?.persist?.();
    // podgląd przy tworzeniu gry (tylko wygląd, potrzeby bez zmian): ?godzina=23 albo ?godzina=7:30,
    // ?pora=wiosna|lato|jesien|zima, ?pogoda=slonce|pochmurno|deszcz|burza|snieg|mroz
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(location.search);
      const hour = params.get('godzina');
      if (hour && !setClockOverride(hour)) console.warn('Nieznane ?godzina=', hour);
      const pora = params.get('pora');
      if (pora && !setSeasonOverride(pora)) console.warn('Nieznane ?pora=', pora);
      const pogoda = params.get('pogoda');
      if (pogoda && !setWeatherOverride(pogoda)) console.warn('Nieznane ?pogoda=', pogoda);
    }

    const now = Date.now();
    const loaded = loadState(localStorage, now);
    const bonus = claimDailyBonus(applyElapsed(loaded.state, now), now);
    const start = import.meta.env.DEV ? withTestCoins(bonus.state) : bonus.state;
    const store = new Store(start, localStorage, {
      onSaveError: () => app?.toast('Nie udało się zapisać postępu.'),
    });
    saveState(localStorage, start);

    // Klatki zajęć i ich miny (face_study, face_phone) są w body/portraits; allActivityFrames() dla pewności, gdyby wypadły z listy.
    const names = new Set([
      ...allFrameNames(ANIMATIONS),
      ...allActivityFrames(),
      ...framesMeta.body,
      ...Object.keys(framesMeta.portraits),
    ]);
    const maskNames = [...Object.keys(FRAMES).filter((n) => FRAMES[n]?.mask), ...PORTRAIT_MASKS];
    const [sprites, masks, hats] = await Promise.all([
      loadSprites([...names]),
      loadSprites(maskNames, maskUrl),
      loadSprites(headSpriteNames(), itemUrl),
    ]);
    const figures = createFigures(sprites, masks, () => store.get().outfit, hats);
    app = createApp(root, store, sprites, figures, SCREENS);
    try {
      // Gry rysują tekst na canvasie – font musi być gotowy przed pierwszym użyciem.
      await Promise.all([document.fonts.load('400 10px "Pixelify Sans"'), document.fonts.load('700 12px "Pixelify Sans"')]);
    } catch {
      /* brak fontu nie blokuje startu */
    }
    await app.go(store.get().seenBirthday ? 'room' : 'birthday');
    if (pendingUpdate) app.toast('Jest nowa wersja! Uruchom aplikację ponownie.');
    // po aktualizacji: co nowego od wersji, którą gracz ostatnio widział (pierwsze uruchomienie — nic)
    const news = unseenReleases(readSeenVersion(localStorage));
    addNew(localStorage, releaseItems(news));
    markSeen(localStorage);
    if (news.length > 0 && store.get().seenBirthday) showWhatsNew(app.root, news);
    // podgląd okna „Co nowego?” przy tworzeniu gry: ?nowosci (najnowsza wersja, niezależnie od tego, co już widziane)
    else if (import.meta.env.DEV && new URLSearchParams(location.search).has('nowosci')) showWhatsNew(app.root, RELEASES.slice(0, 1));

    if (loaded.recovered) app.toast('Nie udało się wczytać zapisu, zaczynamy od nowa.');
    else if (loaded.repaired) app.toast('Część mieszkania nie wczytała się — wróciła do ustawień początkowych.');
    else if (bonus.granted) app.toast(`Codzienny bonus: +${CONFIG.coins.dailyBonus} monet!`);

    const running = app;
    /** Urodziny Gabi: prezent i życzenia — gdy jest już w grze (nie na ekranie powitalnym, nie w minigrze ani w oknie). */
    const birthday = () => {
      if (!store.get().seenBirthday || running.root.querySelector('.game-shell, .overlay, .tip-card')) return;
      const r = claimBirthdayGift(store.get(), Date.now());
      if (!r.granted) return;
      store.update(() => r.state);
      showBirthdayGift(running, Date.now());
    };
    birthday();
    const tick = () => {
      const t = Date.now();
      let granted = false;
      store.update((s) => {
        const r = claimDailyBonus(applyElapsed(s, t), t);
        granted = r.granted;
        return r.state;
      });
      if (granted) running.toast(`Codzienny bonus: +${CONFIG.coins.dailyBonus} monet!`);
      birthday();
    };
    setInterval(tick, 10_000);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        saveState(localStorage, store.get());
        if (pendingUpdate) void updateSW(true);
      } else {
        tick();
      }
    });
  } catch (err) {
    console.error(err);
    // Nowszy zapis zostaje nietknięty: w tej ścieżce nic nie woła saveState.
    showBootError(err instanceof NewerSaveError ? NEWER_SAVE_MESSAGE : undefined);
  }
}

void boot();
