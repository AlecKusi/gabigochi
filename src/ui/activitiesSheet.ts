import { ACTIVITIES, ACTIVITY_IDS, type ActivityId } from '../pet/activities';
import { spriteUrl } from '../sprites/loader';
import { h } from './dom';

/** Stan karty zajęcia: wyszarzona (bez potrzebnego mebla w mieszkaniu) i/lub z podpisem (np. „Tylko w salonie”). */
export interface ActivityCardState {
  enabled: boolean;
  hint: string | null;
}

/**
 * Wysuwany panel „Zajęcia”: stuknięcie w dostępną kartę zaczyna zajęcie (pokój decyduje, czy od razu, czy po
 * przejściu do mebla / innego pokoju). Zwraca funkcję zamykającą.
 */
export function openActivities(
  host: HTMLElement,
  stateOf: (id: ActivityId) => ActivityCardState,
  onPick: (id: ActivityId) => void,
  frameUrl: (name: string) => string = spriteUrl,
): () => void {
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    sheet.classList.add('out');
    setTimeout(() => backdrop.remove(), 220);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  const card = (id: ActivityId) => {
    const def = ACTIVITIES[id];
    const st = stateOf(id);
    return h(
      'button',
      {
        class: `activity-card${st.enabled ? '' : ' off'}`,
        'aria-disabled': st.enabled ? 'false' : 'true',
        onclick: () => {
          if (!st.enabled) return;
          close();
          onPick(id);
        },
      },
      h('img', { class: 'px', src: frameUrl(def.frames[0]), alt: '', draggable: 'false' }),
      h('span', {}, def.name),
      st.hint ? h('small', { class: 'activity-hint' }, st.hint) : null,
    );
  };

  const cards = ACTIVITY_IDS.map(card);
  const sheet = h(
    'div',
    { class: 'sheet px-box', role: 'dialog', 'aria-label': 'Zajęcia' },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, 'Zajęcia'),
      h('button', { class: 'px-btn secondary', onclick: close, 'aria-label': 'Zamknij' }, 'X'),
    ),
    h('p', { class: 'hint' }, 'Czym ma się zająć Gabi?'),
    h('div', { class: 'activity-cards' }, ...cards),
  );
  const backdrop = h('div', { class: 'sheet-backdrop' }, sheet);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  host.append(backdrop);
  return close;
}
