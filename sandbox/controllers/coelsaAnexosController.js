/**
 * Controlador COELSA - Anexos
 * Implementa operaciones de anexos y reportes según especificación COELSA
 */

const { v4: uuidv4 } = require('uuid');

// Simulación de base de datos para anexos
let anexos = [];

// Datos de ejemplo para causales de recupero
const causalesRecupero = [
  { code: 'R001', descripcion: 'Firma disconforme' },
  { code: 'R002', descripcion: 'Firma ilegible' },
  { code: 'R003', descripcion: 'Firma en blanco' },
  { code: 'R004', descripcion: 'Firma falsificada' },
  { code: 'R005', descripcion: 'Firma de menor de edad' },
  { code: 'R006', descripcion: 'Firma de incapaz' },
  { code: 'R007', descripcion: 'Firma de fallecido' },
  { code: 'R008', descripcion: 'Fondos insuficientes' },
  { code: 'R009', descripcion: 'Cuenta cerrada' },
  { code: 'R010', descripcion: 'Cuenta bloqueada' },
  { code: 'R011', descripcion: 'Cheque postdatado' },
  { code: 'R012', descripcion: 'Cheque vencido' },
  { code: 'R013', descripcion: 'Cheque cancelado' },
  { code: 'R014', descripcion: 'Cheque robado' },
  { code: 'R015', descripcion: 'Cheque extraviado' },
];

/**
 * Consultar archivo de conciliación
 * GET /Conciliacion/{fecha}
 */
