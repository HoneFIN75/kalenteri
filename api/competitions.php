<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

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

/**
 * Parses a date string in M/D/YYYY format to YYYY-MM-DD.
 * Returns null if the value is not a valid date in that format.
 */
function parseMDY(string $value): ?string
{
    $value = trim($value);
    if (!preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $value)) {
        return null;
    }

    [$month, $day, $year] = explode('/', $value);
    $month = (int) $month;
    $day   = (int) $day;
    $year  = (int) $year;

    if (!checkdate($month, $day, $year)) {
        return null;
    }

    return sprintf('%04d-%02d-%02d', $year, $month, $day);
}

/**
 * Returns the next calendar day in YYYY-MM-DD format (FullCalendar end is exclusive).
 */
function nextDay(string $ymd): string
{
    $ts = strtotime($ymd . ' +1 day');
    return date('Y-m-d', $ts);
}

/**
 * Collects the active class codes (non-empty values) from the division columns.
 * @param array<string,mixed> $row
 * @return list<string>
 */
function collectDivisions(array $row): array
{
    $cols = ['MPO','FPO','MP40','FP40','MP50','FP50','MP55','FP55',
             'MP60','FP60','MP65','FP65','MP70','FP70','MP75','FP75','MP80','FP80'];
    $active = [];
    foreach ($cols as $col) {
        $val = isset($row[$col]) ? trim((string) $row[$col]) : '';
        if ($val !== '') {
            $active[] = $col;
        }
    }
    return $active;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    respondJson(['error' => 'Metodia ei tueta.'], 405);
}

$statement = $pdo->query(
    "SELECT id, kilpailunnimi, aloituspvm, paatospvm, haettavakilpailu,
            jarjestaja, paikkakunta, rata, kilpailuluokat, pdgatier,
            maxpelaajamaara, vaylienmaarapk, kierrostenmaara,
            kilpailunjohtaja, kilpailunjohtajapdga,
            apukilpailunjohtaja, apukilpailunjohtajapdga,
            MPO, FPO, MP40, FP40, MP50, FP50, MP55, FP55,
            MP60, FP60, MP65, FP65, MP70, FP70, MP75, FP75, MP80, FP80,
            dgm_link
     FROM kilpailukalenteri
     WHERE status = 'hyvaksytty' OR status IS NULL
     ORDER BY id ASC"
);

$rows = $statement->fetchAll();

$events = [];

foreach ($rows as $row) {
    $startRaw = trim((string) ($row['aloituspvm'] ?? ''));
    $endRaw   = trim((string) ($row['paatospvm'] ?? ''));

    // Filter out placeholder / header rows that have no valid date
    $start = parseMDY($startRaw);
    if ($start === null) {
        continue;
    }

    $end = parseMDY($endRaw);
    // FullCalendar end is exclusive → add one day
    $endExclusive = $end !== null ? nextDay($end) : nextDay($start);

    $name = trim((string) ($row['kilpailunnimi'] ?? ''));
    if ($name === '') {
        continue;
    }

    $divisions = collectDivisions($row);

    $events[] = [
        'id'    => (string) $row['id'],
        'title' => $name,
        'start' => $start,
        'end'   => $endExclusive,
        'extendedProps' => [
            'haettavakilpailu'       => trim((string) ($row['haettavakilpailu'] ?? '')),
            'jarjestaja'             => trim((string) ($row['jarjestaja'] ?? '')),
            'paikkakunta'            => trim((string) ($row['paikkakunta'] ?? '')),
            'rata'                   => trim((string) ($row['rata'] ?? '')),
            'kilpailuluokat'         => trim((string) ($row['kilpailuluokat'] ?? '')),
            'pdgatier'               => trim((string) ($row['pdgatier'] ?? '')),
            'maxpelaajamaara'        => trim((string) ($row['maxpelaajamaara'] ?? '')),
            'vaylienmaarapk'         => trim((string) ($row['vaylienmaarapk'] ?? '')),
            'kierrostenmaara'        => trim((string) ($row['kierrostenmaara'] ?? '')),
            'kilpailunjohtaja'       => trim((string) ($row['kilpailunjohtaja'] ?? '')),
            'kilpailunjohtajapdga'   => trim((string) ($row['kilpailunjohtajapdga'] ?? '')),
            'apukilpailunjohtaja'    => trim((string) ($row['apukilpailunjohtaja'] ?? '')),
            'apukilpailunjohtajapdga'=> trim((string) ($row['apukilpailunjohtajapdga'] ?? '')),
            'divisions'              => $divisions,
            'startFormatted'         => $startRaw,
            'endFormatted'           => $endRaw,
            'dgm_link'               => trim((string) ($row['dgm_link'] ?? '')),
        ],
    ];
}

respondJson($events);
