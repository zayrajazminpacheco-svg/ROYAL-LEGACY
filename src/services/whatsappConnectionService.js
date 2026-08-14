const fs = require('fs');
const path = require('path');

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} = require('baileys');

const prisma = require('../lib/prisma');
const whatsappBotService = require('./whatsappBotService');


// ============================================================
// CONFIGURACIÓN
// ============================================================

const WA_VERSION = [
  2,
  3000,
  1037641644
];

const AUTH_FOLDER = path.join(
  process.cwd(),
  'generated',
  'whatsapp-auth'
);

const PLATFORM_IMAGE_FOLDER = path.join(
  process.cwd(),
  'public',
  'bot-platforms'
);

const RECONNECT_DELAYS = [
  3000,
  5000,
  10000,
  15000,
  30000,
  60000
];


// ============================================================
// ESTADO
// ============================================================

let socket = null;
let connectionState = 'disconnected';
let currentQr = null;
let currentUser = null;
let groupsCache = [];

let reconnectTimer = null;
let reconnectAttempt = 0;
let connectionGeneration = 0;

let manualDisconnect = false;
let connectingPromise = null;


// ============================================================
// PLATAFORMAS
// ============================================================

const PLATFORM_ALIASES = {
  netflix: [
    'netflix'
  ],

  disney: [
    'disney',
    'disney+',
    'disney plus'
  ],

  hbo: [
    'hbo',
    'hbo max',
    'max'
  ],

  max: [
    'hbo',
    'hbo max',
    'max'
  ],

  prime: [
    'prime',
    'prime video',
    'amazon prime',
    'amazon prime video'
  ],

  crunchy: [
    'crunchy',
    'crunchyroll'
  ],

  crunchyroll: [
    'crunchy',
    'crunchyroll'
  ],

  paramount: [
    'paramount',
    'paramount+',
    'paramount plus'
  ],

  spotify: [
    'spotify'
  ],

  youtube: [
    'youtube',
    'youtube premium'
  ],

  gemini: [
    'gemini',
    'gemini pro',
    'google one'
  ],

  canva: [
    'canva',
    'canva pro'
  ]
};


// ============================================================
// UTILIDADES
// ============================================================

function cleanText(value = '') {
  return String(value || '').trim();
}


function normalizeText(value = '') {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}


function normalizePlatformCommand(value = '') {
  return normalizeText(value)
    .replace(/^[.!/]+/, '')
    .trim();
}


function formatMoney(value) {
  return new Intl.NumberFormat(
    'es-MX',
    {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2
    }
  ).format(Number(value || 0));
}


function extractMessageText(message) {
  const content = message?.message;

  if (!content) {
    return '';
  }

  if (content.conversation) {
    return cleanText(
      content.conversation
    );
  }

  if (
    content.extendedTextMessage
      ?.text
  ) {
    return cleanText(
      content.extendedTextMessage.text
    );
  }

  if (
    content.imageMessage
      ?.caption
  ) {
    return cleanText(
      content.imageMessage.caption
    );
  }

  if (
    content.videoMessage
      ?.caption
  ) {
    return cleanText(
      content.videoMessage.caption
    );
  }

  if (
    content.ephemeralMessage
      ?.message
  ) {
    return extractMessageText({
      message:
        content.ephemeralMessage.message
    });
  }

  if (
    content.viewOnceMessage
      ?.message
  ) {
    return extractMessageText({
      message:
        content.viewOnceMessage.message
    });
  }

  if (
    content.viewOnceMessageV2
      ?.message
  ) {
    return extractMessageText({
      message:
        content.viewOnceMessageV2.message
    });
  }

  return '';
}


// ============================================================
// COMANDO DE PLATAFORMA
// ============================================================

function detectPlatformCommand(text) {
  const raw = cleanText(text);

  if (!raw) {
    return null;
  }

  if (
    !/^[.!/]/.test(raw)
  ) {
    return null;
  }

  const command =
    normalizePlatformCommand(
      raw.split(/\s+/)[0]
    );

  if (
    PLATFORM_ALIASES[command]
  ) {
    return command;
  }

  return null;
}


// ============================================================
// BUSCAR PRODUCTO
// ============================================================

