const jwt = require("jsonwebtoken");
const { User } = require("../models");

const isAdmin = async (req, res, next) => {
  const adminKey = req.headers["x-admin-key"];
  const allowedAdminKey = process.env.ADMIN_API_KEY;

  // ✅ Caso 1: acesso via x-admin-key (Insomnia)
  if (adminKey && adminKey === allowedAdminKey) {
    return next(); // libera sem precisar validar o usuário no banco
  }

  // ✅ Caso 2: acesso via JWT (painel de admin)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Invalid token access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_VERIFY_ACCESS);
    req.user = decoded;

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: "Access denied, only administrators." });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Token expired" });
  }
};

module.exports = isAdmin;
