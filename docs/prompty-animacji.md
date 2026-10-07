# Prompty do brakujących animacji Gabi

Każdy prompt daje jeden arkusz w stylu dotychczasowych: jasnoszare tło, tytuł EN / PL, ponumerowane klatki,
w rogu portret. **Do każdego promptu dołącz jako obraz referencyjny** `assets/source/sprite-sheet.jpg`
(oryginalna postać) i najlepiej `assets/source/sheet-hobby.jpg` (wzór układu arkusza) — wtedy Gabi wyjdzie
taka sama jak w grze.

Na początek każdego promptu wklej **blok wspólny** (postać + zasady techniczne), a pod nim część z danym arkuszem.
Kolejność = moim zdaniem od najbardziej przydatnych.

Zasady, na których zależy wycinaniu (są już w bloku wspólnym, tu tylko wyjaśnienie):
- **Strój domyślny** (czarna koszulka z nadrukiem + ciemne dżinsy) — wtedy Szafa sama przebiera Gabi na nowych
  klatkach; inny strój = te klatki zostaną bez ubrań z Szafy.
- **Całe rekwizyty, bez ucinania** (nauka 2–5 i łóżko pacjenta były ucięte — dlatego trafiły do okienka).
- **Siedzenie na małym brązowym stołeczku** — umiem go wymazać i posadzić Gabi na dowolnym meblu z pokoju
  (tak zrobiłem z szydełkowaniem). Leżenie — na niskiej brązowej ławce (też do wymazania).
- Gabi tej samej wielkości co w arkuszu hobby, stopy na wspólnej linii w obrębie rzędu, odstępy między klatkami,
  bez cieni pod postacią (albo bardzo delikatny), bez toreb.

---

## Blok wspólny (wklej na początku każdego promptu)

```
Pixel art sprite sheet for a cozy tamagotchi-style mobile game, same art style, scale and layout as the attached
reference sheets. Character: Gabriela ("Gabi"), a young woman with a chin-length silver-lavender bob haircut with
straight bangs and soft purple tips, large round thin-rimmed glasses, light skin with pink cheeks. She ALWAYS wears
her default outfit: black oversized short-sleeve t-shirt with a small grey-and-red graphic print on the chest,
dark blue-grey slim jeans, dark sneakers with white soles. No bag, no hat, no jewelry.

Technical rules:
- Flat plain light-grey background (#cfd2d7), no gradient, no texture, no vignette, no floor, no drop shadows.
- Crisp pixel art on a consistent pixel grid: every art pixel = 4x4 image pixels, dark outline around the character,
  limited palette, no anti-aliasing, no blur.
- Full body always visible including shoes; the character is the same height as in the reference sheet
  (about 60 art pixels tall when standing). Frames of one row share the same ground line.
- Each frame is a separate pose with clear empty space (at least 6 art pixels) around it; nothing overlaps;
  frame number ("1.", "2.", ...) written small below-left of each frame, never touching the drawing.
- Props are drawn completely (never cropped at the frame edge).
- Section titles in English / Polish in the same pixel font as the reference, e.g. "SITTING / SIEDZENIE".
- A small portrait of Gabi in a pixel frame in the top-right corner, like in the reference.
- Consecutive frames of a loop must keep the same size and position, only the moving parts change.
```

---

## 1. Siedzenie i relaks na meblu (kanapa, fotel, krzesło)

Po co: dziś Gabi na każdym meblu tylko szydełkuje. Z tym arkuszem usiądzie zwyczajnie, z telefonem, z herbatą,
a krzesła przy stole i hoker dostaną „swoje” animacje.

```
Sheet title: "SITTING & RELAXING / SIEDZENIE I RELAKS".
All poses: Gabi sits on a small, plain dark-brown wooden stool (simple round seat, three short legs),
front / three-quarter view like the crocheting frames in the reference. The stool must be clearly visible and
separate from her legs.
Row 1 "SITTING IDLE / ODPOCZYNEK" (loop): 1. sitting relaxed, hands on knees, looking at the viewer;
2. same pose, slight breathing (shoulders 1 pixel lower), eyes closed in a smile;
3. leaning back a bit, arms stretched up in a lazy stretch; 4. resting chin on hand, daydreaming.
Row 2 "SITTING WITH PHONE / TELEFON NA SIEDZĄCO" (loop): 1. holding phone with both hands, looking at it;
2. thumbs typing, small sparkle on screen; 3. laughing at the phone; 4. showing the phone screen to the viewer.
Row 3 "TEA TIME / HERBATKA" (loop): 1. holding a white mug with both hands, steam above;
2. sipping from the mug, eyes closed; 3. lowering the mug, happy blush; 4. holding a small cookie and the mug.
```

