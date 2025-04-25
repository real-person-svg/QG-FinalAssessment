const form = document.querySelector('form');

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const loginData = {
    username: username,
    password: password
  };

  fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // 允许携带 cookie
    body: JSON.stringify(loginData)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        console.log('登录成功:', data.message);
        alert('登录成功,2秒后回到主页面');
        // 使用 document.cookie 设置 cookie
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + 3600000); // 1 小时后过期
        document.cookie = `username=${username}; expires=${expirationDate.toUTCString()}; path=/; domain=127.0.0.1;`;

        // 登录成功后可以跳转到其他页面
        setTimeout(() => {
          window.location.href = 'main.html';
        }, 2000);
      } else {
        console.error('登录失败:', data.message);
        alert('登录失败:' + data.message);
      }
    })
    .catch(error => {
      console.error('登录失败:', error.message);
      alert('登录失败:' + error.message);
    });
});

function goBackToMainPage(){
  window.location.href = 'main.html';
}