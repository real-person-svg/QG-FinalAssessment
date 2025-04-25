// 获取所有链接元素
const registerLink = document.getElementById('register-link');
const loginLink = document.getElementById('login-link');
const userLink = document.getElementById('user-link');
const logoutLink = document.getElementById('logout-link');
let myCarousel; // 先声明 myCarousel，后续再赋值
let hotCarousel;

const fullPath = window.location.href;
console.log('完整路径:', fullPath);

document.querySelector('.btn-enter').addEventListener('click', (e) => {
  if (userLink.style.display === 'none') {
    e.preventDefault();
    alert('请先登录，没有账号请先注册');
  }
});

// 获取 cookie 中的用户名
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

const username = getCookie('username');
if (username) {
  registerLink.style.display = 'none';
  loginLink.style.display = 'none';
  userLink.style.display = 'inline';
  logoutLink.style.display = 'inline';
  userLink.textContent = username;
  const myCarouselElement = document.getElementById('my-carousel');
  myCarouselElement.style.display = 'block'; // 显示 my-carousel
  getAndRenderUserQuestionnaires(username); // 获取并渲染用户的问卷数据
} else {
  console.log('获取用户名失败: 未找到用户名 cookie');
  const myCarouselElement = document.getElementById('my-carousel');
  myCarouselElement.style.display = 'none'; // 隐藏 my-carousel
}

// 处理退出登录事件
logoutLink.addEventListener('click', () => {
  // 使用 document.cookie 清除 cookie
  document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=127.0.0.1;';
  console.log('退出登录成功');
  alert('退出登录成功');
  window.location.href = 'main.html';
});

// 获取 view_count 最高的三组问卷数据并渲染
async function renderHotQuestionnaires() {
  try {
    const response = await fetch('http://localhost:3000/getTopViewedQuestionnaires');
    const data = await response.json();

    if (data.success) {
      const questionnaires = data.questionnaires;
      const hotCarouselInner = document.getElementById('hot-carousel-inner');

      // 清空现有的幻灯片
      hotCarouselInner.innerHTML = '';

      if (questionnaires.length === 0) {
        // 当数据为空时，显示提示信息
        const noQuestionnaireMessage = document.createElement('div');
        noQuestionnaireMessage.textContent = '暂无问卷';
        noQuestionnaireMessage.classList.add('no-questionnaire-message'); // 可以添加自定义样式

        hotCarouselInner.appendChild(noQuestionnaireMessage);
      } else {
        const slidesData = questionnaires.map(questionnaire => {
          return {
            title: `用户id: ${questionnaire.user_id}, 问卷: ${questionnaire.questionnaires_count}`,
            count: questionnaire.view_count
          };
        });

        // 重新设置轮播图，传递实际的问卷数据
        hotCarousel = setupCarousel('hot-carousel-inner', 'hot-carousel', slidesData);
      }
    }
  } catch (error) {
    console.error('Error getting top viewed questionnaires:', error);
  }
}

window.addEventListener('load', renderHotQuestionnaires);

// 获取特定用户的问卷数据并渲染
async function getAndRenderUserQuestionnaires(username) {
  try {
    const response = await fetch(`http://localhost:3000/getUserQuestionnaires?username=${username}`);
    const data = await response.json();

    if (data.success) {
      const questionnaires = data.questionnaires;
      const myCarouselInner = document.getElementById('my-carousel-inner');

      // 清空现有的幻灯片
      myCarouselInner.innerHTML = '';

      if (questionnaires.length === 0) {
        // 当数据为空时，显示提示信息
        const noQuestionnaireMessage = document.createElement('div');
        noQuestionnaireMessage.textContent = '您暂无问卷';
        noQuestionnaireMessage.classList.add('no-questionnaire-message'); //添加提示信息的样式
        myCarouselInner.appendChild(noQuestionnaireMessage);
      } else {
        const slidesData = questionnaires.map(questionnaire => {
          return {
            title: `用户id: ${questionnaire.user_id}, 问卷: ${questionnaire.questionnaires_count}`,
            count: questionnaire.view_count
          };
        });

        // 重新设置轮播图，传递实际的问卷数据
        myCarousel = setupCarousel('my-carousel-inner', 'my-carousel', slidesData);
      }
    }
  } catch (error) {
    console.error('Error getting user questionnaires:', error);
  }
}

window.addEventListener('load', renderHotQuestionnaires);

function createSlide(slideData) {
  const slide = document.createElement('div');
  slide.classList.add('carousel-item');
  slide.innerHTML = `
    <h3 class="template-title">${slideData.title}</h3>
    <p class="template-desc"></p>
    <div class="template-stats">
      <span class="stat-value">${slideData.count}</span>
      <span class="stat-label">引用次数</span>
    </div>
  `;
  slide.addEventListener('click', async () => {
    const [user_id, questionnaires_count] = slideData.title.match(/\d+/g);
    try {
      // 发送请求更新 view_count
      await fetch(`http://localhost:3000/updateViewCount?user_id=${user_id}&questionnaires_count=${questionnaires_count}`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error updating view count:', error);
    }
    // 添加 isUpdate 参数表示是更新操作
    window.location.href = `workbench.html?user_id=${user_id}&questionnaires_count=${questionnaires_count}&isUpdate=true`;
  });
  return slide;
}

function setupCarousel(carouselId, carouselElementId, slidesData) {
  const carouselInner = document.getElementById(carouselId);
  const carouselElement = document.getElementById(carouselElementId);

  carouselInner.innerHTML = '';
  slidesData.forEach(slideData => {
    const slide = createSlide(slideData);
    carouselInner.appendChild(slide);
  });

  const slideCount = carouselInner.children.length;
  let currentSlide = 0;
  let intervalId = setInterval(nextSlide, 3000);;

  function showSlide(index) {
    const offset = -index * 100;
    carouselInner.style.transform = `translateX(${offset}%)`;
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % slideCount;
    showSlide(currentSlide);
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + slideCount) % slideCount;
    showSlide(currentSlide);
  }

  function startAutoSlide() {
    intervalId = setInterval(nextSlide, 3000);
  }

  function stopAutoSlide() {
    clearInterval(intervalId);
  }

  carouselElement.addEventListener('mouseenter', stopAutoSlide);
  carouselElement.addEventListener('mouseleave', startAutoSlide);

  //返回对象，方便后续手动更新轮播图
  return { nextSlide, prevSlide };
}

function nextSlide(carouselId) {
  if (carouselId === 'hot-carousel-inner') {
    hotCarousel.nextSlide();
  } else if (carouselId === 'my-carousel-inner') {
    myCarousel.nextSlide();
  }
}

function prevSlide(carouselId) {
  if (carouselId === 'hot-carousel-inner') {
    hotCarousel.prevSlide();
  } else if (carouselId === 'my-carousel-inner') {
    myCarousel.prevSlide();
  }
}