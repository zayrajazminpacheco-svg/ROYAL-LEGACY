const prisma = require('../lib/prisma');


// =====================================================
// ROYAL LEGACY - INBOX CONTROLLER
// =====================================================


// =====================================================
// UTILIDADES
// =====================================================

function cleanString(value) {
  return String(value || '').trim();
}


function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}


function decodeHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}


function stripHtml(value = '') {
  return decodeHtmlEntities(
    String(value || '')
  )
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      ' '
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      ' '
    )
    .replace(
      /<br\s*\/?>/gi,
      '\n'
    )
    .replace(
      /<\/p>/gi,
      '\n'
    )
    .replace(
      /<\/div>/gi,
      '\n'
    )
    .replace(
      /<[^>]+>/g,
      ' '
    )
    .replace(
      /[ \t]+/g,
      ' '
    )
    .replace(
      /\n\s+/g,
      '\n'
    )
    .replace(
      /\n{3,}/g,
      '\n\n'
    )
    .trim();
}


function removeUrls(value = '') {
  return String(value || '')
    .replace(
      /https?:\/\/[^\s<>"']+/gi,
      ' '
    )
    .replace(
      /www\.[^\s<>"']+/gi,
      ' '
    );
}


function cleanUrl(value = '') {
  let url =
    decodeHtmlEntities(
      String(value || '').trim()
    );

  url =
    url.replace(
      /[)\]}>.,;]+$/g,
      ''
    );

  return url;
}


function isHttpUrl(value = '') {
  try {
    const parsed =
      new URL(value);

    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:'
    );
  } catch {
    return false;
  }
}


// =====================================================
// POSTAL MIME
// =====================================================

async function parseRawEmail(
  rawEmail = ''
) {
  if (!rawEmail) {
    return null;
  }

  try {
    const module =
      await import(
        'postal-mime'
      );

    const PostalMime =
      module.default;

    return await PostalMime.parse(
      rawEmail
    );

  } catch (error) {
    console.error(
      '[INBOX] Error interpretando MIME:',
      error
    );

    return null;
  }
}


// =====================================================
// DIRECCIONES
// =====================================================

function addressValue(address) {
  if (!address) {
    return '';
  }

  if (
    typeof address ===
    'string'
  ) {
    return address;
  }

  if (
    typeof address ===
      'object' &&
    address.address
  ) {
    return address.address;
  }

  return '';
}


// =====================================================
// PLATAFORMA
// =====================================================

function detectPlatform({
  sender = '',
  subject = '',
  text = '',
  html = ''
} = {}) {
  const source =
    `${sender} ${subject} ${text} ${html}`
      .toLowerCase();


  if (
    source.includes(
      'netflix'
    )
  ) {
    return 'NETFLIX';
  }


  if (
    source.includes(
      'youtube'
    ) ||
    source.includes(
      'google'
    )
  ) {
    return 'YOUTUBE';
  }


  if (
    source.includes(
      'disney'
    )
  ) {
    return 'DISNEY';
  }


  if (
    source.includes(
      'paramount'
    )
  ) {
    return 'PARAMOUNT';
  }


  if (
    source.includes(
      'crunchyroll'
    )
  ) {
    return 'CRUNCHYROLL';
  }


  if (
    source.includes(
      'prime video'
    ) ||
    source.includes(
      'primevideo'
    ) ||
    source.includes(
      'amazon'
    )
  ) {
    return 'PRIME';
  }


  if (
    source.includes(
      'hbo max'
    ) ||
    source.includes(
      'hbomax'
    ) ||
    source.includes(
      'max.com'
    )
  ) {
    return 'MAX';
  }


  return 'UNKNOWN';
}


// =====================================================
// CÓDIGOS
// =====================================================

