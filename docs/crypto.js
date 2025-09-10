import {debug, o, getRestartButton, showBanner} from "./ui.js";

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

Bytes.fromText ??= (text) => {
  const encoder = new TextEncoder();
  return encoder.encode(text);
};

/// getRandomBytes + shortcuts

const saltSize = 24, ivSize = 12;

const getRandomBytes = (size) => crypto.getRandomValues(new Bytes(size));

export const getSalt = () => getRandomBytes(saltSize);

const getIV = () => getRandomBytes(ivSize);

export const getId = () => getRandomBytes(32).toHex();

/// Current encryption keys, not exported from this module, not plaintext.

let dbKey = null, exportKey1 = null;

/// setDbKey, setExportKey1

export const setDbKey = async (passphrase, salt) => {
  dbKey = await getKey(passphrase, salt);
};

export const setExportKey1 = async (passphrase) => {
  const keyMaterial = await getKeyMaterial(passphrase);

  const exportSalt1 = Bytes.fromText("whyolet-text-const-export-salt-1");
  // Why `exportSalt1` is not random:
  // `exportKey2` will be derived from `exportKey1` and random `exportSalt2`
  // to avoid re-entering passphrase on each export, import, sync,
  // and to avoid keeping passphrase in memory as plaintext, or encoded in a reversible way, or using not strong enough hash.

  const exportKey1Buffer = await crypto.subtle.deriveBits(
    getPassBasedAlg(exportSalt1),
    keyMaterial,
    256,
  );

  exportKey1 = await crypto.subtle.importKey(
    "raw",
    exportKey1Buffer,
    "HKDF",
    false,
    ["deriveKey"],
  );
};

/// getKey...

const getKey = async (passphrase, salt, props) => {
  const {isExtractable} = props ?? {};
  const keyMaterial = await getKeyMaterial(passphrase);

  const key = await crypto.subtle.deriveKey(
    getPassBasedAlg(salt),
    keyMaterial,
    encryptionAlg,
    isExtractable ?? false,
    ["encrypt", "decrypt"],
  );

  return key;
};

const getKeyMaterial = async (passphrase) => {
  return await crypto.subtle.importKey(
    "raw",
    Bytes.fromText(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
};

const getPassBasedAlg = (salt) => ({
  name: "PBKDF2",
  hash: "SHA-256",
  salt,
  iterations: 1000000,
});

const encryptionAlg = {
  name: "AES-GCM",
  length: 256,
};

const getExportKey2 = async (exportSalt2) => {
  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: exportSalt2,
      info: Bytes.fromText("whyolet-text-export-key-2"),
    },
    exportKey1,
    encryptionAlg,
    false,
    ["encrypt", "decrypt"],
  );
};

/// getDbName, getDbNameSalt

const getDbNameSalt = () => {
  const saltName = "dbNameSalt";
  let hexSalt = localStorage.getItem(saltName);
  try {
  if (hexSalt) return Bytes.fromHex(hexSalt);
  } catch (e) {
    debug(hexSalt);
    debug(hexSalt.length);
    throw e;
  }

  const salt = getSalt();
  localStorage.setItem(saltName, salt.toHex());
  return salt;
};

export const getDbName = async (passphrase) => {
  // Non-secret dbNameKey != secret dbKey.
  const dbNameKey = await getKey(
    passphrase,
    getDbNameSalt(),
    {isExtractable: true},
  );
  const buffer = await crypto.subtle.exportKey("raw", dbNameKey);
  const bytes = new Bytes(buffer);
  return bytes.toHex();
};

/// encrypt
//
// object -> JSON -> Bytes
// (data) -> [iv, encrypted]
// (data, {isExport: true}) -> [salt, iv, compressed+encrypted]

export const encrypt = async (data, props) => {
  const {isExport} = props ?? {};
  const salt = isExport ? getSalt() : null;
  const key = isExport ? await getExportKey2(salt) : dbKey;
  const iv = getIV();

  const jsonified = JSON.stringify(data);
  let bytes = Bytes.fromText(jsonified);
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

  /// `cut(N)` bytes,
  /// `cut()` the rest of the buffer.
  const cut = (length) => {
    const part = new Bytes(buffer, i, length);
    i += length ?? 0;
    return part;
  };

  const key = isImport ? await getExportKey2(cut(saltSize)) : dbKey;
  const iv = cut(ivSize);
  const encrypted = cut();

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
