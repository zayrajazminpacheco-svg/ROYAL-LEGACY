const walletService =
  require('../services/walletService');

async function getMyWallet(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.getMyWallet(
        req.user.id
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function createTopUp(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.createTopUp(
        req.user.id,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        'Solicitud de recarga creada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function listMyTopUps(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.listMyTopUps(
        req.user.id,
        req.query
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function submitTopUp(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.submitTopUp(
        req.user.id,
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        'CEP enviado para revisión',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function cancelMyTopUp(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.cancelMyTopUp(
        req.user.id,
        req.params.id
      );

    return res.status(200).json({
      success: true,
      message:
        'Solicitud cancelada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function listTopUps(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.listTopUps(
        req.query
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function approveTopUp(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.approveTopUp(
        req.params.id,
        req.user.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        result.alreadyApproved
          ? 'La recarga ya estaba acreditada'
          : 'Recarga acreditada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function rejectTopUp(
  req,
  res,
  next
) {
  try {
    const result =
      await walletService.rejectTopUp(
        req.params.id,
        req.user.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        'Recarga rechazada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getTopUpCep(
  req,
  res,
  next
) {
  try {
    const cep =
      await walletService.getTopUpCep(
        req.params.id,
        req.user
      );

    const encodedName =
      encodeURIComponent(
        cep.name ||
        'cep.xml'
      );

    res.setHeader(
      'Content-Type',
      cep.mimeType
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedName}`
    );

    res.setHeader(
      'Cache-Control',
      'private, no-store, max-age=0'
    );

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    res.setHeader(
      'Content-Length',
      String(cep.size)
    );

    return res
      .status(200)
      .send(cep.data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyWallet,
  createTopUp,
  listMyTopUps,
  submitTopUp,
  cancelMyTopUp,
  listTopUps,
  approveTopUp,
  rejectTopUp,
  getTopUpCep
};
