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

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respondJson(['error' => 'Metodia ei tueta.'], 405);
}

// Competition types
$competitionTypes = $pdo->query(
    'SELECT id, name FROM competition_types ORDER BY id ASC'
)->fetchAll();

// Competition category options
$competitionCategories = $pdo->query(
    'SELECT id, name FROM competition_category_options ORDER BY id ASC'
)->fetchAll();

// PDGA tier options
$pdgaTiers = $pdo->query(
    'SELECT id, name FROM pdga_tier_options ORDER BY id ASC'
)->fetchAll();

// Division options
$divisions = $pdo->query(
    'SELECT id, code FROM division_options ORDER BY id ASC'
)->fetchAll();

respondJson([
    'competition_types'          => array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $competitionTypes),
    'competition_category_options' => array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $competitionCategories),
    'pdga_tier_options'          => array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $pdgaTiers),
    'division_options'           => array_map(fn($r) => ['id' => (int) $r['id'], 'code' => $r['code']], $divisions),
]);
