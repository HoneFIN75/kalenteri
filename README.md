# Kilpailukalenteri – Prototyyppi

Kilpailukalenterijärjestelmän prototyyppi. Nykyinen versio keskittyy etusivun
roolivalintaan sekä admin- ja liitto-uutisointiin.

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

## Uutisointi prototyypissä

- `admin` voi luoda, muokata ja poistaa admin-uutisia
- `liitto` voi luoda, muokata ja poistaa liitto-uutisia
- muut roolit näkevät uutisia vain, jos ne on kohdennettu heille
- uutinen tarvitsee otsikon ja sisällön
- uutinen avautuu omalle näkymälleen ja siitä voi palata takaisin listaan
- uutisia voi tykätä ja tykkäysmäärä näytetään käyttöliittymässä

Koska prototyyppi toimii ilman tietokantaa, uutiset ja tykkäykset tallennetaan
selaimen `localStorage`-muistiin. Valittu rooli tallennetaan edelleen
`sessionStorage`-muistiin.

## Tekninen rakenne

```
index.html   – Etusivu (roolivalinta, uutislistat, uutisnäkymä, uutislomake)
style.css    – Perustyylit ja uutisnäkymien ulkoasu
app.js       – Roolivalinta, uutislogiikka, näkyvyys ja tykkäykset
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
