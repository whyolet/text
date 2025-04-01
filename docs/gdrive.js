import {getId} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {o, ui} from "./ui.js";

export const onGDriveSync = async () => {
  mem.nonce = getId();
  await db.saveConf(db.conf.nonce);

  const form = o("form", {
    method: "GET",
    action: "https://accounts.google.com/o/oauth2/v2/auth",
  });

  const params = {
    client_id: "688517838791-tuli5btteuvei4m8el5t8e7lv11c653i.apps.googleusercontent.com",
    prompt: "select_account",
    scope: "https://www.googleapis.com/auth/drive.file",
    state: mem.nonce,
    response_type: "token",
    redirect_uri: "https://text.whyolet.com/",
  };

  for (const [name, value] of Object.entries(params)) {
    form.appendChild(
      o("input", {
        "type": "hidden",
        name,
        value,
      }),
    );
  }

  ui.body.appendChild(form);
  form.submit();
  alert("Under construction");
};
