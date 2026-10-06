import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import './styles/theme.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/games.css';
import { registerSW } from 'virtual:pwa-register';
import { createApp, type ScreenFactory, type ScreenName } from './app';
import { CONFIG } from './core/config';
import { claimDailyBonus } from './core/economy';
import { applyElapsed } from './core/needs';
import { loadState, saveState } from './core/save';
import { Store } from './core/store';
import { ANIMATIONS, allFrameNames } from './sprites/animations';
import framesMeta from './sprites/frames.generated.json';
import { loadSprites } from './sprites/loader';
import { mountInstall } from './ui/install';
import { birthdayScreen } from './ui/screens/birthday';
import { gamesScreen } from './ui/screens/games';
import { profileScreen } from './ui/screens/profile';
import { roomScreen } from './ui/screens/room';
import { shopScreen } from './ui/screens/shop';
import { wardrobeScreen } from './ui/screens/wardrobe';

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

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  const browserAllowed = import.meta.env.DEV || new URLSearchParams(location.search).has('play');
  if (!isStandalone() && !browserAllowed) {
    mountInstall(root);
    return;
  }
  void navigator.storage?.persist?.();

  const now = Date.now();
  const loaded = loadState(localStorage, now);
  const bonus = claimDailyBonus(applyElapsed(loaded.state, now), now);
  const store = new Store(bonus.state, localStorage);
  saveState(localStorage, bonus.state);

  const names = new Set([...allFrameNames(ANIMATIONS), ...framesMeta.body, ...Object.keys(framesMeta.portraits)]);
  const sprites = await loadSprites([...names]);
  const app = createApp(root, store, sprites, SCREENS);
  await app.go(store.get().seenBirthday ? 'room' : 'birthday');

  if (loaded.recovered) app.toast('Nie udało się wczytać zapisu, zaczynamy od nowa.');
  else if (bonus.granted) app.toast(`Codzienny bonus: +${CONFIG.coins.dailyBonus} monet!`);

  const tick = () => {
    const t = Date.now();
    let granted = false;
    store.update((s) => {
      const r = claimDailyBonus(applyElapsed(s, t), t);
      granted = r.granted;
      return r.state;
    });
    if (granted) app.toast(`Codzienny bonus: +${CONFIG.coins.dailyBonus} monet!`);
  };
  setInterval(tick, 10_000);

  let pendingUpdate = false;
  const updateSW = registerSW({
    onNeedRefresh() {
      pendingUpdate = true;
      app.toast('Jest nowa wersja! Uruchom aplikację ponownie.');
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveState(localStorage, store.get());
      if (pendingUpdate) void updateSW(true);
    } else {
      tick();
    }
  });
}

void boot();