async function findPlatformProduct(
  command
) {
  const terms =
    PLATFORM_ALIASES[command] ||
    [command];

  const products =
    await prisma.product.findMany({
      where: {
        active: true
      },

      include: {
        variants: {
          where: {
            active: true
          },

          include: {
            InventoryItem: {
              where: {
                status:
                  'AVAILABLE'
              },

              select: {
                id: true
              }
            }
          },

          orderBy: {
            publicPrice:
              'asc'
          }
        }
      },

      orderBy: {
        createdAt:
          'desc'
      }
    });


  const product =
    products.find(
      item => {
        const source =
          normalizeText(
            [
              item.name,
              item.slug,
              item.description
            ]
              .filter(Boolean)
              .join(' ')
          );

        return terms.some(
          term =>
            source.includes(
              normalizeText(term)
            )
        );
      }
    );


  if (!product) {
    return null;
  }


  const variants =
    (product.variants || [])
      .map(
        variant => ({
          id:
            variant.id,

          publicName:
            variant.publicName,

          publicPrice:
            Number(
              variant.publicPrice || 0
            ),

          durationDays:
            Number(
              variant.durationDays || 0
            ),

          accessType:
            variant.accessType,

          stock:
            Array.isArray(
              variant.InventoryItem
            )
              ? variant
                  .InventoryItem
                  .length
              : 0
        })
      );


  const totalStock =
    variants.reduce(
      (total, variant) =>
        total +
        Number(
          variant.stock || 0
        ),
      0
    );


  return {
    id:
      product.id,

    name:
      product.name,

    slug:
      product.slug,

    description:
      product.description,

    imageUrl:
      product.imageUrl,

    variants,

    totalStock
  };
}


// ============================================================
// TEXTO DEL CATÁLOGO
// ============================================================

function buildPlatformCaption(
  product
) {
  const lines = [];

  lines.push(
    `👑 *${String(
      product.name ||
      'Plataforma'
    ).toUpperCase()}*`
  );

  lines.push('');


  if (
    !product.variants.length
  ) {
    lines.push(
      '⚠️ No hay planes configurados.'
    );

    return lines.join('\n');
  }


  for (
    const variant
    of product.variants
  ) {
    lines.push(
      `✨ *${variant.publicName}*`
    );

    lines.push(
      `💰 ${formatMoney(
        variant.publicPrice
      )}`
    );

    lines.push(
      `📦 Disponibles: *${variant.stock}*`
    );


    if (
      variant.durationDays
    ) {
      if (
        variant.durationDays % 30 === 0
      ) {
        const months =
          variant.durationDays / 30;

        lines.push(
          `📅 ${
            months === 1
              ? '1 mes'
              : `${months} meses`
          }`
        );
      } else {
        lines.push(
          `📅 ${variant.durationDays} días`
        );
      }
    }

    lines.push('');
  }


  if (
    product.totalStock > 0
  ) {
    lines.push(
      `✅ *Stock total: ${product.totalStock}*`
    );

    lines.push(
      '💎 Legacy Royal Stream'
    );
  } else {
    lines.push(
      '❌ *Agotado por el momento*'
    );
  }


  return lines
    .join('\n')
    .trim();
}


// ============================================================
// IMAGEN LOCAL
// ============================================================

function findLocalPlatformImage(
  command,
  product
) {
  const candidates = [
    command,
    product?.slug,
    normalizePlatformCommand(
      product?.name
    )
  ]
    .filter(Boolean)
    .map(
      value =>
        normalizeText(value)
          .replace(/\+/g, '')
          .replace(/\s+/g, '-')
    );


  const extensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp'
  ];


  for (
    const candidate
    of candidates
  ) {
    for (
      const extension
      of extensions
    ) {
      const filePath =
        path.join(
          PLATFORM_IMAGE_FOLDER,
          `${candidate}${extension}`
        );

      if (
        fs.existsSync(filePath)
      ) {
        return filePath;
      }
    }
  }


  return null;
}


// ============================================================
// RESPUESTA DE PLATAFORMA
// ============================================================

async function sendPlatformResponse(
  remoteJid,
  command
) {
  const product =
    await findPlatformProduct(
      command
    );


  if (!product) {
    await socket.sendMessage(
      remoteJid,
      {
        text:
          '⚠️ Esa plataforma todavía no está configurada en el catálogo.'
      }
    );

    return;
  }


  const caption =
    buildPlatformCaption(
      product
    );

  const localImage =
    findLocalPlatformImage(
      command,
      product
    );


  if (localImage) {
    await socket.sendMessage(
      remoteJid,
      {
        image:
          fs.readFileSync(
            localImage
          ),

        caption
      }
    );

    return;
  }


  if (
    product.imageUrl &&
    /^https?:\/\//i.test(
      product.imageUrl
    )
  ) {
    try {
      await socket.sendMessage(
        remoteJid,
        {
          image: {
            url:
              product.imageUrl
          },

          caption
        }
      );

      return;

    } catch (error) {
      console.error(
        '[WHATSAPP] Error enviando imagen:',
        error.message
      );
    }
  }


  await socket.sendMessage(
    remoteJid,
    {
      text: caption
    }
  );
}


