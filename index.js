// 全局变量
let currentUser = null;
let token = null;
let activeRide = null;
let rideInterval = null;
let currentRideRecordId = null;

// API基础URL
const API_BASE_URL = 'http://localhost:5000';

// 辅助函数
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': token } : {}) // 条件添加Authorization
  };
}

function showUserDashboard() {
  document.getElementById('user-dashboard').style.display = 'block';
  document.getElementById('admin-dashboard').style.display = 'none';
  loadUserData();
  // 隐藏登录表单
  document.querySelector('.auth-tabs').style.display = 'none';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('regist-form').style.display = 'none';
}

function showAdminDashboard() {
  document.getElementById('admin-dashboard').style.display = 'block';
  document.getElementById('user-dashboard').style.display = 'none';
  loadAdminData();
  // 隐藏登录表单
  document.querySelector('.auth-tabs').style.display = 'none';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('regist-form').style.display = 'none';
}


// 切换到登录
document.getElementById('login-tab').addEventListener('click', function () {
  // 将登录表单显示为块级元素
  document.getElementById('login-form').style.display = 'block';
  // 隐藏注册表单
  document.getElementById('regist-form').style.display = 'none';
  this.classList.add('active');
  document.getElementById('regist-tab').classList.remove('active');
})

// 切换到注册
document.getElementById('regist-tab').addEventListener('click', function () {
  // 将注册表单显示为块级元素
  document.getElementById('regist-form').style.display = 'block';
  // 隐藏登录表单
  document.getElementById('login-form').style.display = 'none';
  this.classList.add('active');
  document.getElementById('login-tab').classList.remove('active');
})

// 登录功能
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner">⌛</span> 登录中...';

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        role: data.role
      }));

      if (data.role === 'admin') {
        document.getElementById('user-dashboard').classList.add('hide-title');
        showAdminDashboard();
      } else {
        document.getElementById('user-dashboard').classList.add('hide-title');
        showUserDashboard();
      }
    } else {
      document.getElementById('login-error').textContent = data.message || '登录失败';
    }
  } catch (error) {
    console.error('登录错误:', error);
    document.getElementById('login-error').textContent = '登录过程中发生错误';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
});

// 注册功能
document.getElementById('regist-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  if (password !== confirmPassword) {
    document.getElementById('password-error').textContent = '两次输入的密码不一致';
    return;
  }

  const registerBtn = document.getElementById('register-btn');
  registerBtn.disabled = true;
  registerBtn.innerHTML = '<span class="spinner">⌛</span> 注册中...';

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        username: username,
        password: password
      })
    });

    if (response.ok) {
      alert('注册成功，请登录');
      document.getElementById('login-tab').click();
      document.getElementById('login-username').value = username;
      this.reset();
    } else {
      document.getElementById('username-error').textContent = data.message || '注册失败';
    }
  } catch (error) {
    console.error('请求失败详情:', {
      error: error.message,
      url: `${API_BASE_URL}/register`,
      requestData: { username, password }
    });
    document.getElementById('username-error').textContent = '注册过程中发生错误';
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = '注册';
  }
});

// 用户面板选项卡切换功能
document.querySelectorAll('.user-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    // 移除所有选项卡的active类
    document.querySelectorAll('.user-tabs .tab-btn').forEach(tab => {
      tab.classList.remove('active');
    });
    // 给当前点击的选项卡添加active类
    this.classList.add('active');

    // 隐藏所有内容区域
    document.querySelectorAll('.user-section').forEach(section => {
      section.style.display = 'none';
    });

    // 显示对应的内容区域
    const tabId = this.id;
    if (tabId === 'bikes-tab') {
      document.getElementById('bikes-section').style.display = 'block';
    } else if (tabId === 'rides-tab') {
      document.getElementById('rides-section').style.display = 'block';
    } else if (tabId === 'start-ride-tab') {
      document.getElementById('start-ride-section').style.display = 'block';
    }
  });
});


