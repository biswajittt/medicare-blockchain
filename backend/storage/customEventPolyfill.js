// Polyfill CustomEvent for Node.js
if (typeof global.CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(
      event,
      params = { bubbles: false, cancelable: false, detail: null }
    ) {
      super(event, params);
      this.detail = params.detail;
    }
  };
}
