import {onBackupExport, onBackupImport, onPageExport, onPageImport, onSetExportPassphrase} from "./file.js";
import {onFontForm} from "./font.js";
import {openInfoScreen} from "./info.js";
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
      ib("format_size", "", onFontForm),
      ib("123", "", onLineForm),
      ui.localDataButton,
      ib("file_save", "", onPageExport),
      ib("file_open", "", onPageImport),
      ib("key", "", onSetExportPassphrase),
      ib("archive", "", onBackupExport),
      ib("unarchive", "", onBackupImport),
      ib("drive_export", "", onGDriveSync),
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

/// openMenuInfo

export const openMenuInfo = (props) => {
  openInfoScreen(ui.appName, [
    "Personal tasks/text editor.",
    o("",
      o("b", "Help:"),
      o("ul",
        o("li", "Press and hold any button to learn it."),
        o("li",
          "Report a bug or idea to ",
          o("a", {href: ui.supportHref}, ui.supportEmail),
        ),
      ),
    ),
    o("",
      o("b", "Privacy:"),
      o("ul",
        o("li", "Your data is kept locally on your device unless you sync it to your Google Drive or export it yourself."),
        o("li",
          "Press and hold the ",
          o(".icon", "key"),
          " button in the menu to learn about the encryption used.",
        ),
      ),
    ),
    o("",
      o("b", "Terms of service:"),
      o("ul",
        o("li",
          ui.appName + " software is a PWA (Progressive Web App) published at ",
          o("a", {href: "https://text.whyolet.com/"}, "text.whyolet.com"),
        ),
        o("li",
          "Its open source is published and maintained at ",
          o("a", {href: "https://github.com/whyolet/text", target: "_blank"}, "github.com/whyolet/text"),
          " by ",
          o("a", {href: "https://whyolet.com/", target: "_blank"}, "Denis Ryzhkov"),
        ),
        o("li", 'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'),
      ),
    ),
  ], props);
};
