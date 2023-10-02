export function isSupported() {
  return (
    typeof HTMLDialogElement !== "undefined" &&
    typeof HTMLDialogElement.prototype === "object" &&
    "lightdismiss" in HTMLDialogElement.prototype
  );
}

function handleDialogClick(event) {
  if (!event.isTrusted) return;
  if (event.defaultPrevented) return;
  const relatedTarget = event.target;

  if (!relatedTarget.hasAttribute("lightdismiss")) {
    return relatedTarget.removeEventListener('click', handleDialogClick);
  }
  if (event.type === "click") {
    const rect = relatedTarget.getBoundingClientRect();
    const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
    if (!isInDialog) {
      relatedTarget.close();
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
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "lightdismiss" && mutation.target.tagName === "DIALOG") {
        if (mutation.target.hasAttribute("lightdismiss")) {
          mutation.target.addEventListener("click", handleDialogClick);
        } else {
          mutation.target.removeEventListener("click", handleDialogClick);
        }
      }
    }
  });
  const observerOptions = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["lightdismiss"],
  };
  observer.observe(document, observerOptions);

  observeShadowRoots(globalThis.HTMLElement || function () {}, (shadow) => {
    observer.observe(shadow, observerOptions);
  });

  for (const dialog of document.querySelectorAll("dialog[lightdismiss]")) {
    dialog.addEventListener("click", handleDialogClick);
  }
}
