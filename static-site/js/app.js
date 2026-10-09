
(() => {
  const grid = document.getElementById('productGrid');
  const filters = document.getElementById('categoryFilters');
  const search = document.getElementById('productSearch');
  const empty = document.getElementById('emptyState');
  const dialog = document.getElementById('productDialog');
  const dialogContent = document.getElementById('dialogContent');

  const money = value =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);

  let products = [];
  let activeCategory = 'all';
  let whatsappNumber = '27712677342';

  const categoryEmoji = category => ({
    Cakes: '🎂',
    Cupcakes: '🧁',
    Biscuits: '🍪',
    Cookies: '🍪',
    Treats: '🍓',
    Desserts: '🍰',
    Other: '🎀'
  })[category] || '🌸';

  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  const waLink = message =>
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  // Use the local date, not UTC, for the earliest selectable date.
  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function setWhatsAppLinks() {
    const links = [
      [
        'heroWhatsApp',
        "Hi Lucy! I'd love to ask about your homemade treats."
      ],
      [
        'customOrderLink',
        "Hi Lucy! I'd like to enquire about a custom order."
      ],
      [
        'storyWhatsApp',
        "Hi Lucy! I'd love to learn more about your bakery."
      ],
      [
        'contactWhatsApp',
        "Hi Lucy! I'd like to place an order or make an enquiry."
      ]
    ];

    for (const [id, message] of links) {
      const link = document.getElementById(id);
      if (link) {
        link.href = waLink(message);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    }
  }

  function buildFilters() {
    const categories = [
      ...new Set(products.map(product => product.category).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b));

    filters.innerHTML = '';

    [['all', 'All treats'], ...categories.map(category => [category, category])]
      .forEach(([value, label]) => {
        const button = document.createElement('button');

        button.className =
          'filter-chip' + (activeCategory === value ? ' active' : '');

        button.dataset.category = value;
        button.textContent = label;
        button.type = 'button';

        button.addEventListener('click', () => {
          activeCategory = value;
          buildFilters();
          renderProducts();
        });

        filters.appendChild(button);
      });
  }

  function renderProducts() {
    const term = search.value.trim().toLowerCase();

    const visible = products.filter(product => {
      const matchesCategory =
        activeCategory === 'all' || product.category === activeCategory;

      const searchableText = [
        product.name,
        product.category,
        product.description
      ].join(' ').toLowerCase();

      return matchesCategory && searchableText.includes(term);
    });

    grid.innerHTML = '';
    empty.hidden = visible.length > 0;

    if (!visible.length) return;

    visible.forEach(product => {
      const card = document.createElement('article');
      card.className = 'product-card';

      const image = product.image
        ? `<img src="${escapeHtml(product.image)}"
                alt="${escapeHtml(product.name)}"
                loading="lazy">`
        : `<span class="image-placeholder" aria-hidden="true">
             ${categoryEmoji(product.category)}
           </span>`;

      card.innerHTML = `
        <div class="product-image">
          ${image}
          <span class="product-tag">${escapeHtml(product.category)}</span>
        </div>

        <div class="product-info">
          <p class="product-category">A little handmade magic</p>
          <h3>${escapeHtml(product.name)}</h3>

          <p class="product-description">
            ${escapeHtml(
              product.description || 'A lovely homemade treat, made with care.'
            )}
          </p>

          <div class="product-bottom">
            <span class="product-price">${money(product.price)}</span>

            <button
              class="product-order"
              type="button"
              data-product-id="${escapeHtml(product.id)}"
            >
              Order this ♡
            </button>
          </div>
        </div>
      `;

      card.querySelector('.product-order').addEventListener('click', () => {
        openProduct(product);
      });

      const productImage = card.querySelector('.product-image img');

      if (productImage) {
        productImage.addEventListener('error', event => {
          event.currentTarget.remove();

          const placeholder = document.createElement('span');
          placeholder.className = 'image-placeholder';
          placeholder.textContent = categoryEmoji(product.category);

          card.querySelector('.product-image').prepend(placeholder);
        });
      }

      grid.appendChild(card);
    });
  }

  function openProduct(product) {
    const image = product.image
      ? `<img
           class="dialog-product-image"
           src="${escapeHtml(product.image)}"
           alt="${escapeHtml(product.name)}"
         >`
      : `<div
           class="dialog-product-image dialog-placeholder"
           role="img"
           aria-label="${escapeHtml(product.name)}"
         >${categoryEmoji(product.category)}</div>`;

    const today = localDateString();

    dialogContent.innerHTML = `
      ${image}

      <div class="dialog-product-body">
        <p class="product-category">${escapeHtml(product.category)}</p>

        <h2>${escapeHtml(product.name)}</h2>

        <p>
          ${escapeHtml(
            product.description || 'A lovely homemade treat, made with care.'
          )}
        </p>

        <div class="order-price-line">
          <span>Price per item</span>
          <strong class="product-price">${money(product.price)}</strong>
        </div>

        <form id="productOrderForm" class="product-order-form">
          <div class="order-field">
            <label for="orderQuantity">Quantity *</label>
            <input
              id="orderQuantity"
              name="quantity"
              type="number"
              min="1"
              max="1000"
              step="1"
              value="1"
              required
            >
          </div>

          <div class="order-field">
            <label for="orderDate">Preferred date</label>
            <input
              id="orderDate"
              name="preferredDate"
              type="date"
              min="${today}"
            >
            <small>Choose your preferred date, if known.</small>
          </div>

          <div class="order-field">
            <label for="orderDetails">Any special instructions?</label>
            <textarea
              id="orderDetails"
              name="details"
              rows="3"
              maxlength="1000"
              placeholder="E.g. flavour, packaging or collection requests..."
            ></textarea>
          </div>

          <div class="order-total">
            <span>Estimated total</span>
            <strong id="orderTotal">${money(product.price)}</strong>
          </div>

          <p class="order-disclaimer">
            Lucy will confirm availability and any collection or delivery
            arrangements. Your order is not confirmed until Lucy responds.
          </p>

          <button
            class="button button-primary order-submit"
            type="submit"
          >
            Continue on WhatsApp ↗
          </button>

          <p class="order-form-error" id="orderFormError" role="alert" hidden></p>
        </form>
      </div>
    `;

    const form = document.getElementById('productOrderForm');
    const quantityInput = document.getElementById('orderQuantity');
    const dateInput = document.getElementById('orderDate');
    const detailsInput = document.getElementById('orderDetails');
    const totalElement = document.getElementById('orderTotal');
    const errorElement = document.getElementById('orderFormError');

    function updateTotal() {
      const quantity = Number(quantityInput.value);

      const validQuantity =
        Number.isInteger(quantity) && quantity >= 1 && quantity <= 1000;

      totalElement.textContent = validQuantity
        ? money(Number(product.price) * quantity)
        : 'Enter a valid quantity';
    }

    quantityInput.addEventListener('input', updateTotal);

    form.addEventListener('submit', event => {
      event.preventDefault();

      errorElement.hidden = true;
      errorElement.textContent = '';

      const quantity = Number(quantityInput.value);
      const selectedDate = dateInput.value;
      const details = detailsInput.value.trim();

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 1000
      ) {
        errorElement.textContent =
          'Please enter a quantity between 1 and 1000.';
        errorElement.hidden = false;
        quantityInput.focus();
        return;
      }

      if (selectedDate && selectedDate < localDateString()) {
        errorElement.textContent =
          'Please choose today or a future preferred date.';
        errorElement.hidden = false;
        dateInput.focus();
        return;
      }

      const unitPrice = Number(product.price) || 0;
      const total = unitPrice * quantity;

      const message = [
        "Hi Lucy! I'd like to place an order:",
        '',
        `Product: ${product.name}`,
        `Price per item: ${money(unitPrice)}`,
        `Quantity: ${quantity}`,
        `Estimated total: ${money(total)}`,
        `Preferred date: ${selectedDate || 'Not specified'}`,
        `Special instructions: ${details || 'None'}`,
        '',
        'Please confirm availability and collection or delivery details.',
        'Thank you!'
      ].join('\n');

      // Open WhatsApp directly from the form submission.
      const whatsappUrl = waLink(message);
      const whatsappWindow = window.open(whatsappUrl, '_blank');

      if (whatsappWindow) {
        whatsappWindow.opener = null;
      } else {
        // Fallback in browsers that block opening a new tab.
        window.location.href = whatsappUrl;
      }
    });

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      // Fallback for browsers without native dialog support.
      dialogContent.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function init() {
    const yearElement = document.getElementById('year');

    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }

    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');

    if (menuToggle && nav) {
      menuToggle.addEventListener('click', () => {
        const open = menuToggle.getAttribute('aria-expanded') !== 'true';

        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute(
          'aria-label',
          open ? 'Close menu' : 'Open menu'
        );

        nav.classList.toggle('open', open);
      });

      nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          nav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.setAttribute('aria-label', 'Open menu');
        });
      });
    }

    const closeButton = document.getElementById('closeDialog');

    if (closeButton && dialog) {
      closeButton.addEventListener('click', () => dialog.close());

      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
    }

    if (search) {
      search.addEventListener('input', renderProducts);
    }

    try {
      const response = await fetch('./config.json');

      if (response.ok) {
        const config = await response.json();

        if (config.whatsappNumber) {
          whatsappNumber = String(config.whatsappNumber).replace(/\D/g, '');
        }
      }
    } catch (_) {
      // Use the configured fallback number.
    }

    setWhatsAppLinks();

    try {
      const response = await fetch('./products.json');

      if (!response.ok) {
        throw new Error('Could not load products');
      }

      products = await response.json();

      if (!Array.isArray(products) || products.length === 0) {
        grid.innerHTML = `
          <div class="notice" style="grid-column:1/-1">
            <strong>Our treat table is getting ready.</strong><br>
            New goodies will appear here soon. In the meantime, message Lucy
            about a custom order.
          </div>
        `;

        empty.hidden = true;
        filters.innerHTML = '';
        return;
      }

      buildFilters();
      renderProducts();
    } catch (_) {
      grid.innerHTML = `
        <div class="notice" style="grid-column:1/-1">
          We couldn't load the catalogue just now. Please refresh the page
          or message Lucy directly.
        </div>
      `;
    }
  }

  init();
})();