function extractVerificationCode({
  sender = '',
  subject = '',
  text = '',
  html = '',
  platform = 'UNKNOWN'
} = {}) {

  const bodyText =
    stripHtml(html) ||
    cleanString(text);


  /*
    Quitamos URLs para evitar que:

    ?code=xxxxx

    sea tratado como un PIN.
  */
  const cleanBody =
    removeUrls(
      `${subject}\n${bodyText}`
    );


  const lower =
    cleanBody.toLowerCase();


  // ==================================================
  // NETFLIX
  // ==================================================

  /*
    Cuando Netflix manda:

    "Crear tu cuenta"

    el parámetro code= del enlace
    NO debe mostrarse como código.
  */
  if (
    platform === 'NETFLIX' &&
    (
      lower.includes(
        'crear tu cuenta'
      ) ||
      lower.includes(
        'create your account'
      ) ||
      lower.includes(
        'vamos a crear tu cuenta'
      )
    )
  ) {
    return null;
  }


  // ==================================================
  // GOOGLE / YOUTUBE
  // ==================================================

  const senderLower =
    String(
      sender || ''
    )
      .toLowerCase();


  const isGoogleYouTube =
    platform === 'YOUTUBE' ||
    senderLower.includes(
      'google'
    ) ||
    senderLower.includes(
      'youtube'
    );


  if (isGoogleYouTube) {

    /*
      GOOGLE/YOUTUBE:

      Solo aceptamos números
      EXACTAMENTE de 6 dígitos.

      Ejemplo real:
      334378
    */

    const contextualPatterns = [

      /*
        "Puedes usar este código para..."
        ...
        334378
      */
      /(?:c[oó]digo|code)[\s\S]{0,250}?\b(\d{6})\b/i,


      /*
        "confirmar..."
        ...
        334378
      */
      /(?:confirmar|confirm|verificar|verify)[\s\S]{0,250}?\b(\d{6})\b/i,


      /*
        El número aparece antes
        del contexto.
      */
      /\b(\d{6})\b[\s\S]{0,180}?(?:c[oó]digo|code|confirmar|confirm|verificar|verify)/i

    ];


    for (
      const pattern
      of contextualPatterns
    ) {

      const match =
        cleanBody.match(
          pattern
        );


      if (
        match &&
        match[1]
      ) {
        return match[1];
      }
    }


    /*
      Respaldo Google/YouTube:

      busca todos los números
      exactamente de 6 dígitos.
    */

    const sixDigitMatches =
      cleanBody.match(
        /\b\d{6}\b/g
      ) || [];


    if (
      sixDigitMatches.length
    ) {
      return sixDigitMatches[0];
    }


    return null;
  }


  // ==================================================
  // OTRAS PLATAFORMAS
  // ==================================================

  /*
    Códigos numéricos
    entre 4 y 8 dígitos
    solo con contexto claro.
  */
  const numericPatterns = [

    /(?:c[oó]digo\s+de\s+verificaci[oó]n|c[oó]digo\s+de\s+seguridad|tu\s+c[oó]digo|c[oó]digo|pin|verification\s+code|security\s+code|your\s+code|one[- ]time\s+code|otp)\s*(?:es|is|:|-)?\s*(\d{4,8})\b/i,


    /\b(\d{4,8})\b\s*(?:es\s+tu\s+c[oó]digo|is\s+your\s+code|verification\s+code|security\s+code|pin)\b/i

  ];


  for (
    const pattern
    of numericPatterns
  ) {

    const match =
      cleanBody.match(
        pattern
      );


    if (
      match &&
      match[1]
    ) {
      return match[1];
    }
  }


  /*
    Código alfanumérico.

    IMPORTANTE:
    obligamos a que tenga
    AL MENOS un número.

    Así jamás puede tomar
    palabras como:

    PARA
    ESTE
    CODE
  */
  const alphaNumericPattern =
    /(?:c[oó]digo|pin|verification\s+code|security\s+code|otp)\s*(?:es|is|:|-)?\s*((?=[A-Z0-9]{4,8}\b)(?=[A-Z0-9]*\d)[A-Z0-9]{4,8})\b/i;


  const alphaNumericMatch =
    cleanBody.match(
      alphaNumericPattern
    );


  if (
    alphaNumericMatch &&
    alphaNumericMatch[1]
  ) {
    return alphaNumericMatch[1];
  }


  return null;
}


// =====================================================
// ENLACES HTML
// =====================================================

function extractAnchors(
  html = ''
) {
  const anchors =
    [];


  const source =
    decodeHtmlEntities(
      String(
        html || ''
      )
    );


  const regex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


  let match;


  while (
    (
      match =
        regex.exec(
          source
        )
    ) !== null
  ) {

    const href =
      cleanUrl(
        match[1]
      );


    const label =
      stripHtml(
        match[2]
      );


    if (
      isHttpUrl(
        href
      )
    ) {

      anchors.push({
        href,
        label
      });
    }
  }


  return anchors;
}


