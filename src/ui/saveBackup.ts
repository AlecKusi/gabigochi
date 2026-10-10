import type { App } from '../app';
import { BACKUP_KEY, SAVE_KEY } from '../core/save';
import { backupFileName, exportSave, importSave } from '../core/saveTransfer';
import { confirmDialog } from './dialog';
import { h } from './dom';

/**
 * Zapisuje kopię postępu do pliku: na telefonie przez menu udostępniania (Pliki, wiadomość do siebie),
 * na komputerze — do pobranych.
 */
export async function saveBackup(app: App): Promise<void> {
  const now = Date.now();
  const name = backupFileName(now);
  const file = new File([exportSave(app.store.get(), now)], name, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Kopia Gabigochi' });
      app.toast('Kopia gotowa!');
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // udostępnianie nie wyszło — zostaje pobranie pliku
    }
  }
  const url = URL.createObjectURL(file);
  h('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  app.toast('Kopia zapisana w pobranych plikach.');
}

/** Wczytuje kopię z pliku po potwierdzeniu; obecny zapis trafia do kopii awaryjnej, gra uruchamia się od nowa. */
export async function restoreBackup(app: App, file: File): Promise<void> {
  const r = importSave(await file.text(), Date.now());
  if (!r.ok) {
    app.toast(r.reason === 'newer' ? 'Ta kopia jest z nowszej wersji gry — najpierw zaktualizuj aplikację.' : 'To nie jest kopia zapisu Gabigochi.');
    return;
  }
  const when = r.exportedAt ? ` z ${new Date(r.exportedAt).toLocaleDateString('pl-PL')}` : '';
  const ok = await confirmDialog(app.root, `Wczytać kopię${when}? Obecny postęp zostanie zastąpiony.`, 'Wczytaj', 'Anuluj');
  if (!ok) return;
  try {
    const current = localStorage.getItem(SAVE_KEY);
    if (current !== null) localStorage.setItem(BACKUP_KEY, current);
  } catch {
    // bez kopii awaryjnej — gracz i tak potwierdził
  }
  app.store.update(() => r.state);
  app.toast('Kopia wczytana!');
  setTimeout(() => location.reload(), 900);
}

/** Karta w Profilu: zapis kopii i wczytanie z pliku. */
export function backupCard(app: App): HTMLElement {
  const input = h('input', { type: 'file', accept: '.json,application/json', class: 'backup-file', 'aria-hidden': 'true', tabindex: '-1' });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) void restoreBackup(app, file);
  });
  return h(
    'section',
    { class: 'backup-card px-box' },
    h('h2', {}, 'Kopia zapisu'),
    h('p', {}, 'Zachowaj postęp w pliku — przyda się przy zmianie telefonu albo po usunięciu aplikacji.'),
    h(
      'div',
      { class: 'backup-actions' },
      h('button', { class: 'px-btn', onclick: () => void saveBackup(app) }, 'Zapisz kopię'),
      h('button', { class: 'px-btn secondary', onclick: () => input.click() }, 'Wczytaj kopię'),
    ),
    input,
  );
}
