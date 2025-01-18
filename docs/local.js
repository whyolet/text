
/// isPersistSupported

const isPersistSupported = (
  "storage" in navigator &&
  "persist" in navigator.storage
);

/// getPersisted

export const getPersisted = async () => {
  if (isPersistSupported) {
    return await navigator.storage.persisted();
  }
  return false;
};

/// tryPersist

export const tryPersist = async () => {
  if (isPersistSupported) {
    return await navigator.storage.persist();
  }
  return false;
};