// 用户面板选项卡切换功能
document.querySelectorAll('.user-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    // 移除所有选项卡的active类
    document.querySelectorAll('.user-tabs .tab-btn').forEach(tab => {
      tab.classList.remove('active');
    });

    // 给当前点击的选项卡添加active类
    this.classList.add('active');

    // 隐藏所有内容区域
    document.querySelectorAll('.user-section').forEach(section => {
      section.style.display = 'none';
    });

    // 显示对应的内容区域
    const tabId = this.id;
    if (tabId === 'bikes-tab') {
      document.getElementById('bikes-section').style.display = 'block';
    } else if (tabId === 'rides-tab') {
      document.getElementById('rides-section').style.display = 'block';
    } else if (tabId === 'start-ride-tab') {
      document.getElementById('start-ride-section').style.display = 'block';
    }
  });
});

// 添加自行车按钮事件
document.getElementById('add-bike-btn').addEventListener('click', showAddBikeModal);
async function showAddBikeModal() {
  const modal = document.getElementById('modal');
  modal.style.display = 'block';
  document.getElementById('modal-title').textContent = '添加自行车';

  document.getElementById('modal-content').innerHTML = `
                <label>品牌</label>
                <input type="text" id="modal-bike-brand" required>
                <label>车架号</label>
                <input type="text" id="modal-bike-frame" required>
                <label>颜色</label>
                <input type="text" id="modal-bike-color" required>
            `;

  document.getElementById('modal-submit').onclick = async function () {
    const brand = document.getElementById('modal-bike-brand').value;
    const frameNo = document.getElementById('modal-bike-frame').value;
    const color = document.getElementById('modal-bike-color').value;

    try {
      const response = await fetch(`${API_BASE_URL}/user/bicycles`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ brand, frame_no: frameNo, color })
      });

      if (response.ok) {
        modal.style.display = 'none';
        loadUserData(); // 刷新列表
      } else {
        throw new Error('添加失败');
      }
    } catch (error) {
      alert(error.message);
    }
  };
}
// 加载用户数据
async function loadUserData() {
  try {
    // 加载用户的自行车
    const bikesResponse = await fetch(`${API_BASE_URL}/my/bicycles`, {
      headers: getAuthHeader()
    });
    const bikesData = await bikesResponse.json();

    const bikesList = document.getElementById('bikes-list');
    bikesList.innerHTML = '';

    if (bikesResponse.ok) {
      if (bikesData.length === 0) {
        bikesList.innerHTML = '<p>您还没有自行车</p>';
      } else {
        bikesData.forEach(bike => {
          const bikeItem = document.createElement('div');
          bikeItem.className = 'list-item';
          bikeItem.innerHTML = `
                                <h4>${bike.brand}</h4>
                                <p>车架号: ${bike.frame_no}</p>
                                <p>颜色: ${bike.color}</p>
                                <p>状态: ${bike.status === 'available' ? '可用' : '使用中'}</p>
                                <p>位置: ${bike.current_location || '未知'}</p>
                            `;
          bikesList.appendChild(bikeItem);
        });
      }
    }

    // 加载骑行记录
    const ridesResponse = await fetch(`${API_BASE_URL}/my/ride-records`, {
      headers: getAuthHeader()
    });
    const ridesData = await ridesResponse.json();

    const ridesList = document.getElementById('rides-list');
    ridesList.innerHTML = '';

    if (ridesResponse.ok) {
      if (ridesData.length === 0) {
        ridesList.innerHTML = '<p>您还没有骑行记录</p>';
      } else {
        ridesData.forEach(ride => {
          const rideItem = document.createElement('div');
          rideItem.className = 'list-item';
          rideItem.innerHTML = `
                                <h4>自行车: ${ride.bicycle_id}</h4>
                                <p>开始时间: ${new Date(ride.start_time).toLocaleString()}</p>
                                <p>结束时间: ${ride.end_time ? new Date(ride.end_time).toLocaleString() : '进行中'}</p>
                                <p>起始位置: ${ride.start_place}</p>
                                <p>结束位置: ${ride.end_place || '未结束'}</p>
                            `;
          ridesList.appendChild(rideItem);
        });
      }
    }

    // 加载位置信息
    const locationsResponse = await fetch(`${API_BASE_URL}/locations`);
    const locationsData = await locationsResponse.json();

    const locationsList = document.getElementById('locations-list');
    locationsList.innerHTML = '<h4>选择起始位置</h4>';

    if (locationsResponse.ok) {
      locationsData.forEach(location => {
        const locationItem = document.createElement('div');
        locationItem.className = 'list-item';
        locationItem.innerHTML = `
                            <input type="radio" name="start-location" value="${location.name}" id="loc-${location.name}">
                            <label for="loc-${location.name}">
                                <h4>${location.name}</h4>
                                <p>坐标: ${location.latitude}, ${location.longitude}</p>
                            </label>
                        `;
        locationsList.appendChild(locationItem);
      });
    }

    // 监听位置选择变化
    document.querySelectorAll('input[name="start-location"]').forEach(radio => {
      radio.addEventListener('change', async function () {
        if (this.checked) {
          const bikeSelect = document.getElementById('bike-select');
          bikeSelect.innerHTML = '<option value="">选择自行车</option>';
          bikeSelect.disabled = true;

          // 获取该位置可用的自行车
          try {
            const bikesResponse = await fetch(`${API_BASE_URL}/my/bicycles`, {
              headers: getAuthHeader()
            });
            const bikesData = await bikesResponse.json();

            if (bikesResponse.ok) {
              const availableBikes = bikesData.filter(bike =>
                bike.status === 'available' &&
                bike.current_location === this.value
              );

              if (availableBikes.length === 0) {
                bikeSelect.innerHTML = '<option value="">该位置没有可用自行车</option>';
              } else {
                availableBikes.forEach(bike => {
                  const option = document.createElement('option');
                  option.value = bike.frame_no;
                  option.textContent = `${bike.brand} (${bike.color})`;
                  bikeSelect.appendChild(option);
                });
                bikeSelect.disabled = false;
              }
            }
          } catch (error) {
            console.error('获取自行车失败:', error);
          }
        }
      });
    });

    // 监听自行车选择变化
    document.getElementById('bike-select').addEventListener('change', function () {
      document.getElementById('start-ride-btn').disabled = !this.value;
    });

  } catch (error) {
    console.error('加载用户数据失败:', error);
    alert(error.message);
  }
}

