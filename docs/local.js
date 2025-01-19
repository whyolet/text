import {openInfoScreen} from "./info.js";
import {o, onClick} from "./ui.js";

/// isPersistSupported

const isPersistSupported = (
  "storage" in navigator &&
  "persist" in navigator.storage
);

/// getPersisted

export const getPersisted = async () => {
  if (isPersistSupported) {
    return await navigator.storage.persisted();
  }
  return false;
};

/// tryPersist

export const tryPersist = async () => {
  if (isPersistSupported) {
    return await navigator.storage.persist();
  }
  return false;
};

/// onLocalData

export const onLocalData = async () => {
  const header = "Local data";
  let persisted = await getPersisted();
  if (!persisted) persisted = await tryPersist();

  if (persisted) {
    openInfoScreen(header, [
      "Good news: your web browser has agreed not to delete your local data.",
      "However, to be safe, use the menu to backup or sync your data.",
    ]);
    return;
  }

  const requestPermButton = o(".rounded button",
    o(".icon", "toggle_on"),
    " Request permission",
  );
  onClick(requestPermButton, onRequestPerm);

  openInfoScreen(header, [
    "Bad news: your web browser plans to delete your local data.",
    'To avoid this, click "Install app" or "Add to Home Screen" in the browser menu, and open the installed app.',
    o("",
      'If you still see this warning, please request "Notification" permission ',
      o("a", {
        href: "https://web.dev/articles/persistent-storage#how_is_permission_granted",
        target: "_blank",
      }, "required"),
      ' for "Persistent storage" permission:',
      o(".centered",
        requestPermButton,
      ),
    ),
  ]);
};

/// onRequestPerm

const onRequestPerm = async () => {
  if (await tryPersist()) {
    onSuccess();
    return;
  }

  if (!isPersistSupported) {
    alert("Persistence is not supported, get a new browser!");
    return;
  }

  if (!("Notification" in window)) {
    alert("Notification is not supported, get a new browser!");
    return;
  }

  if (Notification.permission === "granted") {
    alert("Notification was allowed already, but it does not help. Try another browser.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Notification is NOT allowed! Please try again.");
    return;
  }

  if (!await tryPersist()) {
    alert("Notification is allowed, but it does not help. Try another browser.");
    return;
  }

  onSuccess();
};

/// onSuccess

const onSuccess = () => {
  alert("Success!");
  history.back();
  setTimeout(onLocalData, 200);
};
