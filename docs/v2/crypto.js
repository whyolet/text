import {o, restartButton, showBanner} from "./ui.js";

/// Current passphrase, not exported.

let passphrase = "";

/// Set new passphrase.

export const setPassphrase = (newValue) => {
  passphrase = newValue;
};

/// getSalt, getIV, getRandomBytes

export const getSalt = () => getRandomBytes(24);

const getIV = () => getRandomBytes(12);

const getRandomBytes = (size) => crypto.getRandomValues(new Uint8Array(size));

/// getKey

export const getKey = async (salt) => {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 1000000,
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  return key;
};

/// getDbName

export const getDbName = async () => {
  const saltName = "dbNameSalt";
  let saltString = localStorage.getItem(saltName);
  if (!saltString) {
    saltString = JSON.stringify(Array.from(getSalt()));
    localStorage.setItem(saltName, saltString);
  }
  const salt = new Uint8Array(JSON.parse(saltString));

  const key = await getKey(salt);
  const buffer = await crypto.subtle.exportKey("raw", key);
  const untyped = Array.from(new Uint8Array(buffer));
  const hexes = untyped.map(byte => byte.toString(16).padStart(2, "0"));
  return hexes.join("");
};

/// decrypt: ArrayBuffer -> JSON -> object

export const decrypt = async (buffer, key) => {
  let i = 0;
  if (!key) {
    i = 24;
    const salt = new Uint8Array(buffer, 0, i);
    key = await getKey(salt);
  }

  const iv = new Uint8Array(buffer, i, 12);
  const encrypted = new Uint8Array(buffer, i + 12);

  let decrypted;
  try {
    decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encrypted,
    );
  } catch (error) {
    if (
      error.name === "OperationError" ||
      error.name === "InvalidAccessError"
    ) {
      showBanner(
        o(".header", "Decryption failed!"),
        o("", "Try another passphrase."),
        restartButton,
      );
      return null;
    }
    throw error;
  }

  const decompressed = await tryDecompress(decrypted);
  if (decompressed === null) return null;

  const decoder = new TextDecoder();
  const text = decoder.decode(decompressed);
  return JSON.parse(text);
};

/// tryDecompress
// buffer: ArrayBuffer
// return: ArrayBuffer || null

const tryDecompress = async (buffer) => {
  if (buffer.byteLength < 2) return buffer;

  const header = new Uint8Array(buffer, 0, 2);
  if (
    header[0] !== 31 ||
    header[1] !== 139
  ) return buffer;

  if (!("DecompressionStream" in window)) {
    showBanner(
      o(".header", "Cannot decompress!"),
      o("", "Try another browser."),
      restartButton,
    );
    return null;
  }

  const gzipped = new Blob([buffer]);
  const gunzip = new DecompressionStream("gzip");
  const plain = gzipped.stream().pipeThrough(gunzip);
  const response = new Response(plain);
  return await response.arrayBuffer();
};

/*

/// getEncrypted

const getEncrypted = async (key, data) => {
  const iv = getIV();
  const dataBlob = new Blob([data]);
  const dataBuffer = await dataBlob.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    dataBuffer,
  );

  return {iv, encrypted};
  // It is tempting to pass `iv` as an argument, but returning it ensures it is unique each time.
};

/// tryCompress

const tryCompress = async (text) => {
  if (!("CompressionStream" in window)) return text;

  const plain = new Blob([text]);
  const gzip = new CompressionStream("gzip");
  const gzipped = plain.stream().pipeThrough(gzip);
  const response = new Response(gzipped);
  return await response.blob();
};

*/
