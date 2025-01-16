import {o, onClick, getRestartButton, showBanner} from "./ui.js";

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

  const copyButton = o(".button",
    o(".icon", "content_copy"),
    " Copy details to clipboard",
  );

  onClick(copyButton, () => {
    navigator.clipboard.writeText(details);
  });

  /// sendButton

  const sendButton = o(".button",
    o(".icon", "send"),
    " Send details by email",
  );

  onClick(sendButton, () => {
    location.href = (
      "mailto:support@whyolet.com" +
      "?subject=Whyolet%20Text" +
      "&body=" +
      encodeURIComponent(details)
    );
  });

  /// banner

  showBanner({},
    o(".header", "Error!"),
    o("",
      "Please help to fix it", o("br"),
      "by sending details to", o("br"),
      o("b", "support@whyolet.com"),
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
