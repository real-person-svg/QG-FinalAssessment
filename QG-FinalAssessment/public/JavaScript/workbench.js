// 获取 URL 参数
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function deleteTransparentBoxes() {
  const dropzone = document.querySelector('.location');
  const transparentBoxes = dropzone.querySelectorAll('.drop-item[style*="opacity: 0.4"]');
  transparentBoxes.forEach(box => {
    // 添加过渡效果
    box.style.transition = 'opacity 0.3s ease';
    box.style.opacity = '0';
    // 过渡结束后移除元素
    box.addEventListener('transitionend', () => {
      dropzone.removeChild(box);
    }, { once: true });
  });
}

function sortDropItems() {
  const dropzone = document.querySelector('.location');
  const dropItems = Array.from(dropzone.querySelectorAll('.drop-item'));

  dropItems.sort((a, b) => {
    const indexA = parseInt(a.dataset.originalIndex);
    const indexB = parseInt(b.dataset.originalIndex);
    return indexA - indexB;
  });

  dropItems.forEach(item => {
    dropzone.appendChild(item);
  });
}

let isleave = false;

// 监听页面缩放事件
window.addEventListener('resize', function () {
  const ratio = window.devicePixelRatio;
  const clickRecycle = document.querySelector('.click-recycle');
  const rightPanel = document.querySelector('.right-panel');
  console.log(ratio);
  if (ratio > 2) {
    clickRecycle.style.visibility = 'visible';
    rightPanel.style.position = 'absolute';
    rightPanel.classList.add('hidden-right-panel');
    const theight = document.querySelector('body').offsetHeight;
    rightPanel.style.height = `${theight}px`;
  } else {
    clickRecycle.style.visibility = 'hidden';
    rightPanel.style.position = 'static';
    rightPanel.classList.remove('hidden-right-panel');
  }
});

// 处理 click-recycle 的点击事件
document.querySelector('.click-recycle').addEventListener('click', function () {
  const rightPanel = document.querySelector('.right-panel');
  rightPanel.classList.toggle('show');
});

// 页面加载时触发一次缩放事件
window.dispatchEvent(new Event('resize'));

function setupItem(elementItem) {
  elementItem.draggable = true;
  elementItem.addEventListener('dragstart', dragItemStart);
  elementItem.addEventListener('dragover', dragItemOver);
  elementItem.addEventListener('dragenter', dragItemEnter);
  elementItem.addEventListener('dragend', ()=>{
    if(!isleave){
      elementItem.style.opacity = '1';
    }
  });
  elementItem.addEventListener('dragleave', dragItemLeave);

  // 添加删除按钮
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '删除';
  deleteButton.classList.add('change-btn');
  deleteButton.addEventListener('click', () => {
    deleteQuestion(elementItem);
  });
  elementItem.appendChild(deleteButton);

  // 添加调整宽、高和圆角的操作手柄
  const handles = [
    'resize-handle-bottom-right',
    'resize-handle-roundness'
  ];

  handles.forEach(handleClass => {
    const handle = document.createElement('div');
    handle.classList.add('resize-handle', handleClass);
    handle.style.display = 'none';
    handle.addEventListener('mousedown', (e) => startResize(e, elementItem, handleClass));
    elementItem.appendChild(handle);
  });

  // 添加双击事件监听器
  addDoubleClickEvent(elementItem);
}

window.addEventListener('load', async () => {
  const user_id = getUrlParameter('user_id');
  const questionnaires_count = getUrlParameter('questionnaires_count');

  if (user_id && questionnaires_count) {
    try {
      const response = await fetch(`http://localhost:3000/getQuestionnaire?user_id=${user_id}&questionnaires_count=${questionnaires_count}`);
      const data = await response.json();

      if (data.success) {
        const questions = data.questions;
        const dropzone = document.querySelector('.location');
        const hintElement = dropzone.querySelector('p:has(i.fa-solid.fa-arrows-up-down-left-right)');
        if (hintElement) {
          dropzone.removeChild(hintElement);
          dropzone.classList.remove('question-dropzone');
          dropzone.classList.add('question-dropzoned');
        }

        questions.forEach(question => {
          const p = document.createElement('p');
          p.classList.add('drop-item');
          p.textContent = question.content;

          // 设置宽高和圆角
          p.style.width = (question.width / 7.83)+ '%';
          p.style.height = question.height + 'px';
          p.style.borderRadius = question.borderRadius;

          setupItem(p);
          dropzone.appendChild(p);
        });
      }
    } catch (error) {
      console.error('Error getting questionnaire:', error);
    }
  }
});

