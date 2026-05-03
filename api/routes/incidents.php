<?php
function handleIncidents($method, $id, $sub, $input) {

    // GET /incidents/map/markers
    if ($method === 'GET' && $id === 'map' && $sub === 'markers') {
        $markers = dbQuery('SELECT id, title, latitude, longitude, status, priority, category, reported_at FROM HazardEye_reports ORDER BY reported_at DESC');
        echo json_encode(['success' => true, 'markers' => $markers]);
        return;
    }

    // POST /incidents
    if ($method === 'POST' && !$id) {
        $auth  = getAuthUser(); // optional auth
        $title    = trim($input['title'] ?? '');
        $desc     = trim($input['description'] ?? '');
        $lat      = $input['latitude'] ?? null;
        $lng      = $input['longitude'] ?? null;
        $locAddr  = $input['locationAddress'] ?? null;
        $category = $input['category'] ?? 'General';
        $priority = $input['priority'] ?? 'Medium';
        $ip       = $_SERVER['REMOTE_ADDR'] ?? '';
        $userId   = $auth ? $auth['id'] : null;

        if (!$title || !$desc || !$lat || !$lng) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Title, description, and location are required']);
            return;
        }

        $stmt = dbExecute(
            'INSERT INTO HazardEye_reports (title, description, latitude, longitude, location_address, category, priority, user_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$title, $desc, $lat, $lng, $locAddr, $category, $priority, $userId, $ip]
        );

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Incident report created successfully', 'incidentId' => getDB()->lastInsertId()]);
        return;
    }

    // GET /incidents
    if ($method === 'GET' && !$id) {
        $status   = $_GET['status'] ?? '';
        $category = $_GET['category'] ?? '';
        $priority = $_GET['priority'] ?? '';
        $limit    = (int)($_GET['limit'] ?? 100);

        $sql    = 'SELECT ir.*, u.username, u.is_flagged as user_flagged FROM HazardEye_reports ir LEFT JOIN users u ON ir.user_id = u.id WHERE 1=1';
        $params = [];

        if ($status)   { $sql .= ' AND ir.status = ?';   $params[] = $status; }
        if ($category) { $sql .= ' AND ir.category = ?'; $params[] = $category; }
        if ($priority) { $sql .= ' AND ir.priority = ?'; $params[] = $priority; }
        $sql .= ' ORDER BY ir.reported_at DESC LIMIT ?';
        $params[] = $limit;

        $incidents = dbQuery($sql, $params);
        echo json_encode(['success' => true, 'count' => count($incidents), 'incidents' => $incidents]);
        return;
    }

    // GET /incidents/:id
    if ($method === 'GET' && $id && !$sub) {
        $incidents = dbQuery(
            'SELECT ir.*, u.username, u.email as user_email, u.is_flagged as user_flagged FROM HazardEye_reports ir LEFT JOIN users u ON ir.user_id = u.id WHERE ir.id = ?',
            [$id]
        );
        if (!$incidents) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Incident not found']); return; }

        $actions = dbQuery(
            'SELECT aa.*, a.username as admin_username, a.full_name as admin_name FROM admin_actions aa LEFT JOIN admins a ON aa.admin_id = a.id WHERE aa.incident_id = ? ORDER BY aa.action_timestamp DESC',
            [$id]
        );

        echo json_encode(['success' => true, 'incident' => $incidents[0], 'adminActions' => $actions]);
        return;
    }

    // PUT /incidents/:id
    if ($method === 'PUT' && $id) {
        $auth     = requireAdmin();
        $current  = dbQuery('SELECT * FROM HazardEye_reports WHERE id = ?', [$id]);
        if (!$current) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Incident not found']); return; }

        $incident   = $current[0];
        $updates    = [];
        $params     = [];
        $status     = $input['status'] ?? null;
        $priority   = $input['priority'] ?? null;
        $adminNotes = $input['adminNotes'] ?? null;

        if ($status && $status !== $incident['status']) {
            $updates[] = 'status = ?'; $params[] = $status;
            dbExecute("INSERT INTO admin_actions (incident_id, admin_id, action_type, old_value, new_value) VALUES (?, ?, 'Status Change', ?, ?)", [$id, $auth['id'], $incident['status'], $status]);
            if ($status === 'Resolved') $updates[] = 'resolved_at = NOW()';
            if ($status === 'False Report' && $incident['user_id']) {
                dbExecute('UPDATE users SET false_report_count = false_report_count + 1 WHERE id = ?', [$incident['user_id']]);
                $uc = dbQuery('SELECT false_report_count FROM users WHERE id = ?', [$incident['user_id']]);
                if ($uc[0]['false_report_count'] >= 3) dbExecute('UPDATE users SET is_flagged = 1 WHERE id = ?', [$incident['user_id']]);
            }
        }

        if ($priority && $priority !== $incident['priority']) {
            $updates[] = 'priority = ?'; $params[] = $priority;
            dbExecute("INSERT INTO admin_actions (incident_id, admin_id, action_type, old_value, new_value) VALUES (?, ?, 'Priority Change', ?, ?)", [$id, $auth['id'], $incident['priority'], $priority]);
        }

        if ($adminNotes) {
            $updates[] = 'admin_notes = ?'; $params[] = $adminNotes;
            dbExecute("INSERT INTO admin_actions (incident_id, admin_id, action_type, notes) VALUES (?, ?, 'Note Added', ?)", [$id, $auth['id'], $adminNotes]);
        }

        if (!$updates) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'No valid updates provided']); return; }

        $params[] = $id;
        dbExecute('UPDATE HazardEye_reports SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
        echo json_encode(['success' => true, 'message' => 'Incident updated successfully']);
        return;
    }

    // DELETE /incidents/:id
    if ($method === 'DELETE' && $id) {
        requireAdmin();
        $stmt = dbExecute('DELETE FROM HazardEye_reports WHERE id = ?', [$id]);
        if ($stmt->rowCount() === 0) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Incident not found']); return; }
        echo json_encode(['success' => true, 'message' => 'Incident deleted successfully']);
        return;
    }

    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
}