function extractAllLinks(
  html = '',
  text = ''
) {

  const links =
    extractAnchors(
      html
    )
      .map(
        item =>
          item.href
      );


  const source =
    `${
      decodeHtmlEntities(
        html
      )
    }\n${
      text || ''
    }`;


  const direct =
    source.match(
      /https?:\/\/[^\s<>"']+/gi
    ) ||
    [];


  for (
    const raw
    of direct
  ) {

    const url =
      cleanUrl(
        raw
      );


    if (
      isHttpUrl(
        url
      )
    ) {

      links.push(
        url
      );
    }
  }


  return [
    ...new Set(
      links
    )
  ];
}


// =====================================================
// LINKS BASURA
// =====================================================

function isJunkLink(
  url = ''
) {

  const lower =
    String(
      url || ''
    )
      .toLowerCase();


  const blocked = [

    'lkid=url_logo',

    'lkid=url_help',

    'lkid=url_terms',

    'lkid=url_privacy',

    'lkid=url_email',

    '/privacypolicy',

    '/privacy',

    '/legal/',

    '/help',

    '/terms',

    'unsubscribe',

    'preferences',

    'tracking',

    'pixel',

    'assets.nflxext.com',

    'beaconimages.netflix.net'
  ];


  return blocked.some(
    token =>
      lower.includes(
        token
      )
  );
}


// =====================================================
// NETFLIX EPR
// =====================================================

function isNetflixEpr(
  url = ''
) {

  try {

    const parsed =
      new URL(
        url
      );


    const host =
      parsed
        .hostname
        .toLowerCase();


    return (
      (
        host ===
          'netflix.com' ||
        host.endsWith(
          '.netflix.com'
        )
      ) &&
      parsed
        .pathname
        .toLowerCase() ===
        '/epr' &&
      parsed
        .searchParams
        .has(
          'code'
        )
    );

  } catch {

    return false;
  }
}


// =====================================================
// ENLACE PRINCIPAL
// =====================================================

function extractPrimaryLink({
  sender = '',
  subject = '',
  text = '',
  html = '',
  platform = 'UNKNOWN'
} = {}) {

  const anchors =
    extractAnchors(
      html
    );


  const links =
    extractAllLinks(
      html,
      text
    );


  // ==================================================
  // NETFLIX
  // ==================================================

  if (
    platform ===
    'NETFLIX'
  ) {

    /*
      PRIORIDAD 1

      Link asociado a:

      "Crear tu cuenta"

      apuntando a:
      netflix.com/epr?code=...
    */

    const labeled =
      anchors.find(
        ({
          href,
          label
        }) => {

          const normalizedLabel =
            String(
              label || ''
            )
              .toLowerCase();


          return (
            isNetflixEpr(
              href
            ) &&
            (
              normalizedLabel.includes(
                'crear tu cuenta'
              ) ||
              normalizedLabel.includes(
                'create your account'
              )
            )
          );
        }
      );


    if (labeled) {
      return labeled.href;
    }


    /*
      PRIORIDAD 2

      Cualquier:
      netflix.com/epr?code=...
    */

    const epr =
      links.find(
        isNetflixEpr
      );


    if (epr) {
      return epr;
    }


    /*
      PRIORIDAD 3

      Netflix pero nunca
      footer/logo.
    */

    const usefulNetflix =
      links.find(
        url => {

          if (
            isJunkLink(
              url
            )
          ) {
            return false;
          }


          try {

            const parsed =
              new URL(
                url
              );


            const host =
              parsed
                .hostname
                .toLowerCase();


            return (
              host ===
                'netflix.com' ||
              host.endsWith(
                '.netflix.com'
              )
            );

          } catch {

            return false;
          }
        }
      );


    return (
      usefulNetflix ||
      null
    );
  }


  // ==================================================
  // OTRAS PLATAFORMAS
  // ==================================================

  const actionWords = [

    'verify',

    'verification',

    'confirm',

    'confirmation',

    'activate',

    'activation',

    'invite',

    'invitation',

    'accept',

    'signin',

    'login',

    'register',

    'account'
  ];


  const labeledAction =
    anchors.find(
      ({
        href,
        label
      }) => {

        if (
          isJunkLink(
            href
          )
        ) {
          return false;
        }


        const haystack =
          `${
            label
          } ${
            href
          }`
            .toLowerCase();


        return actionWords.some(
          word =>
            haystack.includes(
              word
            )
        );
      }
    );


  if (
    labeledAction
  ) {
    return labeledAction.href;
  }


  return (
    links.find(
      url =>
        !isJunkLink(
          url
        )
    ) ||
    null
  );
}


// =====================================================
// PREVIEW
// =====================================================

function createPreview(
  text = '',
  html = ''
) {

  const source =
    cleanString(
      text
    ) ||
    stripHtml(
      html
    );


  return String(
    source || ''
  )
    .replace(
      /[ \t]{2,}/g,
      ' '
    )
    .replace(
      /\n{3,}/g,
      '\n\n'
    )
    .trim()
    .slice(
      0,
      5000
    );
}


// =====================================================
// PANEL DE CÓDIGOS
// =====================================================

async function applyCodeToPendingRequest({
  emailAliasId,
  code
}) {

  if (
    !emailAliasId ||
    !code
  ) {
    return;
  }


  try {

    const inventoryAlias =
      await prisma
        .inventoryAlias
        .findFirst({

          where: {
            emailAliasId,

            active:
              true
          },

          orderBy: {
            assignedAt:
              'desc'
          }
        });


    if (
      !inventoryAlias
    ) {
      return;
    }


    const request =
      await prisma
        .codeRequest
        .findFirst({

          where: {

            inventoryItemId:
              inventoryAlias
                .inventoryItemId,

            status:
              'PENDING'
          },

          orderBy: {
            requestedAt:
              'desc'
          }
        });


    if (!request) {
      return;
    }


    await prisma
      .codeRequest
      .update({

        where: {
          id:
            request.id
        },

        data: {

          codeEncrypted:
            String(
              code
            ),

          status:
            'RECEIVED',

          receivedAt:
            new Date()
        }
      });


    console.log(
      `[INBOX] Solicitud ${request.id} actualizada con código`
    );

  } catch (error) {

    console.error(
      '[INBOX] No se pudo actualizar CodeRequest:',
      error
    );
  }
}


// =====================================================
// RECIBIR CORREO
// =====================================================

async function receiveEmail(
  req,
  res,
  next
) {

  try {

    const body =
      req.body ||
      {};


    const rawEmail =
      cleanString(
        body.rawEmail
      );


    const parsed =
      rawEmail

        ? await parseRawEmail(
            rawEmail
          )

        : null;


    const subject =
      cleanString(
        parsed?.subject ||
        body.subject
      );


    const sender =
      cleanString(

        addressValue(
          parsed?.from
        ) ||

        body.envelopeFrom ||

        body.from
      );


    let parsedRecipient =
      '';


    if (
      Array.isArray(
        parsed?.to
      ) &&
      parsed.to.length
    ) {

      parsedRecipient =
        addressValue(
          parsed.to[0]
        );
    }


    const recipient =
      normalizeEmail(

        body.envelopeTo ||

        body.to ||

        parsedRecipient
      );


    if (!recipient) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            'No se recibió destinatario'
        });
    }


    const text =
      cleanString(
        parsed?.text ||
        body.text
      );


    const html =
      cleanString(
        parsed?.html ||
        body.html
      );


    const emailAlias =
      await prisma
        .emailAlias
        .findUnique({

          where: {
            fullAddress:
              recipient
          }
        });


    const platform =
      detectPlatform({
        sender,
        subject,
        text,
        html
      });


    const verificationCode =
      extractVerificationCode({
        sender,
        subject,
        text,
        html,
        platform
      });


    const primaryLink =
      extractPrimaryLink({
        sender,
        subject,
        text,
        html,
        platform
      });


    if (
      verificationCode
    ) {

      console.log(
        `[INBOX] Código real detectado para ${recipient}: ${verificationCode}`
      );
    }


    if (
      primaryLink
    ) {

      console.log(
        `[INBOX] Enlace principal ${platform}: ${primaryLink}`
      );
    }


    const externalMessageId =
      cleanString(

        body.messageId ||

        parsed?.messageId

      ) ||
      null;


    if (
      externalMessageId
    ) {

      const existing =
        await prisma
          .inboxMessage
          .findUnique({

            where: {
              externalMessageId
            }
          });


      if (
        existing
      ) {

        return res
          .status(200)
          .json({

            success:
              true,

            message:
              'Correo ya procesado',

            data: {

              id:
                existing.id,

              platform,

              primaryLink,

              verificationCode,

              code:
                verificationCode
            }
          });
      }
    }


    const created =
      await prisma
        .inboxMessage
        .create({

          data: {

            emailAliasId:
              emailAlias?.id ||
              null,

            externalMessageId,

            sender:
              sender ||
              null,

            recipient,

            subject:
              subject ||
              null,

            bodyPreview:
              createPreview(
                text,
                html
              ) ||
              null,

            /*
              Guardamos HTML porque
              conserva href reales.
            */
            bodyEncrypted:
              html ||
              text ||
              rawEmail ||
              null,

            verificationCodeEncrypted:
              verificationCode ||
              null,

            processed:
              true
          }
        });


    if (
      verificationCode &&
      emailAlias?.id
    ) {

      await applyCodeToPendingRequest({

        emailAliasId:
          emailAlias.id,

        code:
          verificationCode
      });
    }


    return res
      .status(201)
      .json({

        success:
          true,

        message:
          'Correo procesado correctamente',

        data: {

          id:
            created.id,

          recipient,

          subject,

          platform,

          verificationCode:
            verificationCode ||
            null,

          code:
            verificationCode ||
            null,

          primaryLink:
            primaryLink ||
            null
        }
      });

  } catch (error) {

    console.error(
      '[INBOX] Error recibiendo correo:',
      error
    );


    if (next) {
      return next(
        error
      );
    }


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          error.message ||
          'Error procesando correo'
      });
  }
}


