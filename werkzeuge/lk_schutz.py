#!/usr/bin/env python3
"""Verschlüsselt bzw. entschlüsselt die Lehrkraft-Inhalte (alle Elemente mit der
Klasse "lk") in den HTML-Seiten der Website.

  python3 werkzeuge/lk_schutz.py sperren    # vor dem Hochladen
  python3 werkzeuge/lk_schutz.py entsperren # zum Bearbeiten

Das Codewort wird abgefragt (oder über die Umgebungsvariable LK_CODE übergeben)
und NIRGENDS gespeichert. Verfahren: PBKDF2-SHA256 (250 000 Runden) + AES-256-GCM,
kompatibel mit der Entschlüsselung in script.js (Web Crypto API).
"""
import base64, getpass, glob, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 250000
# fester Salt für die ganze Website, damit der Schlüssel seitenübergreifend gilt
SALT = b"raeuber-lernwebsite-lk-v1"
MARKE_ANFANG = '<script type="application/json" id="lk-daten">'
PLATZ = '<div class="lk-platz" data-n="{n}" hidden></div>'
ORDNER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def schluessel(code):
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=SALT, iterations=ITER)
    return kdf.derive(code.encode("utf-8"))

def b64(b): return base64.b64encode(b).decode("ascii")

OEFFNEN = re.compile(r'<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>')
def ist_lk(attrs):
    m = re.search(r'\bclass="([^"]*)"', attrs)
    return bool(m) and "lk" in m.group(1).split()

def finde_lk_bloecke(html):
    """liefert (start, ende) aller äußeren Elemente mit Klasse lk"""
    bloecke, pos = [], 0
    while True:
        m = OEFFNEN.search(html, pos)
        if not m: break
        tag, attrs = m.group(1).lower(), m.group(2)
        if tag in ("script", "style"):
            ende = html.find("</%s>" % tag, m.end()); pos = ende + 1; continue
        if not ist_lk(attrs) or attrs.rstrip().endswith("/"):
            pos = m.end(); continue
        tiefe, i = 1, m.end()
        muster = re.compile(r'<(/?)%s\b[^>]*>' % tag, re.I)
        while tiefe:
            n = muster.search(html, i)
            if not n: raise SystemExit("Nicht geschlossenes <%s> bei Zeichen %d" % (tag, m.start()))
            tiefe += -1 if n.group(1) else 1
            i = n.end()
        bloecke.append((m.start(), i)); pos = i
    return bloecke

def sperren(code):
    k = AESGCM(schluessel(code))
    for pfad in sorted(glob.glob(os.path.join(ORDNER, "*.html"))):
        html = open(pfad, encoding="utf-8").read()
        if MARKE_ANFANG in html:
            print("schon gesperrt:", os.path.basename(pfad)); continue
        bl = finde_lk_bloecke(html)
        if not bl: continue
        teile = [html[a:e] for a, e in bl]
        neu, letzt = [], 0
        for n, (a, e) in enumerate(bl):
            neu.append(html[letzt:a]); neu.append(PLATZ.format(n=n)); letzt = e
        neu.append(html[letzt:])
        html = "".join(neu)
        iv = os.urandom(12)
        ct = k.encrypt(iv, json.dumps(teile, ensure_ascii=False).encode("utf-8"), None)
        daten = json.dumps({"v": 1, "iv": b64(iv), "ct": b64(ct)})
        block = MARKE_ANFANG + daten + "</script>\n"
        anker = '<script src="script.js"></script>'
        # die Daten müssen VOR script.js stehen, damit sie beim Start lesbar sind
        html = html.replace(anker, block + anker, 1) if anker in html else html.replace("</body>", block + "</body>", 1)
        open(pfad, "w", encoding="utf-8").write(html)
        print("gesperrt: %-22s %2d Lehrkraft-Blöcke" % (os.path.basename(pfad), len(teile)))

def entsperren(code):
    k = AESGCM(schluessel(code))
    for pfad in sorted(glob.glob(os.path.join(ORDNER, "*.html"))):
        html = open(pfad, encoding="utf-8").read()
        m = re.search(re.escape(MARKE_ANFANG) + r'(.*?)</script>\n?', html, re.S)
        if not m: continue
        d = json.loads(m.group(1))
        try:
            teile = json.loads(k.decrypt(base64.b64decode(d["iv"]), base64.b64decode(d["ct"]), None))
        except Exception:
            raise SystemExit("Falsches Codewort (oder beschädigte Daten) in " + os.path.basename(pfad))
        html = html[:m.start()] + html[m.end():]
        for n, t in enumerate(teile):
            p = PLATZ.format(n=n)
            if html.count(p) != 1: raise SystemExit("Platzhalter %d fehlt in %s" % (n, pfad))
            html = html.replace(p, t)
        open(pfad, "w", encoding="utf-8").write(html)
        print("entsperrt:", os.path.basename(pfad), len(teile))

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("sperren", "entsperren"):
        raise SystemExit(__doc__)
    code = os.environ.get("LK_CODE") or getpass.getpass("Lehrkraft-Codewort: ")
    (sperren if sys.argv[1] == "sperren" else entsperren)(code)