// ============================================================
// COMANDO PERSONALIZADO
// ============================================================

async function sendCustomCommandResponse(
  remoteJid,
  command
) {
  if (!command) {
    return;
  }


  const type =
    String(
      command.responseType ||
      'TEXT'
    )
      .trim()
      .toUpperCase();

  const response =
    cleanText(
      command.response
    );

  const mediaUrl =
    cleanText(
      command.mediaUrl
    );


  if (
    type === 'IMAGE' &&
    mediaUrl
  ) {
    await socket.sendMessage(
      remoteJid,
      {
        image: {
          url: mediaUrl
        },

        caption:
          response ||
          undefined
      }
    );

    return;
  }


  if (
    type === 'AUDIO' &&
    mediaUrl
  ) {
    await socket.sendMessage(
      remoteJid,
      {
        audio: {
          url: mediaUrl
        },

        mimetype:
          'audio/mpeg'
      }
    );

    if (response) {
      await socket.sendMessage(
        remoteJid,
        {
          text: response
        }
      );
    }

    return;
  }


  if (
    type === 'LINK'
  ) {
    const text =
      [
        response,
        mediaUrl
      ]
        .filter(Boolean)
        .join('\n');

    if (text) {
      await socket.sendMessage(
        remoteJid,
        {
          text
        }
      );
    }

    return;
  }


  if (response) {
    await socket.sendMessage(
      remoteJid,
      {
        text: response
      }
    );
  }
}


// ============================================================
// PROCESAR MENSAJE
// ============================================================

async function processIncomingMessage(
  message
) {
  try {
    if (
      !message ||
      message.key?.fromMe
    ) {
      return;
    }


    const remoteJid =
      cleanText(
        message.key
          ?.remoteJid
      );


    if (
      !remoteJid.endsWith(
        '@g.us'
      )
    ) {
      return;
    }


    const settings =
      await whatsappBotService
        .getSettings();


    if (
      !settings?.enabled
    ) {
      return;
    }


    const allowedGroupId =
      cleanText(
        settings.allowedGroupId
      );


    if (
      !allowedGroupId ||
      allowedGroupId !==
        remoteJid
    ) {
      return;
    }


    const text =
      extractMessageText(
        message
      );


    if (!text) {
      return;
    }


    console.log(
      '[WHATSAPP] Mensaje:',
      text
    );


    const platformCommand =
      detectPlatformCommand(
        text
      );


    if (platformCommand) {
      await sendPlatformResponse(
        remoteJid,
        platformCommand
      );

      return;
    }


    const command =
      await whatsappBotService
        .findResponseForMessage(
          text
        );


    if (!command) {
      return;
    }


    await sendCustomCommandResponse(
      remoteJid,
      command
    );

  } catch (error) {
    console.error(
      '[WHATSAPP] Error procesando mensaje:',
      error.message
    );
  }
}


// ============================================================
// GRUPOS
// ============================================================

async function refreshGroups() {
  if (!socket) {
    groupsCache = [];
    return groupsCache;
  }


  try {
    const groups =
      await socket
        .groupFetchAllParticipating();


    groupsCache =
      Object.values(
        groups || {}
      )
        .map(
          group => ({
            id:
              group.id,

            subject:
              group.subject ||
              'Grupo sin nombre',

            owner:
              group.owner ||
              null,

            size:
              Array.isArray(
                group.participants
              )
                ? group
                    .participants
                    .length
                : 0
          })
        )
        .sort(
          (a, b) =>
            a.subject.localeCompare(
              b.subject,
              'es-MX'
            )
        );


    return groupsCache;

  } catch (error) {
    console.error(
      '[WHATSAPP] Error obteniendo grupos:',
      error.message
    );

    return groupsCache;
  }
}


// ============================================================
// RECONEXIÓN
// ============================================================

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(
      reconnectTimer
    );

    reconnectTimer = null;
  }
}