function dragStart(event) {
  event.dataTransfer.setData("text", event.target.dataset.type);
}

function dragOver(event) {
  event.preventDefault();
}

function drop(event) {
  event.preventDefault();
  const data = event.dataTransfer.getData("text");
  const dropzone = document.querySelector('.location');
  const hintElement = dropzone.querySelector('p:has(i.fa-solid.fa-arrows-up-down-left-right)');
  const target = event.target;

  if (hintElement) {
    dropzone.removeChild(hintElement);
    dropzone.classList.remove('question-dropzone');
    dropzone.classList.add('question-dropzoned');
  }

  if (target.classList.contains('drop-item')) {
    // 如果目标元素是 drop-item，替换其文字内容
    target.textContent = `这是一道${data}题`;
    target.style.backgroundColor = '';
    setupItem(target);
  } else {
    const p = document.createElement('p');
    p.classList.add('drop-item');
    p.textContent = `这是一道${data}题`;
    setupItem(p);
    dropzone.appendChild(p);
    // 记录题型在原位置的索引
    const index = Array.from(dropzone.children).indexOf(p);
    p.dataset.originalIndex = index;
  }
}

function deleteQuestion(questionElement) {
  // 添加过渡效果
  questionElement.style.transition = 'opacity 0.3s ease';
  questionElement.style.opacity = '0';
  // 过渡结束后移除元素
  questionElement.addEventListener('transitionend', () => {
    const dropzone = document.querySelector('.location');

    dropzone.removeChild(questionElement);

    // 移除删除按钮
    const deleteButton = questionElement.querySelector('button');
    questionElement.removeChild(deleteButton);

    // 添加复原按钮
    const restoreButton = document.createElement('button');
    restoreButton.classList.add('change-btn');
    restoreButton.textContent = '复原';
    restoreButton.addEventListener('click', () => {
      restoreQuestion(questionElement);
    });
    questionElement.appendChild(restoreButton);

    // 移除调整宽、高和圆角的操作手柄及其事件监听器
    const handles = questionElement.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      handle.removeEventListener('mousedown', startResize);
      questionElement.removeChild(handle);
    });

    // 移除双击事件监听器
    questionElement.removeEventListener('dblclick', doubleClickHandler);

    // 将题目添加到回收站
    const recycleBin = document.getElementById('recycle-bin');
    recycleBin.appendChild(questionElement);
    questionElement.style.opacity = '1';

    //改变进入回收站的题型的样式
    questionElement.style.width = 'initial';
    questionElement.style.height = 'initial';
    questionElement.style.borderRadius = '15px';
  }, { once: true });
}

function restoreQuestion(questionElement) {
  questionElement.style.transition = 'opacity 0.3s ease';
  questionElement.style.opacity = '0';

  questionElement.addEventListener('transitionend', () => {
    const dropzone = document.querySelector('.location');
    const recycleBin = document.getElementById('recycle-bin');

    // 获取原位置索引
    const originalIndex = parseInt(questionElement.dataset.originalIndex);

    // 移除复原按钮
    const restoreButton = questionElement.querySelector('button');
    questionElement.removeChild(restoreButton);

    // 添加删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('change-btn');
    deleteButton.textContent = '删除';
    deleteButton.addEventListener('click', () => {
      deleteQuestion(questionElement);
    });
    questionElement.appendChild(deleteButton);

    // 将题目从回收站移除
    recycleBin.removeChild(questionElement);

    // 将题目插入到原位置
    if (originalIndex < Array.from(dropzone.children).length) {
      dropzone.insertBefore(questionElement, dropzone.children[originalIndex]);
    } else {
      dropzone.appendChild(questionElement);
    }

    // 添加调整宽、高和圆角的操作手柄
    const handles = [
      'resize-handle-bottom-right',
      'resize-handle-roundness'
    ];

    handles.forEach(handleClass => {
      const handle = document.createElement('div');
      handle.classList.add('resize-handle', handleClass);
      handle.style.display = 'none';
      handle.addEventListener('mousedown', (e) => startResize(e, questionElement, handleClass));
      questionElement.appendChild(handle);
    });

    // 添加双击事件监听器
    addDoubleClickEvent(questionElement);

    //改变出回收站的题型的样式
    questionElement.style.width = '100%';
    questionElement.style.height = 'initial';
    questionElement.style.borderRadius = '15px';
    questionElement.style.opacity = '1';

    sortDropItems();
  }, { once: true });
}

