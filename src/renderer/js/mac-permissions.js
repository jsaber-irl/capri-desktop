'use strict';

(() => {
  const $ = (id) => document.getElementById(id);

  let currentLang = 'fr';
  let pendingFocus = null;

  const UI_TEXT = {
    fr: {
      granted: 'AUTORISÉ',
      denied: 'REFUSÉ',
      action_required: 'ACTION REQUISE',
      pending: 'VÉRIFICATION...',
      unknown: 'INCONNU',
      unsupported: 'NON PRIS EN CHARGE',
      allOk: 'TOUTES LES PERMISSIONS SONT ACTIVES',
      needsAction: 'INTERVENTION MANUELLE REQUISE',
      countFormat: (granted, total) => `${granted} / ${total} autorisations accordées`,
      windowTestSuccess: (count) => `${count} fenêtre(s) ouverte(s) détectée(s) :`,
      windowTestError: (err) => `Erreur lors de la détection des fenêtres : ${err}`,
      windowFocus: 'Activer',
      windowMove: 'Déplacer',
      emptyHint: 'Aucune fenêtre détectée ou accès non autorisé.',
      automationUnknown: 'macOS ne permet pas de lire cet état sans envoyer un Apple Event. Choisissez une cible et demandez explicitement l’autorisation.',
      automationLoading: 'Envoi d’un Apple Event de vérification… macOS peut afficher une demande.',
      automationPrompted: 'Requête Apple Events envoyée. Choisissez dans la boîte macOS si elle apparaît, puis vérifiez l’état.',
      automationDenied: 'Accès refusé. Ouvrez Réglages Système → Confidentialité et sécurité → Automatisation, puis modifiez l’autorisation de la cible.',
      automationGranted: (name) => `Apple Event envoyé à ${name} et autorisation vérifiée.`,
      automationUnknownResult: 'La requête a été envoyée, mais son résultat ne permet pas de confirmer l’autorisation. Consultez les instructions macOS.',
      automationNotSent: 'Aucun Apple Event envoyé. Vérifiez que l’application cible est ouverte.',
      automationRequest: 'Demander l’autorisation',
      automationSettings: 'Ouvrir les Réglages Système',
      automationVerify: 'Vérifier à nouveau',
      focusRequested: 'Cible demandée par la fenêtre de traduction : demandez l’autorisation pour lire la page active.',
      refreshFailed: (err) => `Impossible de vérifier les permissions : ${err}`,
    },
    en: {
      granted: 'GRANTED',
      denied: 'DENIED',
      action_required: 'ACTION REQUIRED',
      pending: 'CHECKING...',
      unknown: 'UNKNOWN',
      unsupported: 'UNSUPPORTED',
      allOk: 'ALL PERMISSIONS GRANTED',
      needsAction: 'MANUAL ACTION REQUIRED',
      countFormat: (granted, total) => `${granted} / ${total} permissions granted`,
      windowTestSuccess: (count) => `${count} open window(s) detected:`,
      windowTestError: (err) => `Error detecting desktop windows: ${err}`,
      windowFocus: 'Focus',
      windowMove: 'Move',
      emptyHint: 'No windows detected or access denied.',
      automationUnknown: 'macOS cannot read this state without sending an Apple Event. Choose a target and explicitly request access.',
      automationLoading: 'Sending a verification Apple Event… macOS may show a prompt.',
      automationPrompted: 'Apple Events request sent. Choose in the macOS prompt if shown, then verify the state.',
      automationDenied: 'Access denied. Open System Settings → Privacy & Security → Automation and change access for this target.',
      automationGranted: (name) => `Apple Event sent to ${name}; permission verified.`,
      automationUnknownResult: 'The request was sent, but its result cannot confirm permission. See macOS instructions.',
      automationNotSent: 'No Apple Event was sent. Check that the target application is open.',
      automationRequest: 'Request Permission',
      automationSettings: 'Open System Settings',
      automationVerify: 'Check Again',
      focusRequested: 'Requested by the translation window: allow access to read the active page.',
      refreshFailed: (err) => `Could not check permissions: ${err}`,
    },
  };

  function t(key, ...args) {
    const dict = UI_TEXT[currentLang] || UI_TEXT.fr;
    const val = dict[key] || UI_TEXT.fr[key];
    return typeof val === 'function' ? val(...args) : (val || key);
  }

  function badgeClass(status) {
    if (status === 'granted') return 'badge badge--granted';
    if (status === 'denied') return 'badge badge--denied';
    if (status === 'action_required' || status === 'prompt') return 'badge badge--action_required';
    if (status === 'unsupported' || status === 'unknown') return 'badge badge--unknown';
    return 'badge badge--pending';
  }

  function renderPermissionCard(id, p, isEn) {
    const card = $(`card-${id}`);
    const badge = $(`badge-${id}`);
    const nameEl = $(`name-${id}`);
    const descEl = $(`desc-${id}`);
    const featEl = $(`features-${id}`);
    const instEl = $(`instructions-${id}`);

    if (!card || !p) return;

    card.dataset.status = p.status || 'unknown';

    if (badge) {
      badge.className = badgeClass(p.status);
      badge.textContent = t(p.status || 'unknown');
    }

    if (nameEl) nameEl.textContent = isEn ? p.nameEn : p.nameFr;
    if (descEl) descEl.textContent = isEn ? p.descEn : p.descFr;

    if (featEl) {
      const list = isEn ? p.affectedEn : p.affectedFr;
      featEl.replaceChildren(
        ...(list || []).map((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          return li;
        })
      );
    }

    if (instEl) {
      instEl.textContent = isEn ? p.instructionsEn : p.instructionsFr;
    }
  }

  function render(state) {
    if (!state) return;
    currentLang = state.lang === 'en' ? 'en' : 'fr';
    const isEn = currentLang === 'en';

    const topLed = $('topLed');
    const globalBadge = $('globalBadge');
    const summaryCount = $('summaryCount');

    if (topLed) {
      topLed.dataset.all = String(state.allGranted);
    }

    if (globalBadge) {
      globalBadge.className = state.allGranted ? 'badge badge--granted' : 'badge badge--action_required';
      globalBadge.textContent = state.allGranted ? t('allOk') : t('needsAction');
    }

    if (summaryCount) {
      summaryCount.textContent = t('countFormat', state.grantedCount || 0, state.total || 4);
    }

    const perms = state.permissions || {};
    for (const [id, p] of Object.entries(perms)) {
      renderPermissionCard(id, p, isEn);
    }
    const hint = $('summaryHint');
    if (hint && perms.automation?.status === 'unknown') hint.textContent = t('automationUnknown');
    for (const target of state.automationTargets || []) renderAutomationTarget(target);
    applyFocus();
  }

  function makeButton(label, marker, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${className}`;
    button.dataset[marker] = '';
    button.textContent = label;
    return button;
  }

  function ensureAutomationTarget(target) {
    let row = document.querySelector(`[data-target="${target.targetId}"]`);
    if (row) return row;
    const container = target.browser ? $('browser-targets') : $('automation-targets');
    if (!container) return null;
    row = document.createElement('article');
    row.className = 'automation-target';
    row.dataset.target = target.targetId;

    const head = document.createElement('div');
    head.className = 'automation-target-head';
    const name = document.createElement('strong');
    name.dataset.targetName = '';
    const badge = document.createElement('span');
    badge.className = 'badge badge--unknown';
    badge.dataset.targetStatus = '';
    badge.textContent = t('unknown');
    head.append(name, badge);

    const description = document.createElement('p');
    description.dataset.targetDesc = '';

    const actions = document.createElement('div');
    actions.className = 'perm-actions';
    actions.append(
      makeButton(t('automationRequest'), 'targetRequest', 'btn--action'),
      makeButton(t('automationSettings'), 'targetSettings', 'btn--secondary'),
      makeButton(t('automationVerify'), 'targetVerify', 'btn--secondary'),
    );
    row.append(head, description, actions);
    container.append(row);
    return row;
  }

  function renderAutomationTarget(target) {
    const row = ensureAutomationTarget(target);
    if (!row) return;
    const isEn = currentLang === 'en';
    const name = row.querySelector('[data-target-name], .automation-target-head strong');
    if (name) name.textContent = isEn ? (target.nameEn || target.targetApp) : (target.nameFr || target.targetApp);
    const description = row.querySelector('[data-target-desc], p');
    if (description && (target.descFr || target.descEn)) {
      description.textContent = isEn ? (target.descEn || target.descFr) : (target.descFr || target.descEn);
    }
    const badge = row.querySelector('[data-target-status]');
    if (badge) {
      badge.className = badgeClass(target.status);
      badge.textContent = t(target.status || 'unknown');
    }
    row.dataset.status = target.status || 'unknown';
    const request = row.querySelector('[data-target-request]');
    if (request) request.textContent = t('automationRequest');
    const settings = row.querySelector('[data-target-settings]');
    if (settings) settings.textContent = t('automationSettings');
    const verify = row.querySelector('[data-target-verify]');
    if (verify) verify.textContent = t('automationVerify');
  }

  function applyFocus() {
    if (!pendingFocus) return;
    const row = document.querySelector(`[data-target="${pendingFocus.targetId}"]`);
    if (!row) return;
    const focus = pendingFocus;
    pendingFocus = null;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.add('is-focus');
    setTimeout(() => row.classList.remove('is-focus'), 3200);
    const hint = $('summaryHint');
    if (hint) hint.textContent = t('focusRequested');
    if (focus.request) probeAutomation(focus.targetId, true);
  }

  async function probeAutomation(targetId, verify = false) {
    const row = document.querySelector(`[data-target="${targetId}"]`);
    const result = $('automation-result');
    const buttons = row?.querySelectorAll('button');
    buttons?.forEach((button) => { button.disabled = true; });
    if (result) result.textContent = t('automationLoading');
    try {
      const response = await window.macPermissions.automationProbe(targetId, verify);
      if (Array.isArray(response.automationTargets) && response.automationTargets.length) {
        response.automationTargets.forEach(renderAutomationTarget);
      } else if (response.targetId) {
        renderAutomationTarget(response);
      }
      if (result) {
        if (response.status === 'granted') result.textContent = t('automationGranted', response.targetApp || targetId);
        else if (response.status === 'denied') result.textContent = t('automationDenied');
        else if (response.requestSent) result.textContent = t('automationUnknownResult');
        else result.textContent = response.message || response.error || t('automationNotSent');
      }
      if (response.status === 'denied') {
        const hint = $('summaryHint');
        if (hint) hint.textContent = t('automationDenied');
      }
      return response;
    } catch (err) {
      console.error(`[capri-perm-ui] Apple Events request failed for ${targetId}:`, err);
      if (result) result.textContent = t('refreshFailed', err.message || err);
      return { ok: false, status: 'unknown', error: err.message };
    } finally {
      buttons?.forEach((button) => { button.disabled = false; });
    }
  }

  async function refresh() {
    if (!window.macPermissions) return;
    try {
      const state = await window.macPermissions.getStatus();
      render(state);
    } catch (err) {
      console.error('[capri-perm-ui] could not get status:', err);
      const hint = $('summaryHint');
      if (hint) hint.textContent = t('refreshFailed', err.message || err);
    }
  }

  async function handleRequest(id) {
    if (!window.macPermissions) return;
    const btn = $(`btn-request-${id}`);
    if (btn) btn.disabled = true;
    try {
      await window.macPermissions.request(id);
      if (id !== 'automation') await refresh();
    } catch (err) {
      console.error(`[capri-perm-ui] error requesting ${id}:`, err);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleSettings(section) {
    if (!window.macPermissions) return;
    try {
      const opened = await window.macPermissions.openSettings(section);
      if (!opened) {
        const hint = $('summaryHint');
        if (hint) hint.textContent = t('refreshFailed', 'Réglages Système n’a pas pu être ouvert.');
      }
    } catch (err) {
      console.error(`[capri-perm-ui] error opening settings for ${section}:`, err);
    }
  }

  async function testWindows() {
    const box = $('windowsResult');
    if (!box || !window.macPermissions) return;

      const pending = document.createElement('p');
      pending.className = 'empty-hint';
      pending.textContent = 'Interrogation des fenêtres macOS en cours...';
      box.replaceChildren(pending);

    try {
      const res = await window.macPermissions.listWindows();
      if (!res.ok) {
        const error = document.createElement('p');
        error.className = 'inst-text';
        error.style.cssText = 'color:var(--red);padding:8px';
        error.textContent = t('windowTestError', res.error || 'Accès refusé');
        box.replaceChildren(error);
        return;
      }

      if (!res.windows || !res.windows.length) {
        box.innerHTML = `<p class="empty-hint">${t('emptyHint')}</p>`;
        return;
      }

      const table = document.createElement('table');
      table.className = 'windows-table';
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const heading of ['Application', 'Titre de la fenêtre', 'Position', 'Taille', 'Actions']) {
        const th = document.createElement('th');
        th.textContent = heading;
        headerRow.append(th);
      }
      thead.append(headerRow);
      const tbody = document.createElement('tbody');
      table.append(thead, tbody);

      for (const w of res.windows) {
        const tr = document.createElement('tr');
        const appCell = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = w.app;
        appCell.append(strong);
        const titleCell = document.createElement('td');
        titleCell.textContent = w.title || '(sans titre)';
        const positionCell = document.createElement('td');
        positionCell.textContent = `${w.x}, ${w.y}`;
        const sizeCell = document.createElement('td');
        sizeCell.textContent = `${w.w} × ${w.h}`;
        const actionsCell = document.createElement('td');
        const focusButton = document.createElement('button');
        focusButton.type = 'button';
        focusButton.className = 'btn btn--small btn--secondary btn-focus';
        focusButton.dataset.app = w.app;
        focusButton.textContent = t('windowFocus');
        const moveButton = document.createElement('button');
        moveButton.type = 'button';
        moveButton.className = 'btn btn--small btn--action btn-move';
        moveButton.dataset.app = w.app;
        moveButton.dataset.x = String(w.x + 30);
        moveButton.dataset.y = String(w.y + 30);
        moveButton.textContent = t('windowMove');
        actionsCell.append(focusButton, moveButton);
        tr.append(appCell, titleCell, positionCell, sizeCell, actionsCell);
        tbody.append(tr);
      }

      box.replaceChildren(table);

      box.querySelectorAll('.btn-focus').forEach((btn) => {
        btn.addEventListener('click', () => {
          const app = btn.dataset.app;
          window.macPermissions?.focusWindow(app);
        });
      });

      box.querySelectorAll('.btn-move').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const app = btn.dataset.app;
          const x = parseInt(btn.dataset.x, 10);
          const y = parseInt(btn.dataset.y, 10);
          const moveRes = await window.macPermissions?.moveWindow({ appName: app, windowIndex: 1, x, y });
          if (moveRes && !moveRes.ok) {
            alert(`Erreur : ${moveRes.error || 'Action bloquée par macOS'}`);
          } else {
            testWindows();
          }
        });
      });
    } catch (err) {
      const error = document.createElement('p');
      error.className = 'inst-text';
      error.style.cssText = 'color:var(--red);padding:8px';
      error.textContent = t('windowTestError', err.message);
      box.replaceChildren(error);
    }
  }

  // Event Listeners
  $('closeBtn')?.addEventListener('click', () => window.macPermissions?.close());
  $('refreshAllBtn')?.addEventListener('click', refresh);

  $('btn-request-accessibility')?.addEventListener('click', () => handleRequest('accessibility'));
  $('btn-settings-accessibility')?.addEventListener('click', () => handleSettings('accessibility'));

  $('btn-request-microphone')?.addEventListener('click', () => handleRequest('microphone'));
  $('btn-settings-microphone')?.addEventListener('click', () => handleSettings('microphone'));

  $('btn-settings-screen')?.addEventListener('click', () => handleSettings('screen'));

  $('automation-targets')?.addEventListener('click', (event) => {
    const row = event.target.closest?.('[data-target]');
    if (!row) return;
    const targetId = row.dataset.target;
    if (event.target.closest('[data-target-request]')) probeAutomation(targetId, false);
    else if (event.target.closest('[data-target-verify]')) probeAutomation(targetId, true);
    else if (event.target.closest('[data-target-settings]')) handleSettings('automation');
  });

  $('testWindowsBtn')?.addEventListener('click', testWindows);

  if (window.macPermissions?.onStatusChange) {
    window.macPermissions.onStatusChange((state) => render(state));
  }
  if (window.macPermissions?.onFocusTarget) {
    window.macPermissions.onFocusTarget((focus) => {
      if (!focus || !focus.targetId) return;
      pendingFocus = focus;
      applyFocus();
    });
  }

  // Initial load
  refresh();
})();

