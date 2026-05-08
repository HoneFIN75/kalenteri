<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

try {
    $pdo->query('SELECT 1');
    echo json_encode(['ok' => true, 'message' => 'Tietokantayhteys toimii.'], JSON_UNESCAPED_UNICODE);
} catch (PDOException $exception) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Tietokantakysely epäonnistui.'], JSON_UNESCAPED_UNICODE);
    exit;
}
