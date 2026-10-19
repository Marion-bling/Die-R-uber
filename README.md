# Lernwebsite „Die Räuber“ (Schiller) – Klasse 11, berufliches Gymnasium BW

Statische Lernwebsite (HTML/CSS/JavaScript) für eine Unterrichtseinheit von sechs Doppelstunden zu Friedrich Schillers „Die Räuber“ mit Vor- und Nachbereitung des Theaterbesuchs am Schauspiel Stuttgart (Regie: Stefan Pucher, mit Texten von Thomas Melle) am 1. Dezember 2026.

Keine Cookies, kein Tracking, keine externen Bibliotheken oder Schriften. Läuft auch offline (Dateien einfach im Browser öffnen).

## Dateistruktur

```
raeuber-website/
├── index.html                  Übersicht, Fahrplan, Lernziele, Hinweise für die Lehrkraft
├── ds1.html                    DS 1 – Einstieg: Theaterzettel, Augenzeugenbericht, digitales Szenenpuzzle, Quiz
├── ds2.html                    DS 2 – Figuren: Gruppenpuzzle mit Textausschnitten, Figurenkonstellation, Franz' Monolog
├── ds3.html                    DS 3 – Dialoganalyse: Methode, Checkliste, Musteranalyse, Placemat
├── ds4.html                    DS 4 – Sturm und Drang: fünf Stationen mit Laufzettel
├── ds5.html                    DS 5 – Aktualität, Inszenierung, Videos, Expertengruppen
├── theaterbesuch.html          Beobachtungsaufträge, Notizbogen nach der Aufführung
├── ds6.html                    DS 6 – Auswertung, taz-Kritik, Meinungslinie, Abschluss
├── glossar.html                Fachbegriffe mit Suche und Filter
├── zusammenfassung.html        Abschluss-Handout (druckbar als A4-PDF)
├── raeuber-zusammenfassung.pdf fertiges PDF der Zusammenfassung (6 Seiten A4)
├── style.css                   gemeinsames Design inkl. Druckansicht
├── script.js                   Interaktionen (Konstellation, Quiz, Zitate, Checkliste, Glossar)
├── theaterzettel-1782.jpeg     Theaterzettel der Uraufführung (DS 1)
├── schiller-portraet.jpeg      Schiller-Porträt von Anton Graff (DS 4)
├── werkzeuge/lk_schutz.py      verschlüsselt/entschlüsselt die Lehrkraft-Teile
├── .nojekyll                   sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert
└── README.md                   diese Anleitung
```

Optional legen Sie einen Ordner `bilder/` an (Theaterzettel 1782, Schiller-Porträt – siehe Platzhalter).

## Veröffentlichung auf GitHub Pages – Schritt für Schritt

1. **Konto anlegen:** Auf <https://github.com> ein kostenloses Konto erstellen (oder anmelden).
2. **Repository erstellen:** Oben rechts auf **+** → **New repository**.
   - Name z. B. `raeuber` (wird Teil der Adresse).
   - Sichtbarkeit **Public** (GitHub Pages ist im kostenlosen Tarif nur für öffentliche Repositorys verfügbar).
   - **Create repository** klicken.
3. **Dateien hochladen:** Im neuen Repository auf **uploading an existing file** (bzw. **Add file → Upload files**) klicken. Alle Dateien aus dem Ordner `raeuber-website` hineinziehen – **wichtig:** die Dateien selbst, nicht den übergeordneten Ordner, damit `index.html` direkt im Hauptverzeichnis liegt. Die versteckte Datei `.nojekyll` ggf. einzeln hochladen (im Datei-Explorer versteckte Dateien einblenden) – sie ist hilfreich, aber nicht zwingend.
4. Unten **Commit changes** klicken.
5. **Pages aktivieren:** Im Repository **Settings → Pages**. Unter *Build and deployment* bei **Source** „Deploy from a branch“ wählen, bei **Branch** `main` und Ordner `/ (root)` auswählen, **Save**.
6. **Warten:** Nach ca. 1–3 Minuten erscheint oben auf der Pages-Seite die Adresse, z. B. `https://IHR-NAME.github.io/raeuber/`. Diese Adresse an die Klasse weitergeben (z. B. als QR-Code).
7. **Änderungen:** Datei im Repository anklicken → Stiftsymbol (Bearbeiten) → ändern → **Commit changes**. Oder geänderte Dateien erneut hochladen (gleicher Name überschreibt). Die Seite aktualisiert sich nach kurzer Zeit.

## Vor dem Einsatz bitte erledigen

Alle Stellen sind auf der Website sichtbar markiert:

