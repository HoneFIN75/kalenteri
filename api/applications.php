<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/db.php';

/**
 * @param mixed $data
 */
function respondJson($data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Palauttaa rivin division-sarakkeiden nimet. */
function divisionColumns(): array
{
    return ['MPO','FPO','MP40','FP40','MP50','FP50','MP55','FP55',
            'MP60','FP60','MP65','FP65','MP70','FP70','MP75','FP75','MP80','FP80'];
}

/** Kerää aktiiviset divisioonat rivillä. */
function collectDivisions(array $row): array
{
    $active = [];
    foreach (divisionColumns() as $col) {
        $val = isset($row[$col]) ? trim((string) $row[$col]) : '';
        if ($val !== '') {
            $active[] = $col;
        }
    }
    return $active;
}

/** Muodostaa yhden hakemustietueesta palautettavan arrayn. */
function formatApplication(array $row): array
{
    return [
        'id'                         => (int) $row['id'],
        'kilpailunnimi'              => (string) ($row['kilpailunnimi'] ?? ''),
        'jarjestaja'                 => (string) ($row['jarjestaja'] ?? ''),
        'paikkakunta'                => (string) ($row['paikkakunta'] ?? ''),
        'rata'                       => (string) ($row['rata'] ?? ''),
        'aloituspvm'                 => (string) ($row['aloituspvm'] ?? ''),
        'paatospvm'                  => (string) ($row['paatospvm'] ?? ''),
        'haettavakilpailu'           => (string) ($row['haettavakilpailu'] ?? ''),
        'kilpailuluokat'             => (string) ($row['kilpailuluokat'] ?? ''),
        'pdgatier'                   => (string) ($row['pdgatier'] ?? ''),
        'pdga_tier_other'            => (string) ($row['pdga_tier_other'] ?? ''),
        'maxpelaajamaara'            => (string) ($row['maxpelaajamaara'] ?? ''),
        'vaylienmaarapk'             => (string) ($row['vaylienmaarapk'] ?? ''),
        'kierrostenmaara'            => (string) ($row['kierrostenmaara'] ?? ''),
        'dgm_link'                   => (string) ($row['dgm_link'] ?? ''),
        'kilpailunjohtaja'           => (string) ($row['kilpailunjohtaja'] ?? ''),
        'kilpailunjohtajapdga'       => (string) ($row['kilpailunjohtajapdga'] ?? ''),
        'apukilpailunjohtaja'        => (string) ($row['apukilpailunjohtaja'] ?? ''),
        'apukilpailunjohtajapdga'    => (string) ($row['apukilpailunjohtajapdga'] ?? ''),
        'divisions'                  => collectDivisions($row),
        'status'                     => (string) ($row['status'] ?? 'avoin'),
        'created_at'                 => (string) ($row['created_at'] ?? ''),
        'updated_at'                 => (string) ($row['updated_at'] ?? ''),
        'submitted_at'               => (string) ($row['submitted_at'] ?? ''),
        'reviewed_at'                => (string) ($row['reviewed_at'] ?? ''),
        'liitto_comment'             => (string) ($row['liitto_comment'] ?? ''),
        'kilpailunjohtaja_comment'   => (string) ($row['kilpailunjohtaja_comment'] ?? ''),
    ];
}

/** Validoi pakolliset kentät lähettämistä varten. */
function validateRequiredFields(array $data): array
{
    $errors = [];

    $required = [
        'kilpailunnimi'    => 'Kilpailun nimi',
        'jarjestaja'       => 'Järjestäjä',
        'paikkakunta'      => 'Paikkakunta',
        'rata'             => 'Rata',
        'aloituspvm'       => 'Aloituspäivämäärä',
        'paatospvm'        => 'Päätöspäivämäärä',
        'haettavakilpailu' => 'Haettava kilpailu',
        'kilpailuluokat'   => 'Kilpailuluokat',
        'pdgatier'         => 'PDGA Tier',
        'maxpelaajamaara'  => 'Max pelaajamäärä',
        'vaylienmaarapk'   => 'Väylien määrä / pk',
        'kierrostenmaara'  => 'Kierrosten määrä',
    ];

    foreach ($required as $field => $label) {
        if (empty(trim((string) ($data[$field] ?? '')))) {
            $errors[] = "{$label} on pakollinen.";
        }
    }

    // Jos pdgatier = 'Other', pdga_tier_other on pakollinen
    if (trim((string) ($data['pdgatier'] ?? '')) === 'Other') {
        if (empty(trim((string) ($data['pdga_tier_other'] ?? '')))) {
            $errors[] = 'PDGA Tier Other -kenttä on pakollinen, kun PDGA Tier on Other.';
        }
    }

    return $errors;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── GET ────────────────────────────────────────────────────────────────────

if ($method === 'GET') {
    $role = trim((string) ($_GET['role'] ?? ''));

    if ($role === 'kilpailujohtaja') {
        // Kilpailunjohtaja näkee kaikki hakemukset (prototyypissä ei käyttäjätunnuksia)
        $stmt = $pdo->query(
            "SELECT id, kilpailunnimi, jarjestaja, paikkakunta, rata,
                    aloituspvm, paatospvm, haettavakilpailu, kilpailuluokat,
                    pdgatier, pdga_tier_other, maxpelaajamaara, vaylienmaarapk,
                    kierrostenmaara, dgm_link,
                    kilpailunjohtaja, kilpailunjohtajapdga,
                    apukilpailunjohtaja, apukilpailunjohtajapdga,
                    MPO, FPO, MP40, FP40, MP50, FP50, MP55, FP55,
                    MP60, FP60, MP65, FP65, MP70, FP70, MP75, FP75, MP80, FP80,
                    status, created_at, updated_at, submitted_at, reviewed_at,
                    liitto_comment, kilpailunjohtaja_comment
             FROM kilpailukalenteri
             WHERE status IN ('avoin','liitto_kasittelee','hyvaksytty','hylatty')
             ORDER BY created_at DESC, id DESC"
        );
    } elseif ($role === 'liitto') {
        // Liitto näkee kaikki paitsi avoin-tilaiset
        $stmt = $pdo->query(
            "SELECT id, kilpailunnimi, jarjestaja, paikkakunta, rata,
                    aloituspvm, paatospvm, haettavakilpailu, kilpailuluokat,
                    pdgatier, pdga_tier_other, maxpelaajamaara, vaylienmaarapk,
                    kierrostenmaara, dgm_link,
                    kilpailunjohtaja, kilpailunjohtajapdga,
                    apukilpailunjohtaja, apukilpailunjohtajapdga,
                    MPO, FPO, MP40, FP40, MP50, FP50, MP55, FP55,
                    MP60, FP60, MP65, FP65, MP70, FP70, MP75, FP75, MP80, FP80,
                    status, created_at, updated_at, submitted_at, reviewed_at,
                    liitto_comment, kilpailunjohtaja_comment
             FROM kilpailukalenteri
             WHERE status IN ('liitto_kasittelee','hyvaksytty','hylatty')
             ORDER BY submitted_at DESC, id DESC"
        );
    } else {
        respondJson(['error' => 'Rooli puuttuu tai ei ole sallittu.'], 400);
    }

    $rows = $stmt->fetchAll();
    respondJson(array_map('formatApplication', $rows));
}

// ── POST ───────────────────────────────────────────────────────────────────

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        respondJson(['error' => 'Virheellinen pyyntö.'], 400);
    }

    $action = trim((string) ($input['action'] ?? ''));
    $role   = trim((string) ($input['role'] ?? ''));

    // ── create ──────────────────────────────────────────────────────────────
    if ($action === 'create') {
        if ($role !== 'kilpailujohtaja') {
            respondJson(['error' => 'Ei oikeuksia.'], 403);
        }

        $now = date('Y-m-d H:i:s');

        // Rakenna division-sarakkeet
        $selectedDivisions = is_array($input['divisions'] ?? null) ? $input['divisions'] : [];
        $divCols  = [];
        $divVals  = [];
        $divBinds = [];
        foreach (divisionColumns() as $col) {
            $divCols[]  = "`{$col}`";
            $divVals[]  = in_array($col, $selectedDivisions, true) ? $col : '';
            $divBinds[] = '?';
        }

        $sql = 'INSERT INTO kilpailukalenteri
            (kilpailunnimi, jarjestaja, paikkakunta, rata,
             aloituspvm, paatospvm, haettavakilpailu, kilpailuluokat,
             pdgatier, pdga_tier_other, maxpelaajamaara, vaylienmaarapk,
             kierrostenmaara, dgm_link,
             kilpailunjohtaja, kilpailunjohtajapdga,
             apukilpailunjohtaja, apukilpailunjohtajapdga,
             ' . implode(',', $divCols) . ',
             status, created_at, updated_at,
             kilpailunjohtaja_comment)
            VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,' .
            implode(',', $divBinds) . ',
            ?,?,?,?)';

        $stmt = $pdo->prepare($sql);

        $params = [
            trim((string) ($input['kilpailunnimi'] ?? '')),
            trim((string) ($input['jarjestaja'] ?? '')),
            trim((string) ($input['paikkakunta'] ?? '')),
            trim((string) ($input['rata'] ?? '')),
            trim((string) ($input['aloituspvm'] ?? '')),
            trim((string) ($input['paatospvm'] ?? '')),
            trim((string) ($input['haettavakilpailu'] ?? '')),
            trim((string) ($input['kilpailuluokat'] ?? '')),
            trim((string) ($input['pdgatier'] ?? '')),
            trim((string) ($input['pdga_tier_other'] ?? '')),
            trim((string) ($input['maxpelaajamaara'] ?? '')),
            trim((string) ($input['vaylienmaarapk'] ?? '')),
            trim((string) ($input['kierrostenmaara'] ?? '')),
            trim((string) ($input['dgm_link'] ?? '')),
            trim((string) ($input['kilpailunjohtaja'] ?? '')),
            trim((string) ($input['kilpailunjohtajapdga'] ?? '')),
            trim((string) ($input['apukilpailunjohtaja'] ?? '')),
            trim((string) ($input['apukilpailunjohtajapdga'] ?? '')),
        ];

        // Division values
        foreach ($divVals as $v) {
            $params[] = $v;
        }

        $params[] = 'avoin';
        $params[] = $now;
        $params[] = $now;
        $params[] = trim((string) ($input['kilpailunjohtaja_comment'] ?? ''));

        $stmt->execute($params);
        $newId = (int) $pdo->lastInsertId();

        $row = $pdo->query(
            "SELECT * FROM kilpailukalenteri WHERE id = {$newId}"
        )->fetch();

        respondJson(['success' => true, 'application' => formatApplication($row)], 201);
    }

    // ── update ──────────────────────────────────────────────────────────────
    if ($action === 'update') {
        if ($role !== 'kilpailujohtaja') {
            respondJson(['error' => 'Ei oikeuksia.'], 403);
        }

        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            respondJson(['error' => 'ID puuttuu.'], 400);
        }

        // Tarkista tila
        $current = $pdo->query(
            "SELECT status FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        if (!$current) {
            respondJson(['error' => 'Hakemusta ei löydy.'], 404);
        }

        if (!in_array($current['status'], ['avoin', 'hylatty'], true)) {
            respondJson(['error' => 'Hakemusta ei voi muokata tässä tilassa.'], 403);
        }

        $now = date('Y-m-d H:i:s');

        $selectedDivisions = is_array($input['divisions'] ?? null) ? $input['divisions'] : [];
        $divSets = [];
        $divVals = [];
        foreach (divisionColumns() as $col) {
            $divSets[] = "`{$col}` = ?";
            $divVals[] = in_array($col, $selectedDivisions, true) ? $col : '';
        }

        $sql = 'UPDATE kilpailukalenteri SET
            kilpailunnimi = ?, jarjestaja = ?, paikkakunta = ?, rata = ?,
            aloituspvm = ?, paatospvm = ?, haettavakilpailu = ?, kilpailuluokat = ?,
            pdgatier = ?, pdga_tier_other = ?, maxpelaajamaara = ?, vaylienmaarapk = ?,
            kierrostenmaara = ?, dgm_link = ?,
            kilpailunjohtaja = ?, kilpailunjohtajapdga = ?,
            apukilpailunjohtaja = ?, apukilpailunjohtajapdga = ?,
            kilpailunjohtaja_comment = ?,
            updated_at = ?,
            ' . implode(', ', $divSets) . '
            WHERE id = ?';

        $params = [
            trim((string) ($input['kilpailunnimi'] ?? '')),
            trim((string) ($input['jarjestaja'] ?? '')),
            trim((string) ($input['paikkakunta'] ?? '')),
            trim((string) ($input['rata'] ?? '')),
            trim((string) ($input['aloituspvm'] ?? '')),
            trim((string) ($input['paatospvm'] ?? '')),
            trim((string) ($input['haettavakilpailu'] ?? '')),
            trim((string) ($input['kilpailuluokat'] ?? '')),
            trim((string) ($input['pdgatier'] ?? '')),
            trim((string) ($input['pdga_tier_other'] ?? '')),
            trim((string) ($input['maxpelaajamaara'] ?? '')),
            trim((string) ($input['vaylienmaarapk'] ?? '')),
            trim((string) ($input['kierrostenmaara'] ?? '')),
            trim((string) ($input['dgm_link'] ?? '')),
            trim((string) ($input['kilpailunjohtaja'] ?? '')),
            trim((string) ($input['kilpailunjohtajapdga'] ?? '')),
            trim((string) ($input['apukilpailunjohtaja'] ?? '')),
            trim((string) ($input['apukilpailunjohtajapdga'] ?? '')),
            trim((string) ($input['kilpailunjohtaja_comment'] ?? '')),
            $now,
        ];

        foreach ($divVals as $v) {
            $params[] = $v;
        }

        $params[] = $id;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $row = $pdo->query(
            "SELECT * FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        respondJson(['success' => true, 'application' => formatApplication($row)]);
    }

    // ── submit ──────────────────────────────────────────────────────────────
    if ($action === 'submit') {
        if ($role !== 'kilpailujohtaja') {
            respondJson(['error' => 'Ei oikeuksia.'], 403);
        }

        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            respondJson(['error' => 'ID puuttuu.'], 400);
        }

        $current = $pdo->query(
            "SELECT * FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        if (!$current) {
            respondJson(['error' => 'Hakemusta ei löydy.'], 404);
        }

        if (!in_array($current['status'], ['avoin', 'hylatty'], true)) {
            respondJson(['error' => 'Hakemusta ei voi lähettää tässä tilassa.'], 403);
        }

        // Validoi pakolliset kentät
        $errors = validateRequiredFields($input + $current);
        if ($errors) {
            respondJson(['error' => 'Pakollisia kenttiä puuttuu.', 'fields' => $errors], 422);
        }

        $now = date('Y-m-d H:i:s');
        $kjComment = trim((string) ($input['kilpailunjohtaja_comment'] ?? (string) ($current['kilpailunjohtaja_comment'] ?? '')));

        $pdo->prepare(
            'UPDATE kilpailukalenteri
             SET status = ?, submitted_at = ?, updated_at = ?, kilpailunjohtaja_comment = ?
             WHERE id = ?'
        )->execute(['liitto_kasittelee', $now, $now, $kjComment, $id]);

        $row = $pdo->query(
            "SELECT * FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        respondJson(['success' => true, 'application' => formatApplication($row)]);
    }

    // ── approve ─────────────────────────────────────────────────────────────
    if ($action === 'approve') {
        if ($role !== 'liitto') {
            respondJson(['error' => 'Ei oikeuksia.'], 403);
        }

        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            respondJson(['error' => 'ID puuttuu.'], 400);
        }

        $comment = trim((string) ($input['liitto_comment'] ?? ''));
        if ($comment === '') {
            respondJson(['error' => 'Kommentti on pakollinen hyväksynnässä.'], 422);
        }

        $current = $pdo->query(
            "SELECT status FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        if (!$current) {
            respondJson(['error' => 'Hakemusta ei löydy.'], 404);
        }

        if ($current['status'] !== 'liitto_kasittelee') {
            respondJson(['error' => 'Hakemus ei ole käsittelyssä.'], 403);
        }

        $now = date('Y-m-d H:i:s');
        $pdo->prepare(
            'UPDATE kilpailukalenteri
             SET status = ?, reviewed_at = ?, updated_at = ?, liitto_comment = ?
             WHERE id = ?'
        )->execute(['hyvaksytty', $now, $now, $comment, $id]);

        $row = $pdo->query(
            "SELECT * FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        respondJson(['success' => true, 'application' => formatApplication($row)]);
    }

    // ── reject ──────────────────────────────────────────────────────────────
    if ($action === 'reject') {
        if ($role !== 'liitto') {
            respondJson(['error' => 'Ei oikeuksia.'], 403);
        }

        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            respondJson(['error' => 'ID puuttuu.'], 400);
        }

        $comment = trim((string) ($input['liitto_comment'] ?? ''));
        if ($comment === '') {
            respondJson(['error' => 'Kommentti on pakollinen hylkäyksessä.'], 422);
        }

        $current = $pdo->query(
            "SELECT status FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        if (!$current) {
            respondJson(['error' => 'Hakemusta ei löydy.'], 404);
        }

        if ($current['status'] !== 'liitto_kasittelee') {
            respondJson(['error' => 'Hakemus ei ole käsittelyssä.'], 403);
        }

        $now = date('Y-m-d H:i:s');
        $pdo->prepare(
            'UPDATE kilpailukalenteri
             SET status = ?, reviewed_at = ?, updated_at = ?, liitto_comment = ?
             WHERE id = ?'
        )->execute(['hylatty', $now, $now, $comment, $id]);

        $row = $pdo->query(
            "SELECT * FROM kilpailukalenteri WHERE id = {$id}"
        )->fetch();

        respondJson(['success' => true, 'application' => formatApplication($row)]);
    }

    respondJson(['error' => 'Tuntematon toiminto.'], 400);
}

// ── DELETE ─────────────────────────────────────────────────────────────────

if ($method === 'DELETE') {
    $role = trim((string) ($_GET['role'] ?? ''));
    $id   = (int) ($_GET['id'] ?? 0);

    if ($role !== 'kilpailujohtaja') {
        respondJson(['error' => 'Ei oikeuksia.'], 403);
    }

    if ($id <= 0) {
        respondJson(['error' => 'ID puuttuu.'], 400);
    }

    $current = $pdo->query(
        "SELECT status FROM kilpailukalenteri WHERE id = {$id}"
    )->fetch();

    if (!$current) {
        respondJson(['error' => 'Hakemusta ei löydy.'], 404);
    }

    if (!in_array($current['status'], ['avoin', 'hylatty'], true)) {
        respondJson(['error' => 'Hakemusta ei voi poistaa tässä tilassa.'], 403);
    }

    $pdo->prepare('DELETE FROM kilpailukalenteri WHERE id = ?')->execute([$id]);

    respondJson(['success' => true]);
}

respondJson(['error' => 'Metodia ei tueta.'], 405);