// 开始骑行
document.getElementById('start-ride-btn').addEventListener('click', async function () {
  const selectedLocation = document.querySelector('input[name="start-location"]:checked');
  const bikeId = document.getElementById('bike-select').value;

  if (!selectedLocation || !bikeId) {
    alert('请选择位置和自行车');
    return;
  }

  const startBtn = this;
  startBtn.disabled = true;
  startBtn.textContent = '处理中...';

  try {
    const response = await fetch(`${API_BASE_URL}/ride/start`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        bicycle_id: bikeId,
        start_place: selectedLocation.value
      })
    });

    const data = await response.json();

    if (response.ok) {
      // 开始计时
      activeRide = {
        startTime: new Date(),
        timer: 0
      };
      currentRideRecordId = data.record_id;

      document.getElementById('start-ride-btn').style.display = 'none';
      document.getElementById('active-ride').style.display = 'block';

      // 加载结束位置选择
      const locationsResponse = await fetch(`${API_BASE_URL}/locations`);
      const locationsData = await locationsResponse.json();

      const endLocationSelect = document.getElementById('end-location-select');
      endLocationSelect.innerHTML = '<option value="">选择结束位置</option>';

      locationsData.forEach(location => {
        const option = document.createElement('option');
        option.value = location.name;
        option.textContent = location.name;
        endLocationSelect.appendChild(option);
      });

      // 开始计时器
      rideInterval = setInterval(() => {
        activeRide.timer++;
        const hours = Math.floor(activeRide.timer / 3600);
        const minutes = Math.floor((activeRide.timer % 3600) / 60);
        const seconds = activeRide.timer % 60;

        document.getElementById('ride-timer').textContent =
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
    } else {
      throw new Error(data.message || '开始骑行失败');
    }
  } catch (error) {
    alert(error.message);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = '开始骑行';
  }
});

