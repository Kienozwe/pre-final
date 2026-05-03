<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit();
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/auth.php';

// Get route from PATH_INFO or _GET or REQUEST_URI
$uri = $_SERVER['PATH_INFO'] 
    ?? $_GET['route'] 
    ?? '';

// Fallback: parse from REQUEST_URI
if (empty($uri)) {
    $full = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    // Remove everything up to and including /api/index.php or /api
    $uri = preg_replace('#^.*?/api(?:/index\.php)?#', '', $full);
}

$uri   = trim($uri, '/');
$parts = array_values(array_filter(explode('/', $uri)));

$resource    = $parts[0] ?? '';
$id          = $parts[1] ?? null;
$subresource = $parts[2] ?? null;
$method      = $_SERVER['REQUEST_METHOD'];
$input       = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($resource) {
    case 'users':
        require_once __DIR__ . '/routes/users.php';
        handleUsers($method, $id, $subresource, $input);
        break;
    case 'admin':
        require_once __DIR__ . '/routes/admin.php';
        handleAdmin($method, $id, $subresource, $input);
        break;
    case 'incidents':
        require_once __DIR__ . '/routes/incidents.php';
        handleIncidents($method, $id, $subresource, $input);
        break;
    case 'health':
        echo json_encode([
            'success'   => true,
            'message'   => 'PHP API is running',
            'timestamp' => date('c'),
            'php'       => PHP_VERSION
        ]);
        break;
    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Endpoint not found',
            'uri'     => $uri,
            'full'    => $_SERVER['REQUEST_URI']
        ]);
}