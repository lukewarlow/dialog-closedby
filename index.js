export function isSupported() {
  return (
    typeof HTMLDialogElement !== "undefined" &&
    typeof HTMLDialogElement.prototype === "object" &&
    "closedBy" in HTMLDialogElement.prototype
  );
}

/** @type {WeakMap<Document, Set<HTMLDialogElement>>} */
const anyDialogList = new WeakMap();
function lightDismissOpenDialogs(event) {
  if (!event.isTrusted) return;
  // Composed path allows us to find the target within shadowroots
  const target = event.composedPath()[0];
  if (!target) return;
  const document = target.ownerDocument;
  if (anyDialogList.has(document)) {
    for (const dialog of Array.from(anyDialogList.get(document)).reverse()) {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
      if (isInDialog) {
        break;
      }
      dialog.close();
    }
  }
}

function observeShadowRoots(ElementClass, callback) {
  const attachShadow = ElementClass.prototype.attachShadow;
  ElementClass.prototype.attachShadow = function (init) {
    const shadow = attachShadow.call(this, init);
    callback(shadow);
    return shadow;
  };
}

export function apply() {
  const show = HTMLDialogElement.prototype.show;

  HTMLDialogElement.prototype.show = function () {
    show.call(this, ...arguments);
    const closedby = this.closedBy;
    if (['any', 'closerequest'].includes(closedby)) {
      this.__closeWatcher = new CloseWatcher();
      this.__closeWatcher.onclose = () => {
        this.close();
      };

      if (closedby === 'any') {
        const document = this.ownerDocument;
        if (!anyDialogList.has(document)) {
          anyDialogList.set(document, new Set());
        }
        anyDialogList.get(document).add(this);
      }
    }
  }
  const showModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () {
    showModal.call(this, ...arguments);
    const closedby = this.closedBy;
    if (closedby === 'any') {
      const document = this.ownerDocument;
      if (!anyDialogList.has(document)) {
        anyDialogList.set(document, new Set());
      }
      anyDialogList.get(document).add(this);
    } else if (closedby === 'none') {
      // TODO: Polyfill this, tricky due to close watcher anti-abuse mechanisms
    }
  }
  const close = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.close = function () {
    close.call(this, ...arguments);
    this.__closeWatcher?.dispose?.();
    const document = this.ownerDocument;
    if (anyDialogList.has(document)) {
      anyDialogList.get(document).delete(this);
    }
  }

  Object.defineProperty(HTMLDialogElement.prototype, "closedBy", {
    get() {
      const val = this.getAttribute('closedby');
      if (["none", "any", "closerequest"].includes(val))
        return val;
      return "";
    },
    set(newValue) {
      if (["none", "any", "closerequest"].includes(newValue))
        this.setAttribute("closedby", newValue);
      else this.removeAttribute("closedby");
    },
    enumerable: true,
    configurable: true,
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "closedby" && mutation.target.tagName === "DIALOG") {
        // TODO: Check what the expected behaviour here is. Closing is just the easiest.
        if (mutation.oldValue !== mutation.target.getAttribute('closedby'))
            mutation.target.close();
      }
    }
  });
  const observerOptions = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["closedby"],
  };
  observer.observe(document, observerOptions);

  observeShadowRoots(globalThis.HTMLElement || function () {}, (shadow) => {
    observer.observe(shadow, observerOptions);
  });

  document.addEventListener("pointerdown", lightDismissOpenDialogs);
}
