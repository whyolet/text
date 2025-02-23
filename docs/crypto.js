import {o, getRestartButton, showBanner} from "./ui.js";

/// Bytes

export const Bytes = Uint8Array;

Bytes.prototype.toHex ??= function () {
  return Array.from(this).map(
    byte => byte.toString(16).padStart(2, "0")
  ).join("");
};

Bytes.fromHex ??= (hexes) => new Bytes(
  Array.from(hexes.matchAll(/../g))
  .map(match => parseInt(match[0], 16))
);

/// Current DB passphrase and key, not exported.

let dbPassphrase = "";
let dbKey = null;

/// Set DB passphrase and key.

export const setPassphrase = (newValue) => {
  dbPassphrase = newValue;
};

export const setKey = (newValue) => {
  dbKey = newValue;
};

/// getSalt, getIV, getRandomBytes

const saltSize = 24, ivSize = 12;

export const getSalt = () => getRandomBytes(saltSize);

const getIV = () => getRandomBytes(ivSize);

const getRandomBytes = (size) => crypto.getRandomValues(new Bytes(size));

/// getId

export const getId = () => getRandomBytes(32).toHex();

/// getKey

export const getKey = async (salt) => {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(dbPassphrase),
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
  let hexSalt = localStorage.getItem(saltName);
  if (!hexSalt) {
    hexSalt = getSalt().toHex();
    localStorage.setItem(saltName, hexSalt);
  }
  const salt = Bytes.fromHex(hexSalt);

  // Non-secret dbNameKey != secret dbKey.
  const dbNameKey = await getKey(salt);
  const buffer = await crypto.subtle.exportKey("raw", dbNameKey);
  const bytes = new Bytes(buffer);
  return bytes.toHex();
};

/// encrypt: object -> JSON -> Bytes
// (data) -> [iv, encrypted]
// (data, {isExport: true}) -> [salt, iv, compressed+encrypted]

export const encrypt = async (data, props) => {
  const {isExport} = props ?? {};
  const salt = isExport ? getSalt() : null;
  const key = isExport ? await getKey(salt) : dbKey;
  const iv = getIV();

  const jsonified = JSON.stringify(data);
  const encoder = new TextEncoder();
  let bytes = encoder.encode(jsonified);
  if (isExport) bytes = await tryCompress(bytes);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    bytes,
  );

  const encrypted = new Bytes(encryptedBuffer);
  const saltLength = salt ? salt.length : 0;

  const result = new Bytes(
    saltLength +
    iv.length +
    encrypted.length
  );
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
  const buffer = await blob.arrayBuffer();
  return new Bytes(buffer);
};

/// decrypt: Bytes -> JSON -> object

export const decrypt = async (bytes, props) => {
  const {isImport} = props ?? {};
  const buffer = bytes.buffer;
  let i = bytes.byteOffset;

  const cut = (length) => {
    const part = new Bytes(buffer, i, length);
    i += length;
    return part;
  };

  const key = isImport ? await getKey(cut(saltSize)) : dbKey;
  const iv = cut(ivSize);
  const encrypted = cut(bytes.length - (i - bytes.byteOffset));

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
      showBanner({},
        "Decryption failed!",
        "Try another passphrase.",
        getRestartButton(),
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
    showBanner({},
      "Cannot decompress!",
      "Try another browser.",
      getRestartButton(),
    );
    return null;
  }

  const gzipped = new Blob([buffer]);
  const gunzip = new DecompressionStream("gzip");
  const plain = gzipped.stream().pipeThrough(gunzip);
  const response = new Response(plain);
  return await response.arrayBuffer();
};
