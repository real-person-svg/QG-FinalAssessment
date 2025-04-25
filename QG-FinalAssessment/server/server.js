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

// 处理注册请求
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // 简单的密码强度验证，例如密码长度至少为 6
  if (password.length < 6) {
    return res.json({ success: false, message: '密码长度至少为 6 位' });
  }

  // 检查用户名是否已存在
  const checkUsernameQuery = 'SELECT * FROM users WHERE username =?';
  connection.query(checkUsernameQuery, [username], (err, results) => {
    if (err) {
      console.error('Error checking username: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (results.length > 0) {
      return res.json({ success: false, message: '用户名已存在' });
    }

    // 插入新用户到数据库
    const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?,?)';
    connection.query(insertUserQuery, [username, password], (err, result) => {
      if (err) {
        console.error('Error inserting user: ' + err.stack);
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      res.json({ success: true, message: '注册成功' });
    });
  });
});

// 处理登录请求
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const checkUserQuery = 'SELECT * FROM users WHERE username =? AND password =?';
  connection.query(checkUserQuery, [username, password], (err, results) => {
    if (err) {
      console.error('Error checking user: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (results.length > 0) {
      res.json({ success: true, message: '登录成功' });
    } else {
      res.json({ success: false, message: '用户名或密码错误' });
    }
  });
});