function getDisconnectStatusCode(
  lastDisconnect
) {
  return (
    lastDisconnect
      ?.error
      ?.output
      ?.statusCode
    ||
    lastDisconnect
      ?.error
      ?.statusCode
    ||
    null
  );
}


function isPermanentDisconnect(
  statusCode
) {
  if (
    statusCode ===
      DisconnectReason.loggedOut
  ) {
    return true;
  }


  if (
    DisconnectReason.badSession !==
      undefined &&
    statusCode ===
      DisconnectReason.badSession
  ) {
    return true;
  }


  return false;
}


function scheduleReconnect(
  generation
) {
  if (
    manualDisconnect ||
    reconnectTimer ||
    generation !==
      connectionGeneration
  ) {
    return;
  }


  const delay =
    RECONNECT_DELAYS[
      Math.min(
        reconnectAttempt,
        RECONNECT_DELAYS.length - 1
      )
    ];


  reconnectAttempt += 1;

  connectionState =
    'reconnecting';


  console.log(
    `[WHATSAPP] Reconexión en ${Math.round(
      delay / 1000
    )} segundos...`
  );


  reconnectTimer =
    setTimeout(
      async () => {
        reconnectTimer = null;


        if (
          manualDisconnect ||
          generation !==
            connectionGeneration
        ) {
          return;
        }


        try {
          await createSocket();

        } catch (error) {
          console.error(
            '[WHATSAPP] Error reconectando:',
            error.message
          );

          scheduleReconnect(
            connectionGeneration
          );
        }
      },
      delay
    );
}


// ============================================================
// CREAR CONEXIÓN
// ============================================================

async function createSocket() {
  if (connectingPromise) {
    return connectingPromise;
  }


  const generation =
    ++connectionGeneration;


  connectingPromise =
    (
      async () => {
        try {
          manualDisconnect =
            false;


          clearReconnectTimer();


          fs.mkdirSync(
            AUTH_FOLDER,
            {
              recursive: true
            }
          );


          fs.mkdirSync(
            PLATFORM_IMAGE_FOLDER,
            {
              recursive: true
            }
          );


          const {
            state,
            saveCreds
          } =
            await useMultiFileAuthState(
              AUTH_FOLDER
            );


          connectionState =
            'connecting';

          currentQr = null;


          const newSocket =
            makeWASocket({
              auth: state,

              version:
                WA_VERSION,

              printQRInTerminal:
                false,

              browser: [
                'Royal Legacy',
                'Chrome',
                '1.0.0'
              ],

              markOnlineOnConnect:
                false,

              syncFullHistory:
                false,

              generateHighQualityLinkPreview:
                false,

              connectTimeoutMs:
                60000,

              keepAliveIntervalMs:
                20000,

              retryRequestDelayMs:
                500,

              defaultQueryTimeoutMs:
                60000
            });


          socket =
            newSocket;


          newSocket.ev.on(
            'creds.update',
            saveCreds
          );


          newSocket.ev.on(
            'connection.update',
            async update => {
              if (
                generation !==
                  connectionGeneration
              ) {
                return;
              }


              const {
                connection,
                lastDisconnect,
                qr
              } = update;


              if (qr) {
                currentQr = qr;
                connectionState =
                  'qr';

                console.log(
                  '[WHATSAPP] QR generado'
                );
              }


              if (
                connection ===
                  'connecting'
              ) {
                connectionState =
                  currentQr
                    ? 'qr'
                    : 'connecting';
              }


              if (
                connection ===
                  'open'
              ) {
                reconnectAttempt = 0;

                clearReconnectTimer();

                currentQr = null;

                currentUser =
                  newSocket.user ||
                  null;

                connectionState =
                  'connected';


                console.log(
                  '[WHATSAPP] Conectado correctamente'
                );


                await refreshGroups();

                return;
              }


              if (
                connection ===
                  'close'
              ) {
                currentQr = null;
                currentUser = null;
                groupsCache = [];


                if (
                  socket ===
                    newSocket
                ) {
                  socket = null;
                }


                const statusCode =
                  getDisconnectStatusCode(
                    lastDisconnect
                  );


                console.log(
                  '[WHATSAPP] Conexión cerrada. Código:',
                  statusCode
                );


                if (
                  manualDisconnect
                ) {
                  connectionState =
                    'disconnected';

                  return;
                }


                if (
                  isPermanentDisconnect(
                    statusCode
                  )
                ) {
                  connectionState =
                    'logged_out';

                  clearReconnectTimer();

                  console.log(
                    '[WHATSAPP] La sesión requiere vincularse nuevamente.'
                  );

                  return;
                }


                scheduleReconnect(
                  generation
                );
              }
            }
          );


          newSocket.ev.on(
            'messages.upsert',
            async event => {
              if (
                generation !==
                  connectionGeneration
              ) {
                return;
              }


              const messages =
                event?.messages ||
                [];


              for (
                const message
                of messages
              ) {
                await processIncomingMessage(
                  message
                );
              }
            }
          );


          return newSocket;

        } finally {
          connectingPromise = null;
        }
      }
    )();


  return connectingPromise;
}


