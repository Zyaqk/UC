let cuponInputMedia;

function addCouponMedia() {
    if (!cuponInputMedia) {
        const userInput = prompt('Введите существующий купон!');
        if (userInput !== null && userInput.trim() !== '') {
            cuponInputMedia = userInput.trim();
        }
    }

    if (cuponInputMedia !== undefined && cuponInputMedia.trim() !== '') {
        const cupon = cuponInputMedia.trim();
        const addCuponMedia = document.getElementById('addCuponMedia');
        
        fetch(`/api/shop/coupon/${cupon}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addCuponMedia.textContent = 'ВАШ КУПОН: ' + cupon;
                } else {
                    alert('Нет такого купона!');
                }
            });
    } else {
        alert('Добавьте купон!');
    }
}

function handleButtonClick(itemId) {
    const nicknameInput = prompt('Введите обязательно свой ник!');
    const cuponInput = document.getElementById('cuponInput').value.trim();
    const email = prompt('Введите обязательно свою почту!');
    
    function validateNickname(nickname) {
        if (!nickname || nickname === "null") {
            alert('Введите свой никнейм!');
            return false;
        }
        if (nickname.length < 3) {
            alert("Ошибка: Никнейм должен содержать как минимум 3 символа.");
            return false;
        }
        if (nickname.includes(" ")) {
            alert("Ошибка: Никнейм не должен содержать пробелов.");
            return false;
        }
        return true;
    }
    
    function validateEmail(email) {
        if (!email || email === "null") {
            alert('Введите свою электронную почту');
            return false;
        }
        if (!email.includes("@")) {
            alert("Ошибка: Электронная почта должна содержать символ '@'.");
            return false;
        }
        return true;
    }

    if (!validateNickname(nicknameInput) || !validateEmail(email)) {
        return;
    }

    fetch(`/api/shop/payment/create?customer=${nicknameInput}&server_id=92777&products={"${itemId}":1}&coupon=${cuponInput || cuponInputMedia}&email=${email}&success_url=http://localhost:3000`)
        .then(response => response.json())
        .then(data => {
            console.log(data.response);
            if (data.success) {
                window.location = data.response.url;
            } else {
                console.error(data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}
