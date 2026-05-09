-- ============================================================
-- Kilpailuhakemusworkflow – tietokantamigraatio
-- Lisää hakemustyönkulku kilpailukalenteri-tauluun ja
-- luo hakemuksen lomakekenttien lookup-taulut.
-- ============================================================

-- 1) Lisää uudet sarakkeet kilpailukalenteri-tauluun
--    Olemassa oleville riveille asetetaan status = 'hyvaksytty',
--    jotta julkinen kalenteri säilyy yhteensopivana.

ALTER TABLE kilpailukalenteri
  ADD COLUMN IF NOT EXISTS status               VARCHAR(30)  NOT NULL DEFAULT 'hyvaksytty',
  ADD COLUMN IF NOT EXISTS created_at           DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS updated_at           DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS submitted_at         DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at          DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS liitto_comment       TEXT         NULL,
  ADD COLUMN IF NOT EXISTS kilpailunjohtaja_comment TEXT     NULL,
  ADD COLUMN IF NOT EXISTS pdga_tier_other      VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS dgm_link             VARCHAR(500) NULL;

-- 2) Lookup-taulu: kilpailutyypit (haettavakilpailu)
CREATE TABLE IF NOT EXISTS competition_types (
  id   INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO competition_types (name) VALUES
  ('Erilliskilpailu'),
  ('Junioreiden SM-karsinnat'),
  ('PDGA-liiga'),
  ('Alueellinen AM-tour'),
  ('Masterstour'),
  ('Pro-tour'),
  ('Amatöörien SM-karsinnat')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3) Lookup-taulu: kilpailuluokat (kilpailuluokat)
CREATE TABLE IF NOT EXISTS competition_category_options (
  id   INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO competition_category_options (name) VALUES
  ('Pro- ja amatööriluokat'),
  ('Vain pro-luokkia'),
  ('Vain amatööriluokkia'),
  ('Rating-perusteiset luokat (Gold, Blue, White, Red, Green, Purple)')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 4) Lookup-taulu: PDGA-tasot (pdgatier)
CREATE TABLE IF NOT EXISTS pdga_tier_options (
  id   INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO pdga_tier_options (name) VALUES
  ('A-tier'),
  ('B-tier'),
  ('C-tier'),
  ('L-tier'),
  ('Other')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 5) Lookup-taulu: divisions (luokat)
CREATE TABLE IF NOT EXISTS division_options (
  id   INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO division_options (code) VALUES
  ('MPO'),('FPO'),('MP40'),('FP40'),
  ('MP50'),('FP50'),('MP55'),('FP55'),
  ('MP60'),('FP60'),('MP65'),('FP65'),
  ('MP70'),('FP70'),('MP75'),('FP75'),
  ('MP80'),('FP80')
ON DUPLICATE KEY UPDATE code = VALUES(code);