const consultarConciliacion = async (req, res) => {
  try {
    const { fecha } = req.params;

    // Validar formato de fecha (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        error: 'INVALID_DATE_FORMAT',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular datos de conciliación para la fecha
    const conciliacion = {
      fecha,
      total_cheques: Math.floor(Math.random() * 100) + 10,
      cheques: [
        {
          cheque_id: `ECHEQ-${Date.now()}-001`,
          status: 'Pagado',
          monto: 50000,
          fecha_pago: fecha,
          entidad: '017',
        },
        {
          cheque_id: `ECHEQ-${Date.now()}-002`,
          status: 'Rechazado',
          monto: 75000,
          causal: 'R008',
          fecha_rechazo: fecha,
          entidad: '017',
        },
        {
          cheque_id: `ECHEQ-${Date.now()}-003`,
          status: 'Pendiente',
          monto: 100000,
          fecha_vencimiento: fecha,
          entidad: '017',
        },
      ],
      resumen: {
        total_pagados: 50000,
        total_rechazados: 75000,
        total_pendientes: 100000,
        cantidad_pagados: 1,
        cantidad_rechazados: 1,
        cantidad_pendientes: 1,
      },
    };

    res.status(200).json({
      success: true,
      message: 'Archivo de conciliación generado exitosamente',
      data: conciliacion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en consultarConciliacion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Consultar causales de recupero
 * GET /Reportes/Causales
 */
const consultarCausalesRecupero = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Causales de recupero consultadas exitosamente',
      data: {
        total_causales: causalesRecupero.length,
        causales: causalesRecupero,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en consultarCausalesRecupero:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generar reporte de operaciones por fecha
 * GET /Reportes/Operaciones/{fecha}
 */
const generarReporteOperaciones = async (req, res) => {
  try {
    const { fecha } = req.params;

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        error: 'INVALID_DATE_FORMAT',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular reporte de operaciones
    const reporte = {
      fecha,
      resumen_operaciones: {
        cuentas_creadas: Math.floor(Math.random() * 10) + 1,
        cheques_emitidos: Math.floor(Math.random() * 50) + 10,
        cheques_admitidos: Math.floor(Math.random() * 40) + 8,
        endosos_realizados: Math.floor(Math.random() * 20) + 5,
        devoluciones_solicitadas: Math.floor(Math.random() * 5) + 1,
        certificados_emitidos: Math.floor(Math.random() * 3) + 1,
      },
      operaciones_detalle: [
        {
          type: 'Cuenta',
          cantidad: Math.floor(Math.random() * 10) + 1,
          monto_total: null,
        },
        {
          type: 'Cheque Emitido',
          cantidad: Math.floor(Math.random() * 50) + 10,
          monto_total: (Math.floor(Math.random() * 1000000) + 100000) * 100,
        },
        {
          type: 'Cheque Admitido',
          cantidad: Math.floor(Math.random() * 40) + 8,
          monto_total: (Math.floor(Math.random() * 800000) + 80000) * 100,
        },
        {
          type: 'Endoso',
          cantidad: Math.floor(Math.random() * 20) + 5,
          monto_total: null,
        },
      ],
    };

    res.status(200).json({
      success: true,
      message: 'Reporte de operaciones generado exitosamente',
      data: reporte,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en generarReporteOperaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generar reporte de estados de cheques
 * GET /Reportes/Estados/{fecha}
 */
const generarReporteEstados = async (req, res) => {
  try {
    const { fecha } = req.params;

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        error: 'INVALID_DATE_FORMAT',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular reporte de estados
    const reporte = {
      fecha,
      estados_cheques: [
        {
          status: 'Emitido',
          cantidad: Math.floor(Math.random() * 30) + 10,
          porcentaje: 0,
        },
        {
          status: 'Activo',
          cantidad: Math.floor(Math.random() * 40) + 15,
          porcentaje: 0,
        },
        {
          status: 'Depositado',
          cantidad: Math.floor(Math.random() * 25) + 8,
          porcentaje: 0,
        },
        {
          status: 'Pagado',
          cantidad: Math.floor(Math.random() * 35) + 12,
          porcentaje: 0,
        },
        {
          status: 'Rechazado',
          cantidad: Math.floor(Math.random() * 10) + 3,
          porcentaje: 0,
        },
        {
          status: 'Anulado',
          cantidad: Math.floor(Math.random() * 8) + 2,
          porcentaje: 0,
        },
      ],
    };

    // Calcular porcentajes
    const total = reporte.estados_cheques.reduce(
      (sum, estado) => sum + estado.cantidad,
      0
    );
    reporte.estados_cheques.forEach(estado => {
      estado.porcentaje =
        total > 0 ? Math.round((estado.cantidad / total) * 100) : 0;
    });

    reporte.total_cheques = total;

    res.status(200).json({
      success: true,
      message: 'Reporte de estados generado exitosamente',
      data: reporte,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en generarReporteEstados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generar reporte de volúmenes por entidad
 * GET /Reportes/Volumenes/{fecha}
 */
const generarReporteVolumenes = async (req, res) => {
  try {
    const { fecha } = req.params;

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        error: 'INVALID_DATE_FORMAT',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular reporte de volúmenes
    const reporte = {
      fecha,
      volumenes_entidad: [
        {
          entidad_id: '017',
          name: 'Banco de la Nación Argentina',
          cheques_emitidos: Math.floor(Math.random() * 100) + 50,
          monto_total: (Math.floor(Math.random() * 5000000) + 1000000) * 100,
          promedio_monto: 0,
        },
        {
          entidad_id: '011',
          name: 'Banco de la Provincia de Buenos Aires',
          cheques_emitidos: Math.floor(Math.random() * 80) + 40,
          monto_total: (Math.floor(Math.random() * 4000000) + 800000) * 100,
          promedio_monto: 0,
        },
        {
          entidad_id: '014',
          name: 'Banco de la Ciudad de Buenos Aires',
          cheques_emitidos: Math.floor(Math.random() * 60) + 30,
          monto_total: (Math.floor(Math.random() * 3000000) + 600000) * 100,
          promedio_monto: 0,
        },
      ],
    };

    // Calcular promedios
    reporte.volumenes_entidad.forEach(entidad => {
      entidad.promedio_monto =
        entidad.cheques_emitidos > 0
          ? Math.round(entidad.monto_total / entidad.cheques_emitidos)
          : 0;
    });

    // Calcular totales
    const totales = reporte.volumenes_entidad.reduce(
      (acc, entidad) => {
        acc.cheques += entidad.cheques_emitidos;
        acc.monto += entidad.monto_total;
        return acc;
      },
      { cheques: 0, monto: 0 }
    );

    reporte.totales = totales;

    res.status(200).json({
      success: true,
      message: 'Reporte de volúmenes generado exitosamente',
      data: reporte,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en generarReporteVolumenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  consultarConciliacion,
  consultarCausalesRecupero,
  generarReporteOperaciones,
  generarReporteEstados,
  generarReporteVolumenes,
};
