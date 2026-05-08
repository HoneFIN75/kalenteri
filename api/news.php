<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

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
 * @param mixed $value
 * @return array<int, string>
 */
function normalizeVisibleRoles($value, string $section): array
{
    $allowedRoles = ['admin', 'liitto', 'kilpailujohtaja', 'kilpailija', 'katsoja'];
    if (!is_array($value)) {
        return [];
    }

    $visibleRoles = [];
    foreach ($value as $roleId) {
        if (!is_string($roleId)) {
            continue;
        }
        if (!in_array($roleId, $allowedRoles, true) || $roleId === $section) {
            continue;
        }
        $visibleRoles[] = $roleId;
    }

    return array_values(array_unique($visibleRoles));
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $statement = $pdo->query('SELECT id, section, title, content, visible_roles, published_at, likes_count FROM news ORDER BY published_at DESC');
    $rows = $statement->fetchAll();

    $items = array_map(static function (array $row): array {
        $decodedRoles = json_decode((string) $row['visible_roles'], true);
        $visibleRoles = is_array($decodedRoles) ? $decodedRoles : [];

        return [
            'id' => (string) $row['id'],
            'section' => (string) $row['section'],
            'title' => (string) $row['title'],
            'content' => (string) $row['content'],
            'visibleRoles' => $visibleRoles,
            'publishedAt' => gmdate('c', strtotime((string) $row['published_at'])),
            'likesCount' => max(0, (int) $row['likes_count']),
        ];
    }, $rows);

    respondJson($items);
}

if ($method === 'POST') {
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        respondJson(['error' => 'Virheellinen JSON-data.'], 400);
    }

    $section = isset($input['section']) ? (string) $input['section'] : '';
    if (!in_array($section, ['admin', 'liitto'], true)) {
        respondJson(['error' => 'Virheellinen uutisosa.'], 400);
    }

    $title = isset($input['title']) ? trim((string) $input['title']) : '';
    $content = isset($input['content']) ? trim((string) $input['content']) : '';
    if ($title === '' || $content === '') {
        respondJson(['error' => 'Otsikko ja sisältö ovat pakollisia.'], 400);
    }

    $id = isset($input['id']) && is_string($input['id']) && $input['id'] !== ''
        ? $input['id']
        : ('news-' . bin2hex(random_bytes(16)));

    $visibleRoles = normalizeVisibleRoles($input['visibleRoles'] ?? [], $section);
    $likesCount = isset($input['likesCount']) ? max(0, (int) $input['likesCount']) : 0;

    $publishedAtInput = isset($input['publishedAt']) ? (string) $input['publishedAt'] : '';
    $publishedTimestamp = strtotime($publishedAtInput);
    if ($publishedTimestamp === false) {
        $publishedTimestamp = time();
    }
    $publishedAt = gmdate('Y-m-d H:i:s', $publishedTimestamp);

    $statement = $pdo->prepare(
        'INSERT INTO news (id, section, title, content, visible_roles, published_at, likes_count)
         VALUES (:id, :section, :title, :content, :visible_roles, :published_at, :likes_count)
         ON DUPLICATE KEY UPDATE
         section = VALUES(section),
         title = VALUES(title),
         content = VALUES(content),
         visible_roles = VALUES(visible_roles),
         published_at = VALUES(published_at),
         likes_count = VALUES(likes_count)'
    );

    $statement->execute([
        ':id' => $id,
        ':section' => $section,
        ':title' => $title,
        ':content' => $content,
        ':visible_roles' => json_encode($visibleRoles, JSON_UNESCAPED_UNICODE),
        ':published_at' => $publishedAt,
        ':likes_count' => $likesCount,
    ]);

    respondJson(['ok' => true, 'id' => $id]);
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (string) $_GET['id'] : '';
    if ($id === '') {
        respondJson(['error' => 'ID puuttuu.'], 400);
    }

    $statement = $pdo->prepare('DELETE FROM news WHERE id = :id');
    $statement->execute([':id' => $id]);

    respondJson(['ok' => true]);
}

respondJson(['error' => 'Metodia ei tueta.'], 405);