## 2. Widok od tyłu (okno, telewizor, granie na konsoli)

Po co: Gabi mogłaby naprawdę patrzeć przez okno i oglądać telewizję / grać na konsoli siedząc przed TV.

```
Sheet title: "BACK VIEW / WIDOK OD TYŁU". Gabi seen from behind (we see the back of her lavender bob,
back of the black t-shirt, back of jeans and sneakers).
Row 1 "LOOKING OUT THE WINDOW / PRZY OKNIE" (no window drawn, only Gabi): 1. standing back view, arms relaxed;
2. standing back view, one hand raised and touching an invisible glass at head height;
3. standing back view, waving with one hand above her head; 4. standing back view, both hands on hips.
Row 2 "WATCHING TV / OGLĄDANIE TV" (loop): Gabi sits on the same small dark-brown wooden stool, back view:
1. sitting still, head slightly tilted; 2. same, head tilted the other way; 3. laughing (shoulders up);
4. hugging a small purple cushion on her lap.
Row 3 "PLAYING CONSOLE / GRANIE NA KONSOLI" (loop): sitting on the same stool, back view, holding a game
controller with both hands: 1. neutral; 2. leaning left; 3. leaning right; 4. both arms up celebrating.
```

## 3. Leżenie (drzemka na kanapie, czytanie, telefon na leżąco)

Po co: drzemka na kanapie używa dziś klatki „przysypiania na podłodze”; tu Gabi położy się na całej kanapie.

```
Sheet title: "LYING DOWN / LEŻENIE". All poses: side view, Gabi lies horizontally on a long, low, plain
dark-brown wooden bench (simple flat top, two short legs), head on the left, feet on the right.
The bench must be clearly visible under her, nothing else.
Row 1 "NAP / DRZEMKA" (loop): 1. lying on her back, eyes closed, hands on stomach, small "z" bubble;
2. same pose, breathing (chest 1 pixel higher), bigger "Z" bubble; 3. turned on her side facing the viewer,
hands under cheek, sleeping; 4. waking up: propped on one elbow, yawning.
Row 2 "READING ON THE SOFA / CZYTANIE NA LEŻĄCO" (loop): lying on her stomach, legs bent up in the air,
holding an open manga book: 1. reading; 2. turning a page; 3. laughing at the book; 4. legs swinging, other angle.
Row 3 "PHONE ON THE SOFA / TELEFON NA LEŻĄCO" (loop): lying on her back holding the phone above her face:
1. scrolling; 2. smiling; 3. phone slipping, surprised face; 4. phone resting on her chest, relaxed.
```

## 4. Przy stole (jedzenie i picie na siedząco)

Po co: przy stole i stolikach Gabi dziś stoi obok; z tym arkuszem usiądzie i zje / wypije.

```
Sheet title: "AT THE TABLE / PRZY STOLE". All poses: Gabi sits on the same small dark-brown wooden stool,
front / three-quarter view, NO table drawn (she will be placed behind a table in the game), arms at table height.
Row 1 "COFFEE / KAWA" (loop): 1. both hands around a white mug at chest height, steam;
2. sipping; 3. putting the mug down (mug at table height, hands on it); 4. sighing happily, eyes closed.
Row 2 "EATING CAKE / CIASTO" (loop): 1. holding a fork with a piece of pink cake; 2. eating, cheeks full;
3. happy, hearts above head; 4. pointing the fork at the viewer, offering a bite.
Row 3 "EATING KITKAT / KITKAT" (loop): 1. unwrapping a red KitKat bar; 2. breaking off a piece;
3. biting, eyes closed in joy; 4. holding the bar up proudly, sparkle.
```

## 5. Podlewanie i opieka nad roślinami

Po co: przy podlewaniu Gabi dziś stoi bez ruchu, a krople rysuje gra.

```
Sheet title: "PLANT CARE / OPIEKA NAD ROŚLINAMI". Standing poses, three-quarter view facing right
(the plant would be on the right, do NOT draw the plant).
Row 1 "WATERING / PODLEWANIE" (loop): Gabi holds a small light-blue watering can:
1. holding the can at chest height; 2. tilting it, a thin stream of water; 3. tilting more, drops falling;
4. lifting the can back up, smiling.
Row 2 "CARE / PIELĘGNACJA": 1. leaning forward, smelling (eyes closed); 2. spraying with a small green mister;
3. crouching, touching soil with one finger; 4. standing, thumbs up, small sparkle.
```

