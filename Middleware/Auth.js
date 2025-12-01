const { verify } = require('jsonwebtoken');

const Authmiddleware = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).json({ error: "Autorização não fornecida" });
    }

    const tokenParts = req.headers.authorization.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ error: "Formato de token inválido" });
    }

    const accessToken = tokenParts[1];

    verify(accessToken, process.env.TOKEN_VERIFY_ACCESS, (err, decodedToken) => {
        if (err) {
            return res.status(401).json({ error: "Token inválido" });
        } else {
            req.user = decodedToken;
            next();
        }
    });
};

module.exports = Authmiddleware;
