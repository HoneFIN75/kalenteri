# Kilpailukalenteri – Prototyyppi

Kilpailukalenterijärjestelmän prototyyppi. Ensimmäinen vaihe keskittyy etusivun roolivalintaan.

## Roolivalinta prototyypissä

Sivulle **ei tarvita tietokantaa eikä kirjautumista**. Testaaja valitsee etusivulta
roolin, jolla haluaa kokeilla järjestelmää. Valittu rooli tallennetaan
`sessionStorage`-muistiin ja näkyy selkeästi käyttöliittymässä.

### Käyttäjäroolit

| Rooli | Kuvaus |
|---|---|
| `admin` | Järjestelmän ylläpito ja hallinta |
| `liitto` | Liiton edustaja, kilpailukalenterin hyväksyminen |
| `kilpailujohtaja` | Kilpailun organisointi ja hallinta |
| `kilpailija` | Kilpailijan ilmoittautuminen ja tulokset |
| `katsoja` | Kilpailukalenterin selaus ilman kirjautumista |

## Tekninen rakenne

```
index.html   – Etusivu (roolivalinta)
style.css    – Perustyylit
app.js       – Roolivalintalogiikka
```

## Kehityssuunnitelma

Seuraavissa vaiheissa roolin perusteella näytetään roolikohtaiset
toiminnallisuudet ja näkymät (kilpailukalenteri, ilmoittautuminen, hallinta jne.).

## Käynnistys

Avaa `index.html` selaimessa tai käytä paikallista HTTP-palvelinta:

```bash
npx serve .
# tai
python3 -m http.server
```

---

Automaattinen deploy: muutokset `main`-haaraan julkaistaan palvelimelle GitHub Actions -workflowlla.
