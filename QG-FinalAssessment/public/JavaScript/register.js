const form = document.querySelector('form');

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const registerData = {
    username: username,
    password: password
  };

  fetch('http://localhost:3000/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(registerData)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('注册成功:', data);
      alert('注册成功:' + data);
    })
    .catch(error => {
      console.error('注册失败:', error.message);
      alert('注册失败:' + error.message);
    });
});

function goBackToMainPage(){
  window.location.href = 'main.html';
}