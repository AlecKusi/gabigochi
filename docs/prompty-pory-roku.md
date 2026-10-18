# Prompty: pory roku (tła balkonu i ozdoby sezonowe)

Dwie części:
- **A. Tła balkonu**: 4 obrazki, po jednym na porę roku.
- **B. Arkusz ozdób sezonowych**: 18 klatek dla 13 rzeczy do sklepu.

Gotowe obrazki wrzuć do `assets/source/` (np. `bg-lato.png`, `bg-jesien.png`, `bg-zima.png`, `bg-wiosna.png`,
`sheet-seasonal.png`) albo wyślij w rozmowie.

---

## A. Tła balkonu (4 obrazki)

Co gra rysuje sama, więc **nie ma tego na obrazku**:
- niebo (pora dnia, słońce, księżyc, gwiazdy, chmury, pogoda), dlatego niebo na obrazku jest **jednolicie
  różowo-fioletowe (#FF00FF)** i wycinam je;
- daszek balkonu, balustrada i podłoga, bo podłogę Gabi wybiera w urządzaniu;
- deszcz, śnieg, lecące liście i płatki (animacje w kodzie);
- zapalone okna w nocy (zapalam je w kodzie na oknach z obrazka).

**Kolejność:**
1. Najpierw wygeneruj **lato**. Dołącz `assets/source/sheet-balcony1.jpg` jako wzór stylu.
2. Potem jesień, zimę i wiosnę jako **edycję obrazka letniego**. Dołącz gotowe lato i napisz, że układ ma zostać
   identyczny. Wtedy budynki i drzewo będą w tych samych miejscach we wszystkich porach roku.

### Blok wspólny (wklej na początku każdego z 4 promptów)

```
Pixel art background for a cozy tamagotchi-style mobile game: the view from a 4th-floor balcony of an apartment
block in a Polish city, looking out over the neighbourhood. Same pixel-art style as the attached reference sheet
(soft colours, dark outlines on near objects, limited palette).

Composition (square image, 1:1):
- The SKY must be one flat solid magenta colour (#FF00FF) everywhere above the buildings and around the tree:
  no gradient, no clouds, no sun, no moon, no birds, no stars. The game draws its own sky behind the picture.
- Lower half: a skyline of Polish apartment blocks and a few older tenement houses with pitched roofs, at
  different heights, filling the full width. Small rectangular windows in neat rows, drawn as light grey-blue glass
  (daytime, unlit). Buildings reach the bottom edge of the image. The tallest building tops reach about 55% of the
  image height from the bottom; the top 45% is sky.
- One big tree on the LEFT side, close to the balcony: trunk from the bottom edge, crown roughly between 30% and
  70% of the image height, covering about the left third of the image. Leave the upper-right area completely empty
  sky (the game puts the sun and the moon there).
- Nothing in the foreground: no balcony railing, no balcony floor, no roof edge, no people, no cars, no text,
  no frame, no signature.
- Crisp pixel art on a consistent grid: 128 x 128 art pixels (every art pixel = 8x8 image pixels in a 1024x1024
  image), no anti-aliasing, no blur, no dithering on the sky.
```

### 1. Lato (najpierw)

```
Season: SUMMER. The big tree is full and lush green. Some green treetops between the buildings.
Bright, sunny daytime colours.
```

### 2. Jesień (dołącz obrazek letni)

```
Use the attached summer image: keep exactly the same composition, the same buildings, windows and the same
tree shape and position, and the same flat magenta sky. Change only the season.
Season: AUTUMN. The big tree's crown is golden-orange and red, a little thinner, with a few branches showing.
The small trees between the buildings are orange and yellow. A few fallen leaves on the roofs.
```

### 3. Zima (dołącz obrazek letni)

```
Use the attached summer image: keep exactly the same composition, the same buildings, windows and the same
tree position, and the same flat magenta sky. Change only the season.
Season: WINTER. The big tree is bare: brown branches without leaves, with white snow lying on top of the branches.
Thick white snow on every roof, ledge and windowsill; small icicles under some roof edges. The small trees between
the buildings are bare and snowy.
```

### 4. Wiosna (dołącz obrazek letni)

```
Use the attached summer image: keep exactly the same composition, the same buildings, windows and the same
tree shape and position, and the same flat magenta sky. Change only the season.
Season: SPRING. The big tree is covered in pale pink blossoms with a few fresh light-green leaves.
The small trees between the buildings are fresh light green.
```

---

## B. Arkusz ozdób sezonowych (1 obrazek)

Dołącz `assets/source/sheet-balcony1.jpg` jako wzór układu i stylu. Klatki ze świeceniem i kręceniem
(dynia, choinka, wiatrak) muszą mieć **ten sam rozmiar i położenie** co wersja podstawowa, bo zmienia się
tylko świecenie albo śmigło.

```
Pixel art item sheet for a cozy tamagotchi-style mobile game, same art style, scale, layout and lettering as the
attached reference sheet. Flat plain light-grey background (#cfd2d7), no gradient, no shadows on the background.
Each item drawn completely and separately, with clear empty space around it, in the same three-quarter front view
as the reference; the Polish name written small under each item, never touching the drawing. Crisp pixel art,
limited palette, dark outlines, no anti-aliasing, no blur. Section titles in Polish (English), like the reference.
Sizes relative to each other like real objects next to the reference furniture: the Christmas tree as tall as
a person, the pumpkin knee-high, the fan chest-high, the paddling pool wide and low.

Sheet title: "OZDOBY SEZONOWE (SEASONAL DECOR)".

Section "JESIEŃ (AUTUMN)":
1. "DYNIA" — a carved orange pumpkin with a cute smiling face, unlit (dark face holes).
2. "DYNIA ŚWIECI" — exactly the same pumpkin, same size and position, lit from inside: warm yellow candle glow in
   the eyes and mouth.
3. "KOSZ JABŁEK" — a wicker basket full of red apples with a few shiny brown chestnuts.
4. "GIRLANDA Z LIŚCI" — a wall garland: a string with colourful autumn leaves (orange, red, yellow) hanging in
   a gentle curve.

Section "ZIMA (WINTER)":
5. "CHOINKA" — a Christmas tree in a pot, with colourful baubles and a gold star on top, string lights off.
6. "CHOINKA A" and 7. "CHOINKA B" — exactly the same tree, same size and position, with the string lights glowing:
   in A every other bulb is bright, in B the other bulbs are bright (two frames of a twinkling loop).
8. "BAŁWANEK" — a small cute snowman with a carrot nose, a red scarf and a bucket hat, on a little pile of snow.
9. "GWIAZDA BETLEJEMSKA" — a red poinsettia in a pot.

Section "WIOSNA (SPRING)":
10. "BAZIE" — pussy willow branches with fluffy grey catkins in a glass vase.
11. "PISANKI" — a small wicker basket with colourful painted Easter eggs on green grass.
12. "BUDKA DLA PTAKÓW" — a wooden birdhouse with a small roof and a round entrance hole, on a short wooden post.

Section "LATO (SUMMER)":
13. "WIATRAK" — a standing electric fan with a round grille, blades still.
14. "WIATRAK 2" and 15. "WIATRAK 3" — exactly the same fan, same size and position, blades rotated by one third
    and two thirds of a turn (frames of a spinning loop).
16. "BASENIK" — a small round inflatable kids' paddling pool with blue water, seen from the front and slightly above.
17. "FLAMING" — an inflatable pink flamingo float.
18. "ARBUZ" — a plate with watermelon slices.
```