- **[S. ?]** – Seitenzahlen der Reclam-Ausgabe der Klasse ergänzen.
- **Textauszüge abgleichen** – Die Schiller-Auszüge (I,1 und I,2) sind nach dem gemeinfreien Original gesetzt. Bitte Wort für Wort mit der Reclam-Ausgabe vergleichen (Orthografie, Gedankenstriche, Regieanweisungen), bevor sie ausgeteilt oder analysiert werden.
- **[PLATZHALTER]** – u. a. Theaterzettel 1782 und Schiller-Porträt (gemeinfreie Abbildungen, z. B. aus Wikimedia Commons, mit Quellenangabe), Besetzung/Premierendatum, Ablauf und Treffpunkt am 1.12., Theaterkritiken, Name der Lehrkraft/Schule im Seitenfuß.
- **[VIDEO-LINK EINFÜGEN]** – in `ds5.html`. Es wurden bewusst keine Links eingesetzt, die nicht geprüft werden konnten. So binden Sie ein YouTube-Video datenschutzfreundlich ein (VIDEO-ID ist der Teil nach `watch?v=`):

  ```html
  <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/VIDEO-ID"
    title="Trailer Die Räuber, Schauspiel Stuttgart" loading="lazy"
    allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
  <p><a href="https://www.youtube.com/watch?v=VIDEO-ID">Video auf YouTube öffnen</a></p>
  ```
  Den Platzhalter-Kasten danach löschen. Hinweis: Auch `youtube-nocookie.com` lädt beim Abspielen Inhalte von Google-Servern.

## Lehrkraft-Ansicht und Lösungen

- Verlaufspläne, Erwartungshorizonte, Lösungen und Hinweise (alle Elemente mit `class="lk"`) sind **verschlüsselt** (AES-256-GCM, Schlüssel per PBKDF2 aus dem Lehrkraft-Codewort). Im Quelltext steht nur verschlüsselter Text in `<script id="lk-daten">`.
- Öffnen: unten auf jeder Seite **„Lehrkraft-Zugang“** antippen und das Codewort eingeben. Die Freischaltung gilt bis zum Schließen des Browsers; der Schalter oben rechts blendet die Lehrkraft-Teile danach ein und aus.
- Das Codewort ist nirgends in diesem Repository gespeichert. Ohne Codewort lassen sich die Lehrkraft-Teile nicht wiederherstellen – Sicherungskopie aufbewahren!
- **Bearbeiten** der Lehrkraft-Teile: `python3 werkzeuge/lk_schutz.py entsperren` (Codewort eingeben), HTML ändern, dann `python3 werkzeuge/lk_schutz.py sperren` und erst danach hochladen. Niemals entsperrte Dateien hochladen.
- Freischalt-Sperre für die Klasse: Die Figurenkonstellation in DS 2 ist gesperrt, bis die Klasse den Code eingibt, den die Lehrkraft nennt. Das Tablet merkt sich die Freischaltung. Mit Lehrkraft-Zugang ist die Konstellation immer offen.
- Beim Drucken werden Lehrkraft-Inhalte nur mitgedruckt, wenn die Lehrkraft-Ansicht eingeschaltet ist.

## Drucken und PDF

- Jede Seite ist druckfreundlich (Strg/Cmd + P): Navigation, Videos und Quizze werden ausgeblendet, Hilfekarten nur gedruckt, wenn sie aufgeklappt sind.
- `zusammenfassung.html` ist als A4-Handout gestaltet. Das fertige PDF liegt als `raeuber-zusammenfassung.pdf` bei. Nach Änderungen an der Zusammenfassung ein neues PDF über den Druckdialog („Als PDF speichern“, A4, Hintergrundgrafiken an) erzeugen und die Datei ersetzen.

## Urheberrecht und Datenschutz

- Schillers Text und Goethes „Prometheus“ sind gemeinfrei.
- Texte von Thomas Melle, Programmheft, Fotos und Trailer des Schauspiels Stuttgart sowie Theaterkritiken sind urheberrechtlich geschützt. Sie sind hier **nicht** abgedruckt. Da GitHub Pages öffentlich ist, solche Auszüge nicht auf der Website einfügen, sondern im Unterricht als Kopie oder auf der geschützten Lernplattform der Schule verwenden.
- Die Website selbst setzt keine Cookies und bindet keine Tracking-Dienste ein. Der Hoster (GitHub) verarbeitet beim Aufruf technisch bedingt Verbindungsdaten (z. B. IP-Adressen). Klären Sie die Nutzung ggf. mit der/dem Datenschutzbeauftragten Ihrer Schule; alternativ lässt sich der Ordner auch über die schulische Lernplattform oder offline (USB-Stick, Netzlaufwerk) bereitstellen.

## Annahmen

- Die Klasse hat das Drama bis DS 2 vollständig gelesen (Leseauftrag vorab).
- DS 6 findet möglichst in derselben Woche wie der Theaterbesuch statt.
- Angaben zur Inszenierung (Dauer ca. 2:30 Std., Pause nach ca. 1:10 Std., ab Klasse 8, englische Übertitel) entsprechen den Veranstaltungsangaben des Theaters, Stand Oktober 2026 – bitte mit der Buchungsbestätigung abgleichen.
