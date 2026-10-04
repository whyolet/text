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

import {fatal, mi, ui} from "./ui.js";

const onError = async (event) => {

  /// details

  const details = `Error details:

${event.message || event.reason || ""}

${event.filename || ""}:${event.lineno || ""}:${event.colno || ""}

${
event.error && event.error.stack ||
event.reason && event.reason.stack ||
""
}`;

  /// fatal

  await fatal(
    "Error!",
    `
Please help to fix it
by sending details to
${ui.supportEmail}
    `,
    mi("content_copy", "Copy details to clipboard", () => {
      navigator.clipboard.writeText(details);
    }),
    mi("send", "Send details by email", () => {
      location.href = (
        ui.supportHref +
        "&body=" +
        encodeURIComponent(details)
      );
    }),
  );
};

addEventListener("error", onError);
addEventListener("unhandledrejection", onError);
