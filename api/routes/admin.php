<?php
function handleAdmin($method, $id, $sub, $input) {

    // POST /admin/login
    if ($method === 'POST' && $id === 'login') {
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username and password are required']);
            return;
        }

        $admins = dbQuery(
            'SELECT id, username, email, password_hash, full_name, role FROM admins WHERE username = ? OR email = ?',
            [$username, $username]
        );

        if (!$admins || !password_verify($password, $admins[0]['password_hash'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid admin credentials']);
            return;
        }

        $admin = $admins[0];
        dbExecute('UPDATE admins SET last_login = NOW() WHERE id = ?', [$admin['id']]);
        $token = generateToken(['id' => $admin['id'], 'username' => $admin['username'], 'isAdmin' => true, 'role' => $admin['role']]);

        echo json_encode([
            'success' => true,
            'message' => 'Admin login successful',
            'token'   => $token,
            'admin'   => [
                'id'       => $admin['id'],
                'username' => $admin['username'],
                'email'    => $admin['email'],
                'fullName' => $admin['full_name'],
                'role'     => $admin['role']
            ]
        ]);
        return;
    }

    // GET /admin/profile
    if ($method === 'GET' && $id === 'profile') {
        $auth   = requireAdmin();
        $admins = dbQuery(
            'SELECT id, username, email, full_name, role, created_at, last_login FROM admins WHERE id = ?',
            [$auth['id']]
        );
        if (!$admins) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Admin not found']); return; }
        echo json_encode(['success' => true, 'admin' => $admins[0]]);
        return;
    }

    // GET /admin/stats
    if ($method === 'GET' && $id === 'stats') {
        requireAdmin();
        $total   = dbQuery('SELECT COUNT(*) as count FROM HazardEye_reports')[0]['count'];
        $status  = dbQuery('SELECT status, COUNT(*) as count FROM HazardEye_reports GROUP BY status');
        $recent  = dbQuery('SELECT COUNT(*) as count FROM HazardEye_reports WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')[0]['count'];
        $flagged = dbQuery('SELECT COUNT(*) as count FROM users WHERE is_flagged = 1')[0]['count'];

        echo json_encode([
            'success' => true,
            'stats'   => [
                'totalReports'    => $total,
                'recentReports'   => $recent,
                'flaggedUsers'    => $flagged,
                'statusBreakdown' => $status
            ]
        ]);
        return;
    }

    // GET /admin/users
    if ($method === 'GET' && $id === 'users') {
        requireAdmin();
        $users = dbQuery('SELECT id, username, email, ip_address, false_report_count, is_flagged, created_at, last_login FROM users ORDER BY created_at DESC');
        echo json_encode(['success' => true, 'users' => $users]);
        return;
    }

    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
}