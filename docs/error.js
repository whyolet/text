/*
 * Whyolet Text - personal tasks/text editor.
 * Copyright (C) 2026  Denis Ryzhkov <denisr@denisr.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {o, onClick, getRestartButton, showBanner, ui} from "./ui.js";

const onError = (event) => {

  /// details

  const details = `Error details:

${event.message || event.reason || ""}

${event.filename || ""}:${event.lineno || ""}:${event.colno || ""}

${
event.error && event.error.stack ||
event.reason && event.reason.stack ||
""
}`;

  /// copyButton

  const copyButton = o(".rounded button",
    o(".icon", "content_copy"),
    " Copy details to clipboard",
  );

  onClick(copyButton, () => {
    navigator.clipboard.writeText(details);
  });

  /// sendButton

  const sendButton = o(".rounded button",
    o(".icon", "send"),
    " Send details by email",
  );

  onClick(sendButton, () => {
    location.href = (
      ui.supportHref +
      "&body=" +
      encodeURIComponent(details)
    );
  });

  /// banner

  showBanner({},
    "Error!",
    o("",
      "Please help to fix it", o("br"),
      "by sending details to", o("br"),
      o("b", ui.supportEmail),
    ),
    o("",
      copyButton,
      sendButton,
      getRestartButton(),
    ),
  );
};

addEventListener("error", onError);
addEventListener("unhandledrejection", onError);