// 结束骑行
document.getElementById('end-ride-btn').addEventListener('click', async function () {
  const endLocation = document.getElementById('end-location-select').value;

  if (!endLocation) {
    alert('请选择结束位置');
    return;
  }

  const endBtn = this;
  endBtn.disabled = true;
  endBtn.textContent = '处理中...';

  try {
    const response = await fetch(`${API_BASE_URL}/ride/end`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        record_id: currentRideRecordId,
        end_place: endLocation
      })
    });

    const data = await response.json();

    if (response.ok) {
      // 停止计时器
      clearInterval(rideInterval);

      // 计算骑行时间
      const hours = Math.floor(activeRide.timer / 3600);
      const minutes = Math.floor((activeRide.timer % 3600) / 60);

      alert(`骑行结束！持续时间: ${hours}小时${minutes}分钟`);

      // 重置界面
      document.getElementById('start-ride-btn').style.display = 'block';
      document.getElementById('active-ride').style.display = 'none';
      document.getElementById('ride-timer').textContent = '00:00:00';
      document.getElementById('start-ride-btn').disabled = true;

      // 刷新数据
      loadUserData();

      activeRide = null;
      currentRideRecordId = null;
    } else {
      throw new Error(data.message || '结束骑行失败');
    }
  } catch (error) {
    alert(error.message);
  } finally {
    endBtn.disabled = false;
    endBtn.textContent = '结束骑行';
  }
});

// 加载管理员数据
async function loadAdminData() {
  try {
    // 加载自行车列表
    const bikesResponse = await fetch(`${API_BASE_URL}/admin/bicycles`, {
      headers: getAuthHeader()
    });
    const bikesData = await bikesResponse.json();

    const adminBikesList = document.getElementById('admin-bikes-list');
    adminBikesList.innerHTML = '';

    if (bikesResponse.ok) {
      bikesData.forEach(bike => {
        const bikeItem = document.createElement('div');
        bikeItem.className = 'list-item';
        bikeItem.innerHTML = `
                            <h4>${bike.brand}</h4>
                            <p>车架号: ${bike.frame_no}</p>
                            <p>颜色: ${bike.color}</p>
                            <p>状态: ${bike.status === 'available' ? '可用' : '使用中'}</p>
                            <p>位置: ${bike.current_location || '未知'}</p>
                            <p>所有者: ${bike.owner_username || '无'}</p>
                            <div class="actions">
                                <button class="edit-bike" data-id="${bike.frame_no}">编辑</button>
                                <button class="delete-bike" data-id="${bike.frame_no}">删除</button>
                            </div>
                        `;
        adminBikesList.appendChild(bikeItem);
      });
    }

    // 加载位置列表
    const locationsResponse = await fetch(`${API_BASE_URL}/locations`);
    const locationsData = await locationsResponse.json();

    const adminLocationsList = document.getElementById('admin-locations-list');
    adminLocationsList.innerHTML = '';

    if (locationsResponse.ok) {
      locationsData.forEach(location => {
        const locationItem = document.createElement('div');
        locationItem.className = 'list-item';
        locationItem.innerHTML = `
                            <h4>${location.name}</h4>
                            <p>坐标: ${location.latitude}, ${location.longitude}</p>
                            <div class="actions">
                                <button class="edit-location" data-name="${location.name}">编辑</button>
                                <button class="delete-location" data-name="${location.name}">删除</button>
                            </div>
                        `;
        adminLocationsList.appendChild(locationItem);
      });
    }

    // 加载所有骑行记录
    const ridesResponse = await fetch(`${API_BASE_URL}/admin/ride-records`, {
      headers: getAuthHeader()
    });
    const ridesData = await ridesResponse.json();

    const allRidesList = document.getElementById('all-rides-list');
    allRidesList.innerHTML = '';

    if (ridesResponse.ok) {
      if (ridesData.length === 0) {
        allRidesList.innerHTML = '<p>没有骑行记录</p>';
      } else {
        ridesData.forEach(ride => {
          const rideItem = document.createElement('div');
          rideItem.className = 'list-item';
          rideItem.innerHTML = `
                                <h4>用户: ${ride.username}</h4>
                                <p>自行车: ${ride.bicycle_id}</p>
                                <p>开始时间: ${new Date(ride.start_time).toLocaleString()}</p>
                                <p>结束时间: ${ride.end_time ? new Date(ride.end_time).toLocaleString() : '进行中'}</p>
                                <p>起始位置: ${ride.start_place}</p>
                                <p>结束位置: ${ride.end_place || '未结束'}</p>
                                <div class="actions">
                                    <button class="edit-ride" data-id="${ride.record_id}">编辑</button>
                                    <button class="delete-ride" data-id="${ride.record_id}">删除</button>
                                </div>
                            `;
          allRidesList.appendChild(rideItem);
        });
      }
    }
  } catch (error) {
    console.error('加载管理员数据失败:', error);
    alert(error.message);
  }
}

