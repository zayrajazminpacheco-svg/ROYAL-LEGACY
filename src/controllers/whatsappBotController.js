const whatsappBotService =
  require('../services/whatsappBotService');


async function getSettings(
  req,
  res,
  next
) {
  try {
    const data =
      await whatsappBotService
        .getSettings();

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}


async function updateSettings(
  req,
  res,
  next
) {
  try {
    const data =
      await whatsappBotService
        .updateSettings(
          req.body || {}
        );

    return res.status(200).json({
      success: true,
      message:
        'Configuración del bot actualizada',
      data
    });
  } catch (error) {
    next(error);
  }
}


async function listCommands(
  req,
  res,
  next
) {
  try {
    const data =
      await whatsappBotService
        .listCommands();

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}


async function createCommand(
  req,
  res,
  next
) {
  try {
    const data =
      await whatsappBotService
        .createCommand(
          req.body || {}
        );

    return res.status(201).json({
      success: true,
      message:
        'Comando creado correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
}


async function updateCommand(
  req,
  res,
  next
) {
  try {
    const data =
      await whatsappBotService
        .updateCommand(
          req.params.id,
          req.body || {}
        );

    return res.status(200).json({
      success: true,
      message:
        'Comando actualizado correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
}


async function deleteCommand(
  req,
  res,
  next
) {
  try {
    const data =
      await whatsappBotService
        .deleteCommand(
          req.params.id
        );

    return res.status(200).json({
      success: true,
      message:
        'Comando eliminado',
      data
    });
  } catch (error) {
    next(error);
  }
}


module.exports = {
  getSettings,
  updateSettings,
  listCommands,
  createCommand,
  updateCommand,
  deleteCommand
};