// =====================================================
// OBTENER BANDEJA
// =====================================================

async function getInbox(
  req,
  res,
  next
) {

  try {

    const email =
      normalizeEmail(
        req.mailboxEmail ||
        req.query?.email
      );


    if (!email) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            'Debes indicar ?email=correo@dominio.com'
        });
    }


    const isClientMailbox =
      Boolean(
        req.mailboxEmail
      );

    const visibleFrom =
      req.mailboxVisibleFrom
        ? new Date(
            req.mailboxVisibleFrom
          )
        : null;

    if (
      isClientMailbox &&
      (
        !visibleFrom ||
        Number.isNaN(
          visibleFrom.getTime()
        )
      )
    ) {
      return res
        .status(403)
        .json({
          success:
            false,
          message:
            'La bandeja del cliente todavía no está habilitada para esta compra'
        });
    }


    const messages =
      await prisma
        .inboxMessage
        .findMany({

          where: {
            recipient:
              email,

            ...(
              isClientMailbox
                ? {
                    receivedAt: {
                      gte:
                        visibleFrom
                    }
                  }
                : {}
            )
          },

          orderBy: {
            receivedAt:
              'desc'
          },

          take:
            100
        });


    const data =
      messages.map(
        message => {

          const stored =
            cleanString(
              message
                .bodyEncrypted
            );


          const looksHtml =
            /<html|<body|<table|<a\s|href=/i
              .test(
                stored
              );


          const html =
            looksHtml

              ? stored

              : '';


          const text =
            looksHtml

              ? stripHtml(
                  stored
                )

              : (
                  stored ||
                  message
                    .bodyPreview ||
                  ''
                );


          const platform =
            detectPlatform({

              sender:
                message.sender,

              subject:
                message.subject,

              text,

              html
            });


          /*
            IMPORTANTE:

            Siempre volvemos
            a calcular el código.

            NO reutilizamos el
            verificationCodeEncrypted viejo,
            porque pudo ser detectado
            incorrectamente.
          */

          const verificationCode =
            extractVerificationCode({

              sender:
                message.sender,

              subject:
                message.subject,

              text,

              html,

              platform
            });


          /*
            También volvemos
            a calcular el enlace.
          */

          const primaryLink =
            extractPrimaryLink({

              sender:
                message.sender,

              subject:
                message.subject,

              text,

              html,

              platform
            });


          return {

            ...message,

            platform,

            verificationCode:
              verificationCode ||
              null,

            code:
              verificationCode ||
              null,

            primaryLink:
              primaryLink ||
              null
          };
        }
      );


    return res
      .status(200)
      .json({

        success:
          true,

        data
      });

  } catch (error) {

    console.error(
      '[INBOX] Error loading inbox:',
      error
    );


    if (next) {
      return next(
        error
      );
    }


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          error.message ||
          'Error cargando bandeja'
      });
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  receiveEmail,
  getInbox
};
