'use strict';

// Kept in one place so spoken names and localized app labels resolve consistently.
const APP_ALIASES = {
  Weather: {
    bundleIds: ['com.apple.weather'], identifiers: ['bingweather', 'gnome.weather', 'org.gnome.weather'],
    aliases: ['météo', 'meteo', 'weather', 'la météo', 'l’application météo', 'application météo'],
  },
  Calendar: {
    bundleIds: ['com.apple.iCal'], identifiers: ['windowslive.calendar'],
    aliases: ['calendrier', 'calendar', 'agenda', 'le calendrier'],
  },
  Notes: {
    bundleIds: ['com.apple.Notes'], identifiers: ['microsoftstickynotes', 'onenote'],
    aliases: ['notes', 'note', 'les notes', 'note-taking'],
  },
  Safari: {
    bundleIds: ['com.apple.Safari'],
    aliases: ['safari'],
  },
  'System Settings': {
    bundleIds: ['com.apple.systempreferences'], identifiers: ['windows.immersivecontrolpanel'],
    aliases: ['réglages système', 'reglages systeme', 'paramètres', 'parametres', 'settings', 'system settings', 'préférences système', 'preferences systeme'],
  },
  'Activity Monitor': {
    bundleIds: ['com.apple.ActivityMonitor'],
    aliases: ["moniteur d’activité", "moniteur d'activite", 'moniteur activité', 'moniteur activite', 'activity monitor'],
  },
  Browser: {
    bundleIds: [],
    aliases: ['navigateur', 'navigateur web', 'browser', 'web browser', 'internet browser'],
  },
};

module.exports = { APP_ALIASES };
