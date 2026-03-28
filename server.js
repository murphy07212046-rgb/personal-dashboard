const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 初始化数据库
const db = new sqlite3.Database('./data.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('数据库已连接');
        initDB();
    }
});

// 创建表
function initDB() {
    db.run(`
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            date TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            category TEXT DEFAULT 'other',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// ========== 待办 API ==========

// 获取所有待办
app.get('/api/todos', (req, res) => {
    db.all('SELECT * FROM todos ORDER BY completed ASC, created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // 转换 completed 为布尔值
        const todos = rows.map(row => ({
            ...row,
            completed: !!row.completed
        }));
        res.json(todos);
    });
});

// 添加待办
app.post('/api/todos', (req, res) => {
    const { text, date, priority } = req.body;
    
    if (!text || !date) {
        res.status(400).json({ error: '文本和日期不能为空' });
        return;
    }

    db.run(
        'INSERT INTO todos (text, date, priority, completed) VALUES (?, ?, ?, 0)',
        [text, date, priority || 'medium'],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id: this.lastID,
                text,
                date,
                priority: priority || 'medium',
                completed: false
            });
        }
    );
});

// 更新待办
app.put('/api/todos/:id', (req, res) => {
    const { text, date, priority, completed } = req.body;
    const { id } = req.params;

    db.run(
        'UPDATE todos SET text = ?, date = ?, priority = ?, completed = ? WHERE id = ?',
        [text, date, priority, completed ? 1 : 0, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: '待办不存在' });
                return;
            }
            res.json({ id: parseInt(id), text, date, priority, completed });
        }
    );
});

// 删除待办
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM todos WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: '待办不存在' });
            return;
        }
        res.json({ message: '已删除', id: parseInt(id) });
    });
});

// ========== 收藏 API ==========

// 获取所有收藏
app.get('/api/bookmarks', (req, res) => {
    db.all('SELECT * FROM bookmarks ORDER BY category, created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 添加收藏
app.post('/api/bookmarks', (req, res) => {
    const { title, url, category } = req.body;
    
    if (!title || !url) {
        res.status(400).json({ error: '标题和URL不能为空' });
        return;
    }

    db.run(
        'INSERT INTO bookmarks (title, url, category) VALUES (?, ?, ?)',
        [title, url, category || 'other'],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id: this.lastID,
                title,
                url,
                category: category || 'other'
            });
        }
    );
});

// 删除收藏
app.delete('/api/bookmarks/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM bookmarks WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: '收藏不存在' });
            return;
        }
        res.json({ message: '已删除', id: parseInt(id) });
    });
});

// 统计信息
app.get('/api/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    db.get('SELECT COUNT(*) as count FROM todos WHERE completed = 0', [], (err, activeRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.get('SELECT COUNT(*) as count FROM todos WHERE completed = 1 AND date = ?', [today], (err, completedRow) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            db.get('SELECT COUNT(*) as count FROM bookmarks', [], (err, bookmarkRow) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                res.json({
                    activeTodos: activeRow.count,
                    todayCompleted: completedRow.count,
                    bookmarks: bookmarkRow.count
                });
            });
        });
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`本地访问: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('数据库连接已关闭');
        process.exit(0);
    });
});