function goBackToMainPage() {
  window.location.href = 'main.html';
}

function startResize(event, element, handleClass) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = parseInt(getComputedStyle(element).width, 10);
  const startHeight = parseInt(getComputedStyle(element).height, 10);
  const startRoundness = parseInt(getComputedStyle(element).borderRadius, 10);

  const dropzone = document.querySelector('.location');
  const otherElements = Array.from(dropzone.children).filter(child => child !== element);

  const guideLine = document.createElement('div');
  guideLine.classList.add('guide-line');
  document.body.appendChild(guideLine);

  const onMouseMove = (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    switch (handleClass) {
      case 'resize-handle-bottom-right':
        element.style.width = (startWidth + dx) + 'px';
        element.style.maxWidth = '99.5%';
        element.style.height = (startHeight + dy) + 'px';
        // 检测吸附对齐
        const rect = element.getBoundingClientRect();
        otherElements.forEach(otherElement => {
          const otherRect = otherElement.getBoundingClientRect();
          const tolerance = 5; // 吸附公差
          // 检测当前元素右边与其他元素右边的对齐情况
          if (Math.abs(rect.right - otherRect.right) <= tolerance) {
            showGuideLine(guideLine, otherRect.right);
          } else {
            hideGuideLine(guideLine);
          }
        });
        break;
      case 'resize-handle-roundness':
        element.style.borderRadius = (startRoundness + dy) + 'px';
        break;
    }
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    hideGuideLine(guideLine);
    document.body.removeChild(guideLine);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function showGuideLine(guideLine, x) {
  guideLine.style.display = 'block';
  guideLine.style.left = x + 'px';
}

function hideGuideLine(guideLine) {
  guideLine.style.display = 'none';
}

function doubleClickHandler() {
  const handles = this.querySelectorAll('.resize-handle');
  handles.forEach(handle => {
    handle.style.display = handle.style.display === 'none' ? 'block' : 'none';
  });
}

function addDoubleClickEvent(element) {
  element.addEventListener('dblclick', doubleClickHandler);
}

function submitQuestionnaire() {
  const dropzone = document.querySelector('.location');
  const questions = [];

  dropzone.querySelectorAll('.drop-item').forEach((question) => {
    const rect = question.getBoundingClientRect();
    let content = question.textContent.replace('删除', '');
    const positionX = rect.left;
    const positionY = rect.top;
    const width = rect.width;
    const height = rect.height;
    const borderRadius = getComputedStyle(question).borderRadius;

    questions.push({
      content,
      positionX,
      positionY,
      width,
      height,
      borderRadius
    });
  });

  const username = getCookie('username');
  const user_id = getUrlParameter('user_id');
  const questionnaires_count = getUrlParameter('questionnaires_count');
  const isUpdate = getUrlParameter('isUpdate');

  let url = 'http://localhost:3000/submitQuestionnaire';
  let questionnaireData = {
    username,
    questions
  };

  if (isUpdate === 'true') {
    url = 'http://localhost:3000/updateQuestionnaire';
    questionnaireData = {
      username, 
      user_id,
      questionnaires_count,
      questions
    };
  }

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(questionnaireData)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if(data.success){
        console.log('问卷提交成功:');
        alert('问卷提交成功');
      }else{
        console.log('问卷提交失败:', data.message);
        alert('问卷提交失败: ' + data.message);
      }
    })
    .catch(error => {
      console.error('问卷提交失败:', error.message);
      alert('问卷提交失败: ' + error.message);
    });
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// 拖动 drop-item 开始事件处理函数
function dragItemStart(event) {
  const textContent = event.target.textContent.replace('这是一道', '');
  const realtextContent = textContent.replace('题删除', '');
  event.dataTransfer.setData("text", realtextContent);
  event.dataTransfer.effectAllowed = "move";
  event.target.style.opacity = '0.4';
  isleave = false;
}

// 拖动 drop-item 经过事件处理函数
function dragItemOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

// 拖动 drop-item 进入事件处理函数
function dragItemEnter(event) {
  event.preventDefault();
  event.target.style.backgroundColor = 'lightgray';
}

// 拖动 drop-item 离开事件处理函数
function dragItemLeave(event) {
  isleave = true;
  event.target.style.backgroundColor = '';
  deleteTransparentBoxes();
}