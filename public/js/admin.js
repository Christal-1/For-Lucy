(() => {
  const loginPanel = document.getElementById('loginPanel');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const productForm = document.getElementById('productForm');
  const productMessage = document.getElementById('productMessage');
  const productList = document.getElementById('adminProductList');
  const saveButton = document.getElementById('saveProductButton');
  const imageInput = document.getElementById('productImage');
  const preview = document.getElementById('imagePreview');
  let csrfToken = '';
  let products = [];
  let previewUrl = '';
  const money = value => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(Number(value) || 0);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const emoji = category => ({ Cakes:'🎂', Cupcakes:'🧁', Biscuits:'🍪', Cookies:'🍪', Treats:'🍓', Desserts:'🍰' })[category] || '🌸';
  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (csrfToken && options.method && options.method !== 'GET') headers.set('x-csrf-token', csrfToken);
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : {};
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }
  function showDashboard(username) {
    loginPanel.hidden = true; dashboard.hidden = false;
    document.querySelector('.dashboard-heading h1').innerHTML = `Product studio <em>♡</em>`;
    loadProducts();
  }
  async function checkSession() {
    try {
      const response = await fetch('/api/admin/me', { credentials: 'same-origin' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.authenticated) { csrfToken = data.csrfToken; showDashboard(data.username); }
    } catch (_) { /* The login form remains available. */ }
  }
  function clearForm() {
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('productAvailable').checked = true;
    document.getElementById('editorTitle').textContent = 'Add a new treat';
    saveButton.innerHTML = 'Save product <span>♡</span>';
    document.getElementById('cancelEdit').hidden = true;
    preview.hidden = true;
    preview.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    productMessage.textContent = '';
  }
  async function loadProducts() {
    productList.innerHTML = '<p class="notice">Gathering your goodies…</p>';
    try {
      products = await api('/api/admin/products');
      document.getElementById('productCount').textContent = products.length;
      if (!products.length) { productList.innerHTML = '<p class="notice">Your catalogue is empty for now. Add your first lovely treat using the form above.</p>'; return; }
      productList.innerHTML = '';
      products.forEach(product => {
        const row = document.createElement('article'); row.className = 'admin-product-row';
        const thumb = product.image ? `<img src="${escapeHtml(product.image)}" alt="">` : `<span aria-hidden="true">${emoji(product.category)}</span>`;
        row.innerHTML = `<div class="admin-product-thumb">${thumb}</div><div class="admin-product-details"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)} · ${product.available ? 'Visible on website' : 'Hidden from customers'}</p><strong>${money(product.price)}</strong></div><div class="admin-product-actions"><button class="small-action edit" type="button">Edit</button><button class="small-action delete" type="button">Delete</button></div>`;
        row.querySelector('.edit').addEventListener('click', () => editProduct(product));
        row.querySelector('.delete').addEventListener('click', () => deleteProduct(product));
        row.querySelector('img')?.addEventListener('error', event => { event.currentTarget.remove(); row.querySelector('.admin-product-thumb').textContent = emoji(product.category); });
        productList.appendChild(row);
      });
    } catch (error) {
      if (error.message.toLowerCase().includes('sign in')) { showLogin(error.message); return; }
      productList.innerHTML = `<p class="notice">${escapeHtml(error.message)}</p>`;
    }
  }
  function editProduct(product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productAvailable').checked = product.available !== false;
    document.getElementById('editorTitle').textContent = 'Edit your treat';
    saveButton.innerHTML = 'Update product <span>♡</span>';
    document.getElementById('cancelEdit').hidden = false;
    if (product.image) { preview.src = product.image; preview.hidden = false; } else { preview.hidden = true; preview.removeAttribute('src'); }
    productMessage.textContent = 'Editing ' + product.name;
    document.querySelector('.editor-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function deleteProduct(product) {
    if (!window.confirm(`Delete “${product.name}” from the catalogue? This cannot be undone.`)) return;
    try { await api('/api/admin/products/' + encodeURIComponent(product.id), { method: 'DELETE' }); productMessage.textContent = 'Product deleted.'; await loadProducts(); }
    catch (error) { productMessage.textContent = error.message; }
  }
  function showLogin(message = '') {
    dashboard.hidden = true; loginPanel.hidden = false; csrfToken = '';
    if (message) loginMessage.textContent = message;
  }
  loginForm.addEventListener('submit', async event => {
    event.preventDefault(); loginMessage.textContent = 'Signing in…';
    const submit = loginForm.querySelector('button[type="submit"]'); submit.disabled = true;
    try {
      const result = await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value }) });
      csrfToken = result.csrfToken; loginForm.reset(); loginMessage.textContent = ''; showDashboard(result.username);
    } catch (error) { loginMessage.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  productForm.addEventListener('submit', async event => {
    event.preventDefault(); productMessage.textContent = 'Saving your product…'; saveButton.disabled = true;
    const id = document.getElementById('productId').value;
    const data = new FormData();
    data.append('name', document.getElementById('productName').value.trim());
    data.append('category', document.getElementById('productCategory').value.trim());
    data.append('price', document.getElementById('productPrice').value);
    data.append('description', document.getElementById('productDescription').value.trim());
    data.append('available', String(document.getElementById('productAvailable').checked));
    if (imageInput.files[0]) data.append('image', imageInput.files[0]);
    try {
      await api(id ? '/api/admin/products/' + encodeURIComponent(id) : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: data });
      clearForm(); productMessage.textContent = 'Saved! Your catalogue is up to date.'; await loadProducts();
    } catch (error) { productMessage.textContent = error.message; }
    finally { saveButton.disabled = false; }
  });
  imageInput.addEventListener('change', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = imageInput.files[0];
    if (!file) { preview.hidden = true; preview.removeAttribute('src'); return; }
    previewUrl = URL.createObjectURL(file); preview.src = previewUrl; preview.hidden = false;
  });
  document.getElementById('cancelEdit').addEventListener('click', clearForm);
  document.getElementById('refreshButton').addEventListener('click', loadProducts);
  document.getElementById('logoutButton').addEventListener('click', async () => {
    try { await api('/api/admin/logout', { method: 'POST' }); } catch (_) { /* Expired sessions can still return to login. */ }
    showLogin('You have signed out.'); clearForm();
  });
  checkSession();
})();