// 管理员面板选项卡切换功能
document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    // 移除所有选项卡的active类
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(tab => {
      tab.classList.remove('active');
    });

    // 给当前点击的选项卡添加active类
    this.classList.add('active');

    // 隐藏所有内容区域
    document.querySelectorAll('.admin-section').forEach(section => {
      section.style.display = 'none';
    });

    // 显示对应的内容区域
    const tabId = this.id;
    if (tabId === 'users-tab') {
      document.getElementById('users-section').style.display = 'block';
      loadUsersData(); // 如果需要的话，加载用户数据
    } else if (tabId === 'admin-bikes-tab') {
      document.getElementById('admin-bikes-section').style.display = 'block';
      loadBikesData(); // 如果需要的话，加载自行车数据
    } else if (tabId === 'locations-tab') {
      document.getElementById('locations-section').style.display = 'block';
      loadLocationsData(); // 如果需要的话，加载位置数据
    } else if (tabId === 'all-rides-tab') {
      document.getElementById('all-rides-section').style.display = 'block';
      loadAllRidesData(); // 如果需要的话，加载所有骑行记录
    }
  });
});

// 管理员功能 - 添加位置
document.getElementById('add-location-btn').addEventListener('click', showLocationModal);

// 显示位置模态框
async function showLocationModal(locationName = null) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalError = document.getElementById('modal-error');

  modalTitle.textContent = locationName ? '编辑位置' : '添加位置';
  modalError.textContent = '';

  let location = null;
  if (locationName) {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/${locationName}`, {
        headers: getAuthHeader()
      });
      const data = await response.json();

      if (response.ok) {
        location = data;
      } else {
        throw new Error(data.message || '获取位置信息失败');
      }
    } catch (error) {
      modalError.textContent = error.message;
    }
  }

  modalContent.innerHTML = `
                <label>位置名称</label>
                <input type="text" id="modal-name" value="${location ? location.name : ''}" ${location ? 'readonly' : ''} required>
                <label>纬度</label>
                <input type="number" step="0.000001" id="modal-latitude" value="${location ? location.latitude : ''}" required>
                <label>经度</label>
                <input type="number" step="0.000001" id="modal-longitude" value="${location ? location.longitude : ''}" required>
            `;

  modal.style.display = 'block';

  document.getElementById('modal-submit').onclick = async function () {
    const name = document.getElementById('modal-name').value.trim();
    const latitude = document.getElementById('modal-latitude').value;
    const longitude = document.getElementById('modal-longitude').value;

    if (!name || !latitude || !longitude) {
      modalError.textContent = '请填写所有字段';
      return;
    }

    const submitBtn = document.getElementById('modal-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '处理中...';

    try {
      let response, data;

      if (locationName) {
        // 更新位置
        response = await fetch(`${API_BASE_URL}/admin/location/${name}`, {
          method: 'PUT',
          headers: getAuthHeader(),
          body: JSON.stringify({ latitude, longitude })
        });
      } else {
        // 创建位置
        response = await fetch(`${API_BASE_URL}/admin/location`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: JSON.stringify({ name, latitude, longitude })
        });
      }

      data = await response.json();

      if (response.ok) {
        modal.style.display = 'none';
        loadAdminData();
      } else {
        throw new Error(data.message || locationName ? '更新位置失败' : '创建位置失败');
      }
    } catch (error) {
      modalError.textContent = error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '提交';
    }
  };
}

// 删除位置
async function deleteLocation(locationName) {
  if (!confirm('确定要删除此位置吗？')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/location/${locationName}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    const data = await response.json();

    if (response.ok) {
      loadAdminData();
    } else {
      throw new Error(data.message || '删除位置失败');
    }
  } catch (error) {
    alert(error.message);
  }
}

// 加载用户数据
async function loadUsersData() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: getAuthHeader()
    });
    const users = await response.json();

    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';

    if (users.length === 0) {
      usersList.innerHTML = '<p>没有用户数据</p>';
      return;
    }

    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'list-item';
      userItem.innerHTML = `
                            <h4>${user.username}</h4>
                        <p>ID: ${user.user_id}</p>
                        <p>角色: ${user.role}</p>
                        <div class="actions">
                            <button class="edit-user" data-id="${user.user_id}">编辑</button>
                            <button class="delete-user" data-id="${user.user_id}">删除</button>
                        </div>
                    `;
      usersList.appendChild(userItem);
    });

    // 添加编辑用户事件监听
    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.addEventListener('click', function () {
        const userId = this.getAttribute('data-id');
        showEditUserModal(userId);
      });
    });

    // 添加删除用户事件监听
    document.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', async function () {
        const userId = this.getAttribute('data-id');
        if (confirm(`确定要删除用户ID为${userId}的用户吗？`)) {
          try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
              method: 'DELETE',
              headers: getAuthHeader()
            });

            if (response.ok) {
              loadUsersData();
            } else {
              throw new Error('删除用户失败');
            }
          } catch (error) {
            alert(error.message);
          }
        }
      });
    });
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
}

// 加载自行车数据
async function loadBikesData() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/bicycles`, {
      headers: getAuthHeader()
    });
    const bikes = await response.json();

    const bikesList = document.getElementById('admin-bikes-list');
    bikesList.innerHTML = '';

    if (bikes.length === 0) {
      bikesList.innerHTML = '<p>没有自行车数据</p>';
      return;
    }

    bikes.forEach(bike => {
      const bikeItem = document.createElement('div');
      bikeItem.className = 'list-item';
      bikeItem.innerHTML = `
                        <h4>${bike.brand}</h4>
                        <p>车架号: ${bike.frame_no}</p>
                        <p>颜色: ${bike.color}</p>
                        <p>状态: ${bike.status}</p>
                        <p>位置: ${bike.current_location || '未知'}</p>
                        <div class="actions">
                            <button class="edit-bike" data-id="${bike.frame_no}">编辑</button>
                            <button class="delete-bike" data-id="${bike.frame_no}">删除</button>
                        </div>
                    `;
      bikesList.appendChild(bikeItem);
    });

    // 添加编辑自行车事件监听
    document.querySelectorAll('.edit-bike').forEach(btn => {
      btn.addEventListener('click', function () {
        const frameNo = this.getAttribute('data-id');
        showEditBikeModal(frameNo);
      });
    });

    // 添加删除自行车事件监听
    document.querySelectorAll('.delete-bike').forEach(btn => {
      btn.addEventListener('click', async function () {
        const frameNo = this.getAttribute('data-id');
        if (confirm(`确定要删除车架号为${frameNo}的自行车吗？`)) {
          try {
            const response = await fetch(`${API_BASE_URL}/admin/bicycles/${frameNo}`, {
              method: 'DELETE',
              headers: getAuthHeader()
            });

            if (response.ok) {
              loadBikesData();
            } else {
              throw new Error('删除自行车失败');
            }
          } catch (error) {
            alert(error.message);
          }
        }
      });
    });
  } catch (error) {
    console.error('加载自行车数据失败:', error);
  }
}


