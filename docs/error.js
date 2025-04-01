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
