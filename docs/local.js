import * as db from "./db.js";
import {openInfoScreen} from "./info.js";
import {showMenuForm} from "./menu.js";
import {getRestartButton, o, onClick, showBanner} from "./ui.js";

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
  const header = "Your data";

  const deleteButton = o(".rounded button",
    o(".icon", "delete_forever"),
    " Delete your data",
  );
  onClick(deleteButton, onDeleteLocalData);

  const dangerZone = [
    o(".hr"),
    o("b", "DANGER ZONE"),
    "If you uninstall web app from home screen, you can still access your data from web browser.",
    o("",
      "If you use the button below, there is no way back, unless you have a backup file or another device with this data.",
      o(".centered", deleteButton),
    ),
  ];

  let persisted = await getPersisted();
  if (!persisted) persisted = await tryPersist();

  if (persisted) {
    await openInfoScreen(header, [
      "Good news: your web browser has agreed not to delete your data.",
      "However, to be safe, use the menu to backup or sync your data.",
      "", "",
      dangerZone,
    ]);
    return;
  }

  const requestPermButton = o(".rounded button",
    o(".icon", "toggle_on"),
    " Request permission",
  );
  onClick(requestPermButton, onRequestPerm);

  await openInfoScreen(header, [
    "Bad news: your web browser plans to delete your data.",
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
    dangerZone,
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
  showMenuForm();  // Update icon.
  alert("Success!");
  history.back();
  setTimeout(onLocalData, 200);
};

/// onDeleteLocalData

const onDeleteLocalData = async () => {
  const answer = prompt('Do you want to delete all your data from this app on this device? Type "yes" to confirm.');

  if (!answer || answer.trim().toLowerCase() !== "yes") {
    alert(`Deletion was canceled.
Your data is still here.`);
    return;
  }

  await db.deleteLocalData();

  showBanner({},
    "Your data is deleted",
    o("",
      "You've successfully deleted your data",
      o("br"),
      "from this app on this device.",
      o("br"),
      o("br"),
      "You can start from scratch now.",
    ),
    getRestartButton(),
  );
};
