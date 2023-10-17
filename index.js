// server/index.js

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const bcrypt = require('bcrypt');
const db = require('./db');
const PORT = process.env.SERVER_PORT || 3001;

const app = express();
const expressSession = require('express-session');
const Replicate = require('replicate');
require('dotenv').config();
app.use(express.static('client/build'));
const authMiddleware = require('./authMiddleware');

const axios = require('axios');




app.use(cors({
    origin: 'https://bgappia2.azurewebsites.net',
    //origin: 'http://localhost:3000',
    credentials: true
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSession({ secret: 'mySecretKey', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

require("./passportConfig")(passport);
//register
app.post('/register', (req, res) => {
    try {

        const username = req.body.username;
        const password = req.body.password;
        const coupon = req.body.coupon;
        const email = req.body.email;
        const query = 'INSERT INTO `user`(`username`,`password`,`email`,`coupon`,`attempt`, `subscribre`,`created_at`) VALUES (?,?,?,?,?,?,?)';
        const query2 = 'SELECT * FROM user WHERE username=?';
        db.query(query2, [username], (err, result) => {
            if (err) {
                throw err;
            }
            if (result.length > 0) {
                res.send({ message: "Username already exists" });
            } else {
                const hashedPassword = bcrypt.hashSync(password, 10);
                db.query(query, [username, hashedPassword, email, coupon, 0, false, new Date()], (err, result) => {
                    if (err) {
                        throw err;
                    }
                    res.send({ message: "User Created" });
                    //res.push('dashboard');
                });
            }
        });
    } catch (err) {
        res.send({ message: err });
    }
});

//login 
app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).send('No user exists!');
        }
        req.login(user, (err) => {
            if (err) {
                return next(err);
            }
            res.send("User Logged in");
            console.log(user.info);
        });
    })(req, res, next);
});

//get user information
app.get('/getUser', (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        res.json(user);
    } else {
        res.status(401).send('Unauthorized');
    }
});

// logging out
app.get('/logout', (req, res) => {
    if (req.isAuthenticated()) {
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            //window.location.href = '/login';
            res.redirect('/');
            // res.send('logged out');
        });
    } else {
        res.send('not loggin');
    }
});

//increment user uses
app.get('/incrementAttempt', authMiddleware, (req, res) => {
    if (req.isAuthenticated()) {
        const userId = req.user.id;
        const incrementQuery = 'UPDATE user SET attempt = attempt + 1 WHERE id = ?';

        db.query(incrementQuery, [userId], (err, result) => {
            if (err) {
                console.error('Error incrementing attempt:', err);
                return res.status(500).json({ error: 'An error occurred while incrementing attempt' });
            }

            return res.json({ message: 'Attempt incremented successfully' });
        });
    } else {
        return res.json({ message: 'Login please!' });
    }
});

app.get('/checkNumberOfAttempt', authMiddleware, (req, res) => {
    if (req.isAuthenticated()) {
        const query = "SELECT * FROM `user` WHERE id = ?";
        db.query(query, [req.user.id], (err, result) => {
            if (err) { throw err; res.json(false); }
            const userInfo = {
                numberOfAttenmt: result[0].attempt,
                subscribre: result[0].subscribre,
            }
            if ((result[0].attempt < 1 && result[0].subscribre == false) || result[0].subscribre == true) {
                res.json(true);
            } else {
                res.json(false);
            }

        })
    } else {
        res.json(false);
    }
});

app.get('/checkSubscribe', authMiddleware, (req, res) => {
    if (req.isAuthenticated()) {
        const query = "SELECT * FROM `user` WHERE id = ?";
        db.query(query, [req.user.id], (err, result) => {
            if (err) { throw err; res.json(false); }
            const userInfo = {
                subscribre: result[0].subscribre,
            }
            if (result[0].subscribre == true) {
                res.json(true);
            } else {
                res.json(false);
            }

        })
    } else {
        res.json(false);
    }
});
/*** route */
app.get('/checkAuthUser', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(true);
    } else {
        res.json(false);
    }
});

//APIs
//rm bg
app.get('/api/rmbg/', authMiddleware, async (req, res) => {
    const { url } = req.query;
    const decodedUrl = decodeURIComponent(url);
    try {
        const replicate = new Replicate({
            auth: process.env.REACT_APP_EPLICATE_API_TOKEN,

        });

        const output = await replicate.run(
            "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
            {
                input: {
                    image: decodedUrl,
                }
            }
        );
        res.status(200).json({ newurl: output });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }

});


