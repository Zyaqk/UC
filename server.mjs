import express, { response } from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT;
const shopKey = process.env.SHOP_KEY;

app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options) {
    try {
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        throw new Error('Failed to fetch data');
    }
}

let lastFetchTime = 0;

app.use(async (req, res, next) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;

    if (timeSinceLastFetch < 2000) {
        await delay(2000 - timeSinceLastFetch);
    }

    lastFetchTime = Date.now();
    next();
});


app.get('/api/shop/coupon/:code', async (req, res) => {
    try {
        const data = await fetchWithRetry(`https://easydonate.ru/api/v3/shop/coupons?where_active=true`, {
            method: 'GET',
            headers: { 'Shop-Key': shopKey }
        });
        const coupon = data.response.find(coupon => coupon.code === req.params.code);
        if (coupon) {
            res.json({ success: true, coupon });
        } else {
            res.status(404).json({ success: false, error: 'Coupon not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch data' });
    }
});


app.get('/api/shop/products', async (req, res) => {
    try {
        const data = await fetchWithRetry('https://easydonate.ru/api/v3/shop/products', {
            method: 'GET',
            headers: { 'Shop-Key': shopKey }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});


app.get('/api/shop/payment/create', async (req, res) => {
    try {
        const { customer, products, coupon, email } = req.query;
        if (!customer || !products || !email) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const data = await fetchWithRetry(`https://easydonate.ru/api/v3/shop/payment/create?customer=${customer}&server_id=${process.env.SERVER_ID}&products=${products}&coupon=${coupon}&email=${email}&success_url=http://localhost:3000`, {
            method: 'GET',
            headers: { 'Shop-Key': shopKey }
        });
        
        if (data.success && data.response && data.response.payment) {
            const paymentId = data.response.payment.id;
            
            console.log(`Начался отсчет времени для проверки платежа с ID: ${paymentId}`);

            setTimeout(async () => {
                const paymentInfo = await fetchWithRetry(`https://easydonate.ru/api/v3/shop/payment/${paymentId}`, {
                    method: 'GET',
                    headers: { 'Shop-Key': shopKey }
                });

                if (paymentInfo.response && paymentInfo.response.status === 2) {
                    const updatedAt = formatUpdatedAt(paymentInfo.response.updated_at);
                    const paymentType = formatPaymentSystem(paymentInfo.response.payment_type);
                    const enrolledAmount = formatEnrolledAmount(paymentInfo.response.enrolled);

                    sendPaymentReceipt(paymentInfo.response, updatedAt, enrolledAmount, paymentType);
                } else {
                    console.log(`Оплата с айди ${paymentId} не состоялась.`);
                }
            },  3000);

            function sendPaymentReceipt(paymentData, updatedAt, enrolledAmount, paymentType) {
                const { customer, status, id, products } = paymentData;
            
                const transporter = nodemailer.createTransport({
                    host: 'smtp.mail.ru',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.PASSWORD_EMAIL
                    }
                });
            
                const mailOptions = {
                    from: 'ucunixcloud@xmail.ru',
                    to: paymentData.email,
                    subject: 'UNIXCLOUD - Ваша квитанция о платеже',
                    html: `
                        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); width: 300px; color: black;">
                            <div class="receipt" style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); width: 300px;">
                                <div class="header" style="text-align: center; margin-bottom: 20px;">
                                    <img style="width: 260px; margin-bottom: px" src="https://i.ibb.co/VwWswcZ/logoname.png">
                                    <h2 class="status" style="color: green; font-weight: bold;">${status === 2 ? 'Оплачено' : 'Неоплачено'}</h2>
                                    <div style="margin-bottom: 5px;">${updatedAt}</div>
                                    <div>ID транзакции: ${id}</div>
                                    <div>Способ оплаты: ${paymentType}</div>
                                </div>
                                <div class="details" style="margin-bottom: 20px;">
                                    <div>Покупатель: ${customer}</div>
                                    <div>Сервер: UNIXCLOUD</div>
                                    <div>На сайте: <a href="http://localhost:3000" style="color: blue;">http://localhost:3000</a></div>
                                </div>
                                <div class="items" style="margin-bottom: 20px;">
                                    ${products.map(product => `
                                        <h2 style="text-align: center;">Товары</h2>
                                        <div class="item" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                                            <div class="product" style="display: flex; justify-content: space-between; align-items: center;">
                                                <img src="${product.image}" style="width: 20px; height: 20px; margin-top: 10px">
                                                <p style="padding-left: 8px;">${product.name}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                    <div class="total" style="display: flex; justify-content: space-between;">
                                        <div>Итого: </div>
                                        <div style="color: green; padding-left: 3px">${products.reduce((total, product) => total + product.price, 0)} ₽</div>
                                    </div>
                                    <div class="total" style="display: flex; justify-content: space-between;">
                                        <div>Зачислено: </div>
                                        <div style="color: green; padding-left: 3px">${enrolledAmount} ₽</div>
                                    </div>
                                </div>
                            </div>
                        </body>
                    `
                };
            
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email:', error);
                    } else {
                        console.log('Успешный платеж с квитанцией был отправлен на почту с айди:', info.response);
                    }
                });
            }
            
            function formatUpdatedAt(updatedAt) {
                const months = [
                    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
                ];
                const date = new Date(updatedAt);
                const day = date.getDate();
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                const formattedDate = `${day} ${month} ${year} г. ${hours}:${minutes}:${seconds} (GMT+3)`;
            
                return formattedDate;
            }

            function formatEnrolledAmount(enrolledAmount) {
                return enrolledAmount.toFixed(2);
            }

            function formatPaymentSystem(paymentType) {
                switch (paymentType) {
                    case 'test':
                        return 'Тестовая оплата';
                    case 'qiwi':
                        return 'QIWI Кошелек';
                    case 'card':
                        return 'Банковская карта';
                    case 'mc':
                        return 'MC';
                    case 'webmoney':
                        return 'WebMoney';
                    case 'yandex':
                        return 'Yandex Pay';
                    default:
                        return 'Неизвестный тип оплаты';
                }
            }

        } else {
            console.error('Не удалось получить информацию о платеже.');
        }
        
        res.json(data);
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});


app.get('/api/shop/payment/:id', async (req, res) => {
    try {
        const { customer, products, coupon } = req.query;
        if (!customer || !products) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        const data = await fetchWithRetry(`https://easydonate.ru/api/v3/shop/payment/{id}`, {
            method: 'GET',
            headers: { 'Shop-Key': shopKey }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});


app.get('/api/shop/payments', async (req, res) => {
    try {
        const data = await fetchWithRetry('https://easydonate.ru/api/v3/shop/payments', {
            method: 'GET',
            headers: { 'Shop-Key': shopKey }
        });
        if (data.success && Array.isArray(data.response)) {
            const lastTenPayments = data.response.slice(-12);
            res.json({ success: true, response: lastTenPayments });
        } else {
            res.status(500).json({ error: 'Unexpected data format' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});


app.get('/api/shop/custommessages', async (req, res) => {
    try {
        const data = await fetchWithRetry('https://easydonate.ru/api/v3/plugin/EasyDonate.CustomMessages/getSettings', {
            method: 'GET',
            headers: { 'Shop-Key': shopKey }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});


app.post('/', (req, res) => {
    res.sendStatus(200);
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});