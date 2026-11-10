'use strict';

function checkboxState(enabled, checked) {
  const available = Boolean(enabled);
  return { enabled: available, checked: available && Boolean(checked) };
}

module.exports = { checkboxState };
