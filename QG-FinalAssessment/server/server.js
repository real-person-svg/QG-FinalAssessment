const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors'); // 引入 cors 模块

const app = express();
const port = 3000;

// 配置 MySQL 连接
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'user'
});

// 连接到 MySQL 数据库
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL database as id ' + connection.threadId);

  // 创建用户表
  const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
      )
  `;
  connection.query(createUsersTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating users table: ' + err.stack);
    } else {
      console.log('Users table created successfully');
    }
  });

  // 创建问题表,questionnaire_order是记录这是当前用户的第几份问卷的
  const createQuestionsTableQuery = `
      CREATE TABLE IF NOT EXISTS questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          questionnaire_order INT,
          content TEXT,
          position_x INT,
          position_y INT,
          width INT,
          height INT,
          borderRadius VARCHAR(20),
          FOREIGN KEY (user_id) REFERENCES users(id),
          INDEX idx_questionnaire_order (questionnaire_order)
      )
  `;
  connection.query(createQuestionsTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating questions table: ' + err.stack);
    } else {
      console.log('Questions table created successfully');
    }
  });

  // 创建问卷表，questionnaires_count是用来记录这是user_id位用户的第几份问卷的
  const createQuestionnairesTableQuery = `
      CREATE TABLE IF NOT EXISTS questionnaires (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          questionnaires_count INT,
          view_count INT DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id)
      );
  `;
  connection.query(createQuestionnairesTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating questionnaires table: ' + err.stack);
    } else {
      console.log('Questionnaires table created successfully');
    }
  });
});

app.use(bodyParser.json());
app.use(express.json());

// 修改 CORS 配置，指定具体的前端源地址
app.use(cors({
  origin: 'http://127.0.0.1:5501',
  credentials: true // 允许携带 cookie
}));

// 将数据库查询封装成 Promise 函数
const query = (sql, values) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 简单的密码强度验证，例如密码长度至少为 6
    if (password.length < 6) {
      return res.json({ success: false, message: '密码长度至少为 6 位' });
    }

    // 检查用户名是否已存在
    const results = await query('SELECT * FROM users WHERE username =?', [username]);
    if (results.length > 0) {
      return res.json({ success: false, message: '用户名已存在' });
    }

    // 插入新用户到数据库
    await query('INSERT INTO users (username, password) VALUES (?,?)', [username, password]);
    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    console.error('Error in register: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 处理登录请求
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const results = await query('SELECT * FROM users WHERE username =? AND password =?', [username, password]);
    if (results.length > 0) {
      res.json({ success: true, message: '登录成功' });
    } else {
      res.json({ success: false, message: '用户名或密码错误' });
    }
  } catch (err) {
    console.error('Error in login: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 新增路由，用于获取 cookie 中的用户名
app.get('/getUsername', (req, res) => {
  const username = req.cookies.username;
  if (username) {
    res.json({ success: true, username: username });
  } else {
    res.json({ success: false, message: '未找到用户名 cookie' });
  }
});

// 处理获取特定问卷数据请求
app.get('/getQuestionnaire', async (req, res) => {
  try {
    const { user_id, questionnaires_count } = req.query;

    // 获取特定问卷的问题数据
    const results = await query('SELECT content, position_x, position_y, width, height, borderRadius FROM questions WHERE user_id =? AND questionnaire_order =?', [user_id, questionnaires_count]);
    res.json({ success: true, questions: results });
  } catch (err) {
    console.error('Error getting questionnaire questions: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 处理问卷提交请求
app.post('/submitQuestionnaire', async (req, res) => {
  try {
    const { username, questions } = req.body;

    // 获取用户 ID
    const userResults = await query('SELECT id FROM users WHERE username =?', [username]);
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 获取当前用户的问卷数量
    const countResults = await query('SELECT COUNT(*) as count FROM questionnaires WHERE user_id =?', [userId]);
    const questionnairesCount = countResults[0].count + 1;

    // 插入问卷信息
    const questionnaireResult = await query('INSERT INTO questionnaires (user_id, questionnaires_count) VALUES (?,?)', [userId, questionnairesCount]);
    const questionnaireId = questionnaireResult.insertId;

    // 插入问题信息
    const insertQuestionQueries = questions.map(question => {
      const { content, positionX, positionY, width, height, borderRadius } = question;
      return query('INSERT INTO questions (user_id, questionnaire_order, content, position_x, position_y, width, height, borderRadius) VALUES (?,?,?,?,?,?,?,?)', [userId, questionnairesCount, content, positionX, positionY, width, height, borderRadius]);
    });

    await Promise.all(insertQuestionQueries);
    res.json({ success: true, message: '问卷提交成功' });
  } catch (err) {
    console.error('Error in submitQuestionnaire: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 处理获取特定用户的问卷数据请求
app.get('/getUserQuestionnaires', async (req, res) => {
  try {
    const username = req.query.username;

    // 获取用户 ID
    const userResults = await query('SELECT id FROM users WHERE username =?', [username]);
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 获取特定用户的问卷数据
    const results = await query('SELECT user_id, questionnaires_count, view_count FROM questionnaires WHERE user_id =?', [userId]);
    res.json({ success: true, questionnaires: results });
  } catch (err) {
    console.error('Error getting user questionnaires: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

//处理更新问卷请求
app.post('/updateQuestionnaire', async (req, res) => {
  try {
    const { username, user_id, questionnaires_count, questions } = req.body;

    // 获取用户 ID
    const getUserQuery = 'SELECT id FROM users WHERE username =?';
    const [userResults] = await query(getUserQuery, [username]);

    // 验证用户名和用户 ID 是否匹配
    if (!userResults || userResults.id !== user_id) {
      return res.json({ success: false, message: '用户名不匹配' });
    }

    // 删除原有的问题数据
    const deleteQuestionsQuery = 'DELETE FROM questions WHERE user_id =? AND questionnaire_order =?';
    await query(deleteQuestionsQuery, [user_id, questionnaires_count]);

    // 插入新的问题数据
    const insertPromises = questions.map(question => {
      const { content, positionX, positionY, width, height, borderRadius } = question;
      const insertQuestionQuery = 'INSERT INTO questions (user_id, questionnaire_order, content, position_x, position_y, width, height, borderRadius) VALUES (?,?,?,?,?,?,?,?)';
      return query(insertQuestionQuery, [user_id, questionnaires_count, content, positionX, positionY, width, height, borderRadius]);
    });

    await Promise.all(insertPromises);

    res.json({ success: true, message: '问卷更新成功' });
  } catch (error) {
    console.error('Error in updateQuestionnaire: ', error.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});   

// 处理获取用户信息请求
app.get('/getUserInfo', async (req, res) => {
  try {
    const username = req.query.username;

    // 获取用户 ID
    const userResults = await query('SELECT id FROM users WHERE username =?', [username]);
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 获取用户信息
    const results = await query('SELECT username, password, profile FROM users WHERE id =?', [userId]);
    res.json({ success: true, userInfo: results[0] });
  } catch (err) {
    console.error('Error getting user info: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 处理保存用户简介请求
app.post('/saveUserProfile', async (req, res) => {
  try {
    const { username, profile } = req.body;

    // 获取用户 ID
    const userResults = await query('SELECT id FROM users WHERE username =?', [username]);
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 更新用户简介
    await query('UPDATE users SET profile =? WHERE id =?', [profile, userId]);
    res.json({ success: true, message: '简介保存成功' });
  } catch (err) {
    console.error('Error updating user profile: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 处理更新问卷浏览次数请求
app.post('/updateViewCount', async (req, res) => {
  try {
    const { user_id, questionnaires_count } = req.query;

    // 更新问卷的浏览次数
    await query('UPDATE questionnaires SET view_count = view_count + 1 WHERE user_id =? AND questionnaires_count =?', [user_id, questionnaires_count]);
    res.json({ success: true, message: '浏览次数更新成功' });
  } catch (err) {
    console.error('Error updating view count: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 处理获取 view_count 最高的三组问卷数据请求
app.get('/getTopViewedQuestionnaires', async (req, res) => {
  try {
    const results = await query('SELECT user_id, questionnaires_count, view_count FROM questionnaires ORDER BY view_count DESC LIMIT 3');
    res.json({ success: true, questionnaires: results });
  } catch (err) {
    console.error('Error getting top viewed questionnaires: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/changePassword', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    // 简单的密码强度验证，例如密码长度至少为 6
    if (newPassword.length < 6) {
      return res.json({ success: false, message: '新密码长度至少为 6 位' });
    }

    // 检查旧密码是否正确
    const results = await query('SELECT * FROM users WHERE username =? AND password =?', [username, oldPassword]);
    if (results.length === 0) {
      return res.json({ success: false, message: '旧密码错误' });
    }

    // 更新用户密码
    const result = await query('UPDATE users SET password =? WHERE username =?', [newPassword, username]);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: '密码修改成功' });
    } else {
      res.json({ success: false, message: '密码修改失败，请稍后重试' });
    }
  } catch (err) {
    console.error('Error in changePassword: ', err.stack);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 在 server.js 中添加全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});