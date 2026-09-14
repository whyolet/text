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

import {onSyncMenu} from "./gdrive.js";
import {onBackupMenu, onPageExport, onPageImport, onSetExportPassphrase} from "./file.js";
import {onColors, onFontForm} from "./font.js";
import {onLineForm} from "./line.js";
import {getPersisted, onLocalData} from "./local.js";
import {choose, mi} from "./ui.js";

/// onMenu

export const onMenu = async () => {
  const persisted = await getPersisted();

  const action = await choose(
    "Menu",
    mi(persisted ? "health_and_safety" : "warning", "Local data", onLocalData),
    mi("rule_settings", "Sync setup", onSyncMenu),
    mi("deployed_code", "Backup", onBackupMenu),
    mi("file_save", "Save page", onPageExport),
    mi("file_open", "Load page", onPageImport),
    mi("123", "Line number", onLineForm),
    mi("format_size", "Font size", onFontForm),
    mi("palette", "Colors", onColors),
    mi("help", "About", () => open("https://whyolet.com/text/", "_blank")),
  );
  if (!action) return;

  await action();
};
