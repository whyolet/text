import {o, restartButton, showBanner} from "./ui.js";

const Bytes = Uint8Array;

/// Current passphrase, not exported.

let passphrase = "";

/// Set new passphrase.

export const setPassphrase = (newValue) => {
  passphrase = newValue;
};

/// getSalt, getIV, getRandomBytes

const saltSize = 24, ivSize = 12;

export const getSalt = () => getRandomBytes(saltSize);

const getIV = () => getRandomBytes(ivSize);

const getRandomBytes = (size) => crypto.getRandomValues(new Bytes(size));

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
  const salt = new Bytes(JSON.parse(saltString));

  const key = await getKey(salt);
  const buffer = await crypto.subtle.exportKey("raw", key);
  const untyped = Array.from(new Bytes(buffer));
  const hexes = untyped.map(byte => byte.toString(16).padStart(2, "0"));
  return hexes.join("");
};

/// encrypt: object -> JSON -> Bytes
// (data, key) -> [iv, encrypted]
// (data) -> [salt, iv, compressed+encrypted]

const encrypt = async (data, key) => {
  let salt;
  if (!key) {
    salt = getSalt();
    key = await getKey(salt);
  }

  const iv = getIV();
  const jsonified = JSON.stringify(data);
  const encoder = new TextEncoder();
  let bytes = encoder.encode(jsonified);
  if (salt) bytes = tryCompress(bytes);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    bytes,
  );

  const saltLength = salt ? salt.length : 0;
  const result = new Bytes(saltLength + iv.length + encrypted.byteLength);
  if (salt) result.set(salt);
  result.set(iv, saltLength);
  result.set(encrypted, saltLength + iv.length);

  return result;
};

/// tryCompress

const tryCompress = async (bytes) => {
  if (!("CompressionStream" in window)) return bytes;

  const plain = new Blob([bytes]);
  const gzip = new CompressionStream("gzip");
  const gzipped = plain.stream().pipeThrough(gzip);
  const response = new Response(gzipped);
  const blob = await response.blob();
  return await blob.bytes();
};

/// decrypt: Bytes -> JSON -> object

export const decrypt = async (bytes, key) => {
  const buffer = bytes.buffer;
  let i = bytes.byteOffset;

  const cut = (length) => {
    const part = new Bytes(buffer, i, length);
    i += length;
    return part;
  };

  if (!key) key = await getKey(cut(saltSize));
  const iv = cut(ivSize);
  const encrypted = cut(bytes.length - (
    i - bytes.byteOffset
  ));

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
  const jsonified = decoder.decode(decompressed);
  return JSON.parse(jsonified);
};

/// tryDecompress

const tryDecompress = async (buffer) => {
  if (buffer.byteLength < 2) return buffer;

  const header = new Bytes(buffer, 0, 2);
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
