/* ==========================================================================
   Die Räuber – Lernwebsite | gemeinsames Script (reines JavaScript)
   - keine Cookies, kein Tracking, keine externen Bibliotheken
   - Lehrkraft-Inhalte sind verschlüsselt und werden erst mit dem
     Lehrkraft-Codewort im Browser entschlüsselt (siehe werkzeuge/lk_schutz.py)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Hilfsfunktionen ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function speicher(key, wert) {
    try {
      if (wert === undefined) return window.sessionStorage.getItem(key);
      window.sessionStorage.setItem(key, wert);
    } catch (e) { return null; }
  }

  /* ---------- Mobile Navigation ---------- */
  var navBtn = $(".nav-toggle");
  var nav = $(".main-nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", function () {
      var offen = nav.classList.toggle("offen");
      navBtn.setAttribute("aria-expanded", offen ? "true" : "false");
    });
  }

  /* ---------- Lehrkraft-Ansicht (verschlüsselt) ----------
     Die Lehrkraft-Inhalte stehen verschlüsselt in <script id="lk-daten">.
     Mit dem Codewort wird ein Schlüssel abgeleitet (PBKDF2-SHA256, 250 000 Runden),
     damit werden die Inhalte entschlüsselt (AES-256-GCM) und eingesetzt.
     Der Schlüssel (nicht das Codewort) bleibt nur bis zum Schließen des Browsers
     in sessionStorage auf diesem Gerät. */
  var LK_SALT = "raeuber-lernwebsite-lk-v1", LK_ITER = 250000, LK_KEY = "raeuber-lk-schluessel";
  var lkBtn = $(".lk-toggle");
  var lkOffen = false;
  function b64zuBytes(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function bytesZuB64(buf) { var u = new Uint8Array(buf), s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function kryptoDa() { return !!(window.crypto && window.crypto.subtle && window.TextEncoder); }
  function leiteSchluesselAb(code) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveBits"]).then(function (basis) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(LK_SALT), iterations: LK_ITER, hash: "SHA-256" }, basis, 256);
    });
  }
  function entschluessele(rohSchluessel) {
    var datenEl = document.getElementById("lk-daten");
    if (!datenEl) return Promise.resolve(null); // Seite ohne Lehrkraft-Inhalte
    var d = JSON.parse(datenEl.textContent);
    return crypto.subtle.importKey("raw", rohSchluessel, "AES-GCM", false, ["decrypt"]).then(function (k) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64zuBytes(d.iv) }, k, b64zuBytes(d.ct));
    }).then(function (klar) { return JSON.parse(new TextDecoder().decode(klar)); });
  }
  function setzeLK(an) {
    document.body.classList.toggle("lk-an", an);
    if (lkBtn) {
      lkBtn.setAttribute("aria-pressed", an ? "true" : "false");
      lkBtn.textContent = an ? "Lehrkraft-Ansicht: an" : "Lehrkraft-Ansicht: aus";
    }
    speicher("raeuber-lk", an ? "1" : "0");
  }
  function lkFreigeben(teile, ansichtAn) {
    if (teile) {
      $$(".lk-platz").forEach(function (platz) {
        var n = Number(platz.getAttribute("data-n"));
        var tmp = document.createElement("template");
        tmp.innerHTML = teile[n];
        platz.replaceWith(tmp.content);
      });
    }
    lkOffen = true;
    document.body.classList.add("lk-entsperrt");
    if (lkBtn) lkBtn.hidden = false;
    var login = $(".lk-login"); if (login) login.textContent = "Lehrkraft-Zugang abmelden";
    setzeLK(ansichtAn);
    document.dispatchEvent(new CustomEvent("lk-entsperrt"));
  }
  function lkAbmelden() {
    try { window.sessionStorage.removeItem(LK_KEY); } catch (e) {}
    speicher("raeuber-lk", "0");
    location.reload();
  }
  function lkMitSchluessel(roh, ansichtAn) {
    return entschluessele(roh).then(function (teile) { lkFreigeben(teile, ansichtAn); return true; });
  }
  if (lkBtn) {
    lkBtn.addEventListener("click", function () { setzeLK(!document.body.classList.contains("lk-an")); });
  }
  // gespeicherter Schlüssel aus dieser Browsersitzung?
  (function () {
    var gespeichert = speicherHole(LK_KEY);
    if (gespeichert && kryptoDa()) {
      lkMitSchluessel(b64zuBytes(gespeichert), speicher("raeuber-lk") !== "0").catch(function () {
        try { window.sessionStorage.removeItem(LK_KEY); } catch (e) {}
      });
    }
  })();
  function speicherHole(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }

  // Anmeldedialog
  var loginBtn = $(".lk-login");
  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      if (lkOffen) { lkAbmelden(); return; }
      var dlg = el("div", { "class": "lk-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "lk-dialog-titel" });
      dlg.innerHTML =
        '<form class="lk-dialog-box">' +
          '<h2 id="lk-dialog-titel">Lehrkraft-Zugang</h2>' +
          '<label for="lk-code">Codewort</label>' +
          '<input id="lk-code" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false">' +
          '<p class="lk-dialog-meldung" aria-live="polite"></p>' +
          '<div class="lk-dialog-knoepfe"><button type="submit" class="btn">Öffnen</button>' +
          '<button type="button" class="btn sekundaer lk-abbrechen">Abbrechen</button></div>' +
        "</form>";
      document.body.appendChild(dlg);
      var input = $("#lk-code", dlg), meldung = $(".lk-dialog-meldung", dlg);
      input.focus();
      function zu() { dlg.remove(); loginBtn.focus(); }
      $(".lk-abbrechen", dlg).addEventListener("click", zu);
      dlg.addEventListener("keydown", function (e) { if (e.key === "Escape") zu(); });
      $("form", dlg).addEventListener("submit", function (e) {
        e.preventDefault();
        if (!kryptoDa()) { meldung.textContent = "Dieser Browser unterstützt die Entschlüsselung nicht."; return; }
        meldung.textContent = "Wird geprüft …";
        leiteSchluesselAb(input.value.trim()).then(function (roh) {
          return lkMitSchluessel(roh, true).then(function () {
            try { window.sessionStorage.setItem(LK_KEY, bytesZuB64(roh)); } catch (e2) {}
            zu();
          });
        }).catch(function () {
          meldung.textContent = "Das Codewort stimmt nicht.";
          input.select();
        });
      });
    });
  }

  /* ---------- Freischalt-Sperren für die Klasse (z. B. Figurenkonstellation) ---------- */
  var SPERR_CODES = { konstellation: "4557949a7a5d2241394469ec627f5390c4bcdb757ace24ca0a33a1600ac6249f" }; // SHA-256 des Codes (klein geschrieben)
  function sha256hex(text) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }
  $$(".sperre").forEach(function (box) {
    var name = box.getAttribute("data-sperre"), schluessel = "raeuber-frei-" + name;
    var schloss = $(".sperre-schloss", box), inhalt = $(".sperre-inhalt", box);
    function frei(dauerhaft) {
      schloss.hidden = true; inhalt.hidden = false;
      if (dauerhaft) { try { window.localStorage.setItem(schluessel, "1"); } catch (e) {} }
    }
    var schonFrei = false;
    try { schonFrei = window.localStorage.getItem(schluessel) === "1"; } catch (e) {}
    if (schonFrei) { frei(false); }
    else { schloss.hidden = false; inhalt.hidden = true; }
    document.addEventListener("lk-entsperrt", function () { frei(false); });
    $(".sperre-form", box).addEventListener("submit", function (e) {
      e.preventDefault();
      var wert = $("input", box).value.trim().toLowerCase(), meld = $(".sperre-meldung", box);
      if (!kryptoDa()) { meld.textContent = "Dieser Browser kann den Code nicht prüfen."; return; }
      sha256hex(wert).then(function (h) {
        if (h === SPERR_CODES[name]) { frei(true); }
        else { meld.textContent = "Der Code stimmt nicht. Fragt eure Lehrkraft."; }
      });
    });
  });

  /* ---------- Druckknöpfe (auch für nachträglich eingesetzte Lehrkraft-Knöpfe) ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-drucken]") : null;
    if (!b) return;
    var modus = b.getAttribute("data-drucken");
    var war = document.body.classList.contains("lk-an");
    if (modus === "mit-loesungen") document.body.classList.add("lk-an");
    else document.body.classList.remove("lk-an");
    window.print();
    document.body.classList.toggle("lk-an", war);
  });

  /* ======================================================================
     1) FIGURENKONSTELLATION
     ====================================================================== */
  var FIGUREN = {
    vater: {
      name: "Maximilian, der alte Moor",
      kurz: "Regierender Graf von Moor, Vater von Karl und Franz. Liebevoll, aber schwach und leichtgläubig; verstößt Karl auf Franz' Drängen und bereut es sofort.",
      bez: ["Vater von Karl (Lieblingssohn) und Franz", "Pflegevater/Schwiegervater in spe von Amalia", "wird von Franz getäuscht, für tot erklärt und im Turm eingekerkert", "wird von Hermann heimlich versorgt"],
      zitat: "„Die Sünden seiner Väter werden heimgesucht im dritten und vierten Glied“",
      stelle: "I,1"
    },
    karl: {
      name: "Karl Moor",
      kurz: "Älterer Sohn, Student in Leipzig, idealistisch, leidenschaftlich, gefühlsstark. Nach der (gefälschten) Verstoßung wird er Hauptmann einer Räuberbande und will Unrecht durch Gewalt rächen – bis er erkennt, dass er selbst schuldig geworden ist.",
      bez: ["Sohn des alten Moor, Bruder von Franz", "liebt Amalia und wird von ihr geliebt", "Hauptmann der Räuberbande, durch Schwur an sie gebunden", "Gegenspieler Spiegelbergs; Vorbild für Kosinsky; Schweizer ist ihm treu ergeben"],
      zitat: "„Das Gesetz hat zum Schneckengang verdorben, was Adlerflug geworden wäre.“",
      stelle: "I,2"
    },
    franz: {
      name: "Franz Moor",
      kurz: "Jüngerer Sohn, fühlt sich von der Natur und vom Vater benachteiligt. Kalter Rationalist und Materialist, der Moral und Gewissen für Erfindungen der Schwachen hält. Er manipuliert durch Briefe, Lügen und falsche Boten, um Erbe und Amalia zu gewinnen.",
      bez: ["fälscht die Nachricht über Karl und den Antwortbrief des Vaters", "begehrt Amalia, die ihn verachtet", "nutzt Hermann als Werkzeug und betrügt ihn", "kerkert den Vater im Turm ein"],
      zitat: "„Recht ist bei dem Überwältiger, und die Schranken unserer Kraft sind unsere Gesetze.“",
      stelle: "I,1"
    },
    amalia: {
      name: "Amalia von Edelreich",
      kurz: "Nichte des alten Moor und Verlobte Karls. Treu, empfindsam und standhaft; sie durchschaut Franz und wehrt sich gegen ihn. Am Ende will sie lieber sterben als ohne Karl leben.",
      bez: ["liebt Karl, bleibt ihm treu", "verachtet Franz und weist ihn ab (I,3)", "kümmert sich um den alten Moor", "wird am Ende von Karl getötet (V,2)"],
      zitat: "„Willst dich, Hektor, ewig mir entreißen“ (Lied)",
      stelle: "II,2"
    },
    spiegelberg: {
      name: "Moritz Spiegelberg",
      kurz: "Karls Studienfreund, Ideengeber der Räuberbande. Ehrgeizig, zynisch, prahlerisch und feige; ihm geht es um Ruhm und Beute, nicht um Gerechtigkeit. Er will selbst Hauptmann sein.",
      bez: ["schlägt die Gründung der Bande vor (I,2)", "Rivale Karls um die Führung", "plant Karls Ermordung und wird dabei von Schweizer getötet (IV,5)"],
      zitat: "„Den Josephus mußt du lesen.“",
      stelle: "I,2"
    },
    schweizer: {
      name: "Schweizer",
      kurz: "Räuber, Karl bedingungslos ergeben – die treueste Figur der Bande. Er verkörpert Kameradschaft und Loyalität.",
      bez: ["bringt dem erschöpften Karl Wasser in seinem Hut (III,2)", "tötet Spiegelberg, um Karl zu schützen (IV,5)", "soll Franz lebend bringen; scheitert und tötet sich selbst (V,1)"],
      zitat: "Schlüsselszene: III,2 (Wasser im Hut für den Hauptmann)",
      stelle: "III,2"
    },
    roller: {
      name: "Roller",
      kurz: "Räuber, gehört zum Kern der Bande. Wird gefangen und soll gehängt werden; Karl befreit ihn mit einem Brandanschlag auf die Stadt, bei dem viele Unschuldige sterben.",
      bez: ["steht für die Solidarität der Bande", "seine Rettung (II,3) zeigt den Preis von Karls Gewalt", "berichtet selbst vom Galgen: Karls Treue wird zum Mythos der Bande"],
      zitat: "Schlüsselszene: II,3 (Befreiung vom Galgen)",
      stelle: "II,3"
    },
    kosinsky: {
      name: "Kosinsky",
      kurz: "Junger böhmischer Edelmann, will sich der Bande anschließen. Seine Geschichte (Braut vom Fürsten geraubt) spiegelt Karls Schicksal und löst Karls Heimkehr aus.",
      bez: ["Spiegelfigur zu Karl", "seine Braut heißt ebenfalls Amalia", "begleitet Karl nach Franken"],
      zitat: "Schlüsselszene: III,2 (Kosinskys Erzählung)",
      stelle: "III,2"
    },
    bande: {
      name: "Die Räuberbande",
      kurz: "Libertiner, später Banditen: Spiegelberg, Schweizer, Grimm, Razmann, Schufterle, Roller, Schwarz, später Kosinsky. Zwischen Kameradschaft und Brutalität; einzelne (z. B. Schufterle) prahlen mit Grausamkeiten.",
      bez: ["schwört Karl Treue bis in den Tod", "lehnt das Begnadigungsangebot des Paters ab (II,3)", "fordert am Ende Karls Treue ein – dafür opfert er Amalia (V,2)"],
      zitat: "Schlüsselszene: II,3 (Treueschwur gegen das Angebot des Paters)",
      stelle: "II,3"
    },
    hermann: {
      name: "Hermann",
      kurz: "„Bastard von einem Edelmann“, Werkzeug von Franz: überbringt verkleidet die falsche Nachricht von Karls Tod. Von Franz betrogen, wechselt er die Seite und rettet den alten Moor im Turm.",
      bez: ["liebt ebenfalls Amalia", "wird von Franz benutzt und fallen gelassen", "versorgt den eingekerkerten Vater"],
      zitat: "Schlüsselszene: II,2 (falscher Bote)",
      stelle: "II,2"
    }
  };

  var konst = $("#konstellation-svg");
  if (konst) {
    var info = $("#konst-info");
    var figurenEls = $$(".figur", konst);
    function zeigeFigur(id) {
      var f = FIGUREN[id];
      if (!f || !info) return;
      figurenEls.forEach(function (g) { g.classList.toggle("aktiv", g.getAttribute("data-id") === id); });
      $$(".linie", konst).forEach(function (l) {
        var ids = (l.getAttribute("data-von") || "") + " " + (l.getAttribute("data-zu") || "");
        l.classList.toggle("hl", ids.split(" ").indexOf(id) > -1);
      });
      info.innerHTML =
        "<h3>" + f.name + "</h3><p>" + f.kurz + "</p>" +
        "<h4>Beziehungen</h4><ul>" + f.bez.map(function (b) { return "<li>" + b + "</li>"; }).join("") + "</ul>" +
        "<blockquote class='zitat'>" + f.zitat + "<cite>Schiller, Die Räuber, " + f.stelle + " [S. ?]</cite></blockquote>";
      info.setAttribute("tabindex", "-1");
    }
    figurenEls.forEach(function (g) {
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.addEventListener("click", function () { zeigeFigur(g.getAttribute("data-id")); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zeigeFigur(g.getAttribute("data-id")); }
      });
    });
  }

  /* ======================================================================
     2) QUIZ PRO AKT
     ====================================================================== */
  var QUIZ = {
    "I. Akt": [
      { f: "Wie erfährt der alte Moor von Karls angeblichen Vergehen?", a: ["Durch einen Brief, den Franz ihm vorliest", "Durch einen Besuch von Karl selbst", "Durch eine Zeitungsmeldung", "Durch Amalia"], r: 0, e: "Franz liest einen (von ihm manipulierten) Brief des „Korrespondenten in Leipzig“ vor – Karls echten Bittbrief hält er zurück (I,1)." },
      { f: "Wo befindet sich Karl zu Beginn des Stücks?", a: ["Im Schloss in Franken", "In einer Schenke an den Grenzen von Sachsen", "In Prag", "In den böhmischen Wäldern"], r: 1, e: "I,2 spielt in einer Schenke an den Grenzen von Sachsen; Karl ist Student in Leipzig." },
      { f: "Wer bringt die Idee auf, eine Räuberbande zu gründen?", a: ["Karl", "Schweizer", "Spiegelberg", "Roller"], r: 2, e: "Spiegelberg wirbt die Kumpane an – doch die anderen wählen Karl zum Hauptmann (I,2)." },
      { f: "Was löst Karls Entschluss aus, Räuberhauptmann zu werden?", a: ["Ein Streit mit Amalia", "Der (gefälschte) Brief, in dem der Vater ihn verstößt", "Eine Schuldenklage", "Ein Duell"], r: 1, e: "Den Brief hat Franz im Namen des Vaters verfasst. Karl fühlt sich verraten und kehrt sich gegen die ganze Gesellschaft." }
    ],
    "II. Akt": [
      { f: "Wie will Franz den Tod seines Vaters herbeiführen?", a: ["Durch Gift", "Durch einen bezahlten Mörder", "Durch einen seelischen Schock (falsche Todesnachricht über Karl)", "Durch ein Gerichtsurteil"], r: 2, e: "Franz will den Körper „vom Geist aus“ zerstören: Hermann meldet verkleidet Karls angeblichen Tod (II,1–2)." },
      { f: "Welche „Botschaft“ zeigt der falsche Bote vor?", a: ["Karls Degen mit einer mit Blut geschriebenen Bitte, Amalia an Franz zu geben", "Karls Siegelring", "Ein Bild von Amalia", "Einen Brief des Herzogs"], r: 0, e: "Die blutige Inschrift auf dem Degen ist Teil von Franz' Intrige (II,2)." },
      { f: "Wen befreien die Räuber in II,3 vor der Hinrichtung?", a: ["Kosinsky", "Roller", "Schweizer", "Hermann"], r: 1, e: "Für Rollers Rettung legen sie Feuer in der Stadt – viele Unschuldige sterben." },
      { f: "Was bietet der Pater den Räubern an?", a: ["Geld für Karls Kopf", "Begnadigung, wenn sie Karl ausliefern", "Freies Geleit nach Böhmen", "Aufnahme ins Heer"], r: 1, e: "Die Bande lehnt ab und schwört Karl erneut Treue (II,3)." }
    ],
    "III. Akt": [
      { f: "Wie reagiert Amalia, als Franz sie im Garten bedrängt (III,1)?", a: ["Sie gibt nach", "Sie entreißt ihm den Degen und treibt ihn zurück", "Sie flieht zu den Räubern", "Sie ruft den Vater"], r: 1, e: "Amalia wehrt sich aktiv – eine selbstbewusste Szene der sonst oft passiv gelesenen Figur." },
      { f: "In welcher Landschaft spielt III,2?", a: ["Gegend an der Donau", "Leipziger Marktplatz", "Schlossgarten in Franken", "Gefängnis in Prag"], r: 0, e: "Karl blickt in die untergehende Sonne und sehnt sich nach der Unschuld seiner Kindheit." },
      { f: "Was bewirkt Kosinskys Erzählung bei Karl?", a: ["Er löst die Bande auf", "Er beschließt, heimlich nach Franken heimzukehren", "Er tötet Spiegelberg", "Er schreibt dem Vater"], r: 1, e: "Kosinskys Braut heißt auch Amalia – die Parallele weckt Karls Sehnsucht." }
    ],
    "IV. Akt": [
      { f: "Als wer gibt sich Karl im Schloss aus?", a: ["Als Pater", "Als Graf von Brand", "Als Kaufmann aus Leipzig", "Als Hermann"], r: 1, e: "Verkleidet als Graf von Brand besucht er die Heimat (IV,1–2)." },
      { f: "Wer erkennt Karl an einer Narbe?", a: ["Amalia", "Franz", "Der alte Diener Daniel", "Schweizer"], r: 2, e: "Daniel erkennt Karl und warnt ihn vor Franz' Mordplan (IV,3)." },
      { f: "Wo findet Karl seinen totgeglaubten Vater?", a: ["In der Familiengruft", "In einem verfallenen Turm", "Im Kloster", "Bei Amalia"], r: 1, e: "Hermann hat ihn heimlich mit Nahrung versorgt (IV,5)." },
      { f: "Wer tötet Spiegelberg?", a: ["Karl", "Schweizer", "Roller", "Franz"], r: 1, e: "Spiegelberg will Karl ermorden; Schweizer kommt ihm zuvor (IV,5)." }
    ],
    "V. Akt": [
      { f: "Womit quält sich Franz in V,1?", a: ["Mit einem Traum vom Jüngsten Gericht", "Mit Geldsorgen", "Mit einer Krankheit des Vaters", "Mit Eifersucht auf Hermann"], r: 0, e: "Der Gewissenlose fürchtet plötzlich Gericht und Hölle und lässt Pastor Moser rufen." },
      { f: "Wie endet Franz?", a: ["Er wird von Karl hingerichtet", "Er erdrosselt sich selbst, als die Räuber das Schloss stürmen", "Er flieht ins Ausland", "Er wird vom Vater begnadigt"], r: 1, e: "Er erdrosselt sich mit seiner Hutschnur; Schweizer, der ihn lebend bringen sollte, tötet sich danach selbst." },
      { f: "Warum tötet Karl Amalia?", a: ["Aus Eifersucht", "Weil er durch seinen Schwur an die Bande gebunden ist und sie nicht ohne ihn leben will", "Weil sie ihn verraten hat", "Aus Versehen"], r: 1, e: "Die Bande fordert ihr „Opfer“ ein; Amalia bittet selbst um den Tod (V,2)." },
      { f: "Was tut Karl am Schluss?", a: ["Er flieht nach Amerika", "Er wird Graf", "Er stellt sich – und zwar so, dass ein armer Tagelöhner die Belohnung erhält", "Er wird von der Bande getötet"], r: 2, e: "„Dem Mann kann geholfen werden.“ (V,2) – Karl erkennt, dass er die Ordnung durch Gesetzlosigkeit nicht retten kann." }
    ]
  };

  var quizBox = $("#quiz");
  if (quizBox) {
    var tabs = el("div", { class: "quiz-tabs", role: "tablist", "aria-label": "Akt wählen" });
    var flaeche = el("div", { id: "quiz-flaeche", role: "tabpanel", "aria-live": "polite" });
    quizBox.appendChild(tabs); quizBox.appendChild(flaeche);
    Object.keys(QUIZ).forEach(function (akt, i) {
      var b = el("button", { type: "button", role: "tab", "aria-selected": i === 0 ? "true" : "false" }, akt);
      b.addEventListener("click", function () {
        $$("button", tabs).forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        b.setAttribute("aria-selected", "true");
        baueQuiz(akt);
      });
      tabs.appendChild(b);
    });
    function baueQuiz(akt) {
      flaeche.innerHTML = "";
      var punkte = 0, beantwortet = 0, fragen = QUIZ[akt];
      var stand = el("p", { class: "quiz-stand" });
      fragen.forEach(function (q, qi) {
        var box = el("div", { class: "quiz-frage" });
        var fs = el("fieldset");
        fs.appendChild(el("legend", null, (qi + 1) + ". " + q.f));
        var fb = el("p", { class: "feedback", "aria-live": "polite" });
        q.a.forEach(function (antwort, ai) {
          var id = "q-" + akt.replace(/\W/g, "") + "-" + qi + "-" + ai;
          var lab = el("label", { for: id });
          var inp = el("input", { type: "radio", name: "q-" + akt.replace(/\W/g, "") + "-" + qi, id: id, value: ai });
          lab.appendChild(inp);
          lab.appendChild(document.createTextNode(" " + antwort));
          inp.addEventListener("change", function () {
            if (fs.getAttribute("data-fertig")) return;
            fs.setAttribute("data-fertig", "1");
            beantwortet++;
            $$("input", fs).forEach(function (x) { x.disabled = true; });
            if (ai === q.r) { lab.classList.add("richtig"); fb.className = "feedback ok"; fb.textContent = "✓ Richtig! " + q.e; punkte++; }
            else {
              lab.classList.add("falsch");
              $$("label", fs)[q.r].classList.add("richtig");
              fb.className = "feedback nein"; fb.textContent = "✗ Leider nicht. " + q.e;
            }
            stand.textContent = "Stand: " + punkte + " von " + beantwortet + " richtig" + (beantwortet === fragen.length ? " – Akt abgeschlossen!" : "");
          });
          fs.appendChild(lab);
        });
        fs.appendChild(fb);
        box.appendChild(fs);
        flaeche.appendChild(box);
      });
      flaeche.appendChild(stand);
      var neu = el("button", { type: "button", class: "btn sekundaer" }, "Diesen Akt neu starten");
      neu.addEventListener("click", function () { baueQuiz(akt); });
      flaeche.appendChild(neu);
    }
    baueQuiz(Object.keys(QUIZ)[0]);
  }

  /* ======================================================================
     3) ZITAT-ZUORDNUNG „Wer sagt das?“
     ====================================================================== */
  var ZITATE = [
    { z: "Mir ekelt vor diesem tintenklecksenden Säkulum, wenn ich in meinem Plutarch lese von großen Menschen.", w: "Karl", s: "I,2" },
    { z: "Recht ist bei dem Überwältiger, und die Schranken unserer Kraft sind unsere Gesetze.", w: "Franz", s: "I,1" },
    { z: "Den Josephus mußt du lesen.", w: "Spiegelberg", s: "I,2" },
    { z: "Wie dem Fisch im Wasser!", w: "Der alte Moor", s: "I,1" },
    { z: "Mein Handwerk ist Wiedervergeltung – Rache ist mein Gewerbe.", w: "Karl", s: "II,3" },
    { z: "Das Gewissen – o ja freilich! ein tüchtiger Lumpenmann, Sperlinge von Kirschbäumen wegzuschröcken!", w: "Franz", s: "I,1" },
    { z: "Willst dich, Hektor, ewig mir entreißen", w: "Amalia", s: "II,2 (Lied)" },
    { z: "Die Sünden seiner Väter werden heimgesucht im dritten und vierten Glied", w: "Der alte Moor", s: "I,1" },
    { z: "Stelle mich vor ein Heer Kerls wie ich, und aus Deutschland soll eine Republik werden, gegen die Rom und Sparta Nonnenklöster sein sollen.", w: "Karl", s: "I,2" },
    { z: "Ich will alles um mich her ausrotten, was mich einschränkt, daß ich nicht Herr bin.", w: "Franz", s: "I,1" },
    { z: "Dem Mann kann geholfen werden.", w: "Karl", s: "V,2" }
  ];
  var SPRECHER = ["Karl", "Franz", "Der alte Moor", "Amalia", "Spiegelberg"];
  var zitatBox = $("#zitat-spiel");
  if (zitatBox) {
    var richtigZ = 0, fertigZ = 0;
    var standZ = el("p", { class: "quiz-stand", "aria-live": "polite" });
    ZITATE.forEach(function (item, i) {
      var k = el("div", { class: "zk" });
      k.appendChild(el("q", null, item.z));
      var wahl = el("div", { class: "wahl", role: "group", "aria-label": "Sprecher wählen für Zitat " + (i + 1) });
      var fb = el("p", { class: "feedback" });
      SPRECHER.forEach(function (s) {
        var b = el("button", { type: "button" }, s);
        b.addEventListener("click", function () {
          if (k.getAttribute("data-fertig")) return;
          k.setAttribute("data-fertig", "1"); fertigZ++;
          if (s === item.w) { b.classList.add("richtig"); fb.className = "feedback ok"; fb.textContent = "✓ Richtig – " + item.w + ", " + item.s + "."; richtigZ++; }
          else {
            b.classList.add("falsch");
            $$("button", wahl).forEach(function (x) { if (x.textContent === item.w) x.classList.add("richtig"); });
            fb.className = "feedback nein"; fb.textContent = "✗ Es spricht " + item.w + " (" + item.s + ").";
          }
          standZ.textContent = richtigZ + " von " + fertigZ + " richtig zugeordnet" + (fertigZ === ZITATE.length ? " – fertig!" : "");
        });
        wahl.appendChild(b);
      });
      k.appendChild(wahl); k.appendChild(fb);
      zitatBox.appendChild(k);
    });
    zitatBox.appendChild(standZ);
  }

  /* ======================================================================
     4) CHECKLISTE DIALOGANALYSE (nur im Arbeitsspeicher, kein Speichern)
     ====================================================================== */
  $$(".checkliste").forEach(function (liste) {
    var boxes = $$("input[type=checkbox]", liste);
    var balken = liste.parentNode.querySelector(".fortschritt > div");
    var text = liste.parentNode.querySelector(".fortschritt-text");
    function update() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      if (balken) balken.style.width = (n / boxes.length * 100) + "%";
      if (text) text.textContent = n + " von " + boxes.length + " Schritten erledigt";
    }
    boxes.forEach(function (b) { b.addEventListener("change", update); });
    var reset = liste.parentNode.querySelector("[data-reset]");
    if (reset) reset.addEventListener("click", function () { boxes.forEach(function (b) { b.checked = false; }); update(); });
    update();
  });

  /* ======================================================================
     5) GLOSSAR: Suche & Filter
     ====================================================================== */
  var suche = $("#glossar-suche");
  var glossar = $("dl.glossar");
  if (suche && glossar) {
    var aktiveKat = "alle";
    var paare = $$("dt", glossar).map(function (dt) { return { dt: dt, dd: dt.nextElementSibling }; });
    var treffer = $("#glossar-treffer");
    function filtern() {
      var q = suche.value.trim().toLowerCase(), n = 0;
      paare.forEach(function (p) {
        var kat = p.dt.getAttribute("data-kat");
        var passt = (aktiveKat === "alle" || kat === aktiveKat) &&
          (!q || (p.dt.textContent + " " + p.dd.textContent).toLowerCase().indexOf(q) > -1);
        p.dt.hidden = p.dd.hidden = !passt;
        if (passt) n++;
      });
      if (treffer) treffer.textContent = n + " Begriff" + (n === 1 ? "" : "e") + " angezeigt";
    }
    suche.addEventListener("input", filtern);
    $$(".glossar-filter button").forEach(function (b) {
      b.addEventListener("click", function () {
        aktiveKat = b.getAttribute("data-kat");
        $$(".glossar-filter button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        filtern();
      });
    });
    filtern();
  }

  /* ---------- Digitales Szenenpuzzle (DS 1) ---------- */
  var puzzleBox = $("#puzzle");
  if (puzzleBox) {
    // Pro Akt: Karten in gemischter Startreihenfolge; sz = richtige Szene
    var AKTE = [
      { akt: 1, karten: [
        { id: "f", sz: 2, t: "In einer Schenke liest Karl Plutarch und schimpft über sein schwaches Zeitalter. Er hofft auf die Vergebung des Vaters, erhält aber einen Brief, der ihn verstößt. Er wird Hauptmann einer Räuberbande." },
        { id: "l", sz: 3, t: "Franz versucht, Amalia für sich zu gewinnen, und erzählt ihr Schlimmes über Karl. Amalia weist ihn empört zurück." },
        { id: "m", sz: 1, t: "Franz liest dem Vater einen Brief mit schrecklichen Nachrichten über Karl vor und bringt ihn dazu, Karl zu verstoßen. Allein offenbart Franz seine wahren Absichten." }
      ] },
      { akt: 2, karten: [
        { id: "e", sz: 3, t: "Die Räuber befreien einen Kameraden vor der Hinrichtung und legen dafür Feuer in der Stadt. Ein Pater bietet ihnen Begnadigung an, wenn sie ihren Hauptmann ausliefern. Sie weigern sich." },
        { id: "h", sz: 1, t: "Franz überlegt, wie er den Vater „ohne Spuren“ töten kann, und gewinnt dafür Hermann, dem er Amalia verspricht." },
        { id: "c", sz: 2, t: "Ein verkleideter Bote meldet, Karl sei in einer Schlacht gefallen, und zeigt einen blutigen Degen. Der alte Moor bricht zusammen und scheint tot." }
      ] },
      { akt: 3, karten: [
        { id: "a", sz: 2, t: "Karl gerät in tiefe Schwermut. Ein junger Adliger möchte in die Bande aufgenommen werden; dessen Geschichte erinnert Karl an Amalia. Er beschließt, heimlich nach Hause zurückzukehren." },
        { id: "k", sz: 1, t: "Franz bedrängt Amalia im Garten. Sie entreißt ihm den Degen und vertreibt ihn. Danach deutet Hermann ihr an, dass Karl und der Vater noch leben." }
      ] },
      { akt: 4, karten: [
        { id: "d", sz: 4, t: "Karl und Amalia im Garten: Amalia spricht von ihrer Liebe zu Karl, ohne zu wissen, dass er vor ihr steht. Karl reißt sich los." },
        { id: "i", sz: 5, t: "Nachts im Wald: Ein Räuber, der Karl ermorden will, wird getötet. Karl befreit einen ausgehungerten Gefangenen aus einem Turm – seinen Vater – und schwört Rache an Franz." },
        { id: "g", sz: 1, t: "Karl kommt mit der Bande in die Nähe des väterlichen Schlosses und gibt sich als fremder Graf aus." },
        { id: "n", sz: 2, t: "Im Schloss betrachtet der „fremde Graf“ die Familienbilder und spricht mit Amalia, die ihn nicht erkennt. Franz wird misstrauisch." },
        { id: "j", sz: 3, t: "Der alte Diener Daniel erkennt Karl an einer Narbe und verrät ihm, dass Franz ihn töten lassen will." }
      ] },
      { akt: 5, karten: [
        { id: "b", sz: 2, t: "Der Vater erfährt, dass der Räuberhauptmann sein Sohn ist, und stirbt. Karl tötet Amalia und stellt sich der Justiz." },
        { id: "o", sz: 1, t: "Franz wird von einem Albtraum vom Jüngsten Gericht gequält. Die Räuber stürmen das Schloss; Franz nimmt sich das Leben." }
      ] }
    ];
    var ROEM = ["", "I", "II", "III", "IV", "V"];
    var FARBEN = [["gruen", "grün"], ["blau", "blau"], ["rot", "rot"]];
    var KEY = "raeuber-puzzle-v4";
    var nachId = {}, ANZAHL = 0;
    AKTE.forEach(function (A) { A.karten.forEach(function (k) { k.akt = A.akt; nachId[k.id] = k; ANZAHL++; }); });

    function startStand() {
      var ord = {};
      AKTE.forEach(function (A) { ord[A.akt] = A.karten.map(function (k) { return k.id; }); });
      return { ord: ord, farbe: {} };
    }
    function ladeStand() {
      try {
        var s = JSON.parse(window.localStorage.getItem(KEY) || "null");
        if (s && s.ord && AKTE.every(function (A) {
          var o = s.ord[A.akt];
          return o && o.length === A.karten.length && o.every(function (id) { return nachId[id] && nachId[id].akt === A.akt; });
        })) return s;
      } catch (e) {}
      return null;
    }
    function speichereStand() { try { window.localStorage.setItem(KEY, JSON.stringify(stand)); } catch (e) {} }
    var stand = ladeStand() || startStand();

    var listen = {};
    AKTE.forEach(function (A) {
      var reihe = el("section", { "class": "puzzle-akt", "aria-label": ROEM[A.akt] + ". Akt" });
      reihe.appendChild(el("h4", { "class": "puzzle-akt-titel" }, ROEM[A.akt] + ". Akt <span>· " + A.karten.length + " Szenen</span>"));
      var ol = el("ol", { "class": "puzzle-liste", "data-akt": String(A.akt), "aria-label": "Szenen des " + ROEM[A.akt] + ". Akts, von links nach rechts" });
      reihe.appendChild(ol);
      puzzleBox.appendChild(reihe);
      listen[A.akt] = ol;
    });
    var leiste = el("div", { "class": "puzzle-leiste" });
    var pruefBtn = el("button", { type: "button", "class": "btn" }, "Prüfen");
    var resetBtn = el("button", { type: "button", "class": "btn sekundaer" }, "Zurücksetzen");
    var meldung = el("p", { "class": "puzzle-meldung", "aria-live": "polite" });
    leiste.appendChild(pruefBtn); leiste.appendChild(resetBtn);
    puzzleBox.appendChild(leiste); puzzleBox.appendChild(meldung);

    function baueKarte(id) {
      var k = nachId[id], f = stand.farbe[id];
      var li = el("li", { "class": "pk" + (f ? " rahmen-" + f : ""), "data-id": id });
      li.innerHTML =
        '<div class="pk-kopf">' +
          '<span class="pk-farben" role="group" aria-label="Rahmenfarbe">' +
            FARBEN.map(function (fa) {
              return '<button type="button" class="pk-farbe f-' + fa[0] + '" data-farbe="' + fa[0] + '" aria-pressed="' + (f === fa[0] ? "true" : "false") + '" aria-label="Rahmen ' + fa[1] + '" title="' + fa[1] + '"></button>';
            }).join("") +
          "</span>" +
          '<span class="pk-pfeile">' +
            '<button type="button" class="pk-hoch" aria-label="Karte eine Position nach vorne" title="nach vorne">◀</button>' +
            '<button type="button" class="pk-runter" aria-label="Karte eine Position nach hinten" title="nach hinten">▶</button>' +
          "</span>" +
        "</div>" +
        '<p class="pk-text">' + k.t + "</p>" +
        '<div class="pk-fuss"><span class="pk-akt-label">' + ROEM[k.akt] + '. Akt</span><span class="pk-check" aria-live="polite"></span></div>';
      return li;
    }
    function alleKarten() { return $$(".pk", puzzleBox).filter(function (x) { return !x.classList.contains("pk-geist"); }); }
    function nummerieren() {
      AKTE.forEach(function (A) {
        var lis = $$(".pk", listen[A.akt]);
        lis.forEach(function (li, i) {
          $(".pk-hoch", li).disabled = i === 0;
          $(".pk-runter", li).disabled = i === lis.length - 1;
        });
        stand.ord[A.akt] = lis.map(function (li) { return li.getAttribute("data-id"); });
      });
      speichereStand();
    }
    function feedbackWeg() {
      alleKarten().forEach(function (li) { li.classList.remove("pos-ok", "pos-falsch"); $(".pk-check", li).textContent = ""; });
      meldung.textContent = "";
    }
    function zeichnen() {
      AKTE.forEach(function (A) {
        var ol = listen[A.akt]; ol.innerHTML = "";
        stand.ord[A.akt].forEach(function (id) { ol.appendChild(baueKarte(id)); });
      });
      nummerieren();
    }
    zeichnen();

    puzzleBox.addEventListener("click", function (e) {
      var li = e.target.closest(".pk"); if (!li) return;
      var ol = li.parentNode;
      if (e.target.closest(".pk-hoch") && li.previousElementSibling) {
        ol.insertBefore(li, li.previousElementSibling); nummerieren(); feedbackWeg();
      } else if (e.target.closest(".pk-runter") && li.nextElementSibling) {
        ol.insertBefore(li.nextElementSibling, li); nummerieren(); feedbackWeg();
      } else if (e.target.closest(".pk-farbe")) {
        var b = e.target.closest(".pk-farbe"), fa = b.getAttribute("data-farbe"), id = li.getAttribute("data-id");
        var neu = stand.farbe[id] === fa ? "" : fa;
        stand.farbe[id] = neu;
        FARBEN.forEach(function (x) { li.classList.remove("rahmen-" + x[0]); });
        if (neu) li.classList.add("rahmen-" + neu);
        $$(".pk-farbe", li).forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-farbe") === neu ? "true" : "false"); });
        speichereStand();
      }
    });

    /* ---- Verschieben innerhalb eines Akts: Maus = sofort ziehen; Finger = kurz gedrückt halten, dann ziehen ---- */
    var zieh = null, wartet = null;
    function istBedienelement(t) { return !!t.closest("button, select, label, option"); }
    function ziehStart(li, x, y) {
      var r = li.getBoundingClientRect();
      var geist = li.cloneNode(true);
      geist.classList.add("pk-geist");
      geist.style.width = r.width + "px"; geist.style.height = r.height + "px";
      geist.style.left = r.left + "px"; geist.style.top = r.top + "px";
      document.body.appendChild(geist);
      li.classList.add("pk-platz");
      li.parentNode.classList.add("ziel-aktiv");
      zieh = { li: li, ol: li.parentNode, geist: geist, dx: x - r.left, dy: y - r.top, x: x, y: y, raf: 0 };
      feedbackWeg();
      document.documentElement.classList.add("puzzle-zieht");
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
      zieh.raf = window.requestAnimationFrame(randScroll);
    }
    function ziehBewegen(x, y) {
      if (!zieh) return;
      zieh.x = x; zieh.y = y;
      zieh.geist.style.left = (x - zieh.dx) + "px";
      zieh.geist.style.top = (y - zieh.dy) + "px";
      einordnen();
    }
    function einordnen() {
      var unter = document.elementFromPoint(zieh.x, zieh.y);
      var ziel = unter && unter.closest ? unter.closest(".pk") : null;
      if (!ziel || ziel === zieh.li || ziel.parentNode !== zieh.ol) return; // nur im eigenen Akt
      var lis = $$(".pk", zieh.ol);
      if (lis.indexOf(ziel) > lis.indexOf(zieh.li)) zieh.ol.insertBefore(zieh.li, ziel.nextElementSibling);
      else zieh.ol.insertBefore(zieh.li, ziel);
    }
    function randScroll() {
      if (!zieh) return;
      var y = zieh.y, rand = 80, dy = 0;
      if (y < rand) dy = -Math.ceil((rand - y) / 2.5);
      else if (y > window.innerHeight - rand) dy = Math.ceil((y - (window.innerHeight - rand)) / 2.5);
      if (dy) { window.scrollBy({ top: dy, behavior: "instant" }); einordnen(); }
      zieh.raf = window.requestAnimationFrame(randScroll);
    }
    function ziehEnde() {
      if (wartet) { clearTimeout(wartet.timer); wartet = null; }
      if (!zieh) return;
      window.cancelAnimationFrame(zieh.raf);
      zieh.geist.remove();
      zieh.li.classList.remove("pk-platz");
      zieh.ol.classList.remove("ziel-aktiv");
      document.documentElement.classList.remove("puzzle-zieht");
      zieh = null;
      nummerieren();
    }
    puzzleBox.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1 || istBedienelement(e.target)) return;
      var li = e.target.closest(".pk"); if (!li) return;
      var t = e.touches[0];
      wartet = { li: li, x: t.clientX, y: t.clientY, timer: setTimeout(function () {
        if (!wartet) return;
        var w = wartet; wartet = null;
        ziehStart(w.li, w.x, w.y);
      }, 280) };
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      if (wartet) {
        if (Math.abs(t.clientX - wartet.x) > 10 || Math.abs(t.clientY - wartet.y) > 10) { clearTimeout(wartet.timer); wartet = null; }
        return;
      }
      if (zieh) { e.preventDefault(); ziehBewegen(t.clientX, t.clientY); }
    }, { passive: false });
    document.addEventListener("touchend", ziehEnde);
    document.addEventListener("touchcancel", ziehEnde);
    puzzleBox.addEventListener("contextmenu", function (e) { if (zieh || wartet) e.preventDefault(); });
    puzzleBox.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch" || e.button !== 0 || istBedienelement(e.target)) return;
      var li = e.target.closest(".pk"); if (!li) return;
      e.preventDefault();
      wartet = { li: li, x: e.clientX, y: e.clientY, maus: true, timer: 0 };
    });
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      if (wartet && wartet.maus) {
        if (Math.abs(e.clientX - wartet.x) > 5 || Math.abs(e.clientY - wartet.y) > 5) {
          var w = wartet; wartet = null; ziehStart(w.li, w.x, w.y);
        } else return;
      }
      if (zieh) ziehBewegen(e.clientX, e.clientY);
    });
    document.addEventListener("pointerup", function (e) { if (e.pointerType !== "touch") ziehEnde(); });

    pruefBtn.addEventListener("click", function () {
      var ok = 0, akteOk = 0;
      AKTE.forEach(function (A) {
        var alleRichtig = true;
        $$(".pk", listen[A.akt]).forEach(function (li, i) {
          var k = nachId[li.getAttribute("data-id")];
          var p = k.sz === i + 1;
          li.classList.toggle("pos-ok", p); li.classList.toggle("pos-falsch", !p);
          $(".pk-check", li).textContent = p ? "✓ Szene " + k.sz : "✗ falscher Platz";
          if (p) ok++; else alleRichtig = false;
        });
        if (alleRichtig) akteOk++;
      });
      var ohneFarbe = Object.keys(nachId).filter(function (id) { return !stand.farbe[id]; }).length;
      if (ok === ANZAHL) {
        meldung.innerHTML = "<strong>Alles richtig!</strong> Alle Szenen stehen in der richtigen Reihenfolge." +
          (ohneFarbe ? " Es fehlen noch " + ohneFarbe + " Farbrahmen." : " Vergleicht jetzt eure Farben mit den anderen Gruppen.");
      } else {
        meldung.innerHTML = "<strong>" + ok + " von " + ANZAHL + "</strong> Szenen stehen an der richtigen Stelle, <strong>" + akteOk +
          " von 5</strong> Akten sind schon ganz richtig. Die Farben prüft ihr im Galeriegang.";
      }
    });
    resetBtn.addEventListener("click", function () {
      if (!window.confirm("Wirklich alles zurücksetzen? Reihenfolge und Farben gehen verloren.")) return;
      stand = startStand();
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      feedbackWeg(); zeichnen();
    });
  }

  /* ---------- Countdown Theaterbesuch ---------- */
  var cd = $("#countdown");
  if (cd) {
    var ziel = new Date("2026-12-01T10:00:00+01:00");
    var tage = Math.ceil((ziel - new Date()) / 86400000);
    cd.textContent = tage > 1 ? "Noch " + tage + " Tage bis zum Theaterbesuch." :
      tage === 1 ? "Morgen ist Theaterbesuch!" :
      tage === 0 ? "Heute ist Theaterbesuch!" : "Der Theaterbesuch hat bereits stattgefunden.";
  }
})();