## 6. Szafa: obrót i pozowanie (podgląd strojów)

Po co: w Szafie Gabi mogłaby się obracać i pozować w nowych ubraniach (Szafa przemaluje je sama).

```
Sheet title: "TURNAROUND & POSES / OBRÓT I POZY". Standing, full body, same height in every frame.
Row 1 "TURNAROUND / OBRÓT" (character rotation, arms relaxed at sides): 1. front; 2. three-quarter left;
3. side left (profile); 4. back; 5. three-quarter right.
Row 2 "POSES / POZY": 1. "ta-da" pose, one arm up, one hand on hip, wink; 2. twirling, hair and t-shirt
flaring, small motion lines; 3. looking down at her own clothes, hands slightly lifting the t-shirt hem;
4. peace sign, smiling; 5. curtsy, one leg behind the other.
```

## 7. Kotek (głaskanie, przytulanie)

Po co: Gabi ma czarnego kota (śpi z nią w łóżku), a w sklepie są legowiska i figurki kotów.

```
Sheet title: "CAT TIME / CZAS Z KOTKIEM". The cat: small black cat with yellow eyes, same as in the reference
bed sheet. Gabi front / three-quarter view.
Row 1 "PETTING / GŁASKANIE": 1. crouching, petting the cat sitting next to her; 2. same, cat pushing its
head into her hand, little heart; 3. kneeling, cat rubbing against her leg; 4. giving the cat a treat.
Row 2 "HUG / PRZYTULANIE" (standing): 1. holding the cat in her arms; 2. hugging it, cheek to cheek, eyes closed;
3. lifting the cat up in front of her face; 4. cat on her shoulder, both happy.
Row 3 "CAT ALONE / SAM KOTEK" (cat only, no Gabi): 1. sitting; 2. walking; 3. sleeping curled up; 4. stretching.
```

## 8. Codzienne miny i gesty (więcej życia na co dzień)

Po co: dodatkowe krótkie reakcje — przeciąganie po pobudce, ziewanie, myślenie, nieśmiałość, śmiech.

```
Sheet title: "EVERYDAY EXPRESSIONS / CODZIENNE MINY". Standing, front view, full body.
Row 1: 1. "YAWN / ZIEWANIE" hand over open mouth, eyes closed; 2. "STRETCH / PRZECIĄGANIE" both arms up;
3. "THINKING / MYŚLENIE" finger on chin, small "?" above; 4. "IDEA / POMYSŁ" finger up, light bulb above.
Row 2: 1. "SHY / NIEŚMIAŁOŚĆ" hands together, blush, looking down; 2. "LAUGHING / ŚMIECH" eyes closed,
hand on stomach; 3. "LOVE / ZAKOCHANA" hands on cheeks, heart eyes, hearts above;
4. "BORED / NUDA" slouching, arms hanging, sigh cloud.
Row 3 "DANCE / TANIEC" (loop, no headphones): 1. arms up left; 2. arms up right; 3. spin, motion lines;
4. jump with both arms up.
```

## 9. Urodziny (na ekran urodzinowy i do 26. urodzin)

```
Sheet title: "BIRTHDAY / URODZINY". Standing, front view.
Row 1: 1. holding a birthday cake with a "26" candle, smiling; 2. blowing out the candle, cheeks puffed;
3. confetti falling, both arms up cheering; 4. holding a wrapped present with a purple bow;
5. opening the present, sparkles coming out.
Row 2: 1. wearing a purple party hat, blowing a party horn; 2. holding three balloons (purple, pink, yellow);
3. hugging a big teddy bear; 4. bowing "thank you", hearts around.
```

---

### Po wygenerowaniu

Wrzuć mi arkusze (jak dotąd). Wytnę klatki, dołożę maski strojów i podepnę je w grze, np.:
siedzenie/herbata/telefon → kanapy, fotele, krzesła; widok od tyłu → okna i TV; leżenie → drzemka i czytanie na
kanapie; przy stole → stoły; podlewanie → rośliny; obrót → podgląd w Szafie; kotek → legowiska i figurki;
miny → codzienne reakcje Gabi; urodziny → ekran urodzinowy.

Jeśli generator nie trzyma stroju albo wielkości postaci, lepiej zrobić mniej klatek w arkuszu (np. jeden rząd)
niż jeden duży arkusz z niespójną Gabi.
