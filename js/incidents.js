// incident.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/incidents/map/markers — MUST be before /:id
router.get('/map/markers', async (req, res) => {
    try {
        const incidents = await query(
            'SELECT id, title, latitude, longitude, status, priority, category, reported_at FROM HazardEye_reports ORDER BY reported_at DESC'
        );
        res.json({ success: true, markers: incidents });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching map markers' });
    }
});

// POST /api/incidents
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, description, latitude, longitude, locationAddress, category, priority } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;

        if (!title || !description || !latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Title, description, and location are required' });
        }

        const result = await query(
            `INSERT INTO HazardEye_reports (title, description, latitude, longitude, location_address, category, priority, user_id, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, latitude, longitude, locationAddress || null, category || 'General', priority || 'Medium', req.user.id, ipAddress]
        );

        res.status(201).json({ success: true, message: 'Incident report created successfully', incidentId: result.insertId });
    } catch (error) {
        console.error('Create incident error:', error);
        res.status(500).json({ success: false, message: 'Server error creating incident report' });
    }
});

// GET /api/incidents
router.get('/', async (req, res) => {
    try {
        const { status, category, priority, limit = 100 } = req.query;
        let sql = `SELECT ir.*, u.username, u.is_flagged as user_flagged FROM HazardEye_reports ir LEFT JOIN users u ON ir.user_id = u.id WHERE 1=1`;
        const params = [];

        if (status) { sql += ' AND ir.status = ?'; params.push(status); }
        if (category) { sql += ' AND ir.category = ?'; params.push(category); }
        if (priority) { sql += ' AND ir.priority = ?'; params.push(priority); }
        sql += ' ORDER BY ir.reported_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const incidents = await query(sql, params);
        res.json({ success: true, count: incidents.length, incidents });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching incidents' });
    }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
    try {
        const incidents = await query(
            `SELECT ir.*, u.username, u.email as user_email, u.is_flagged as user_flagged
            FROM HazardEye_reports ir LEFT JOIN users u ON ir.user_id = u.id WHERE ir.id = ?`,
            [req.params.id]
        );
        if (incidents.length === 0) return res.status(404).json({ success: false, message: 'Incident not found' });

        const actions = await query(
            `SELECT aa.*, a.username as admin_username, a.full_name as admin_name
            FROM admin_actions aa LEFT JOIN admins a ON aa.admin_id = a.id
            WHERE aa.incident_id = ? ORDER BY aa.action_timestamp DESC`,
            [req.params.id]
        );
        res.json({ success: true, incident: incidents[0], adminActions: actions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching incident' });
    }
});

// PUT /api/incidents/:id
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, adminNotes } = req.body;

        const currentIncident = await query('SELECT * FROM HazardEye_reports WHERE id = ?', [id]);
        if (currentIncident.length === 0) return res.status(404).json({ success: false, message: 'Incident not found' });

        const incident = currentIncident[0];
        const updates = [];
        const params = [];

        if (status && status !== incident.status) {
            updates.push('status = ?');
            params.push(status);
            await query(
                `INSERT INTO admin_actions (incident_id, admin_id, action_type, old_value, new_value) VALUES (?, ?, 'Status Change', ?, ?)`,
                [id, req.user.id, incident.status, status]
            );
            if (status === 'Resolved') updates.push('resolved_at = NOW()');
            if (status === 'False Report' && incident.user_id) {
                await query('UPDATE users SET false_report_count = false_report_count + 1 WHERE id = ?', [incident.user_id]);
                const userCheck = await query('SELECT false_report_count FROM users WHERE id = ?', [incident.user_id]);
                if (userCheck[0].false_report_count >= 3) {
                    await query('UPDATE users SET is_flagged = true WHERE id = ?', [incident.user_id]);
                }
            }
        }

        if (priority && priority !== incident.priority) {
            updates.push('priority = ?');
            params.push(priority);
            await query(
                `INSERT INTO admin_actions (incident_id, admin_id, action_type, old_value, new_value) VALUES (?, ?, 'Priority Change', ?, ?)`,
                [id, req.user.id, incident.priority, priority]
            );
        }

        if (adminNotes) {
            updates.push('admin_notes = ?');
            params.push(adminNotes);
            await query(
                `INSERT INTO admin_actions (incident_id, admin_id, action_type, notes) VALUES (?, ?, 'Note Added', ?)`,
                [id, req.user.id, adminNotes]
            );
        }

        if (updates.length === 0) return res.status(400).json({ success: false, message: 'No valid updates provided' });

        params.push(id);
        await query(`UPDATE HazardEye_reports SET ${updates.join(', ')} WHERE id = ?`, params);
        res.json({ success: true, message: 'Incident updated successfully' });
    } catch (error) {
        console.error('Update incident error:', error);
        res.status(500).json({ success: false, message: 'Server error updating incident' });
    }
});

// DELETE /api/incidents/:id
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await query('DELETE FROM HazardEye_reports WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Incident not found' });
        res.json({ success: true, message: 'Incident deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error deleting incident' });
    }
});