//Gen BG api
app.get('/api/genbg/', authMiddleware, async (req, res) => {
    console.log('entred');
    try {
        const { url, promptDesc, image_number, NpromptDesc, size, scale } = req.query;
        const decodedUrl2 = decodeURIComponent(promptDesc);
        const decodedUrl = decodeURIComponent(url);
        const NegPrompt = decodeURIComponent(NpromptDesc);
        const Dsize = decodeURIComponent(size);
        const Dscale = decodeURIComponent(scale);

        const replicate = new Replicate({
            auth: process.env.REACT_APP_EPLICATE_API_TOKEN,
        });

        const output = await replicate.run(
            "logerzhu/ad-inpaint:b1c17d148455c1fda435ababe9ab1e03bc0d917cc3cf4251916f22c45c83c7df",
            {
                input: {
                    image_path: decodedUrl,
                    prompt: decodedUrl2,
                    image_num: Number(image_number),
                    //negative_prompt: "cat",
                    negative_prompt: NegPrompt,
                    product_size: Dsize,//Original, //product_size: 0.6 * width
                    //api_key: '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',
                    scale: Number(Dscale),//4,
                    //guidance_scale: Dscale,//7.5,
                    // num_inference_steps: 20,
                    // manual_seed: -1,
                },
            }
        );
        res.status(200).json({ newurl: output });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

const CheckoutDetails = new Map([
    [1, { priceInDollar: 19, name: "monthly subscription" }]
])




//Connect Lemon Squeezy


app.get('/api/lemonsqueezy1', authMiddleware, async (req, res) => {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    try {
        axios.get('https://api.lemonsqueezy.com/v1/products', {
            headers: {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                Authorization: `Bearer ${apiKey}`,
            },
        })
            .then(response => {
                res.status(200).json(response.data.data[0]);
            })
            .catch(error => {
                res.status(400).json({ error: 'error' });
                console.error(error);
            });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

const apiKey = process.env.LEMONSQUEEZY_API_KEY;
app.get('/api/lemonsqueezy2', authMiddleware, async (req, res) => {

    try {
        axios.get('https://api.lemonsqueezy.com/v1/products', {
            headers: {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                Authorization: `Bearer ${apiKey}`,
            },
        })
            .then(response => {
                res.status(200).json(response.data.data[1]);
            })
            .catch(error => {
                res.status(400).json({ error: 'error' });
                console.error(error);
            });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


app.get('/api/getCheckOutUrl', async (req, res) => {
    var user = null;
    try {
        if (req.isAuthenticated()) {
            user = req.user;
        } else {
            console.log('Unauthorized');
        }
        if (!user) {
            return res.status(404).json({ message: "Your account was not found" });
        }

        const checkout = await axios.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            {
                data: {
                    type: 'checkouts',
                    attributes: {

                        checkout_data: {
                            // discount_code: user.coupon,
                            email: user.email,
                            custom: [`${user.id}`]
                        },
                        preview: true
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: '26887'
                            }
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                id: '99012'
                                //id: '101465'
                            }
                        }
                    }
                },
            },
            {
                headers: {
                    Accept: 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    Authorization: `Bearer ${apiKey}`
                }
            }
        );
        res.status(201).json(checkout.data.data.attributes.url);
    } catch (err) {
        res.status(500).json({ message: err.message || err });
    }

});

app.get('/api/getCheckOutUrll', async (req, res) => {
    var user = null;
    try {
        if (req.isAuthenticated()) {
            user = req.user;
            console.log(user);
        } else {
            console.log('Unauthorized');
        }
        if (!user) {
            return res.status(404).json({ message: "Your account was not found" });
        }

        const checkout = await axios.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            {
                data: {
                    type: 'checkouts',
                    attributes: {

                        checkout_data: {
                            // discount_code: user.coupon,
                            email: user.email,
                            custom: [`${user.id}`]
                        },
                        preview: true
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: '26887'
                            }
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                //id: '99012'
                                id: '101465'
                            }
                        }
                    }
                },
            },
            {
                headers: {
                    Accept: 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    Authorization: `Bearer ${apiKey}`
                }
            }
        );
        res.status(201).json(checkout.data.data.attributes.url);
    } catch (err) {
        res.status(500).json({ message: err.message || err });
    }

});




//setSubscription 
/*
app.get('/api/setSubscription', authMiddleware, (req, res) => {
    if (req.isAuthenticated()) {
        const userId = req.user.id;
        const incrementQuery = 'UPDATE user SET subscribre = 1 WHERE id = ?';

        db.query(incrementQuery, [userId], (err, result) => {
            if (err) {
                console.error('Error incrementing attempt:', err);
                return res.status(500).json({ error: 'An error occurred while incrementing attempt' });
            }

            return res.json({ message: 'Subscribed successfully' });
        });
    } else {
        return res.json({ message: 'Login please!' });
    }
});

app.get('/api/removeSubscription', authMiddleware, (req, res) => {
    if (req.isAuthenticated()) {
        const userId = req.user.id;
        const incrementQuery = 'UPDATE user SET subscribre = 0 WHERE id = ?';

        db.query(incrementQuery, [userId], (err, result) => {
            if (err) {
                console.error('Error incrementing attempt:', err);
                return res.status(500).json({ error: 'An error occurred while incrementing attempt' });
            }

            return res.json({ message: 'UnSubscribed successfully' });
        });
    } else {
        return res.json({ message: 'Login please!' });
    }
});
*/

app.get("/api", (req, res) => {
    res.json({ message: "Hello from server!" });
});













//apply middleware dashboard
/*
app.get('/dashboard', authMiddleware, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});*/
//app.use('/dashboard', authMiddleware);



/*

// Have Node serve the files for our built React app
app.use(express.static(path.resolve(__dirname, '../client/build')));

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    //app.get('*', (req, res) => res.sendFile(path.resolve('client', 'build', 'index.html')));
});

*/



app.use(express.static(path.resolve(__dirname, 'client', 'build')));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
});



const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

});













/*

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

*/







/*

app.get('/', (req, res) => {
    const filePath = path.resolve(__dirname, '../client/build/index.html');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        }
    });
});

*/