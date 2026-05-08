# Kilpailukalenteri – Prototyyppi

Kilpailukalenterijärjestelmän prototyyppi. Nykyinen versio keskittyy etusivun
roolivalintaan sekä admin- ja liitto-uutisointiin.

## Roolivalinta prototyypissä

Sivulle **ei tarvita kirjautumista**. Testaaja valitsee etusivulta roolin, jolla
haluaa kokeilla järjestelmää. Valittu rooli tallennetaan
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

Uutiset tallennetaan ja haetaan PHP-API:n kautta MySQL-tietokannasta.
Tykkäysten roolikohtainen tila on toistaiseksi frontendissä `localStorage`ssa
(väliaikainen ratkaisu), mutta tykkäysmäärä tallennetaan uutisen mukana API:n
kautta.

## Tekninen rakenne

```
index.html           – Etusivu (roolivalinta, uutislistat, uutisnäkymä, uutislomake)
style.css            – Perustyylit ja uutisnäkymien ulkoasu
app.js               – Roolivalinta, uutislogiikka, näkyvyys ja tykkäykset
api/db.php           – Lukee DB-konfiguraation ja avaa PDO-yhteyden
api/news.php         – Uutis-API (GET, POST, DELETE)
schema.sql           – MySQL-skeema `news`-taululle
config/db.example.php – Esimerkkipohja tietokanta-asetuksille
```

## Kehityssuunnitelma

Seuraavissa vaiheissa roolin perusteella näytetään roolikohtaiset
toiminnallisuudet ja näkymät (kilpailukalenteri, ilmoittautuminen, hallinta jne.).

## Käynnistys ja vaatimukset

Projekti tarvitsee:

- PHP (API-tiedostojen suorittamiseen)
- MySQL/MariaDB
- selain frontendille

### 1) Luo tietokantaskeema

Aja `schema.sql` MySQL:ään:

```bash
mysql -u USER -p DATABASE_NAME < schema.sql
```

### 2) Luo suojattu tietokantakonfiguraatio palvelimelle

Luo tiedosto polkuun:

`/home/rikman/config/db.php`

Tiedoston muoto:

```php
<?php
return [
    'host' => 'localhost',
    'dbname' => 'YOUR_DATABASE_NAME',
    'username' => 'YOUR_DATABASE_USER',
    'password' => 'YOUR_DATABASE_PASSWORD',
];
```

Sama rakenne löytyy myös esimerkkinä tiedostosta `config/db.example.php`.
Älä tallenna oikeita tunnuksia repositoryyn.

### 3) Käynnistä projekti

Avaa `index.html` selaimessa tai käytä paikallista HTTP-palvelinta:

```bash
npx serve .
# tai
python3 -m http.server
```

---

Automaattinen deploy: muutokset `main`-haaraan julkaistaan palvelimelle GitHub Actions -workflowlla.
