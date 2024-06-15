document.addEventListener("DOMContentLoaded", () => {
    fetch('/api/shop/products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const products = data.response;
                const productList = document.getElementById("list");

                products.forEach(product => {
                    const itemHTML = `
                        <div class="item">
                            <img src="${product.image}" alt="${product.name}">
                            <div class="descriptionItem">
                                <p>${product.name}</p>
                                <div class="purchaseButton">
                                    <span>${product.price} руб.</span>
                                    <button onclick="handleButtonClick(${product.id})">КУПИТЬ</button>
                                </div>
                            </div>
                        </div>
                    `;
                    productList.insertAdjacentHTML('beforeend', itemHTML);
                });
            } else {
                console.error(data);
            }
        })


    fetch('/api/shop/payments')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const payments = data.response;
                const listPayment = document.getElementById("listpayment");
    
                payments.forEach(payment => {
                    const products = payment.products;

                    function formatDate(inputDate) {
                        const dateObj = new Date(inputDate);
                        const padZero = (num) => (num < 10 ? '0' + num : num);
                        const formattedDate =
                            padZero(dateObj.getMonth() + 1) + '/' +
                            padZero(dateObj.getDate()) + '/' +
                            dateObj.getFullYear().toString().slice(-2) + ' ' +
                            padZero(dateObj.getHours()) + ':' +
                            padZero(dateObj.getMinutes()) + ' MSK';
                    
                        return formattedDate;
                    }

                    const dateString = payment.updated_at
                    const formattedDateString = formatDate(dateString);
                    
                    products.forEach(product => {
                        const itemHTML = `
                            <div class="itemlastpay">
                                <img src="https://mineskin.eu/helm/${payment.customer}">
                                <div class="payinfo">
                                    <li class="lastnickname">${payment.customer}</li>
                                    <li class="lastproduct">${product.name} <span style="color: #00AA00">+${payment.enrolled.toFixed(2)} руб.</span></li>
                                    <li class="lasttime">${formattedDateString}</li>
                                </div>
                                <img class="imgproduct" style="display: none" src="${product.image}">
                            </div>
                        `;
                        listPayment.insertAdjacentHTML('beforeend', itemHTML);
                    });
                });
            } else {
                console.error(data);
            }
        });

    fetch('/api/shop/custommessages')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.response.enabled) {
                const notificationHTML = `
                    <div id="notification" class="${data.response.position}">
                        <div class="container">
                            <p>${data.response.message}</p>
                            <button>${data.response.buttonCaption}</button>
                        </div>
                        <button id="closenotification" style="position: absolute; top: 10px; right: 10px;">x</button>
                    </div>
                `;
    
                document.body.insertAdjacentHTML('beforeend', notificationHTML);
    
                const notification = document.getElementById('notification');
                const button = notification.querySelector('button');
                const closeButton = document.getElementById('closenotification');
    
                button.addEventListener('click', () => {
                    if (data.response.buttonUrl) {
                        window.location.href = data.response.buttonUrl;
                    }
                    notification.style.display = 'none';
                });
    
                closeButton.addEventListener('click', () => {
                    notification.style.display = 'none';
                });
            }
        });


    var shopLink = document.querySelector('a[href="#listHeader"]');
    if (shopLink) {
        shopLink.addEventListener("click", function(event) {
            event.preventDefault();
            var targetBlock = document.getElementById('listHeader');
            smoothScrollTo(targetBlock);
        });
    }

    const modalCoupon = document.getElementById('modalCupon');
    const addCouponBtn = document.getElementById('addCupon');
    const closeBtn = document.getElementById('closeButton');
    const closeCouponBtn = document.getElementById('closeButtonCupon');

    function openModalCoupon() {
        modalCoupon.style.display = 'block';
        modalCoupon.classList.add('fadeInOut');
    }

    function closeModalCoupon() {
        modalCoupon.classList.remove('fadeInOut');
        modalCoupon.style.display = 'none';
    }

    if (addCouponBtn) {
        addCouponBtn.addEventListener('click', openModalCoupon);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (closeCouponBtn) {
        closeCouponBtn.addEventListener('click', closeModalCoupon);
    }

    document.getElementById("discord").addEventListener("click", function() {
        window.open("https://discord.com");
    });
    document.getElementById("youtube").addEventListener("click", function() {
        window.open("https://www.youtube.com");
    });
    document.getElementById("telegram").addEventListener("click", function() {
        window.open("https://web.telegram.org");
    });
    document.getElementById("vk").addEventListener("click", function() {
        window.open("https://vk.com");
    });

    onlinePlayerServer();
    
});

function addCupon() {
    const addCuponBtn = document.getElementById('addCupon');
    const modal = document.getElementById('modalCupon');
    const cuponInput = document.getElementById('cuponInput');
    const cupon = cuponInput.value.trim();

    if (cupon !== '') {
        fetch(`/api/shop/coupon/${cupon}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addCuponBtn.textContent = 'ВАШ КУПОН: ' + cupon;
                    modal.classList.remove('fadeInOut');
                    modal.style.display = 'none';
                } else {
                    alert('Нет такого купона!');
                }
            })
    } else {
        alert('Добавьте купон!');
    }
}

function updateOnlinePlayers() {
    fetch('https://api.trademc.org/shop.getOnline?shop=221463&v=3')
        .then(response => response.json())
        .then(data => {
            document.getElementById('online').textContent = `Онлайн ${data.response.players} из ${data.response.max_players}`
        })
}

updateOnlinePlayers();
setInterval(updateOnlinePlayers, 10000);

function smoothScrollTo(target) {
    var targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    var startPosition = window.pageYOffset;
    var distance = targetPosition - startPosition;
    var duration = 800;
    var start = null;

    window.requestAnimationFrame(step);

    function step(timestamp) {
        if (!start) start = timestamp;
        var progress = timestamp - start;
        window.scrollTo(0, easeInOutQuad(progress, startPosition, distance, duration));
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
}

function easeInOutQuad(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}

function copyIp() {
    var ipText = "unixcloud.org";

    navigator.clipboard.writeText(ipText).then(function() {
        document.getElementById('buttonCopy').innerHTML = 'СКОПИРОВАНО!'

        setTimeout(function() {
            document.getElementById('buttonCopy').innerText = 'UNIXCLOUD.ORG';
        }, 2000)
    })
}

function onlinePlayerServer() {
    fetch('https://api.trademc.org/shop.getOnline?shop=221463&v=3')
        .then(response => response.json())
        .then(data => {
            document.getElementById('onlinePlayerServer').textContent = `Онлайн ${data.response.players} из ${data.response.max_players}`
        })
}

function openMenuMedia() {
    var modal = document.getElementById('mediaMainMenu');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeMenuMedia() {
    var modal = document.getElementById('mediaMainMenu');
    if (modal) {
        modal.style.display = 'none';
    }
}