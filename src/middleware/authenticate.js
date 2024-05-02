const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if no token is found, return unauthorized

    const secretKey = process.env.JWT_SECRET || 'your-secret-key';

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403); // if the token is not valid, return forbidden

        req.user = user;
        next();
    });
};

module.exports = authenticateToken;