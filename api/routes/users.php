<?php
function handleUsers($method, $id, $sub, $input) {
    // POST /users/register
    if ($method === 'POST' && $id === 'register') {
        $username = trim($input['username'] ?? '');
        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$email || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username, email, and password are required']);
            return;
        }

        $existing = dbQuery('SELECT id FROM users WHERE username = ? OR email = ?', [$username, $email]);
        if ($existing) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Username or email already exists']);
            return;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $ip   = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt = dbExecute(
            'INSERT INTO users (username, email, password_hash, ip_address) VALUES (?, ?, ?, ?)',
            [$username, $email, $hash, $ip]
        );
        $userId = getDB()->lastInsertId();
        $token  = generateToken(['id' => $userId, 'username' => $username, 'isAdmin' => false]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'User registered successfully',
            'token'   => $token,
            'user'    => ['id' => $userId, 'username' => $username, 'email' => $email]
        ]);
        return;
    }

    // POST /users/login
    if ($method === 'POST' && $id === 'login') {
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username and password are required']);
            return;
        }

        $users = dbQuery(
            'SELECT id, username, email, password_hash, is_flagged, false_report_count FROM users WHERE username = ? OR email = ?',
            [$username, $username]
        );

        if (!$users || !password_verify($password, $users[0]['password_hash'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            return;
        }

        $user = $users[0];
        $ip   = $_SERVER['REMOTE_ADDR'] ?? '';
        dbExecute('UPDATE users SET last_login = NOW(), ip_address = ? WHERE id = ?', [$ip, $user['id']]);

        $token = generateToken(['id' => $user['id'], 'username' => $user['username'], 'isAdmin' => false]);
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'token'   => $token,
            'user'    => [
                'id'               => $user['id'],
                'username'         => $user['username'],
                'email'            => $user['email'],
                'isFlagged'        => (bool)$user['is_flagged'],
                'falseReportCount' => $user['false_report_count']
            ]
        ]);
        return;
    }

    // GET /users/profile
    if ($method === 'GET' && $id === 'profile') {
        $auth  = requireAuth();
        $users = dbQuery(
            'SELECT id, username, email, ip_address, false_report_count, is_flagged, created_at FROM users WHERE id = ?',
            [$auth['id']]
        );
        if (!$users) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'User not found']); return; }
        echo json_encode(['success' => true, 'user' => $users[0]]);
        return;
    }

    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
}