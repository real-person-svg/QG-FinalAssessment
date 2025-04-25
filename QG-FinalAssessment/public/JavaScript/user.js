function editProfile() {
  const profileInfo = document.getElementById('profile-info');
  const profileTextarea = document.getElementById('profile-textarea');
  const editBtn = document.querySelector('.edit-btn');
  const saveBtn = document.querySelector('.save-btn');
  const cancelBtn = document.querySelector('.cancel-btn');

  profileInfo.style.display = 'none';
  editBtn.style.display = 'none';
  profileTextarea.style.display = 'block';
  saveBtn.style.display = 'inline';
  cancelBtn.style.display = 'inline';

  profileTextarea.value = profileInfo.textContent;
}

function cancelEdit() {
  const profileInfo = document.getElementById('profile-info');
  const profileTextarea = document.getElementById('profile-textarea');
  const editBtn = document.querySelector('.edit-btn');
  const saveBtn = document.querySelector('.save-btn');
  const cancelBtn = document.querySelector('.cancel-btn');

  profileInfo.style.display = 'inline';
  editBtn.style.display = 'inline';
  profileTextarea.style.display = 'none';
  saveBtn.style.display = 'none';
  cancelBtn.style.display = 'none';
}

function goBackToMainPage() {
  window.location.href = 'main.html';
}

// 获取 cookie 中的用户名
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

const username = getCookie('username');

// 获取用户信息
async function getUserInfo() {
  try {
    const response = await fetch(`http://localhost:3000/getUserInfo?username=${username}`);
    const data = await response.json();

    if (data.success) {
      const userInfo = data.userInfo;
      const usernameElement = document.getElementById('user-info');
      const passwordElement = document.getElementById('password-info');
      const profileInfoElement = document.getElementById('profile-info');

      usernameElement.textContent = userInfo.username;
      passwordElement.textContent = userInfo.password;
      profileInfoElement.textContent = userInfo.profile || '暂无简介';
    }
  } catch (error) {
    console.error('Error getting user info:', error);
  }
}

// 保存用户简介
async function saveProfile() {
  const profileTextarea = document.getElementById('profile-textarea');
  const profile = profileTextarea.value;

  try {
    const response = await fetch('http://localhost:3000/saveUserProfile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, profile })
    });
    const data = await response.json();

    if (data.success) {
      alert('简介保存成功');
      const profileInfo = document.getElementById('profile-info');
      const editBtn = document.querySelector('.edit-btn');
      const saveBtn = document.querySelector('.save-btn');
      const cancelBtn = document.querySelector('.cancel-btn');

      profileInfo.textContent = profile;
      profileInfo.style.display = 'inline';
      editBtn.style.display = 'inline';
      profileTextarea.style.display = 'none';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

// 显示原密码和新密码输入框
function showPasswordInputs() {
  const oldPasswordInput = document.getElementById('old-password');
  const newPasswordInput = document.getElementById('new-password');
  const changePasswordBtn = document.getElementById('confirm-change-password');
  const changePassword = document.getElementById('change-password');
  const cancelChangePasswordBtn = document.getElementById('cancel-change-password-btn');

  oldPasswordInput.style.display = 'block';
  newPasswordInput.style.display = 'block';
  changePasswordBtn.style.display = 'inline';
  cancelChangePasswordBtn.style.display = 'inline';
  changePassword.style.display = 'none';
}

// 修改用户密码
async function changePassword() {
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;

  // 简单的密码验证
  if (oldPassword === '') {
    alert('请输入原密码');
    return;
  }
  if (newPassword === '') {
    alert('请输入新密码');
    return;
  }
  if (newPassword.length < 6) {
    alert('新密码长度至少为 6 位');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/changePassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, oldPassword, newPassword })
    });
    const data = await response.json();

    if (data.success) {
      alert('密码修改成功');
      // 隐藏输入框和按钮
      const oldPasswordInput = document.getElementById('old-password');
      const newPasswordInput = document.getElementById('new-password');
      const changePasswordBtn = document.getElementById('confirm-change-password');
      const cancelChangePasswordBtn = document.getElementById('cancel-change-password-btn');
      const changePassword = document.getElementById('change-password');
      oldPasswordInput.style.display = 'none';
      newPasswordInput.style.display = 'none';
      changePasswordBtn.style.display = 'none';
      cancelChangePasswordBtn.style.display = 'none';
      changePassword.style.display = 'block';
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error changing password:', error);
  }
}

// 取消更改密码
function cancelChangePassword() {
  const oldPasswordInput = document.getElementById('old-password');
  const newPasswordInput = document.getElementById('new-password');
  const changePasswordBtn = document.getElementById('confirm-change-password');
  const cancelChangePasswordBtn = document.getElementById('cancel-change-password-btn');
  const changePassword = document.getElementById('change-password');

  oldPasswordInput.style.display = 'none';
  newPasswordInput.style.display = 'none';
  changePasswordBtn.style.display = 'none';
  cancelChangePasswordBtn.style.display = 'none';
  changePassword.style.display = 'block';
  oldPasswordInput.value = '';
  newPasswordInput.value = '';
}

window.addEventListener('load', getUserInfo);