// admin.js
cat > /mnt/user-data/outputs/routes/admin.js << 'EOF'
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { generateToken, verifyToken, verifyAdmin } = require('../middleware/auth');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }
        const admins = await query(
            'SELECT id, username, email, password_hash, full_name, role FROM admins WHERE username = ? OR email = ?',
            [username, username]
        );
        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }
        const admin = admins[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }
        await query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);
        const token = generateToken({ id: admin.id, username: admin.username, isAdmin: true, role: admin.role });
        res.json({
            success: true, message: 'Admin login successful', token,
            admin: { id: admin.id, username: admin.username, email: admin.email, fullName: admin.full_name, role: admin.role }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during admin login' });
    }
});

router.get('/profile', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const admins = await query(
            'SELECT id, username, email, full_name, role, created_at, last_login FROM admins WHERE id = ?',
            [req.user.id]
        );
        if (admins.length === 0) return res.status(404).json({ success: false, message: 'Admin not found' });
        res.json({ success: true, admin: admins[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching admin profile' });
    }
});

router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const totalReports = await query('SELECT COUNT(*) as count FROM HazardEye_reports');
        const statusCounts = await query('SELECT status, COUNT(*) as count FROM HazardEye_reports GROUP BY status');
        const recentReports = await query('SELECT COUNT(*) as count FROM HazardEye_reports WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
        const flaggedUsers = await query('SELECT COUNT(*) as count FROM users WHERE is_flagged = true');
        res.json({
            success: true,
            stats: {
                totalReports: totalReports[0].count,
                recentReports: recentReports[0].count,
                flaggedUsers: flaggedUsers[0].count,
                statusBreakdown: statusCounts
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching statistics' });
    }
});

router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await query(
            'SELECT id, username, email, ip_address, false_report_count, is_flagged, created_at, last_login FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching users' });
    }
});

router.patch('/users/:id/flag', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { is_flagged } = req.body;
        await query('UPDATE users SET is_flagged = ? WHERE id = ?', [is_flagged ? 1 : 0, req.params.id]);
        res.json({ success: true, message: `User ${is_flagged ? 'flagged' : 'unflagged'} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

router.get('/actions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const actions = await query(`
            SELECT aa.*, a.username as admin_username, ir.title as incident_title
            FROM admin_actions aa
            LEFT JOIN admins a ON aa.admin_id = a.id
            LEFT JOIN HazardEye_reports ir ON aa.incident_id = ir.id
            ORDER BY aa.action_timestamp DESC
        `);
        res.json({ success: true, actions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch action log' });
    }
});