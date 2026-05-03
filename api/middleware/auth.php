<?php
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(
        strtr($data, '-_', '+/'),
        strlen($data) % 4,
        '=', STR_PAD_RIGHT
    ));
}

function generateToken($payload) {
    $payload['exp'] = time() + 86400; // 24h
    $header    = base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $body      = base64url_encode(json_encode($payload));
    $signature = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$signature";
}

function verifyToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    [$header, $body, $signature] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    if (!hash_equals($signature, $expected)) return false;
    $data = json_decode(base64url_decode($body), true);
    if (!$data || $data['exp'] < time()) return false;
    return $data;
}

function getAuthUser() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/i', $auth, $m)) return null;
    return verifyToken($m[1]);
}

function requireAuth() {
    $user = getAuthUser();
    if (!$user) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No valid token provided']);
        exit();
    }
    return $user;
}

function requireAdmin() {
    $user = requireAuth();
    if (empty($user['isAdmin'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }
    return $user;
}