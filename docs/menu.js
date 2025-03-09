import {onBackupExport, onBackupImport, onPageExport, onPageImport, onSetExportPassphrase} from "./file.js";
import {onFontForm} from "./font.js";
import {onLineForm} from "./line.js";
import {getPersisted, onLocalData} from "./local.js";
import {hideAtticForms} from "./nav.js";
import {ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, toast, ui} from "./ui.js";

/// initMenuUI

export const initMenuUI = () => {
  ui.localDataButton = ib("pending", "", onLocalData);

  ui.menuForm = o(".menu-form hidden",
    o(".main",
      ib("format_size", "", onFontForm),
      ib("123", "", onLineForm),
      ui.localDataButton,
      ib("file_save", "", onPageExport),
      ib("file_open", "", onPageImport),
      ib("key", "", onSetExportPassphrase),
      ib("archive", "", onBackupExport),
      ib("unarchive", "", onBackupImport),
      ib("drive_export", "", onTodo),
      ib("layers", "", onTodo),
    ),
    ib("close", "x", hideMenuForm),
  );

  ui.attic.appendChild(ui.menuForm);
};

/// onTodo

const onTodo = () => toast("Under construction");

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
