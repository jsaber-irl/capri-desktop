'use strict';

/**
 * Limite la navigation et les fenêtres ouvertes aux documents locaux de Capri.
 * Les liens externes doivent passer par les gestionnaires Main prévus pour cela.
 * @param {import('electron').App} app Instance Electron recevant les webContents.
 */
function installNavigationGuards(app) {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event, destination) => {
      let trusted = false;
      try {
        const url = new URL(destination);
        trusted = url.protocol === 'capri:' && url.host === 'app';
      } catch { /* Une URL mal formée n'est jamais une destination interne fiable. */ }
      if (!trusted) event.preventDefault();
    });
  });
}

module.exports = { installNavigationGuards };