// 加载位置数据（管理员面板）
async function loadLocationsData() {
  try {
    const response = await fetch(`${API_BASE_URL}/locations`, {
      headers: getAuthHeader()
    });
    const locations = await response.json();

    const locationsList = document.getElementById('admin-locations-list');
    locationsList.innerHTML = '';

    if (locations.length === 0) {
      locationsList.innerHTML = '<p>没有位置数据</p>';
      return;
    }

    locations.forEach(location => {
      const locationItem = document.createElement('div');
      locationItem.className = 'list-item';
      locationItem.innerHTML = `
                        <h4>${location.name}</h4>
                        <p>坐标: ${location.latitude}, ${location.longitude}</p>
                        <div class="actions">
                            <button class="edit-location" data-name="${location.name}">编辑</button>
                            <button class="delete-location" data-name="${location.name}">删除</button>
                        </div>
                    `;
      locationsList.appendChild(locationItem);
    });

    // 添加编辑位置事件监听
    document.querySelectorAll('.edit-location').forEach(btn => {
      btn.addEventListener('click', function () {
        const locationName = this.getAttribute('data-name');
        showLocationModal(locationName);
      });
    });

    // 添加删除位置事件监听
    document.querySelectorAll('.delete-location').forEach(btn => {
      btn.addEventListener('click', async function () {
        const locationName = this.getAttribute('data-name');
        if (confirm(`确定要删除位置 ${locationName} 吗？`)) {
          try {
            const response = await fetch(`${API_BASE_URL}/admin/location/${locationName}`, {
              method: 'DELETE',
              headers: getAuthHeader()
            });

            if (response.ok) {
              loadLocationsData();
            } else {
              throw new Error('删除位置失败');
            }
          } catch (error) {
            alert(error.message);
          }
        }
      });
    });
  } catch (error) {
    console.error('加载位置数据失败:', error);
    alert('加载位置数据失败: ' + error.message);
  }
}