// ============================================================
// CONECTAR
// ============================================================

async function connect() {
  if (
    socket &&
    (
      connectionState ===
        'connected' ||
      connectionState ===
        'connecting' ||
      connectionState ===
        'qr'
    )
  ) {
    return getStatus();
  }


  await createSocket();

  return getStatus();
}


// ============================================================
// ESTADO
// ============================================================

function getStatus() {
  return {
    state:
      connectionState,

    connected:
      connectionState ===
      'connected',

    hasQr:
      Boolean(currentQr),

    user:
      currentUser
        ? {
            id:
              currentUser.id ||
              null,

            name:
              currentUser.name ||
              null
          }
        : null,

    groups:
      groupsCache.length,

    reconnectAttempt
  };
}


// ============================================================
// QR
// ============================================================

function getQr() {
  return currentQr;
}


// ============================================================
// OBTENER GRUPOS
// ============================================================

async function getGroups(
  forceRefresh = true
) {
  if (
    forceRefresh &&
    connectionState ===
      'connected'
  ) {
    await refreshGroups();
  }


  return groupsCache;
}


// ============================================================
// SELECCIONAR GRUPO
// ============================================================

async function selectGroup(
  groupId,
  groupName = ''
) {
  const cleanGroupId =
    cleanText(groupId);


  if (!cleanGroupId) {
    throw new Error(
      'Selecciona un grupo'
    );
  }


  const found =
    groupsCache.find(
      group =>
        group.id ===
          cleanGroupId
    );


  const name =
    found?.subject ||
    cleanText(groupName) ||
    'Grupo de WhatsApp';


  const settings =
    await whatsappBotService
      .updateSettings({
        allowedGroupId:
          cleanGroupId,

        allowedGroupName:
          name
      });


  return {
    settings,

    group: {
      id:
        cleanGroupId,

      name
    }
  };
}


// ============================================================
// APAGAR CONEXIÓN SIN BORRAR SESIÓN
// ============================================================

async function disconnect() {
  manualDisconnect = true;

  clearReconnectTimer();

  connectionGeneration += 1;

  reconnectAttempt = 0;


  const currentSocket =
    socket;

  socket = null;


  try {
    if (currentSocket) {
      currentSocket.end(
        new Error(
          'Desconexión manual'
        )
      );
    }
  } catch (error) {
    console.error(
      '[WHATSAPP] Error desconectando:',
      error.message
    );
  }


  currentQr = null;
  currentUser = null;
  groupsCache = [];

  connectionState =
    'disconnected';


  return getStatus();
}


// ============================================================
// CERRAR SESIÓN Y BORRAR VINCULACIÓN
// ============================================================

async function logout() {
  manualDisconnect = true;

  clearReconnectTimer();

  connectionGeneration += 1;

  reconnectAttempt = 0;


  const currentSocket =
    socket;

  socket = null;


  try {
    if (currentSocket) {
      await currentSocket.logout();
    }
  } catch (error) {
    console.error(
      '[WHATSAPP] Error cerrando sesión:',
      error.message
    );
  }


  currentQr = null;
  currentUser = null;
  groupsCache = [];

  connectionState =
    'logged_out';


  try {
    fs.rmSync(
      AUTH_FOLDER,
      {
        recursive: true,
        force: true
      }
    );
  } catch (error) {
    console.error(
      '[WHATSAPP] Error limpiando sesión:',
      error.message
    );
  }


  try {
    await whatsappBotService
      .updateSettings({
        enabled: false,
        allowedGroupId: null,
        allowedGroupName: null
      });
  } catch (error) {
    console.error(
      '[WHATSAPP] Error limpiando configuración:',
      error.message
    );
  }


  return getStatus();
}


// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  connect,

  startConnection:
    connect,

  getStatus,

  getQr,

  getGroups,

  refreshGroups,

  selectGroup,

  disconnect,

  logout
};