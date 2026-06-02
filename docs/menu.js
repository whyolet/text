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

import {onBackupExportDB, onBackupExportCSV, onBackupImport, onPageExport, onPageImport, onSetExportPassphrase} from "./file.js";
import {onFontForm} from "./font.js";
import {onLineForm} from "./line.js";
import {getPersisted, onLocalData} from "./local.js";
import {hideAtticForms} from "./nav.js";
import {onGDriveSync} from "./gdrive.js";
import {ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, toast, ui} from "./ui.js";

/// initMenuUI

export const initMenuUI = () => {
  ui.localDataButton = ib("pending", "", onLocalData);

  ui.menuForm = o(".menu-form hidden",
    o(".main",
      ib("help", "", "https://whyolet.com/text/"),
      ib("format_size", "", onFontForm),
      ui.localDataButton,
      ib("file_save", "", onPageExport),
      ib("file_open", "", onPageImport),
      ib("key", "", onSetExportPassphrase),
      ib("drive_export", "", onGDriveSync),
      ib("archive", "", onBackupExportDB),
      ib("unarchive", "", onBackupImport),
      ib("csv", "", onBackupExportCSV),
      ib("123", "", onLineForm),
    ),
    ib("close", "x", hideMenuForm),
  );

  ui.attic.appendChild(ui.menuForm);
};

/// onMenuForm

export const onMenuForm = () => {
  if (isHidden(ui.menuForm)) {
    showMenuForm();
  } else hideMenuForm();
};

/// showMenuForm

export const showMenuForm = async () => {
  hideAtticForms();
  expand(ui.attic);
  show(ui.menuForm);

  const persisted = await getPersisted();
  ui.localDataButton.textContent = persisted ? "health_and_safety" : "warning";
};

/// hideMenuForm

export const hideMenuForm = () => {
  if (isHidden(ui.menuForm)) return;

  hide(ui.menuForm);
  collapse(ui.attic);
};
