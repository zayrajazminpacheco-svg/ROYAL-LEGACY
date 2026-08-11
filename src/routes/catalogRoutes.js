     grid-template-columns:1fr 1fr !important;
    }
  
    .pc-action-btn {
      min-height:105px !important;
    }
  }
  
  
  /* ==========================================================
     MOBILE FINAL â€” APROBADO
     DiseÃ±o basado en la referencia seleccionada por el usuario.
     ========================================================== */
  
  .mobile-home-ui,
> .mobile-bottom-nav,
  .m-section-head {
    display:none;
  }
  
  @media (max-width:850px) {
  
    :root{
      --m-bg:#020610;
      --m-card:#07101f;
      --m-card2:#091327;
      --m-line:rgba(70,102,160,.24);
      --m-purple:#b34dff;
      --m-blue:#397cff;
      --m-cyan:#40e6ff;
      --m-pink:#ff4c9d;
      --m-green:#39ef94;
      --m-amber:#ffae36;
      --m-text:#f6f8ff;
      --m-muted:#8b99b3;
    }
  
    html,
    body{
      width:100% !important;
      min-height:100% !important;
      overflow-x:hidden !important;
      background:
        radial-gradient(circle at 15% 0%,rgba(52,76,255,.10),transparent 28%),
        radial-gradient(circle at 90% 3%,rgba(192,46,255,.12),transparent 24%),
        linear-gradient(180deg,#020610,#030713 70%,#02050c) !important;
    }
  
    body{
      padding:0 0 94px !important;
      color:var(--m-text) !important;
    }
  
    body::before{
      opacity:.04 !important;
    }
  
    .app{
      display:block !important;
      width:100% !important;
      max-width:430px !important;
      margin:0 auto !important;
      padding:0 14px 108px !important;
      overflow:visible !important;
    }
  
    /* Ocultar interfaz de escritorio completa en mÃ³vil */
    .topbar,
    .tabs{
      display:none !important;
    }
  
    #home > :not(.mobile-home-ui){
      display:none !important;
    }
  
    .mobile-home-ui{
      display:block !important;
      width:100% !important;
      padding-top:14px;
    }
  
    .m-brand-row{
      min-height:112px;
      display:flex;
      align-items:center;
  
    .m-activity-row small{
      display:block;
      margin-top:4px;
      color:#77849d;
      font-size:8px;
    }
  
    .m-activity-row em{
      color:#ff4c9d;
      font-size:8px;
      font-style:normal;
    }
  
    /* NavegaciÃ³n mÃ³vil */
>   .mobile-bottom-nav{
      position:fixed;
      z-index:3000;
      left:50%;
      bottom:0;
      transform:translateX(-50%);
      width:min(100%,430px);
      min-height:82px;
      display:grid !important;
      grid-template-columns:repeat(5,1fr);
      align-items:end;
      gap:0;
      padding:8px 6px calc(8px + env(safe-area-inset-bottom));
      border-top:1px solid rgba(47,84,132,.25);
      background:rgba(3,7,16,.97);
      box-shadow:0 -12px 32px rgba(0,0,0,.45);
      backdrop-filter:blur(18px);
    }
  
    .mnav{
      height:59px;
      padding:6px 2px !important;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:5px;
      border:0 !important;
      background:transparent !important;
      color:#7b88a0 !important;
      box-shadow:none !important;
    }
  
    .mnav span{
      font-size:24px;
      line-height:1;
    }
  
    .mnav b{
      font-size:8px;
    }
  
    .mnav.active{
      color:#bf62ff !important;
    }
  
    .mnav.crown{
      position:relative;
      top:-14px;
      width:70px;
      height:70px;
      justify-self:center;
      border-radius:50% !important;
      border:2px solid #9145ff !important;
      background:
        radial-gradient(circle,#171025,#070a16 66%) !important;
      color:white !important;
      box-shadow:
        0 0 0 8px rgba(92,36,157,.10),
        0 0 24px rgba(150,59,255,.55) !important;
    }
  
    .mnav.crown span{
      font-size:37px;
      color:white;
      text-shadow:0 0 14px rgba(221,108,255,.80);
    }
  
    /* Inventario mÃ³vil */
    .m-section-head{
      display:flex !important;
        <article class="card full">
  
          <h2>Mensajes recibidos</h2>
  
          <div id="inboxList">
            Selecciona un correo.
          </div>
  
        </article>
  
      </div>
  
    </section>
  
  
>   <nav class="mobile-bottom-nav" aria-label="NavegaciÃ³n mÃ³vil">
      <button type="button" class="mnav active" data-mobile-tab="home" onclick="mobileGo('home')">
        <span>âŒ‚</span><b>Inicio</b>
      </button>
  
      <button type="button" class="mnav" data-mobile-tab="inventory" onclick="mobileGo('inventory')">
        <span>â™§</span><b>CatÃ¡logo</b>
      </button>
  
      <button type="button" class="mnav crown" data-mobile-tab="stock" onclick="mobileGo('inventory', true)">
        <span>â™•</span>
      </button>
  
      <button type="button" class="mnav" data-mobile-tab="sales" onclick="mobileGo('sales')">
        <span>â—´</span><b>Historial</b>
      </button>
  
      <button type="button" class="mnav" data-mobile-tab="profile" onclick="mobileProfile()">
        <span>â™™</span><b>Perfil</b>
      </button>
    </nav>
  
  </main>
  
  
  <script>
  
    const API =
      '/api';
  
    let token =
      localStorage.getItem(
        'royalAdminToken'
      ) || '';
  
    let currentAdmin =
      null;
  
    let domains =
      [];
  
    let aliases =
      [];
  
    let codeRequests =
      [];
  
    let sales =
      [];
  
    let inventoryItems =
      [];
  
    let inventoryStats =
      {};
  
    let products =
      [];
  
    let inboxMessages =
      [];
  
  
    function escapeHtml(value) {
  
      return String(
        value ?? ''
      )
        .replaceAll(
          '&',
          '&amp;'


PS C:\Users\SPC\OneDrive\Escritorio\ROYAL-LEGACY-COMPLETO> Get-Content public\index.html | Select-String -Pattern "<!-- INVENTARIO -->" -Context 10,40

          </div>
  
        </article>
  
      </div>
  
    </section>
  
  
    <!-- =============================== -->
>   <!-- INVENTARIO -->
    <!-- =============================== -->
  
  
    <section
      id="inventory"
      class="section"
    >
  
      <div class="m-section-head">
        <button type="button" onclick="mobileGo('home')" aria-label="Volver">â†PS C:\Users\SPC\OneDrive\Escritorio\ROYAL-LEGACY-COMPLETO> 