// app.post('/logout', (req, res) => {
//   res.json({ success: true, message: '退出登录成功' });
// });

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
app.get('/getQuestionnaire', (req, res) => {
  const { user_id, questionnaires_count } = req.query;

  // 获取特定问卷的问题数据
  const selectQuestionsQuery = 'SELECT content, position_x, position_y, width, height, borderRadius FROM questions WHERE user_id =? AND questionnaire_order =?';
  connection.query(selectQuestionsQuery, [user_id, questionnaires_count], (err, results) => {
    if (err) {
      console.error('Error getting questionnaire questions: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    res.json({ success: true, questions: results });
  });
});

// 处理问卷提交请求
app.post('/submitQuestionnaire', (req, res) => {
  const { username, questions } = req.body;

  // 获取用户 ID
  const getUserQuery = 'SELECT id FROM users WHERE username =?';
  connection.query(getUserQuery, [username], (err, userResults) => {
    if (err) {
      console.error('Error getting user ID: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 获取当前用户的问卷数量
    const getQuestionnairesCountQuery = 'SELECT COUNT(*) as count FROM questionnaires WHERE user_id =?';
    connection.query(getQuestionnairesCountQuery, [userId], (err, countResults) => {
      if (err) {
        console.error('Error getting questionnaires count: ' + err.stack);
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      const questionnairesCount = countResults[0].count + 1;

      // 插入问卷信息
      const insertQuestionnaireQuery = 'INSERT INTO questionnaires (user_id, questionnaires_count) VALUES (?,?)';
      connection.query(insertQuestionnaireQuery, [userId, questionnairesCount], (err, questionnaireResult) => {
        if (err) {
          console.error('Error inserting questionnaire: ' + err.stack);
          return res.status(500).json({ success: false, message: '服务器错误' });
        }
        const questionnaireId = questionnaireResult.insertId;

        // 插入问题信息
        const insertQuestionQueries = questions.map(question => {
          const { content, positionX, positionY, width, height, borderRadius } = question;
          return new Promise((resolve, reject) => {
            const insertQuestionQuery = 'INSERT INTO questions (user_id, questionnaire_order, content, position_x, position_y, width, height, borderRadius) VALUES (?,?,?,?,?,?,?,?)';
            // 使用 questionnaires_count 作为 questionnaire_order 的值
            connection.query(insertQuestionQuery, [userId, questionnairesCount, content, positionX, positionY, width, height, borderRadius], (err, questionResult) => {
              if (err) {
                reject(err);
              } else {
                resolve(questionResult);
              }
            });
          });
        });

        Promise.all(insertQuestionQueries)
          .then(() => {
            res.json({ success: true, message: '问卷提交成功' });
          })
          .catch(err => {
            console.error('Error inserting questions: ' + err.stack);
            res.status(500).json({ success: false, message: '服务器错误' });
          });
      });
    });
  });
});

// 处理获取特定用户的问卷数据请求
app.get('/getUserQuestionnaires', (req, res) => {
  const username = req.query.username;

  // 获取用户 ID
  const getUserQuery = 'SELECT id FROM users WHERE username =?';
  connection.query(getUserQuery, [username], (err, userResults) => {
    if (err) {
      console.error('Error getting user ID: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 获取特定用户的问卷数据
    const selectQuestionnairesQuery = 'SELECT user_id, questionnaires_count, view_count FROM questionnaires WHERE user_id =?';
    connection.query(selectQuestionnairesQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error getting user questionnaires: ' + err.stack);
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      res.json({ success: true, questionnaires: results });
    });
  });
});

// 处理更新问卷数据请求
app.post('/updateQuestionnaire', (req, res) => {
  const { user_id, questionnaires_count, questions } = req.body;

  // 删除原有的问题数据
  const deleteQuestionsQuery = 'DELETE FROM questions WHERE user_id =? AND questionnaire_order =?';
  connection.query(deleteQuestionsQuery, [user_id, questionnaires_count], (err, result) => {
    if (err) {
      console.error('Error deleting questions: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }

    // 插入新的问题数据
    const insertQuestionQueries = questions.map(question => {
      const { content, positionX, positionY, width, height, borderRadius } = question;
      return new Promise((resolve, reject) => {
        const insertQuestionQuery = 'INSERT INTO questions (user_id, questionnaire_order, content, position_x, position_y, width, height, borderRadius) VALUES (?,?,?,?,?,?,?,?)';
        connection.query(insertQuestionQuery, [user_id, questionnaires_count, content, positionX, positionY, width, height, borderRadius], (err, questionResult) => {
          if (err) {
            reject(err);
          } else {
            resolve(questionResult);
          }
        });
      });
    });

    Promise.all(insertQuestionQueries)
      .then(() => {
        res.json({ success: true, message: '问卷更新成功' });
      })
      .catch(err => {
        console.error('Error inserting questions: ' + err.stack);
        res.status(500).json({ success: false, message: '服务器错误' });
      });
  });
});

// 处理获取用户信息请求
app.get('/getUserInfo', (req, res) => {
  const username = req.query.username;

  // 获取用户 ID
  const getUserQuery = 'SELECT id FROM users WHERE username =?';
  connection.query(getUserQuery, [username], (err, userResults) => {
    if (err) {
      console.error('Error getting user ID: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 获取用户信息
    const selectUserInfoQuery = 'SELECT username, password, profile FROM users WHERE id =?';
    connection.query(selectUserInfoQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error getting user info: ' + err.stack);
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      res.json({ success: true, userInfo: results[0] });
    });
  });
});

// 处理保存用户简介请求
app.post('/saveUserProfile', (req, res) => {
  const { username, profile } = req.body;

  // 获取用户 ID
  const getUserQuery = 'SELECT id FROM users WHERE username =?';
  connection.query(getUserQuery, [username], (err, userResults) => {
    if (err) {
      console.error('Error getting user ID: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (userResults.length === 0) {
      return res.json({ success: false, message: '未找到用户' });
    }
    const userId = userResults[0].id;

    // 更新用户简介
    const updateProfileQuery = 'UPDATE users SET profile =? WHERE id =?';
    connection.query(updateProfileQuery, [profile, userId], (err, result) => {
      if (err) {
        console.error('Error updating user profile: ' + err.stack);
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      res.json({ success: true, message: '简介保存成功' });
    });
  });
});

// 处理更新问卷浏览次数请求
app.post('/updateViewCount', (req, res) => {
  const { user_id, questionnaires_count } = req.query;

  // 更新问卷的浏览次数
  const updateViewCountQuery = 'UPDATE questionnaires SET view_count = view_count + 1 WHERE user_id =? AND questionnaires_count =?';
  connection.query(updateViewCountQuery, [user_id, questionnaires_count], (err, result) => {
    if (err) {
      console.error('Error updating view count: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    res.json({ success: true, message: '浏览次数更新成功' });
  });
});

// 处理获取 view_count 最高的三组问卷数据请求
app.get('/getTopViewedQuestionnaires', (req, res) => {
  const selectTopQuestionnairesQuery = 'SELECT user_id, questionnaires_count, view_count FROM questionnaires ORDER BY view_count DESC LIMIT 3';
  connection.query(selectTopQuestionnairesQuery, (err, results) => {
    if (err) {
      console.error('Error getting top viewed questionnaires: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    res.json({ success: true, questionnaires: results });
  });
});

// 处理修改用户密码请求
app.post('/changePassword', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  // 简单的密码强度验证，例如密码长度至少为 6
  if (newPassword.length < 6) {
    return res.json({ success: false, message: '新密码长度至少为 6 位' });
  }

  // 检查旧密码是否正确
  const checkOldPasswordQuery = 'SELECT * FROM users WHERE username =? AND password =?';
  connection.query(checkOldPasswordQuery, [username, oldPassword], (err, results) => {
    if (err) {
      console.error('Error checking old password: ' + err.stack);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (results.length === 0) {
      return res.json({ success: false, message: '旧密码错误' });
    }

    // 更新用户密码
    const updatePasswordQuery = 'UPDATE users SET password =? WHERE username =?';
    connection.query(updatePasswordQuery, [newPassword, username], (err, result) => {
      if (err) {
        console.error('Error updating password: ' + err.stack);
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      if (result.affectedRows > 0) {
        res.json({ success: true, message: '密码修改成功' });
      } else {
        res.json({ success: false, message: '密码修改失败，请稍后重试' });
      }
    });
  });
});

// 在 server.js 中添加全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});