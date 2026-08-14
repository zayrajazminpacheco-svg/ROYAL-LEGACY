(() => {
  'use strict';


  // ============================================================
  // ESTILOS
  // ============================================================

  const style =
    document.createElement(
      'style'
    );


  style.textContent = `
    .royal-wa-mobile-btn{
      position:fixed;
      right:16px;
      bottom:82px;
      width:58px;
      height:58px;
      border:0;
      border-radius:50%;
      background:
        linear-gradient(
          145deg,
          #21d366,
          #079447
        );
      color:#fff;
      font-size:25px;
      box-shadow:
        0 10px 35px
        rgba(0,0,0,.45),
        0 0 24px
        rgba(37,211,102,.35);
      z-index:9998;
      cursor:pointer;
    }

    .royal-wa-overlay{
      display:none;
      position:fixed;
      inset:0;
      z-index:99999;
      background:
        rgba(2,5,12,.82);
      backdrop-filter:
        blur(12px);
      overflow:auto;
    }

    .royal-wa-overlay.open{
      display:block;
    }

    .royal-wa-panel{
      width:
        min(
          920px,
          calc(100% - 24px)
        );
      margin:
        20px auto 100px;
      background:
        linear-gradient(
          155deg,
          #0b1220,
          #090d16
        );
      color:#fff;
      border:
        1px solid
        rgba(255,255,255,.12);
      border-radius:24px;
      box-shadow:
        0 25px 80px
        rgba(0,0,0,.55);
      overflow:hidden;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    .royal-wa-head{
      display:flex;
      align-items:center;
      justify-content:
        space-between;
      gap:10px;
      padding:18px;
      border-bottom:
        1px solid
        rgba(255,255,255,.08);
    }

    .royal-wa-head h2{
      margin:0;
      font-size:19px;
    }

    .royal-wa-head small{
      display:block;
      color:#94a3b8;
      margin-top:4px;
    }

    .royal-wa-close{
      width:42px;
      height:42px;
      border-radius:50%;
      border:
        1px solid
        rgba(255,255,255,.12);
      background:#131d2d;
      color:#fff;
      font-size:20px;
      cursor:pointer;
    }

    .royal-wa-body{
      padding:16px;
    }

    .royal-wa-card{
      background:
        rgba(255,255,255,.04);
      border:
        1px solid
        rgba(255,255,255,.09);
      border-radius:18px;
      padding:16px;
      margin-bottom:13px;
    }

    .royal-wa-card h3{
      margin:
        0 0 12px;
      font-size:15px;
    }

    .royal-wa-status{
      display:flex;
      gap:10px;
      align-items:center;
      padding:12px;
      border-radius:14px;
      background:#07101c;
      margin-bottom:12px;
    }

    .royal-wa-dot{
      width:11px;
      height:11px;
      border-radius:50%;
      background:#64748b;
    }

    .royal-wa-dot.online{
      background:#22c55e;
      box-shadow:
        0 0 15px
        rgba(34,197,94,.8);
    }

    .royal-wa-grid{
      display:grid;
      grid-template-columns:
        repeat(
          2,
          minmax(0,1fr)
        );
      gap:8px;
    }

    .royal-wa-button{
      width:100%;
      border:0;
      border-radius:12px;
      min-height:43px;
      padding:10px;
      font-weight:800;
      cursor:pointer;
      background:#172337;
      color:#fff;
    }

    .royal-wa-button.green{
      background:
        linear-gradient(
          145deg,
          #20c764,
          #087a3e
        );
    }

    .royal-wa-button.red{
      background:
        linear-gradient(
          145deg,
          #a82e3d,
          #681926
        );
    }

    .royal-wa-button.gold{
      background:
        linear-gradient(
          145deg,
          #e6cc72,
          #a88c36
        );
      color:#090b0f;
    }

    .royal-wa-button.blue{
      background:
        linear-gradient(
          145deg,
          #2688ff,
          #1757b7
        );
    }

    .royal-wa-qr{
      min-height:120px;
      background:#fff;
      color:#111;
      border-radius:16px;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:12px;
      margin-top:12px;
    }

    .royal-wa-qr img{
      display:block;
      width:
        min(
          280px,
          100%
        );
      height:auto;
      margin:auto;
    }

    .royal-wa-input,
    .royal-wa-select,
    .royal-wa-textarea{
      width:100%;
      box-sizing:
        border-box;
      border-radius:12px;
      border:
        1px solid
        rgba(255,255,255,.12);
      background:#07101c;
      color:#fff;
      padding:12px;
      font-size:15px;
      margin-bottom:8px;
    }

    .royal-wa-textarea{
      min-height:110px;
      resize:vertical;
    }

    .royal-wa-command{
      padding:12px;
      border-radius:14px;
      background:#07101c;
      border:
        1px solid
        rgba(255,255,255,.08);
      margin-bottom:8px;
    }

    .royal-wa-command b{
      display:block;
      margin-bottom:5px;
      color:#fff;
    }

    .royal-wa-command p{
      color:#aebbd0;
      margin:
        0 0 9px;
      white-space:
        pre-wrap;
    }

    .royal-wa-message{
      font-size:13px;
      color:#9fb1c9;
      padding-top:8px;
      white-space:
        pre-wrap;
    }

    @media(
      min-width:900px
    ){
      .royal-wa-mobile-btn{
        bottom:28px;
        right:28px;
      }

      .royal-wa-panel{
        margin-top:40px;
      }

      .royal-wa-body{
        padding:22px;
      }

      .royal-wa-grid.desktop4{
        grid-template-columns:
          repeat(
            4,
            minmax(0,1fr)
          );
      }
    }
  `;


  document.head.appendChild(
    style
  );


  // ============================================================
  // BOTÓN FLOTANTE
  // ============================================================

  const floating =
    document.createElement(
      'button'
    );


  floating.type =
    'button';

  floating.className =
    'royal-wa-mobile-btn';

  floating.innerHTML =
    '◉';

  floating.title =
    'WhatsApp Bot';


  document.body.appendChild(
    floating
  );


  // ============================================================
  // PANEL
  // ============================================================

  const overlay =
    document.createElement(
      'div'
    );


  overlay.className =
    'royal-wa-overlay';


  overlay.innerHTML = `
    <div class="royal-wa-panel">

      <div class="royal-wa-head">

        <div>
          <h2>◉ WhatsApp Bot</h2>
          <small>
            Legacy Royal Stream
          </small>
        </div>

        <button
          type="button"
          class="royal-wa-close"
          id="royalWaClose"
        >
          ×
        </button>

      </div>


      <div class="royal-wa-body">


        <div class="royal-wa-card">

          <h3>
            Estado del bot
          </h3>

          <div
            class="royal-wa-status"
          >

            <span
              class="royal-wa-dot"
              id="royalWaDot"
            ></span>

            <div>
              <b
                id="royalWaConnectionText"
              >
                Consultando...
              </b>

              <div
                id="royalWaBotText"
                style="
                  color:#94a3b8;
                  font-size:12px;
                "
              >
                Bot...
              </div>
            </div>

          </div>


          <div
            class="
              royal-wa-grid
              desktop4
            "
          >

            <button
              class="
                royal-wa-button
                green
              "
              onclick="
                royalWaEnable(true)
              "
            >
              ▶ Prender bot
            </button>

            <button
              class="
                royal-wa-button
                red
              "
              onclick="
                royalWaEnable(false)
              "
            >
              ■ Apagar bot
            </button>

            <button
              class="
                royal-wa-button
                blue
              "
              onclick="
                royalWaConnect()
              "
            >
              ▣ Vincular
            </button>

            <button
              class="
                royal-wa-button
              "
              onclick="
                royalWaRefresh()
              "
            >
              ↻ Actualizar
            </button>

          </div>


          <div
            class="royal-wa-message"
            id="royalWaMessage"
          ></div>

        </div>


        <div class="royal-wa-card">

          <h3>
            Código QR
          </h3>

          <div
            class="royal-wa-qr"
            id="royalWaQr"
          >
            Si WhatsApp necesita
            vinculación, aquí
            aparecerá el QR.
          </div>

        </div>


        <div class="royal-wa-card">

          <h3>
            Grupo autorizado
          </h3>

          <select
            class="royal-wa-select"
            id="royalWaGroup"
          >
            <option value="">
              Cargando grupos...
            </option>
          </select>


          <div
            class="royal-wa-grid"
          >

            <button
              class="
                royal-wa-button
                gold
              "
              onclick="
                royalWaSaveGroup()
              "
            >
              Guardar grupo
            </button>

            <button
              class="
                royal-wa-button
              "
              onclick="
                royalWaLoadGroups()
              "
            >
              Actualizar grupos
            </button>

          </div>

        </div>


        <div class="royal-wa-card">

          <h3>
            Crear / editar comando
          </h3>

          <input
            class="royal-wa-input"
            id="royalWaCommand"
            placeholder=".netflix"
          >

          <textarea
            class="royal-wa-textarea"
            id="royalWaResponse"
            placeholder="Respuesta que quieres que mande el bot..."
          ></textarea>

          <select
            class="royal-wa-select"
            id="royalWaResponseType"
          >
            <option value="TEXT">
              Texto
            </option>

            <option value="IMAGE">
              Imagen
            </option>

            <option value="AUDIO">
              Audio
            </option>

            <option value="LINK">
              Link
            </option>
          </select>

          <input
            class="royal-wa-input"
            id="royalWaMediaUrl"
            placeholder="URL de imagen, audio o link (opcional)"
          >

          <input
            type="hidden"
            id="royalWaCommandId"
          >


          <div
            class="royal-wa-grid"
          >

            <button
              class="
                royal-wa-button
                gold
              "
              onclick="
                royalWaSaveCommand()
              "
            >
              Guardar comando
            </button>

            <button
              class="
                royal-wa-button
              "
              onclick="
                royalWaClearCommand()
              "
            >
              Limpiar
            </button>

          </div>

        </div>


        <div class="royal-wa-card">

          <h3>
            Comandos configurados
          </h3>

          <div
            id="royalWaCommands"
          >
            Cargando...
          </div>

        </div>


        <div class="royal-wa-card">

          <h3>
            Sesión
          </h3>

          <div
            class="royal-wa-grid"
          >

            <button
              class="
                royal-wa-button
                red
              "
              onclick="
                royalWaDisconnect()
              "
            >
              Desconectar
            </button>

            <button
              class="
                royal-wa-button
                red
              "
              onclick="
                royalWaLogout()
              "
            >
              Cerrar sesión
            </button>

          </div>

          <div
            style="
              color:#94a3b8;
              font-size:12px;
              margin-top:10px;
            "
          >
            Desconectar conserva la
            sesión. Cerrar sesión
            elimina la vinculación y
            puede pedir QR nuevamente.
          </div>

        </div>


      </div>
    </div>
  `;


  document.body.appendChild(
    overlay
  );


  // ============================================================
  // TOKEN / API
  // ============================================================

  function royalWaToken() {
    return (
      localStorage.getItem(
        'token'
      )
      ||
      localStorage.getItem(
        'authToken'
      )
      ||
      localStorage.getItem(
        'royalToken'
      )
      ||
      ''
    );
  }


  async function royalWaRequest(
    url,
    options = {}
  ) {
    const token =
      royalWaToken();


    const headers = {
      'Content-Type':
        'application/json',

      ...(options.headers || {})
    };


    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }


    const response =
      await fetch(
        url,
        {
          ...options,
          headers
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        `HTTP ${response.status}`
      );
    }


    return data;
  }


  function royalWaData(json) {
    return (
      json?.data ??
      json?.result ??
      json ??
      null
    );
  }


  function royalWaSetMessage(
    message
  ) {
    const box =
      document.getElementById(
        'royalWaMessage'
      );

    if (box) {
      box.textContent =
        message || '';
    }
  }


  // ============================================================
  // ABRIR / CERRAR
  // ============================================================

  async function openRoyalWa() {
    overlay.classList.add(
      'open'
    );

    await royalWaRefresh();

    await royalWaLoadCommands();

    if (
      document.getElementById(
        'royalWaDot'
      )?.classList.contains(
        'online'
      )
    ) {
      await royalWaLoadGroups();
    }
  }


  function closeRoyalWa() {
    overlay.classList.remove(
      'open'
    );
  }


  floating.addEventListener(
    'click',
    openRoyalWa
  );


  document
    .getElementById(
      'royalWaClose'
    )
    .addEventListener(
      'click',
      closeRoyalWa
    );


  overlay.addEventListener(
    'click',
    event => {
      if (
        event.target ===
          overlay
      ) {
        closeRoyalWa();
      }
    }
  );


  // ============================================================
  // ESTADO
  // ============================================================

  window.royalWaRefresh =
    async function () {
      try {
        const [
          connectionJson,
          settingsJson
        ] =
          await Promise.all([
            royalWaRequest(
              '/api/whatsapp-bot/connection/status'
            ),

            royalWaRequest(
              '/api/whatsapp-bot/settings'
            )
          ]);


        const connection =
          royalWaData(
            connectionJson
          ) || {};


        const settings =
          royalWaData(
            settingsJson
          ) || {};


        const dot =
          document.getElementById(
            'royalWaDot'
          );


        const connectionText =
          document.getElementById(
            'royalWaConnectionText'
          );


        const botText =
          document.getElementById(
            'royalWaBotText'
          );


        if (
          connection.connected
        ) {
          dot?.classList.add(
            'online'
          );

          connectionText.textContent =
            'WhatsApp conectado';

        } else {
          dot?.classList.remove(
            'online'
          );

          connectionText.textContent =
            connection.state ===
              'reconnecting'
              ? 'Reconectando...'
              : connection.state ===
                  'qr'
                ? 'Esperando QR'
                : 'WhatsApp desconectado';
        }


        botText.textContent =
          settings.enabled
            ? 'Bot: ENCENDIDO'
            : 'Bot: APAGADO';


        if (
          connection.hasQr ||
          connection.qrAvailable
        ) {
          await window
            .royalWaLoadQr();
        }


        return {
          connection,
          settings
        };

      } catch (error) {
        royalWaSetMessage(
          error.message
        );
      }
    };


  // ============================================================
  // PRENDER / APAGAR BOT
  // ============================================================

  window.royalWaEnable =
    async function (
      enabled
    ) {
      try {
        const current =
          royalWaData(
            await royalWaRequest(
              '/api/whatsapp-bot/settings'
            )
          ) || {};


        await royalWaRequest(
          '/api/whatsapp-bot/settings',
          {
            method:
              'PUT',

            body:
              JSON.stringify({
                ...current,
                enabled:
                  Boolean(enabled)
              })
          }
        );


        royalWaSetMessage(
          enabled
            ? 'Bot encendido.'
            : 'Bot apagado. La sesión sigue vinculada.'
        );


        await window
          .royalWaRefresh();

      } catch (error) {
        royalWaSetMessage(
          error.message
        );
      }
    };


  // ============================================================
  // CONECTAR
  // ============================================================

  window.royalWaConnect =
    async function () {
      try {
        royalWaSetMessage(
          'Iniciando WhatsApp...'
        );


        await royalWaRequest(
          '/api/whatsapp-bot/connection/connect',
          {
            method:
              'POST',

            body:
              JSON.stringify({})
          }
        );


        window.setTimeout(
          async () => {
            await window
              .royalWaRefresh();

            await window
              .royalWaLoadQr();
          },
          1200
        );

      } catch (error) {
        royalWaSetMessage(
          error.message
        );
      }
    };


  // ============================================================
  // QR
  // ============================================================

  window.royalWaLoadQr =
    async function () {
      const box =
        document.getElementById(
          'royalWaQr'
        );


      try {
        const json =
          await royalWaRequest(
            '/api/whatsapp-bot/connection/qr'
          );


        const data =
          royalWaData(json) ||
          {};


        if (
          data.available &&
          data.qr
        ) {
          box.innerHTML =
            `<img
              src="${data.qr}"
              alt="Código QR de WhatsApp"
            >`;

        } else {
          box.textContent =
            'No hay QR pendiente. Si WhatsApp ya está conectado, no necesitas escanear.';
        }

      } catch (error) {
        box.textContent =
          error.message;
      }
    };


  // ============================================================
  // GRUPOS
  // ============================================================

  window.royalWaLoadGroups =
    async function () {
      const select =
        document.getElementById(
          'royalWaGroup'
        );


      try {
        const json =
          await royalWaRequest(
            '/api/whatsapp-bot/connection/groups'
          );


        const groups =
          royalWaData(json) ||
          [];


        select.innerHTML =
          '<option value="">Selecciona el grupo</option>';


        for (
          const group
          of groups
        ) {
          const option =
            document.createElement(
              'option'
            );

          option.value =
            group.id;

          option.textContent =
            `${group.subject || group.name || 'Grupo'} (${group.size || 0})`;

          option.dataset.name =
            group.subject ||
            group.name ||
            '';

          select.appendChild(
            option
          );
        }

      } catch (error) {
        select.innerHTML =
          '<option value="">No se pudieron cargar grupos</option>';

        royalWaSetMessage(
          error.message
        );
      }
    };


  window.royalWaSaveGroup =
    async function () {
      const select =
        document.getElementById(
          'royalWaGroup'
        );


      const option =
        select.options[
          select.selectedIndex
        ];


      if (!select.value) {
        royalWaSetMessage(
          'Selecciona un grupo.'
        );

        return;
      }


      try {
        await royalWaRequest(
          '/api/whatsapp-bot/connection/group',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                groupId:
                  select.value,

                groupName:
                  option?.dataset
                    ?.name ||
                  option?.textContent ||
                  ''
              })
          }
        );


        royalWaSetMessage(
          'Grupo autorizado guardado.'
        );

      } catch (error) {
        royalWaSetMessage(
          error.message
        );
      }
    };


  // ============================================================
  // COMANDOS
  // ============================================================

  window.royalWaLoadCommands =
    async function () {
      const container =
        document.getElementById(
          'royalWaCommands'
        );


      try {
        const json =
          await royalWaRequest(
            '/api/whatsapp-bot/commands'
          );


        const commands =
          royalWaData(json) ||
          [];


        if (
          !commands.length
        ) {
          container.innerHTML =
            '<div style="color:#94a3b8">No hay comandos personalizados.</div>';

          return;
        }


        container.innerHTML = '';


        for (
          const command
          of commands
        ) {
          const card =
            document.createElement(
              'div'
            );


          card.className =
            'royal-wa-command';


          const title =
            document.createElement(
              'b'
            );

          title.textContent =
            command.command ||
            'Comando';


          const text =
            document.createElement(
              'p'
            );

          text.textContent =
            command.response ||
            'Sin respuesta';


          const buttons =
            document.createElement(
              'div'
            );

          buttons.className =
            'royal-wa-grid';


          const edit =
            document.createElement(
              'button'
            );

          edit.className =
            'royal-wa-button';

          edit.textContent =
            'Editar';


          edit.onclick =
            () => {
              document
                .getElementById(
                  'royalWaCommandId'
                )
                .value =
                  command.id ||
                  '';

              document
                .getElementById(
                  'royalWaCommand'
                )
                .value =
                  command.command ||
                  '';

              document
                .getElementById(
                  'royalWaResponse'
                )
                .value =
                  command.response ||
                  '';

              document
                .getElementById(
                  'royalWaResponseType'
                )
                .value =
                  command.responseType ||
                  'TEXT';

              document
                .getElementById(
                  'royalWaMediaUrl'
                )
                .value =
                  command.mediaUrl ||
                  '';

              document
                .getElementById(
                  'royalWaCommand'
                )
                .scrollIntoView({
                  behavior:
                    'smooth'
                });
            };


          const remove =
            document.createElement(
              'button'
            );

          remove.className =
            'royal-wa-button red';

          remove.textContent =
            'Eliminar';


          remove.onclick =
            async () => {
              if (
                !confirm(
                  `¿Eliminar ${command.command}?`
                )
              ) {
                return;
              }


              try {
                await royalWaRequest(
                  `/api/whatsapp-bot/commands/${encodeURIComponent(
                    command.id
                  )}`,
                  {
                    method:
                      'DELETE'
                  }
                );


                await window
                  .royalWaLoadCommands();

              } catch (error) {
                royalWaSetMessage(
                  error.message
                );
              }
            };


          buttons.append(
            edit,
            remove
          );


          card.append(
            title,
            text,
            buttons
          );


          container.appendChild(
            card
          );
        }

      } catch (error) {
        container.textContent =
          error.message;
      }
    };


  window.royalWaSaveCommand =
    async function () {
      const id =
        document
          .getElementById(
            'royalWaCommandId'
          )
          .value
          .trim();


      const command =
        document
          .getElementById(
            'royalWaCommand'
          )
          .value
          .trim();


      const response =
        document
          .getElementById(
            'royalWaResponse'
          )
          .value
          .trim();


      const responseType =
        document
          .getElementById(
            'royalWaResponseType'
          )
          .value;


      const mediaUrl =
        document
          .getElementById(
            'royalWaMediaUrl'
          )
          .value
          .trim();


      if (!command) {
        royalWaSetMessage(
          'Escribe el comando.'
        );

        return;
      }


      try {
        await royalWaRequest(
          id
            ? `/api/whatsapp-bot/commands/${encodeURIComponent(
                id
              )}`
            : '/api/whatsapp-bot/commands',

          {
            method:
              id
                ? 'PUT'
                : 'POST',

            body:
              JSON.stringify({
                command,
                response,
                responseType,
                mediaUrl:
                  mediaUrl || null,

                active: true
              })
          }
        );


        window
          .royalWaClearCommand();


        await window
          .royalWaLoadCommands();


        royalWaSetMessage(
          'Comando guardado.'
        );

      } catch (error) {
        royalWaSetMessage(
          error.message
        );
      }
    };


  window.royalWaClearCommand =
    function () {
      document
        .getElementById(
          'royalWaCommandId'
        )
        .value = '';

      document
        .getElementById(
          'royalWaCommand'
        )
        .value = '';

      document
        .getElementById(
          'royalWaResponse'
        )
        .value = '';

      document
        .getElementById(
          'royalWaResponseType'
        )
        .value = 'TEXT';

      document
        .getElementById(
          'royalWaMediaUrl'
        )
        .value = '';
    };


  // ============================================================
  // DESCONECTAR
  // ============================================================

  window.royalWaDisconnect =
    async function () {
      try {
        await royalWaRequest(
          '/api/whatsapp-bot/connection/disconnect',
          {
            method:
              'POST',

            body:
              JSON.stringify({})
          }
        );


        royalWaSetMessage(
          'WhatsApp desconectado. La sesión quedó guardada.'
        );


        await window
          .royalWaRefresh();

      } catch (error) {
        royalWaSetMessage(
          error.message
        );
      }
    };


  // ============================================================
  // LOGOUT
  // ============================================================

  window.royalWaLogout =
    async function () {
      if (
        !confirm(
          'Esto cerrará la sesión de WhatsApp y después puede pedir QR. ¿Continuar?'
        )
      ) {
        return;
      }


      try {
        await royalWaRequest(
          '/api/whatsapp-bot/connection/logout',
          {
            method:
              'POST',

            body:
              JSON.stringify({})
          }
        );


        royalWaSetMessage(
          'Sesión de WhatsApp cerrada.'
        );


        await window
          .royalWaRefresh();

      } catch (error) {
        royalWaSetMessage(
          error.message
        );
      }
    };


  // ============================================================
  // ACTUALIZACIÓN AUTOMÁTICA DEL ESTADO
  // ============================================================

  window.setInterval(
    () => {
      if (
        overlay.classList.contains(
          'open'
        )
      ) {
        window
          .royalWaRefresh();
      }
    },
    10000
  );

})();