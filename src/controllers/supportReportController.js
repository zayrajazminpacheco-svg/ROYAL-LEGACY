const supportReportService =
  require('../services/supportReportService');

// ============================================================
// CLIENTE: LISTAR MIS REPORTES
// ============================================================

async function listMyReports(
  req,
  res,
  next
) {
  try {
    const result =
      await supportReportService.listMyReports(
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

// ============================================================
// CLIENTE: VER UN REPORTE PROPIO
// ============================================================

async function getMyReport(
  req,
  res,
  next
) {
  try {
    const result =
      await supportReportService.getMyReport(
        req.params.id,
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

// ============================================================
// CLIENTE: CREAR REPORTE
// ============================================================

async function createMyReport(
  req,
  res,
  next
) {
  try {
    const result =
      await supportReportService.createMyReport(
        req.user.id,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        'Reporte enviado correctamente',
      data: result
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: LISTAR REPORTES
// ============================================================

async function listReports(
  req,
  res,
  next
) {
  try {
    const result =
      await supportReportService.listReports(
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

// ============================================================
// ADMINISTRACIÓN: VER REPORTE
// ============================================================

async function getReport(
  req,
  res,
  next
) {
  try {
    const result =
      await supportReportService.getReport(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: ACTUALIZAR REPORTE
// ============================================================

async function updateReport(
  req,
  res,
  next
) {
  try {
    const result =
      await supportReportService.updateReport(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        'Reporte actualizado correctamente',
      data: result
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE O ADMINISTRACIÓN: VER ARCHIVO PROTEGIDO
// ============================================================

async function getReportAttachment(
  req,
  res,
  next
) {
  try {
    const attachment =
      await supportReportService.getReportAttachment(
        req.params.id,
        req.user
      );

    const encodedName =
      encodeURIComponent(
        attachment.name ||
        'archivo'
      );

    res.setHeader(
      'Content-Type',
      attachment.mimeType
    );

    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedName}`
    );

    res.setHeader(
      'Cache-Control',
      'private, no-store, max-age=0'
    );

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    if (
      Number.isFinite(
        Number(
          attachment.size
        )
      )
    ) {
      res.setHeader(
        'Content-Length',
        String(
          attachment.size
        )
      );
    }

    return res
      .status(200)
      .send(
        attachment.data
      );

  } catch (error) {
    next(error);
  }
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listMyReports,
  getMyReport,
  createMyReport,
  listReports,
  getReport,
  updateReport,
  getReportAttachment
};