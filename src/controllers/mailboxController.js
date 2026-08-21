const {
  loginMailbox
} = require('../services/mailboxAccessService');

async function login(
  req,
  res,
  next
) {
  try {
    const result =
      await loginMailbox(
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        'Correo abierto correctamente',
      data:
        result
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(
  req,
  res,
  next
) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        id:
          req.mailboxAlias.id,
        email:
          req.mailboxAlias.fullAddress,
        platformGroup:
          req.mailboxAlias.platformGroup ||
          null
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getMe
};
