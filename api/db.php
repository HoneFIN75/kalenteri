<?php

declare(strict_types=1);

$configPath = '/home/rikman/config/db.php';

if (!is_readable($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Tietokanta-asetuksia ei löytynyt.']);
    exit;
}

$config = require $configPath;

$host = isset($config['host']) ? (string) $config['host'] : '';
$dbname = isset($config['dbname']) ? (string) $config['dbname'] : '';
$username = isset($config['username']) ? (string) $config['username'] : '';
$password = isset($config['password']) ? (string) $config['password'] : '';

if ($host === '' || $dbname === '' || $username === '') {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Tietokanta-asetukset ovat puutteelliset.']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $exception) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Tietokantayhteys epäonnistui.']);
    exit;
}