// 加载所有骑行记录
async function loadAllRidesData() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/ride-records`, {
      headers: getAuthHeader()
    });
    const rides = await response.json();

    const ridesList = document.getElementById('all-rides-list');
    ridesList.innerHTML = '';

    if (rides.length === 0) {
      ridesList.innerHTML = '<p>没有骑行记录</p>';
      return;
    }

    rides.forEach(ride => {
      const rideItem = document.createElement('div');
      rideItem.className = 'list-item';
      rideItem.innerHTML = `
                <h4>用户: ${ride.username}</h4>
                <p>自行车: ${ride.bicycle_id}</p>
                <p>开始时间: ${new Date(ride.start_time).toLocaleString()}</p>
                <p>结束时间: ${ride.end_time ? new Date(ride.end_time).toLocaleString() : '进行中'}</p>
                <p>起始位置: ${ride.start_place}</p>
                <p>结束位置: ${ride.end_place || '未结束'}</p>
                <div class="actions">
                    <button class="delete-ride" data-id="${ride.record_id}">删除</button>
                </div>
            `;
      ridesList.appendChild(rideItem);
    });

    // 添加删除骑行记录事件监听
    document.querySelectorAll('.delete-ride').forEach(btn => {
      btn.addEventListener('click', async function () {
        const recordId = this.getAttribute('data-id');
        if (confirm(`确定要删除骑行记录ID为${recordId}的记录吗？`)) {
          try {
            const response = await fetch(`${API_BASE_URL}/admin/ride-records/${recordId}`, {
              method: 'DELETE',
              headers: getAuthHeader()
            });

            if (response.ok) {
              loadAllRidesData();
            } else {
              throw new Error('删除骑行记录失败');
            }
          } catch (error) {
            alert(error.message);
          }
        }
      });
    });
  } catch (error) {
    console.error('加载骑行记录失败:', error);
  }
}

// 添加用户按钮点击事件
document.getElementById('add-user-btn').addEventListener('click', showAddUserModal);

// 添加自行车按钮点击事件
document.getElementById('add-bike-btn').addEventListener('click', showAddBikeModal);

// 显示添加用户模态框
function showAddUserModal() {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');

  modalTitle.textContent = '添加用户';
  modalContent.innerHTML = `
                <label>用户名</label>
                <input type="text" id="modal-username" required>
                <label>密码</label>
                <input type="password" id="modal-password" required minlength="8">
                <label>角色</label>
                <select id="modal-role" required>
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                </select>
            `;

  modal.style.display = 'block';

  document.getElementById('modal-submit').onclick = async function () {
    const username = document.getElementById('modal-username').value.trim();
    const password = document.getElementById('modal-password').value;
    const role = document.getElementById('modal-role').value;

    if (!username || !password) {
      alert('请填写所有字段');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ username, password, role })
      });

      if (response.ok) {
        modal.style.display = 'none';
        loadUsersData();
      } else {
        const error = await response.json();
        throw new Error(error.message || '添加用户失败');
      }
    } catch (error) {
      alert(error.message);
    }
  };
}

// 显示添加自行车模态框
function showAddBikeModal() {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');

  modalTitle.textContent = '添加自行车';
  modalContent.innerHTML = `
                <label>品牌</label>
                <input type="text" id="modal-brand" required>
                <label>车架号</label>
                <input type="text" id="modal-frame-no" required>
                <label>颜色</label>
                <input type="text" id="modal-color" required>
                <label>状态</label>
                <select id="modal-status" required>
                    <option value="available">可用</option>
                    <option value="in_use">使用中</option>
                    <option value="maintenance">维修中</option>
                </select>
                <label>当前位置</label>
                <input type="text" id="modal-location">
            `;

  modal.style.display = 'block';

  document.getElementById('modal-submit').onclick = async function () {
    const brand = document.getElementById('modal-brand').value.trim();
    const frameNo = document.getElementById('modal-frame-no').value.trim();
    const color = document.getElementById('modal-color').value.trim();
    const status = document.getElementById('modal-status').value;
    const location = document.getElementById('modal-location').value.trim();

    if (!brand || !frameNo || !color || !status) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/bicycles`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          brand,
          frame_no: frameNo,
          color,
          status,
          current_location: location || null
        })
      });

      if (response.ok) {
        modal.style.display = 'none';
        loadBikesData();
      } else {
        const error = await response.json();
        throw new Error(error.message || '添加自行车失败');
      }
    } catch (error) {
      alert(error.message);
    }
  };
}
// 退出登录
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('admin-logout-btn').addEventListener('click', logout);

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('user-dashboard').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'none';
  document.querySelector('.auth-tabs').style.display = 'flex';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('login-form').reset();
}

// 初始化 - 检查是否已登录
function init() {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  if (savedToken && savedUser) {
    const user = JSON.parse(savedUser);
    if (user.role === 'admin') {
      showAdminDashboard();
    } else {
      showUserDashboard();
    }
  }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);
