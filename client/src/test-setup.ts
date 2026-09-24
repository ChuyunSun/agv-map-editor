import '@testing-library/jest-dom/vitest';

// jsdom has no native modal implementation; emulate open/close for component tests.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
}
