const APP_STORAGE_PREFIX = "rbt_genius";
const isNode = typeof window === "undefined";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

const storage = isNode ? createMemoryStorage() : window.localStorage;

function toSnakeCase(value = "") {
  return String(value).replace(/([A-Z])/g, "_$1").toLowerCase();
}

function getAppParamValue(
  paramName,
  { defaultValue = undefined, removeFromUrl = false } = {},
) {
  if (isNode) {
    return defaultValue;
  }

  const storageKey = `${APP_STORAGE_PREFIX}_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (removeFromUrl) {
    urlParams.delete(paramName);

    const newUrl = `${window.location.pathname}${
      urlParams.toString() ? `?${urlParams.toString()}` : ""
    }${window.location.hash}`;

    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  if (defaultValue !== undefined && defaultValue !== null && defaultValue !== "") {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  const storedValue = storage.getItem(storageKey);
  if (storedValue) {
    return storedValue;
  }

  return null;
}

function getAppParams() {
  if (getAppParamValue("clear_access_token") === "true") {
    storage.removeItem(`${APP_STORAGE_PREFIX}_access_token`);
    storage.removeItem("access_token");
    storage.removeItem("token");
  }

  return {
    appName: "RBT GENIUS",
    version: "0.1.0",
    appId: getAppParamValue("app_id", {
      defaultValue: import.meta.env.VITE_APP_ID,
    }),
    token: getAppParamValue("access_token", {
      removeFromUrl: true,
    }),
    fromUrl: getAppParamValue("from_url", {
      defaultValue: isNode ? undefined : window.location.href,
    }),
    functionsVersion: getAppParamValue("functions_version", {
      defaultValue: import.meta.env.VITE_FUNCTIONS_VERSION,
    }),
    appBaseUrl: getAppParamValue("app_base_url", {
      defaultValue: import.meta.env.VITE_APP_BASE_URL,
    }),
  };
}

export { getAppParamValue, getAppParams, toSnakeCase };

export const appParams = {
  ...getAppParams(),
};

export default appParams;
